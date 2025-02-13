import { ServerIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { useDarkMode } from "../hooks/useDarkMode";
import { useModal } from "../hooks/useModal";
import Disclaimer from "./Disclaimer";

const SetupGuideModal = () => {
  const { darkMode } = useDarkMode();
  const { setupGuideModalIsOpen, closeSetupGuideModal } = useModal();

  if (!setupGuideModalIsOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
      <div
        className={`p-6 rounded-lg shadow-lg w-[90%] max-w-lg border transition-all
          ${darkMode ? "bg-gray-800 text-white border-gray-700" : "bg-white text-gray-900 border-gray-300"}`}
      >
        <div className="flex justify-between items-center border-b pb-3">
          <div className="flex items-center gap-2">
            <ServerIcon className="w-6 h-6 text-blue-400" />
            <h2 className="text-lg font-medium">🛠️ Guia de Configuração</h2>
          </div>
          <button
            onClick={closeSetupGuideModal}
            className={`transition ${darkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-600 hover:text-gray-900"}`}
            aria-label="Fechar modal"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <Disclaimer className="mt-5 mb-5" showDisclaimer={true}>
          Com autenticação ativada, apenas chaves criadas no{" "}
          <strong>MemGUI</strong> podem ser gerenciadas, devido a uma limitação
          do protocolo do Memcached autenticado.
        </Disclaimer>

        <div className="mt-4 space-y-4 text-sm">
          <div>
            <h3 className="text-md font-semibold">🔹Nome da Conexão</h3>
            <p className="mt-1 ml-5 text-gray-400">
              Defina um nome para identificar a conexão dentro do sistema.
            </p>
          </div>

          <div>
            <h3 className="text-md font-semibold">🔹Endereço do Servidor</h3>
            <p className="mt-1 ml-5 text-gray-400">
              Insira o IP ou domínio do servidor Memcached. Para local, use{" "}
              <code>127.0.0.1</code> ou <code>localhost</code>.
            </p>
          </div>

          <div>
            <h3 className="text-md font-semibold">🔹Porta</h3>
            <p className="mt-1 ml-5 text-gray-400">
              O padrão do Memcached é{" "}
              <span className="font-semibold">11211</span>. Caso tenha sido
              alterado, utilize a porta configurada no servidor.
            </p>
          </div>

          <div>
            <h3 className="text-md font-semibold">🔹Autenticação (Opcional)</h3>
            <p className="mt-1 ml-5 text-gray-400">
              Insira usuário e senha apenas se seu servidor exigir autenticação.
            </p>
          </div>

          <div>
            <h3 className="text-md font-semibold">🔹Timeout</h3>
            <p className="mt-1 ml-5 text-gray-400">
              O timeout define o tempo máximo de resposta.
            </p>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={closeSetupGuideModal}
            className={`px-4 py-2 rounded-md font-medium transition-all
              ${darkMode ? "bg-blue-700 hover:bg-blue-600 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetupGuideModal;
