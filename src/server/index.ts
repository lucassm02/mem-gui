import cors from 'cors';
import express from 'express';
import { body, param, validationResult } from 'express-validator';
import memjs from 'memjs';
import net from 'net';
import path from 'path';
import pLimit from 'p-limit';

import { promisify } from 'util';

import { v4 as uuidv4 } from 'uuid';

const TELNET_TIMEOUT = 5000;
const MAX_CONCURRENT_REQUESTS = 10;
const CONNECTION_TIMEOUT = 300_000;

const STATIC_FILES_PATH = path.join(__dirname, '..', 'ui');

interface MemcachedConnection {
  id: string;
  host: string;
  port: number;
  client: memjs.Client;
  lastActive: Date;
  timer: NodeJS.Timeout;
}

interface CacheResponse {
  key: string;
  value: string | null;
  timeUntilExpiration: number;
  size: number;
}

interface KeyInfo {
  key: string;
  expiration: number;
  size: number;
  slabId?: string;
}

interface MemcachedConnection {
  host: string;
  port: number;
  client: memjs.Client;
  lastActive: Date;
}

const server = express();
server.use(cors());
server.use(express.json());

server.use(express.static(STATIC_FILES_PATH));

server.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    logger.error('Erro não tratado', err);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
);

const connections = new Map<string, MemcachedConnection>();

const logger = {
  info: (message: string, meta?: object) =>
    console.log(
      JSON.stringify({ timestamp: new Date(), level: 'INFO', message, ...meta })
    ),

  error: (message: string, error?: Error) =>
    console.error(
      JSON.stringify({
        timestamp: new Date(),
        level: 'ERROR',
        message,
        error: error?.message,
        stack: error?.stack,
      })
    ),
};

function extractKeysInfoFromDump(
  dumpOutput: string,
  slabId?: string
): KeyInfo[] {
  const regex = /ITEM\s+(\S+)\s+\[(\d+)\s*b;\s*(\d+)\s*s\]/g;
  const results: KeyInfo[] = [];
  for (const match of dumpOutput.matchAll(regex)) {
    const key = match[1];
    const size = parseInt(match[2], 10);
    const expiration = parseInt(match[3], 10);
    results.push({ key, size, expiration, slabId });
  }
  return results;
}

function extractUsedChunksFromSlabs(slabsOutput: string): Map<string, number> {
  const slabMap = new Map<string, number>();
  const regex = /STAT\s+(\d+):used_chunks\s+(\d+)/g;
  for (const match of slabsOutput.matchAll(regex)) {
    const slabId = match[1];
    const usedChunks = parseInt(match[2], 10);
    slabMap.set(slabId, usedChunks);
  }
  return slabMap;
}

const RESERVED_KEY = '__ALL_KEYS__';

const validateRequest = (validations: any[]) => {
  return async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.error(
        'Validação falhou',
        new Error(JSON.stringify(errors.array()))
      );
      res.status(400).json({ errors: errors.array() });
      return;
    }

    next();
  };
};

const checkConnection = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const connectionId = req.headers['x-connection-id'] as string;

  if (!connectionId) {
    res.status(400).json({ error: 'ID de conexão não fornecido' });
    return;
  }

  const connection = connections.get(connectionId);

  if (!connection) {
    res.status(404).json({ error: 'Conexão não encontrada' });
    return;
  }

  try {
    connection.lastActive = new Date();

    clearTimeout(connection.timer);
    connection.timer = setTimeout(() => {
      logger.info(`Conexão ${connectionId} expirada por inatividade`);
      connection.client.close();
      connections.delete(connectionId);
    }, CONNECTION_TIMEOUT);

    req.currentConnection = connection;
    next();
  } catch (error) {
    logger.error(`Conexão ${connectionId} inativa`, error as Error);
    connections.delete(connectionId);
    res.status(503).json({ error: 'Conexão com Memcached perdida' });
  }
};

const executeTelnetCommand = async (
  connection: MemcachedConnection,
  command: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let buffer = '';
    const timeout = setTimeout(() => {
      client.destroy();
      reject(new Error(`Timeout: Nenhuma resposta em ${TELNET_TIMEOUT}ms`));
    }, TELNET_TIMEOUT);

    client.connect(connection.port, connection.host, () => {
      client.write(`${command}\r\n`);
    });

    client.on('data', (data) => {
      buffer += data.toString();
      if (buffer.includes('END') || buffer.includes('ERROR')) {
        clearTimeout(timeout);
        client.destroy();
        resolve(buffer);
      }
    });

    client.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
};

