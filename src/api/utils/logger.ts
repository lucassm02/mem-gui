import pino from "pino";
import { PinoPretty } from "pino-pretty";

export const logger = pino(
  {
    level: "info",
    timestamp: pino.stdTimeFunctions.isoTime
  },
  PinoPretty()
);
