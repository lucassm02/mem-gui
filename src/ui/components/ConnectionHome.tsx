import { PlusCircleIcon } from "@heroicons/react/24/solid";
import { useDarkMode } from "../hooks/useDarkMode";
import { useModal } from "@/ui/hooks";

const ConnectionHome = () => {
  const { darkMode } = useDarkMode();
  const { openConnectionModal, openSetupGuideModal } = useModal();

  return (
    <div
      className={`min-h-screen flex flex-col justify-center items-center px-6 text-center ${darkMode ? "bg-gray-900 text-gray-100" : "bg-gray-100 text-gray-900"}`}
    >
      <div className="mb-6">
        <img
          src={darkMode ? `images/logo-white.svg` : `images/logo.svg`}
          alt="MemGUI"
          className={`w-32 h-32 ${darkMode ? "text-blue-400" : "text-blue-600"}`}
        />
      </div>

      <h1 className="text-3xl font-bold mb-2">Bem-vindo ao MemGUI</h1>
      <p className="text-gray-400 max-w-md">
        Para começar, conecte-se a um servidor existente ou crie uma nova
        conexão.
      </p>

      <button
        onClick={openConnectionModal}
        className="mt-6 px-6 py-3 rounded-lg font-medium bg-green-500 hover:bg-green-600 text-white flex items-center gap-2 transition-all"
      >
        <PlusCircleIcon className="w-5 h-5" />
        Criar Nova Conexão
      </button>

      <div
        className={`mt-6 p-4 rounded-lg border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-300"} max-w-md`}
      >
        <h2 className="font-semibold text-lg">Novo por aqui?</h2>
        <p className="text-sm text-gray-400">
          Caso não tenha um servidor configurado, veja nosso{" "}
          <a
            onClick={openSetupGuideModal}
            className="text-blue-400 hover:cursor-pointer"
          >
            guia de configuração
          </a>
          .
        </p>
      </div>
    </div>
  );
};

export default ConnectionHome;