const ConnectionController = {
  connect: async (req: express.Request, res: express.Response) => {
    try {
      const { host, port } = req.body;
      const connectionId = uuidv4();

      const client = memjs.Client.create(`${host}:${port}`, {
        retries: 1,
        timeout: 5000,
      });

      await new Promise<void>((resolve, reject) => {
        client.stats((err) => (err ? reject(err) : resolve()));
      });

      const newConnection: MemcachedConnection = {
        id: connectionId,
        host,
        port: Number(port),
        client,
        lastActive: new Date(),
        timer: setTimeout(() => {
          logger.info(`Conexão ${connectionId} expirada por inatividade`);
          client.close();
          connections.delete(connectionId);
        }, CONNECTION_TIMEOUT),
      };

      connections.set(connectionId, newConnection);

      logger.info('Nova conexão Memcached estabelecida', {
        connectionId,
        host,
        port,
      });
      res.json({
        status: 'connected',
        connectionId,
        host,
        port,
        timestamp: newConnection.lastActive,
      });
    } catch (error) {
      logger.error('Falha na conexão Memcached', error as Error);
      res.status(500).json({
        error: 'Falha na conexão',
        details: (error as Error).message,
      });
    }
  },

  disconnect: async (req: express.Request, res: express.Response) => {
    const connection = req.currentConnection!;
    connection.client.close();
    clearTimeout(connection.timer);
    connections.delete(connection.id);

    logger.info('Conexão Memcached encerrada', {
      connectionId: connection.id,
    });
    res.json({ status: 'disconnected', connectionId: connection!.id });
  },

  status: async (req: express.Request, res: express.Response) => {
    const connection = req.currentConnection!;

    try {
      function statsWrapper(
        cb: (error: unknown, stats: Record<string, string> | null) => void
      ) {
        connection.client.stats((error, _, stats) => {
          cb(error, stats);
        });
      }

      const serverInfo = await promisify(statsWrapper)();

      res.json({
        status: 'connected',
        connectionId: connection!.id,
        host: connection!.host,
        port: connection!.port,
        lastActive: connection!.lastActive,
        serverInfo,
      });
    } catch (error) {
      res.json({
        status: 'error',
        error: (error as Error).message,
      });
    }
  },
};

