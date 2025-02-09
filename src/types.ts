/* eslint-disable no-undef */
import memjs from "memjs";

export interface MemcachedConnection {
  id: string;
  host: string;
  port: number;
  authentication?: { username: string; password: string };
  client: memjs.Client;
  connectionTimeout: number;
  lastActive: Date;
  timer: NodeJS.Timeout;
}

export interface CacheResponse {
  key: string;
  value: string | null;
  timeUntilExpiration: number;
  size: number;
}

export interface Key {
  key: string;
  expiration: number;
  size: number;
  slabId?: string;
}

export interface Slab {
  id: number;
  chunk_size?: number;
  chunks_per_page?: number;
  total_pages?: number;
  total_chunks?: number;
  used_chunks?: number;
  free_chunks?: number;
  free_chunks_end?: number;
  get_hits?: number;
  cmd_set?: number;
  delete_hits?: number;
  incr_hits?: number;
  decr_hits?: number;
  cas_hits?: number;
  cas_badval?: number;
  touch_hits?: number;
  [key: string]: number | undefined;
}
