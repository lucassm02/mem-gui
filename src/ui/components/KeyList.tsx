/* eslint-disable react-hooks/exhaustive-deps */
import { EditorView, keymap } from "@codemirror/view";
import {
  ArrowPathIcon,
  BookmarkIcon,
  ClockIcon,
  DocumentMagnifyingGlassIcon,
  ListBulletIcon,
  PencilSquareIcon,
  PlayIcon,
  PlusIcon,
  QuestionMarkCircleIcon,
  StarIcon,
  TrashIcon
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import CodeMirror from "@uiw/react-codemirror";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";

import { useConnections } from "../hooks/useConnections";
import { useDarkMode } from "../hooks/useDarkMode";
import { useModal } from "../hooks/useModal";
import { useStorage } from "../hooks/useStorage";
import { toneButton } from "../utils/buttonTone";
import { getConnectionIdentity } from "../utils/connectionIdentity";
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
const MAX_HISTORY_ITEMS = 10;
const STORAGE_SAVED_QUERIES = "SAVED_QUERIES";
const STORAGE_QUERY_HISTORY = "QUERY_HISTORY";
const SAVED_QUERIES_GLOBAL_KEY = "global";

type SavedQuery = {
  id: string;
  name: string;
  query: string;
  createdAt: string;
  updatedAt?: string;
  pinnedEnvironments?: string[];
};

type QueryHistoryEntry = {
  query: string;
  usedAt: string;
};

const normalizeQuery = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : DEFAULT_KEY_QUERY;
};

const getQueryErrorMessage = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  const parsed = parseKeyQuery(trimmed);
  return "error" in parsed ? parsed.error : "";
};

