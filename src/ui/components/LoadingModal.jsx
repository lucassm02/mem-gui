import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { useModal } from "../hooks/useModal";

const LoadingModal = () => {

  const {loadingModalIsOpen} = useModal()

  if (!loadingModalIsOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-md z-99">
      <div className="bg-[#1E293B]/80 text-white p-8 rounded-lg shadow-xl w-40 border border-gray-700 animate-fadeIn flex flex-col items-center">
        <div className="relative flex justify-center">
          <ArrowPathIcon className="w-14 h-14 text-blue-400 animate-spin" />
          <div className="absolute w-14 h-14 bg-blue-400 opacity-20 rounded-full blur-xl"></div>
        </div>
        <p className="mt-5 text-sm text-gray-300 font-medium">Carregando...</p>
      </div>
    </div>
  );
};

export default LoadingModal;
