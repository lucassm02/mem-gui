import { useContext } from "react";
import {
  DarkModeContext,
  DarkModeContextType
} from "../contexts/DarkModeContext";

export const useDarkMode = (): DarkModeContextType => {
  return useContext(DarkModeContext);
};
