import { NextFunction, Request, Response } from "express";
import {
  closeConnection,
  connectionManager,
  ensureConnection,
  logger
} from "@/api/utils";

export async function checkConnectionMiddleware(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const connectionId = <string>request.headers["x-connection-id"];

  if (!connectionId) {
    response.status(400).json({ error: "ID de conexao nao fornecido" });
    return;
  }

  try {
    const connection = await ensureConnection(connectionId);
    if (!connection) {
      response
        .status(401)
        .json({ error: "Nao autorizado, conexao nao encontrada" });
      return;
    }
    next();
  } catch (error) {
    logger.error(`Conexao ${connectionId} inativa`, error as Error);
    const connection = connectionManager().get(connectionId);
    if (connection) {
      closeConnection(connection);
    }
    response.status(503).json({ error: "Conexao com Memcached perdida" });
  }
}
