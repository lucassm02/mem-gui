import { Route, Routes } from "react-router-dom";
import ErrorModal from "@/components/ErrorModal";
import LoadingModal from "@/components/LoadingModal";

import TitleBar from "@/components/TitleBar";
import { ConnectionsProvider } from "@/contexts/ConnectionsContext";
import { DarkModeProvider } from "@/contexts/DarkModeContext";
import { MenuProvider } from "@/contexts/MenuContext";
import { ModalProvider } from "@/contexts/ModalContext";
import { Connection } from "@/pages/Connection";
import { Dashboard } from "@/pages/Dashboard";
import { Panel } from "@/pages/Panel";

const App = () => (
  <DarkModeProvider>
    <ModalProvider>
      <ConnectionsProvider>
        <MenuProvider>
          <div className="h-screen flex flex-col">
            <TitleBar />
            <LoadingModal />
            <ErrorModal />
            <Routes>
              <Route path="/" element={<Connection />} />
              <Route path="/panel" element={<Panel />} />
              <Route path="/dashboard" element={<Dashboard />} />
            </Routes>
          </div>
        </MenuProvider>
      </ConnectionsProvider>
    </ModalProvider>
  </DarkModeProvider>
);

export default App;
