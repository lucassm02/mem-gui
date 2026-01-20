import type { KeyQueryFilter } from "@/api/utils";
import { evaluateKeyQuery } from "@/api/utils";

export type QueryEvaluatorInput = {
  keyValues: { key: string; value: string }[];
  filter?: KeyQueryFilter;
};

export type QueryEvaluatorOutput = {
  keys: string[];
};

export default function runQueryEvaluator({
  keyValues,
  filter
}: QueryEvaluatorInput): QueryEvaluatorOutput {
  if (!filter) {
    return {
      keys: keyValues.map((item) => item.key)
    };
  }

  const keys: string[] = [];
  for (const entry of keyValues) {
    if (evaluateKeyQuery(filter, { key: entry.key, value: entry.value })) {
      keys.push(entry.key);
    }
  }

  return { keys };
}
