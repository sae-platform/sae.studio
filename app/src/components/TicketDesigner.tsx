import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import QRCode from "qrcode";
import * as XLSX from "xlsx";
import { labelsApi, type LogicalPrinterDto } from "@/lib/api/client";
import { Portal } from "@/components/Portal";
import { replaceSpecialVariables } from "@/modules/document-engine";
import {
  useTicketStore,
  xmlToBlocks,
  blocksToXml,
  TicketTree,
  TicketPropertiesPanel,
  TicketPreview,
} from "@/modules/ticket-designer";
import type { TicketBlock, Align, FontSize, EachBlock, EachColumn } from "@/modules/ticket-designer";
import { BASE_BLOCK_PLUGINS, registerBlockPlugin } from "@/modules/ticketing";

interface TicketDesignerProps {
  initialXml?: string;
  onUpdate: (xml: string) => void;
  apiBaseUrl?: string;
}

const INP: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.75rem", boxSizing: "border-box",
  borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface-alt, #f8fafc)",
  color: "var(--text)", fontSize: "0.88rem", outline: "none",
};
const MINI: React.CSSProperties = { fontSize: "0.72rem", padding: "0.35rem 0.75rem", borderRadius: 6, cursor: "pointer", fontWeight: 600 };

const SPECIAL_VARS = [
  { value: "${!date}", label: "Fecha (ISO)" },
  { value: "${!time}", label: "Hora" },
  { value: "${!datetime}", label: "Fecha y Hora" },
  { value: "${!dayname}", label: "Nombre del día" },
  { value: "${!weekmonth}", label: "Semana del mes" },
  { value: "${!weekyear}", label: "Semana del año" },
  { value: "${!year}", label: "Año" },
  { value: "${!month}", label: "Mes" },
  { value: "${!day}", label: "Día" },
  { value: "${!date:dd/MM/yy}", label: "Fecha (DD/MM/YY)" },
  { value: "${!date:dd-MM-yyyy}", label: "Fecha (DD-MM-YYYY)" },
];

