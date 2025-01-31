import { ReactNode, useState } from 'react';
import React, { createContext } from 'react';


interface ModalContextType {
  openEditModal: () => void;
  closeEditModal: () => void;
  openCreateModal: () => void;
  closeCreateModal: () => void;
  createModalIsOpen: boolean;
  editModalIsOpen: boolean;
}

export const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [createModalIsOpen, setCreateModalIsOpen] = useState(false);
  const [editModalIsOpen, setEditModalIsOpen] = useState(false);

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

  return (
    <ModalContext.Provider value={{ openCreateModal, closeCreateModal, closeEditModal, openEditModal, createModalIsOpen, editModalIsOpen }}>
      {children}
    </ModalContext.Provider>
  );
}
