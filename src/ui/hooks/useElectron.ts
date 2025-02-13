import { useContext } from "react";
import {
  ElectronContext,
  ElectronContextType
} from "../contexts/ElectronContext";

export const useElectron = (): ElectronContextType => {
  const context = useContext(ElectronContext);
  if (!context) {
    throw new Error(
      "useConnections deve ser usado dentro de um ConnectionsProvider"
    );
  }
  return context;
};
