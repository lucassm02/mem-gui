import { useState } from 'react';
import { ServerIcon } from '@heroicons/react/24/outline';
import { useDarkMode } from '../hooks/useDarkMode';
import React from 'react';

const ConnectionForm = ({ initialConnection, error, onSubmit }) => {
  const { darkMode } = useDarkMode();

  const [formData, setFormData] = useState({
    name: initialConnection.name || '',
    host: initialConnection.host || '',
    port: initialConnection.port || 11211,
  });

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="flex justify-center items-center w-full h-full">
      <div className={`p-6 rounded-xl shadow-lg w-full max-w-md border ${darkMode
        ? 'bg-gray-800 text-gray-100 border-gray-700'
        : 'bg-white text-gray-900 border-gray-200'
        }`}>
        <div className="flex flex-col items-center justify-center text-center mb-4">
          <div className="flex items-center gap-2">
            <ServerIcon className={`w-6 h-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <h2 className="text-xl font-bold">Nova Conexão</h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Nome da Conexão
            </label>
            <input
              type="text"
              name="name"
              placeholder="Produção"
              value={formData.name}
              onChange={handleChange}
              className={`w-full mt-1 p-3 rounded-lg focus:ring-2 transition-all ${darkMode
                ? 'bg-gray-700 border-gray-600 text-gray-100 focus:ring-blue-400'
                : 'bg-gray-100 border-gray-300 text-gray-900 focus:ring-blue-500'
                }`}
              required
            />
          </div>

          <div>
            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Endereço do Servidor
            </label>
            <div className="flex gap-3 mt-1">
              <input
                type="text"
                name="host"
                placeholder="60.68.77.198"
                value={formData.host}
                onChange={handleChange}
                className={`flex-1 p-3 rounded-lg focus:ring-2 transition-all ${darkMode
                  ? 'bg-gray-700 border-gray-600 text-gray-100 focus:ring-blue-400'
                  : 'bg-gray-100 border-gray-300 text-gray-900 focus:ring-blue-500'
                  }`}
                required
              />
              <input
                type="number"
                name="port"
                value={formData.port}
                onChange={handleChange}
                className={`w-24 p-3 rounded-lg focus:ring-2 transition-all ${darkMode
                  ? 'bg-gray-700 border-gray-600 text-gray-100 focus:ring-blue-400'
                  : 'bg-gray-100 border-gray-300 text-gray-900 focus:ring-blue-500'
                  }`}
                required
              />
            </div>
          </div>

          {error && (
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-red-900/20 text-red-300' : 'bg-red-100 text-red-700'}`}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className={`cursor-pointer w-full p-3 rounded-lg flex items-center justify-center gap-2 transition-all ${darkMode ? 'bg-blue-700 hover:bg-blue-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
          >
            Conectar ao Servidor
          </button>
        </form>
      </div>
    </div>
  );
};

export default ConnectionForm;
