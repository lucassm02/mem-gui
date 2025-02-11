import { createContext } from "react";

export interface TitleBarContextType {
  enableTitleBar: () => void;
  disableTitleBar: () => void;
  titleBarIsEnabled: boolean;
}

export const TitleBarContext = createContext<TitleBarContextType | undefined>(
  undefined
);
