import { useContext } from "react";
import { ModalContext } from "../contexts/ModalContext";

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error(
      "useConnections deve ser usado dentro de um ConnectionsProvider"
    );
  }
  return context;
};
