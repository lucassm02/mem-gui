import { ReactNode, useState } from 'react';
import React, { createContext } from 'react';


interface ModalContextType {
  openEditModal: (itemToEdit: any) => void;
  closeEditModal: () => void;
  openCreateModal: () => void;
  closeCreateModal: () => void;
  openViewDataModal: (dataToShow: any) => void;
  closeViewDataModal: () => void;
  showLoading: () => void;
  dismissLoading: () => void;
  showError: (error: string) => void;
  dismissError: () => void;
  createModalIsOpen: boolean;
  editModalIsOpen: boolean;
  errorModalIsOpen: boolean;
  errorModalMessage: string;
  loadingModalIsOpen: boolean;
  viewDataModalIsOpen: boolean;
  itemToView: {};
  itemToEdit: {}
}

export const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [createModalIsOpen, setCreateModalIsOpen] = useState(false);
  const [editModalIsOpen, setEditModalIsOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState({});
  const [errorModalIsOpen, setErrorModalIsOpen] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState('');
  const [loadingModalIsOpen, setLoadingModalIsOpen] = useState(false);
  const [viewDataModalIsOpen, setViewDataModalIsOpen] = useState(false);
  const [itemToView, setItemToView] = useState({});

  const openEditModal = (itemToEdit: any) => {
    setEditModalIsOpen(true)
    setItemToEdit(itemToEdit)
  };

  const closeEditModal = () => {
    setEditModalIsOpen(false)
    setItemToEdit({})
  };

  const openCreateModal = () => {
    setCreateModalIsOpen(true)
  };

  const closeCreateModal = () => {
    setCreateModalIsOpen(false);
  };

  const showError = (error: string) => {
    setErrorModalIsOpen(true)
    setErrorModalMessage(error);
  }

  const dismissError = () => {
    setErrorModalIsOpen(false)
  };

  const showLoading = () => {
    setLoadingModalIsOpen(true)

  }

  const dismissLoading = () => {
    setLoadingModalIsOpen(false)
  };

  const openViewDataModal = (dataToShow: any) => {
    setViewDataModalIsOpen(true)
    setItemToView(dataToShow)
  };

  const closeViewDataModal = () => {
    setViewDataModalIsOpen(false);
    setItemToView({})
  }

  return (
    <ModalContext.Provider value={{ openCreateModal, closeCreateModal, closeEditModal, openEditModal, itemToEdit, createModalIsOpen, editModalIsOpen, showError, dismissError, errorModalIsOpen, errorModalMessage, dismissLoading, loadingModalIsOpen, showLoading, closeViewDataModal, openViewDataModal, viewDataModalIsOpen, itemToView: itemToView }}>
      {children}
    </ModalContext.Provider>
  );
}
