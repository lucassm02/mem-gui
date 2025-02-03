import { ServerIcon, SunIcon, MoonIcon, LinkIcon, LinkSlashIcon, Bars3Icon } from '@heroicons/react/24/outline';
import { useDarkMode } from '../hooks/useDarkMode';

const ConnectedHeader = ({ connection, onDisconnect, onToggleMenu }) => {
  const { darkMode, toggleDarkMode } = useDarkMode();

  return (
    <header className={`p-4 border-b flex items-center justify-between ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
    
      <button 
        onClick={onToggleMenu} 
        className={`cursor-pointer p-2 rounded-lg ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-200'}`}
      >
        <Bars3Icon className="w-6 h-6" />
      </button>

      <div className="flex items-center gap-4">
        <div className="p-2 rounded-xl bg-blue-400/10 border border-blue-400/20">
          <ServerIcon className={`w-6 h-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
        </div>
        <div>
          <h1 className={`text-xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
            {connection.name || 'MemGUI'}
            <span className="ml-2 text-xs font-normal opacity-75">{connection.id?.slice(0, 8)}</span>
          </h1>
          <div className={`flex items-center gap-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <LinkIcon className="w-4 h-4" />
            <span>{connection.host}:{connection.port}</span>
            <div className="w-2 h-2 rounded-full bg-green-400 animate-ping" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onDisconnect}
          className={`cursor-pointer flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${darkMode ? 'text-red-400 hover:bg-gray-700/40' : 'text-red-600 hover:bg-gray-100'}`}
        >
          <LinkSlashIcon className="w-5 h-5" />
          <span className="text-sm">Desconectar</span>
        </button>

        <button
          onClick={toggleDarkMode}
          className={`cursor-pointer p-2 rounded-xl border ${darkMode ? 'border-gray-600 text-blue-400 hover:bg-gray-700/40' : 'border-gray-200 text-blue-600 hover:bg-gray-100'}`}
        >
          {darkMode ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
        </button>
      </div>
    </header>
  );
};

export default ConnectedHeader;