function VarPicker({ onSelect }: { onSelect: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button type="button" onClick={() => setOpen(!open)} style={{ ...MINI, background: "var(--bg-subtle, #f1f5f9)", border: "1px solid var(--border)", color: "var(--text-muted)", fontSize: "0.72rem", padding: "2px 8px", borderRadius: 4 }}>
        {"{ }"}
      </button>
      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000 }} onClick={() => setOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ position: "absolute", top: "100%", left: 0, width: 220, background: "var(--surface, #fff)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 10px 30px rgba(0,0,0,0.15)", maxHeight: 260, overflowY: "auto", zIndex: 1001 }}>
            {SPECIAL_VARS.map(v => (
              <div key={v.value} onClick={() => { onSelect(v.value); setOpen(false); }}
                style={{ padding: "6px 12px", fontSize: 12, cursor: "pointer", color: "var(--text)" }}
                onMouseEnter={e => { e.currentTarget.style.background = "var(--accent, #0f766e)"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text)"; }}
              >{v.label}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PrinterSelectorBtn({ value, onOpen }: { value: string; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} style={{ ...MINI, background: "var(--surface-alt, #fff)", border: "1px solid var(--border)", color: "var(--text)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      {value ? value.split(",").map(v => v.trim())[0] : "Seleccionar"}
    </button>
  );
}

type PaletteItem = { type: string; label: string; cat: string; factory: () => TicketBlock };
let _pid = 0;
const pid = () => `b${++_pid}`;
const PALETTE: PaletteItem[] = [
  { type: "text", cat: "Texto",    label: "Texto",       factory: () => ({ id: pid(), type: "text", text: "Texto aquí", align: "left", bold: false, size: "normal" }) },
  { type: "separator", cat: "Texto",    label: "Separador",   factory: () => ({ id: pid(), type: "separator", char: "-", align: "left" }) },
  { type: "total", cat: "Datos",    label: "Total",       factory: () => ({ id: pid(), type: "total", label: "TOTAL", value: "${TOTAL}", bold: true, align: "left" }) },
  { type: "qr", cat: "Datos",    label: "QR",          factory: () => ({ id: pid(), type: "qr", content: "${URL}", align: "center", qrSize: 80 }) },
  { type: "if", cat: "Lógica",   label: "Si (If)",     factory: () => ({ id: pid(), type: "if", expr: "${TOTAL}>0", text: "", bold: false, align: "left" }) },
  { type: "ifelse", cat: "Lógica",   label: "Si/Sino",     factory: () => ({ id: pid(), type: "ifelse", expr: "${TOTAL}>0", thenText: "SI", elseText: "NO", align: "left" }) },
  { type: "each", cat: "Tablas",   label: "Each (Lista)",factory: () => ({ id: pid(), type: "each", listVar: "ITEMS", showHeader: true, columns: [{ field: "DESC", label: "Descripción", width: "auto", align: "left" }, { field: "QTY", label: "Cant", width: 6, align: "right" }, { field: "TOTAL", label: "Total", width: 10, align: "right" }] }) },
  { type: "feed", cat: "Acciones", label: "Feed",        factory: () => ({ id: pid(), type: "feed", lines: 2 }) },
  { type: "cut", cat: "Acciones", label: "Corte",       factory: () => ({ id: pid(), type: "cut" }) },
  { type: "beep", cat: "Acciones", label: "Beep",        factory: () => ({ id: pid(), type: "beep" }) },
  { type: "open-drawer", cat: "Acciones", label: "Cajón",       factory: () => ({ id: pid(), type: "open-drawer" }) },
];
const CAT_COLOR: Record<string, string> = { Texto: "#0f766e", Datos: "#2563eb", Lógica: "#7c3aed", Tablas: "#f59e0b", Acciones: "#64748b" };

const ICONS: Record<string, React.ReactNode> = {
  text: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>,
  separator: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="12" x2="20" y2="12"/></svg>,
  total: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  qr: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="21" y1="15" x2="15" y2="21"/></svg>,
  if: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  ifelse: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
  each: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  feed: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>,
  cut: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>,
  beep: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>,
  "open-drawer": <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
};

function PaletteBtn({ item, onClick }: { item: PaletteItem; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button type="button" className="ticketPaletteBtn"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ display: "flex", alignItems: "center", width: "100%", textAlign: "left", padding: "0.5rem 0.8rem", fontSize: "0.78rem", border: "1px solid", borderColor: hover ? "var(--border)" : "transparent", borderRadius: 8, cursor: "pointer", background: hover ? "var(--surface-alt)" : "transparent", color: "var(--text)", transition: "all 0.15s ease", fontWeight: 500, position: "relative" }}
    >
      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", color: CAT_COLOR[item.cat] ?? "var(--muted)", marginRight: "0.6rem" }}>
        {ICONS[item.type]}
      </span>
      {item.label}
    </button>
  );
}

function extractVars(blocks: TicketBlock[]): string[] {
  const pattern = /\${([^}]+)}/g;
  const vars = new Set<string>();
  const builtin = ["DATE", "TIME", "NOW", "YEAR", "MONTH", "DAY"];
  for (const b of blocks) {
    const texts: string[] = [];
    if (b.type === "text") texts.push(b.text);
    if (b.type === "total") texts.push(b.label, b.value);
    if (b.type === "qr") texts.push(b.content);
    if (b.type === "if") texts.push(b.expr, b.text);
    if (b.type === "ifelse") texts.push(b.expr, b.thenText, b.elseText);
    if (b.type === "each") { texts.push(b.listVar); b.columns.forEach(c => { texts.push(c.field, c.label); }); }
    texts.forEach(t => { let m: RegExpExecArray | null; while ((m = pattern.exec(t)) !== null) { const n = m[1].trim(); if (!n.startsWith("!") && !builtin.includes(n.toUpperCase())) vars.add(n); } });
  }
  return Array.from(vars);
}

export default function TicketDesigner({ initialXml, onUpdate, apiBaseUrl }: TicketDesignerProps) {
  const store = useTicketStore();
  const { width, printers, selectedId, isPrinting, setBlocks, setWidth, setPrinters, setSelectedId, setIsPrinting, addBlock, updateBlock, deleteBlock, moveBlock } = store;
  const blocks = store.blocks as TicketBlock[];

  const init = useMemo(() => initialXml ? xmlToBlocks(initialXml) : { blocks: [], width: 42, printers: "" }, [initialXml]);

  useEffect(() => { BASE_BLOCK_PLUGINS.forEach(p => registerBlockPlugin(p)); }, []);

  const historyRef = useRef<TicketBlock[][]>([]);
  const historyIdxRef = useRef(-1);
  const isUndoingRef = useRef(false);

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [printData, setPrintData] = useState<Record<string, string>>({});
  const [printDataList, setPrintDataList] = useState<Record<string, string>[]>([]);
  const [printTab, setPrintTab] = useState<"manual" | "batch">("manual");
  const [availableLogicalPrinters, setAvailableLogicalPrinters] = useState<LogicalPrinterDto[]>([]);
  const [isPrinterSelectorOpen, setIsPrinterSelectorOpen] = useState(false);
  const [printerSearch, setPrinterSearch] = useState("");

  const detectedVars = useMemo(() => extractVars(blocks), [blocks]);
  const listVars = useMemo(() => {
    const s = new Set<string>();
    blocks.forEach(b => { if (b.type === "each") s.add(b.listVar); });
    return Array.from(s);
  }, [blocks]);
  const selected = blocks.find(b => b.id === selectedId) ?? null;

  const pushHistory = useCallback((next: TicketBlock[]) => {
    if (isUndoingRef.current) return;
    const h = historyRef.current;
    const newHistory = h.slice(0, historyIdxRef.current + 1);
    newHistory.push(next.map(b => ({ ...b })));
    if (newHistory.length > 50) newHistory.shift();
    historyRef.current = newHistory;
    historyIdxRef.current = newHistory.length - 1;
  }, []);

  const undo = useCallback(() => {
    if (historyIdxRef.current > 0) {
      historyIdxRef.current--;
      isUndoingRef.current = true;
      setBlocks(historyRef.current[historyIdxRef.current].map(b => ({ ...b })));
      isUndoingRef.current = false;
    }
  }, [setBlocks]);

  const redo = useCallback(() => {
    const h = historyRef.current;
    if (historyIdxRef.current < h.length - 1) {
      historyIdxRef.current++;
      isUndoingRef.current = true;
      setBlocks(h[historyIdxRef.current].map(b => ({ ...b })));
      isUndoingRef.current = false;
    }
  }, [setBlocks]);

  const lastSentXml = useRef("");
  const lastIncomingXml = useRef(initialXml || "");

  useEffect(() => {
    if (initialXml !== lastSentXml.current && initialXml !== lastIncomingXml.current) {
      if (init) {
        setBlocks(init.blocks);
        setWidth(init.width);
        setPrinters(init.printers);
        historyRef.current = [init.blocks.map(b => ({ ...b }))];
        historyIdxRef.current = 0;
        lastIncomingXml.current = initialXml || "";
      }
    }
  }, [initialXml, init, setBlocks, setWidth, setPrinters]);

  useEffect(() => {
    const xml = blocksToXml(blocks, width, printers);
    if (xml !== lastSentXml.current && xml !== lastIncomingXml.current) {
      lastSentXml.current = xml;
      onUpdate(xml);
    }
  }, [blocks, width, printers, onUpdate]);

  useEffect(() => {
    labelsApi.getLogicalPrinters()
      .then(p => setAvailableLogicalPrinters(p.filter(x => x.mediaType === "receipt" || !x.mediaType)))
      .catch(console.error);
  }, [apiBaseUrl]);

  useEffect(() => {
    const hk = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
      if (e.ctrlKey && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
      if (e.ctrlKey && e.key.toLowerCase() === 's') e.preventDefault();
    };
    window.addEventListener("keydown", hk);
    window.addEventListener("saelabel:history-undo", undo);
    window.addEventListener("saelabel:history-redo", redo);
    const tp = () => { setShowPrintModal(true); };
    window.addEventListener("ticket-trigger-print", tp);
    return () => {
      window.removeEventListener("keydown", hk);
      window.removeEventListener("saelabel:history-undo", undo);
      window.removeEventListener("saelabel:history-redo", redo);
      window.removeEventListener("ticket-trigger-print", tp);
    };
  }, [undo, redo]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("saelabel:history-change", {
      detail: { canUndo: historyIdxRef.current > 0, canRedo: historyIdxRef.current < historyRef.current.length - 1 }
    }));
  }, [blocks]);

  const handlePrint = useCallback(() => {
    const d: Record<string, string> = {};
    detectedVars.forEach(v => { d[v] = ""; });
    setPrintData(d);
    if (printDataList.length === 0) setPrintDataList([{}]);
    setShowPrintModal(true);
  }, [detectedVars, printDataList.length]);

  const executePrint = async () => {
    if (!printers) { alert("Selecciona al menos una impresora"); return; }
    setIsPrinting(true);
    try {
      const xml = blocksToXml(blocks, width, printers);
      let resolvedXml = replaceSpecialVariables(xml);
      if (printTab === "manual") {
        for (const [k, v] of Object.entries(printData)) {
          resolvedXml = resolvedXml.split("${" + k + "}").join(v);
        }
        const finalData: Record<string, string> = {};
        for (const lv of listVars) {
          finalData[lv + "_COUNT"] = String(printDataList.length);
          printDataList.forEach((row, ridx) => {
            for (const [k, v] of Object.entries(row)) {
              finalData[lv + "_" + ridx + "_" + k] = v || "";
            }
          });
        }
        Object.assign(finalData, printData);
        await labelsApi.print({
          xml: resolvedXml, printerName: printers.split(",")[0].trim(),
          copies: null, data: finalData,
        });
      } else {
        await labelsApi.print({
          xml: resolvedXml, printerName: printers.split(",")[0].trim(),
          copies: null, dataList: printDataList,
        });
      }
      alert("Comando de impresión enviado");
      setShowPrintModal(false);
    } catch (e: any) {
      alert("Error al imprimir: " + (e?.message || String(e)));
    } finally {
      setIsPrinting(false);
    }
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });
        setPrintDataList(data.map(r => { const o: Record<string, string> = {}; for (const k of Object.keys(r)) o[k] = String(r[k]); return o; }));
        setPrintTab("batch");
      } catch (err: any) {
        alert("Error al procesar Excel: " + (err?.message || String(err)));
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleAddBlock = useCallback((factory: () => TicketBlock) => {
    const nb = factory();
    const next = [...blocks, nb];
    setBlocks(next);
    pushHistory(next);
    setSelectedId(nb.id);
  }, [blocks, pushHistory, setBlocks, setSelectedId]);

  const handleUpdateBlock = useCallback((updated: TicketBlock) => {
    const next = blocks.map(b => b.id === updated.id ? updated : b);
    setBlocks(next);
    pushHistory(next);
  }, [blocks, pushHistory, setBlocks]);

  const handleDeleteBlock = useCallback((id: string) => {
    const next = blocks.filter(b => b.id !== id);
    setBlocks(next);
    pushHistory(next);
    setSelectedId(null);
  }, [blocks, pushHistory, setBlocks, setSelectedId]);

  const handleDrop = useCallback((dragId: string, targetId: string) => {
    if (dragId === targetId) return;
    const draggedIdx = blocks.findIndex(b => b.id === dragId);
    const targetIdx = blocks.findIndex(b => b.id === targetId);
    if (draggedIdx === -1 || targetIdx === -1) return;
    const next = [...blocks];
    const [item] = next.splice(draggedIdx, 1);
    next.splice(targetIdx, 0, item);
    setBlocks(next);
    pushHistory(next);
  }, [blocks, pushHistory, setBlocks]);

  const panelBg = "var(--bg-card, #ffffff)";
  const canvasBg = "var(--surface, #e8eaed)";
  const div = "1px solid var(--border, #e2e8f0)";
  const cats = [...new Set(PALETTE.map(p => p.cat))];

  return (
    <section className="ticketDesignerSection" style={{ flex:1, minHeight:0, display:"flex", flexDirection:"column", width:"100%", overflow:"hidden", background:canvasBg, color:"var(--text,#1e293b)", fontFamily:"'Inter', system-ui, sans-serif", "--panel-safe-bottom":"1rem" } as React.CSSProperties}>
      {showPrintModal && (
        <Portal>
        <div className="modalBackdrop" style={{ zIndex:2100 }}>
          <div className="modalCard" onClick={e=>e.stopPropagation()} style={{ width:"min(95%, 720px)", maxHeight:"90vh", display:"flex", flexDirection:"column" }}>
            <h3 style={{ borderBottom:"1px solid var(--border)", paddingBottom:"0.75rem", marginBottom:"0" }}>Preparar Impresión</h3>
            <div style={{ flex:1, overflowY:"auto", padding:"1.5rem" }}>
              <div style={{ display:"flex", gap:"1rem", marginBottom:"1.5rem" }}>
                <button onClick={()=>setPrintTab("manual")} style={{ flex:1, padding:"0.6rem", borderRadius:8, border:"none", fontWeight:600, cursor:"pointer", background:printTab==="manual"?"#0ea5e9":"#f1f5f9", color:printTab==="manual"?"#fff":"#64748b" }}>Valores Manuales</button>
                <button onClick={()=>setPrintTab("batch")} style={{ flex:1, padding:"0.6rem", borderRadius:8, border:"none", fontWeight:600, cursor:"pointer", background:printTab==="batch"?"#0ea5e9":"#f1f5f9", color:printTab==="batch"?"#fff":"#64748b" }}>Cargar Excel (Lote)</button>
              </div>
              {printTab === "manual" ? (
                <div style={{ display:"grid", gap:"1.2rem" }}>
                  {detectedVars.length > 0 && detectedVars.map(v => (
                    <label key={v} style={{ display:"flex", flexDirection:"column", gap:"0.5rem", fontSize:"0.8rem", fontWeight:600 }}>
                      {v}:
                      <input type="text" value={printData[v]||""} onChange={e=>setPrintData({...printData,[v]:e.target.value})}
                        style={{ padding:"0.5rem", borderRadius:6, border:"1px solid var(--border)", background:"var(--bg-input, transparent)", color:"var(--text)" }} />
                    </label>
                  ))}
                  {listVars.map(lv => (
                    <div key={lv} style={{ background:"var(--bg-subtle,#f8fafc)", padding:"0.8rem", borderRadius:8, border:"1px solid var(--border)" }}>
                      <h4 style={{ margin:"0 0 0.8rem", fontSize:"0.85rem", fontWeight:700 }}>📋 {lv} (Cant: {printDataList.length})</h4>
                      <div style={{ display:"grid", gap:"0.5rem" }}>
                        {printDataList.map((row, ridx) => (
                          <div key={ridx} style={{ display:"grid", gridTemplateColumns:"1fr 30px", gap:"0.5rem", alignItems:"center" }}>
                            <input type="text" value={Object.entries(row).map(([k,v])=>`${k}: ${v}`).join(", ")}
                              readOnly style={{ ...INP, fontSize:"0.75rem" }} />
                            <button type="button" onClick={()=>setPrintDataList(printDataList.filter((_,i)=>i!==ridx))}
                              style={{ background:"none", border:"none", color:"#ef4444", cursor:"pointer", fontSize:16 }}>×</button>
                          </div>
                        ))}
                      </div>
                      <button type="button" onClick={()=>setPrintDataList([...printDataList,{}])}
                        style={{ marginTop:"0.5rem", ...MINI, background:"#0ea5e9", color:"#fff", border:"none" }}>+ Agregar Fila</button>
                    </div>
                  ))}
                  {detectedVars.length === 0 && listVars.length === 0 && (
                    <div style={{ padding:"1rem", textAlign:"center", color:"var(--muted)" }}>Este tiquete no tiene variables detectadas.</div>
                  )}
                </div>
              ) : (
                <div style={{ display:"grid", gap:"1rem" }}>
                  <input type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} style={{ fontSize:"0.8rem" }} />
                  {printDataList.length > 0 && <div style={{ fontSize:"0.8rem", color:"var(--muted)" }}>{printDataList.length} filas cargadas desde Excel.</div>}
                </div>
              )}
            </div>
            <div className="modalActions" style={{ display:"flex", gap:"0.5rem", justifyContent:"flex-end", padding:"0.75rem 1.5rem", borderTop:"1px solid var(--border)" }}>
              <button className="secondary" onClick={()=>setShowPrintModal(false)}>Cancelar</button>
              <button className="primary" onClick={executePrint} disabled={isPrinting}>{isPrinting?"Imprimiendo...":"Enviar a Impresora"}</button>
            </div>
          </div>
        </div>
        </Portal>
      )}

      {showHelpModal && (
        <Portal>
        <div className="modalBackdrop" style={{ zIndex:2200 }}>
          <div className="modalCard" onClick={e=>e.stopPropagation()} style={{ width:"640px", maxHeight:"85vh", overflow:"auto", padding:"2rem" }}>
            <h3>Guía de Uso</h3>
            <section style={{ marginBottom:"1.5rem" }}><h4>Motor XML</h4><p>Los tiquetes usan XML con tags: text, separator, total, qr, feed, cut, beep, open-drawer, if, ifelse, each. Cada bloque acepta el atributo showIf para visibilidad condicional.</p></section>
            <section style={{ marginBottom:"1.5rem" }}><h4>Variables de Sistema</h4><p>Usa ${"{!date}"}, ${"{!time}"}, etc. para datos dinámicos.</p></section>
            <section style={{ marginBottom:"1.5rem" }}><h4>Each Block</h4><p>Define columnas con field, label, width. El preview muestra datos demo.</p></section>
            <div className="modalActions"><button className="primary" onClick={()=>setShowHelpModal(false)} style={{ padding:"0.6rem 2rem" }}>Entendido</button></div>
          </div>
        </div>
        </Portal>
      )}

      <div className="ticketToolbar" style={{ display:"flex", alignItems:"center", gap:"0.75rem", padding:"0.75rem 1.25rem", background:"var(--bg-card)", borderBottom:"1px solid var(--border)", flexShrink:0, boxShadow:"0 2px 10px rgba(0,0,0,0.05)" }}>
        <button type="button" className="primary" onClick={handlePrint} disabled={isPrinting}
          style={{ display:"flex", alignItems:"center", gap:"0.5rem", padding:"0.6rem 1.25rem", fontSize:"0.85rem", borderRadius: "8px", fontWeight: 600, transition: "transform 0.15s ease" }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
          🖨 {isPrinting?"Imprimiendo...":"Imprimir"}
        </button>
        <div style={{ width:1, height:24, background:"var(--border)", opacity: 0.5 }} />
        <label style={{ fontSize:"0.85rem", display:"flex", alignItems:"center", gap:"0.5rem", fontWeight:600, color: "var(--text)" }}>
          Tamaño:
          <select value={width === 32 ? 58 : 80} onChange={e=>setWidth(e.target.value==="58"?32:42)}
            style={{ padding:"0.4rem 0.75rem", border:"1px solid var(--border)", borderRadius:8, background:"var(--surface-alt)", color:"var(--text)", cursor:"pointer", fontWeight:600, outline: "none", transition: "border-color 0.2s" }}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}>
            <option value={80}>80 mm (42 col)</option>
            <option value={58}>58 mm (32 col)</option>
          </select>
        </label>
        <div style={{ width:1, height:24, background:"var(--border)", opacity: 0.5 }} />
        <label style={{ fontSize:"0.85rem", display:"flex", alignItems:"center", gap:"0.5rem", fontWeight:600, color: "var(--text)" }}>
          Impresoras:
          <PrinterSelectorBtn value={printers} onOpen={()=>setIsPrinterSelectorOpen(true)} />
        </label>
        <div style={{ flex:1 }} />
        <button onClick={()=>setShowHelpModal(true)} style={{ ...MINI, background:"var(--accent)", color:"#fff", border:"none", borderRadius:"50%", width:32, height:32, fontWeight:800, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(15, 118, 110, 0.3)', cursor: 'pointer', transition: 'transform 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>?</button>
      </div>

      <div style={{ flex:1, minHeight: 0, display:"grid", gridTemplateColumns:"180px 240px 1fr 380px", gridTemplateRows:"minmax(0, 1fr)", overflow:"hidden" }}>
        <aside className="ticketPalette" style={{ minHeight: 0, background:"var(--bg-card)", borderRight:"1px solid var(--border)", overflow:"auto", padding:"1rem 0.75rem var(--panel-safe-bottom) 0.75rem" }}>
          {cats.map(cat => (
            <div key={cat} style={{ marginBottom:"1.2rem" }}>
              <p style={{ fontSize:"0.65rem", fontWeight:800, letterSpacing:"0.1em", textTransform:"uppercase", color:CAT_COLOR[cat]??"var(--muted)", margin:"0 0 0.5rem", paddingLeft:4 }}>{cat}</p>
              <div style={{ display: "grid", gap: "0.25rem" }}>
                {PALETTE.filter(p=>p.cat===cat).map(item=>(<PaletteBtn key={item.label} item={item} onClick={()=>handleAddBlock(item.factory)} />))}
              </div>
            </div>
          ))}
        </aside>

        <aside className="ticketStructure" style={{ minHeight: 0, background:"var(--surface-alt)", borderRight:"1px solid var(--border)", overflow:"auto", padding:"1rem 0.75rem var(--panel-safe-bottom) 0.75rem" }}>
          <p style={{ fontSize:"0.65rem", fontWeight:800, letterSpacing:"0.1em", textTransform:"uppercase", color:"var(--muted)", margin:"0 0 0.8rem", paddingLeft:4 }}>Estructura</p>
          <TicketTree
            nodes={blocks}
            onSelect={(id) => setSelectedId(id)}
            onDelete={handleDeleteBlock}
            onDrop={handleDrop}
            onToggleCollapse={() => {}}
          />
        </aside>

        <div className="ticketCanvasArea" style={{ minHeight: 0, overflow: "auto", background: "var(--surface)", backgroundImage: "radial-gradient(var(--border) 1px, transparent 1px)", backgroundSize: "20px 20px", padding: "3rem 1.5rem var(--panel-safe-bottom) 1.5rem", textAlign: "center" }}>
          <div style={{ background: "#fff", boxShadow: "0 20px 40px rgba(0,0,0,0.1), 0 0 0 1px var(--border)", borderRadius: "2px", overflow: "hidden", margin: "0 auto 3rem auto", display: "inline-block", textAlign: "left" }}>
            <TicketPreview blocks={blocks} width={width} selectedId={selectedId} onSelect={(id) => setSelectedId(id)} />
          </div>
        </div>

        <aside className="ticketProperties" style={{ minHeight: 0, background:"var(--bg-card)", borderLeft:"1px solid var(--border)", overflow:"auto", padding:"1.2rem 1.5rem var(--panel-safe-bottom) 1.5rem", boxShadow: "-4px 0 15px rgba(0,0,0,0.02)" }}>
          <p style={{ fontSize:"0.65rem", fontWeight:800, letterSpacing:"0.1em", textTransform:"uppercase", color:"var(--muted)", margin:"0 0 1rem" }}>Propiedades</p>
          {selected ? (
            <TicketPropertiesPanel block={selected} onChange={handleUpdateBlock} />
          ) : (
            <div style={{ color:"var(--muted)", fontSize:"0.85rem", textAlign:"center", paddingTop:"4rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
              <div style={{ fontSize:"2rem", opacity:0.3, background: "var(--surface-alt)", width: "64px", height: "64px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>⚙️</div>
              <span>Selecciona un bloque para editar sus propiedades</span>
            </div>
          )}
        </aside>
      </div>

      {isPrinterSelectorOpen && (
        <Portal>
        <div className="modalBackdrop" style={{ zIndex:2200 }}>
          <div className="modalCard" onClick={e=>e.stopPropagation()} style={{ width:"420px" }}>
            <h3 style={{ borderBottom:"1px solid var(--border)", paddingBottom:"0.75rem", marginBottom:"1rem" }}>Seleccionar Impresoras</h3>
            <div style={{ marginBottom:"1rem" }}><input autoFocus placeholder="Buscar impresora..." value={printerSearch} onChange={e=>setPrinterSearch(e.target.value)} style={{ ...INP }} /></div>
            <div style={{ maxHeight:"350px", overflow:"auto", border:"1px solid var(--border)", borderRadius:12 }}>
              {availableLogicalPrinters.filter(o=>o.name.toLowerCase().includes(printerSearch.toLowerCase())).map(o=>{
                const isSelected = printers.split(",").map(v=>v.trim()).includes(o.name);
                return (
                  <div key={o.id} onClick={()=>{
                    const list = printers.split(",").map(v=>v.trim()).filter(Boolean);
                    setPrinters(list.includes(o.name)?list.filter((n:string)=>n!==o.name).join(", "):[...list,o.name].join(", "));
                  }} style={{ padding:"12px 15px", cursor:"pointer", display:"flex", alignItems:"center", gap:"12px", borderBottom:"1px solid #f1f5f9", background:isSelected?"var(--bg-subtle)":"var(--surface)" }}>
                    <div style={{ width:20, height:20, borderRadius:6, border:"2px solid", borderColor:isSelected?"var(--accent)":"#cbd5e1", background:isSelected?"var(--accent)":"transparent", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      {isSelected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                    <span style={{ fontSize:"0.88rem", fontWeight:isSelected?600:500, color:isSelected?"var(--accent)":"inherit" }}>{o.name}</span>
                  </div>
                );
              })}
              {availableLogicalPrinters.length===0 && <div style={{ padding:"40px 20px", color:"#94a3b8", textAlign:"center" }}>No hay impresoras configuradas</div>}
            </div>
            <div className="modalActions"><button className="primary" onClick={()=>setIsPrinterSelectorOpen(false)} style={{ width:"100%", padding:"0.75rem" }}>Aceptar Selección</button></div>
          </div>
        </div>
        </Portal>
      )}
    </section>
  );
}
