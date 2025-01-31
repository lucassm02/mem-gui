import { useState } from 'react';
import ConnectionForm from './components/ConnectionForm';
import KeyList from './components/KeyList';
import UnconnectedHeader from './components/UnconnectedHeader';
import ConnectedHeader from './components/ConnectedHeader';
import ConnectionList from './components/ConnectionList';
import { DarkModeProvider } from './context/DarkModeContext';
import { useDarkMode } from './hooks/useDarkMode';
import { useConnections } from './hooks/useConnections';
import { Bars3Icon } from '@heroicons/react/24/outline';
import { ConnectionsProvider } from './context/ConnectionsContext';
import { ModalProvider } from './context/ModalContext';

const AppContent = () => {
  const { currentConnection, isConnected, handleConnect, choseConnection, handleDisconnect, error, savedConnections, handleDeleteConnection } = useConnections();
  const { darkMode } = useDarkMode();
  const [menuOpen, setMenuOpen] = useState(savedConnections.length !== 0);

  return (
    <div className={`min-h-screen flex flex-col transition-all ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>

    
      {isConnected ? (
        <ConnectedHeader connection={currentConnection} onDisconnect={handleDisconnect} />
      ) : (
        <UnconnectedHeader />
      )}

      <button
        onClick={() => setMenuOpen(true)}
        className="absolute top-4 left-4 p-2 rounded-md bg-gray-800 text-white hover:bg-gray-700"
      >
        <Bars3Icon className="w-6 h-6" />
      </button>

      <main className={`flex-1 ${isConnected ? 'overflow-auto' : 'flex justify-center items-center h-screen overflow-hidden'}`}>
        {isConnected ? (
          <div className="w-full max-w-7xl mx-auto">
            <KeyList />
          </div>
        ) : (
          <ConnectionForm initialConnection={currentConnection} error={error} onSubmit={handleConnect} />
        )}
      </main>

      <ConnectionList
        connections={savedConnections}
        darkMode={darkMode}
        isOpen={menuOpen}
        onSelect={choseConnection}
        onDelete={handleDeleteConnection}
        onClose={() => setMenuOpen(false)}
      />
    </div>
  );
};

const App = () => (
  <DarkModeProvider>
    <ModalProvider>
      <ConnectionsProvider>
        <AppContent />
      </ConnectionsProvider>
    </ModalProvider>
  </DarkModeProvider>
);

export default App;
