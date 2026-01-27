import { EventEmitter } from "events";
import { Request, Response } from "express";
import pLimit from "p-limit";
import { Key, MemcachedConnection } from "@/api/types";
import type { KeyQueryAst, KeyQueryFilter } from "@/api/utils";
import {
  connectionManager,
  evaluateKeyQuery,
  evaluateKeyQueryKeyOnly,
  extractKeysInfoFromDump,
  extractUsedChunksFromSlabs,
  inferValueOrderMode,
  logger,
  MAX_CONCURRENT_REQUESTS,
  MEMCACHED_MAX_VALUE_BYTES,
  ONE_MINUTE_IN_SECONDS,
  ONE_DAY_IN_SECONDS,
  parseKeyQuery,
  RESERVED_KEYS,
  isReservedKey,
  touchConnection
} from "@/api/utils";
import { executeMemcachedCommand } from "@/api/utils/executeMemcachedCommand";
import {
  memcachedDelete,
  memcachedFlush,
  memcachedGet,
  memcachedGetMulti,
  memcachedSet,
  memcachedStats
} from "@/api/utils/memcachedClient";

type KeyPayload = {
  key: string;
  value: string;
  timeUntilExpiration: number;
  size: number;
};

type ImportItem = {
  key?: string;
  value?: unknown;
  timeUntilExpiration?: number;
};

const MULTI_GET_BATCH_SIZE = Math.max(
  1,
  Math.min(1024, MAX_CONCURRENT_REQUESTS)
);

const chunkArray = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const normalizeValue = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }
  if (Buffer.isBuffer(value)) {
    return value.toString("utf8");
  }
  return value === undefined || value === null ? "" : String(value);
};

const buildKeyPayload = (
  key: string,
  value: string,
  keysInfoMap: Map<string, Key> | null,
  currentUnixTime: number
): KeyPayload => {
  const info = keysInfoMap?.get(key);
  const expiration = info ? info.expiration : 0;
  const timeUntilExpiration =
    expiration > 0 ? Math.max(expiration - currentUnixTime, 0) : 0;
  const size = info ? info.size : Buffer.from(value, "utf8").length;
  return {
    key,
    value,
    timeUntilExpiration,
    size
  };
};

const INDEX_REFRESH_EVENT = "index-refresh";
const INDEX_ADD_EVENT = "index-add";
const AUTH_INDEX_EVENT_ADD = "auth-index-add";
const AUTH_INDEX_EVENT_REMOVE = "auth-index-remove";
const AUTH_INDEX_EVENT_UPDATE = "auth-index-update";

type AuthIndexEventPayload = {
  connection: MemcachedConnection;
  key?: string;
  keys?: string[];
  clearAll?: boolean;
};

type CachedumpResult = {
  keysInfo: Key[];
};

type IndexRefreshPayload = {
  connection: MemcachedConnection;
  cachedump?: CachedumpResult;
};

type IndexAddPayload = {
  connection: MemcachedConnection;
  key: string;
};

type DumpStartPayload = {
  total: number;
  batchSize: number;
  batchCount: number;
};

type DumpPrefetchPayload = {
  total: number;
  batchSize: number;
  batchCount: number;
  indexCount: number;
  cachedumpCount: number;
};

type DumpBatchPayload = {
  items: KeyPayload[];
  batchIndex: number;
  batchCount: number;
  processed: number;
  total: number;
  successCount: number;
  failureCount: number;
  progress: number;
  successRate: number;
};

type DumpSummaryPayload = {
  total: number;
  processed: number;
  successCount: number;
  failureCount: number;
  durationMs: number;
};

type ImportBatchResult = {
  processed: number;
  successCount: number;
  failureCount: number;
  importedKeys: string[];
};

type DumpKeySnapshot = {
  keys: string[];
  keysInfo: Key[] | null;
  indexCount: number;
  cachedumpCount: number;
};

type DumpFilterOptions = {
  query?: string;
  prefix?: string;
  minSize?: number;
  maxSize?: number;
  minTtl?: number;
  maxTtl?: number;
};

class KeyController {
  private static indexUpdateEmitter = new EventEmitter();
  private static indexUpdateLocks = new Set<string>();
  private static cachedumpSnapshots = new Map<
    string,
    { keysInfo: Key[]; capturedAt: number }
  >();
  private static indexUpdateListenerRegistered = false;
  private static indexUpdateQueues = new Map<string, Promise<void>>();
  private static authIndexEmitter = new EventEmitter();
  private static authIndexListenerRegistered = false;
  private static authIndexQueues = new Map<string, Promise<void>>();

  constructor() {
    if (!KeyController.indexUpdateListenerRegistered) {
      KeyController.indexUpdateListenerRegistered = true;
      KeyController.indexUpdateEmitter.on(
        INDEX_REFRESH_EVENT,
        (payload: IndexRefreshPayload) => {
          const connectionKey = this.getConnectionKey(payload.connection);
          if (KeyController.indexUpdateLocks.has(connectionKey)) {
            return;
          }

          KeyController.indexUpdateLocks.add(connectionKey);

          const run = async () => {
            try {
              await this.refreshIndexFromCachedump(
                payload.connection,
                payload.cachedump
              );
            } catch (error) {
              logger.error(
                "Failed to refresh index via cachedump",
                error as Error
              );
            } finally {
              KeyController.indexUpdateLocks.delete(connectionKey);
            }
          };

          void run();
        }
      );

      KeyController.indexUpdateEmitter.on(
        INDEX_ADD_EVENT,
        (payload: IndexAddPayload) => {
          this.enqueueIndexUpdate(payload.connection, async () => {
            await this.updateKeyIndex([payload.key], payload.connection, false);
          });
        }
      );
    }

    if (!KeyController.authIndexListenerRegistered) {
      KeyController.authIndexListenerRegistered = true;

      KeyController.authIndexEmitter.on(
        AUTH_INDEX_EVENT_ADD,
        (payload: AuthIndexEventPayload) => {
          this.enqueueAuthIndexUpdate(payload.connection, async () => {
            if (payload.key) {
              await this.updateKeyIndex(
                [payload.key],
                payload.connection,
                false
              );
            }
          });
        }
      );

      KeyController.authIndexEmitter.on(
        AUTH_INDEX_EVENT_UPDATE,
        (payload: AuthIndexEventPayload) => {
          this.enqueueAuthIndexUpdate(payload.connection, async () => {
            if (payload.key) {
              await this.updateKeyIndex(
                [payload.key],
                payload.connection,
                false
              );
            }
          });
        }
      );

      KeyController.authIndexEmitter.on(
        AUTH_INDEX_EVENT_REMOVE,
        (payload: AuthIndexEventPayload) => {
          this.enqueueAuthIndexUpdate(payload.connection, async () => {
            if (payload.clearAll) {
              await this.writeIndexShards([], payload.connection);
              return;
            }

            const keys = payload.keys ?? (payload.key ? [payload.key] : []);
            if (keys.length > 0) {
              await this.removeKeysFromIndex(keys, payload.connection);
            }
          });
        }
      );
    }
  }

