import { MoonIcon, SunIcon, SwatchIcon, Bars3Icon } from '@heroicons/react/24/outline';
import { useDarkMode } from '../hooks/useDarkMode';

const UnconnectedHeader = ({ onToggleMenu }) => {
  const { darkMode, toggleDarkMode } = useDarkMode();

  return (
    <header className={`p-4 border-b flex items-center justify-between ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
      
      {/* ✅ Botão de Menu Hamburguer */}
      <button 
        onClick={onToggleMenu} 
        className={`p-2 rounded-lg ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-200'}`}
      >
        <Bars3Icon className="w-6 h-6" />
      </button>

      <div className="flex items-center gap-2">
        <SwatchIcon className={`w-6 h-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
        <h2 className={`text-lg font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
          MemGUI
        </h2>
      </div>

      <button
        onClick={toggleDarkMode}
        className={`p-2 rounded-lg ${darkMode ? 'text-blue-400 hover:bg-gray-700' : 'text-blue-600 hover:bg-gray-100'}`}
      >
        {darkMode ? <SunIcon className="w-6 h-6" /> : <MoonIcon className="w-6 h-6" />}
      </button>
    </header>
  );
};

export default UnconnectedHeader;
