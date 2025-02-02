import Main from './components/Main';
import TitleBar from './components/TitleBar';
import { ConnectionsProvider } from './context/ConnectionsContext';
import { DarkModeProvider } from './context/DarkModeContext';
import { ModalProvider } from './context/ModalContext';


const App = () => (
  <DarkModeProvider>
    <ModalProvider>
      <ConnectionsProvider>
        <div className="h-screen flex flex-col">
            <TitleBar />
            <Main />
          </div>
      </ConnectionsProvider>
    </ModalProvider>
  </DarkModeProvider>
);

export default App;
