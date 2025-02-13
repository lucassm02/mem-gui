import type e from "electron";
import { createContext } from "react";

type Electron = typeof e;
export interface ElectronContextType {
  getInstance: () => Electron | null;
  enabled: boolean;
}

export const ElectronContext = createContext<ElectronContextType | undefined>(
  undefined
);
