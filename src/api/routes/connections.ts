import { Router } from "express";
import { checkConnectionMiddleware } from "../middlewares";
import { makeConnectionController } from "@/api/controllers";
import { validationAdapter } from "@/api/utils";
import { connectionSchema } from "@/api/utils/validationSchema";

const route = Router();

const connectionController = makeConnectionController();

route.post(
  "/connections",
  validationAdapter(connectionSchema),
  connectionController.create.bind(connectionController)
);

const connectedRoute = route.use(checkConnectionMiddleware);

connectedRoute.get(
  "/connections",
  connectionController.getStatus.bind(connectionController)
);
connectedRoute.delete(
  "/connections",
  connectionController.delete.bind(connectionController)
);

export default route;
