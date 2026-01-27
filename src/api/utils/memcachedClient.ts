/* eslint-disable @typescript-eslint/no-explicit-any */
import type Memcached from "memcached";

import { MemcachedConnection } from "@/api/types";

const flattenStats = (
  stats?: Memcached.StatusData[] | null
): Record<string, string> => {
  const aggregated: Record<string, string> = {};
  if (!stats) {
    return aggregated;
  }
  for (const entry of stats) {
    for (const [key, value] of Object.entries(entry)) {
      if (value === undefined) {
        continue;
      }
      aggregated[key] = String(value);
    }
  }
  return aggregated;
};

export const memcachedStats = (
  connection: MemcachedConnection
): Promise<Record<string, string>> =>
  new Promise((resolve, reject) => {
    connection.client.stats((error, stats) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(flattenStats(stats));
    });
  });

export const memcachedGet = (
  connection: MemcachedConnection,
  key: string
): Promise<any | null> =>
  new Promise((resolve, reject) => {
    connection.client.get(key, (error, data) => {
      if (error) {
        reject(error);
        return;
      }
      if (data === undefined || data === null) {
        resolve(null);
        return;
      }
      resolve(data);
    });
  });

export const memcachedGetMulti = (
  connection: MemcachedConnection,
  keys: string[]
): Promise<Record<string, any>> =>
  new Promise((resolve, reject) => {
    connection.client.getMulti(keys, (error, data) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(data ?? {});
    });
  });

export const memcachedSet = (
  connection: MemcachedConnection,
  key: string,
  value: string,
  lifetimeSeconds: number
): Promise<boolean> =>
  new Promise((resolve, reject) => {
    connection.client.set(key, value, lifetimeSeconds, (error, success) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(Boolean(success));
    });
  });

export const memcachedDelete = (
  connection: MemcachedConnection,
  key: string
): Promise<boolean> =>
  new Promise((resolve, reject) => {
    connection.client.del(key, (error, success) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(Boolean(success));
    });
  });

export const memcachedFlush = (
  connection: MemcachedConnection
): Promise<boolean> =>
  new Promise((resolve, reject) => {
    connection.client.flush((error, results) => {
      if (error) {
        reject(error);
        return;
      }
      if (Array.isArray(results)) {
        resolve(results.every(Boolean));
        return;
      }
      resolve(false);
    });
  });
