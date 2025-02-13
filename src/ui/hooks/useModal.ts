import { useContext } from "react";
import { ModalContext, ModalContextType } from "../contexts/ModalContext";

export const useModal = (): ModalContextType => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error(
      "useConnections deve ser usado dentro de um ConnectionsProvider"
    );
  }
  return context;
};
