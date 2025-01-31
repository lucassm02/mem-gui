import React from 'react';

import { createContext, ReactNode, useEffect, useState } from 'react';



export interface DarkModeContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const defaultValue: DarkModeContextType = {
  darkMode: false,
  toggleDarkMode: () => console.warn('toggleDarkMode não foi inicializado'),
};

interface DarkModeProviderProps {
  children: ReactNode;
}

export const DarkModeProvider: React.FC<DarkModeProviderProps> = ({
  children,
}) => {
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode
      ? JSON.parse(savedMode)
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  return (
    <DarkModeContext.Provider
      value={{ darkMode, toggleDarkMode: () => setDarkMode((prev) => !prev) }}
    >
      {children}
    </DarkModeContext.Provider>
  );
};

export const DarkModeContext = createContext<DarkModeContextType>(defaultValue);