const buildId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const encodeStorageKey = (value: string) => {
  if (!value) return value;
  const hasSpecialChars = /[^A-Za-z0-9_-]/.test(value);
  if (!hasSpecialChars) return value;
  if (typeof btoa !== "function") {
    return value;
  }
  const base64 = btoa(unescape(encodeURIComponent(value)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  return `b64:${base64}`;
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
    openQueryGuideModal,
    showAlert,
    showConfirm
  } = useModal();
  const { getKey, setKey, storageVersion } = useStorage();
  const { t } = useTranslation();

  const [queryInput, setQueryInput] = useState(DEFAULT_KEY_QUERY);
  const [activeQuery, setActiveQuery] = useState(DEFAULT_KEY_QUERY);
  const [autoUpdate, setAutoUpdate] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showSyntaxError, setShowSyntaxError] = useState(false);
  const [savedQueriesByEnv, setSavedQueriesByEnv] = useState<
    Record<string, SavedQuery[]>
  >({});
  const [queryHistory, setQueryHistory] = useState<
    Record<string, QueryHistoryEntry[]>
  >({});
  const [saveFormOpen, setSaveFormOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveError, setSaveError] = useState("");

  const queryError = useMemo(
    () => getQueryErrorMessage(queryInput),
    [queryInput]
  );
  const showErrorMessage = showSyntaxError && !!queryError;
  const environmentKey = useMemo(() => {
    if (!currentConnection.host) return "";
    return getConnectionIdentity(currentConnection);
  }, [currentConnection]);
  const environmentStorageKey = useMemo(
    () => encodeStorageKey(environmentKey),
    [environmentKey]
  );

  const savedQueries = useMemo(() => {
    if (!environmentStorageKey) {
      return savedQueriesByEnv[SAVED_QUERIES_GLOBAL_KEY] ?? [];
    }
    return (
      savedQueriesByEnv[environmentStorageKey] ??
      savedQueriesByEnv[environmentKey] ??
      []
    );
  }, [environmentStorageKey, environmentKey, savedQueriesByEnv]);

  const sortedSavedQueries = useMemo(() => {
    const envKey = environmentKey;
    return [...savedQueries].sort((left, right) => {
      const leftPinned = !!envKey && left.pinnedEnvironments?.includes(envKey);
      const rightPinned =
        !!envKey && right.pinnedEnvironments?.includes(envKey);
      if (leftPinned !== rightPinned) {
        return leftPinned ? -1 : 1;
      }
      return left.name.localeCompare(right.name, undefined, {
        sensitivity: "base"
      });
    });
  }, [savedQueries, environmentKey]);

  const recentQueries = useMemo(() => {
    if (!environmentStorageKey) return [];
    return (
      queryHistory[environmentStorageKey] ?? queryHistory[environmentKey] ?? []
    );
  }, [environmentStorageKey, environmentKey, queryHistory]);

  useEffect(() => {
    const normalizeSavedList = (value: unknown) => {
      if (!Array.isArray(value)) return [];
      return value
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const record = item as Partial<SavedQuery>;
          const name = typeof record.name === "string" ? record.name : "";
          const query =
            typeof record.query === "string" ? record.query : DEFAULT_KEY_QUERY;
          if (!name.trim()) return null;
          return {
            id:
              typeof record.id === "string" && record.id.trim().length > 0
                ? record.id
                : buildId(),
            name: name.trim(),
            query,
            createdAt:
              typeof record.createdAt === "string"
                ? record.createdAt
                : new Date().toISOString(),
            updatedAt:
              typeof record.updatedAt === "string"
                ? record.updatedAt
                : undefined,
            pinnedEnvironments: Array.isArray(record.pinnedEnvironments)
              ? record.pinnedEnvironments.filter(
                  (env): env is string => typeof env === "string"
                )
              : []
          } satisfies SavedQuery;
        })
        .filter((item): item is SavedQuery => item !== null);
    };

    const load = async () => {
      const [storedSaved, storedHistory] = await Promise.all([
        getKey(STORAGE_SAVED_QUERIES),
        getKey(STORAGE_QUERY_HISTORY)
      ]);
      const savedValue = storedSaved?.value;
      const historyValue = storedHistory?.value;

      let normalizedSavedByEnv: Record<string, SavedQuery[]> = {};
      let shouldPersistSavedQueries = false;
      if (Array.isArray(savedValue)) {
        const normalizedSaved = normalizeSavedList(savedValue);
        if (normalizedSaved.length > 0) {
          const targetKey = environmentStorageKey || SAVED_QUERIES_GLOBAL_KEY;
          normalizedSavedByEnv = { [targetKey]: normalizedSaved };
          shouldPersistSavedQueries = true;
        }
      } else if (savedValue && typeof savedValue === "object") {
        Object.entries(savedValue as Record<string, unknown>).forEach(
          ([key, entries]) => {
            const normalized = normalizeSavedList(entries);
            if (normalized.length > 0) {
              normalizedSavedByEnv[key] = normalized;
            }
          }
        );
      }

      const normalizedHistory: Record<string, QueryHistoryEntry[]> = {};
      if (historyValue && typeof historyValue === "object") {
        Object.entries(historyValue as Record<string, unknown>).forEach(
          ([key, entries]) => {
            if (!Array.isArray(entries)) return;
            const normalizedEntries = entries
              .map((entry) => {
                if (!entry || typeof entry !== "object") return null;
                const record = entry as Partial<QueryHistoryEntry>;
                if (typeof record.query !== "string") return null;
                return {
                  query: record.query,
                  usedAt:
                    typeof record.usedAt === "string"
                      ? record.usedAt
                      : new Date().toISOString()
                } satisfies QueryHistoryEntry;
              })
              .filter((entry): entry is QueryHistoryEntry => entry !== null)
              .filter((entry) => entry.query.trim().length > 0)
              .slice(0, MAX_HISTORY_ITEMS);
            if (normalizedEntries.length > 0) {
              normalizedHistory[key] = normalizedEntries;
            }
          }
        );
      }

      setSavedQueriesByEnv(normalizedSavedByEnv);
      if (shouldPersistSavedQueries) {
        void setKey(STORAGE_SAVED_QUERIES, normalizedSavedByEnv);
      }
      setQueryHistory(normalizedHistory);
    };

    load();
  }, [environmentStorageKey, getKey, storageVersion]);

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

  const persistSavedQueries = useCallback(
    async (next: SavedQuery[], notify = false) => {
      const targetKey = environmentStorageKey || SAVED_QUERIES_GLOBAL_KEY;
      let updatedState: Record<string, SavedQuery[]> | undefined;
      setSavedQueriesByEnv((prev) => {
        updatedState = { ...prev, [targetKey]: next };
        return updatedState;
      });
      const ok = await setKey(
        STORAGE_SAVED_QUERIES,
        updatedState ?? { ...savedQueriesByEnv, [targetKey]: next }
      );
      if (!ok && notify) {
        showAlert(t("savedQueries.errors.saveFailed"), "error");
      }
      return ok;
    },
    [environmentStorageKey, savedQueriesByEnv, setKey, showAlert, t]
  );

  const addToHistory = useCallback(
    (query: string) => {
      if (!environmentStorageKey) return;
      const normalizedQuery = normalizeQuery(query);
      setQueryHistory((prev) => {
        const currentHistory = prev[environmentStorageKey] ?? [];
        const filtered = currentHistory.filter(
          (entry) => entry.query !== normalizedQuery
        );
        const nextEntries = [
          { query: normalizedQuery, usedAt: new Date().toISOString() },
          ...filtered
        ].slice(0, MAX_HISTORY_ITEMS);
        const next = { ...prev, [environmentStorageKey]: nextEntries };
        void setKey(STORAGE_QUERY_HISTORY, next);
        return next;
      });
    },
    [environmentStorageKey, setKey]
  );

  const handleSearch = useCallback(
    async (overrideQuery?: string) => {
      const rawQuery =
        typeof overrideQuery === "string" ? overrideQuery : queryInput;
      const error = getQueryErrorMessage(rawQuery);
      if (error) {
        setShowSyntaxError(true);
        if (overrideQuery !== undefined) {
          setQueryInput(rawQuery);
        }
        return;
      }
      setShowSyntaxError(false);
      const normalizedQuery = normalizeQuery(rawQuery);
      if (!rawQuery.trim()) {
        setQueryInput(normalizedQuery);
      } else if (overrideQuery !== undefined && rawQuery !== queryInput) {
        setQueryInput(rawQuery);
      }
      if (!currentConnection.id) {
        setActiveQuery(normalizedQuery);
        return;
      }
      const ok = await handleLoadKeys(true, normalizedQuery, MAX_ITEMS, {
        force: true
      });
      if (ok) {
        lastLoadParams.current = buildLoadKey(normalizedQuery);
        setActiveQuery(normalizedQuery);
        addToHistory(normalizedQuery);
      }
    },
    [addToHistory, currentConnection.id, handleLoadKeys, queryInput]
  );

  const handleSaveQuery = useCallback(async () => {
    const trimmedName = saveName.trim();
    if (!trimmedName) {
      setSaveError(t("savedQueries.errors.nameRequired"));
      return;
    }
    const error = getQueryErrorMessage(queryInput);
    if (error) {
      setSaveError(t("savedQueries.errors.invalidQuery"));
      setShowSyntaxError(true);
      return;
    }
    const normalizedQuery = normalizeQuery(queryInput);
    const now = new Date().toISOString();
    const existingIndex = savedQueries.findIndex(
      (item) => item.name.toLowerCase() === trimmedName.toLowerCase()
    );
    const next = [...savedQueries];
    if (existingIndex >= 0) {
      const existing = savedQueries[existingIndex];
      next[existingIndex] = {
        ...existing,
        name: trimmedName,
        query: normalizedQuery,
        updatedAt: now
      };
    } else {
      next.unshift({
        id: buildId(),
        name: trimmedName,
        query: normalizedQuery,
        createdAt: now,
        pinnedEnvironments: []
      });
    }
    const ok = await persistSavedQueries(next, true);
    if (ok) {
      setSaveFormOpen(false);
      setSaveName("");
      setSaveError("");
    }
  }, [persistSavedQueries, queryInput, saveName, savedQueries, t]);

  const handleTogglePin = useCallback(
    (item: SavedQuery) => {
      if (!environmentKey) return;
      const pinned = new Set(item.pinnedEnvironments ?? []);
      if (pinned.has(environmentKey)) {
        pinned.delete(environmentKey);
      } else {
        pinned.add(environmentKey);
      }
      const next = savedQueries.map((saved) =>
        saved.id === item.id
          ? { ...saved, pinnedEnvironments: Array.from(pinned) }
          : saved
      );
      void persistSavedQueries(next);
    },
    [environmentKey, persistSavedQueries, savedQueries]
  );

  const handleDeleteSavedQuery = useCallback(
    (item: SavedQuery) => {
      showConfirm({
        title: t("savedQueries.deleteTitle"),
        message: t("savedQueries.deleteMessage", { name: item.name }),
        confirmLabel: t("savedQueries.deleteConfirm"),
        cancelLabel: t("common.cancel"),
        onConfirm: async () => {
          const next = savedQueries.filter((saved) => saved.id !== item.id);
          await persistSavedQueries(next, true);
        }
      });
    },
    [persistSavedQueries, savedQueries, showConfirm, t]
  );

  const handleClearHistory = useCallback(() => {
    if (!environmentStorageKey) return;
    setQueryHistory((prev) => {
      const next = { ...prev };
      delete next[environmentStorageKey];
      if (environmentKey) {
        delete next[environmentKey];
      }
      void setKey(STORAGE_QUERY_HISTORY, next);
      return next;
    });
  }, [environmentKey, environmentStorageKey, setKey]);

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

          <div
            className={`mt-2 border-t pt-3 ${
              darkMode ? "border-slate-800/70" : "border-slate-200"
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSaveFormOpen((prev) => !prev);
                  setSaveError("");
                }}
                className={`${toneButton("warning", darkMode, "sm")} !px-2 !py-1 text-[11px]`}
                aria-pressed={saveFormOpen}
              >
                <BookmarkIcon className="h-3.5 w-3.5" />
                {t("savedQueries.saveButton")}
              </button>
              {saveFormOpen ? (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={saveName}
                    onChange={(event) => {
                      setSaveName(event.target.value);
                      setSaveError("");
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleSaveQuery();
                      }
                    }}
                    placeholder={t("savedQueries.namePlaceholder")}
                    className={`min-w-[160px] px-2 py-1 text-[11px] rounded-md border outline-none ${
                      darkMode
                        ? "bg-slate-950/60 border-slate-700/70 text-slate-200 placeholder:text-slate-500"
                        : "bg-white border-slate-200 text-slate-700 placeholder:text-slate-400"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => void handleSaveQuery()}
                    className={`${toneButton(
                      "primary",
                      darkMode,
                      "sm"
                    )} !px-2 !py-1 text-[11px]`}
                  >
                    {t("common.save")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSaveFormOpen(false);
                      setSaveName("");
                      setSaveError("");
                    }}
                    className={`${toneButton(
                      "neutral",
                      darkMode,
                      "sm"
                    )} !px-2 !py-1 text-[11px]`}
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              ) : null}
            </div>
            {saveError ? (
              <p className="mt-1 text-xs text-red-500">{saveError}</p>
            ) : null}

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <div
                className={`rounded-md border p-2 ${
                  darkMode
                    ? "bg-slate-950/40 border-slate-800/70"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span
                    className={`text-[11px] font-semibold uppercase tracking-wide ${
                      darkMode ? "text-slate-300" : "text-slate-600"
                    }`}
                  >
                    {t("savedQueries.savedTitle")}
                  </span>
                  <span
                    className={`text-[10px] ${
                      darkMode ? "text-slate-500" : "text-slate-500"
                    }`}
                  >
                    {savedQueries.length}
                  </span>
                </div>
                {sortedSavedQueries.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {sortedSavedQueries.map((item) => {
                      const isPinned =
                        !!environmentKey &&
                        item.pinnedEnvironments?.includes(environmentKey);
                      return (
                        <div
                          key={item.id}
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] ${
                            darkMode
                              ? "bg-slate-900/60 border-slate-700/60 text-slate-200"
                              : "bg-white border-slate-200 text-slate-700"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => void handleSearch(item.query)}
                            className="max-w-[160px] truncate text-left hover:underline cursor-pointer"
                            title={item.query}
                          >
                            {item.name}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTogglePin(item)}
                            disabled={!environmentKey}
                            className={`p-0.5 ${
                              !environmentKey
                                ? "cursor-not-allowed opacity-40"
                                : ""
                            }`}
                            title={
                              isPinned
                                ? t("savedQueries.unpin")
                                : t("savedQueries.pin")
                            }
                          >
                            {isPinned ? (
                              <StarIconSolid className="h-3.5 w-3.5 text-amber-400" />
                            ) : (
                              <StarIcon className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSavedQuery(item)}
                            className="p-0.5"
                            title={t("common.delete")}
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p
                    className={`text-xs ${
                      darkMode ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    {t("savedQueries.emptySaved")}
                  </p>
                )}
                {!environmentKey ? (
                  <p
                    className={`mt-2 text-[10px] ${
                      darkMode ? "text-slate-500" : "text-slate-500"
                    }`}
                  >
                    {t("savedQueries.pinHint")}
                  </p>
                ) : null}
              </div>

              <div
                className={`rounded-md border p-2 ${
                  darkMode
                    ? "bg-slate-950/40 border-slate-800/70"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span
                    className={`text-[11px] font-semibold uppercase tracking-wide ${
                      darkMode ? "text-slate-300" : "text-slate-600"
                    }`}
                  >
                    {t("savedQueries.recentTitle")}
                  </span>
                  {recentQueries.length > 0 ? (
                    <button
                      type="button"
                      onClick={handleClearHistory}
                      className={`text-[10px] ${
                        darkMode ? "text-slate-400" : "text-slate-500"
                      } hover:underline`}
                    >
                      {t("savedQueries.clearHistory")}
                    </button>
                  ) : null}
                </div>
                {recentQueries.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {recentQueries.map((entry) => (
                      <button
                        type="button"
                        key={`${entry.query}-${entry.usedAt}`}
                        onClick={() => void handleSearch(entry.query)}
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] cursor-pointer ${
                          darkMode
                            ? "bg-slate-900/60 border-slate-700/60 text-slate-200"
                            : "bg-white border-slate-200 text-slate-700"
                        }`}
                        title={entry.query}
                      >
                        <ClockIcon className="h-3 w-3" />
                        <span className="max-w-[200px] truncate">
                          {entry.query}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p
                    className={`text-xs ${
                      darkMode ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    {t("savedQueries.emptyRecent")}
                  </p>
                )}
              </div>
            </div>
          </div>
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
