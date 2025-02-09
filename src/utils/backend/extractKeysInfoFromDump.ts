/* eslint-disable @typescript-eslint/no-explicit-any */
import { logger } from "./logger";
import { Key } from "@/types";

export function extractKeysInfoFromDump(
  dumpOutput: Record<string, string>,
  slabId?: string
): Key[] {
  const results: Key[] = [];

  const entries = Object.entries(dumpOutput);

  for (const [key, value] of entries) {
    try {
      const regex = /\[(?<bytes>\d+)\s\w; (?<seconds>\d+)\s\w\]/;

      const match = value.match(regex);

      if (match && match.groups) {
        const bytes = parseInt(match.groups.bytes, 10);
        const seconds = parseInt(match.groups.seconds, 10);

        results.push({
          key,
          size: bytes,
          expiration: seconds,
          slabId: slabId
        });
      }
    } catch (error) {
      logger.error(error);
      results.push({
        key,
        size: 0,
        expiration: 0,
        slabId: slabId
      });
    }
  }

  return results;
}

export function extractUsedChunksFromSlabs(
  slabsOutput: Record<string, any>
): Map<string, number> {
  const slabMap = new Map<string, number>();
  try {
    for (const key in slabsOutput) {
      if (key.includes("used_chunks")) {
        const [slabId] = key.split(":");
        const usedChunks = parseInt(slabsOutput[key], 10);
        slabMap.set(slabId, usedChunks);
      }
    }
  } catch (error) {
    logger.error(error);
  }

  return slabMap;
}
