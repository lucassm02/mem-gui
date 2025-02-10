import { NextFunction, Request, Response } from "express";
import { connectionManager, logger } from "@/api/utils";

export function checkConnectionMiddleware(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const connectionId = <string>request.headers["x-connection-id"];

  if (!connectionId) {
    response.status(400).json({ error: "ID de conexão não fornecido" });
    return;
  }

  const connections = connectionManager();
  const connection = connections.get(connectionId);

  if (!connection) {
    response
      .status(401)
      .json({ error: "Não autorizado, conexão não encontrada" });
    return;
  }

  try {
    connection.lastActive = new Date();

    clearTimeout(connection.timer);
    connection.timer = setTimeout(() => {
      logger.info(`Conexão ${connectionId} expirada por inatividade`);
      connection.client.close();
      connections.delete(connectionId);
    }, connection.connectionTimeout * 1000);

    next();
  } catch (error) {
    logger.error(`Conexão ${connectionId} inativa`, error as Error);
    connections.delete(connectionId);
    response.status(503).json({ error: "Conexão com Memcached perdida" });
  }
}
