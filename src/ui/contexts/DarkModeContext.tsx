import { createContext, ReactNode } from "react";

export interface DarkModeContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const defaultValue: DarkModeContextType = {
  darkMode: false,
  toggleDarkMode: () => console.warn("toggleDarkMode não foi inicializado")
};

export const DarkModeContext = createContext<DarkModeContextType>(defaultValue);
