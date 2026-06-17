import { useEffect, useMemo, useRef, useState } from "react";
import { getCurrentWindow } from '@tauri-apps/api/window';
import { open } from '@tauri-apps/plugin-shell';
import { createLabelsApi, DEFAULT_API_BASE_URL, createEditorApi, templatesApi } from "@/lib/api/client";
import type { EditorDocumentSummary, UpsertEditorDocumentPayload, EditorTemplate } from "@/lib/api/client";
import VisualCanvasEditor from "@/components/VisualCanvasEditor";
import TicketDesigner from "@/components/TicketDesigner";
import { DocumentDesigner } from "@/modules/document-designer/DocumentDesigner";
import LogicalPrintersManagerModal from "@/components/LogicalPrintersManagerModal";
import { Portal } from "@/components/Portal";
import { useWorkspaceStore, useGlobalKeyboard, useDocumentPersistence } from "@/modules/document-library";
import { TopBar } from "@/modules/document-library/components/TopBar";
import type { DocKind } from "@/modules/document-library";
import { useLocalStorageSync } from "@/application/useLocalStorageSync";
import { AboutModal } from "@/modules/document-library/components/AboutModal";
import { ResultModal } from "@/modules/document-library/components/ResultModal";
import { PropertiesModal } from "@/modules/document-library/components/PropertiesModal";
import { NewDocumentTypeModal } from "@/modules/document-library/components/NewDocumentTypeModal";
import { ApiConfigModal } from "@/modules/document-library/components/ApiConfigModal";
import { OpenDocumentModal } from "@/modules/document-library/components/OpenDocumentModal";
import { NewConfigModal } from "@/modules/document-library/components/NewConfigModal";
import { NewTicketConfigModal } from "@/modules/document-library/components/NewTicketConfigModal";
import { TemplatesGallery } from "@/modules/document-library/components/TemplatesGallery";
import "./LabelWorkbench.css";
import pkg from "../../package.json";

type Action = "parse" | "convert-to-glabels" | "convert-from-glabels";
type Unit = "mm" | "cm" | "in" | "pt";

const sampleSaeXml =
  `<saelabels version="1.0"><template brand="SAE" description="Demo" part="P-1" size="custom"><label_rectangle width_pt="144" height_pt="72" round_pt="0" x_waste_pt="0" y_waste_pt="0" /><layout dx_pt="0" dy_pt="0" nx="1" ny="1" x0_pt="0" y0_pt="0" /></template><objects /><variables /></saelabels>`;
const sampleGlabelsXml =
  `<Glabels-document version="4.0"><Template brand="Demo" description="Demo" part="P-1" size="custom"><Label-rectangle width="144pt" height="72pt"><Layout dx="144pt" dy="72pt" nx="1" ny="1" x0="0pt" y0="0pt"/></Label-rectangle></Template><Objects/><Variables/><Data/></Glabels-document>`;

const STORAGE = {
  apiBaseUrl: "saestudio.app.apiBaseUrl",
  action: "saestudio.app.action",
  xml: "saestudio.app.xml",
  history: "saestudio.app.history",
  timeoutMs: "saestudio.app.timeoutMs",
  sessions: "saestudio.app.sessions",
  autoSaveEnabled: "saestudio.app.autoSaveEnabled",
};

type HistoryItem = {
  id: string;
  createdAt: string;
  action: Action;
  ok: boolean;
  elapsedMs: number;
  errorMessage?: string;
};

type SessionItem = {
  id: string;
  name: string;
  createdAt: string;
  apiBaseUrl: string;
  action: Action;
  xml: string;
  timeoutMs: number;
};

type NewDocumentDraft = {
  kind: DocKind;
  name: string;
  width: number;
  height: number;
  unit: Unit;
  brand: string;
  description: string;
  part: string;
  size: string;
};

type LabelPreset = {
  id: string;
  name: string;
  width: number;
  height: number;
  unit: Unit;
  brand: string;
  part: string;
  size: string;
  description: string;
};

const LABEL_PRESETS: LabelPreset[] = [
  { id: "custom", name: "Custom", width: 50, height: 25, unit: "mm", brand: "Custom", part: "P-1", size: "custom", description: "Tamaño personalizado" },
  { id: "avery-5160", name: "Avery 5160 (Address)", width: 66.675, height: 25.4, unit: "mm", brand: "Avery", part: "5160", size: "US Letter", description: "30 etiquetas por hoja" },
  { id: "avery-5163", name: "Avery 5163 (Shipping)", width: 101.6, height: 50.8, unit: "mm", brand: "Avery", part: "5163", size: "US Letter", description: "10 etiquetas por hoja" },
  { id: "avery-5164", name: "Avery 5164 (Shipping)", width: 101.6, height: 84.667, unit: "mm", brand: "Avery", part: "5164", size: "US Letter", description: "6 etiquetas por hoja" },
  { id: "dymo-30252", name: "DYMO 30252 (Address)", width: 54, height: 25, unit: "mm", brand: "DYMO", part: "30252", size: "Roll", description: "Address label" },
  { id: "brother-dk-11201", name: "Brother DK-11201", width: 29, height: 90, unit: "mm", brand: "Brother", part: "DK-11201", size: "Roll", description: "Address label" },
  { id: "zebra-4x6", name: "Zebra 4x6 Shipping", width: 4, height: 6, unit: "in", brand: "Zebra", part: "4x6", size: "Roll", description: "Envío estándar" },
];

