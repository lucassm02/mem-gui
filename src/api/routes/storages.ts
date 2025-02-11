import { Router } from "express";
import { makeStorageController } from "@/api/controllers";

const route = Router();

const storageController = makeStorageController();

route.post("/storages", storageController.putItem.bind(storageController));
route.get("/storages", storageController.getItems.bind(storageController));
route.get("/storages/:key", storageController.getItem.bind(storageController));
route.delete(
  "/storages/:key",
  storageController.deleteItem.bind(storageController)
);

export default route;
