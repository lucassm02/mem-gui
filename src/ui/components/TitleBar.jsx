import { useEffect, useState } from "react";
import {
  MinusIcon,
  XMarkIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
} from "@heroicons/react/24/outline";

const TitleBar = () => {
  const { ipcRenderer } = window.require("electron");
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    ipcRenderer.on("window-maximized", () => setIsMaximized(true));
    ipcRenderer.on("window-unmaximized", () => setIsMaximized(false));

    return () => {
      ipcRenderer.removeAllListeners("window-maximized");
      ipcRenderer.removeAllListeners("window-unmaximized");
    };
  }, []);

  return (
    <div className="w-full h-10 bg-[#121212] flex items-center justify-between px-4 text-white"
      style={{ WebkitAppRegion: "drag" }}> 

      <div className="absolute left-1/2 transform -translate-x-1/2 text-sm font-semibold"
        style={{ WebkitAppRegion: "drag" }}>
        MemGUI
      </div>

      <div className="flex-1"></div>

      <div className="flex space-x-2">
        <button className="hover:bg-gray-700 p-2 rounded transition"
          style={{ WebkitAppRegion: "no-drag" }}
          onClick={() => ipcRenderer.send("window-minimize")}>
          <MinusIcon className="w-5 h-5" />
        </button>

        <button className="hover:bg-gray-700 p-2 rounded transition"
          style={{ WebkitAppRegion: "no-drag" }}
          onClick={() => ipcRenderer.send(isMaximized ? "window-unmaximize" : "window-maximize")}>
          {isMaximized ? (
            <ArrowsPointingInIcon className="w-5 h-5" /> 
          ) : (
            <ArrowsPointingOutIcon className="w-5 h-5" />
          )}
        </button>

        <button className="hover:bg-red-600 p-2 rounded transition"
          style={{ WebkitAppRegion: "no-drag" }}
          onClick={() => ipcRenderer.send("window-close")}>
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
