import { createContext } from "react";

export interface MenuContextType {
  openMenu: () => void;
  closeMenu: () => void;
  menuIsOpen: boolean;
}

export const MenuContext = createContext<MenuContextType | undefined>(
  undefined
);
