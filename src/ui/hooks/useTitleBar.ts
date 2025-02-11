import { useContext } from "react";
import {
  TitleBarContext,
  TitleBarContextType
} from "../contexts/TitleBarContext";

export const useTitleBar = (): TitleBarContextType => {
  const context = useContext(TitleBarContext);
  if (!context) {
    throw new Error(
      "useConnections deve ser usado dentro de um ConnectionsProvider"
    );
  }
  return context;
};
