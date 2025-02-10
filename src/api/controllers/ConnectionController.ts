import { randomUUID } from "crypto";
import { promisify } from "node:util";
import { Request, Response } from "express";
import memjs from "memjs";
import z from "zod";

import { MemcachedConnection } from "@/api/types";
import {
  connectionManager,
  logger,
  extractSlabInfoFromStatsSlabsOutput
} from "@/api/utils";
import { executeMemcachedCommand } from "@/api/utils/executeMemcachedCommand";
import { connectionSchema } from "@/api/utils/validationSchema";

class ConnectionController {
  constructor() {}

  async delete(request: Request, response: Response): Promise<void> {
    try {
      const connections = connectionManager();
      const connectionId = <string>request.headers["x-connection-id"];
      const connection = connections.get(connectionId)!;

      connection.client.close();
      clearTimeout(connection.timer);
      connections.delete(connection.id);

      logger.info("Conexão Memcached encerrada", {
        connectionId: connection.id
      });

      response.json({ status: "disconnected", connectionId: connection.id });
    } catch (error) {
      const message = "Falha ao desconectar";
      logger.error(message, error);
      response.status(500).json({
        error: message
      });
    }
  }

  async getStatus(request: Request, response: Response): Promise<void> {
    try {
      const connections = connectionManager();
      const connectionId = <string>request.headers["x-connection-id"];
      const connection = connections.get(connectionId)!;

      function statsWrapper(
        cb: (error: unknown, stats: Record<string, string> | null) => void
      ) {
        connection.client.stats((error, _, stats) => {
          cb(error, stats);
        });
      }

      const [slabsOutput, serverInfo] = await Promise.all([
        executeMemcachedCommand("stats slabs", connection),
        promisify(statsWrapper)()
      ]);

      const { slabs, info } = extractSlabInfoFromStatsSlabsOutput(slabsOutput);

      response.json({
        status: "connected",
        connectionId: connection.id,
        host: connection.host,
        port: connection.port,
        lastActive: connection.lastActive,
        serverInfo: { ...serverInfo, ...info, slabs }
      });
    } catch (error) {
      const message = "Falha ao buscar status da conexão";
      logger.error(message, error);
      response.status(404).json({
        error: message
      });
    }
  }

  async create(request: Request, response: Response): Promise<void> {
    try {
      const connections = connectionManager();

      type Body = z.infer<typeof connectionSchema>["body"];

      const { host, port, connectionTimeout, authentication } = <Body>(
        request.body
      );

      const connectionId = randomUUID();

      const client = memjs.Client.create(`${host}:${port}`, {
        retries: 1,
        username: authentication?.username,
        password: authentication?.password,
        timeout: connectionTimeout
      });

      await new Promise<void>((resolve, reject) => {
        client.stats((error: unknown) => (error ? reject(error) : resolve()));
      });

      const newConnection: MemcachedConnection = {
        id: connectionId,
        host,
        port: Number(port),
        client,
        lastActive: new Date(),
        authentication,
        connectionTimeout,
        timer: setTimeout(() => {
          logger.info(`Conexão ${connectionId} expirada por inatividade`);
          client.close();
          connections.delete(connectionId);
        }, connectionTimeout * 1000)
      };

      connections.set(connectionId, newConnection);

      logger.info("Nova conexão Memcached estabelecida", {
        connectionId,
        host,
        port
      });

      response.status(201).json({
        status: "connected",
        connectionId,
        host,
        port,
        timestamp: newConnection.lastActive
      });
    } catch (error) {
      const message = "Falha ao criar conexão";
      logger.error(message, error);
      response.status(500).json({
        error: message
      });
    }
  }
}

export const makeConnectionController = () => new ConnectionController();
