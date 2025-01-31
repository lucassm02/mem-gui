import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

import {useModal} from '../hooks/useModal'
import {useDarkMode} from '../hooks/useDarkMode'

const CreateKeyModal = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState({ key: '', value: '' });

  const { createModalIsOpen , closeCreateModal} = useModal()
  const  {darkMode} = useDarkMode()

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.key && formData.value) {
      onSave(formData);
      closeCreateModal()
      setFormData({})
    }
  };

  return createModalIsOpen && (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`relative rounded-2xl p-6 w-full max-w-md border-2 ${
        darkMode 
          ? 'bg-gray-800 border-gray-600 text-gray-100' 
          : 'bg-white border-gray-200 text-gray-900'
      }`}>
        <button
          onClick={()=> {
            closeCreateModal();
            onClose?.();
          }}
          className={`absolute top-4 right-4 p-1 rounded-xl ${
            darkMode ? 'hover:bg-gray-700/40' : 'hover:bg-gray-100'
          }`}
        >
          <XMarkIcon className="w-6 h-6" />
        </button>

        <h3 className="text-lg font-medium mb-4">✨ Nova Chave</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-2">Chave</label>
            <input
              type="text"
              required
              className={`w-full p-2 rounded-xl border-2 ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 focus:border-blue-400' 
                  : 'border-gray-200 focus:border-blue-500'
              }`}
              value={formData.key}
              onChange={(e) => setFormData({ ...formData, key: e.target.value })}
            />
          </div>
          
          <div>
            <label className="block text-sm mb-2">Valor</label>
            <textarea
              required
              rows={3}
              className={`w-full p-2 rounded-xl border-2 ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 focus:border-blue-400' 
                  : 'border-gray-200 focus:border-blue-500'
              }`}
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={()=> {
                closeCreateModal();
                onClose?.()
              }}
              className={`px-4 py-2 rounded-xl ${
                darkMode 
                  ? 'text-gray-300 hover:bg-gray-700/40' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`px-4 py-2 rounded-xl ${
                darkMode 
                  ? 'bg-blue-700 hover:bg-blue-600 text-white' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              Criar Chave
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateKeyModal;