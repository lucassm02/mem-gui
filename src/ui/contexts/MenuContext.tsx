import { ReactNode, useState } from "react";
import React, { createContext } from "react";

interface MenuContextType {
  openMenu: () => void;
  closeMenu: () => void;
  menuIsOpen: boolean;
}

export const MenuContext = createContext<MenuContextType | undefined>(
  undefined
);

export const MenuProvider = ({ children }: { children: ReactNode }) => {
  const [menuIsOpen, setMenuIsOpen] = useState(false);

  const openMenu = () => {
    setMenuIsOpen(true);
  };

  const closeMenu = () => {
    setMenuIsOpen(false);
  };

  return (
    <MenuContext.Provider value={{ menuIsOpen, closeMenu, openMenu }}>
      {children}
    </MenuContext.Provider>
  );
};