  async getAll(request: Request, response: Response) {
    const { connection, connectionId } = this.resolveConnection(request);
    const searchTerm =
      typeof request.query.search === "string" ? request.query.search : "";
    const rawQuery =
      typeof request.query.query === "string" ? request.query.query : "";
    const queryParam = rawQuery.trim();
    const parsedQuery = queryParam ? parseKeyQuery(queryParam) : null;
    if (parsedQuery && "error" in parsedQuery) {
      response.status(400).json({
        error: parsedQuery.error
      });
      return;
    }

    const query = parsedQuery?.query;
    let limit: number;
    if (query?.limit !== undefined) {
      limit = query.limit;
    } else {
      const parsedLimit = this.parseLimitParam(request.query.limit);
      if ("error" in parsedLimit) {
        response.status(400).json({
          error: parsedLimit.error
        });
        return;
      }
      limit = parsedLimit.limit;
    }

    const queryWithDefaults: KeyQueryAst | undefined = query
      ? { ...query, limit, offset: query.offset ?? 0 }
      : undefined;

    try {
      this.logDebug("Listagem de chaves solicitada", {
        connectionId,
        limit,
        hasSearch: searchTerm.length > 0,
        searchLength: searchTerm.length,
        hasQuery: queryParam.length > 0,
        queryLength: queryParam.length
      });
      const serverUnixTime = await this.getServerUnixTime(connection);
      const allowReservedKeys = this.shouldExposeReservedKeys();
      const { storedKeys, reservedIndexKeys, listKeys } =
        await this.loadIndexKeys(connection, allowReservedKeys);
      this.logDebug("Indice atual carregado", {
        storedKeys: storedKeys.length
      });

      this.logDebug("Chaves base para listagem", {
        listKeys: listKeys.length,
        reservedIndexKeys: reservedIndexKeys.length,
        allowReservedKeys
      });

      if (queryWithDefaults) {
        if (connection.authentication) {
          const payload = await this.queryKeysInBatches(
            listKeys,
            connection,
            queryWithDefaults,
            {
              serverUnixTime
            }
          );
          response.json(payload);
          return;
        }

        if (storedKeys.length > 0) {
          const payload = await this.queryKeysInBatches(
            listKeys,
            connection,
            queryWithDefaults,
            {
              serverUnixTime
            }
          );
          response.json(payload);
          this.emitIndexRefresh(connection);
          return;
        }

        const { payload, cachedump } = await this.fetchKeysFromCachedumpByQuery(
          connection,
          queryWithDefaults,
          serverUnixTime
        );
        response.json(payload);
        this.emitIndexRefresh(connection, cachedump);
        return;
      }

      if (connection.authentication) {
        const filteredKeys = this.applyKeyFilters(
          listKeys,
          searchTerm,
          allowReservedKeys
        );
        this.logDebug("Listagem autenticada filtrada", {
          filteredKeys: filteredKeys.length
        });
        const payload = await this.getKeysValue(
          filteredKeys,
          connection,
          undefined,
          serverUnixTime,
          limit
        );
        this.logDebug("Listagem autenticada concluida", {
          payload: payload.length
        });
        response.json(payload);

        return;
      }

      if (storedKeys.length > 0) {
        const filteredKeys = this.applyKeyFilters(
          listKeys,
          searchTerm,
          allowReservedKeys
        );
        this.logDebug("Listagem filtrada por indice", {
          filteredKeys: filteredKeys.length,
          storedKeys: storedKeys.length
        });

        if (filteredKeys.length === 0) {
          response.json([]);
          this.emitIndexRefresh(connection);
          return;
        }

        const payload = await this.getKeysValue(
          filteredKeys,
          connection,
          undefined,
          serverUnixTime,
          limit
        );
        const nonReservedCount = allowReservedKeys
          ? payload.filter((item) => !isReservedKey(item.key)).length
          : payload.length;

        if (!searchTerm && nonReservedCount === 0) {
          this.logDebug("Indice sem chaves validas, usando cachedump");
          await this.sendCachedumpResponse(
            response,
            connection,
            searchTerm,
            limit,
            allowReservedKeys,
            serverUnixTime
          );
          return;
        }
        response.json(payload);
        this.emitIndexRefresh(connection);

        return;
      }

      this.logDebug("Indice vazio, usando cachedump");
      await this.sendCachedumpResponse(
        response,
        connection,
        searchTerm,
        limit,
        allowReservedKeys,
        serverUnixTime
      );
    } catch (error) {
      const message = "Failed to fetch keys";
      logger.error(message, error);
      response.status(500).json({
        error: message
      });
    }
  }

  async count(request: Request, response: Response) {
    try {
      const { connection } = this.resolveConnection(request);

      const stats = await memcachedStats(connection);

      const count = Number.parseInt(stats.curr_items ?? "", 10);

      if (!Number.isFinite(count)) {
        throw new Error("Invalid curr_items value");
      }

      const reservedCount = await this.getReservedKeyCount(connection);
      const visibleCount = Math.max(0, count - reservedCount);

      response.json({ count: visibleCount });
    } catch (error) {
      const message = "Failed to count keys";
      logger.error(message, error);
      response.status(500).json({
        error: message
      });
    }
  }

  async create(request: Request, response: Response) {
    try {
      const { connection } = this.resolveConnection(request);

      const { key, value, expires } = request.body;
      const ttl = Number.isFinite(expires ?? NaN) ? expires! : undefined;

      const success = await memcachedSet(connection, key, value, ttl ?? 0);

      if (!success) {
        throw new Error("Failed to store value");
      }

      response.status(201).json({
        key,
        status: "created",
        ttl
      });
      if (connection.authentication) {
        const storedKeys = await this.getStoredKeysFromIndex(connection);
        const eventType = storedKeys.includes(key)
          ? AUTH_INDEX_EVENT_UPDATE
          : AUTH_INDEX_EVENT_ADD;
        this.emitAuthIndexEvent(eventType, { connection, key });
      } else {
        this.emitIndexAdd(connection, key);
      }
    } catch (error) {
      const message = "Failed to create key";
      logger.error(message, error);
      response.status(500).json({
        error: message
      });
    }
  }

  async deleteByName(request: Request, response: Response) {
    try {
      const { connection } = this.resolveConnection(request);

      const key = <string>request.params.key;
      await memcachedDelete(connection, key);
      response.status(204).send();
      if (connection.authentication) {
        this.emitAuthIndexEvent(AUTH_INDEX_EVENT_REMOVE, { connection, key });
      } else {
        this.emitIndexRefresh(connection);
      }
    } catch (error) {
      const message = `Failed to delete key ${request.params.key}`;
      logger.error(message, error);
      response.status(500).json({
        error: message
      });
    }
  }

