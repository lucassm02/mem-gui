import net from "net";
import { TELNET_TIMEOUT } from "./constants";
import { MemcachedConnection } from "@/types";

export async function executeTelnetCommand(
  connection: MemcachedConnection,
  command: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let buffer = "";
    const timeout = setTimeout(() => {
      client.destroy();
      reject(new Error(`Timeout: Nenhuma resposta em ${TELNET_TIMEOUT}ms`));
    }, TELNET_TIMEOUT);

    client.connect(connection.port, connection.host, () => {
      client.write(`${command}\r\n`);
    });

    client.on("data", (data: { toString: () => string }) => {
      buffer += data.toString();
      if (buffer.includes("END") || buffer.includes("ERROR")) {
        clearTimeout(timeout);
        client.destroy();
        resolve(buffer);
      }
    });

    client.on("error", (error: unknown) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}
