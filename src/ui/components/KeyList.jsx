import {
  ArrowPathIcon,
  KeyIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useConnections } from '../hooks/useConnections';
import { useDarkMode } from '../hooks/useDarkMode';
import { useModal } from '../hooks/useModal';
import CreateKeyModal from './CreateKeyModal';
import EditKeyModal from './EditKeyModal';
import { useState } from 'react';

const KeyList = () => {
  const { darkMode } = useDarkMode();
  const { 
    keys, 
    handleLoadKeys,
    handleDeleteKey, 
    handleCreateKey,
    handleEditKey
  } = useConnections();


  const {openCreateModal, openEditModal} = useModal()


  const [editingKey, setEditingKey] = useState({})

  return (
    <div className="w-full px-6 max-w-7xl mx-auto mt-10">
      <div className="flex items-center justify-between pb-4">
        <h2 className={`text-lg font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
          Chaves Armazenadas ({keys.length})
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => {
              openCreateModal()
            }}
            className="cursor-pointer px-4 py-2 rounded-lg flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white transition-all"
          >
            <PlusIcon className="w-5 h-5" />
            Criar
          </button>
          <button
            onClick={handleLoadKeys}
            className={`cursor-pointer px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
              darkMode ? 'text-gray-300 hover:bg-gray-700/50' : 'text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ArrowPathIcon className="w-5 h-5" />
            Atualizar
          </button>
        </div>
      </div>

      <div className={`overflow-x-auto shadow-md rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <table className="w-full text-sm text-left">
          <thead className={`text-xs uppercase ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
            <tr>
              <th scope="col" className="px-6 py-3">Chave</th>
              <th scope="col" className="px-6 py-3">Valor</th>
              <th scope="col" className="px-6 py-3">Expiração</th>
              <th scope="col" className="px-6 py-3">Tamanho (Bytes)</th>
              <th scope="col" className="px-6 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {keys.length > 0 ? (
              keys.map((item) => (
                <tr key={item.key} className={`border-b ${darkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'} transition-all`}>
                  <td className={`px-6 py-4 font-medium flex items-center gap-2 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                    <KeyIcon className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                    <p className='truncate max-w-[600px]' >{item.key}</p>
                  </td>
                  <td className={`px-6 py-4 truncate max-w-[300px] ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{item.value}</td>
                  <td className={`px-6 py-4 truncate max-w-[100px] ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{item.timeUntilExpiration}</td>
                  <td className={`px-6 py-4 truncate max-w-[100px] ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{item.size}</td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => {
                        setEditingKey(item)
                        openEditModal(item)
                      }}
                      className={`cursor-pointer transition-all mx-2 ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                      aria-label={`Editar chave ${item.key}`}
                    >
                      <PencilSquareIcon className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteKey(item.key)}
                      className={`cursor-pointer transition-all mx-2 ${darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'}`}
                      aria-label={`Excluir chave ${item.key}`}
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className={`px-6 py-4 text-center ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Nenhuma chave armazenada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
        <CreateKeyModal   
          onSave={handleCreateKey} 
        />
    
        <EditKeyModal
          keyData={editingKey}
          onSave={handleEditKey}
          onClose={()=>setEditingKey({})}
        />
      
    </div>


      
  );
};

export default KeyList;