  async flushAll(request: Request, response: Response) {
    try {
      const { connection } = this.resolveConnection(request);

      await memcachedFlush(connection);
      response.status(200).json({ status: "flushed" });
      if (connection.authentication) {
        this.emitAuthIndexEvent(AUTH_INDEX_EVENT_REMOVE, {
          connection,
          clearAll: true
        });
      } else {
        this.emitIndexRefresh(connection);
      }
    } catch (error) {
      const message = "Failed to flush keys";
      logger.error(message, error);
      response.status(500).json({
        error: message
      });
    }
  }

  async getByName(request: Request, response: Response) {
    try {
      const { connection } = this.resolveConnection(request);

      const key = <string>request.params.key;

      const value = await memcachedGet(connection, key);

      if (value === null) {
        throw new Error();
      }

      response.json({ key, value: normalizeValue(value) });
      if (connection.authentication) {
        this.emitAuthIndexEvent(AUTH_INDEX_EVENT_UPDATE, { connection, key });
      } else {
        this.emitIndexRefresh(connection);
      }
    } catch (error) {
      const message = `Failed to fetch key ${request.params.key}`;
      logger.error(message, error);
      response.status(500).json({
        error: message
      });
    }
  }

  async streamDump(
    connection: MemcachedConnection,
    options: {
      batchSize?: number;
      filters?: DumpFilterOptions;
      onStart?: (payload: DumpStartPayload) => void | Promise<void>;
      onBatch: (payload: DumpBatchPayload) => void | Promise<void>;
      onComplete?: (payload: DumpSummaryPayload) => void | Promise<void>;
      onCancel?: (payload: DumpSummaryPayload) => void | Promise<void>;
      shouldCancel?: () => boolean;
    }
  ): Promise<void> {
    const startedAt = Date.now();
    touchConnection(connection);
    const { keys, keysInfo } = await this.resolveDumpKeys(
      connection,
      options.filters
    );
    const total = keys.length;
    const batchSize = this.resolveDumpBatchSize(options.batchSize);
    const batchCount = total > 0 ? Math.ceil(total / batchSize) : 0;

    if (options.onStart) {
      await options.onStart({ total, batchSize, batchCount });
    }

    if (total === 0) {
      const summary: DumpSummaryPayload = {
        total: 0,
        processed: 0,
        successCount: 0,
        failureCount: 0,
        durationMs: Date.now() - startedAt
      };
      if (options.onComplete) {
        await options.onComplete(summary);
      }
      return;
    }

    const serverUnixTime = await this.getServerUnixTime(connection);
    let processed = 0;
    let successCount = 0;

    for (let index = 0; index < total; index += batchSize) {
      if (options.shouldCancel?.()) {
        const summary: DumpSummaryPayload = {
          total,
          processed,
          successCount,
          failureCount: Math.max(processed - successCount, 0),
          durationMs: Date.now() - startedAt
        };
        if (options.onCancel) {
          await options.onCancel(summary);
        }
        return;
      }

      touchConnection(connection);
      const batchKeys = keys.slice(index, index + batchSize);
      const items = await this.getKeysValue(
        batchKeys,
        connection,
        keysInfo ?? undefined,
        serverUnixTime
      );

      processed += batchKeys.length;
      successCount += items.length;
      const failureCount = Math.max(processed - successCount, 0);
      const progress = total > 0 ? Math.round((processed / total) * 100) : 100;
      const successRate =
        total > 0 ? Math.round((successCount / total) * 100) : 100;

      await options.onBatch({
        items,
        batchIndex: Math.floor(index / batchSize) + 1,
        batchCount,
        processed,
        total,
        successCount,
        failureCount,
        progress,
        successRate
      });
    }

    const summary: DumpSummaryPayload = {
      total,
      processed,
      successCount,
      failureCount: Math.max(total - successCount, 0),
      durationMs: Date.now() - startedAt
    };

    if (options.onComplete) {
      await options.onComplete(summary);
    }
  }

  async importBatch(
    connection: MemcachedConnection,
    items: ImportItem[]
  ): Promise<ImportBatchResult> {
    const list = Array.isArray(items) ? items : [];
    if (list.length === 0) {
      return {
        processed: 0,
        successCount: 0,
        failureCount: 0,
        importedKeys: []
      };
    }

    touchConnection(connection);
    const allowReservedKeys = this.shouldExposeReservedKeys();
    const maxRelativeExpiration = ONE_DAY_IN_SECONDS * 30;
    const nowUnixTime = Math.floor(Date.now() / 1000);
    const limit = pLimit(
      Math.min(MAX_CONCURRENT_REQUESTS, Math.max(1, list.length))
    );

    const results = await Promise.all(
      list.map((item) =>
        limit(async () => {
          const key = typeof item?.key === "string" ? item.key.trim() : "";
          if (!key) {
            return { ok: false, key: "" };
          }

          if (!allowReservedKeys && isReservedKey(key)) {
            return { ok: false, key };
          }

          const rawValue = item?.value;
          if (rawValue === undefined) {
            return { ok: false, key };
          }

          const value =
            typeof rawValue === "string" ? rawValue : String(rawValue);
          const expiresRaw = item?.timeUntilExpiration;
          const ttl = Number.isFinite(expiresRaw)
            ? Math.max(0, Math.floor(expiresRaw as number))
            : 0;
          const resolvedExpiration =
            ttl > maxRelativeExpiration ? nowUnixTime + ttl : ttl;

          try {
            const success = await memcachedSet(
              connection,
              key,
              value,
              resolvedExpiration
            );
            return { ok: Boolean(success), key };
          } catch (error) {
            logger.error(`Failed to import key ${key}`, error as Error);
            return { ok: false, key };
          }
        })
      )
    );

    const importedKeys: string[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const result of results) {
      if (result.ok) {
        successCount += 1;
        importedKeys.push(result.key);
      } else {
        failureCount += 1;
      }
    }

    return {
      processed: list.length,
      successCount,
      failureCount,
      importedKeys
    };
  }

  async prefetchDump(
    connection: MemcachedConnection,
    options: { batchSize?: number; filters?: DumpFilterOptions } = {}
  ): Promise<DumpPrefetchPayload> {
    touchConnection(connection);
    const snapshot = await this.resolveDumpSnapshot(
      connection,
      options.filters
    );
    const total = snapshot.keys.length;
    const batchSize = this.resolveDumpBatchSize(options.batchSize);
    const batchCount = total > 0 ? Math.ceil(total / batchSize) : 0;

    return {
      total,
      batchSize,
      batchCount,
      indexCount: snapshot.indexCount,
      cachedumpCount: snapshot.cachedumpCount
    };
  }

  async registerImportedKeys(
    connection: MemcachedConnection,
    keys: string[]
  ): Promise<void> {
    const uniqueKeys = Array.from(new Set(keys)).filter(
      (key) => key && !isReservedKey(key)
    );

    if (uniqueKeys.length === 0) {
      return;
    }

    if (connection.authentication) {
      await this.updateKeyIndex(uniqueKeys, connection, false);
      return;
    }

    this.emitIndexRefresh(connection);
  }

