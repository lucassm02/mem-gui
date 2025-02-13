import { ReactNode, useEffect, useState } from "react";
import { ElectronContext } from "../contexts/ElectronContext";
import { Electron } from "@/ui/@types/global";

export const ElectronProvider = ({ children }: { children: ReactNode }) => {
  const [electron, setElectron] = useState<Electron | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window.require === "function") {
      const electron = window.require("electron");
      setElectron(electron);
      setEnabled(true);
    }
  }, []);

  function getInstance(): Electron | null {
    return electron;
  }

  return (
    <ElectronContext.Provider value={{ enabled, getInstance }}>
      {children}
    </ElectronContext.Provider>
  );
};
