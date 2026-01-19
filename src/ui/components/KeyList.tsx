/* eslint-disable react-hooks/exhaustive-deps */
import { EditorView, keymap } from "@codemirror/view";
import {
  ArrowPathIcon,
  ClockIcon,
  DocumentMagnifyingGlassIcon,
  ListBulletIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon
} from "@heroicons/react/24/outline";
import CodeMirror from "@uiw/react-codemirror";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";

import { useConnections } from "../hooks/useConnections";
import { useDarkMode } from "../hooks/useDarkMode";
import { useModal } from "../hooks/useModal";
import { toneButton } from "../utils/buttonTone";
import { formatBytes } from "../utils/formatBytes";
import { queryLanguage } from "../utils/queryLanguage";
import CreateKeyModal from "./CreateKeyModal";
import Disclaimer from "./Disclaimer";
import EditKeyModal from "./EditKeyModal";
import ViewDataModal from "./ViewDataModal";
import { parseKeyQuery } from "@/api/utils/keyQuery";

const KeyList = () => {
  const { darkMode } = useDarkMode();
  const {
    keys,
    handleLoadKeys,
    handleDeleteKey,
    handleCreateKey,
    handleEditKey,
    currentConnection,
    totalKeyCount,
    lastQueryMetrics
  } = useConnections();

  const { openCreateModal, openEditModal, openViewDataModal } = useModal();
  const { t } = useTranslation();

  const [queryInput, setQueryInput] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [maxItems, setMaxItems] = useState(5);
  const [autoUpdate, setAutoUpdate] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const queryError = useMemo(() => {
    const trimmed = queryInput.trim();
    if (!trimmed) {
      return "";
    }
    const parsed = parseKeyQuery(trimmed);
    return "error" in parsed ? parsed.error : "";
  }, [queryInput]);

  useEffect(() => {
    const show = !!(currentConnection.username && currentConnection.password);
    setShowDisclaimer(show);
  }, [currentConnection.password, currentConnection.username]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoUpdate) {
      interval = setInterval(() => {
        handleLoadKeys(false, activeQuery, maxItems);
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
    // handleLoadKeys identity is stable enough; omit from deps to prevent loops
  }, [autoUpdate, activeQuery, maxItems]);

  const lastLoadParams = useRef<string>("");
  const lastConnectionIdRef = useRef<string>("");
  const skipNextLoadRef = useRef(true);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const buildLoadKey = (query: string) =>
    `${currentConnection.id}|${query}|${maxItems}`;

  const handleSearch = useCallback(async () => {
    if (!currentConnection.id) return;
    if (queryError) return;
    const normalizedQuery = queryInput.trim();
    const ok = await handleLoadKeys(true, normalizedQuery, maxItems, {
      force: true
    });
    if (ok) {
      lastLoadParams.current = buildLoadKey(normalizedQuery);
      setActiveQuery(normalizedQuery);
    }
  }, [currentConnection.id, handleLoadKeys, maxItems, queryError, queryInput]);

  const queryExtensions = useMemo(
    () => [
      queryLanguage,
      EditorView.lineWrapping,
      keymap.of([
        {
          key: "Ctrl-Enter",
          run: () => {
            void handleSearch();
            return true;
          }
        },
        {
          key: "Cmd-Enter",
          run: () => {
            void handleSearch();
            return true;
          }
        }
      ])
    ],
    [handleSearch]
  );

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (lastConnectionIdRef.current !== currentConnection.id) {
      lastConnectionIdRef.current = currentConnection.id;
      skipNextLoadRef.current = true;
      lastLoadParams.current = "";
    }

    if (!currentConnection.id) {
      lastLoadParams.current = "";
      return;
    }

    debounceRef.current = setTimeout(() => {
      const currentKey = buildLoadKey(activeQuery);
      if (lastLoadParams.current === currentKey) return;
      lastLoadParams.current = currentKey;

      const showLoading = activeQuery.trim() === "" && !skipNextLoadRef.current;
      skipNextLoadRef.current = false;
      handleLoadKeys(showLoading, activeQuery, maxItems);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [activeQuery, maxItems, currentConnection.id]);

  const filteredKeys = keys;
  return (
    <div
      className={`w-full px-2 sm:px-3 max-w-none mx-auto mt-10 transition-all ${
        darkMode ? "bg-gray-900 text-gray-100" : "bg-gray-50 text-gray-900"
      }`}
    >
      <Disclaimer
        className="mt-10 mb-10"
        showDisclaimer={showDisclaimer}
        hideDisclaimer={() => setShowDisclaimer(false)}
      >
        <Trans
          i18nKey="keyList.authWarning"
          components={{ strong: <strong /> }}
        />
      </Disclaimer>
      <div className="flex flex-col gap-3 mb-6">
        <h2 className="text-xl font-semibold">
          {t("keyList.title")}
          {totalKeyCount !== undefined ? `\u2068 (${totalKeyCount})\u2069` : ""}
        </h2>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleLoadKeys(true, activeQuery, maxItems)}
              className={toneButton("primary", darkMode)}
            >
              <ArrowPathIcon className="w-5 h-5" />
              {t("keyList.refresh")}
            </button>

            <button
              onClick={() => setAutoUpdate((prev) => !prev)}
              className={`${toneButton(
                autoUpdate ? "primary" : "neutral",
                darkMode
              )} pl-3 pr-4`}
            >
              <span
                className={`w-10 h-5 flex items-center rounded-full transition-all ${
                  autoUpdate
                    ? "bg-blue-400"
                    : darkMode
                      ? "bg-gray-600"
                      : "bg-gray-300"
                }`}
              >
                <span
                  className={`w-4 h-4 bg-white rounded-full shadow transform transition-all ${
                    autoUpdate ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </span>
              <span className="whitespace-nowrap">
                {t("keyList.autoRefresh")}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={openCreateModal}
              className={toneButton("success", darkMode)}
            >
              <PlusIcon className="w-5 h-5" />
              {t("keyList.create")}
            </button>
          </div>
        </div>
      </div>

      <div
        className={`p-4 rounded-xl mb-6 border shadow-lg ${
          darkMode
            ? "bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-800/80 border-slate-700/60"
            : "bg-gradient-to-br from-white via-slate-50 to-slate-100 border-slate-200"
        }`}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div
              className={`w-full flex-1 rounded-lg border shadow-sm transition ${
                queryError
                  ? "border-red-500 shadow-[0_0_0_1px_rgba(239,68,68,0.6)]"
                  : darkMode
                    ? "border-white/5"
                    : "border-gray-300"
              }`}
            >
              <CodeMirror
                value={queryInput}
                onChange={(value) => setQueryInput(value)}
                theme={darkMode ? "dark" : "light"}
                extensions={queryExtensions}
                placeholder={t("keyList.searchPlaceholder")}
                minHeight="96px"
                spellCheck={false}
                className="text-sm"
                basicSetup={{
                  lineNumbers: false,
                  foldGutter: false,
                  highlightActiveLine: false,
                  highlightSelectionMatches: false
                }}
              />
            </div>

            <div className="flex flex-col gap-3 lg:w-56">
              <button
                onClick={handleSearch}
                className={toneButton("primary", darkMode)}
              >
                <MagnifyingGlassIcon className="w-5 h-5" />
                {t("keyList.searchButton")}
              </button>

              <select
                value={maxItems}
                onChange={(e) => setMaxItems(Number(e.target.value))}
                className={`px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                  darkMode
                    ? "bg-gray-900 text-gray-100 border-gray-700"
                    : "bg-white text-gray-700 border border-gray-300"
                } cursor-pointer`}
              >
                {[5, 10, 15, 20, 50, 100].map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {queryError ? (
            <p className="text-xs text-red-500">
              {t("keyList.searchSyntaxError", { error: queryError })}
            </p>
          ) : null}

          {lastQueryMetrics ? (
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium border ${
                  darkMode
                    ? "bg-slate-900/60 text-slate-200 border-slate-700/60"
                    : "bg-white text-slate-700 border-slate-200"
                }`}
              >
                <ListBulletIcon className="w-4 h-4" />
                {t("keyList.searchResults", {
                  count: lastQueryMetrics.count
                })}
              </span>
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium border ${
                  darkMode
                    ? "bg-slate-900/60 text-slate-200 border-slate-700/60"
                    : "bg-white text-slate-700 border-slate-200"
                }`}
              >
                <ClockIcon className="w-4 h-4" />
                {t("keyList.searchDuration", {
                  duration: lastQueryMetrics.durationMs
                })}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <div
        className={`overflow-hidden mb-8 rounded-lg shadow ${
          darkMode ? "bg-gray-800" : "bg-white"
        }`}
      >
        <table className="w-full text-sm text-left">
          <thead
            className={`text-xs uppercase ${
              darkMode
                ? "bg-gray-700 text-gray-300"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            <tr>
              <th className="px-6 py-3">{t("keyList.columns.key")}</th>
              <th className="px-6 py-3">{t("keyList.columns.value")}</th>
              <th className="px-6 py-3">{t("keyList.columns.expiration")}</th>
              <th className="px-6 py-3">{t("keyList.columns.size")}</th>
              <th className="px-6 py-3 text-right">
                {t("keyList.columns.actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredKeys.length > 0 ? (
              filteredKeys.map((item) => (
                <tr
                  key={item.key}
                  className={`border-b transition-all ${
                    darkMode
                      ? "border-gray-700 hover:bg-gray-700 "
                      : "border-gray-300 hover:bg-gray-100"
                  }`}
                >
                  <td
                    className={`px-6 py-4 truncate max-w-[300px] ${
                      darkMode ? "text-gray-100" : "text-gray-800"
                    }`}
                  >
                    {item.key}
                  </td>
                  <td
                    className={`px-6 py-4 truncate max-w-[250px] ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    {item.value}
                  </td>
                  <td
                    className={`px-6 py-4 truncate max-w-[300px] ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    {item.timeUntilExpiration}
                  </td>
                  <td
                    className={`px-6 py-4 truncate max-w-[300px] ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                    title={`${item.size} B`}
                  >
                    {formatBytes(item.size)}
                  </td>
                  <td className="px-6 py-4 text-right align-middle">
                    <div className="flex justify-end items-center gap-3">
                      <button
                        onClick={() => openViewDataModal(item)}
                        className={`${toneButton("primary", darkMode, "icon")} !px-2 !py-2`}
                      >
                        <DocumentMagnifyingGlassIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => openEditModal(item)}
                        className={`${toneButton("primary", darkMode, "icon")} !px-2 !py-2`}
                      >
                        <PencilSquareIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteKey(item.key)}
                        className={`${toneButton("danger", darkMode, "icon")} !px-2 !py-2`}
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  {t("keyList.empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <CreateKeyModal onSave={handleCreateKey} />
      <EditKeyModal onSave={handleEditKey} />
      <ViewDataModal />
    </div>
  );
};

export default KeyList;
