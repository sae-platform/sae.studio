import { useState, useCallback, useRef } from "react";
import { Eye, Code, FileText, Undo, Redo, ZoomIn, ZoomOut, Layers, Printer, Download, LayoutGrid, Database, GripHorizontal } from "lucide-react";

import type { SaeDocumentModel } from "@/modules/document-engine/models/document";
import {
  createDocument, updateElement, removeElement,
  addElementToBand, updateBandHeight,
} from "@/modules/document-engine/models/document";
import type { DocumentElement, DocumentElementType } from "@/modules/document-engine/models/elements";
import type { PageDef } from "@/modules/document-engine/models/page";
import { createPage } from "@/modules/document-engine/models/page";
import type { DocumentTheme } from "@/modules/document-engine/models/theme";
import type { BandDef } from "@/modules/document-engine/models/band";
import { parseXml, serializeXml } from "@/modules/document-engine/rendering/xml-serializer";
import { runDocument, createPreviewContext, type RenderedDocument } from "@/modules/document-engine/runtime/document-runner";
import { useUndoStack } from "@/modules/document-engine/history/undo-stack";
import { useWorkspaceStore } from "@/modules/document-library/stores/workspace.store";
import { runtimeApi } from "@/lib/api/client";

import { DocumentPalette } from "./components/DocumentPalette";
import { DocumentProperties } from "./components/DocumentProperties";
import { BandCanvas } from "./components/BandCanvas";
import { MultiPageNav } from "./components/MultiPageNav";
import { LayersPanel } from "./components/LayersPanel";
import { DataSourcePanel } from "./components/DataSourcePanel";

import "./DocumentDesigner.css";

// ── Helpers ─────────────────────────────────────────────────

function makeDefaultElement(type: DocumentElementType, x: number, y: number): DocumentElement {
  const base = { id: crypto.randomUUID(), x, y };
  switch (type) {
    case "text":      return { ...base, type, content: "Nuevo texto", width: 80, height: 8, font: "Arial", size: 10 };
    case "image":     return { ...base, type, source: "logo.png", width: 30, height: 30 };
    case "line":      return { ...base, type, x1: x, y1: y, x2: x + 100, y2: y, width: 100, height: 2 };
    case "rectangle": return { ...base, type, width: 50, height: 20, borderColor: "#334155" };
    case "ellipse":   return { ...base, type, width: 30, height: 30, borderColor: "#334155" };
    case "barcode":   return { ...base, type, value: "${Producto.Codigo}", width: 55, height: 18 };
    case "qr":        return { ...base, type, value: "${Factura.Clave}", size: 30, width: 30, height: 30 };
    case "table":     return { ...base, type, source: "ITEMS", width: 180, height: 40, showHeader: true, columns: [
      { field: "Descripcion", header: "Descripción" },
      { field: "Cantidad",    header: "Cant",  width: "15" },
      { field: "Total",       header: "Total", width: "25" },
    ]};
    case "total":     return { ...base, type, field: "Factura.Total",    label: "TOTAL",    width: 80, height: 8, bold: true };
    case "subtotal":  return { ...base, type, field: "Factura.Subtotal", label: "SUBTOTAL", width: 80, height: 8 };
    case "variable":  return { ...base, type, variableName: "MiVariable", width: 60, height: 8 };
    case "panel":     return { ...base, type, elements: [], width: 80, height: 40, borderColor: "#94a3b8" };
    case "group":     return { ...base, type, elements: [], width: 80, height: 30 };
    case "if":        return { ...base, type, condition: "Variable == 'valor'", thenElements: [], width: 80, height: 20 };
    case "repeat":    return { ...base, type, source: "ITEMS", elements: [], width: 80, height: 30 };
    case "pagebreak":    return { ...base, type, width: 180, height: 4 };
    case "sectionbreak": return { ...base, type, width: 180, height: 4 };
    default:          return { ...base, type: "text", content: type, width: 60, height: 8 } as any;
  }
}

// ── Constants ────────────────────────────────────────────────

const ZOOM_LEVELS = [0.4, 0.5, 0.6, 0.75, 1.0, 1.25, 1.5, 2.0];
const PX_PER_MM = 3.7795; // 96dpi
const LEFT_PANEL_TABS = ["components", "pages", "layers", "data"] as const;
type LeftTab = typeof LEFT_PANEL_TABS[number];
type ViewMode = "design" | "preview" | "xml";

// ── Main Component ───────────────────────────────────────────

