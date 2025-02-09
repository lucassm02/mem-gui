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

route.post(
  "/keys",
  validationAdapter(cacheValueSchema),
  keyController.create.bind(keyController)
);
route.get("/keys", keyController.getAll.bind(keyController));

route.get(
  "/keys/:key",
  validationAdapter(cacheKeySchema),
  keyController.getByName.bind(keyController)
);

route.delete(
  "/keys/:key",
  validationAdapter(cacheKeySchema),
  keyController.deleteByName.bind(keyController)
);

export default route;
