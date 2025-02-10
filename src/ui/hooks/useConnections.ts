import { useContext } from "react";
import { ConnectionsContext } from "../contexts/ConnectionsContext";

export const useConnections = () => {
  const context = useContext(ConnectionsContext);
  if (!context) {
    throw new Error(
      "useConnections deve ser usado dentro de um ConnectionsProvider"
    );
  }
  return context;
};
