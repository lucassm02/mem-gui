/* eslint-disable react-hooks/exhaustive-deps */
import { EditorView, keymap } from "@codemirror/view";
import {
  ArrowPathIcon,
  ClockIcon,
  DocumentMagnifyingGlassIcon,
  ListBulletIcon,
  PencilSquareIcon,
  PlayIcon,
  PlusIcon,
  QuestionMarkCircleIcon,
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
import QueryGuideModal from "./QueryGuideModal";
import ViewDataModal from "./ViewDataModal";
import { parseKeyQuery } from "@/api/utils/keyQuery";
import { DEFAULT_KEY_QUERY } from "@/ui/constants/keyQuery";

const MAX_ITEMS = 10;

const normalizeQuery = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : DEFAULT_KEY_QUERY;
};

const KeyList = () => {
  const { darkMode } = useDarkMode();
  const {
    keys,
    handleLoadKeys,
    handleDeleteKey,
    handleCreateKey,
    handleEditKey,
    currentConnection,
    lastQueryMetrics,
    totalKeyCount
  } = useConnections();

  const {
    openCreateModal,
    openEditModal,
    openViewDataModal,
    openQueryGuideModal
  } = useModal();
  const { t } = useTranslation();

  const [queryInput, setQueryInput] = useState(DEFAULT_KEY_QUERY);
  const [activeQuery, setActiveQuery] = useState(DEFAULT_KEY_QUERY);
  const [autoUpdate, setAutoUpdate] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showSyntaxError, setShowSyntaxError] = useState(false);
  const queryError = useMemo(() => {
    const trimmed = queryInput.trim();
    if (!trimmed) {
      return "";
    }
    const parsed = parseKeyQuery(trimmed);
    return "error" in parsed ? parsed.error : "";
  }, [queryInput]);
  const showErrorMessage = showSyntaxError && !!queryError;

  useEffect(() => {
    const show = !!(currentConnection.username && currentConnection.password);
    setShowDisclaimer(show);
  }, [currentConnection.password, currentConnection.username]);

  useEffect(() => {
    setShowSyntaxError(false);
  }, [queryInput]);

  const lastLoadParams = useRef<string>("");
  const lastConnectionIdRef = useRef<string>("");
  const skipNextLoadRef = useRef(true);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const buildLoadKey = (query: string) =>
    `${currentConnection.id}|${normalizeQuery(query)}|${MAX_ITEMS}`;

  const handleSearch = useCallback(async () => {
    if (!currentConnection.id) return;
    if (queryError) {
      setShowSyntaxError(true);
      return;
    }
    setShowSyntaxError(false);
    const normalizedQuery = normalizeQuery(queryInput);
    if (!queryInput.trim()) {
      setQueryInput(normalizedQuery);
    }
    const ok = await handleLoadKeys(true, normalizedQuery, MAX_ITEMS, {
      force: true
    });
    if (ok) {
      lastLoadParams.current = buildLoadKey(normalizedQuery);
      setActiveQuery(normalizedQuery);
    }
  }, [currentConnection.id, handleLoadKeys, queryError, queryInput]);

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
    let interval: NodeJS.Timeout;
    if (autoUpdate) {
      interval = setInterval(() => {
        handleLoadKeys(false, normalizeQuery(activeQuery), MAX_ITEMS);
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
    // handleLoadKeys identity is stable enough; omit from deps to prevent loops
  }, [autoUpdate, activeQuery]);

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
      const resolvedQuery = normalizeQuery(activeQuery);
      const currentKey = buildLoadKey(resolvedQuery);
      if (lastLoadParams.current === currentKey) return;
      lastLoadParams.current = currentKey;

      const showLoading =
        resolvedQuery.trim() === "" && !skipNextLoadRef.current;
      skipNextLoadRef.current = false;
      handleLoadKeys(showLoading, resolvedQuery, MAX_ITEMS);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [activeQuery, currentConnection.id]);

  return (
    <div
      className={`w-full px-2 sm:px-3 max-w-none mx-auto mt-6 transition-all ${
        darkMode ? "bg-gray-900 text-gray-100" : "bg-gray-50 text-gray-900"
      }`}
    >
      <Disclaimer
        className="mt-6 mb-6"
        showDisclaimer={showDisclaimer}
        hideDisclaimer={() => setShowDisclaimer(false)}
      >
        <Trans
          i18nKey="keyList.authWarning"
          components={{ strong: <strong /> }}
        />
      </Disclaimer>
      <div
        className={`p-3 rounded-lg mb-2 border ${
          darkMode
            ? "bg-slate-940/60 border-slate-800/80"
            : "bg-white border-slate-200"
        }`}
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-full flex-1  border transition-colors ${
                darkMode
                  ? "border-slate-700/60 bg-slate-950/60"
                  : "border-slate-200 bg-white"
              } ${
                showErrorMessage ? "border-red-500 ring-1 ring-red-500/30" : ""
              }`}
            >
              <CodeMirror
                value={queryInput}
                onChange={(value) => setQueryInput(value)}
                theme={darkMode ? "dark" : "light"}
                color="blue"
                extensions={queryExtensions}
                placeholder={t("keyList.searchPlaceholder")}
                minHeight="40px"
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
            <div className="flex items-center gap-1">
              <button
                onClick={handleSearch}
                className={`${toneButton("primary", darkMode, "icon")} !p-2`}
                aria-label={t("keyList.searchButton")}
                title={t("keyList.searchButton")}
              >
                <PlayIcon className="h-5 w-5" />
              </button>
              <button
                onClick={openCreateModal}
                className={`${toneButton("success", darkMode, "icon")} !p-2`}
                aria-label={t("keyList.create")}
                title={t("keyList.create")}
              >
                <PlusIcon className="h-5 w-5" />
              </button>
              <button
                onClick={openQueryGuideModal}
                className={`${toneButton("neutral", darkMode, "icon")} !p-2`}
                aria-label={t("queryGuide.buttonLabel")}
                title={t("queryGuide.buttonLabel")}
              >
                <QuestionMarkCircleIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {showErrorMessage ? (
            <p className="text-xs text-red-500">
              {t("keyList.searchSyntaxError", { error: queryError })}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {totalKeyCount !== undefined ? (
          <span
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 border text-[11px] ${
              darkMode
                ? "bg-slate-900/60 text-slate-200 border-slate-700/60"
                : "bg-white text-slate-700 border-slate-200"
            }`}
          >
            {t("keyList.title")}: {totalKeyCount}
          </span>
        ) : null}
        {lastQueryMetrics ? (
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 border ${
                darkMode
                  ? "bg-slate-900/60 text-slate-200 border-slate-700/60"
                  : "bg-white text-slate-700 border-slate-200"
              }`}
            >
              <ListBulletIcon className="h-3 w-3" />
              {t("keyList.searchResults", {
                count: lastQueryMetrics.count
              })}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 border ${
                darkMode
                  ? "bg-slate-900/60 text-slate-200 border-slate-700/60"
                  : "bg-white text-slate-700 border-slate-200"
              }`}
            >
              <ClockIcon className="h-3 w-3" />
              {t("keyList.searchDuration", {
                duration: lastQueryMetrics.durationMs
              })}
            </span>
          </div>
        ) : null}
        <button
          onClick={() => setAutoUpdate((prev) => !prev)}
          className={`${toneButton(
            autoUpdate ? "primary" : "neutral",
            darkMode,
            "sm"
          )} !px-2 !py-1 text-[11px]`}
          aria-pressed={autoUpdate}
          title={t("keyList.autoRefresh")}
        >
          <ArrowPathIcon className="h-3 w-3" />
          <span className="hidden sm:inline">{t("keyList.autoRefresh")}</span>
        </button>
      </div>

      <div
        className={`overflow-hidden mb-6 rounded-md border ${
          darkMode
            ? "bg-slate-900/40 border-slate-700/60"
            : "bg-white border-slate-200"
        }`}
      >
        <table className="w-full text-xs text-left">
          <thead
            className={`text-[10px] uppercase tracking-wide ${
              darkMode
                ? "bg-gray-700 text-gray-300"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            <tr>
              <th className="px-3 py-2">{t("keyList.columns.key")}</th>
              <th className="px-3 py-2">{t("keyList.columns.value")}</th>
              <th className="px-3 py-2">{t("keyList.columns.expiration")}</th>
              <th className="px-3 py-2">{t("keyList.columns.size")}</th>
              <th className="px-3 py-2 text-right">
                {t("keyList.columns.actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {keys.length > 0 ? (
              keys.map((item) => (
                <tr
                  key={item.key}
                  className={`border-b transition-all ${
                    darkMode
                      ? "border-gray-700 hover:bg-gray-700 "
                      : "border-gray-300 hover:bg-gray-100"
                  }`}
                >
                  <td
                    className={`px-3 py-2 truncate max-w-[240px] ${
                      darkMode ? "text-gray-100" : "text-gray-800"
                    }`}
                  >
                    {item.key}
                  </td>
                  <td
                    className={`px-3 py-2 truncate max-w-[220px] ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    {item.value}
                  </td>
                  <td
                    className={`px-3 py-2 truncate max-w-[220px] ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    {item.timeUntilExpiration}
                  </td>
                  <td
                    className={`px-3 py-2 truncate max-w-[220px] ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                    title={`${item.size} B`}
                  >
                    {formatBytes(item.size)}
                  </td>
                  <td className="px-3 py-2 text-right align-middle">
                    <div className="flex justify-end items-center gap-2">
                      <button
                        onClick={() => openViewDataModal(item)}
                        className={`${toneButton(
                          "primary",
                          darkMode,
                          "icon"
                        )} !p-1.5`}
                      >
                        <DocumentMagnifyingGlassIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(item)}
                        className={`${toneButton(
                          "primary",
                          darkMode,
                          "icon"
                        )} !p-1.5`}
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteKey(item.key)}
                        className={`${toneButton(
                          "danger",
                          darkMode,
                          "icon"
                        )} !p-1.5`}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-3 py-3 text-center text-gray-500">
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
      <QueryGuideModal />
    </div>
  );
};

export default KeyList;
