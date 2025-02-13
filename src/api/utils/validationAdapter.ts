import { Request, Response } from "express";
import { ZodSchema } from "zod";

export const validationAdapter =
  (schema: ZodSchema) =>
  (request: Request, response: Response, next: () => void) => {
    const result = schema.safeParse({
      body: request.body,
      query: request.query,
      params: request.params
    });

    if (!result.success) {
      const errors = result.error.errors.map((item) => ({
        message: item.message,
        path: item.path.join(".")
      }));

      response.status(400).json({ errors });
      return;
    }

    next();
  };
