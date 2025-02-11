import { useContext } from "react";
import { StorageContext, StorageContextType } from "../contexts/StorageContext";

export const useStorage = (): StorageContextType => {
  const context = useContext(StorageContext);
  if (!context) {
    throw new Error(
      "useConnections deve ser usado dentro de um ConnectionsProvider"
    );
  }
  return context;
};
