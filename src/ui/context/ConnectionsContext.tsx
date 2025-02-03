import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import api, { clearConnectionId, setConnectionId } from '../api';
import React from 'react';

interface Connection {
  name: string;
  host: string;
  port: number;
  id: string;
}

interface KeyData {
  key: string;
  value: string;
  timeUntilExpiration: number;
  size?: number;
}

interface ConnectionsContextType {
  savedConnections: Connection[];
  currentConnection: Connection;
  isConnected: boolean;
  keys: KeyData[];
  error: string;
  handleConnect: (connection: Omit<Connection, 'id'>) => Promise<void>;
  choseConnection: (connection: Omit<Connection, 'id'>) => Promise<void>;
  handleDisconnect: () => void;
  handleLoadKeys: () => Promise<void>;
  handleCreateKey: (newKey: KeyData) => Promise<void>;
  handleEditKey: (updatedKey: KeyData) => Promise<void>;
  handleDeleteKey: (key: string) => Promise<void>;
  handleDeleteConnection: (connection: Connection) => void;
}

export const ConnectionsContext = createContext<ConnectionsContextType | undefined>(undefined);

export const ConnectionsProvider = ({ children }: { children: ReactNode }) => {
  const [savedConnections, setSavedConnections] = useState<Connection[]>(() => {
    const connections = localStorage.getItem('memcachedConnections');
    return connections ? JSON.parse(connections) : [];
  });

  const [currentConnection, setCurrentConnection] = useState<Connection>({
    host: '',
    port: 11211,
    name: '',
    id: '',
  });

  const [isConnected, setIsConnected] = useState(false);
  const [keys, setKeys] = useState<KeyData[]>([]);
  const [error, setError] = useState('');

  const handleConnect = async ({ host, port, name }: Omit<Connection, 'id'>) => {
    try {
      const response = await api.post('/connections', { host, port });
      const { connectionId } = response.data;
      setConnectionId(connectionId);
      setIsConnected(true);

      const newConnection = { name, host, port, id: connectionId };
      setSavedConnections((prev) => {
        const filtered = prev.filter((c) => c.host !== host || c.port !== port);
        const updated = [newConnection, ...filtered];
        localStorage.setItem('memcachedConnections', JSON.stringify(updated));
        return updated;
      });

      setCurrentConnection(newConnection);
      await handleLoadKeys();
    } catch (err) {
      setError('Falha na conexão. Verifique os dados e tente novamente.');
    }
  };

  const choseConnection = async ({ name, host, port }: Omit<Connection, 'id'>) => {
    try {
      const connection = savedConnections.find((c) => c.host === host && c.port === port);

      if (!connection) {
        await handleConnect({ name, host, port });
        return;
      }

      setConnectionId(connection.id);
      await api.get('/connections');

      setIsConnected(true);
      setCurrentConnection(connection);
      await handleLoadKeys();
    } catch (err) {
      if (err.status === 404) {
        await handleConnect({ name, host, port });
        return;
      }
      setError('Erro ao escolher conexão.');
    }
  };

  const handleDisconnect = () => {
    clearConnectionId();
    setIsConnected(false);
    setKeys([]);
    setCurrentConnection({ host: '', port: 11211, name: '', id: '' });
  };

  const handleLoadKeys = async () => {
    try {
      const response = await api.get('/keys');
      const sortedKeys = [...response.data].sort((a, b) => a.key.localeCompare(b.key));
      setKeys(sortedKeys);
    } catch (err) {
      setError('Erro ao carregar chaves.');
    }
  };

  const handleCreateKey = async (newKey: KeyData) => {
    try {
      const newList = [...keys, { ...newKey, size: new Blob([newKey.value]).size, timeUntilExpiration: newKey.timeUntilExpiration ?? 0 }].sort((a, b) => a.key.localeCompare(b.key))
      setKeys(newList);
      await api.post('/keys', { key: newKey.key, value: newKey.value, expires: newKey.timeUntilExpiration });
    } catch (error) {
      setError('Erro ao criar chave.');
    }
  };

  const handleEditKey = async (updatedKey: KeyData) => {
    try {
      setKeys((prevKeys) =>
        prevKeys.map((k) => (k.key === updatedKey.key ? { ...updatedKey, size: new Blob([updatedKey.value]).size, timeUntilExpiration: updatedKey.timeUntilExpiration ?? 0 } : k))
      );
      await api.post('/keys', { key: updatedKey.key, value: updatedKey.value, expires: updatedKey.timeUntilExpiration });
    } catch (error) {
      setError('Erro ao editar chave.');
    }
  };

  const handleDeleteKey = async (key: string) => {
    try {
      await api.delete(`/keys/${key}`);
      setKeys((prevKeys) => prevKeys.filter((k) => k.key !== key));
    } catch (error) {
      setError('Erro ao excluir chave.');
    }
  };

  const handleDeleteConnection = (connection: Connection) => {
    setSavedConnections((prev) => {
      const updated = prev.filter((c) => c.host !== connection.host || c.port !== connection.port);
      localStorage.setItem('memcachedConnections', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <ConnectionsContext.Provider value={{
      savedConnections,
      currentConnection,
      isConnected,
      keys,
      error,
      handleConnect,
      choseConnection,
      handleDisconnect,
      handleLoadKeys,
      handleCreateKey,
      handleEditKey,
      handleDeleteKey,
      handleDeleteConnection
    }}>
      {children}
    </ConnectionsContext.Provider>
  );
};


