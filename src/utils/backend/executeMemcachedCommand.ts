/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-undef */
import net from "net";
import { MemcachedConnection } from "@/types";

// ===================================
// BINARY COMMUNICATION
// ===================================

/**
 * Builds a generic binary request packet for the Memcached protocol.
 */
function buildBinaryRequest(
  opcode: number,
  key: Buffer,
  extras: Buffer = Buffer.alloc(0),
  value: Buffer = Buffer.alloc(0)
): Buffer {
  const header = Buffer.alloc(24);
  header.writeUInt8(0x80, 0); // Magic: request
  header.writeUInt8(opcode, 1); // Opcode
  header.writeUInt16BE(key.length, 2); // Key length
  header.writeUInt8(extras.length, 4); // Extras length
  header.writeUInt8(0, 5); // Data type (always 0)
  header.writeUInt16BE(0, 6); // Reserved/vbucket id
  const totalBodyLength = key.length + extras.length + value.length;
  header.writeUInt32BE(totalBodyLength, 8); // Total body length
  header.writeUInt32BE(0, 12); // Opaque (can be 0)
  header.writeBigUInt64BE(BigInt(0), 16); // CAS
  return Buffer.concat([header, extras, key, value]);
}

/**
 * Builds a SASL authentication request using the PLAIN mechanism.
 */
function buildSaslAuthRequest(username: string, password: string): Buffer {
  const mechanism = Buffer.from("PLAIN");
  const credentials = Buffer.from(`\0${username}\0${password}`);
  // Opcode 0x21 is for SASL authentication in the binary protocol.
  return buildBinaryRequest(0x21, mechanism, Buffer.alloc(0), credentials);
}

/**
 * Builds a binary request for the "stats slabs" command.
 */
function buildBinaryStatsSlabsRequest(): Buffer {
  const key = Buffer.from("slabs");
  return buildBinaryRequest(0x10, key, Buffer.alloc(0), Buffer.alloc(0));
}

/**
 * Sets up a timeout for the operation.
 */
function setupTimeout(
  timeoutSeconds: number,
  client: net.Socket,
  onTimeout: (err: Error) => void
): NodeJS.Timeout {
  return setTimeout(() => {
    client.destroy();
    onTimeout(
      new Error(`Timeout: No response within ${timeoutSeconds * 1000}ms`)
    );
  }, timeoutSeconds * 1000);
}

/**
 * Handles the authentication response.
 */
function handleAuthResponse(
  client: net.Socket,
  responsePacket: Buffer,
  state: { stage: string },
  reject: (err: Error) => void
): void {
  const status = responsePacket.readUInt16BE(6);
  if (status !== 0) {
    reject(new Error(`Authentication failed with status: ${status}`));
    return;
  }
  state.stage = "command";
  const request = buildBinaryStatsSlabsRequest();
  client.write(request);
}

/**
 * Handles the binary response for the "stats slabs" command.
 */
function handleBinaryStatsSlabsResponse(
  client: net.Socket,
  responsePacket: Buffer,
  stats: Record<string, string>,
  resolve: (value: Record<string, string>) => void,
  reject: (err: Error) => void,
  timeout: NodeJS.Timeout
): void {
  const totalBodyLength = responsePacket.readUInt32BE(8);
  if (totalBodyLength === 0) {
    clearTimeout(timeout);
    client.destroy();
    resolve(stats);
    return;
  }

  if (responsePacket.toString().toUpperCase() === "NOT FOUND") {
    reject(new Error("Comando inválido"));
    return;
  }

  const keyLength = responsePacket.readUInt16BE(2);
  const statName = responsePacket.slice(24, 24 + keyLength).toString();
  const statValue = responsePacket.slice(24 + keyLength).toString();
  stats[statName] = statValue;
}

/**
 * Processes binary response data received from the socket.
 */
function handleBinaryResponseData(
  client: net.Socket,
  data: Buffer,
  stats: Record<string, string>,
  timeout: NodeJS.Timeout,
  state: { stage: string },
  resolve: (value: Record<string, string>) => void,
  reject: (err: Error) => void
): void {
  let buffer = data;
  while (buffer.length >= 24) {
    const magic = buffer.readUInt8(0);
    if (magic !== 0x81) {
      clearTimeout(timeout);
      client.destroy();
      reject(new Error(`Invalid response (magic ${magic})`));
      return;
    }
    const totalBodyLength = buffer.readUInt32BE(8);
    const responseLength = 24 + totalBodyLength;
    if (buffer.length < responseLength) break; // Incomplete packet
    const responsePacket = buffer.slice(0, responseLength);
    buffer = buffer.slice(responseLength);
    if (state.stage === "auth") {
      handleAuthResponse(client, responsePacket, state, reject);
    } else if (state.stage === "command") {
      handleBinaryStatsSlabsResponse(
        client,
        responsePacket,
        stats,
        resolve,
        reject,
        timeout
      );
    }
  }
}

/**
 * Executes the Memcached command using the binary protocol (authenticated).
 * Only supports the "stats slabs" command.
 */
