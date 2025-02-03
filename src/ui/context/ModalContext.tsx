import { ReactNode, useState } from 'react';
import React, { createContext } from 'react';


interface ModalContextType {
  openEditModal: () => void;
  closeEditModal: () => void;
  openCreateModal: () => void;
  closeCreateModal: () => void;
  showLoading: () => void;
  dismissLoading: () => void;
  showError: (error: string) => void;
  dismissError: () => void;
  createModalIsOpen: boolean;
  editModalIsOpen: boolean;
  errorModalIsOpen: boolean;
  errorModalMessage: string;
  loadingModalIsOpen: boolean;
}

export const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [createModalIsOpen, setCreateModalIsOpen] = useState(false);
  const [editModalIsOpen, setEditModalIsOpen] = useState(false);
  const [errorModalIsOpen, setErrorModalIsOpen] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState('');
  const [loadingModalIsOpen, setLoadingModalIsOpen] = useState(false);

  const openEditModal = () => {
    setEditModalIsOpen(true)
  };

  const closeEditModal = () => {
    setEditModalIsOpen(false)
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

  return (
    <ModalContext.Provider value={{ openCreateModal, closeCreateModal, closeEditModal, openEditModal, createModalIsOpen, editModalIsOpen, showError, dismissError, errorModalIsOpen, errorModalMessage, dismissLoading, loadingModalIsOpen, showLoading }}>
      {children}
    </ModalContext.Provider>
  );
}
