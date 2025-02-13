import { Route, Routes } from "react-router-dom";
import ErrorModal from "@/ui/components/ErrorModal";
import LoadingModal from "@/ui/components/LoadingModal";

import TitleBar from "@/ui/components/TitleBar";
import { Connection } from "@/ui/pages/Connection";
import { Panel } from "@/ui/pages/Panel";
import { Dashboard } from "@/ui/pages/Statistics";
import {
  ConnectionsProvider,
  DarkModeProvider,
  MenuProvider,
  ModalProvider,
  ElectronProvider,
  StorageProvider
} from "@/ui/providers";

const App = () => (
  <ElectronProvider>
    <StorageProvider>
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
                  <Route path="/statistics" element={<Dashboard />} />
                </Routes>
              </div>
            </MenuProvider>
          </ConnectionsProvider>
        </ModalProvider>
      </DarkModeProvider>
    </StorageProvider>
  </ElectronProvider>
);

export default App;
