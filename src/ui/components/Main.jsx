import { useState } from 'react';
import ConnectedHeader from './ConnectedHeader';
import ConnectionForm from './ConnectionForm';
import ConnectionList from './ConnectionList';
import KeyList from './KeyList';
import UnconnectedHeader from './UnconnectedHeader';
import { useConnections } from '../hooks/useConnections';
import { useDarkMode } from '../hooks/useDarkMode';

const Main = () => {
  const { currentConnection, isConnected, handleConnect, choseConnection, handleDisconnect, error, savedConnections, handleDeleteConnection } = useConnections();
  const { darkMode } = useDarkMode();
  const [menuOpen, setMenuOpen] = useState(savedConnections.length !== 0);

  return (
    <div className={`flex-1 flex flex-col overflow-hidden transition-all ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>

      {isConnected && (
        <ConnectedHeader connection={currentConnection} onDisconnect={handleDisconnect} onToggleMenu={() => setMenuOpen(true)} />
      )}

      {!isConnected && (
        <UnconnectedHeader onToggleMenu={() => setMenuOpen(true)} />
      )}

      
      <main className="flex-1 overflow-auto">
        {isConnected && (
          <div className="w-full max-w-7xl mx-auto">
            <KeyList />
          </div>
        )}

        {!isConnected && (
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


export default Main;