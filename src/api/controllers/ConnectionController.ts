import { randomUUID } from "crypto";
import { Request, Response } from "express";
import z from "zod";

import { ConnectionProfile, MemcachedConnection } from "@/api/types";
import {
  closeConnection,
  connectionManager,
  createMemcachedConnection,
  extractSlabInfoFromStatsSlabsOutput,
  logger,
  touchConnection
} from "@/api/utils";
import { executeMemcachedCommand } from "@/api/utils/executeMemcachedCommand";
import { memcachedStats } from "@/api/utils/memcachedClient";
import { SshHostKeyError } from "@/api/utils/sshTunnel";
import { connectionSchema } from "@/api/utils/validationSchema";

class ConnectionController {
  constructor() {}

  async delete(request: Request, response: Response): Promise<void> {
    try {
      const connections = connectionManager();
      const connectionId = <string>request.headers["x-connection-id"];

      if (!connectionId) {
        response.status(400).json({ error: "ID de conexao nao fornecido" });
        return;
      }

      const connection = connections.get(connectionId);
      if (!connection) {
        response.status(404).json({ error: "Conexao nao encontrada" });
        return;
      }

      closeConnection(connection);
      connections.deleteProfile(connectionId);

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

      const [slabsOutput, serverInfo] = await Promise.all([
        executeMemcachedCommand("stats slabs", connection),
        memcachedStats(connection)
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
    const connections = connectionManager();

    try {
      type Body = z.infer<typeof connectionSchema>["body"];

      const { host, port, connectionTimeout, authentication, ssh } = <Body>(
        request.body
      );

      const connectionId = randomUUID();

      const auth =
        authentication &&
        authentication.username.trim().length > 0 &&
        authentication.password.length > 0
          ? {
              username: authentication.username.trim(),
              password: authentication.password
            }
          : undefined;

      const sshConfig = ssh
        ? {
            host: ssh.host?.trim(),
            port: ssh.port,
            username: ssh.username.trim(),
            password: ssh.password,
            privateKey: ssh.privateKey,
            hostKeyFingerprint: ssh.hostKeyFingerprint
          }
        : undefined;

      const profile: ConnectionProfile = {
        id: connectionId,
        host,
        port: Number(port),
        authentication: auth,
        connectionTimeout,
        ssh: sshConfig
      };

      const newConnection: MemcachedConnection =
        await createMemcachedConnection(profile);

      connections.set(connectionId, newConnection);
      connections.setProfile(connectionId, profile);
      touchConnection(newConnection);

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
      if (error instanceof SshHostKeyError) {
        response.status(409).json({
          error: error.message,
          code: error.code,
          fingerprint: error.fingerprint,
          expectedFingerprint: error.expectedFingerprint
        });
        return;
      }
      const message = "Falha ao criar conexão";
      logger.error(message, error);
      response.status(500).json({
        error: message
      });
    }
  }
}

export const makeConnectionController = () => new ConnectionController();
