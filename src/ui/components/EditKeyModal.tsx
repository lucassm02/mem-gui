import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { xml } from "@codemirror/lang-xml";
import { XMarkIcon } from "@heroicons/react/24/solid";
import CodeMirror from "@uiw/react-codemirror";
import { useState, useEffect, FormEvent, useMemo } from "react";

import { useDarkMode } from "../hooks/useDarkMode";
import { useModal } from "../hooks/useModal";

type Key = {
  key: string;
  value: string;
  size: number;
  timeUntilExpiration?: number;
};
type Params = { onSave: (key: Key) => void };

const EditKeyModal = ({ onSave }: Params) => {
  const { editModalIsOpen, closeEditModal, itemToEdit } = useModal();
  const { darkMode } = useDarkMode();

  const [value, setValue] = useState(itemToEdit?.value || "");
  const [timeUntilExpiration, setTimeUntilExpiration] = useState(
    itemToEdit?.timeUntilExpiration !== undefined
      ? itemToEdit.timeUntilExpiration
      : ""
  );
  const [format, setFormat] = useState("TEXT");

  useEffect(() => {
    if (itemToEdit) {
      setValue(itemToEdit.value || "");
      setTimeUntilExpiration(
        itemToEdit.timeUntilExpiration !== undefined
          ? itemToEdit.timeUntilExpiration
          : ""
      );
      setFormat("TEXT");
    }
  }, [itemToEdit]);

  const languageExtension = useMemo(() => {
    switch (format) {
      case "HTML":
        return html();
      case "XML":
        return xml();
      case "JavaScript":
        return javascript();
      case "TEXT":
        return null;
      default:
        return json();
    }
  }, [format]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (value.trim()) {
      onSave({
        ...itemToEdit,
        value,
        timeUntilExpiration: timeUntilExpiration
          ? Number(timeUntilExpiration)
          : undefined
      });
      closeEditModal();
    }
  };

  if (!editModalIsOpen || !itemToEdit) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
      <div
        className={`p-5 rounded-lg shadow-lg w-[90%] max-w-xl border transition-all
          ${darkMode ? "bg-gray-800 text-white border-gray-700" : "bg-white text-gray-900 border-gray-300"}`}
      >
        <div
          className={`flex justify-between items-center border-b pb-3
            ${darkMode ? "border-gray-700" : "border-gray-300"}`}
        >
          <h2 className="text-lg font-medium">✏️ Editar Chave</h2>
          <button
            onClick={closeEditModal}
            className={`transition ${darkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-600 hover:text-gray-900"}`}
            aria-label="Fechar modal"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mt-4">
            <label
              className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
            >
              CHAVE:
            </label>
            <input
              type="text"
              value={itemToEdit.key}
              readOnly
              className={`mt-1 w-full p-2 rounded-md cursor-not-allowed
                ${darkMode ? "bg-gray-700 text-white border-gray-600 opacity-75" : "bg-gray-100 text-gray-900 border-gray-300"}`}
            />
          </div>

          <div className="mt-4">
            <label
              className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
            >
              EXPIRAÇÃO (segundos):
            </label>
            <input
              type="number"
              value={timeUntilExpiration}
              onChange={(e) => setTimeUntilExpiration(e.target.value)}
              placeholder="Opcional"
              className={`mt-1 w-full p-2 rounded-md border focus:outline-none transition
                ${darkMode ? "bg-gray-700 text-white border-gray-600 focus:border-blue-400" : "bg-gray-100 text-gray-900 border-gray-300 focus:border-blue-500"}`}
            />
          </div>

          <div className="mt-4">
            <label
              className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
            >
              FORMATO:
            </label>
            <select
              id="format-selector"
              className={`mt-1 p-2 rounded-md w-full border focus:outline-none focus:ring transition
                ${darkMode ? "bg-gray-700 text-white border-gray-600 focus:ring-gray-500" : "bg-gray-100 text-gray-900 border-gray-300 focus:ring-gray-400"}`}
              value={format}
              onChange={(e) => setFormat(e.target.value)}
            >
              <option>TEXT</option>
              <option>JSON</option>
              <option>HTML</option>
              <option>XML</option>
              <option>JavaScript</option>
            </select>
          </div>

          <div className="mt-4">
            <label
              className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
            >
              NOVO VALOR:
            </label>
            <div
              className={`mt-1 p-3 rounded-md border max-h-72 overflow-auto transition
                ${darkMode ? "bg-gray-700 border-gray-600" : "bg-gray-100 border-gray-300"}`}
            >
              <CodeMirror
                value={value}
                onChange={setValue}
                extensions={languageExtension ? [languageExtension] : undefined}
                theme={darkMode ? "dark" : "light"}
                basicSetup={{ lineNumbers: true }}
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={closeEditModal}
              className={`px-4 py-2 rounded-md font-medium transition-all
                ${darkMode ? "bg-red-600 hover:bg-red-700 text-white" : "bg-red-500 hover:bg-red-600 text-white"}`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`px-4 py-2 rounded-md font-medium transition-all
                ${darkMode ? "bg-blue-700 hover:bg-blue-600 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
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
