import pino from "pino";

process.stdout.setDefaultEncoding("utf8");

export const logger = pino({
  level: "info",
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard"
    }
  }
});
