import { LinkIcon, SignalSlashIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';

const ConnectionList = ({ connections, darkMode, onSelect, onDelete, isOpen, onClose }) => {
  return (
    <>
      {/* Fundo escuro quando o menu estiver aberto */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose} 
        />
      )}

      {/* Menu lateral flutuante */}
      <div className={`fixed left-0 top-0 h-screen w-80 z-50 transition-transform duration-300 shadow-lg
        ${darkMode ? 'bg-gray-800 border-r border-gray-700' : 'bg-white border-r border-gray-200'}
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-4 space-y-2">
          {/* Cabeçalho do Menu */}
          <div className="flex justify-between items-center">
            <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Conexões Salvas
            </h3>
            <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-700/50">
              <XMarkIcon className={`w-6 h-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
            </button>
          </div>

          {/* Nenhuma conexão */}
          {connections.length === 0 && (
            <div className={`p-4 text-center rounded-xl flex flex-col items-center gap-2 ${
              darkMode ? 'bg-gray-700/30 text-gray-400' : 'bg-gray-50 text-gray-500'
            }`}>
              <SignalSlashIcon className="w-8 h-8 text-gray-400" />
              <p>Nenhuma conexão encontrada</p>
            </div>
          )}

          {/* Lista de Conexões */}
          {connections.map((conn) => (
            <div 
              key={`${conn.host}-${conn.port}`}
              className={`group flex items-center justify-between p-3 rounded-xl border cursor-pointer
                ${darkMode ? 'border-gray-600 hover:bg-gray-700/40' : 'border-gray-200 hover:bg-gray-50'}
                transition-all duration-200 shadow-sm
              `}
              onClick={() => onSelect(conn)}
            >
              <div className="flex-1">
                <div className={`flex items-center gap-2 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                  <LinkIcon className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium">{conn.name}</span>
                </div>
                <div className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {conn.host}:{conn.port}
                  <span className="ml-2 opacity-75">ID: {conn.id?.slice(0, 8)}</span>
                </div>
              </div>
              
              {/* Botão para deletar conexão */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(conn);
                }}
                className={`p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity
                  ${darkMode ? 'text-red-400 hover:bg-gray-600' : 'text-red-600 hover:bg-gray-200'}
                `}
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default ConnectionList;
