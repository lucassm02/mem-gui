import { Router } from "express";
import { checkConnectionMiddleware } from "../middlewares";
import { makeConnectionController } from "@/api/controllers";
import { validationAdapter } from "@/utils/backend";
import { connectionSchema } from "@/utils/backend/validationSchema";

const route = Router();

const connectionController = makeConnectionController();

route.post(
  "/connections",
  validationAdapter(connectionSchema),
  connectionController.create
);

const connectedRoute = route.use(checkConnectionMiddleware);

connectedRoute.get("/connections", connectionController.getStatus);
connectedRoute.delete("/connections", connectionController.delete);

export default route;
