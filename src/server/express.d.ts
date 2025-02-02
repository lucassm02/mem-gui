import { Request } from 'express';
import { Client } from 'memjs';

interface MemcachedConnection {
  id: string;
  host: string;
  port: number;
  client: Client;
  lastActive: Date;
  timer: NodeJS.Timeout;
}

declare module 'express' {
  export interface Request {
    currentConnection?: MemcachedConnection;
  }
}
