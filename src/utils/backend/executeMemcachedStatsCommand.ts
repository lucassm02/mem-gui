/* eslint-disable no-undef */
import net from "net";
import { MemcachedConnection } from "@/types";

/**
 * Constrói um pacote binário genérico para o protocolo do memcached.
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
  header.writeUInt8(0, 5); // Data type (sempre 0)
  header.writeUInt16BE(0, 6); // Reserved ou vbucket id
  const totalBodyLength = key.length + extras.length + value.length;
  header.writeUInt32BE(totalBodyLength, 8); // Total body length
  header.writeUInt32BE(0, 12); // Opaque (pode ser 0)
  header.writeBigUInt64BE(BigInt(0), 16); // CAS
  return Buffer.concat([header, extras, key, value]);
}

/**
 * Constrói a requisição de autenticação SASL usando o mecanismo PLAIN.
 * O formato das credenciais é: "\0username\0password"
 */
function buildSaslAuthRequest(username: string, password: string): Buffer {
  const mechanism = Buffer.from("PLAIN");
  const credentials = Buffer.from(`\0${username}\0${password}`);
  return buildBinaryRequest(0x21, mechanism, Buffer.alloc(0), credentials);
}

/**
 * Constrói a requisição do comando "stats" enviando o parâmetro (statsKey)
 * no campo key do pacote binário.
 */
function buildStatsRequest(statsKey: string = ""): Buffer {
  const keyBuffer = Buffer.from(statsKey);
  return buildBinaryRequest(0x10, keyBuffer, Buffer.alloc(0), Buffer.alloc(0));
}

/**
 * Valida se o comando informado inicia com "stats" (case-insensitive).
 */
function isValidStatsCommand(command: string): boolean {
  return command.toLowerCase().startsWith("stats");
}

/**
 * Extrai a parte do comando após "stats" que será enviada como parâmetro.
 * Exemplos:
 *  - "stats" → ""
 *  - "stats slabs" → "slabs"
 *  - "stats cachedump 1 100" → "cachedump 1 100"
 */
function extractStatsKey(command: string): string {
  return command.split(" ").slice(1).join(" ").trim();
}

/**
 * Configura o timeout da operação.
 */
function setupTimeout(
  timeoutInSeconds: number,
  client: net.Socket,
  reject: (err: Error) => void
): NodeJS.Timeout {
  return setTimeout(() => {
    client.destroy();
    reject(
      new Error(`Timeout: Nenhuma resposta em ${timeoutInSeconds * 1000}ms`)
    );
  }, timeoutInSeconds * 1000);
}

/**
 * Trata o envio inicial ao conectar. Se houver autenticação, envia o pacote
 * de autenticação; caso contrário, envia diretamente o comando stats.
 */
function handleConnection(
  client: net.Socket,
  state: { stage: "auth" | "command" },
  connection: MemcachedConnection,
  statsKey: string
): void {
  if (state.stage === "auth" && connection.authentication) {
    const authRequest = buildSaslAuthRequest(
      connection.authentication.username,
      connection.authentication.password
    );
    client.write(authRequest);
  } else {
    const statsRequest = buildStatsRequest(statsKey);
    client.write(statsRequest);
  }
}

/**
 * Trata a resposta de autenticação.
 * Se o status for 0, a autenticação foi bem-sucedida, atualiza o estado
 * para "command" e envia a requisição de stats.
 */
function handleAuthResponse(
  client: net.Socket,
  responsePacket: Buffer,
  statsKey: string,
  state: { stage: "auth" | "command" },
  resolve: (value: string) => void,
  reject: (err: Error) => void
): void {
  const status = responsePacket.readUInt16BE(6);
  if (status !== 0) {
    reject(new Error(`Falha na autenticação, status: ${status}`));
    return;
  }
  // Autenticação bem-sucedida: muda o estado e envia o comando stats.
  state.stage = "command";
  const statsRequest = buildStatsRequest(statsKey);
  client.write(statsRequest);
}

