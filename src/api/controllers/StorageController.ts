import Datastore from "@seald-io/nedb";
import { Request, Response } from "express";

import { logger } from "@/api/utils";
class StorageController {
  db!: Datastore;

  constructor() {
    this.db = new Datastore({ filename: "./database.db", autoload: true });
  }

  async putItem(request: Request, response: Response): Promise<void> {
    try {
      const { key, value } = request.body;

      const data = await this.db.findOneAsync({ key }, { _id: 0, value: 1 });
      const document = { key, value };

      if (data) {
        await this.db.updateAsync({ key }, { key, value });
      } else {
        await this.db.insertAsync(document);
      }

      response.status(201).json({ success: true });
    } catch (error) {
      logger.error(error);
      response.status(500).json({ success: false });
    }
  }
  async getItem(request: Request, response: Response): Promise<void> {
    try {
      const { key } = request.params;

      const data = await this.db.findOneAsync({ key }, { _id: 0, value: 1 });

      if (!data) {
        response.status(404).json({ status: false, item: null });
        return;
      }

      const { value } = data;

      response.status(200).json({ status: true, item: { key, value } });
    } catch (error) {
      logger.error(error);
      response.status(500).json({ status: false });
    }
  }
  async getItems(_: Request, response: Response): Promise<void> {
    try {
      const value = await this.db.findAsync({}, { _id: 0, key: 1, value: 1 });
      response.status(200).json({ status: true, items: value });
    } catch (error) {
      logger.error(error);
      response.status(500).json({ status: false });
    }
  }
  async deleteItem(request: Request, response: Response): Promise<void> {
    try {
      const { key } = request.params;

      await this.db.removeAsync({ key }, {});
      response.status(201).json({ success: true });
    } catch (error) {
      response.status(500).json({ success: false });
      logger.error(error);
    }
  }
}

export const makeStorageController = () => new StorageController();
