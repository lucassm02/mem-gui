import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useDarkMode } from '../hooks/useDarkMode';
import { useModal } from '../hooks/useModal';

const EditKeyModal = ({ onClose, keyData, onSave }) => {

  const [value, setValue] = useState(keyData?.value || '');

    const { editModalIsOpen , closeEditModal} = useModal()
    const  {darkMode} = useDarkMode()

  useEffect(() => {
    if (keyData) {
      setValue(keyData.value || '');
    }
  }, [keyData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (value.trim()) {
      onSave({ ...keyData, value });
      closeEditModal()
      onClose?.();
    }
  };

  if (!editModalIsOpen || !keyData) return null; 

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`relative rounded-xl p-6 w-full max-w-md border-2 ${
        darkMode ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-200 text-gray-900'
      }`}>

        <button
          onClick={()=> {
            closeEditModal()
            onClose?.()
          }}
          className={`absolute top-4 right-4 p-1 rounded-full ${
            darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
          }`}
        >
          <XMarkIcon className="w-6 h-6" />
        </button>

        <h3 className="text-lg font-medium mb-4">✏️ Editar Chave</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Chave</label>
            <input
              type="text"
              className={`w-full p-2 rounded-lg cursor-not-allowed ${
                darkMode ? 'bg-gray-700 border-gray-600 opacity-75' : 'border-gray-300 bg-gray-50'
              }`}
              value={keyData.key}
              readOnly
            />
          </div>
          
          <div>
            <label className="block text-sm mb-1">Novo Valor</label>
            <textarea
              required
              rows={4}
              className={`w-full p-2 rounded-lg ${
                darkMode ? 'bg-gray-700 border-gray-600' : 'border-gray-300'
              }`}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={()=> {
                closeEditModal()
                onClose?.()
              }}
              className={`px-4 py-2 rounded-lg ${
                darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`px-4 py-2 rounded-lg ${
                darkMode ? 'bg-blue-700 hover:bg-blue-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditKeyModal;
