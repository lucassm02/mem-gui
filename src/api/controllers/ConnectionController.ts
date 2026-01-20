import { randomUUID } from "crypto";
import { Request, Response } from "express";
import Memcached from "memcached";
import z from "zod";

import { MemcachedConnection } from "@/api/types";
import {
  closeConnection,
  connectionManager,
  extractSlabInfoFromStatsSlabsOutput,
  logger,
  MEMCACHED_CONNECT_TIMEOUT_SECONDS,
  MEMCACHED_KEEPALIVE_DELAY_SECONDS,
  touchConnection
} from "@/api/utils";
import { executeMemcachedCommand } from "@/api/utils/executeMemcachedCommand";
import { memcachedStats } from "@/api/utils/memcachedClient";
import {
  closeSshTunnel,
  createSshTunnel,
  SshHostKeyError
} from "@/api/utils/sshTunnel";
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
    let client: Memcached | null = null;
    let tunnel: MemcachedConnection["tunnel"] | null = null;

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

      const connectTimeoutSeconds = Math.min(
        connectionTimeout,
        MEMCACHED_CONNECT_TIMEOUT_SECONDS
      );

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

      if (sshConfig) {
        const normalizedSshHost = sshConfig.host?.trim();
        const legacySshHost = !normalizedSshHost;
        const sshHost = normalizedSshHost || host;
        const remoteHost = legacySshHost ? "127.0.0.1" : host;
        tunnel = await createSshTunnel({
          sshHost,
          ssh: sshConfig,
          remoteHost,
          remotePort: Number(port),
          readyTimeoutMs: connectionTimeout * 1000,
          expectedHostFingerprint: sshConfig.hostKeyFingerprint
        });
      }

      const targetHost = tunnel ? tunnel.localHost : host;
      const targetPort = tunnel ? tunnel.localPort : port;

      const timeoutMs = Math.round(connectionTimeout * 1000);
      const memcachedClient = new Memcached(`${targetHost}:${targetPort}`, {
        retries: 1,
        timeout: timeoutMs,
        idle: MEMCACHED_KEEPALIVE_DELAY_SECONDS * 1000,
        username: auth?.username,
        password: auth?.password
      });
      client = memcachedClient;

      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const timeout = setTimeout(() => {
          if (settled) return;
          settled = true;
          try {
            memcachedClient.end();
          } catch {
            // Ignore close errors.
          }
          if (tunnel) {
            closeSshTunnel(tunnel);
            tunnel = null;
          }
          client = null;
          reject(
            new Error(
              `Timeout: No response from memcached within ${timeoutMs}ms`
            )
          );
        }, timeoutMs);

        memcachedClient.stats((error: unknown) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          if (error) {
            reject(
              error instanceof Error ? error : new Error("Memcached error")
            );
            return;
          }
          resolve();
        });
      });

      const newConnection: MemcachedConnection = {
        id: connectionId,
        host,
        port: Number(port),
        client: memcachedClient,
        lastActive: new Date(),
        authentication: auth,
        connectionTimeout,
        timer: setTimeout(() => undefined, 0),
        ssh: sshConfig,
        tunnel: tunnel ?? undefined
      };

      connections.set(connectionId, newConnection);
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
        if (client) {
          client.end();
        }
        if (tunnel) {
          closeSshTunnel(tunnel);
        }
        response.status(409).json({
          error: error.message,
          code: error.code,
          fingerprint: error.fingerprint,
          expectedFingerprint: error.expectedFingerprint
        });
        return;
      }
      if (client) {
        client.end();
      }
      if (tunnel) {
        closeSshTunnel(tunnel);
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