export function DocumentDesigner() {
  const { documentXml, setDocumentXml, documentDocName, themeLibrary, addTheme, removeTheme } = useWorkspaceStore();

  // Parse initial model
  const initialModel: SaeDocumentModel = parseXml(documentXml) ?? createDocument("A4");

  const { state: doc, set: setDoc, update: updateDoc, undo, redo, canUndo: hasUndo, canRedo: hasRedo } = useUndoStack(initialModel);

  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [pageIndex, setPageIndex]       = useState(0);
  const [activeLayerId, setActiveLayer] = useState("default");
  const [zoom, setZoom]                 = useState(1.0);
  const [viewMode, setViewMode]         = useState<ViewMode>("design");
  const [leftTab, setLeftTab]           = useState<LeftTab>("components");
  const [xmlText, setXmlText]           = useState(documentXml);
  const [sampleJson, setSampleJson]     = useState(`{
  "Cliente.Nombre": "Alejandro Miranda",
  "Cliente.Cedula": "1-2345-6789",
  "Factura.Numero": "00100001010000000123",
  "Factura.Total": "125,000",
  "Factura.Subtotal": "110,000",
  "Empresa.Nombre": "SAE Studio"
}`);
  const [previewDoc, setPreviewDoc]     = useState<RenderedDocument | null>(null);
  const [xmlError, setXmlError]         = useState<string | null>(null);
  const [leftPanelWidth, setLeftPanelWidth] = useState(270);

  const handleLeftResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = leftPanelWidth;
    const onMove = (me: MouseEvent) => {
      setLeftPanelWidth(Math.max(200, Math.min(600, startWidth + (me.clientX - startX))));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [leftPanelWidth]);

  const scale = PX_PER_MM * zoom;
  const page: PageDef | undefined = doc.pages[pageIndex];

  // ── Sync to store whenever doc changes ───────────────────
  const syncDoc = useCallback((next: SaeDocumentModel) => {
    setDoc(next);
    setDocumentXml(serializeXml(next));
  }, [setDoc, setDocumentXml]);

  // ── Selected element lookup ──────────────────────────────
  const selectedElement = selectedId
    ? ((): DocumentElement | null => {
        if (!page) return null;
        for (const band of [page.header, page.body, page.footer]) {
          if (!band) continue;
          const found = band.elements.find((e) => e.id === selectedId);
          if (found) return found;
        }
        return null;
      })()
    : null;

  // ── Element drop from palette ────────────────────────────
  const handleDrop = useCallback((
    band: "header" | "body" | "footer",
    type: DocumentElementType,
    x: number,
    y: number,
  ) => {
    const el = makeDefaultElement(type, Math.round(x * 2) / 2, Math.round(y * 2) / 2);
    syncDoc(addElementToBand(doc, pageIndex, band, el));
    setSelectedId(el.id);
  }, [doc, pageIndex, syncDoc]);


  const handleMove = useCallback((id: string, dx: number, dy: number) => {
    const el = findInPage(doc.pages[pageIndex], id);
    if (!el) return;
    const patch = el.type === "line"
      ? { x1: ((el as any).x1 ?? 0) + dx, y1: ((el as any).y1 ?? 0) + dy,
          x2: ((el as any).x2 ?? 0) + dx, y2: ((el as any).y2 ?? 0) + dy,
          x: (el.x ?? 0) + dx, y: (el.y ?? 0) + dy }
      : { x: Math.max(0, (el.x ?? 0) + dx), y: Math.max(0, (el.y ?? 0) + dy) };
    syncDoc(updateElement(doc, id, patch as any));
  }, [doc, pageIndex, syncDoc]);

  // ── Element resize ───────────────────────────────────────
  const handleResize = useCallback((
    id: string, dw: number, dh: number, dx: number, dy: number,
  ) => {
    const el = findInPage(doc.pages[pageIndex], id);
    if (!el) return;
    const patch: Partial<DocumentElement> = {
      x: Math.round(((el.x ?? 0) + dx) * 10) / 10,
      y: Math.round(((el.y ?? 0) + dy) * 10) / 10,
      width: Math.max(4, Math.round(((el.width ?? 60) + dw) * 10) / 10),
      height: Math.max(2, Math.round(((el.height ?? 10) + dh) * 10) / 10),
    };
    syncDoc(updateElement(doc, id, patch));
  }, [doc, pageIndex, syncDoc]);

  // ── Band resize ──────────────────────────────────────────
  const handleBandResize = useCallback((band: "header" | "body" | "footer", deltaMm: number) => {
    updateDoc((prev) => {
      const prevPage = prev.pages[pageIndex];
      const ph = prevPage.height;
      const hh = prevPage?.header?.height ?? 40;
      const bh = prevPage?.body?.height ?? 200;
      const fh = prevPage?.footer?.height ?? 35;
      const rawHeight = (prevPage?.[band]?.height ?? 40) + deltaMm;

      let nextHeader = hh;
      let nextBody = bh;
      let nextFooter = fh;

      if (band === "header") {
        nextHeader = Math.max(10, Math.min(rawHeight, ph - Math.max(60, bh) - 10));
        nextBody = Math.max(60, Math.min(bh - (nextHeader - hh), ph - nextHeader - 10));
      } else if (band === "body") {
        nextBody = Math.max(60, Math.min(rawHeight, ph - hh - 10));
        nextFooter = Math.max(10, Math.min(fh - (nextBody - bh), ph - hh - nextBody));
      } else {
        nextFooter = Math.max(10, Math.min(rawHeight, ph - hh - Math.max(60, bh)));
      }

      const bodyDelta = nextBody - bh;
      let next = updateBandHeight(prev, pageIndex, "header", nextHeader);
      next = updateBandHeight(next, pageIndex, "body", nextBody);
      next = updateBandHeight(next, pageIndex, "footer", nextFooter);

      // Shift bottom-anchored body elements when body height changes
      if (bodyDelta !== 0 && next.pages[pageIndex]?.body) {
        const bodyAfter = next.pages[pageIndex].body!;
        next = {
          ...next,
          pages: next.pages.map((p, i) =>
            i === pageIndex ? {
              ...p,
              body: {
                ...bodyAfter,
                elements: bodyAfter.elements.map((el) => {
                  if ((el as any).anchor?.includes?.("bottom")) {
                    return { ...el, y: (el.y ?? 0) + bodyDelta } as DocumentElement;
                  }
                  return el;
                }),
              },
            } : p
          ),
        };
      }

      setDocumentXml(serializeXml(next));
      return next;
    });
  }, [pageIndex, updateDoc, setDocumentXml]);

  // ── Element property change ──────────────────────────────
  const handleElementChange = useCallback((patch: Partial<DocumentElement>) => {
    if (!selectedId) return;
    syncDoc(updateElement(doc, selectedId, patch));
  }, [doc, selectedId, syncDoc]);

  // ── Page property change ─────────────────────────────────
  const handlePageChange = useCallback((patch: Partial<PageDef>) => {
    syncDoc({
      ...doc,
      pages: doc.pages.map((p, i) => {
        if (i !== pageIndex) return p;
        let next = { ...p, ...patch };

        if (patch.orientation && patch.orientation !== p.orientation) {
          const [w, h] = [next.width, next.height];
          next.width = h;
          next.height = w;
        }

        const newH = next.height;
        const oldH = p.height;
        if (oldH > 0 && newH > 0 && Math.abs(newH - oldH) > 0.01) {
          const s = newH / oldH;
          if (next.header) next.header = { ...next.header, height: Math.max(10, Math.round((next.header.height ?? 40) * s)) };
          if (next.body)   next.body   = { ...next.body,   height: Math.max(60, Math.round((next.body.height ?? 200) * s)) };
          if (next.footer) next.footer = { ...next.footer, height: Math.max(10, Math.round((next.footer.height ?? 35) * s)) };
        }

        return next;
      }),
    });
  }, [doc, pageIndex, syncDoc]);

  // ── Delete selected element ──────────────────────────────
  const handleDelete = useCallback(() => {
    if (!selectedId) return;
    syncDoc(removeElement(doc, selectedId));
    setSelectedId(null);
  }, [doc, selectedId, syncDoc]);

  const handleApplyTheme = useCallback((theme: DocumentTheme | null) => {
    syncDoc({ ...doc, embeddedTheme: theme ?? undefined });
  }, [doc, syncDoc]);

  const handleSaveTheme = useCallback((theme: DocumentTheme) => {
    addTheme(theme);
  }, [addTheme]);

  const handleRemoveTheme = useCallback((id: string) => {
    removeTheme(id);
  }, [removeTheme]);

  // ── Page management ──────────────────────────────────────
  const handleAddPage = useCallback(() => {
    const next = { ...doc, pages: [...doc.pages, createPage("A4")] };
    syncDoc(next);
    setPageIndex(next.pages.length - 1);
  }, [doc, syncDoc]);

  const handleDuplicatePage = useCallback((i: number) => {
    const clone = { ...doc.pages[i], id: crypto.randomUUID() };
    const pages = [...doc.pages];
    pages.splice(i + 1, 0, clone);
    syncDoc({ ...doc, pages });
    setPageIndex(i + 1);
  }, [doc, syncDoc]);

  const handleDeletePage = useCallback((i: number) => {
    if (doc.pages.length <= 1) return;
    const pages = doc.pages.filter((_, j) => j !== i);
    syncDoc({ ...doc, pages });
    setPageIndex(Math.min(i, pages.length - 1));
  }, [doc, syncDoc]);

  const handleMovePage = useCallback((from: number, to: number) => {
    const pages = [...doc.pages];
    const [p] = pages.splice(from, 1);
    pages.splice(to, 0, p);
    syncDoc({ ...doc, pages });
    setPageIndex(to);
  }, [doc, syncDoc]);

  // ── Layer management ─────────────────────────────────────
  const handleLayersChange = useCallback((layers: PageDef["layers"]) => {
    if (!page) return;
    syncDoc({ ...doc, pages: doc.pages.map((p, i) => i === pageIndex ? { ...p, layers: layers as any } : p) });
  }, [doc, page, pageIndex, syncDoc]);

  // ── Preview mode ─────────────────────────────────────────
  const handlePreview = useCallback(() => {
    const ctx = createPreviewContext(doc, sampleJson);
    setPreviewDoc(runDocument(doc, ctx));
    setViewMode("preview");
  }, [doc, sampleJson]);

  // ── XML edit mode ────────────────────────────────────────
  const handleXmlApply = useCallback(() => {
    const parsed = parseXml(xmlText);
    if (!parsed) { setXmlError("XML inválido"); return; }
    setXmlError(null);
    syncDoc(parsed);
    setViewMode("design");
  }, [xmlText, syncDoc]);

  const handleViewMode = useCallback((mode: ViewMode) => {
    if (mode === "xml") setXmlText(serializeXml(doc));
    if (mode === "preview") handlePreview();
    else setViewMode(mode);
  }, [doc, handlePreview]);

  // ── Export / Print ────────────────────────────────────────
  const handleExportPdf = useCallback(async () => {
    try {
      const xml = serializeXml(doc);
      const result = await runtimeApi.exportPdf(documentDocName || "documento", { xml });
      if (result?.pdfBase64) {
        const byteChars = atob(result.pdfBase64);
        const bytes = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
        const blob = new Blob([bytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      } else {
        alert(result?.error?.message ?? "Error al exportar PDF");
      }
    } catch (e: any) { alert(e?.message ?? "Error de conexión con SAE.STUDIO"); }
  }, [doc]);

  const handleExportEscPos = useCallback(async () => {
    try {
      const xml = serializeXml(doc);
      const result = await runtimeApi.exportEscPos(doc.metadata?.title || "documento", { xml });
      if (result?.base64) {
        const byteChars = atob(result.base64);
        const bytes = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
        const blob = new Blob([bytes], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `${doc.metadata?.title || "documento"}.bin`; a.click();
      } else {
        alert(result?.error?.message ?? "Error al exportar ESC/POS");
      }
    } catch (e: any) { alert(e?.message ?? "Error de conexión con SAE.STUDIO"); }
  }, [doc]);

  const handlePrint = useCallback(async () => {
    try {
      const xml = serializeXml(doc);
      const result = await runtimeApi.exportPdf(documentDocName || "documento", { xml });
      if (result?.pdfBase64) {
        const byteChars = atob(result.pdfBase64);
        const bytes = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
        const blob = new Blob([bytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      }
    } catch (e: any) { alert(e?.message ?? "Error de conexión con SAE.STUDIO"); }
  }, [doc]);

  // ── Zoom helpers ─────────────────────────────────────────
  const zoomIn  = () => setZoom((z) => Math.min(2.0, ZOOM_LEVELS[ZOOM_LEVELS.indexOf(z) + 1] ?? 2.0));
  const zoomOut = () => setZoom((z) => Math.max(0.4, ZOOM_LEVELS[ZOOM_LEVELS.indexOf(z) - 1] ?? 0.4));

  // ── Keyboard shortcuts ───────────────────────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
    if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
    if (e.key === "Delete" || e.key === "Backspace") {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
      handleDelete();
    }
  }, [undo, redo, handleDelete]);

  if (!page) return null;

  return (
    <section className="docDesigner" onKeyDown={handleKeyDown} tabIndex={0} style={{ gridTemplateColumns: `${leftPanelWidth}px minmax(0, 1fr) 292px` }}>

      {/* ── Left panel ────────────────────────── */}
      <div className="docLeftPanel">
        <div className="docLeftTabs">
          <LeftTabBtn id="components" label="Elementos" active={leftTab} setActive={setLeftTab} icon={<LayoutGrid size={16}/>}/>
          <LeftTabBtn id="pages"      label="Páginas"   active={leftTab} setActive={setLeftTab} icon={<FileText size={16}/>}/>
          <LeftTabBtn id="layers"     label="Capas"     active={leftTab} setActive={setLeftTab} icon={<Layers size={16}/>} />
          <LeftTabBtn id="data"       label="Datos"     active={leftTab} setActive={setLeftTab} icon={<Database size={16}/>}/>
        </div>

        <div className="docLeftContent">
          {leftTab === "components" && (
            <DocumentPalette onAddPage={handleAddPage} />
          )}
          {leftTab === "pages" && (
            <MultiPageNav
              pages={doc.pages}
              activeIndex={pageIndex}
              onSelect={setPageIndex}
              onAdd={handleAddPage}
              onDuplicate={handleDuplicatePage}
              onDelete={handleDeletePage}
              onMove={handleMovePage}
            />
          )}
          {leftTab === "layers" && page && (
            <LayersPanel
              layers={page.layers}
              activeLayerId={activeLayerId}
              onChange={handleLayersChange as any}
              onActiveChange={setActiveLayer}
            />
          )}
          {leftTab === "data" && (
            <DataSourcePanel
              doc={doc}
              sampleJson={sampleJson}
              onSampleJsonChange={setSampleJson}
              onDocChange={syncDoc}
            />
          )}
        </div>
        <div className="docLeftResizer" onMouseDown={handleLeftResize} />
      </div>

      {/* ── Main canvas area ──────────────────── */}
      <div className="docDesigner__main">

        {/* Toolbar */}
        <div className="docDesignerToolbar">
          <FileText size={15} className="docToolbarIcon" />
          <span className="docToolbarTitle">Diseñador de Documentos</span>

          <div className="docToolbarSep" />

          {/* Undo / Redo */}
          <button type="button" className="docToolbarBtn" onClick={undo} disabled={!hasUndo} title="Deshacer (Ctrl+Z)">
            <Undo size={15} strokeWidth={2.5} />
          </button>
          <button type="button" className="docToolbarBtn" onClick={redo} disabled={!hasRedo} title="Rehacer (Ctrl+Y)">
            <Redo size={15} strokeWidth={2.5} />
          </button>

          <div className="docToolbarSep" />

          {/* Zoom */}
          <button type="button" className="docToolbarBtn" onClick={zoomOut} title="Alejar"><ZoomOut size={15} strokeWidth={2.5} /></button>
          <span className="docZoomLabel">{Math.round(zoom * 100)}%</span>
          <button type="button" className="docToolbarBtn" onClick={zoomIn} title="Acercar"><ZoomIn size={15} strokeWidth={2.5} /></button>

          <div className="docToolbarSpacer" />

          {/* Export / Print */}
          <button type="button" className="docToolbarBtn" onClick={handleExportPdf} title="Exportar PDF">
            <Download size={15} strokeWidth={2.5} />
          </button>
          <button type="button" className="docToolbarBtn" onClick={handlePrint} title="Imprimir">
            <Printer size={15} strokeWidth={2.5} />
          </button>

          <div className="docToolbarSep" />

          {/* View mode */}
          <div className="docViewSwitch">
            <button type="button" className={viewMode === "design" ? "active" : ""}  onClick={() => { setViewMode("design"); setPreviewDoc(null); }}>
              <Eye size={13} /> Diseño
            </button>
            <button type="button" className={viewMode === "preview" ? "active" : ""} onClick={() => handleViewMode("preview")}>
              <Eye size={13} /> Preview
            </button>
            <button type="button" className={viewMode === "xml" ? "active" : ""}     onClick={() => handleViewMode("xml")}>
              <Code size={13} /> XML
            </button>
          </div>
        </div>

        {/* Canvas / XML editor */}
        {viewMode === "xml" ? (
          <div className="docXmlWrap">
            {xmlError && <div className="docXmlError">{xmlError}</div>}
            <textarea
              className="docXmlEditor"
              value={xmlText}
              onChange={(e) => setXmlText(e.target.value)}
              spellCheck={false}
            />
            <div className="docXmlActions">
              <button type="button" className="docXmlApply" onClick={handleXmlApply}>
                Aplicar cambios
              </button>
            </div>
          </div>
        ) : (
          <div className="docCanvas">
            <PageCanvas
              doc={doc}
              page={page}
              pageIndex={pageIndex}
              scale={scale}
              zoom={zoom}
              selectedId={selectedId}
              onSelect={(id) => { setSelectedId(id); if (!id) return; }}
              onSelectPage={() => { setSelectedId(null); }}
              onMove={handleMove}
              onResize={handleResize}
              onBandResize={handleBandResize}
              onDrop={handleDrop}
              previewDoc={previewDoc}
              isPreview={viewMode === "preview"}
            />
          </div>
        )}
      </div>

      {/* ── Right panel ───────────────────────── */}
      <DocumentProperties
        selected={selectedElement}
        selectedPage={selectedElement ? null : page}
        onElementChange={handleElementChange}
        onPageChange={handlePageChange}
        onDelete={handleDelete}
        themeLibrary={themeLibrary}
        currentTheme={doc.embeddedTheme}
        onApplyTheme={handleApplyTheme}
        onSaveTheme={handleSaveTheme}
        onRemoveTheme={handleRemoveTheme}
      />

    </section>
  );
}

// ── Page Canvas ──────────────────────────────────────────────

interface PageCanvasProps {
  doc: SaeDocumentModel;
  page: PageDef;
  pageIndex: number;
  scale: number;
  zoom: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onSelectPage: () => void;
  onMove: (id: string, dx: number, dy: number) => void;
  onResize: (id: string, dw: number, dh: number, dx: number, dy: number) => void;
  onBandResize: (band: "header" | "body" | "footer", deltaMm: number) => void;
  onDrop: (band: "header" | "body" | "footer", type: DocumentElementType, x: number, y: number) => void;
  previewDoc: RenderedDocument | null;
  isPreview: boolean;
}

function PageCanvas({
  page, pageIndex, scale, selectedId, onSelect, onSelectPage,
  onMove, onResize, onBandResize, onDrop, previewDoc, isPreview,
}: PageCanvasProps) {
  const widthPx  = page.width * scale;
  const heightPx = page.height * scale;
  const renderedPage = previewDoc?.pages[pageIndex];

  const bands: { key: "header" | "body" | "footer"; band: BandDef | undefined }[] = [
    { key: "header", band: page.header },
    { key: "body",   band: page.body   },
    { key: "footer", band: page.footer },
  ];

  return (
    <div className={`docPageWrap${previewDoc ? " docPageWrap--preview" : ""}`}>
      <div className="docPageMeta">
        <span>{page.width} × {page.height} {page.unit}</span>
        <span>{page.orientation === "landscape" ? "Horizontal" : "Vertical"}</span>
      </div>

      <div
        className="docPage"
        style={{ width: widthPx, height: heightPx }}
        onClick={onSelectPage}
      >
        {bands.map(({ key, band }, i) => {
          if (!band) return null;
          return (
            <BandCanvas
              key={key}
              band={band}
              scale={scale}
              selectedId={selectedId}
              onSelect={onSelect}
              onMove={onMove}
              onResize={onResize}
              onBandResize={(delta) => onBandResize(key, delta)}
              onDrop={(type, x, y) => onDrop(key, type, x, y)}
              renderedBand={renderedPage?.[key]}
              showResizeHandle={i < bands.length - 1}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Left Tab Button ───────────────────────────────────────────

function LeftTabBtn({
  id, label, active, setActive, icon,
}: {
  id: LeftTab; label: string; active: LeftTab; setActive: (t: LeftTab) => void; icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`docLeftTab${active === id ? " active" : ""}`}
      onClick={() => setActive(id)}
      title={label}
    >
      {icon}
      <span style={{ fontSize: "9px", overflow: "hidden", textOverflow: "ellipsis", width: "100%", textAlign: "center" }}>
        {label}
      </span>
    </button>
  );
}

// ── Tree traversal helper ─────────────────────────────────────

function findInPage(page: PageDef | undefined, id: string): DocumentElement | null {
  if (!page) return null;
  for (const band of [page.header, page.body, page.footer]) {
    if (!band) continue;
    const found = band.elements.find((e) => e.id === id);
    if (found) return found;
  }
  return null;
}
