import { Slab } from "@/types";

export function parseSlabs(data: string): Slab[] {
  const lines = data.split("\n");

  const slabs: Record<string, Slab> = {};

  const regex = /^STAT\s+(\d+):(\w+)\s+(.+)$/;

  lines.forEach((line) => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return;

    const match = trimmedLine.match(regex);
    if (match) {
      const slabId = match[1];
      const key = match[2];
      let value: number | string = match[3];

      if (!isNaN(Number(value))) {
        value = Number(value);
      }

      if (!slabs[slabId]) {
        slabs[slabId] = { id: Number(slabId) };
      }

      slabs[slabId][key] = value as number;
    }
  });

  return Object.values(slabs).sort((a, b) => a.id - b.id);
}
