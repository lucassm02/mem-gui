import { useContext } from "react";
import { MenuContext, MenuContextType } from "@/ui/contexts/MenuContext";

export const useMenu = (): MenuContextType => {
  const context = useContext(MenuContext);
  if (!context) {
    throw new Error(
      "useConnections deve ser usado dentro de um ConnectionsProvider"
    );
  }
  return context;
};