  private resolveConnection(request: Request): {
    connection: MemcachedConnection;
    connectionId: string;
  } {
    const connections = connectionManager();
    const connectionId = request.headers["x-connection-id"] as string;
    const connection = connections.get(connectionId)!;
    return { connection, connectionId };
  }

  private parseLimitParam(
    limitParam: unknown
  ): { limit: number } | { error: string } {
    if (typeof limitParam !== "string") {
      return { error: 'Parameter "limit" is required' };
    }

    const limit = Number(limitParam);
    if (!Number.isFinite(limit) || limit <= 0) {
      return { error: 'Parameter "limit" must be a positive number' };
    }

    return { limit };
  }

  private async loadIndexKeys(
    connection: MemcachedConnection,
    allowReservedKeys: boolean
  ): Promise<{
    storedKeys: string[];
    reservedIndexKeys: string[];
    listKeys: string[];
  }> {
    let storedKeys: string[] = [];
    try {
      storedKeys = await this.getStoredKeysFromIndex(connection);
    } catch (err) {
      logger.error("Failed to fetch index keys", err as Error);
    }

    const reservedIndexKeys = allowReservedKeys
      ? await this.getIndexKeyList(connection)
      : [];

    const listKeys = allowReservedKeys
      ? Array.from(
          new Set([RESERVED_KEYS.INDEXES, ...reservedIndexKeys, ...storedKeys])
        )
      : storedKeys;

    return { storedKeys, reservedIndexKeys, listKeys };
  }

  private async getReservedKeyCount(
    connection: MemcachedConnection
  ): Promise<number> {
    try {
      const response = await memcachedGet(connection, RESERVED_KEYS.INDEXES);
      if (!response) {
        return 0;
      }

      let indexKeys: string[] = [];
      try {
        const parsed = JSON.parse(normalizeValue(response));
        if (Array.isArray(parsed)) {
          indexKeys = Array.from(
            new Set(
              parsed.filter(
                (key): key is string =>
                  typeof key === "string" &&
                  key.startsWith(RESERVED_KEYS.SHARD_PREFIX)
              )
            )
          );
        }
      } catch (error) {
        logger.error("Failed to read key index", error as Error);
        return 1;
      }

      return 1 + indexKeys.length;
    } catch (error) {
      logger.error("Failed to fetch reserved keys", error as Error);
      return 0;
    }
  }

  private async sendCachedumpResponse(
    response: Response,
    connection: MemcachedConnection,
    searchTerm: string,
    limit: number,
    allowReservedKeys: boolean,
    serverUnixTime: number
  ): Promise<void> {
    const { payload, cachedump } = await this.fetchKeysFromCachedump(
      connection,
      searchTerm,
      limit,
      allowReservedKeys,
      serverUnixTime
    );
    response.json(payload);
    this.emitIndexRefresh(connection, cachedump);
  }

  private emitIndexAdd(connection: MemcachedConnection, key: string) {
    if (connection.authentication) {
      return;
    }

    setImmediate(() => {
      KeyController.indexUpdateEmitter.emit(INDEX_ADD_EVENT, {
        connection,
        key
      });
    });
  }

  private emitIndexRefresh(
    connection: MemcachedConnection,
    cachedump?: CachedumpResult
  ) {
    if (connection.authentication) {
      return;
    }

    setImmediate(() => {
      KeyController.indexUpdateEmitter.emit(INDEX_REFRESH_EVENT, {
        connection,
        cachedump
      });
    });
  }

  private emitAuthIndexEvent(
    eventType:
      | typeof AUTH_INDEX_EVENT_ADD
      | typeof AUTH_INDEX_EVENT_REMOVE
      | typeof AUTH_INDEX_EVENT_UPDATE,
    payload: AuthIndexEventPayload
  ) {
    if (!payload.connection.authentication) {
      return;
    }

    setImmediate(() => {
      KeyController.authIndexEmitter.emit(eventType, payload);
    });
  }

  private getConnectionKey(connection: MemcachedConnection) {
    return connection.id || `${connection.host}:${connection.port}`;
  }

  private isDebugEnabled() {
    return process.env.MEMGUI_DEBUG === "true";
  }

  private logDebug(message: string, meta?: Record<string, unknown>) {
    if (!this.isDebugEnabled()) {
      return;
    }

    if (meta) {
      logger.info({ debug: meta }, `[DEBUG] ${message}`);
      return;
    }

    logger.info(`[DEBUG] ${message}`);
  }

  private enqueueIndexUpdate(
    connection: MemcachedConnection,
    task: () => Promise<void>
  ) {
    const queueKey = this.getConnectionKey(connection);
    const previous =
      KeyController.indexUpdateQueues.get(queueKey) ?? Promise.resolve();

    const next = previous
      .catch(() => undefined)
      .then(task)
      .catch((error) => {
        logger.error("Failed to process index update", error);
      })
      .finally(() => {
        if (KeyController.indexUpdateQueues.get(queueKey) === next) {
          KeyController.indexUpdateQueues.delete(queueKey);
        }
      });

    KeyController.indexUpdateQueues.set(queueKey, next);
  }

  private enqueueAuthIndexUpdate(
    connection: MemcachedConnection,
    task: () => Promise<void>
  ) {
    const queueKey = this.getConnectionKey(connection);
    const previous =
      KeyController.authIndexQueues.get(queueKey) ?? Promise.resolve();

    const next = previous
      .catch(() => undefined)
      .then(task)
      .catch((error) => {
        logger.error("Failed to process authenticated index event", error);
      })
      .finally(() => {
        if (KeyController.authIndexQueues.get(queueKey) === next) {
          KeyController.authIndexQueues.delete(queueKey);
        }
      });

    KeyController.authIndexQueues.set(queueKey, next);
  }

  private async refreshIndexFromCachedump(
    connection: MemcachedConnection,
    cachedump?: CachedumpResult
  ) {
    if (connection.authentication) {
      return;
    }

    const cachedumpResult =
      cachedump ?? (await this.getCachedumpKeysInfo(connection));
    const cachedumpKeys = cachedumpResult.keysInfo
      .map((info) => info.key)
      .filter((key) => !isReservedKey(key));
    const storedKeys = await this.getStoredKeysFromIndex(connection);
    const allKeys = Array.from(
      new Set([...storedKeys, ...cachedumpKeys])
    ).sort();
    this.logDebug("Refresh do indice iniciado", {
      storedKeys: storedKeys.length,
      cachedumpKeys: cachedumpKeys.length,
      mergedKeys: allKeys.length
    });
    const existingKeys = await this.filterExistingKeys(allKeys, connection);
    this.logDebug("Refresh do indice validado", {
      existingKeys: existingKeys.length
    });

    await this.writeIndexShards(existingKeys, connection);
  }

