import { ReactNode, useState } from "react";
import { Key, StorageContext } from "../contexts/StorageContext";
import api from "@/ui/services/api";

export const StorageProvider = ({ children }: { children: ReactNode }) => {
  const [storage, setStorage] = useState<Record<string, unknown>>({});

  type GetKey = { status: boolean; item: { key: string; value: unknown } };
  type Default = { status: boolean };
  type GetAll = { status: boolean; items: { key: string; value: unknown }[] };

  const setKey = async (key: string, value: unknown) => {
    try {
      await api.post<Default>("/storages", { key, value });
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  };
  const getKey = async (key: string): Promise<Key | null> => {
    try {
      const {
        data: { item }
      } = await api.get<GetKey>(`/storages/${key}`);

      return { key: item.key, value: item.value };
    } catch (error) {
      console.error(error);
      return null;
    }
  };
  const deleteKey = async (key: string) => {
    try {
      await api.delete<Default>(`/storages/${key}`);

      return true;
    } catch (error) {
      return false;
    }
  };
  const getAllKeys = async () => {
    try {
      const { data } = await api.get<GetAll>("/storages");

      return data.items;
    } catch (error) {
      console.error(error);
      return [];
    }
  };

  return (
    <StorageContext.Provider
      value={{ deleteKey, getAllKeys, getKey, setKey, storage }}
    >
      {children}
    </StorageContext.Provider>
  );
};