const CacheController = {
  listKeys: async (req: express.Request, res: express.Response) => {
    const connection = req.currentConnection;
    if (!connection) {
      res.status(400).json({ error: 'Conexão não definida.' });
      return;
    }

    try {
      // 1. Obtém as informações dos slabs usando o comando "stats slabs"
      const slabsOutput = await executeTelnetCommand(connection, 'stats slabs');
      const slabUsedMap = extractUsedChunksFromSlabs(slabsOutput);
      const slabIds = Array.from(slabUsedMap.keys());

      // 2. Para cada slab, obtém o dump e extrai as informações (chave, tamanho, expiração, slabId)
      const keysInfoArrays = await Promise.all(
        slabIds.map(async (slabId) => {
          try {
            const dumpOutput = await executeTelnetCommand(
              connection,
              `stats cachedump ${slabId} 1000`
            );
            return extractKeysInfoFromDump(dumpOutput, slabId);
          } catch (error) {
            logger.error(`Erro ao processar slab ${slabId}`, error as Error);
            return [];
          }
        })
      );

      // Junta todas as informações extraídas
      const keysInfo = keysInfoArrays.flat();

      // 3. Verifica, para cada slab, se a quantidade de itens retornada pelo cachedump
      // bate com o valor indicado em stats slabs
      let discrepancyFound = false;
      for (const slabId of slabIds) {
        const expectedCount = slabUsedMap.get(slabId) || 0;
        const actualCount = keysInfo.filter(
          (info) => info.slabId === slabId
        ).length;
        if (actualCount !== expectedCount) {
          discrepancyFound = true;
          break;
        }
      }

      // 4. Se houver discrepância, busca as chaves armazenadas na chave reservada
      let unionKeys: string[];
      if (discrepancyFound) {
        let storedKeys: string[] = [];
        try {
          const reservedData = await connection.client.get(RESERVED_KEY);
          if (reservedData) {
            storedKeys = JSON.parse(reservedData.toString());
          }
        } catch (err) {
          logger.error('Erro ao obter chave reservada', err as Error);
        }
        // Junta as chaves obtidas via cachedump com as armazenadas anteriormente
        unionKeys = Array.from(
          new Set([...keysInfo.map((info) => info.key), ...storedKeys])
        );
      } else {
        // Se não houver discrepância, utiliza somente as chaves obtidas via cachedump
        unionKeys = Array.from(new Set(keysInfo.map((info) => info.key)));
      }

      // 5. Para cada chave do conjunto final, obtém seu valor e monta a resposta.
      const limit = pLimit(MAX_CONCURRENT_REQUESTS);
      const results: CacheResponse[] = await Promise.all(
        unionKeys.map((key) =>
          limit(async () => {
            try {
              const { value } = await connection!.client.get(key);
              // Tenta recuperar as informações (expiração e tamanho) para a chave,
              // se disponível; caso contrário, assume 0.
              const info = keysInfo.find((info) => info.key === key);
              const expiration = info ? info.expiration : 0;
              const size = info ? info.size : 0;
              const currentUnixTime = Math.floor(Date.now() / 1000);
              const timeUntilExpiration =
                expiration > 0 ? expiration - currentUnixTime : 0;

              return {
                key,
                value: value?.toString() || null,
                timeUntilExpiration,
                size,
              };
            } catch (error) {
              logger.error(`Erro ao obter a chave ${key}`, error as Error);
              return { key, value: null, timeUntilExpiration: 0, size: 0 };
            }
          })
        )
      );

      const ONE_DAY_IN_SECONDS = 86400;

      // 6. Atualiza a chave reservada com a união atual de chaves (de forma assíncrona)
      connection.client
        .set(RESERVED_KEY, JSON.stringify(unionKeys), {
          expires: ONE_DAY_IN_SECONDS,
        })
        .catch((err: Error) =>
          logger.error('Erro ao atualizar chave reservada', err)
        );

      const resultWithoutReservedKey = results.filter(
        (item) => item.key !== RESERVED_KEY
      );

      res.json(resultWithoutReservedKey);
    } catch (error) {
      logger.error('Erro ao listar chaves', error as Error);
      res.status(500).json({ error: 'Falha ao recuperar chaves' });
    }
  },
  getKey: async (req: express.Request, res: express.Response) => {
    try {
      const connection = req.currentConnection;

      const { key } = req.params;
      const { value } = await connection!.client.get(key);
      res.json({ key, value: value?.toString() || null });
    } catch (error) {
      logger.error(`Erro ao obter chave ${req.params.key}`, error);
      res.status(500).json({ error: 'Erro ao obter valor da chave' });
    }
  },

  deleteKey: async (req: express.Request, res: express.Response) => {
    try {
      const connection = req.currentConnection;

      const { key } = req.params;
      await connection!.client.delete(key);
      res.sendStatus(204);
    } catch (error) {
      logger.error(`Erro ao deletar chave ${req.params.key}`, error);
      res.status(500).json({ error: 'Erro ao deletar chave' });
    }
  },

  setKey: async (req: express.Request, res: express.Response) => {
    try {
      const connection = req.currentConnection!;

      const { key, value, expires } = req.body;
      const options = expires ? { expires: expires } : undefined;

      const success = await connection.client.set(key, value, options);

      if (!success) {
        throw new Error('Falha ao armazenar valor');
      }

      res.status(201).json({
        key,
        status: 'created',
        ttl: options?.expires,
      });
    } catch (error) {
      logger.error('Erro ao definir chave', error as Error);
      res.status(500).json({ error: 'Falha ao armazenar valor' });
    }
  },
};

server.post(
  '/api/connections',
  validateRequest([
    body('host').isString(),
    body('port').isInt({ min: 1, max: 65535 }),
  ]),
  ConnectionController.connect
);

server.delete(
  '/api/connections',
  checkConnection,
  ConnectionController.disconnect
);

server.get('/api/connections', checkConnection, ConnectionController.status);

server.get('/api/keys', checkConnection, CacheController.listKeys);

server.get(
  '/api/keys/:key',
  checkConnection,
  validateRequest([param('key').isString().notEmpty()]),
  CacheController.getKey
);
server.post(
  '/api/keys',
  checkConnection,
  validateRequest([
    body('key').isString().notEmpty(),
    body('value').isString().notEmpty(),
    body('ttl').optional().isInt({ min: 0 }),
  ]),
  CacheController.setKey
);
server.delete(
  '/api/keys/:key',
  checkConnection,
  validateRequest([param('key').isString().notEmpty()]),
  CacheController.deleteKey
);

export { server };