  private async getCachedumpKeysInfo(
    connection: MemcachedConnection
  ): Promise<CachedumpResult> {
    const slabsOutput = await executeMemcachedCommand(
      "stats slabs",
      connection
    );
    const slabUsedMap = extractUsedChunksFromSlabs(slabsOutput);
    const slabEntries = Array.from(slabUsedMap.entries()).filter(
      ([, usedChunks]) => usedChunks > 0
    );
    this.logDebug("Slabs carregados para cachedump", {
      slabs: slabEntries.length
    });

    const keysInfoArrays = await Promise.all(
      slabEntries.map(async ([slabId, usedChunks]) => {
        try {
          const cachedumpLimit = Math.max(1, Math.ceil(usedChunks * 1.5));
          const dumpOutput = await executeMemcachedCommand(
            `stats cachedump ${slabId} ${cachedumpLimit}`,
            connection
          );

          return extractKeysInfoFromDump(dumpOutput, slabId);
        } catch (error) {
          logger.error(`Failed to process slab ${slabId}`, error as Error);
          return [];
        }
      })
    );

    const keysInfo = keysInfoArrays.flat();
    const connectionKey = this.getConnectionKey(connection);
    KeyController.cachedumpSnapshots.set(connectionKey, {
      keysInfo,
      capturedAt: Date.now()
    });
    this.logDebug("Cachedump finalizado", {
      keysInfo: keysInfo.length
    });

    return { keysInfo };
  }

  private async fetchKeysFromCachedump(
    connection: MemcachedConnection,
    searchTerm: string,
    limit: number,
    allowReservedKeys: boolean,
    serverUnixTime: number
  ): Promise<{ payload: KeyPayload[]; cachedump: CachedumpResult }> {
    const cachedump = await this.getCachedumpKeysInfo(connection);
    const keysInfo = cachedump.keysInfo;
    const slabKeys = keysInfo.map((info) => info.key);
    const allKeys = Array.from(new Set(slabKeys)).sort();
    const filteredKeys = this.applyKeyFilters(
      allKeys,
      searchTerm,
      allowReservedKeys
    );
    this.logDebug("Cachedump filtrado", {
      totalKeys: allKeys.length,
      filteredKeys: filteredKeys.length
    });

    if (filteredKeys.length === 0) {
      return { payload: [], cachedump };
    }

    const payload = await this.getKeysValue(
      filteredKeys,
      connection,
      keysInfo,
      serverUnixTime,
      limit
    );

    return { payload, cachedump };
  }

  private async fetchKeysFromCachedumpByQuery(
    connection: MemcachedConnection,
    query: KeyQueryAst,
    serverUnixTime: number
  ): Promise<{ payload: KeyPayload[]; cachedump: CachedumpResult }> {
    const cachedump = await this.getCachedumpKeysInfo(connection);
    const keysInfo = cachedump.keysInfo;
    const slabKeys = keysInfo.map((info) => info.key);
    const allKeys = Array.from(new Set(slabKeys)).sort();
    const payload = await this.queryKeysInBatches(allKeys, connection, query, {
      keysInfo,
      serverUnixTime
    });

    return { payload, cachedump };
  }

