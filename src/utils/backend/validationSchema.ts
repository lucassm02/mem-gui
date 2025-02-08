import { z } from "zod";

const connectionSchema = z.object({
  body: z.object({
    host: z.string(),
    port: z.number().int().min(1).max(65535)
  })
});

const cacheKeySchema = z.object({
  params: z.object({ key: z.string().min(1) })
});

const cacheValueSchema = z.object({
  body: z.object({
    key: z.string().min(1),
    value: z.string().min(1),
    expires: z.number().int().min(0).optional()
  })
});

export { connectionSchema, cacheKeySchema, cacheValueSchema };
