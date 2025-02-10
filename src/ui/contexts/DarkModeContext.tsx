import localforage from "localforage";
import React, {
  createContext,
  ReactNode,
  useEffect,
  useLayoutEffect,
  useState
} from "react";

export interface DarkModeContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const defaultValue: DarkModeContextType = {
  darkMode: false,
  toggleDarkMode: () => console.warn("toggleDarkMode não foi inicializado")
};

interface DarkModeProviderProps {
  children: ReactNode;
}

export const DarkModeContext = createContext<DarkModeContextType>(defaultValue);

export const DarkModeProvider: React.FC<DarkModeProviderProps> = ({
  children
}) => {
  const [darkMode, setDarkMode] = useState(
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  const [loaded, setLoaded] = useState(false);

  async function loadTheme() {
    const savedMode = await localforage.getItem<string>("THEME");
    if (savedMode) {
      setDarkMode(JSON.parse(savedMode));
    } else {
      setDarkMode(window.matchMedia("(prefers-color-scheme: dark)").matches);
    }

    setLoaded(true);
  }

  useEffect(() => {
    loadTheme();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localforage.setItem("THEME", JSON.stringify(darkMode));
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