  private async queryKeysInBatches(
    keys: string[],
    connection: MemcachedConnection,
    query: KeyQueryAst,
    options: {
      keysInfo?: Key[];
      serverUnixTime?: number;
    } = {}
  ): Promise<KeyPayload[]> {
    const limiter = pLimit(MAX_CONCURRENT_REQUESTS);
    const currentUnixTime =
      options.serverUnixTime ?? (await this.getServerUnixTime(connection));
    const allowReservedKeys = this.shouldExposeReservedKeys();
    const filteredKeys = allowReservedKeys
      ? keys
      : keys.filter((key) => !isReservedKey(key));
    const fallbackKeysInfo =
      options.keysInfo ??
      (!connection.authentication
        ? this.getCachedumpSnapshot(connection)
        : null);
    const keysInfoMap = fallbackKeysInfo
      ? new Map(fallbackKeysInfo.map((info) => [info.key, info]))
      : null;

    const orderBy = query.orderBy ?? { field: "key", direction: "asc" };
    const limit = query.limit;
    const offset = query.offset ?? 0;
    const maxNeeded = limit !== undefined ? limit + offset : undefined;
    const valueOrderMode =
      orderBy.field === "value" ? inferValueOrderMode(query.filter) : "string";
    const batchSize = Math.max(
      1,
      Math.min(MAX_CONCURRENT_REQUESTS, maxNeeded ?? MAX_CONCURRENT_REQUESTS)
    );
    const totalKeys = filteredKeys.length;
    const useDescKeys = orderBy.field === "key" && orderBy.direction === "desc";

    const parseNumericValue = (value: string): number | null => {
      const trimmed = value.trim();
      if (!/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
        return null;
      }
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const compareValue = (a: KeyPayload, b: KeyPayload): number => {
      if (orderBy.field === "ttl") {
        return a.timeUntilExpiration - b.timeUntilExpiration;
      }
      if (valueOrderMode === "number") {
        const aNum = parseNumericValue(a.value);
        const bNum = parseNumericValue(b.value);
        if (aNum === null && bNum === null) {
          return a.value.localeCompare(b.value);
        }
        if (aNum === null) return 1;
        if (bNum === null) return -1;
        return aNum - bNum;
      }
      return a.value.localeCompare(b.value);
    };

    const compare = (a: KeyPayload, b: KeyPayload): number => {
      const base = compareValue(a, b);
      return orderBy.direction === "asc" ? base : -base;
    };

    const results: KeyPayload[] = [];

    const insertOrdered = (item: KeyPayload) => {
      if (maxNeeded === undefined) {
        results.push(item);
        return;
      }

      if (results.length >= maxNeeded) {
        const last = results[results.length - 1];
        if (compare(item, last) >= 0) {
          return;
        }
      }

      let inserted = false;
      for (let i = 0; i < results.length; i += 1) {
        if (compare(item, results[i]) < 0) {
          results.splice(i, 0, item);
          inserted = true;
          break;
        }
      }
      if (!inserted) {
        results.push(item);
      }
      if (maxNeeded !== undefined && results.length > maxNeeded) {
        results.pop();
      }
    };

    let index = 0;
    while (index < totalKeys) {
      if (orderBy.field === "key" && maxNeeded !== undefined) {
        if (results.length >= maxNeeded) {
          break;
        }
      }

      const batchKeys: string[] = [];
      while (batchKeys.length < batchSize && index < totalKeys) {
        const keyIndex = useDescKeys ? totalKeys - 1 - index : index;
        const key = filteredKeys[keyIndex];
        index += 1;
        if (evaluateKeyQueryKeyOnly(query.filter, key) === false) {
          continue;
        }
        batchKeys.push(key);
      }

      if (batchKeys.length === 0) {
        continue;
      }

      const batchResults = await limiter(() =>
        this.evaluateQueryBatch(
          connection,
          batchKeys,
          query.filter,
          keysInfoMap,
          currentUnixTime,
          maxNeeded
        )
      );

      for (const item of batchResults) {
        if (!item) {
          continue;
        }
        if (orderBy.field === "value" || orderBy.field === "ttl") {
          insertOrdered(item);
          continue;
        }
        results.push(item);
        if (maxNeeded !== undefined && results.length >= maxNeeded) {
          break;
        }
      }
    }

    if (
      (orderBy.field === "value" || orderBy.field === "ttl") &&
      maxNeeded === undefined
    ) {
      results.sort(compare);
    }

    const start = Math.max(0, offset);
    const end = limit !== undefined ? start + limit : undefined;
    return results.slice(start, end);
  }

  private async getServerUnixTime(
    connection: MemcachedConnection
  ): Promise<number> {
    try {
      const stats = await memcachedStats(connection);
      const serverTime = Number(stats.time);

      if (Number.isFinite(serverTime)) {
        return serverTime;
      }
    } catch (error) {
      logger.warn(
        "Failed to retrieve Memcached server time, falling back to local clock",
        error as Error
      );
    }

    return Math.floor(Date.now() / 1000);
  }

  private shouldExposeReservedKeys(): boolean {
    return (
      process.env.MEMGUI_DEV === "true" && process.env.MEMGUI_DEBUG === "true"
    );
  }

  private async getKeysValue(
    keys: string[],
    connection: MemcachedConnection,
    keysInfo?: Key[],
    serverUnixTime?: number,
    limit?: number
  ): Promise<KeyPayload[]> {
    const limiter = pLimit(MAX_CONCURRENT_REQUESTS);
    const currentUnixTime =
      serverUnixTime ?? (await this.getServerUnixTime(connection));
    const allowReservedKeys = this.shouldExposeReservedKeys();
    const filteredKeys = allowReservedKeys
      ? keys
      : keys.filter((key) => !isReservedKey(key));
    const fallbackKeysInfo =
      keysInfo ??
      (!connection.authentication
        ? this.getCachedumpSnapshot(connection)
        : null);
    const keysInfoMap = fallbackKeysInfo
      ? new Map(fallbackKeysInfo.map((info) => [info.key, info]))
      : null;

    const targetLimit =
      limit !== undefined &&
      Number.isFinite(limit) &&
      limit > 0 &&
      filteredKeys.length > limit
        ? limit
        : undefined;
    const batchSize =
      targetLimit !== undefined
        ? Math.min(MAX_CONCURRENT_REQUESTS, targetLimit)
        : MAX_CONCURRENT_REQUESTS;
    const validKeys: KeyPayload[] = [];

    for (let index = 0; index < filteredKeys.length; index += batchSize) {
      if (targetLimit !== undefined && validKeys.length >= targetLimit) {
        break;
      }

      const batch = filteredKeys.slice(index, index + batchSize);
      const results = await Promise.all(
        batch.map((key) =>
          limiter(async () => {
            try {
              const value = await memcachedGet(connection, key);

              if (value === null) {
                return null;
              }

              const valueToString = normalizeValue(value);
              return buildKeyPayload(
                key,
                valueToString,
                keysInfoMap,
                currentUnixTime
              );
            } catch (error) {
              logger.error(`Failed to fetch key ${key}`, error as Error);
              return null;
            }
          })
        )
      );

      for (const item of results) {
        if (item !== null && (allowReservedKeys || !isReservedKey(item.key))) {
          validKeys.push(item);
          if (targetLimit !== undefined && validKeys.length >= targetLimit) {
            break;
          }
        }
      }
    }

    return validKeys;
  }

  private async evaluateQueryBatch(
    connection: MemcachedConnection,
    keys: string[],
    filter: KeyQueryFilter | undefined,
    keysInfoMap: Map<string, Key> | null,
    currentUnixTime: number,
    maxNeeded?: number
  ): Promise<KeyPayload[]> {
    try {
      const payloads: KeyPayload[] = [];
      const resolveTtl = (key: string): number | null => {
        if (!keysInfoMap) {
          return null;
        }
        const info = keysInfoMap.get(key);
        if (!info) {
          return null;
        }
        const expiration = info.expiration;
        if (!Number.isFinite(expiration) || expiration <= 0) {
          return 0;
        }
        return Math.max(expiration - currentUnixTime, 0);
      };

      for (const multiChunk of chunkArray(keys, MULTI_GET_BATCH_SIZE)) {
        const chunkValues = await memcachedGetMulti(connection, multiChunk);
        if (Object.keys(chunkValues).length === 0) {
          continue;
        }

        for (const key of multiChunk) {
          const value = chunkValues[key];
          if (value === undefined || value === null) {
            continue;
          }
          const normalizedValue = normalizeValue(value);
          if (
            filter &&
            !evaluateKeyQuery(filter, {
              key,
              value: normalizedValue,
              ttl: resolveTtl(key)
            })
          ) {
            continue;
          }
          payloads.push(
            buildKeyPayload(key, normalizedValue, keysInfoMap, currentUnixTime)
          );

          if (maxNeeded !== undefined && payloads.length >= maxNeeded) {
            return payloads.slice(0, maxNeeded);
          }
        }

        if (maxNeeded !== undefined && payloads.length >= maxNeeded) {
          return payloads.slice(0, maxNeeded);
        }
      }

      return payloads;
    } catch (error) {
      logger.error("Failed to evaluate query batch", error as Error);
      return [];
    }
  }

  private async filterExistingKeys(
    keys: string[],
    connection: MemcachedConnection
  ): Promise<string[]> {
    const candidateKeys = keys.filter((key) => !isReservedKey(key));
    if (candidateKeys.length === 0) {
      return [];
    }

    const limit = pLimit(MAX_CONCURRENT_REQUESTS);
    const results = await Promise.all(
      candidateKeys.map((key) =>
        limit(async () => {
          try {
            const value = await memcachedGet(connection, key);
            return value ? key : null;
          } catch (error) {
            logger.error(`Failed to validate key ${key}`, error as Error);
            return null;
          }
        })
      )
    );

    return results.filter((item): item is string => item !== null).sort();
  }

  private getCachedumpSnapshot(connection: MemcachedConnection) {
    const connectionKey = this.getConnectionKey(connection);
    const snapshot = KeyController.cachedumpSnapshots.get(connectionKey);
    if (!snapshot) {
      return null;
    }

    const maxAgeMs = ONE_MINUTE_IN_SECONDS * 1000;
    if (Date.now() - snapshot.capturedAt > maxAgeMs) {
      KeyController.cachedumpSnapshots.delete(connectionKey);
      return null;
    }

    return snapshot.keysInfo;
  }

  private formatShardKey(index: number) {
    const padded = index.toString().padStart(2, "0");
    return `${RESERVED_KEYS.SHARD_PREFIX}${padded}${RESERVED_KEYS.SHARD_SUFFIX}`;
  }

  private buildIndexShards(keys: string[]): {
    indexKeys: string[];
    payloads: Record<string, string[]>;
  } {
    const payloads: Record<string, string[]> = {};
    const indexKeys: string[] = [];
    if (keys.length === 0) {
      return { indexKeys, payloads };
    }

    const payloadBytes = Buffer.byteLength(JSON.stringify(keys), "utf8");

    if (payloadBytes <= MEMCACHED_MAX_VALUE_BYTES) {
      const shardKey = this.formatShardKey(1);
      payloads[shardKey] = keys;
      return { indexKeys: [shardKey], payloads };
    }

    let shard: string[] = [];
    let shardIndex = 1;

    for (const key of keys) {
      shard.push(key);
      const shardBytes = Buffer.byteLength(JSON.stringify(shard), "utf8");

      if (shardBytes > MEMCACHED_MAX_VALUE_BYTES && shard.length > 1) {
        shard.pop();
        const shardKey = this.formatShardKey(shardIndex++);
        payloads[shardKey] = shard;
        indexKeys.push(shardKey);
        shard = [key];
      } else if (shardBytes > MEMCACHED_MAX_VALUE_BYTES) {
        const shardKey = this.formatShardKey(shardIndex++);
        payloads[shardKey] = shard;
        indexKeys.push(shardKey);
        shard = [];
      }
    }

    if (shard.length > 0) {
      const shardKey = this.formatShardKey(shardIndex);
      payloads[shardKey] = shard;
      indexKeys.push(shardKey);
    }

    return { indexKeys, payloads };
  }

  private async writeIndexShards(
    keys: string[],
    connection: MemcachedConnection
  ): Promise<void> {
    const uniqueKeys = Array.from(new Set(keys))
      .filter((key) => !isReservedKey(key))
      .sort();
    const previousIndexKeys = await this.getIndexKeyList(connection);
    const { indexKeys, payloads } = this.buildIndexShards(uniqueKeys);

    await Promise.all(
      indexKeys.map((indexKey) =>
        memcachedSet(
          connection,
          indexKey,
          JSON.stringify(payloads[indexKey] ?? []),
          ONE_DAY_IN_SECONDS
        )
      )
    );

    await memcachedSet(
      connection,
      RESERVED_KEYS.INDEXES,
      JSON.stringify(indexKeys),
      ONE_DAY_IN_SECONDS
    );

    const staleKeys = previousIndexKeys.filter(
      (key) => !indexKeys.includes(key)
    );

    await Promise.all(
      Array.from(new Set(staleKeys)).map((key) =>
        memcachedDelete(connection, key).catch(() => false)
      )
    );
  }

  private async getIndexKeyList(
    connection: MemcachedConnection
  ): Promise<string[]> {
    const response = await memcachedGet(connection, RESERVED_KEYS.INDEXES);
    if (!response) {
      return [];
    }

    try {
      const parsed = JSON.parse(normalizeValue(response));
      if (!Array.isArray(parsed)) {
        return [];
      }

      return Array.from(
        new Set(
          parsed.filter(
            (key): key is string =>
              typeof key === "string" &&
              key.startsWith(RESERVED_KEYS.SHARD_PREFIX)
          )
        )
      );
    } catch (error) {
      logger.error("Failed to read key index", error as Error);
      return [];
    }
  }

  private async getKeysFromIndexKey(
    connection: MemcachedConnection,
    indexKey: string
  ): Promise<string[]> {
    const response = await memcachedGet(connection, indexKey);
    if (!response) {
      return [];
    }

    try {
      const parsed = JSON.parse(normalizeValue(response));
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter(
        (key): key is string => typeof key === "string" && !isReservedKey(key)
      );
    } catch (error) {
      logger.error("Failed to read key index", error as Error);
      return [];
    }
  }

  private async getStoredKeysFromIndex(
    connection: MemcachedConnection
  ): Promise<string[]> {
    const indexKeys = await this.getIndexKeyList(connection);
    if (indexKeys.length === 0) {
      return [];
    }

    const keyLists = await Promise.all(
      indexKeys.map((indexKey) =>
        this.getKeysFromIndexKey(connection, indexKey)
      )
    );

    return Array.from(new Set(keyLists.flat())).sort();
  }

  private async updateKeyIndex(
    keyList: Pick<KeyPayload, "key">[] | string[],
    connection: MemcachedConnection,
    replace: boolean = true
  ): Promise<void> {
    const keys =
      typeof keyList[0] === "string"
        ? keyList
        : keyList.map((item) => (item as KeyPayload).key);

    try {
      let keysToStore: string[] = <string[]>keys;

      if (!replace) {
        const storedKeys = await this.getStoredKeysFromIndex(connection);
        const allKeys = Array.from(new Set([...storedKeys, ...keys])).sort();

        keysToStore = <string[]>allKeys;
      }

      await this.writeIndexShards(keysToStore, connection);
    } catch (error) {
      logger.error(error);
    }
  }

  private async removeKeysFromIndex(
    keysToRemove: string[],
    connection: MemcachedConnection
  ): Promise<void> {
    if (keysToRemove.length === 0) {
      return;
    }

    try {
      const storedKeys = await this.getStoredKeysFromIndex(connection);

      if (storedKeys.length === 0) {
        return;
      }

      const removalSet = new Set(
        keysToRemove.filter((key) => !isReservedKey(key))
      );
      const nextKeys = storedKeys.filter((key) => !removalSet.has(key));

      if (nextKeys.length === storedKeys.length) {
        return;
      }

      await this.writeIndexShards(nextKeys, connection);
    } catch (error) {
      logger.error(error);
    }
  }

  private applyKeyFilters(
    keys: string[],
    search: string,
    allowReservedKeys: boolean
  ): string[] {
    let filtered = allowReservedKeys
      ? [...keys]
      : keys.filter((key) => !isReservedKey(key));

    if (search) {
      try {
        const regex = new RegExp(search, "i");
        filtered = filtered.filter((key) => regex.test(key));
      } catch {
        filtered = filtered.filter((key) =>
          key.toLowerCase().includes(search.toLowerCase())
        );
      }
    }

    return filtered;
  }

  private resolveDumpBatchSize(batchSize?: number): number {
    const maxBatchSize = Math.max(1, Math.min(MAX_CONCURRENT_REQUESTS, 100));
    const defaultBatchSize = Math.min(50, maxBatchSize);

    if (!Number.isFinite(batchSize) || batchSize === undefined) {
      return defaultBatchSize;
    }

    return Math.max(1, Math.min(Math.floor(batchSize), maxBatchSize));
  }

  private async resolveDumpKeys(
    connection: MemcachedConnection,
    filters?: DumpFilterOptions
  ): Promise<{ keys: string[]; keysInfo: Key[] | null }> {
    const snapshot = await this.resolveDumpSnapshot(connection, filters);
    return { keys: snapshot.keys, keysInfo: snapshot.keysInfo };
  }

  private async resolveDumpSnapshot(
    connection: MemcachedConnection,
    filters?: DumpFilterOptions
  ): Promise<DumpKeySnapshot> {
    const snapshot = await this.getDumpKeySnapshot(connection);
    const normalized = this.normalizeDumpFilters(filters);
    if (!normalized) {
      return snapshot;
    }

    return this.applyDumpFilters(connection, snapshot, normalized);
  }

  private normalizeDumpFilters(
    filters?: DumpFilterOptions
  ): DumpFilterOptions | null {
    if (!filters) {
      return null;
    }

    const normalized: DumpFilterOptions = {};

    if (typeof filters.query === "string") {
      const query = filters.query.trim();
      if (query) {
        normalized.query = query;
      }
    }

    if (typeof filters.prefix === "string") {
      const prefix = filters.prefix.trim();
      if (prefix) {
        normalized.prefix = prefix;
      }
    }

    const parseNumber = (value: unknown, label: string): number | undefined => {
      if (value === undefined || value === null) {
        return undefined;
      }
      if (typeof value === "string" && value.trim().length === 0) {
        return undefined;
      }
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error(`Invalid ${label}`);
      }
      return Math.floor(parsed);
    };

    const minSize = parseNumber(filters.minSize, "minimum size");
    const maxSize = parseNumber(filters.maxSize, "maximum size");
    const minTtl = parseNumber(filters.minTtl, "minimum TTL");
    const maxTtl = parseNumber(filters.maxTtl, "maximum TTL");

    if (minSize !== undefined) {
      normalized.minSize = minSize;
    }
    if (maxSize !== undefined) {
      normalized.maxSize = maxSize;
    }
    if (minTtl !== undefined) {
      normalized.minTtl = minTtl;
    }
    if (maxTtl !== undefined) {
      normalized.maxTtl = maxTtl;
    }

    if (
      normalized.minSize !== undefined &&
      normalized.maxSize !== undefined &&
      normalized.minSize > normalized.maxSize
    ) {
      throw new Error("Invalid size range");
    }

    if (
      normalized.minTtl !== undefined &&
      normalized.maxTtl !== undefined &&
      normalized.minTtl > normalized.maxTtl
    ) {
      throw new Error("Invalid TTL range");
    }

    if (Object.keys(normalized).length === 0) {
      return null;
    }

    return normalized;
  }

