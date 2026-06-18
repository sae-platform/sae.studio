import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { SaeDocumentModel } from "@/modules/document-engine/models/document";
import type { DocumentTheme } from "@/modules/document-engine/models/theme";
import { THEME_PRESETS } from "@/modules/document-engine/models/theme-presets";

export type DocKind = "sae" | "glabels" | "saetickets" | "saedocument";

export interface WorkspaceState {
  apiBaseUrl: string;
  timeoutMs: number;
  docKind: DocKind;
  labelXml: string;
  ticketXml: string;
  labelDocId: string;
  ticketDocId: string;
  labelDocName: string;
  ticketDocName: string;
  documentXml: string;
  documentDocId: string;
  documentDocName: string;
  /** Parsed in-memory model — kept in sync with documentXml */
  documentModel: SaeDocumentModel | null;
  /** Currently selected element id in the designer */
  selectedElementId: string | null;
  /** Active page index in the designer */
  selectedPageIndex: number;
  /** Canvas zoom level (0.4 – 2.0) */
  canvasZoom: number;
  /** JSON string of sample data for preview mode */
  documentSampleData: string;
  saveStatus: "saved" | "saving" | "modified" | "error";
  autoSaveEnabled: boolean;
  darkMode: boolean;
  metaVersion: string;
  metaBrand: string;
  metaDescription: string;
  metaPart: string;
  metaSize: string;
  canUndo: boolean;
  canRedo: boolean;
  themeLibrary: DocumentTheme[];
}

interface WorkspaceActions {
  setApiBaseUrl: (url: string) => void;
  setTimeoutMs: (ms: number) => void;
  setDocKind: (kind: DocKind) => void;
  setLabelXml: (xml: string) => void;
  setTicketXml: (xml: string) => void;
  setLabelDocId: (id: string) => void;
  setTicketDocId: (id: string) => void;
  setLabelDocName: (name: string) => void;
  setTicketDocName: (name: string) => void;
  setDocumentXml: (xml: string) => void;
  setDocumentDocId: (id: string) => void;
  setDocumentDocName: (name: string) => void;
  setDocumentModel: (model: SaeDocumentModel | null) => void;
  setSelectedElementId: (id: string | null) => void;
  setSelectedPageIndex: (index: number) => void;
  setCanvasZoom: (zoom: number) => void;
  setDocumentSampleData: (json: string) => void;
  setSaveStatus: (status: "saved" | "saving" | "modified" | "error") => void;
  setAutoSaveEnabled: (enabled: boolean) => void;
  setDarkMode: (dark: boolean) => void;
  setMetaVersion: (v: string) => void;
  setMetaBrand: (v: string) => void;
  setMetaDescription: (v: string) => void;
  setMetaPart: (v: string) => void;
  setMetaSize: (v: string) => void;
  setCanUndo: (v: boolean) => void;
  setCanRedo: (v: boolean) => void;
  setMetadata: (meta: { version: string; brand: string; description: string; part: string; size: string }) => void;
  resetDoc: () => void;
  setThemeLibrary: (themes: DocumentTheme[]) => void;
  addTheme: (theme: DocumentTheme) => void;
  removeTheme: (id: string) => void;
}

type WorkspaceStore = WorkspaceState & WorkspaceActions;

const DEFAULT_LABEL_XML = `<saelabels version="1.0"><template brand="SAE" description="Demo" part="P-1" size="custom"><label_rectangle width_pt="144" height_pt="72" round_pt="0" x_waste_pt="0" y_waste_pt="0" /><layout dx_pt="0" dy_pt="0" nx="1" ny="1" x0_pt="0" y0_pt="0" /></template><objects /><variables /></saelabels>`;

const DEFAULT_TICKET_XML = `<?xml version="1.0" encoding="utf-8"?><saetickets version="1.0"><setup width="42"/><commands><text align="center" bold="false" size="large">**MI EMPRESA**</text><separator char="-"/><text align="left">Fecha: \${!date}</text><separator char="-"/><each listVar="ITEMS" header="true"><column field="DESC" label="Descripción" width="auto" align="left"/><column field="QTY" label="Cant" width="6" align="right"/><column field="TOTAL" label="Total" width="10" align="right"/></each><separator char="-"/><total label="TOTAL" value="\${TOTAL}" bold="true"/><feed lines="3"/><cut/></commands></saetickets>`;

const DEFAULT_DOCUMENT_XML = `<saedocument version="1.0"><metadata/><datasources/><assets/><page width="210" height="297" unit="mm"><header><image source="logo.png" x="10" y="10" width="28" height="28"/><text x="45" y="14" width="120" height="10" font="Arial" size="18" bold="true">Factura Electrónica</text><text x="45" y="26" width="90" height="6" font="Arial" size="9">Consecutivo: \${Factura.Consecutivo}</text><line x1="10" y1="42" x2="200" y2="42"/></header><body><text x="10" y="52" width="90" height="6" font="Arial" size="10" bold="true">Cliente: \${Cliente.Nombre}</text><table source="Factura.Detalles"><column field="Cantidad" header="Cant" width="15"/><column field="Descripcion" header="Descripción" width="90"/><column field="Precio" header="Precio" width="30"/><column field="Total" header="Total" width="30"/></table><text x="140" y="205" width="55" height="6" font="Arial" size="10" bold="true" align="right">TOTAL: \${Factura.Total}</text></body><footer><qr value="\${Factura.Clave}" x="10" y="250" size="28"/><text x="45" y="255" width="145" height="6" font="Arial" size="8">Clave: \${Factura.Clave}</text></footer></page></saedocument>`;

