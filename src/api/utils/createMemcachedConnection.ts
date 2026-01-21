import Memcached from "memcached";

import { ConnectionProfile, MemcachedConnection } from "@/api/types";
import { MEMCACHED_KEEPALIVE_DELAY_SECONDS } from "@/api/utils/constants";
import { closeSshTunnel, createSshTunnel } from "@/api/utils/sshTunnel";

export async function createMemcachedConnection(
  profile: ConnectionProfile
): Promise<MemcachedConnection> {
  let client: Memcached | null = null;
  let tunnel: MemcachedConnection["tunnel"] | null = null;

  const sshConfig = profile.ssh
    ? {
        ...profile.ssh,
        host: profile.ssh.host?.trim(),
        username: profile.ssh.username.trim()
      }
    : undefined;

  try {
    if (sshConfig) {
      const normalizedSshHost = sshConfig.host?.trim();
      const legacySshHost = !normalizedSshHost;
      const sshHost = normalizedSshHost || profile.host;
      const remoteHost = legacySshHost ? "127.0.0.1" : profile.host;
      tunnel = await createSshTunnel({
        sshHost,
        ssh: sshConfig,
        remoteHost,
        remotePort: Number(profile.port),
        readyTimeoutMs: profile.connectionTimeout * 1000,
        expectedHostFingerprint: sshConfig.hostKeyFingerprint
      });
    }

    const targetHost = tunnel ? tunnel.localHost : profile.host;
    const targetPort = tunnel ? tunnel.localPort : profile.port;

    const timeoutMs = Math.round(profile.connectionTimeout * 1000);
    const memcachedClient = new Memcached(`${targetHost}:${targetPort}`, {
      retries: 1,
      timeout: timeoutMs,
      idle: MEMCACHED_KEEPALIVE_DELAY_SECONDS * 1000,
      username: profile.authentication?.username,
      password: profile.authentication?.password
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
          new Error(`Timeout: No response from memcached within ${timeoutMs}ms`)
        );
      }, timeoutMs);

      memcachedClient.stats((error: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (error) {
          reject(error instanceof Error ? error : new Error("Memcached error"));
          return;
        }
        resolve();
      });
    });

    return {
      id: profile.id,
      host: profile.host,
      port: profile.port,
      client: memcachedClient,
      lastActive: new Date(),
      authentication: profile.authentication,
      connectionTimeout: profile.connectionTimeout,
      timer: setTimeout(() => undefined, 0),
      ssh: sshConfig,
      tunnel: tunnel ?? undefined
    };
  } catch (error) {
    if (client) {
      client.end();
    }
    if (tunnel) {
      closeSshTunnel(tunnel);
    }
    throw error;
  }
}
