import { useEffect, useState } from "react";
import { AiOutlineMinus, AiOutlineClose, AiOutlineExpand } from "react-icons/ai";

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

      
      <div className="flex-1"></div>

      <div className="flex space-x-2">
        <button className="hover:bg-gray-700 p-2 rounded transition" 
          style={{ WebkitAppRegion: "no-drag" }}
          onClick={() => ipcRenderer.send("window-minimize")}>
          <AiOutlineMinus />
        </button>

        <button className="hover:bg-gray-700 p-2 rounded transition" 
          style={{ WebkitAppRegion: "no-drag" }}
          onClick={() => ipcRenderer.send(isMaximized ? "window-unmaximize" : "window-maximize")}>
          {isMaximized ? (
            <AiOutlineExpand className="transform rotate-180" />
          ) : (
            <AiOutlineExpand />
          )}
        </button>

        <button className="hover:bg-red-600 p-2 rounded transition" 
          style={{ WebkitAppRegion: "no-drag" }}
          onClick={() => ipcRenderer.send("window-close")}>
          <AiOutlineClose />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