/**
 * Trata a resposta do comando stats.
 * Se o pacote recebido tiver totalBodyLength igual a zero, significa fim da resposta;
 * caso contrário, extrai a estatística e atualiza o objeto stats.
 */
function handleStatsResponse(
  client: net.Socket,
  responsePacket: Buffer,
  stats: Record<string, string>,
  resolve: (value: string) => void,
  timeout: NodeJS.Timeout
): void {
  const keyLength = responsePacket.readUInt16BE(2);
  const totalBodyLength = responsePacket.readUInt32BE(8);

  // Se totalBodyLength for 0, fim da resposta
  if (totalBodyLength === 0) {
    clearTimeout(timeout);
    client.destroy();
    resolve(JSON.stringify(stats));
    return;
  }

  // Extrai o nome e valor da estatística
  const statName = responsePacket.slice(24, 24 + keyLength).toString();
  const statValue = responsePacket.slice(24 + keyLength).toString();
  stats[statName] = statValue;
}

/**
 * Processa os dados recebidos do socket. Acumula dados em um buffer e
 * processa pacotes completos (mínimo 24 bytes para o cabeçalho).
 */
function handleResponseData(
  client: net.Socket,
  data: Buffer,
  stats: Record<string, string>,
  timeout: NodeJS.Timeout,
  state: { stage: "auth" | "command" },
  statsKey: string,
  resolve: (value: string) => void,
  reject: (err: Error) => void
): void {
  // Inicializa ou acumula os dados recebidos
  let dataBuffer = data;

  while (dataBuffer.length >= 24) {
    const magic = dataBuffer.readUInt8(0);

    if (magic !== 0x81) {
      clearTimeout(timeout);
      client.destroy();
      reject(new Error(`Resposta inválida (magic ${magic})`));
      return;
    }

    const keyLength = dataBuffer.readUInt16BE(2);
    const totalBodyLength = dataBuffer.readUInt32BE(8);
    const responseLength = 24 + totalBodyLength;

    if (dataBuffer.length < responseLength) break; // Pacote incompleto

    const responsePacket = dataBuffer.slice(0, responseLength);
    dataBuffer = dataBuffer.slice(responseLength);

    if (state.stage === "auth") {
      handleAuthResponse(
        client,
        responsePacket,
        statsKey,
        state,
        resolve,
        reject
      );
    } else if (state.stage === "command") {
      handleStatsResponse(client, responsePacket, stats, resolve, timeout);
    }
  }
}

/**
 * Função principal que estabelece a conexão, autentica (se necessário)
 * e envia o comando stats (suporta "stats", "stats slabs" e "stats cachedump ...").
 */
export async function executeMemcachedStatsCommand(
  connection: MemcachedConnection,
  command: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!isValidStatsCommand(command)) {
      return reject(
        new Error(
          "Apenas comandos 'stats', 'stats cachedump' e 'stats slabs' são suportados."
        )
      );
    }

    const stats: Record<string, string> = {};
    const client = new net.Socket();
    // Utilizamos um objeto para manter o estado (para que possamos atualizar o estágio)
    const state = {
      stage: connection.authentication
        ? ("auth" as const)
        : ("command" as const)
    };
    const statsKey = extractStatsKey(command);
    const timeout = setupTimeout(connection.connectionTimeout, client, reject);

    client.connect(connection.port, connection.host, () => {
      handleConnection(client, state, connection, statsKey);
    });

    client.on("data", (chunk: Buffer) => {
      try {
        handleResponseData(
          client,
          chunk,
          stats,
          timeout,
          state,
          statsKey,
          resolve,
          reject
        );
      } catch (err) {
        clearTimeout(timeout);
        client.destroy();
        reject(err as Error);
      }
    });

    client.on("error", (error: unknown) => {
      clearTimeout(timeout);
      client.destroy();
      reject(error as Error);
    });
  });
}
