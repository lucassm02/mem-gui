import { Request, Response } from "express";
import pLimit from "p-limit";
import {
  connectionManager,
  extractKeysInfoFromDump,
  extractUsedChunksFromSlabs,
  logger,
  MAX_CONCURRENT_REQUESTS,
  ONE_DAY_IN_SECONDS,
  RESERVED_KEY
} from "@/utils/backend";
import { executeMemcachedStatsCommand } from "@/utils/backend/executeMemcachedStatsCommand";

class KeyController {
  constructor() {}

  async getAll(request: Request, response: Response) {
    const connections = connectionManager();
    const connectionId = <string>request.headers["x-connection-id"];
    const connection = connections.get(connectionId)!;

    try {
      // 1. Busca as chaves armazenadas na chave reservada
      let storedKeys: string[] = [];
      try {
        const reservedData = await connection.client.get(RESERVED_KEY);

        if (reservedData.value) {
          storedKeys = JSON.parse(reservedData.value.toString());
        }
      } catch (err) {
        logger.error("Erro ao obter chave reservada", err as Error);
      }

      // 2. Obtém as informações dos slabs usando "stats slabs"
      const slabsOutput = await executeMemcachedStatsCommand(
        connection,
        "stats slabs"
      );

      const slabUsedMap = extractUsedChunksFromSlabs(slabsOutput);
      const slabIds = Array.from(slabUsedMap.keys());

      // 3. Para cada slab, busca o cachedump e extrai as chaves
      const keysInfoArrays = await Promise.all(
        slabIds.map(async (slabId) => {
          try {
            const dumpOutput = await executeMemcachedStatsCommand(
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

      // 4. Junta todas as chaves encontradas, eliminando duplicatas e ordenando
      const keysInfo = keysInfoArrays.flat(); // Mantemos a estrutura completa com expiração e tamanho
      const slabKeys = keysInfo.map((info) => info.key);
      const allKeys = Array.from(new Set([...slabKeys, ...storedKeys])).sort();

      if (allKeys.length === 0) {
        response.json([]);
        return;
      }

      // 5. Para cada chave, obtém o valor e restaura expiração e tamanho
      const limit = pLimit(MAX_CONCURRENT_REQUESTS);

      const keysToDelete: string[] = [];

      const results = await Promise.all(
        allKeys.map((key) =>
          limit(async () => {
            try {
              const { value } = await connection.client.get(key);

              if (!value) {
                keysToDelete.push(key);
                return null;
              }

              // Recupera expiração e tamanho da chave, se disponível
              const info = keysInfo.find((info) => info.key === key);

              const expiration = info ? info.expiration : 0;
              const currentUnixTime = Math.floor(Date.now() / 1000);

              const timeUntilExpiration =
                expiration > 0 ? expiration - currentUnixTime : 0;

              const valueToString = value.toString();

              const size = info
                ? info.size
                : // eslint-disable-next-line no-undef
                  Buffer.from(valueToString, "utf8").length;

              return {
                key,
                value: valueToString,
                timeUntilExpiration,
                size
              };
            } catch (error) {
              logger.error(`Erro ao obter a chave ${key}`, error as Error);
              return { key, value: null, timeUntilExpiration: 0, size: 0 };
            }
          })
        )
      );

      const filteredAllKeys = allKeys.filter((k) => !keysToDelete.includes(k));

      // 6. Atualiza a chave reservada com a lista ordenada de chaves
      connection.client
        .set(RESERVED_KEY, JSON.stringify(filteredAllKeys), {
          expires: ONE_DAY_IN_SECONDS
        })
        .catch((err: Error) =>
          logger.error("Erro ao atualizar chave reservada", err)
        );

      // 7. Retorna os resultados sem incluir a chave reservada
      const resultWithoutReservedKey = results.filter(
        (item) => item && item.key !== RESERVED_KEY
      );
      response.json(resultWithoutReservedKey);
    } catch (error) {
      const message = "Falha ao recuperar chaves";
      logger.error(message, error);
      response.status(500).json({
        error: message
      });
    }
  }

  async create(request: Request, response: Response) {
    try {
      const connections = connectionManager();
      const connectionId = <string>request.headers["x-connection-id"];
      const connection = connections.get(connectionId)!;

      const { key, value, expires } = request.body;
      const options = expires ? { expires: expires } : undefined;

      const success = await connection.client.set(key, value, options);

      if (!success) {
        throw new Error("Falha ao armazenar valor");
      }

      response.status(201).json({
        key,
        status: "created",
        ttl: options?.expires
      });

      connection.client.get(RESERVED_KEY).then((response) => {
        if (!response) return;

        try {
          const storedKeys = response?.value
            ? JSON.parse(response?.value.toString())
            : [];

          const allKeys = Array.from(new Set([...storedKeys, key])).sort();

          connection.client
            .set(RESERVED_KEY, JSON.stringify(allKeys), {
              expires: ONE_DAY_IN_SECONDS
            })
            .catch((err: Error) =>
              logger.error("Erro ao atualizar chave reservada", err)
            );
        } catch (error) {
          logger.error(error);
        }
      });
    } catch (error) {
      const message = "Erro ao definir chave";
      logger.error(message, error);
      response.status(500).json({
        error: message
      });
    }
  }

  async deleteById(request: Request, response: Response) {
    try {
      const connections = connectionManager();
      const connectionId = <string>request.headers["x-connection-id"];

      const connection = connections.get(connectionId)!;

      await connection.client.delete(<string>request.params.key);
      response.status(204).send("");
    } catch (error) {
      const message = `Erro ao deletar chave ${request.params.key}`;
      logger.error(message, error);
      response.status(500).json({
        error: message
      });
    }
  }

  async getById(request: Request, response: Response) {
    try {
      const connections = connectionManager();
      const connectionId = <string>request.headers["x-connection-id"];
      const connection = connections.get(connectionId)!;

      const key = <string>request.params.key;

      const { value } = await connection!.client.get(key);
      response.json({ key, value: value?.toString() || null });
    } catch (error) {
      const message = `Erro ao obter chave ${request.params.key}`;
      logger.error(message, error);
      response.status(500).json({
        error: message
      });
    }
  }
}

export const makeKeyController = () => new KeyController();