export async function executeMemcachedBinaryCommand(
  connection: MemcachedConnection,
  command: string
): Promise<Record<string, string>> {
  return new Promise((resolve, reject) => {
    // Enforce that only the "stats slabs" command is allowed for authenticated connections
    if (command.toLowerCase().trim() !== "stats slabs") {
      return reject(
        new Error(
          "Only 'stats slabs' command is allowed for authenticated connections."
        )
      );
    }
    const stats: Record<string, string> = {};
    const client = new net.Socket();
    const state = { stage: connection.authentication ? "auth" : "command" };
    const timeout = setupTimeout(connection.connectionTimeout, client, reject);
    client.connect(connection.port, connection.host, () => {
      if (state.stage === "auth" && connection.authentication) {
        const authRequest = buildSaslAuthRequest(
          connection.authentication.username,
          connection.authentication.password
        );
        client.write(authRequest);
      } else {
        const request = buildBinaryStatsSlabsRequest();
        client.write(request);
      }
    });
    client.on("data", (chunk: Buffer) => {
      try {
        handleBinaryResponseData(
          client,
          chunk,
          stats,
          timeout,
          state,
          resolve,
          reject
        );
      } catch (err) {
        clearTimeout(timeout);
        client.destroy();
        reject(err as Error);
      }
    });
    client.on("error", (error: Error) => {
      clearTimeout(timeout);
      client.destroy();
      reject(error);
    });
  });
}

// ===================================
// ASCII COMMUNICATION
// ===================================

/**
 * Extracts the argument from the command (everything after the first space).
 */
function extractCommandArgument(command: string): string {
  return command.split(" ").slice(1).join(" ").trim();
}

/**
 * Determines the ASCII command type: returns "STATS_SLABS" or "STATS_CACHEDUMP".
 */
function getAsciiCommandType(
  command: string
): "STATS_SLABS" | "STATS_CACHEDUMP" {
  const arg = extractCommandArgument(command).toLowerCase();
  if (arg.startsWith("slabs")) return "STATS_SLABS";
  if (arg.startsWith("cachedump")) return "STATS_CACHEDUMP";
  throw new Error("Unsupported ASCII command.");
}

/**
 * Handles the ASCII response for the "stats slabs" command.
 */
function handleAsciiStatsSlabsResponse(data: string): Record<string, any> {
  const stats: Record<string, any> = {};
  const lines = data.split("\r\n");
  for (const line of lines) {
    if (line === "END") break;
    if (line.startsWith("STAT ")) {
      const parts = line.split(" ");
      if (parts.length >= 3) {
        stats[parts[1]] = parts.slice(2).join(" ");
      }
    }
  }
  return stats;
}

/**
 * Handles the ASCII response for the "stats cachedump" command.
 */
function handleAsciiStatsCachedumpResponse(data: string): Record<string, any> {
  const dump: Record<string, any> = {};
  const lines = data.split("\r\n");
  for (const line of lines) {
    if (line === "END") break;
    if (line.startsWith("ITEM ")) {
      const parts = line.split(" ");
      if (parts.length >= 2) {
        const key = parts[1];
        dump[key] = parts.slice(2).join(" ");
      }
    }
  }
  return dump;
}

/**
 * Executes the Memcached command using the ASCII protocol (non-authenticated).
 * Supports "stats slabs" and "stats cachedump".
 */
export async function executeMemcachedAsciiCommand(
  connection: MemcachedConnection,
  command: string
): Promise<Record<string, string>> {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let dataBuffer = "";
    const timeout = setTimeout(() => {
      client.destroy();
      reject(
        new Error(
          `Timeout: No response within ${connection.connectionTimeout * 1000}ms`
        )
      );
    }, connection.connectionTimeout * 1000);

    client.connect(connection.port, connection.host, () => {
      let commandStr = command.trim();
      if (!commandStr.endsWith("\r\n")) {
        commandStr += "\r\n";
      }
      client.write(commandStr);
    });

    client.on("data", (chunk: Buffer) => {
      dataBuffer += chunk.toString();
      if (dataBuffer.includes("END\r\n")) {
        clearTimeout(timeout);
        client.destroy();
        let commandType: "STATS_SLABS" | "STATS_CACHEDUMP";
        try {
          commandType = getAsciiCommandType(command);
        } catch (err) {
          return reject(err as Error);
        }
        let result: any;
        if (commandType === "STATS_SLABS") {
          result = handleAsciiStatsSlabsResponse(dataBuffer);
        } else {
          result = handleAsciiStatsCachedumpResponse(dataBuffer);
        }
        resolve(result);
      }
    });

    client.on("error", (err: Error) => {
      clearTimeout(timeout);
      client.destroy();
      reject(err);
    });
  });
}

// ===================================
// HIGH-LEVEL COMMAND EXECUTION
// ===================================

/**
 * Executes the Memcached stats command based on the connection type.
 */
export async function executeMemcachedCommand(
  command: string,
  connection: MemcachedConnection
): Promise<Record<string, string>> {
  if (connection.authentication) {
    return executeMemcachedBinaryCommand(connection, command);
  } else {
    return executeMemcachedAsciiCommand(connection, command);
  }
}
