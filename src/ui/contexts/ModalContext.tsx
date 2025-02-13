import { createContext } from "react";

type Key = {
  key: string;
  value: string;
  size: number;
  timeUntilExpiration?: number;
};
export interface ModalContextType {
  openEditModal: (itemToEdit: Key) => void;
  closeEditModal: () => void;
  openCreateModal: () => void;
  closeCreateModal: () => void;
  openViewDataModal: (dataToShow: Key) => void;
  closeViewDataModal: () => void;
  openConnectionModal: () => void;
  openSetupGuideModal: () => void;
  closeConnectionModal: () => void;
  closeSetupGuideModal: () => void;
  showLoading: () => void;
  dismissLoading: () => void;
  showError: (error: string) => void;
  dismissError: () => void;
  setupGuideModalIsOpen: boolean;
  createModalIsOpen: boolean;
  editModalIsOpen: boolean;
  connectionModalIsOpen: boolean;
  errorModalIsOpen: boolean;
  errorModalMessage: string;
  loadingModalIsOpen: boolean;
  viewDataModalIsOpen: boolean;
  itemToView: Key;
  itemToEdit: Key;
}

export const ModalContext = createContext<ModalContextType | undefined>(
  undefined
);
