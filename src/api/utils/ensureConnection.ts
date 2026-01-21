import { connectionManager, touchConnection } from "./connectionManager";
import { createMemcachedConnection } from "./createMemcachedConnection";
import { logger } from "./logger";
import { MemcachedConnection } from "@/api/types";

const reconnecting = new Map<string, Promise<MemcachedConnection>>();

export async function ensureConnection(
  connectionId: string
): Promise<MemcachedConnection | null> {
  const connections = connectionManager();
  const current = connections.get(connectionId);
  if (current) {
    touchConnection(current);
    return current;
  }

  const profile = connections.getProfile(connectionId);
  if (!profile) {
    return null;
  }

  let pending = reconnecting.get(connectionId);
  if (!pending) {
    pending = (async () => {
      const connection = await createMemcachedConnection(profile);
      connections.set(connectionId, connection);
      touchConnection(connection);
      logger.info("Conexao Memcached reativada", {
        connectionId,
        host: connection.host,
        port: connection.port
      });
      return connection;
    })();
    reconnecting.set(connectionId, pending);
  }

  try {
    return await pending;
  } finally {
    if (reconnecting.get(connectionId) === pending) {
      reconnecting.delete(connectionId);
    }
  }
}
