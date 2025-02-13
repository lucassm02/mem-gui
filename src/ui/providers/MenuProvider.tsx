import { ReactNode, useState } from "react";
import { MenuContext } from "../contexts";

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
