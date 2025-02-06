import { Router } from "express";
import { makeConnectionController } from "@/api/controllers";
const route = Router();

const connectionController = makeConnectionController();

route.post("/connections", connectionController.create);
route.get("/connections", connectionController.getStatus);
route.delete("/connections", connectionController.delete);

export default route;