const PT_PER_IN = 72;
const MM_PER_IN = 25.4;
const toPt = (value: number, unit: Unit): number => {
  if (unit === "pt") return value;
  if (unit === "in") return value * PT_PER_IN;
  if (unit === "mm") return (value / MM_PER_IN) * PT_PER_IN;
  return (value / 2.54) * PT_PER_IN;
};
const fmt = (n: number) => n.toFixed(4).replace(/\.?0+$/, "");
const xesc = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function buildNewDocumentXml(draft: NewDocumentDraft): string {
  const widthPt = Math.max(1, toPt(draft.width, draft.unit));
  const heightPt = Math.max(1, toPt(draft.height, draft.unit));
  const brand = "Custom";
  const description = xesc((draft.name.trim() || "Nueva etiqueta"));
  const part = "P-1";
  const size = "custom";
  if (draft.kind === "sae") {
    return `<saelabels version="1.0"><template brand="${brand}" description="${description}" part="${part}" size="${size}"><label_rectangle width_pt="${fmt(widthPt)}" height_pt="${fmt(heightPt)}" round_pt="0" x_waste_pt="0" y_waste_pt="0" /><layout dx_pt="0" dy_pt="0" nx="1" ny="1" x0_pt="0" y0_pt="0" /></template><objects /><variables /></saelabels>`;
  }
  return `<Glabels-document version="4.0"><Template brand="${brand}" description="${description}" part="${part}" size="${size}"><Label-rectangle width="${fmt(widthPt)}pt" height="${fmt(heightPt)}pt"><Layout dx="${fmt(widthPt)}pt" dy="${fmt(heightPt)}pt" nx="1" ny="1" x0="0pt" y0="0pt"/></Label-rectangle></Template><Objects/><Variables/><Data/></Glabels-document>`;
}

