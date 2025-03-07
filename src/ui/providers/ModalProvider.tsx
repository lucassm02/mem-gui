import { ReactNode, useState } from "react";
import { ModalContext } from "../contexts";

type Key = {
  key: string;
  value: string;
  size: number;
  timeUntilExpiration?: number;
};

export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [createModalIsOpen, setCreateModalIsOpen] = useState(false);
  const [editModalIsOpen, setEditModalIsOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<Key>({
    key: "",
    value: "",
    size: 0
  });
  const [errorModalIsOpen, setErrorModalIsOpen] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState("");
  const [loadingModalIsOpen, setLoadingModalIsOpen] = useState(false);
  const [viewDataModalIsOpen, setViewDataModalIsOpen] = useState(false);
  const [connectionModalIsOpen, setConnectionModalIsOpen] = useState(false);
  const [setupGuideModalIsOpen, setSetupGuideModalIsOpen] = useState(false);
  const [itemToView, setItemToView] = useState<Key>({
    key: "",
    value: "",
    size: 0
  });

  const openEditModal = (itemToEdit: Key) => {
    setEditModalIsOpen(true);
    setItemToEdit(itemToEdit);
  };

  const closeEditModal = () => {
    setEditModalIsOpen(false);
    setItemToEdit({ key: "", value: "", size: 0 });
  };

  const openCreateModal = () => {
    setCreateModalIsOpen(true);
  };

  const closeCreateModal = () => {
    setCreateModalIsOpen(false);
  };

  const openConnectionModal = () => {
    setConnectionModalIsOpen(true);
  };

  const closeConnectionModal = () => {
    setConnectionModalIsOpen(false);
  };

  const openSetupGuideModal = () => {
    setSetupGuideModalIsOpen(true);
  };

  const closeSetupGuideModal = () => {
    setSetupGuideModalIsOpen(false);
  };

  const showError = (error: string) => {
    setErrorModalIsOpen(true);
    setErrorModalMessage(error);
  };

  const dismissError = () => {
    setErrorModalIsOpen(false);
  };

  const showLoading = () => {
    setLoadingModalIsOpen(true);
  };

  const dismissLoading = () => {
    setLoadingModalIsOpen(false);
  };

  const openViewDataModal = (dataToShow: Key) => {
    setViewDataModalIsOpen(true);
    setItemToView(dataToShow);
  };

  const closeViewDataModal = () => {
    setViewDataModalIsOpen(false);
    setItemToView({ key: "", value: "", size: 0 });
  };

  return (
    <ModalContext.Provider
      value={{
        openCreateModal,
        closeCreateModal,
        closeEditModal,
        openEditModal,
        itemToEdit,
        createModalIsOpen,
        editModalIsOpen,
        showError,
        dismissError,
        errorModalIsOpen,
        errorModalMessage,
        dismissLoading,
        loadingModalIsOpen,
        showLoading,
        closeViewDataModal,
        openViewDataModal,
        viewDataModalIsOpen,
        itemToView,
        closeConnectionModal,
        connectionModalIsOpen,
        openConnectionModal,
        closeSetupGuideModal,
        openSetupGuideModal,
        setupGuideModalIsOpen
      }}
    >
      {children}
    </ModalContext.Provider>
  );
};
