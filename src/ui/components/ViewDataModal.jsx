import { XMarkIcon } from "@heroicons/react/24/solid";
import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { javascript } from "@codemirror/lang-javascript";
import { xml } from "@codemirror/lang-xml";
import { html } from "@codemirror/lang-html";
import { Text } from "@codemirror/state";
import { useState, useMemo, useEffect } from "react";
import { useModal } from "../hooks/useModal";

const ViewDataModal = () => {
  const [format, setFormat] = useState("TEXT");
  const [copiedField, setCopiedField] = useState(null);

  const { itemToView: viewDataModalData, viewDataModalIsOpen, closeViewDataModal } = useModal();

  const languageExtension = useMemo(() => {
    switch (format) {
      case "HTML":
        return html();
      case "XML":
        return xml();
      case "JavaScript":
        return javascript();
      case "Text":
        return Text();
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

  // Função para copiar conteúdo ao clicar
  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000); // Remove a indicação após 2 segundos
    });
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
      <div className="bg-[#1E293B] text-white p-5 rounded-lg shadow-lg w-[90%] max-w-xl border border-gray-700">
        
        <div className="flex justify-between items-center border-b border-gray-700 pb-3">
          <h2 className="text-lg font-medium">Detalhes</h2>
          <button 
            onClick={closeViewDataModal} 
            className="text-gray-400 hover:text-gray-200 transition"
            aria-label="Fechar modal"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Campos de dados */}
        {[
          { label: "CHAVE", value: viewDataModalData.key, field: "key" },
          { label: "EXPIRAÇÃO", value: viewDataModalData.timeUntilExpiration, field: "expiration" },
          { label: "TAMANHO (BYTES)", value: viewDataModalData.size, field: "size" },
        ].map(({ label, value, field }) => (
          <div className="mt-4" key={field}>
            <span className="text-gray-400 text-sm">{label}:</span>
            <p 
              className={`text-gray-300 font-mono bg-[#334155] p-2 rounded-md text-sm break-words border border-gray-700 cursor-pointer transition ${
                copiedField === field ? "bg-green-600 text-white" : ""
              }`}
              onClick={() => copyToClipboard(value, field)}
              title={copiedField === field ? "Copiado!" : "Clique para copiar"}
            >
              {value}
            </p>
          </div>
        ))}

        {/* Seleção de Formato */}
        <div className="mt-4">
          <label className="text-gray-400 text-sm">FORMATO:</label>
          <select
            id="format-selector"
            className="bg-[#334155] text-white p-2 rounded-md w-full mt-1 border border-gray-700 focus:outline-none focus:ring focus:ring-gray-600"
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

        {/* Editor de Código */}
        <div className="bg-[#334155] p-3 rounded-md border border-gray-700 mt-4 max-h-72 overflow-auto">
          <CodeMirror
            value={viewDataModalData.value}
            readOnly
            extensions={[languageExtension]}
            theme="dark"
            basicSetup={{ lineNumbers: true }}
          />
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={closeViewDataModal}
            className="bg-red-600 hover:bg-red-700 transition-all duration-200 text-white px-4 py-2 rounded-md font-medium"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewDataModal;
