import type e from "electron";
import { ReactNode, useEffect, useState } from "react";
import { ElectronContext } from "../contexts/ElectronContext";

type Electron = typeof e;

export const ElectronProvider = ({ children }: { children: ReactNode }) => {
  const [electron, setElectron] = useState<Electron | null>(null);
  const [enabled, setEnabled] = useState(false);

  if (typeof window.require === "function") {
    const electron = window.require("electron");
    setElectron(electron);
    setEnabled(true);
  }

  function getInstance(): Electron | null {
    return electron;
  }

  return (
    <ElectronContext.Provider value={{ enabled, getInstance }}>
      {children}
    </ElectronContext.Provider>
  );
};
