/* eslint-disable react-hooks/exhaustive-deps */
import {
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  MinusIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";

import { useEffect, useState } from "react";
import { useElectron } from "../hooks";

const TitleBar = () => {
  const { getInstance } = useElectron();
  const [isMaximized, setIsMaximized] = useState(false);
  const [ipcRenderer, setIpcRenderer] = useState<
    null | typeof Electron.ipcRenderer
  >(null);

  useEffect(() => {
    const electron = getInstance();

    if (!electron) return () => {};
    setIpcRenderer(electron.ipcRenderer);

    electron.ipcRenderer.on("window-maximized", () => {
      if (!isMaximized) setIsMaximized(true);
    });
    electron.ipcRenderer.on("window-unmaximized", () => {
      if (isMaximized) setIsMaximized(false);
    });

    return () => {
      electron.ipcRenderer.removeAllListeners("window-maximized");
      electron.ipcRenderer.removeAllListeners("window-unmaximized");
    };
  }, []);

  if (!ipcRenderer) return null;

  return (
    <div
      className="w-full h-10 bg-[#121212] flex items-center justify-between px-4 text-white z-99"
      style={{ WebkitAppRegion: "drag" }}
    >
      <div
        className="absolute left-1/2 transform -translate-x-1/2 text-sm font-semibold"
        style={{ WebkitAppRegion: "drag" }}
      >
        MemGUI
      </div>

      <div className="flex-1"></div>

      <div className="flex space-x-2">
        <button
          className="hover:bg-gray-700 p-2 rounded transition"
          style={{ WebkitAppRegion: "no-drag" }}
          onClick={() => ipcRenderer.send("window-minimize")}
        >
          <MinusIcon className="w-5 h-5" />
        </button>

        <button
          className="hover:bg-gray-700 p-2 rounded transition"
          style={{ WebkitAppRegion: "no-drag" }}
          onClick={() => {
            const newState = !isMaximized;
            setIsMaximized(newState);
            ipcRenderer.send(
              newState ? "window-maximize" : "window-unmaximize"
            );
          }}
        >
          {isMaximized ? (
            <ArrowsPointingInIcon className="w-5 h-5" />
          ) : (
            <ArrowsPointingOutIcon className="w-5 h-5" />
          )}
        </button>

        <button
          className="hover:bg-red-600 p-2 rounded transition"
          style={{ WebkitAppRegion: "no-drag" }}
          onClick={() => ipcRenderer.send("window-close")}
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
