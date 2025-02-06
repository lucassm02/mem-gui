import { Router } from "express";
import { makeKeyController } from "@/api/controllers";
const route = Router();

const keyController = makeKeyController();

route.post("/keys", keyController.create);
route.get("/keys", keyController.getAll);

route.get("/keys/:key", keyController.getById);
route.delete("/keys/:key", keyController.getById);

export default route;