  private async applyDumpFilters(
    connection: MemcachedConnection,
    snapshot: DumpKeySnapshot,
    filters: DumpFilterOptions
  ): Promise<DumpKeySnapshot> {
    let keys = snapshot.keys;
    let keysInfo = snapshot.keysInfo;

    if (filters.prefix) {
      keys = keys.filter((key) => key.startsWith(filters.prefix));
    }

    const hasSizeFilter =
      filters.minSize !== undefined || filters.maxSize !== undefined;
    const hasTtlFilter =
      filters.minTtl !== undefined || filters.maxTtl !== undefined;

    let serverUnixTime: number | undefined;

    if (hasTtlFilter && !keysInfo) {
      throw new Error("TTL filtering requires cachedump metadata");
    }

    if (keysInfo && (hasSizeFilter || hasTtlFilter)) {
      serverUnixTime = await this.getServerUnixTime(connection);
      const infoMap = new Map(keysInfo.map((info) => [info.key, info]));
      const filteredKeys: string[] = [];

      for (const key of keys) {
        const info = infoMap.get(key);
        if (!info) {
          continue;
        }

        const size = info.size;
        const expiration = info.expiration;
        const ttl =
          expiration > 0 && serverUnixTime !== undefined
            ? Math.max(expiration - serverUnixTime, 0)
            : 0;

        if (filters.minSize !== undefined && size < filters.minSize) {
          continue;
        }
        if (filters.maxSize !== undefined && size > filters.maxSize) {
          continue;
        }
        if (filters.minTtl !== undefined && ttl < filters.minTtl) {
          continue;
        }
        if (filters.maxTtl !== undefined && ttl > filters.maxTtl) {
          continue;
        }

        filteredKeys.push(key);
      }

      keys = filteredKeys;
      const keySet = new Set(keys);
      keysInfo = keysInfo.filter((info) => keySet.has(info.key));
    } else if (!keysInfo && hasSizeFilter) {
      serverUnixTime = await this.getServerUnixTime(connection);
      const payload = await this.getKeysValue(
        keys,
        connection,
        undefined,
        serverUnixTime
      );
      keys = payload
        .filter((item) => {
          if (filters.minSize !== undefined && item.size < filters.minSize) {
            return false;
          }
          if (filters.maxSize !== undefined && item.size > filters.maxSize) {
            return false;
          }
          return true;
        })
        .map((item) => item.key);
    }

    if (filters.query) {
      const parsed = parseKeyQuery(filters.query);
      if ("error" in parsed) {
        throw new Error(parsed.error);
      }
      const payload = await this.queryKeysInBatches(
        keys,
        connection,
        parsed.query,
        {
          keysInfo: keysInfo ?? undefined,
          serverUnixTime
        }
      );
      keys = payload.map((item) => item.key);
      if (keysInfo) {
        const keySet = new Set(keys);
        keysInfo = keysInfo.filter((info) => keySet.has(info.key));
      }
    }

    return {
      ...snapshot,
      keys,
      keysInfo
    };
  }

