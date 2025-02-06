import { Key } from "@/types";

export function extractKeysInfoFromDump(
  dumpOutput: string,
  slabId?: string
): Key[] {
  const regex = /ITEM\s+(\S+)\s+\[(\d+)\s*b;\s*(\d+)\s*s\]/g;
  const results: Key[] = [];
  for (const match of dumpOutput.matchAll(regex)) {
    const key = match[1];
    const size = parseInt(match[2], 10);
    const expiration = parseInt(match[3], 10);
    results.push({ key, size, expiration, slabId });
  }
  return results;
}

export function extractUsedChunksFromSlabs(
  slabsOutput: string
): Map<string, number> {
  const slabMap = new Map<string, number>();
  const regex = /STAT\s+(\d+):used_chunks\s+(\d+)/g;
  for (const match of slabsOutput.matchAll(regex)) {
    const slabId = match[1];
    const usedChunks = parseInt(match[2], 10);
    slabMap.set(slabId, usedChunks);
  }
  return slabMap;
}
