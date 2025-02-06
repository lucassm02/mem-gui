import { MemcachedConnection } from "@/types";

class ConnectionManager {
  private static instance: ConnectionManager;
  private connections = new Map<string, MemcachedConnection>();

  constructor() {}

  public static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }

    return ConnectionManager.instance;
  }

  public get(key: string) {
    return this.connections.get(key);
  }
  public set(key: string, value: MemcachedConnection) {
    this.connections.set(key, value);
  }

  public delete(key: string) {
    this.connections.delete(key);
  }
}

export function connectionManager() {
  return ConnectionManager.getInstance();
}
