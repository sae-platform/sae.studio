import { useEffect } from "react";

type SyncDeps = {
  apiBaseUrl: string;
  setApiBaseUrl: (url: string) => void;
  action: string;
  setAction: (action: string) => void;
  labelXml: string;
  ticketXml: string;
  setXml: (xml: string) => void;
  history: unknown[];
  setHistory: (h: unknown[]) => void;
  timeoutMs: number;
  setTimeoutMs: (ms: number) => void;
  sessions: unknown[];
  setSessions: (s: unknown[]) => void;
  autoSaveEnabled: boolean;
  setAutoSaveEnabled: (enabled: boolean) => void;
};

const STORAGE_KEYS = {
  apiBaseUrl: "saestudio.app.apiBaseUrl",
  action: "saestudio.app.action",
  xml: "saestudio.app.xml",
  history: "saestudio.app.history",
  timeoutMs: "saestudio.app.timeoutMs",
  sessions: "saestudio.app.sessions",
  autoSaveEnabled: "saestudio.app.autoSaveEnabled",
  ticketXml: "saestudio.app.ticketXml",
};

export function useLocalStorageSync(deps: SyncDeps) {
  // Load on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const {
      apiBaseUrl, action, xml, history, timeoutMs, sessions, autoSaveEnabled,
    } = STORAGE_KEYS;

    const savedApiBaseUrl = localStorage.getItem(apiBaseUrl);
    const savedAction = localStorage.getItem(action) as string | null;
    const savedXml = localStorage.getItem(xml);
    const savedHistory = localStorage.getItem(history);
    const savedTimeoutMs = localStorage.getItem(timeoutMs);
    const savedSessions = localStorage.getItem(sessions);
    const savedAutoSave = localStorage.getItem(autoSaveEnabled);

    if (savedApiBaseUrl) {
      try { deps.setApiBaseUrl(JSON.parse(savedApiBaseUrl)); }
      catch { deps.setApiBaseUrl(savedApiBaseUrl); }
    }
    if (savedAction) deps.setAction(savedAction);
    if (savedXml) {
      try { deps.setXml(JSON.parse(savedXml)); }
      catch { deps.setXml(savedXml); }
    }
    if (savedTimeoutMs && !Number.isNaN(Number(savedTimeoutMs))) deps.setTimeoutMs(Number(savedTimeoutMs));
    if (savedHistory) { try { deps.setHistory(JSON.parse(savedHistory)); } catch { deps.setHistory([]); } }
    if (savedSessions) { try { deps.setSessions(JSON.parse(savedSessions)); } catch { deps.setSessions([]); } }
    if (savedAutoSave !== null) deps.setAutoSaveEnabled(savedAutoSave === "true");
  }, []);

  // Save apiBaseUrl
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.apiBaseUrl, deps.apiBaseUrl);
    import("@/lib/api/client").then((m) => m.setApiBaseUrl(deps.apiBaseUrl));
  }, [deps.apiBaseUrl]);

  // Save action
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.action, deps.action);
  }, [deps.action]);

  // Save xml
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.xml, deps.labelXml);
    localStorage.setItem(STORAGE_KEYS.ticketXml, deps.ticketXml);
  }, [deps.labelXml, deps.ticketXml]);

  // Save history
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(deps.history));
  }, [deps.history]);

  // Save timeoutMs
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.timeoutMs, String(deps.timeoutMs));
  }, [deps.timeoutMs]);

  // Save sessions
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(deps.sessions));
  }, [deps.sessions]);

  // Save autoSave
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.autoSaveEnabled, String(deps.autoSaveEnabled));
  }, [deps.autoSaveEnabled]);
}
