import { useContext } from "react";
import { MenuContext } from "@/contexts";

export const useMenu = () => {
  const context = useContext(MenuContext);
  if (!context) {
    throw new Error(
      "useConnections deve ser usado dentro de um ConnectionsProvider"
    );
  }
  return context;
};
