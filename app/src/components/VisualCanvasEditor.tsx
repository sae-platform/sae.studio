import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';

import type { EditorElementDefinition, UpsertEditorElementPayload, LogicalPrinterDto } from "@/lib/api/client";
import { createEditorApi, createLabelsApi } from "@/lib/api/client";
import LogicalPrintersManagerModal from "./LogicalPrintersManagerModal";
import { Portal } from "./Portal";
import { useKeyboardShortcuts, useKeyboardPanning, useKeyboardHistorySync } from "@/modules/label-designer/keyboard";
import { BarcodeImage, replaceVars, n, pt, cap, num, toUnit, fromUnit, toHexColor, unitStep, toAffine, PT_PER_IN, MM_PER_IN } from "@/modules/label-designer/object";
import { parse, type Parsed, serializeDocument } from "@/modules/label-designer/canvas";
import { useZoomWheel } from "@/modules/label-designer/zoom";
import {
  deleteSelected,
  duplicateSelected,
  bringToFront as bringToFrontService,
  sendToBack as sendToBackService,
  groupObjects,
  ungroupObjects,
  moveLayer as moveLayerService,
  reorderByDrop,
} from "@/modules/label-designer/layers";
import { intersects, contains } from "@/modules/label-designer/selection";
import { computeResize, computeRotate, computeSkew, clamp } from "@/modules/label-designer/transform";
import { InspectorPanel } from "@/modules/label-designer/components/InspectorPanel";
import { ContextMenu } from "@/modules/label-designer/components/ContextMenu";
import { HelpModal } from "@/modules/label-designer/components/HelpModal";
import { PrintModal } from "@/modules/label-designer/components/PrintModal";
import { InlineTextEditor } from "@/modules/label-designer/text";
import { Ruler } from "@/modules/editor/components/Ruler";
import { ElementEditorModal } from "@/modules/label-designer/components/ElementEditorModal";
import { BASE_PLUGINS, registerPlugin } from "@/modules/editor/object-registry";
import { useViewportStore } from "@/modules/editor/stores";
import { useUIStore } from "@/modules/editor/stores";
import { useSelectionStore } from "@/modules/editor/stores";
import { useCanvasStore } from "@/modules/editor/stores";
import { useCanvasDrag, useCanvasPan, useBoxSelect, useSidebarResize } from "@/modules/editor/hooks";
import { ObjectRenderer } from "@/modules/editor/components/ObjectRenderer";
import { VariablesPanel } from "@/modules/editor/components/VariablesPanel";
import { EditorToolbar } from "@/modules/editor/components/EditorToolbar";
import { PalettePanel } from "@/modules/editor/components/PalettePanel";
import { LayersPanel } from "@/modules/editor/components/LayersPanel";

type Props = {
  xml: string;
  onXmlChange: (xml: string) => void;
  apiBaseUrl: string;
  timeoutMs: number;
  docId: string;
  docName: string;
  metadata: {
    version: string;
    brand: string;
    description: string;
    part: string;
    size: string;
  };
  onDocNameChange: (name: string) => void;
  onMetadataChange: (meta: any) => void;
};

type VariableDef = {
  name: string;
  type?: string;
  initial?: string;
  increment?: string;
  step?: number;
};

type Kind = "sae" | "glabels";
type Obj = {
  id: string;
  xmlIndex: number | null;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  content: string;
  rotateDeg: number;
  scaleX: number;
  scaleY: number;
  skewX: number;
  skewY: number;
  groupId?: string;
  locked?: boolean;
  hidden?: boolean;
  barcodeKind?: string;
  fillColor?: string;
  lineColor?: string;
  textColor?: string;
  textAlign?: string;
  lineWidth?: number;
  showText?: boolean;
  textPosition?: "top" | "bottom";
  fontFamily?: string;
  fontSize?: number;
};

type DragState = {
  mode: "move" | "resize" | "transform";
  id: string;
  handle?: string;
  startX: number;
  startY: number;
  x: number;
  y: number;
  w: number;
  h: number;
  startRotateDeg?: number;
  startSkewX?: number;
  startSkewY?: number;
  centerClientX?: number;
  centerClientY?: number;
  startAngleRad?: number;
  transformKind?: "rotate" | "skewX" | "skewY" | "skewAuto";
  originMap?: Record<string, { x: number; y: number }>;
};
type BoxSelectState = { startClientX: number; startClientY: number; currentClientX: number; currentClientY: number };
type LayerNode =
  | { kind: "group"; groupId: string; members: Obj[] }
  | { kind: "item"; object: Obj };
type Unit = "mm" | "cm" | "in" | "pt";
type Guideline = { id: string; orientation: "horizontal" | "vertical"; posPt: number };

const MIN = 4;
const HANDLES = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];
const TYPES = ["text", "barcode", "box", "line", "ellipse", "image", "path"] as const;
const BASE_ELEMENT_KEYS = new Set(["text", "barcode", "box", "line", "ellipse", "image", "path"]);
const ICON: Record<(typeof TYPES)[number], any> = {
  text: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  ),
  barcode: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 5v14M8 5v14M12 5v14M17 5v14M21 5v14" />
    </svg>
  ),
  box: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    </svg>
  ),
  line: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  ellipse: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
    </svg>
  ),
  image: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),
  path: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L15 8L22 9L17 14L18 21L12 18L6 21L7 14L2 9L9 8L12 2Z" />
    </svg>
  ),
};

const PREDEFINED_SHAPES = [
  { name: "Estrella", path: "M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" },
  { name: "Triángulo", path: "M12 2L22 21H2L12 2Z" },
  { name: "Flecha Der", path: "M12 2L22 12L12 22V17H2V7H12V2Z" },
  { name: "Flecha Izq", path: "M12 2L2 12L12 22V17H22V7H12V2Z" },
  { name: "Corazón", path: "M12 21.35L10.55 20.03C5.4 15.36 2 12.27 2 8.5C2 5.41 4.41 3 7.5 3C9.24 3 10.91 3.81 12 5.08C13.09 3.81 14.76 3 16.5 3C19.59 3 22 5.41 22 8.5C22 12.27 18.6 15.36 13.45 20.03L12 21.35Z" },
  { name: "Hexágono", path: "M12 2L21 7V17L12 22L3 17V7L12 2Z" },
  { name: "Rayo", path: "M13 2L3 14H12L11 22L21 10H12L13 2Z" },
  { name: "Check", path: "M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3" }
];