function loadFromStorage(key: string, fallback: unknown): unknown {
  try {
    const raw = localStorage.getItem(`saestudio.app.${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function getInitialDarkMode(): boolean {
  return false;
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  devtools(
    (set) => ({
      apiBaseUrl: (loadFromStorage("apiBaseUrl", import.meta.env.PUBLIC_SAELABEL_API_BASE_URL ?? "http://localhost:5117")) as string,
      timeoutMs: (loadFromStorage("timeoutMs", 30000)) as number,
      docKind: (loadFromStorage("docKind", "sae")) as DocKind,
      labelXml: (loadFromStorage("xml", DEFAULT_LABEL_XML)) as string,
      ticketXml: (loadFromStorage("ticketXml", DEFAULT_TICKET_XML)) as string,
      documentXml: (loadFromStorage("documentXml", DEFAULT_DOCUMENT_XML)) as string,
      documentModel: null,
      selectedElementId: null,
      selectedPageIndex: 0,
      canvasZoom: 1.0,
      documentSampleData: "{}",
      labelDocId: "",
      ticketDocId: "",
      documentDocId: "",
      labelDocName: "Sin título",
      ticketDocName: "Nuevo Tiquete",
      documentDocName: "Nuevo Documento",
      saveStatus: "saved" as const,
      autoSaveEnabled: (loadFromStorage("autoSaveEnabled", true)) as boolean,
      darkMode: getInitialDarkMode(),
      metaVersion: "1.0",
      metaBrand: "SAE",
      metaDescription: "Etiqueta",
      metaPart: "P-1",
      metaSize: "custom",
      canUndo: false,
      canRedo: false,
      themeLibrary: (loadFromStorage("themeLibrary", THEME_PRESETS)) as DocumentTheme[],

      setApiBaseUrl: (url) => {
        localStorage.setItem("saestudio.app.apiBaseUrl", JSON.stringify(url));
        set({ apiBaseUrl: url });
      },
      setTimeoutMs: (ms) => {
        localStorage.setItem("saestudio.app.timeoutMs", JSON.stringify(ms));
        set({ timeoutMs: ms });
      },
      setDocKind: (docKind) => {
        localStorage.setItem("saestudio.app.docKind", JSON.stringify(docKind));
        set({ docKind });
      },
      setLabelXml: (xml) => {
        localStorage.setItem("saestudio.app.xml", JSON.stringify(xml));
        set({ labelXml: xml });
      },
      setTicketXml: (ticketXml) => {
        localStorage.setItem("saestudio.app.ticketXml", JSON.stringify(ticketXml));
        set({ ticketXml });
      },
      setLabelDocId: (labelDocId) => set({ labelDocId }),
      setTicketDocId: (ticketDocId) => set({ ticketDocId }),
      setLabelDocName: (labelDocName) => set({ labelDocName }),
      setTicketDocName: (ticketDocName) => set({ ticketDocName }),
      setDocumentXml: (documentXml) => {
        localStorage.setItem("saestudio.app.documentXml", JSON.stringify(documentXml));
        set({ documentXml });
      },
      setDocumentDocId: (documentDocId) => set({ documentDocId }),
      setDocumentDocName: (documentDocName) => set({ documentDocName }),
      setDocumentModel: (documentModel) => set({ documentModel }),
      setSelectedElementId: (selectedElementId) => set({ selectedElementId }),
      setSelectedPageIndex: (selectedPageIndex) => set({ selectedPageIndex }),
      setCanvasZoom: (canvasZoom) => set({ canvasZoom }),
      setDocumentSampleData: (documentSampleData) => set({ documentSampleData }),
      setSaveStatus: (saveStatus) => set({ saveStatus }),
      setAutoSaveEnabled: (autoSaveEnabled) => {
        localStorage.setItem("saestudio.app.autoSaveEnabled", JSON.stringify(autoSaveEnabled));
        set({ autoSaveEnabled });
      },
      setDarkMode: (darkMode) => set({ darkMode }),
      setMetaVersion: (metaVersion) => set({ metaVersion }),
      setMetaBrand: (metaBrand) => set({ metaBrand }),
      setMetaDescription: (metaDescription) => set({ metaDescription }),
      setMetaPart: (metaPart) => set({ metaPart }),
      setMetaSize: (metaSize) => set({ metaSize }),
      setCanUndo: (canUndo) => set({ canUndo }),
      setCanRedo: (canRedo) => set({ canRedo }),
      setMetadata: (meta) => set({
        metaVersion: meta.version,
        metaBrand: meta.brand,
        metaDescription: meta.description,
        metaPart: meta.part,
        metaSize: meta.size,
      }),
      resetDoc: () => set({
        labelXml: DEFAULT_LABEL_XML,
        labelDocId: "",
        labelDocName: "Sin título",
        saveStatus: "saved",
      }),

      setThemeLibrary: (themeLibrary) => {
        localStorage.setItem("saestudio.app.themeLibrary", JSON.stringify(themeLibrary));
        set({ themeLibrary });
      },
      addTheme: (theme) => set((s) => {
        const next = [...s.themeLibrary, theme];
        localStorage.setItem("saestudio.app.themeLibrary", JSON.stringify(next));
        return { themeLibrary: next };
      }),
      removeTheme: (id) => set((s) => {
        const next = s.themeLibrary.filter((t) => t.id !== id);
        localStorage.setItem("saestudio.app.themeLibrary", JSON.stringify(next));
        return { themeLibrary: next };
      }),
    }),
    { name: "workspace-store" },
  ),
);
