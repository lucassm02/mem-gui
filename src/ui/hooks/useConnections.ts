import { useContext } from "react";
import {
  ConnectionsContext,
  ConnectionsContextType
} from "../contexts/ConnectionsContext";

export const useConnections = (): ConnectionsContextType => {
  const context = useContext(ConnectionsContext);
  if (!context) {
    throw new Error(
      "useConnections deve ser usado dentro de um ConnectionsProvider"
    );
  }
  return context;
};