function sanitizeXmlInput(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .replace(/^\s*```(?:xml)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

function getExpectedRoots(action: Action): string[] {
  if (action === "convert-from-glabels") {
    return ["glabels-document", "glabels-template", "template"];
  }
  return ["saelabels"];
}

function validateXmlInput(action: Action, rawXml: string): { ok: true; normalizedXml: string } | { ok: false; error: string } {
  const normalizedXml = sanitizeXmlInput(rawXml);
  if (!normalizedXml) {
    return { ok: false, error: "Debes ingresar XML para procesar." };
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(normalizedXml, "application/xml");
  const parserError = document.querySelector("parsererror");
  if (parserError) {
    return { ok: false, error: "XML invalido. Revisa formato y etiquetas." };
  }

  const rootName = document.documentElement?.nodeName?.toLowerCase() ?? "";
  const expectedRoots = getExpectedRoots(action);
  if (!expectedRoots.includes(rootName)) {
    return {
      ok: false,
      error: `Raiz invalida para '${action}'. Esperado: ${expectedRoots.map((x) => `<${x}>`).join(", ")} y llego <${rootName || "vacia"}>.`,
    };
  }

  return { ok: true, normalizedXml };
}

export default function LabelWorkbench() {
  const store = useWorkspaceStore();
  const {
    apiBaseUrl, setApiBaseUrl, timeoutMs, setTimeoutMs,
    docKind, setDocKind, labelXml, setLabelXml, ticketXml, setTicketXml,
    documentXml, setDocumentXml, documentDocId, setDocumentDocId, documentDocName, setDocumentDocName,
    labelDocId, setLabelDocId, ticketDocId, setTicketDocId,
    labelDocName, setLabelDocName, ticketDocName, setTicketDocName,
    saveStatus, setSaveStatus, autoSaveEnabled, setAutoSaveEnabled,
    darkMode, setDarkMode,
    metaVersion, setMetaVersion, metaBrand, setMetaBrand,
    metaDescription, setMetaDescription, metaPart, setMetaPart, metaSize, setMetaSize,
    canUndo, setCanUndo, canRedo, setCanRedo,
    setMetadata,
  } = store;

  // Contextual Getters
  const xml = docKind === 'saetickets' ? ticketXml : docKind === 'saedocument' ? documentXml : labelXml;
  const setXml = docKind === 'saetickets' ? setTicketXml : docKind === 'saedocument' ? setDocumentXml : setLabelXml;
  const docId = docKind === 'saetickets' ? ticketDocId : docKind === 'saedocument' ? documentDocId : labelDocId;
  const setDocId = docKind === 'saetickets' ? setTicketDocId : docKind === 'saedocument' ? setDocumentDocId : setLabelDocId;
  const docName = docKind === 'saetickets' ? ticketDocName : docKind === 'saedocument' ? documentDocName : labelDocName;
  const setDocName = docKind === 'saetickets' ? setTicketDocName : docKind === 'saedocument' ? setDocumentDocName : setLabelDocName;

  const [labelFileHandle, setLabelFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [ticketFileHandle, setTicketFileHandle] = useState<FileSystemFileHandle | null>(null);
  const fileHandle = docKind === 'saetickets' ? ticketFileHandle : labelFileHandle;
  const setFileHandle = docKind === 'saetickets' ? setTicketFileHandle : setLabelFileHandle;

  const [action, setAction] = useState<Action>("parse");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pingStatus, setPingStatus] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [showApiConfigModal, setShowApiConfigModal] = useState(false);
  const [showPrintersManagerModal, setShowPrintersManagerModal] = useState(false);
  const [apiBaseUrlDraft, setApiBaseUrlDraft] = useState("");
  const [showResultModal, setShowResultModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showTemplatesGallery, setShowTemplatesGallery] = useState(false);
  const [showOpenDocModal, setShowOpenDocModal] = useState(false);
  const [openDocSearch, setOpenDocSearch] = useState("");
  const [showNewTypeModal, setShowNewTypeModal] = useState(false);
  const [showNewConfigModal, setShowNewConfigModal] = useState(false);
  const [showNewTicketConfigModal, setShowNewTicketConfigModal] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState("custom");
  const [newDocumentDraft, setNewDocumentDraft] = useState<NewDocumentDraft>({
    kind: "sae",
    name: "Nueva etiqueta",
    width: 50,
    height: 25,
    unit: "mm",
    brand: "Custom",
    description: "Etiqueta personalizada",
    part: "P-1",
    size: "custom",
  });
  const [newTicketDraft, setNewTicketDraft] = useState({
    name: "Nuevo Tiquete",
    width: 80,
  });

  const [documents, setDocuments] = useState<EditorDocumentSummary[]>([]);
  const [propertiesModalOpen, setPropertiesModalOpen] = useState(false);
  const [pendingTemplateXml, setPendingTemplateXml] = useState<string | null>(null);
  const [templates, setTemplates] = useState<EditorTemplate[]>([]);

  useEffect(() => {
    const root = document.documentElement;
    const stored = localStorage.getItem("theme");
    const isDark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (isDark) {
      root.setAttribute("data-theme", "dark");
      setDarkMode(true);
    }
  }, []);

  useEffect(() => {
    if (!darkMode) return;
    const root = document.documentElement;
    root.setAttribute("data-theme", "dark");
    localStorage.setItem("theme", "dark");
  }, [darkMode]);

  // Listen for Undo/Redo availability from designers
  useEffect(() => {
    const handleHistoryChange = (e: any) => {
      setCanUndo(e.detail.canUndo);
      setCanRedo(e.detail.canRedo);
    };
    window.addEventListener("saelabel:history-change", handleHistoryChange);
    return () => window.removeEventListener("saelabel:history-change", handleHistoryChange);
  }, []);


  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useLocalStorageSync({
    apiBaseUrl, setApiBaseUrl,
    action, setAction: setAction as any,
    labelXml, ticketXml, setXml: setXml as any,
    history, setHistory: (h: unknown[]) => setHistory(h as HistoryItem[]),
    timeoutMs, setTimeoutMs: setTimeoutMs as any,
    sessions, setSessions: (s: unknown[]) => setSessions(s as SessionItem[]),
    autoSaveEnabled, setAutoSaveEnabled: setAutoSaveEnabled as any,
  });

  const refreshTemplates = async () => {
    try {
      const url = `${apiBaseUrl.trim().replace(/\/+$/, "")}/api/templates?t=${Date.now()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const list = await response.json() as EditorTemplate[];
      setTemplates(list);
    } catch (err) {
      console.error("Error fetching templates:", err);
    }
  };

  useEffect(() => {
    if (showTemplatesGallery) refreshTemplates();
  }, [showTemplatesGallery]);

  const buttonLabel = useMemo(() => {
    if (action === "parse") return "Probar parse";
    if (action === "convert-to-glabels") return "Convertir a glabels";
    return "Convertir desde glabels";
  }, [action]);
  const resultExtension = action === "parse" ? "json" : "xml";
  const labelsApi = useMemo(() => createLabelsApi(apiBaseUrl, { timeoutMs }), [apiBaseUrl, timeoutMs]);
  const editorApi = useMemo(() => createEditorApi(apiBaseUrl, { timeoutMs }), [apiBaseUrl, timeoutMs]);

  const {
    saveDoc, saveAsDoc, deleteDocument, confirmDiscardChanges, loadDocument,
  } = useDocumentPersistence({
    editorApi: editorApi as any,
    fileHandles: {
      label: labelFileHandle, ticket: ticketFileHandle,
      setLabel: setLabelFileHandle, setTicket: setTicketFileHandle,
    },
    setDocuments,
    setError,
    setResult,
    setShowResultModal,
  });

  const refreshDocuments = async () => {
    try {
      const docs = await editorApi.listDocuments();
      setDocuments(docs);
    } catch (e) {
      // Ignorar error para no mostrar mensajes al cargar
    }
  };

  useGlobalKeyboard({
    docKind, saveDoc,
    propertiesModalOpen, setPropertiesModalOpen,
    showNewConfigModal, setShowNewConfigModal,
    showNewTypeModal, setShowNewTypeModal,
    showApiConfigModal, setShowApiConfigModal,
    showOpenDocModal, setShowOpenDocModal,
    showResultModal, setShowResultModal,
    showTemplatesGallery, setShowTemplatesGallery,
    showAboutModal, setShowAboutModal,
    showPrintersManagerModal, setShowPrintersManagerModal,
  });

  const openLocalFile = async () => {
    if (!(await confirmDiscardChanges())) return;
    if (typeof window !== "undefined" && "showOpenFilePicker" in window) {
      try {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [{
            description: 'XML Files',
            accept: { 'application/xml': ['.xml', '.saelabels', '.saetickets'] },
          }],
        });
        setFileHandle(handle);
        const file = await handle.getFile();
        const text = await file.text();
        const sanitized = sanitizeXmlInput(text);
        
        // Infer kind from content or extension
        let kind: DocKind = "sae";
        if (sanitized.includes("<saetickets") || file.name.endsWith(".saetickets")) kind = "saetickets";
        else if (sanitized.includes("<saelabels") || file.name.endsWith(".saelabels")) kind = "sae";
        else if (sanitized.includes("<Glabels-document")) kind = "glabels";
        
        setDocKind(kind);
        
        // Contextual updates
        const cleanName = file.name.replace(/\.(xml|saetickets|saelabels)$/i, "");
        if (kind === "saetickets") {
          setTicketXml(sanitized);
          setTicketDocName(cleanName);
          setTicketFileHandle(handle);
          // Try to recover ID from library if it exists
          try {
            const existing = await editorApi.getDocumentByName(cleanName);
            if (existing && existing.kind === 'saetickets') setTicketDocId(existing.id);
            else setTicketDocId("");
          } catch { setTicketDocId(""); }
        } else {
          setLabelXml(sanitized);
          setLabelDocName(cleanName);
          setLabelFileHandle(handle);
          // Try to recover ID from library if it exists
          try {
            const existing = await editorApi.getDocumentByName(cleanName);
            if (existing && existing.kind !== 'saetickets') setLabelDocId(existing.id);
            else setLabelDocId("");
          } catch { setLabelDocId(""); }
        }
        
        setSaveStatus("saved");
        setError("");
        setResult("");

        // Auto-sync with backend to get an ID and ensure persistence
        try {
          const res = await editorApi.saveDocument({
            name: cleanName,
            kind: kind,
            xml: sanitized
          });
          if (kind === 'saetickets') setTicketDocId(res.id);
          else setLabelDocId(res.id);
          void refreshDocuments();
        } catch (e) {
          console.error("Failed to sync opened local file to backend:", e);
        }
      } catch (e: any) {
        if (e.name === "AbortError") return;
        console.error("File Picker failed:", e);
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const exportSaeLabels = async () => {
    setLoading(true);
    try {
      let xmlToExport = xml;
      // If we are in SAE and want to export, we might want to offer conversion
      // For now, let's just make sure it descends or stays in kind.
      // But user asked for SAE/GLabels transformations.
      
      const targetKind = (newDocumentDraft.kind as any) === "sae" ? "glabels" : "sae";
      const confirmConversion = window.confirm(`Deseas convertir el documento a ${targetKind} antes de exportar?`);
      
      if (confirmConversion) {
        if (newDocumentDraft.kind === "sae") {
          const res = await labelsApi.convertToGlabels({ xml }) as any;
          xmlToExport = res.data || res;
        } else {
          const res = await labelsApi.convertFromGlabels({ xml }) as any;
          xmlToExport = res.data || res;
        }
      }

      const blob = new Blob([xmlToExport], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `export_${docName || "documento"}.xml`;
      a.click();
      URL.revokeObjectURL(url);
      setResult("Documento exportado exitosamente.");
      setShowResultModal(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al exportar.");
    } finally {
      setLoading(false);
    }
  };

  const exportToSaeSystem = async () => {
    setLoading(true);
    try {
      // Ensure we export in SAE format
      let saeXml = xml;
      if (newDocumentDraft.kind === "glabels") {
        const res = await labelsApi.convertFromGlabels({ xml }) as any;
        saeXml = res.data || res;
      }

      const response = await fetch(`${apiBaseUrl.replace(/\/+$/, "")}/api/editor/export/saesystem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xml: saeXml, fileName: docName }),
      });

      if (!response.ok) {
        const txt = await response.text();
        throw new Error(txt || `Error ${response.status}`);
      }

      const data = await response.json();
      setResult(`Exportado a SAE System con éxito!\nUbicación: ${data.path}`);
      setShowResultModal(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al exportar a SAE System.");
    } finally {
      setLoading(false);
    }
  };

  const applyExample = () => {
    setXml(action === "convert-from-glabels" ? sampleGlabelsXml : sampleSaeXml);
    setError("");
    setResult("");
    setPingStatus("");
  };

  const handleSwitchKind = (target: DocKind) => {
    if (docKind === target) return;
    setDocKind(target);
  };


  const createNewDocument = (kind: "sae" | "glabels") => {
    setXml(kind === "sae" ? sampleSaeXml : sampleGlabelsXml);
    setAction(kind === "sae" ? "parse" : "convert-from-glabels");
    setError("");
    setResult("");
    setPingStatus("");
  };

  const openNewDocumentTypeModal = async () => {
    if (!(await confirmDiscardChanges())) return;
    setShowNewTypeModal(true);
  };

  const selectNewDocumentType = async (kind: DocKind) => {
    if (!(await confirmDiscardChanges())) return;
    setNewDocumentDraft((prev) => ({ ...prev, kind }));
    setShowNewTypeModal(false);
    setShowNewConfigModal(true);
  };

  const applyPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = LABEL_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    if (preset.id === "custom") return;
    setNewDocumentDraft((prev) => ({
      ...prev,
      width: preset.width,
      height: preset.height,
      unit: preset.unit,
      brand: preset.brand,
      part: preset.part,
      size: preset.size,
      description: preset.description,
    }));
  };

  const createConfiguredDocument = async (draft: NewDocumentDraft, initialXml: string | null = null) => {
    try {
      setLoading(true);
      const xmlToSave = initialXml || buildNewDocumentXml(draft);
      
      // Save directly to backend
      const res = await editorApi.saveDocument({
        name: draft.name.trim() || "Nueva etiqueta",
        kind: draft.kind,
        xml: xmlToSave
      });

      setLabelDocId(res.id);
      setLabelDocName(res.name);
      setLabelXml(xmlToSave);
      setDocKind(draft.kind);
      
      setAction(draft.kind === "sae" ? "parse" : "convert-from-glabels");
      setError("");
      setResult("");
      setPingStatus("");
      setShowNewConfigModal(false);
      void refreshDocuments();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear documento en el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const createConfiguredTicket = async () => {
    if (!newTicketDraft.name.trim()) {
      setError("Nombre requerido para el tiquete.");
      return;
    }
    
    try {
      setLoading(true);
      const charWidth = newTicketDraft.width === 58 ? 32 : 42;
      
      let initialXml = "";
      if (pendingTemplateXml) {
        // Update width in template XML
        initialXml = pendingTemplateXml.replace(/<setup width="[^"]*"\/>/, `<setup width="${charWidth}"/>`);
      } else {
        initialXml = `<?xml version="1.0" encoding="utf-8"?>
<saetickets version="1.0">
  <setup width="${charWidth}"/>
  <commands>
    <text align="center" bold="true" size="large">${newTicketDraft.name.toUpperCase()}</text>
    <separator char="="/>
    <text align="center" size="small">Fecha: \${DATE}</text>
    <separator char="-"/>
    <each listVar="ITEMS" header="true">
      <column field="QTY" label="Cant" width="5" align="left"/>
      <column field="DESC" label="Articulo" width="auto" align="left"/>
      <column field="TOTAL" label="Total" width="10" align="right"/>
    </each>
    <separator char="="/>
    <text align="right" bold="true" size="large">TOTAL: \${TOTAL}</text>
    <feed lines="2"/>
    <cut/>
  </commands>
</saetickets>`;
      }
      
      // Save directly to backend
      const res = await editorApi.saveDocument({
        name: newTicketDraft.name.trim(),
        kind: 'saetickets',
        xml: initialXml
      });

      setTicketDocId(res.id);
      setTicketDocName(res.name);
      setTicketXml(initialXml);
      setDocKind("saetickets");
      
      setError("");
      setResult("");
      setPendingTemplateXml(null);
      setShowNewTicketConfigModal(false);
      void refreshDocuments();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear tiquete en el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const addHistoryItem = (item: HistoryItem) => {
    setHistory((prev) => [item, ...prev].slice(0, 20));
  };

  const saveSession = () => {
    if (typeof window === "undefined") return;
    const name = window.prompt("Nombre de la sesion");
    if (!name || !name.trim()) return;
    setSessions((prev) => [
      {
        id: crypto.randomUUID(),
        name: name.trim(),
        createdAt: new Date().toISOString(),
        apiBaseUrl,
        action,
        xml,
        timeoutMs,
      },
      ...prev,
    ].slice(0, 30));
  };

  const loadSession = () => {
    const selected = sessions.find((x) => x.id === selectedSessionId);
    if (!selected) return;
    setApiBaseUrl(selected.apiBaseUrl);
    setAction(selected.action);
    setXml(selected.xml);
    setTimeoutMs(selected.timeoutMs);
    setError("");
    setResult("");
    setPingStatus("");
  };

  const deleteSession = () => {
    if (!selectedSessionId) return;
    setSessions((prev) => prev.filter((x) => x.id !== selectedSessionId));
    setSelectedSessionId("");
  };

  const run = async () => {
    const validation = validateXmlInput(action, xml);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    const normalizedXml = validation.normalizedXml;
    setXml(normalizedXml);
    const startedAt = Date.now();
    setLoading(true);
    setError("");
    setResult("");
    setPingStatus("");

    try {
      if (action === "parse") {
        const parsed = await labelsApi.parse({ xml: normalizedXml });
        setResult(JSON.stringify(parsed, null, 2));
      } else if (action === "convert-to-glabels") {
        const converted = await labelsApi.convertToGlabels({ xml: normalizedXml });
        setResult(converted.data);
      } else {
        const converted = await labelsApi.convertFromGlabels({ xml: normalizedXml });
        setResult(converted.data);
      }
      addHistoryItem({
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        action,
        ok: true,
        elapsedMs: Date.now() - startedAt,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error desconocido";
      setError(message);
      addHistoryItem({
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        action,
        ok: false,
        elapsedMs: Date.now() - startedAt,
        errorMessage: message,
      });
    } finally {
      setLoading(false);
    }
  };

  const copyResult = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
    } catch {
      setError("No se pudo copiar al portapapeles.");
    }
  };

  const downloadResult = () => {
    if (!result || typeof window === "undefined") return;
    const mimeType = action === "parse" ? "application/json;charset=utf-8" : "application/xml;charset=utf-8";
    const blob = new Blob([result], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `resultado.${resultExtension}`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadInput = () => {
    if (!xml || typeof window === "undefined") return;
    const cleanXml = sanitizeXmlInput(xml);
    if (!cleanXml) {
      setError("No hay XML valido para descargar.");
      return;
    }

    const blob = new Blob([cleanXml], { type: "application/xml;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "entrada.xml";
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const importInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const sanitized = sanitizeXmlInput(text);
      
      // Infer kind
      let kind: DocKind = "sae";
      if (sanitized.includes("<saetickets") || file.name.endsWith(".saetickets")) kind = "saetickets";
      else if (sanitized.includes("<saelabels") || file.name.endsWith(".saelabels")) kind = "sae";
      else if (sanitized.includes("<Glabels-document")) kind = "glabels";
      
      setDocKind(kind);

      if (kind === "saetickets") {
        setTicketXml(sanitized);
        setTicketDocName(file.name.replace(/\.(xml|saetickets)$/i, ""));
        setTicketDocId("");
        setTicketFileHandle(null);
      } else {
        setLabelXml(sanitized);
        setLabelDocName(file.name.replace(/\.(xml|saelabels)$/i, ""));
        setLabelDocId("");
        setLabelFileHandle(null);
      }

      setError("");
      setResult("");
    } catch {
      setError("No se pudo leer el archivo.");
    } finally {
      event.target.value = "";
    }
  };

  const pingBackend = async (targetBaseUrl?: string): Promise<boolean> => {
    const base = (targetBaseUrl ?? apiBaseUrl).replace(/\/+$/, "");
    setPingStatus("Probando conexión...");
    try {
      const response = await fetch(`${base}/openapi/v1.json`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        setPingStatus(`✅ Conexión OK (HTTP ${response.status}) — ${base}`);
        return true;
      } else {
        setPingStatus(`⚠️ Backend responde con HTTP ${response.status}`);
        return false;
      }
    } catch (err: any) {
      if (err?.name === "TimeoutError") {
        setPingStatus(`❌ Timeout — el servidor no respondió en 5s`);
      } else {
        setPingStatus(`❌ Sin conexión: ${err?.message || "Failed to fetch"}`);
      }
      return false;
    }
  };

  const openApiConfigModal = () => {
    setApiBaseUrlDraft(apiBaseUrl);
    setShowApiConfigModal(true);
  };

  const saveApiConfig = () => {
    const next = apiBaseUrlDraft.trim();
    if (!next) {
      setError("API Base URL no puede estar vacio.");
      return;
    }
    setApiBaseUrl(next);
    setShowApiConfigModal(false);
  };

  return (
    <section className="panel visualMode" data-theme={darkMode ? "dark" : "light"}>
      <div className="studioWrapper">
        <TopBar
          saveDoc={saveDoc}
          saveAsDoc={saveAsDoc}
          loadDocument={loadDocument}
          openNewDocumentTypeModal={openNewDocumentTypeModal}
          openLocalFile={openLocalFile}
          openApiConfigModal={openApiConfigModal}
          setShowOpenDocModal={setShowOpenDocModal}
          setShowTemplatesGallery={setShowTemplatesGallery}
          setPropertiesModalOpen={setPropertiesModalOpen}
          setShowPrintersManagerModal={setShowPrintersManagerModal}
          setShowAboutModal={setShowAboutModal}
          setResult={setResult}
          setShowResultModal={setShowResultModal}
          documents={documents}
          refreshDocuments={refreshDocuments}
        />

        {/* ── Conmutador de Vistas (Tabs) ── */}
        <div className="tabBarContainer" style={{
          display: 'flex', alignItems: 'center', gap: '2px',
          padding: '0 8px', borderBottom: '1px solid var(--border,#e2e8f0)',
          background: 'var(--bg-tabs, #f8fafc)', flexShrink: 0, height: '36px'
        }}>
          {(['sae', 'saetickets', 'saedocument'] as const).map(k => (
              <button key={k} onClick={() => handleSwitchKind(k)}
              className={`designerTab ${docKind === k ? 'active' : ''}`}
              style={{
                padding: '0 24px', fontSize: '0.82rem', height: '100%',
                border: 'none', 
                borderBottom: docKind === k ? '2.5px solid var(--accent)' : '2px solid transparent',
                cursor: 'pointer', fontWeight: docKind === k ? 800 : 500,
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                background: docKind === k ? 'transparent' : 'transparent',
                color: docKind === k ? 'var(--accent)' : 'var(--muted)',
                display: 'flex', alignItems: 'center', gap: '0.65rem',
                position: 'relative',
                textTransform: 'none',
                letterSpacing: '0.01em'
              }}>
              {k === 'saetickets' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="6" y1="8" x2="6" y2="8"/><line x1="6" y1="12" x2="6" y2="12"/><line x1="6" y1="16" x2="6" y2="16"/></svg>
              ) : k === 'saedocument' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
              )}
              {k === 'saetickets' ? 'Diseñador de Tiquetes' : k === 'saedocument' ? 'Diseñador de Documentos' : 'Diseñador de Etiquetas'}
            </button>
          ))}
        </div>

        <div className="designerHost" style={{ background: '#fff' }}>
          {docKind === 'saetickets' ? (
            <TicketDesigner
              initialXml={xml}
              onUpdate={(newXml) => {
                setXml(newXml);
                setError("");
              }}
              apiBaseUrl={apiBaseUrl}
            />
          ) : docKind === 'saedocument' ? (
            <DocumentDesigner />
          ) : (
            <VisualCanvasEditor
              xml={xml}
              apiBaseUrl={apiBaseUrl}
              timeoutMs={timeoutMs}
              docId={docId}
              docName={docName}
              metadata={{
                version: metaVersion,
                brand: metaBrand,
                description: metaDescription,
                part: metaPart,
                size: metaSize,
              }}
              onXmlChange={(nextXml) => {
                setXml(nextXml);
                setError("");
              }}
              onDocNameChange={setDocName}
              onMetadataChange={(m: any) => {
                if (m.version !== undefined) setMetaVersion(m.version);
                if (m.brand !== undefined) setMetaBrand(m.brand);
                if (m.description !== undefined) setMetaDescription(m.description);
                if (m.part !== undefined) setMetaPart(m.part);
                if (m.size !== undefined) setMetaSize(m.size);
              }}
            />
          )}
        </div>

        <footer className="studioFooter">
          <div className="footerStatus">
            <span className={`dot ${saveStatus}`} /> 
            <span style={{ fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }} title={saveStatus === "saved" && !fileHandle ? "Usa 'Guardar Como' para crear una copia física en tu computadora." : ""}>
              {saveStatus === "saved" && (fileHandle ? "Guardado (Local y en Nube)" : "Guardado en Memoria (Borrador)")}
              {saveStatus === "saving" && "Guardando..."}
              {saveStatus === "modified" && "Cambios pendientes"}
              {saveStatus === "error" && "Error al guardar"}
            </span>
          </div>

          <div className="metaStats">
            <div className="metaItem">
              <span className="metaLabel">Documento:</span>
              <span className="metaValue">{docName || "Sin título"}</span>
            </div>
            <div className="metaDivider" />
            <div className="metaItem">
              <span className="metaLabel">Tamaño:</span>
              <span className="metaValue">{metaSize || "custom"}</span>
            </div>
            <div className="metaDivider" />
            <div className="metaItem">
              <span className="metaValue" style={{ opacity: 0.8 }}>SAE Studio v1.0.0</span>
            </div>
          </div>
        </footer>
      </div>

      {showTemplatesGallery && (
        <TemplatesGallery
          templates={templates} LABEL_PRESETS={LABEL_PRESETS}
          newDocumentDraft={newDocumentDraft}
          onClose={() => setShowTemplatesGallery(false)}
          onRefresh={refreshTemplates}
          onSelectTicketTemplate={(t) => { setPendingTemplateXml(t.xml); setNewTicketDraft(p => ({ ...p, name: t.name })); setShowTemplatesGallery(false); setShowNewTicketConfigModal(true); }}
          onSelectLabelTemplate={(t) => { createConfiguredDocument(newDocumentDraft, t.xml); setShowTemplatesGallery(false); }}
          onSelectPreset={(p) => { setNewDocumentDraft({ ...newDocumentDraft, ...p, kind: "sae" } as NewDocumentDraft); setSelectedPresetId(p.id); setShowTemplatesGallery(false); setShowNewConfigModal(true); }}
        />
      )}
      {showNewTypeModal && (
        <NewDocumentTypeModal
          onClose={() => setShowNewTypeModal(false)}
          onSelectLabel={() => { setNewDocumentDraft({ ...newDocumentDraft, ...LABEL_PRESETS[0], kind: "sae" }); setShowNewTypeModal(false); setShowNewConfigModal(true); }}
          onSelectTicket={() => setShowNewTicketConfigModal(true)}
        />
      )}
      {showNewConfigModal && (
        <NewConfigModal
          newDocumentDraft={newDocumentDraft} setNewDocumentDraft={setNewDocumentDraft as any}
          selectedPresetId={selectedPresetId} setSelectedPresetId={setSelectedPresetId}
          LABEL_PRESETS={LABEL_PRESETS} applyPreset={applyPreset}
          onClose={() => setShowNewConfigModal(false)}
          onCreate={(draft) => createConfiguredDocument(draft as NewDocumentDraft)}
        />
      )}

      {showNewTicketConfigModal && (
        <NewTicketConfigModal
          newTicketDraft={newTicketDraft} setNewTicketDraft={setNewTicketDraft}
          onClose={() => setShowNewTicketConfigModal(false)}
          onCreate={() => createConfiguredTicket()}
        />
      )}
      {showApiConfigModal && (
        <ApiConfigModal
          apiBaseUrlDraft={apiBaseUrlDraft} setApiBaseUrlDraft={setApiBaseUrlDraft}
          pingBackend={pingBackend} pingStatus={pingStatus} setPingStatus={setPingStatus}
          setApiBaseUrl={setApiBaseUrl} onClose={() => setShowApiConfigModal(false)}
        />
      )}
      {showOpenDocModal && (
        <OpenDocumentModal
          openDocSearch={openDocSearch} setOpenDocSearch={setOpenDocSearch}
          documents={documents}
          onClose={() => setShowOpenDocModal(false)}
          onSelect={(id) => { loadDocument(id); setShowOpenDocModal(false); }}
          onDelete={(id) => deleteDocument(id)}
        />
      )}
      {showResultModal && (
        <ResultModal result={result} onClose={() => setShowResultModal(false)} onCopy={copyResult} />
      )}

      {propertiesModalOpen && (
        <PropertiesModal
          docName={docName} setDocName={setDocName} docKind={docKind}
          metaVersion={metaVersion} setMetaVersion={setMetaVersion}
          metaBrand={metaBrand} setMetaBrand={setMetaBrand}
          metaPart={metaPart} setMetaPart={setMetaPart}
          metaSize={metaSize} setMetaSize={setMetaSize}
          metaDescription={metaDescription} setMetaDescription={setMetaDescription}
          onClose={() => setPropertiesModalOpen(false)}
        />
      )}


      {showAboutModal && <AboutModal onClose={() => setShowAboutModal(false)} />}

      {showPrintersManagerModal && (
        <Portal>
          <LogicalPrintersManagerModal apiBaseUrl={apiBaseUrl} onClose={() => setShowPrintersManagerModal(false)} />
        </Portal>
      )}
    </section>
  );
}