const GROUP_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L19 7V17L12 22L5 17V7L12 2Z" />
    <polyline points="12 22 12 12 19 7" />
    <line x1="12" y1="12" x2="5" y2="7" />
  </svg>
);

export default function VisualCanvasEditor({ 
  xml, 
  onXmlChange, 
  apiBaseUrl, 
  timeoutMs,
  docId,
  docName,
  metadata,
  onDocNameChange,
  onMetadataChange
}: Props) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    BASE_PLUGINS.forEach((plugin) => registerPlugin(plugin));
  }, []);

  const zoomPercent = useViewportStore(s => s.zoomPercent);
  const setZoomPercent = useViewportStore(s => s.setZoomPercent);
  const [error, setError] = useState("");
  const objects = useCanvasStore(s => s.objects) as unknown as Obj[];
  const setObjects = useCanvasStore(s => s.setObjects) as unknown as (updater: Obj[] | ((prev: Obj[]) => Obj[])) => void;
  const showHelpModal = useUIStore(s => s.showHelpModal);
  const setShowHelpModal = useUIStore(s => s.setShowHelpModal);

  // ── Undo / Redo history ───────────────────────────────────────────────────
  const historyRef = useRef<Obj[][]>([]);
  const historyIdxRef = useRef<number>(-1);
  const isUndoingRef = useRef<boolean>(false);

  const pushHistory = useCallback((nextObjects: Obj[]) => {
    if (isUndoingRef.current) return;
    const h = historyRef.current;
    // Truncate any redo states beyond current index
    h.splice(historyIdxRef.current + 1);
    h.push(nextObjects.map(o => ({ ...o })));
    if (h.length > 60) h.shift();
    historyIdxRef.current = h.length - 1;
  }, []);
  const selectedIds = useSelectionStore(s => s.selectedIds);
  const setSelectedIds = useSelectionStore(s => s.setSelectedIds);
  const drag = useSelectionStore(s => s.drag);
  const setDrag = useSelectionStore(s => s.setDrag);
  const boxSelect = useSelectionStore(s => s.boxSelect);
  const setBoxSelect = useSelectionStore(s => s.setBoxSelect);
  const contextMenu = useSelectionStore(s => s.contextMenu);
  const setContextMenu = useSelectionStore(s => s.setContextMenu);
  const [elements, setElements] = useState<EditorElementDefinition[]>([]);
  const status = useUIStore(s => s.status);
  const setStatus = useUIStore(s => s.setStatus);
  const templateUnit = useViewportStore(s => s.templateUnit);
  const setTemplateUnit = useViewportStore(s => s.setTemplateUnit);
  const [baseElementIds, setBaseElementIds] = useState<string[]>([]);
  const templateWidthPt = useViewportStore(s => s.templateWidthPt);
  const setTemplateWidthPt = useViewportStore(s => s.setTemplateWidth);
  const templateHeightPt = useViewportStore(s => s.templateHeightPt);
  const setTemplateHeightPt = useViewportStore(s => s.setTemplateHeight);
  const [isBoardDragOver, setIsBoardDragOver] = useState(false);
  const [dragLayerId, setDragLayerId] = useState<string | null>(null);
  const transformModeIds = useSelectionStore(s => s.transformModeIds);
  const setTransformModeIds = useSelectionStore(s => s.setTransformModeIds);
  const sidebarEditMode = useUIStore(s => s.sidebarEditMode);
  const setSidebarEditMode = useUIStore(s => s.setSidebarEditMode);
  const leftSidebarWidth = useUIStore(s => s.leftSidebarWidth);
  const setLeftSidebarWidth = useUIStore(s => s.setLeftSidebarWidth);
  const rightSidebarWidth = useUIStore(s => s.rightSidebarWidth);
  const setRightSidebarWidth = useUIStore(s => s.setRightSidebarWidth);
  const lastSentXmlRef = useRef<string>("");
  const [editingElementId, setEditingElementId] = useState("");
  const showElementModal = useUIStore(s => s.showElementModal);
  const setShowElementModal = useUIStore(s => s.setShowElementModal);
  const [elementForm, setElementForm] = useState<UpsertEditorElementPayload>({
    key: "text",
    name: "Texto",
    category: "basic",
    objectType: "text",
    defaultWidthPt: 90,
    defaultHeightPt: 24,
    defaultContent: "${texto}"
  });
  const guidelines = useViewportStore(s => s.guidelines);
  const setGuidelines = useViewportStore(s => s.setGuidelines);
  const activeGuidelineDrag = useViewportStore(s => s.activeGuidelineDrag);
  const setActiveGuidelineDrag = useViewportStore(s => s.setActiveGuidelineDrag);
  const [rulerOffsets, setRulerOffsets] = useState({ x: 0, y: 0 });
  const activeRightTab = useUIStore(s => s.activeRightTab);
  const setActiveRightTab = useUIStore(s => s.setActiveRightTab);
  const [tabOrder, setTabOrder] = useState<("properties" | "layers" | "variables")[]>(["properties", "layers", "variables"]);
  const [draggedTab, setDraggedTab] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const variables = useCanvasStore(s => s.variables) as unknown as VariableDef[];
  const setVariables = useCanvasStore(s => s.setVariables) as unknown as (updater: VariableDef[] | ((prev: VariableDef[]) => VariableDef[])) => void;
  const [newVarName, setNewVarName] = useState("");
  const isPanning = useViewportStore(s => s.isPanning);
  const setIsPanning = useViewportStore(s => s.setPanning);
  const panState = useViewportStore(s => s.panState);
  const setPanState = useViewportStore(s => s.setPanState);
  const isPanningRef = useRef(false);
  const [dynamicResize, setDynamicResize] = useState(false);
  
  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const preEditObjectsRef = useRef<any[]>([]);
  
  // Printing state
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printForm, setPrintForm] = useState({ printerName: "", copies: 1, isPrinting: false });
  const [showPrintersManagerModal, setShowPrintersManagerModal] = useState(false);
  const [availableLogicalPrinters, setAvailableLogicalPrinters] = useState<LogicalPrinterDto[]>([]);
  
  // Auto-expand sidebar on preview
  useEffect(() => {
    if (activeRightTab === "preview" && rightSidebarWidth < 450) {
      setRightSidebarWidth(450);
    }
  }, [activeRightTab]);

  // Imprimir variables
  const [printTab, setPrintTab] = useState<"manual"|"excel">("manual");
  const [manualVars, setManualVars] = useState<Record<string, string>>({});
  const [excelData, setExcelData] = useState<Record<string, any>[]>([]);
  const [excelCols, setExcelCols] = useState<string[]>([]);
  const [excelMapping, setExcelMapping] = useState<Record<string, string>>({});
  
  const boardRef = useRef<HTMLDivElement | null>(null);
  const studioBodyRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const draggedElementRef = useRef<EditorElementDefinition | null>(null);
  // Keep isPanningRef in sync so inline JSX handlers (not in closures) always read current value
  useEffect(() => { isPanningRef.current = isPanning; }, [isPanning]);
  const resizingSidebarRef = useRef<{
    side: "left" | "right";
    startX: number;
    startWidth: number;
    otherWidth: number;
    bodyWidth: number;
  } | null>(null);
  
  const editorApi = useMemo(() => createEditorApi(apiBaseUrl, { timeoutMs }), [apiBaseUrl, timeoutMs]);
  const labelsApi = useMemo(() => createLabelsApi(apiBaseUrl, { timeoutMs }), [apiBaseUrl, timeoutMs]);
  
  const parseResult = useMemo(() => {
    try { return { parsed: parse(xml), parseError: "" }; } catch (e) { return { parsed: null, parseError: e instanceof Error ? e.message : "Error parseando." }; }
  }, [xml]);
  
  const parsed = parseResult.parsed;
  const viewError = parseResult.parseError || error;
  const zoom = zoomPercent / 100;
  
  const activeTransformKind = drag?.mode === "transform"
    ? (drag.transformKind ?? ((drag.handle?.length ?? 0) === 2 ? "rotate" : "skewAuto"))
    : null;

  const refresh = async () => {
    const els = await editorApi.listElements();
    setElements(els);
    setBaseElementIds((prev) => {
      const seeded = els.filter((el) => BASE_ELEMENT_KEYS.has(el.key)).map((el) => el.id);
      if (seeded.length === 0) return prev;
      return Array.from(new Set([...prev, ...seeded]));
    });
  };
  const handleShowPrintModal = async () => {
    setShowPrintModal(true);
    try {
      const logPrinters = await labelsApi.getLogicalPrinters();
      setAvailableLogicalPrinters(logPrinters.filter(p => p.isActive && (p.mediaType === "label" || !p.mediaType)));
      if (printForm.printerName === "" && logPrinters.some(p => p.isActive)) {
        setPrintForm(p => ({ ...p, printerName: logPrinters.filter(x => x.isActive && (x.mediaType === "label" || !x.mediaType))[0]?.name || "" }));
      }
    } catch (e) {
      console.error("Error loading logical printers:", e);
    }
  };

  const executePrint = async () => {
    if (!printForm.printerName.trim()) {
      setStatus("Error: Debe especificar el nombre de la impresora.");
      return;
    }
    setPrintForm(p => ({ ...p, isPrinting: true }));
    try {
      applyXml(); // Ensure current state is serialized
      const payload: any = {
        xml,
        printerName: printForm.printerName.trim(),
        copies: printForm.copies <= 1 ? null : printForm.copies,
      };

      if (variables.length > 0) {
        if (printTab === "manual") {
          payload.data = manualVars;
        } else if (printTab === "excel") {
           if (excelData.length === 0) {
              setStatus("Error: No hay datos de excel cargados.");
              setPrintForm(p => ({ ...p, isPrinting: false }));
              return;
           }
           payload.dataList = excelData.map(row => {
               const dict: Record<string, string> = {};
               for (const v of variables) {
                   const colName = excelMapping[v.name];
                   if (colName && row[colName] !== undefined && row[colName] !== null) {
                       dict[v.name] = String(row[colName]);
                   } else {
                       dict[v.name] = "";
                   }
               }
               return dict;
           });
        }
      }

      const res = await labelsApi.print(payload);
      setStatus(`Impresión enviada a ${res.printer} exitosamente.`);
      setShowPrintModal(false);
    } catch (e: any) {
      console.error(e);
      setStatus(`Error al imprimir: ${e.message || "Fallo de conexión"}`);
    } finally {
      setPrintForm(p => ({ ...p, isPrinting: false }));
    }
  };

  useEffect(() => {
    if (!parsed) return;
    // Don't re-apply if this is exactly what we just sent out
    if (xml === lastSentXmlRef.current) return;
    
    setObjects(parsed.objects);
    
    // Seed history if empty or newly loaded
    if (historyRef.current.length === 0 || xml !== lastSentXmlRef.current) {
        historyRef.current = [parsed.objects.map(o => ({ ...o }))];
        historyIdxRef.current = 0;
    }

    setVariables(parsed.variables || []);
    setTemplateWidthPt(parsed.widthPt);
    setTemplateHeightPt(parsed.heightPt);
    setError("");
  }, [parsed, xml]);

  useEffect(() => {
    setTransformModeIds([]);
  }, [selectedIds]);

  useEffect(() => {
    const timer = setTimeout(() => {
      applyXml();
    }, 500);
    return () => clearTimeout(timer);
  }, [objects, variables, templateWidthPt, templateHeightPt, metadata]);

  useEffect(() => {
    const run = async () => {
      try { await refresh(); } catch (e) {
        // Ignorar para evitar mostrar mensajes de error tipo Failed to Fetch
      }
    };
    void run();
  }, [editorApi]);

  useEffect(() => {
    if (status) {
      const timer = setTimeout(() => setStatus(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  // Push history snapshot when drag ends
  const prevDragRef = useRef<DragState | null>(null);
  useEffect(() => {
    if (drag === null && prevDragRef.current !== null) {
      // Drag just ended — push final state
      pushHistory(objects);
    }
    prevDragRef.current = drag;
  }, [drag, objects, pushHistory]);




  useEffect(() => {
    const hide = () => setContextMenu(null);
    window.addEventListener("click", hide);
    return () => window.removeEventListener("click", hide);
  }, []);

  useKeyboardShortcuts({
    onDelete: useCallback(() => { deleteObjects(selectedIds); }, [selectedIds]),
    onUndo: useCallback(() => {
      const h = historyRef.current;
      if (historyIdxRef.current > 0) {
        historyIdxRef.current--;
        isUndoingRef.current = true;
        setObjects(h[historyIdxRef.current].map(o => ({ ...o })));
        isUndoingRef.current = false;
        setStatus(`Deshacer (${historyIdxRef.current + 1}/${h.length})`);
      }
    }, []),
    onRedo: useCallback(() => {
      const h = historyRef.current;
      if (historyIdxRef.current < h.length - 1) {
        historyIdxRef.current++;
        isUndoingRef.current = true;
        setObjects(h[historyIdxRef.current].map(o => ({ ...o })));
        isUndoingRef.current = false;
        setStatus(`Rehacer (${historyIdxRef.current + 1}/${h.length})`);
      }
    }, []),
    onPrint: useCallback(() => handleShowPrintModal(), []),
    onSave: useCallback(() => { applyXml(); setStatus("Cambios guardados (Ctrl+S)."); }, []),
    onGroup: useCallback(() => groupSelected(), []),
    onUngroup: useCallback(() => ungroupSelected(), []),
    onEscape: useCallback(() => { setSelectedIds([]); setContextMenu(null); }, []),
    canDelete: selectedIds.length > 0,
  });

  useKeyboardPanning({
    onPanStart: useCallback(() => setIsPanning(true), []),
    onPanEnd: useCallback(() => { setIsPanning(false); setPanState(null); }, []),
  });

  useKeyboardHistorySync(
    useCallback(() => {
      const h = historyRef.current;
      if (historyIdxRef.current > 0) {
        historyIdxRef.current--;
        isUndoingRef.current = true;
        setObjects(h[historyIdxRef.current].map(o => ({ ...o })));
        isUndoingRef.current = false;
        setStatus(`Deshacer (${historyIdxRef.current + 1}/${h.length})`);
      }
    }, []),
    useCallback(() => {
      const h = historyRef.current;
      if (historyIdxRef.current < h.length - 1) {
        historyIdxRef.current++;
        isUndoingRef.current = true;
        setObjects(h[historyIdxRef.current].map(o => ({ ...o })));
        isUndoingRef.current = false;
        setStatus(`Rehacer (${historyIdxRef.current + 1}/${h.length})`);
      }
    }, []),
    historyIdxRef.current > 0,
    historyIdxRef.current < historyRef.current.length - 1,
    historyRef.current.length,
  );

  useEffect(() => {
    if (!editingId) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setObjects(preEditObjectsRef.current);
        setEditingId(null);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [editingId]);

  // Guideline drag handling
  const guidelinesRef = useRef(guidelines);
  guidelinesRef.current = guidelines;

  useEffect(() => {
    if (!activeGuidelineDrag) return;
    const dragId = activeGuidelineDrag.id;

    const onMove = (event: MouseEvent) => {
      const board = boardRef.current;
      if (!board) return;
      const g = guidelinesRef.current.find(x => x.id === dragId);
      if (!g) return;
      const br = board.getBoundingClientRect();
      const isH = g.orientation === "horizontal";
      const posPt = (isH ? event.clientY - br.top : event.clientX - br.left) / zoom;
      setGuidelines(prev => prev.map(x => x.id === dragId ? { ...x, posPt } : x));
    };

    const onUp = () => {
      setActiveGuidelineDrag(null);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [activeGuidelineDrag, zoom, setGuidelines, setActiveGuidelineDrag]);

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      const state = resizingSidebarRef.current;
      if (!state) return;
      const delta = event.clientX - state.startX;
      const centerMin = 340;
      const handlesWidth = 12;
      if (state.side === "left") {
        const next = clamp(state.startWidth + delta, 220, Math.max(220, state.bodyWidth - state.otherWidth - centerMin - handlesWidth));
        setLeftSidebarWidth(next);
      } else {
        const next = clamp(state.startWidth - delta, 220, Math.max(220, state.bodyWidth - state.otherWidth - centerMin - handlesWidth));
        setRightSidebarWidth(next);
      }
    };
    const onUp = () => {
      resizingSidebarRef.current = null;
      window.document.body.style.cursor = "";
      window.document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  useZoomWheel(viewportRef, useCallback((delta: number) => {
    setZoomPercent(p => Math.max(25, Math.min(500, p + delta)));
  }, []));

  useCanvasDrag(boardRef, viewportRef);
  useCanvasPan(viewportRef);
  useBoxSelect(boardRef);

  useEffect(() => {
    const restore = () => { setLeftSidebarWidth(300); setRightSidebarWidth(300); };
    window.addEventListener("saelabel:restore-panels", restore as EventListener);
    return () => window.removeEventListener("saelabel:restore-panels", restore as EventListener);
  }, []);

  const applyXml = (): string | null => {
    if (!parsed) return null;
    const nextXml = serializeDocument({
      xmlDocument: parsed.xmlDocument,
      kind: parsed.kind,
      metadata: {
        version: metadata.version,
        brand: metadata.brand,
        description: metadata.description,
        part: metadata.part,
        size: metadata.size,
      },
      templateWidthPt,
      templateHeightPt,
      objects,
      variables,
    });
    lastSentXmlRef.current = nextXml;
    onXmlChange(nextXml);
    return nextXml;
  };

  useEffect(() => {
    const viewport = viewportRef.current;
    const board = boardRef.current;
    if (!viewport || !board) return;

    const update = () => {
      const b = board.getBoundingClientRect();
      const v = viewport.getBoundingClientRect();
      setRulerOffsets({ x: (b.left - v.left) / zoom, y: (b.top - v.top) / zoom });
    };

    update();
    viewport.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      viewport.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [zoom]);

  const startGuideline = (orientation: "horizontal" | "vertical", e: React.MouseEvent) => {
    const id = `g-${crypto.randomUUID()}`;
    const br = boardRef.current?.getBoundingClientRect();
    if (!br) return;
    const isH = orientation === "horizontal";
    const posPt = (isH ? e.clientY - br.top : e.clientX - br.left) / zoom;
    setGuidelines(prev => [...prev, { id, orientation, posPt }]);
    setActiveGuidelineDrag({ id, startPosPt: posPt, hasExitedRuler: false });
  };

  const deleteObjects = (ids: string[]) => {
    const next = deleteSelected(objects, ids);
    setObjects(next);
    pushHistory(next);
    setSelectedIds([]);
    setContextMenu(null);
  };

  const duplicateObjects = (ids: string[]) => {
    const { updated, newIds } = duplicateSelected(objects, ids);
    if (newIds.length === 0) return;
    setObjects(updated);
    pushHistory(updated);
    setSelectedIds(newIds);
    setContextMenu(null);
  };

  const bringToFront = (id: string) => {
    const next = bringToFrontService(objects, id);
    if (next === objects) return;
    setObjects(next);
    pushHistory(next);
    setContextMenu(null);
  };

  const sendToBack = (id: string) => {
    const next = sendToBackService(objects, id);
    if (next === objects) return;
    setObjects(next);
    pushHistory(next);
    setContextMenu(null);
  };

  const handleContextMenu = (e: React.MouseEvent, id: string | null) => {
    e.preventDefault();
    if (id && id !== "canvas") {
      if (id.startsWith("group:")) {
        const gid = id.slice(6);
        if (!objects.some(o => selectedIds.includes(o.id) && o.groupId === gid)) {
          setSelectedIds(objects.filter(o => o.groupId === gid).map(o => o.id));
        }
      } else if (!selectedIds.includes(id)) {
        setSelectedIds([id]);
      }
    } else if (id === "canvas") {
      if (!selectedIds.length) {
        // Keep selection empty if clicking on empty canvas
      }
    }
    setContextMenu({ x: e.clientX, y: e.clientY, id: id === "canvas" ? null : id });
  };

  const groupSelected = () => {
    const { updated, groupId } = groupObjects(objects, selectedIds);
    if (!groupId) return;
    setObjects(updated);
    pushHistory(updated);
    setContextMenu(null);
  };

  const ungroupSelected = () => {
    const next = ungroupObjects(objects, selectedIds);
    if (next === objects) return;
    setObjects(next);
    pushHistory(next);
    setContextMenu(null);
  };

  const moveLayer = (token: string, dir: "up" | "down" | "top" | "bottom") => {
    const next = moveLayerService(objects, token, dir);
    if (next === objects) return;
    setObjects(next);
    pushHistory(next);
  };

  const reorderByLayerDrop = (dragToken: string, targetToken: string) => {
    const next = reorderByDrop(objects, dragToken, targetToken);
    if (next === objects) return;
    setObjects(next);
    pushHistory(next);
  };

  const toggleLock = (id: string) => {
    const next = objects.map((o) => (o.id === id ? { ...o, locked: !o.locked } : o));
    setObjects(next);
    pushHistory(next);
  };

  const toggleHide = (id: string) => {
    const next = objects.map((o) => (o.id === id ? { ...o, hidden: !o.hidden } : o));
    setObjects(next);
    pushHistory(next);
  };

  const saveElement = async () => {
    if (!sidebarEditMode) { setStatus("Activa Modo Edicion para guardar elementos."); return; }
    if (editingElementId && baseElementIds.includes(editingElementId)) { setStatus("Los elementos base no se pueden editar."); return; }
    if (!elementForm.key.trim() || !elementForm.name.trim()) { setStatus("Key y nombre son requeridos."); return; }
    try {
      await editorApi.saveElement({ ...elementForm, id: editingElementId || undefined, key: elementForm.key.trim(), name: elementForm.name.trim() });
      setEditingElementId("");
      setElementForm({ key: "text", name: "Texto", category: "basic", objectType: "text", defaultWidthPt: 90, defaultHeightPt: 24, defaultContent: "${texto}" });
      setShowElementModal(false);
      setStatus("Elemento guardado.");
      await refresh();
    } catch (e) { setStatus(e instanceof Error ? e.message : "No se pudo guardar elemento."); }
  };

  const editElement = (el: EditorElementDefinition) => {
    if (baseElementIds.includes(el.id)) { setStatus("Los elementos base no se pueden editar."); return; }
    setEditingElementId(el.id);
    setElementForm({ id: el.id, key: el.key, name: el.name, category: el.category, objectType: el.objectType as any, defaultWidthPt: el.defaultWidthPt, defaultHeightPt: el.defaultHeightPt, defaultContent: el.defaultContent });
  };

  const deleteElement = async (id: string) => {
    if (baseElementIds.includes(id)) { setStatus("Los elementos base no se pueden eliminar."); return; }
    try {
      await editorApi.deleteElement(id);
      if (editingElementId === id) {
        setEditingElementId("");
        setShowElementModal(false);
      }
      setStatus("Elemento eliminado.");
      await refresh();
    } catch (e) { setStatus(e instanceof Error ? e.message : "No se pudo eliminar elemento."); }
  };

  const resetDragState = () => { draggedElementRef.current = null; setIsBoardDragOver(false); };

  if (!isMounted) return null;
  if (viewError) return <p className="editorError">{viewError}</p>;
  if (!parsed) return null;

  const sel = objects.find((o) => o.id === selectedIds[0]);
  const hasGroupedSelection = objects.some((o) => selectedIds.includes(o.id) && !!o.groupId);
  const layerNodes: LayerNode[] = (() => {
    const t2b = [...objects].reverse();
    const uG = new Set<string>();
    const nodes: LayerNode[] = [];
    for (const o of t2b) {
      if (o.groupId) { if (uG.has(o.groupId)) continue; uG.add(o.groupId); nodes.push({ kind: "group", groupId: o.groupId, members: t2b.filter((x) => x.groupId === o.groupId) }); }
      else nodes.push({ kind: "item", object: o });
    }
    return nodes;
  })();
  const previewScale = Math.max(0.1, Math.min((rightSidebarWidth - 60) / Math.max(1, templateWidthPt), 220 / Math.max(1, templateHeightPt)));
  const overlayMax = Math.min(window.innerWidth * 0.88, 1200);
  const previewScaleOverlay = Math.min(
    (overlayMax - 48) / Math.max(1, templateWidthPt),
    800 / Math.max(1, templateHeightPt)
  );

  return (
    <section className="editorStudio">
      <EditorToolbar
        zoomPercent={zoomPercent} setZoomPercent={setZoomPercent}
        templateUnit={templateUnit} setTemplateUnit={setTemplateUnit as any}
        templateWidthPt={templateWidthPt} setTemplateWidthPt={setTemplateWidthPt}
        templateHeightPt={templateHeightPt} setTemplateHeightPt={setTemplateHeightPt}
        dynamicResize={dynamicResize} setDynamicResize={setDynamicResize}
        objects={objects as any[]} setObjects={setObjects as any}
        pushHistory={pushHistory}
        onPrint={handleShowPrintModal}
        onHelp={() => setShowHelpModal(true)}
        onPreview={() => setShowPreview(true)}
      />

      <div ref={studioBodyRef} className="studioBody" style={{ gridTemplateColumns: `${leftSidebarWidth}px 6px minmax(0, 1fr) 6px ${rightSidebarWidth}px` }}>
        <PalettePanel
          sidebarEditMode={sidebarEditMode} setSidebarEditMode={setSidebarEditMode}
          setShowElementModal={setShowElementModal}
          elements={elements} TYPES={TYPES} baseElementIds={baseElementIds}
          draggedElementRef={draggedElementRef} resetDragState={resetDragState}
          setEditingElementId={setEditingElementId} setElementForm={setElementForm}
          editElement={editElement as any}
          ICON={ICON} PREDEFINED_SHAPES={PREDEFINED_SHAPES}
        />
        <div className="sidebarResizer left" onMouseDown={(e) => { resizingSidebarRef.current = { side: "left", startX: e.clientX, startWidth: leftSidebarWidth, otherWidth: rightSidebarWidth, bodyWidth: studioBodyRef.current?.getBoundingClientRect().width ?? 0 }; }} />
        <main className="canvasArea">
          <div className="canvasLayout">
            <div className="rulerCorner" />
            <Ruler orientation="horizontal" lengthPt={templateWidthPt} zoom={zoom} unit={templateUnit} offsetPt={rulerOffsets.x} onStartGuideline={(e) => startGuideline("horizontal", e)} guidelines={guidelines} />
            <Ruler orientation="vertical" lengthPt={templateHeightPt} zoom={zoom} unit={templateUnit} offsetPt={rulerOffsets.y} onStartGuideline={(e) => startGuideline("vertical", e)} guidelines={guidelines} />
            <div ref={viewportRef} className="canvasViewport" style={{ cursor: isPanning ? (panState ? 'grabbing' : 'grab') : 'auto' }} onContextMenu={(e) => { e.preventDefault(); if (!isPanningRef.current) handleContextMenu(e, "canvas"); }} onMouseDown={(e) => { if (e.button === 1 || isPanningRef.current) { e.preventDefault(); setPanState({ startX: e.clientX, startY: e.clientY, startScrollLeft: e.currentTarget.scrollLeft, startScrollTop: e.currentTarget.scrollTop }); return; } if (e.target === e.currentTarget && e.button === 0) { setContextMenu(null); setBoxSelect({ startClientX: e.clientX, startClientY: e.clientY, currentClientX: e.clientX, currentClientY: e.clientY }); } }} onDragOver={(e) => { e.preventDefault(); setIsBoardDragOver(true); e.dataTransfer.dropEffect = "copy"; }} onDragLeave={() => setIsBoardDragOver(false)} onDrop={(e) => { e.preventDefault(); setIsBoardDragOver(false); const raw = e.dataTransfer.getData("application/saelabel-element"); const el = raw ? JSON.parse(raw) : draggedElementRef.current; resetDragState(); if (!el || !boardRef.current) return; const br = boardRef.current.getBoundingClientRect(); const x = (e.clientX - br.left) / zoom; const y = (e.clientY - br.top) / zoom; setObjects(p => [...p, { id: `new-${crypto.randomUUID()}`, xmlIndex: null, type: el.objectType, x, y, w: el.defaultWidthPt, h: el.defaultHeightPt, content: el.defaultContent || "", rotateDeg: 0, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, fillColor: undefined, lineColor: "#000000", lineWidth: 1 }]); }}>
              {guidelines.map(g => (
                <div key={g.id} className={`guideline ${g.orientation}`} style={{ [g.orientation === "horizontal" ? "top" : "left"]: (g.posPt + (g.orientation === "horizontal" ? rulerOffsets.y : rulerOffsets.x)) * zoom + 24 }} onMouseDown={(e) => { e.stopPropagation(); setActiveGuidelineDrag({ id: g.id, startPosPt: g.posPt }); }} onDoubleClick={(e) => { e.stopPropagation(); setGuidelines(prev => prev.filter(x => x.id !== g.id)); }} />
              ))}
              {boxSelect && viewportRef.current && (
                <div className={`selectionRect ${boxSelect.currentClientX >= boxSelect.startClientX ? "touch" : "contain"}`} style={{ left: Math.min(boxSelect.startClientX, boxSelect.currentClientX) - viewportRef.current.getBoundingClientRect().left, top: Math.min(boxSelect.startClientY, boxSelect.currentClientY) - viewportRef.current.getBoundingClientRect().top, width: Math.abs(boxSelect.currentClientX - boxSelect.startClientX), height: Math.abs(boxSelect.currentClientY - boxSelect.startClientY) }} />
              )}
              <div ref={boardRef} className={`canvasBoard ${isBoardDragOver ? "dragOver" : ""} ${activeTransformKind ? `transform-${activeTransformKind}` : ""}`} style={{ width: templateWidthPt * zoom, height: templateHeightPt * zoom }} onMouseDown={(e) => { if (isPanningRef.current) return; if (e.target === e.currentTarget) { setContextMenu(null); setBoxSelect({ startClientX: e.clientX, startClientY: e.clientY, currentClientX: e.clientX, currentClientY: e.clientY }); } }}>
                {objects.map((o) => o.hidden ? null : (
                  <button key={o.id} type="button" className={`canvasObject ${o.type} ${selectedIds.includes(o.id) ? "selected" : ""} ${o.locked ? "locked" : ""}`} style={{ left: o.x * zoom, top: o.y * zoom, width: o.w * zoom, height: o.h * zoom, transform: `rotate(${o.rotateDeg}deg) skew(${o.skewX}deg, ${o.skewY}deg) scale(${o.scaleX}, ${o.scaleY})`, pointerEvents: (isPanning || o.locked) ? 'none' : 'auto', opacity: o.locked ? 0.7 : 1 }} onMouseDown={(e) => { if (isPanningRef.current || o.locked) return; e.stopPropagation(); const ids = objects.find(x => x.id === o.id)?.groupId ? objects.filter(x => x.groupId === objects.find(x => x.id === o.id)?.groupId).map(x => x.id) : selectedIds.includes(o.id) ? selectedIds : [o.id]; setDrag({ mode: "move", id: o.id, startX: e.clientX, startY: e.clientY, x: o.x, y: o.y, w: o.w, h: o.h, originMap: ids.reduce((a, id) => { const f = objects.find(x => x.id === id); if (f) a[id] = { x: f.x, y: f.y }; return a; }, {} as any) }); }} onContextMenu={(e) => { if (isPanningRef.current || o.locked) return; handleContextMenu(e, o.id); }} onClick={(e) => { if (isPanningRef.current || o.locked) return; e.stopPropagation(); if (e.ctrlKey) setSelectedIds(p => p.includes(o.id) ? p.filter(id => id !== o.id) : [...p, o.id]); else setSelectedIds([o.id]); }} onDoubleClick={(e) => { if (isPanningRef.current || o.locked) return; if (e.shiftKey) { setTransformModeIds(p => p.includes(o.id) ? p.filter(x => x !== o.id) : [...p, o.id]); } else if (o.type === "text" || o.type === "barcode") { preEditObjectsRef.current = objects.map(x => ({ ...x })); setEditingId(o.id); } else { setTransformModeIds(p => p.includes(o.id) ? p.filter(x => x !== o.id) : [...p, o.id]); } }}>
                    <ObjectRenderer obj={o} zoom={zoom} variables={variables} />
                    {o.locked && (
                      <div style={{ position: "absolute", top: 2, left: 2, fontSize: 10, opacity: 0.7, pointerEvents: "none" }}>
                        🔒
                      </div>
                    )}
                    {selectedIds.includes(o.id) && HANDLES.map(h => {
                      const inTransform = transformModeIds.includes(o.id);
                      const isCorner = h.length === 2;
                      const rotationCursor = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%230f766e' stroke-width='2.5'%3E%3Cpath d='M1 4v6h6'/%3E%3Cpath d='M3.51 15a9 9 0 1 0 2.13-9.36L1 10'/%3E%3C/svg%3E\") 12 12, auto";
                      const cursor = inTransform
                        ? (isCorner ? rotationCursor : (h === "n" || h === "s" ? "ns-resize" : "ew-resize"))
                        : (isCorner ? "nwse-resize" : (h === "n" || h === "s" ? "ns-resize" : "ew-resize"));
                      return (
                        <span key={h} className={`resizeHandle ${h} ${inTransform ? "transform" : ""} ${isCorner ? "rotateMode" : "skewMode"}`} style={{ cursor }} onMouseDown={(e) => { e.stopPropagation(); const br = boardRef.current?.getBoundingClientRect(); const cx = (br?.left ?? 0) + (o.x + o.w / 2) * zoom; const cy = (br?.top ?? 0) + (o.y + o.h / 2) * zoom; setDrag({ mode: inTransform ? "transform" : "resize", id: o.id, handle: h, startX: e.clientX, startY: e.clientY, x: o.x, y: o.y, w: o.w, h: o.h, startRotateDeg: o.rotateDeg, startSkewX: o.skewX, startSkewY: o.skewY, centerClientX: cx, centerClientY: cy, startAngleRad: Math.atan2(e.clientY - cy, e.clientX - cx) }); }} />
                      );
                    })}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </main>
        <div className="sidebarResizer right" onMouseDown={(e) => { resizingSidebarRef.current = { side: "right", startX: e.clientX, startWidth: rightSidebarWidth, otherWidth: leftSidebarWidth, bodyWidth: studioBodyRef.current?.getBoundingClientRect().width ?? 0 }; }} />
        <aside className="rightSidebar" style={{ display: 'flex', flexDirection: 'row' }}>
          <div className="sidebarTabs vertical">
            {tabOrder.map(tab => {
              const isActive = activeRightTab === tab;
              const labels = { properties: "Propiedades", layers: "Capas", variables: "Datos" };
              const icons = {
                properties: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>,
                layers: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
                variables: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>,
              };
              return (
                <button
                  key={tab}
                  type="button"
                  draggable
                  onDragStart={() => setDraggedTab(tab)}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (!draggedTab || draggedTab === tab) return;
                    const next = [...tabOrder];
                    const fromIdx = next.indexOf(draggedTab as any);
                    const toIdx = next.indexOf(tab);
                    next.splice(fromIdx, 1);
                    next.splice(toIdx, 0, draggedTab as any);
                    setTabOrder(next);
                    setDraggedTab(null);
                  }}
                  className={`sidebarTab vertical ${isActive ? "active" : ""}`}
                  onClick={() => setActiveRightTab(tab)}
                  title={labels[tab]}
                >
                  <span className="tabIcon">{icons[tab]}</span>
                  <span className="tabText">{labels[tab]}</span>
                </button>
              );
            })}
          </div>
          <div className="sidebarScroll">
            {activeRightTab === "layers" && (
              <LayersPanel
                layerNodes={layerNodes} selectedIds={selectedIds} setSelectedIds={setSelectedIds}
                dragLayerId={dragLayerId} setDragLayerId={setDragLayerId}
                reorderByLayerDrop={reorderByLayerDrop} handleContextMenu={handleContextMenu as any}
                toggleHide={toggleHide} toggleLock={toggleLock}
                bringToFront={bringToFront} sendToBack={sendToBack} moveLayer={moveLayer as any}
                groupSelected={groupSelected} deleteObjects={deleteObjects}
                ICON={ICON} GROUP_ICON={GROUP_ICON}
              />
            )}
            {activeRightTab === "properties" && sel && (
              <InspectorPanel sel={sel} setObjects={setObjects} />
            )}
            {activeRightTab === "variables" && (
              <VariablesPanel
                variables={variables}
                setVariables={setVariables as any}
                newVarName={newVarName}
                setNewVarName={setNewVarName}
                selectedObject={sel as any}
                setObjects={setObjects as any}
                setStatus={setStatus}
              />
            )}
            {editingId && (() => {
              const o = objects.find(x => x.id === editingId);
              if (!o) return null;
              return (
                <InlineTextEditor
                  initialText={o.content}
                  x={o.x} y={o.y}
                  width={o.w} height={o.h}
                  fontSize={o.fontSize ?? 12}
                  fontFamily={o.fontFamily ?? "sans-serif"}
                  zoom={zoom}
                  variables={variables.map(v => ({ name: v.name }))}
                  onCommit={(text) => {
                    setObjects(p => p.map(x => x.id === editingId ? { ...x, content: text } : x));
                    setEditingId(null);
                    setStatus("Texto actualizado");
                  }}
                  onCancel={() => {
                    setObjects(preEditObjectsRef.current);
                    setEditingId(null);
                  }}
                />
              );
            })()}
          </div>
            {status && (
              <div style={{
                position: 'absolute',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#334155',
                color: 'white',
                padding: '10px 20px',
                borderRadius: '8px',
                fontSize: '0.9rem',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                zIndex: 9999,
                animation: 'fadein 0.3s, fadeout 0.3s 2.7s'
              }}>
                {status}
              </div>
            )}
        </aside>
      </div>
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x} y={contextMenu.y} id={contextMenu.id}
          selectedIds={selectedIds} objects={objects}
          canGroup={selectedIds.length > 1}
          canUngroup={objects.some(o => selectedIds.includes(o.id) && o.groupId)}
          onClose={() => setContextMenu(null)}
          onMoveLayer={moveLayer} onDuplicate={() => duplicateObjects(selectedIds)}
          onDelete={() => deleteObjects(selectedIds)}
          onClearSelection={() => setSelectedIds([])}
          onGroup={groupSelected} onUngroup={ungroupSelected}
          onOpenProperties={() => setActiveRightTab("properties")}
        />
      )}
      {showElementModal && (
        <ElementEditorModal
          editingElementId={editingElementId}
          elementForm={elementForm as any}
          setElementForm={setElementForm as any}
          onClose={() => setShowElementModal(false)}
          onDelete={deleteElement}
          onSave={saveElement}
          types={TYPES}
        />
      )}
      
      {showPrintModal && (
        <PrintModal
          printForm={printForm} setPrintForm={setPrintForm}
          showPrintersManager={() => setShowPrintersManagerModal(true)}
          onClose={() => setShowPrintModal(false)}
          availablePrinters={availableLogicalPrinters}
          variables={variables} printTab={printTab} setPrintTab={setPrintTab}
          manualVars={manualVars} setManualVars={setManualVars}
          excelData={excelData} setExcelData={setExcelData}
          excelCols={excelCols} setExcelCols={setExcelCols}
          excelMapping={excelMapping} setExcelMapping={setExcelMapping}
          onPrint={executePrint}
        />
      )}

      {showPrintersManagerModal && (
        <LogicalPrintersManagerModal apiBaseUrl={apiBaseUrl} onClose={async () => {
          setShowPrintersManagerModal(false);
          // Recargar impresoras al cerrar
          try {
            const logPrinters = await labelsApi.getLogicalPrinters();
            setAvailableLogicalPrinters(logPrinters.filter(p => p.isActive && (p.mediaType === "label" || !p.mediaType)));
          } catch(e){}
        }} />
      )}
      {showHelpModal && <HelpModal onClose={() => setShowHelpModal(false)} />}

      {showPreview && (
        <Portal>
          <div className="modalBackdrop" style={{ zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowPreview(false)}>
            <div onClick={(e) => e.stopPropagation()} style={{
              background: "#fff",
              borderRadius: 8,
              boxShadow: "0 25px 50px rgba(0,0,0,0.3)",
              padding: 24,
              maxWidth: "95vw",
              maxHeight: "95vh",
              overflow: "auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <div className="previewLabel" style={{
                position: "relative",
                width: templateWidthPt * previewScaleOverlay,
                height: templateHeightPt * previewScaleOverlay,
                background: "#fff",
                border: "1px solid #cbd5e1",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                overflow: "hidden",
              }}>
                {objects.map(o => (
                  <div key={o.id} className={`previewObject ${o.type}`} style={{
                    position: "absolute",
                    border: "none",
                    background: "transparent",
                    color: "#0f172a",
                    overflow: "hidden",
                    pointerEvents: "none",
                    left: o.x * previewScaleOverlay,
                    top: o.y * previewScaleOverlay,
                    width: o.w * previewScaleOverlay,
                    height: o.h * previewScaleOverlay,
                    transform: `rotate(${o.rotateDeg}deg) scale(${o.scaleX}, ${o.scaleY})`,
                    transformOrigin: "center center",
                  }}>
                    <ObjectRenderer obj={o} zoom={previewScaleOverlay} variables={variables} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Portal>
      )}
    </section>
  );
}

