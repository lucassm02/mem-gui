import { createContext } from "react";
import { Electron } from "../@types/global";

export interface ElectronContextType {
  getInstance: () => Electron | null;
  enabled: boolean;
}

export const ElectronContext = createContext<ElectronContextType | undefined>(
  undefined
);
