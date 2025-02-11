import { ReactNode, useEffect, useState } from "react";
import { TitleBarContext } from "../contexts/TitleBarContext";

export const TitleBarProvider = ({ children }: { children: ReactNode }) => {
  const [titleBarIsEnabled, setTitleBarIsEnabled] = useState(false);

  useEffect(() => {
    if (typeof window.require === "function") {
      setTitleBarIsEnabled(true);
    }
  }, []);

  const enableTitleBar = () => {
    setTitleBarIsEnabled(true);
  };
  const disableTitleBar = () => {
    setTitleBarIsEnabled(false);
  };

  return (
    <TitleBarContext.Provider
      value={{ disableTitleBar, enableTitleBar, titleBarIsEnabled }}
    >
      {children}
    </TitleBarContext.Provider>
  );
};
