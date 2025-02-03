import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useDarkMode } from '../hooks/useDarkMode';
import { useModal } from '../hooks/useModal';

const EditKeyModal = ({ onSave }) => {
  const { editModalIsOpen, closeEditModal, itemToEdit } = useModal();

  const [value, setValue] = useState(itemToEdit?.value || '');
  const [timeUntilExpiration, setTimeUntilExpiration] = useState(itemToEdit?.timeUntilExpiration !== undefined ? itemToEdit.timeUntilExpiration : '');

  const { darkMode } = useDarkMode();

  useEffect(() => {
    if (itemToEdit) {
      
      setValue(itemToEdit.value || '');
      setTimeUntilExpiration(itemToEdit.timeUntilExpiration !== undefined ? itemToEdit.timeUntilExpiration : '');
    }
  }, [itemToEdit]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (value.trim()) {
      onSave({ 
        ...itemToEdit, 
        value, 
        timeUntilExpiration: timeUntilExpiration ? Number(timeUntilExpiration) : undefined 
      });
      closeEditModal();
    }
  };

  if (!editModalIsOpen || !itemToEdit) return null; 

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`relative rounded-xl p-6 w-full max-w-md border-2 ${
        darkMode ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-200 text-gray-900'
      }`}>

        <button
          onClick={() => {
            closeEditModal();
          }}
          className={`cursor-pointer absolute top-4 right-4 p-1 rounded-xl ${
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
              value={itemToEdit.key}
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

          <div>
            <label className="block text-sm mb-1">Expiração (segundos)</label>
            <input
              type="number"
              className={`w-full p-2 rounded-lg border-2 ${
                darkMode ? 'bg-gray-700 border-gray-600 focus:border-blue-400' : 'border-gray-300 focus:border-blue-500'
              }`}
              value={timeUntilExpiration}
              onChange={(e) => setTimeUntilExpiration(e.target.value)}
              placeholder="Opcional"
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => {
                closeEditModal();
              }}
              className={`cursor-pointer px-4 py-2 rounded-lg ${
                darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`cursor-pointer px-4 py-2 rounded-lg ${
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
