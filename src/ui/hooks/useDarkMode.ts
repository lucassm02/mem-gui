import { useContext } from "react";
import { DarkModeContext } from "../contexts/DarkModeContext";

export const useDarkMode = () => {
  return useContext(DarkModeContext);
};
