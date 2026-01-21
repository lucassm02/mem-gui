import { QuestionMarkCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Trans, useTranslation } from "react-i18next";

import { useDarkMode } from "../hooks/useDarkMode";
import { useModal } from "../hooks/useModal";
import { toneButton } from "../utils/buttonTone";
import { DEFAULT_KEY_QUERY } from "@/ui/constants/keyQuery";

const QueryGuideModal = () => {
  const { darkMode } = useDarkMode();
  const { queryGuideModalIsOpen, closeQueryGuideModal } = useModal();
  const { t } = useTranslation();

  if (!queryGuideModalIsOpen) return null;

  const codeClassName = `px-1 py-0.5 rounded text-xs font-mono ${
    darkMode ? "bg-slate-900/60 text-slate-100" : "bg-slate-100 text-slate-800"
  }`;
  const bodyTextClass = darkMode ? "text-gray-300" : "text-gray-600";

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
      <div
        className={`p-5 rounded-lg shadow-lg w-[92%] max-w-xl max-h-[85vh] overflow-y-auto border transition-all
          ${darkMode ? "bg-gray-800 text-white border-gray-700" : "bg-white text-gray-900 border-gray-300"}`}
      >
        <div className="flex justify-between items-center border-b pb-3">
          <div className="flex items-center gap-2">
            <QuestionMarkCircleIcon className="w-6 h-6 text-blue-400" />
            <h2 className="text-lg font-medium">{t("queryGuide.title")}</h2>
          </div>
          <button
            onClick={closeQueryGuideModal}
            className={`${toneButton("neutral", darkMode, "icon")} !p-1`}
            aria-label={t("common.close")}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <p className={`mt-4 text-sm ${bodyTextClass}`}>
          {t("queryGuide.description")}
        </p>

        <div className="mt-4 space-y-4 text-sm">
          <div>
            <h3 className="text-md font-semibold">
              {t("queryGuide.sections.filters.title")}
            </h3>
            <ul className={`mt-2 space-y-1 list-disc list-inside ${bodyTextClass}`}>
              <li>
                <Trans
                  i18nKey="queryGuide.sections.filters.item1"
                  components={{ code: <code className={codeClassName} /> }}
                />
              </li>
              <li>
                <Trans
                  i18nKey="queryGuide.sections.filters.item2"
                  components={{ code: <code className={codeClassName} /> }}
                />
              </li>
              <li>
                <Trans
                  i18nKey="queryGuide.sections.filters.item3"
                  components={{ code: <code className={codeClassName} /> }}
                />
              </li>
              <li>
                <Trans
                  i18nKey="queryGuide.sections.filters.item4"
                  components={{ code: <code className={codeClassName} /> }}
                />
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-md font-semibold">
              {t("queryGuide.sections.ordering.title")}
            </h3>
            <ul className={`mt-2 space-y-1 list-disc list-inside ${bodyTextClass}`}>
              <li>
                <Trans
                  i18nKey="queryGuide.sections.ordering.item1"
                  components={{ code: <code className={codeClassName} /> }}
                />
              </li>
              <li>
                <Trans
                  i18nKey="queryGuide.sections.ordering.item2"
                  components={{ code: <code className={codeClassName} /> }}
                />
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-md font-semibold">
              {t("queryGuide.sections.examples.title")}
            </h3>
            <ul className={`mt-2 space-y-1 list-disc list-inside ${bodyTextClass}`}>
              <li>
                <Trans
                  i18nKey="queryGuide.sections.examples.item1"
                  components={{ code: <code className={codeClassName} /> }}
                />
              </li>
              <li>
                <Trans
                  i18nKey="queryGuide.sections.examples.item2"
                  components={{ code: <code className={codeClassName} /> }}
                />
              </li>
              <li>
                <Trans
                  i18nKey="queryGuide.sections.examples.item3"
                  values={{ defaultQuery: DEFAULT_KEY_QUERY }}
                  components={{ code: <code className={codeClassName} /> }}
                />
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={closeQueryGuideModal}
            className={toneButton("primary", darkMode, "sm")}
          >
            {t("common.close")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QueryGuideModal;
