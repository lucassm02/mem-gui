import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { xml } from "@codemirror/lang-xml";
import { XMarkIcon } from "@heroicons/react/24/solid";
import CodeMirror from "@uiw/react-codemirror";
import { useEffect, useMemo, useState } from "react";
import { useDarkMode } from "../hooks/useDarkMode";
import { useModal } from "../hooks/useModal";

const ViewDataModal = () => {
  const [format, setFormat] = useState("TEXT");
  const [copiedField, setCopiedField] = useState(null);
  const { darkMode } = useDarkMode();
  const { itemToView, viewDataModalIsOpen, closeViewDataModal } = useModal();

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

  useEffect(() => {
    if (viewDataModalIsOpen) {
      document.getElementById("format-selector")?.focus();
    }
  }, [viewDataModalIsOpen]);

  if (!viewDataModalIsOpen) return null;

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000); // Remove a indicação após 2 segundos
    });
  };

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
          <h2 className="text-lg font-medium">Detalhes</h2>
          <button
            onClick={closeViewDataModal}
            className={`transition ${darkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-600 hover:text-gray-900"}`}
            aria-label="Fechar modal"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {[
          { label: "CHAVE", value: itemToView.key, field: "key" },
          {
            label: "EXPIRAÇÃO",
            value: itemToView.timeUntilExpiration,
            field: "expiration"
          },
          { label: "TAMANHO (BYTES)", value: itemToView.size, field: "size" }
        ].map(({ label, value, field }) => (
          <div className="mt-4" key={field}>
            <span
              className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
            >
              {label}:
            </span>
            <p
              className={`font-mono p-2 rounded-md text-sm break-words border cursor-pointer transition
                ${darkMode ? "bg-gray-700 text-gray-200 border-gray-600 hover:bg-gray-600" : "bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200"}
                ${copiedField === field ? "bg-green-500 text-white" : ""}`}
              onClick={() => copyToClipboard(value, field)}
              title={copiedField === field ? "Copiado!" : "Clique para copiar"}
            >
              {value}
            </p>
          </div>
        ))}

        <div className="mt-4">
          <label
            className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
          >
            FORMATO:
          </label>
          <select
            id="format-selector"
            className={`p-2 rounded-md w-full mt-1 border focus:outline-none focus:ring transition
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

        <div
          className={`p-3 rounded-md border mt-4 max-h-72 overflow-auto transition
          ${darkMode ? "bg-gray-700 border-gray-600" : "bg-gray-100 border-gray-300"}`}
        >
          <CodeMirror
            value={itemToView.value}
            readOnly
            extensions={languageExtension ? [languageExtension] : undefined}
            theme={darkMode ? "dark" : "light"}
            basicSetup={{ lineNumbers: true }}
          />
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={closeViewDataModal}
            className={`px-4 py-2 rounded-md font-medium transition-all
              ${darkMode ? "bg-red-600 hover:bg-red-700 text-white" : "bg-red-500 hover:bg-red-600 text-white"}`}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewDataModal;
