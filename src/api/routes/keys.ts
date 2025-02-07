import { Router } from "express";
import { checkConnectionMiddleware } from "../middlewares";
import { makeKeyController } from "@/api/controllers";
import { validationAdapter } from "@/utils/backend";
import {
  cacheValueSchema,
  cacheKeySchema
} from "@/utils/backend/validationSchema";

const keyController = makeKeyController();

const route = Router();

route.use(checkConnectionMiddleware);

route.post("/keys", validationAdapter(cacheValueSchema), keyController.create);
route.get("/keys", keyController.getAll);

route.get(
  "/keys/:key",
  validationAdapter(cacheKeySchema),
  keyController.getById
);

route.delete(
  "/keys/:key",
  validationAdapter(cacheKeySchema),
  keyController.deleteById
);

export default route;
