import { ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { useModal } from "../hooks/useModal";

const ErrorModal = () => {

  const {dismissError, errorModalIsOpen, errorModalMessage} = useModal()

  if (!errorModalIsOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-lg z-100">
      <div className="bg-[#1E293B]/90 text-white p-6 rounded-lg shadow-xl w-96 border border-gray-700 animate-fadeIn">
        <div className="flex items-center gap-3">
          <ExclamationCircleIcon className="w-8 h-8 text-red-500" />
          <h2 className="text-lg font-semibold">Erro</h2>
        </div>
        <p className="mt-2 text-sm text-gray-300">{errorModalMessage}</p>
        <div className="mt-4 flex justify-end">
          <button
            onClick={dismissError}
            className="bg-red-500 hover:bg-red-600 transition duration-200 text-white px-4 py-2 rounded-md shadow-md"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorModal;
