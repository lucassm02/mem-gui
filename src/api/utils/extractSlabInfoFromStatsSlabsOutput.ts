/* eslint-disable @typescript-eslint/no-explicit-any */
interface Result {
  slabs: Slab[];
  info: { active_slabs: string; total_malloced: string };
}

interface Slab {
  id: string;
  chunk_size: string;
  chunks_per_page: string;
  total_pages: string;
  total_chunks: string;
  used_chunks: string;
  free_chunks: string;
  free_chunks_end: string;
  get_hits: string;
  cmd_set: string;
  delete_hits: string;
  incr_hits: string;
  decr_hits: string;
  cas_hits: string;
  cas_badval: string;
  touch_hits: string;
}

export function extractSlabInfoFromStatsSlabsOutput(
  data: Record<string, unknown>
): Result {
  const entries = Object.entries(data);

  const slabs: Record<string, any>[] = [];
  const info: Record<string, unknown> = {};

  for (const [key, value] of entries) {
    if (!key.includes(":")) {
      info[key] = value;
      continue;
    }

    const [id, property] = key.split(":");

    const slab = slabs.find((item) => item.id === id);

    if (!slab) {
      slabs.push({ id, [property]: value });
      continue;
    }

    slab[property as string] = value;
  }

  return <Result>{ slabs, info };
}
