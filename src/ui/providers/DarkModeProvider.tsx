import React, { ReactNode, useEffect, useState } from "react";
import { DarkModeContext } from "../contexts";
import { useStorage } from "../hooks";

export interface DarkModeContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

interface DarkModeProviderProps {
  children: ReactNode;
}

export const DarkModeProvider: React.FC<DarkModeProviderProps> = ({
  children
}) => {
  const [darkMode, setDarkMode] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const { setKey, getKey } = useStorage();

  async function loadTheme() {
    const data = await getKey("DARK_MODE");
    if (!data) {
      setDarkMode(window.matchMedia("(prefers-color-scheme: dark)").matches);
    } else {
      setDarkMode(data.value as boolean);
    }

    setLoaded(true);
  }

  useEffect(() => {
    loadTheme();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    setKey("DARK_MODE", darkMode);
  }, [darkMode]);

  if (!loaded) return null;

  return (
    <DarkModeContext.Provider
      value={{
        darkMode,
        toggleDarkMode: () => setDarkMode((prev: boolean) => !prev)
      }}
    >
      {children}
    </DarkModeContext.Provider>
  );
};