  private async getDumpKeySnapshot(
    connection: MemcachedConnection
  ): Promise<DumpKeySnapshot> {
    const allowReservedKeys = this.shouldExposeReservedKeys();

    if (connection.authentication) {
      let storedKeys: string[] = [];
      try {
        storedKeys = await this.getStoredKeysFromIndex(connection);
      } catch (error) {
        logger.error("Failed to read index for export", error as Error);
      }
      const keys = allowReservedKeys
        ? storedKeys
        : storedKeys.filter((key) => !isReservedKey(key));
      return {
        keys,
        keysInfo: null,
        indexCount: keys.length,
        cachedumpCount: 0
      };
    }

    let storedKeys: string[] = [];
    try {
      storedKeys = await this.getStoredKeysFromIndex(connection);
    } catch (error) {
      logger.error("Failed to read index for export", error as Error);
    }

    let cachedumpKeysInfo: Key[] | null = null;
    try {
      const cachedump = await this.getCachedumpKeysInfo(connection);
      cachedumpKeysInfo = allowReservedKeys
        ? cachedump.keysInfo
        : cachedump.keysInfo.filter((info) => !isReservedKey(info.key));
    } catch (error) {
      logger.error("Failed to fetch cachedump for export", error as Error);
    }

    const storedKeysFiltered = allowReservedKeys
      ? storedKeys
      : storedKeys.filter((key) => !isReservedKey(key));
    const cachedumpKeys = cachedumpKeysInfo
      ? cachedumpKeysInfo.map((info) => info.key)
      : [];
    const keys = Array.from(
      new Set([...storedKeysFiltered, ...cachedumpKeys])
    ).sort();

    return {
      keys,
      keysInfo: cachedumpKeysInfo,
      indexCount: storedKeysFiltered.length,
      cachedumpCount: cachedumpKeys.length
    };
  }
}

export const makeKeyController = () => new KeyController();
