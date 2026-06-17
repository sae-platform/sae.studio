import { useState, useEffect } from "react";
import QRCode from "qrcode";
import type { BlockPlugin, TicketBlock } from "./types";
import { replaceSpecialVariables } from "@/modules/document-engine";

let _bid = 0;
function uid(): string { return `b${++_bid}`; }
export function resetBlockUid(): void { _bid = 0; }

// ── Shared rendering helpers ──

const baseStyle: React.CSSProperties = {
  whiteSpace: "pre-wrap", wordBreak: "break-all",
  overflowWrap: "anywhere", lineHeight: 1.55,
};

function parseInlineMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const lines = text.split("\n");

  for (let li = 0; li < lines.length; li++) {
    if (li > 0) parts.push(<br key={`br-${li}`} />);

    const line = lines[li];

    // Prefix headings: # Title, ## Subtitle, ### Section, #### Subsection
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      const sizes = ["1.5em", "1.3em", "1.15em", "1.05em"];
      parts.push(
        <span key={`h-${li}`} style={{
          fontSize: sizes[level - 1] ?? "1em",
          fontWeight: 800,
          display: "block",
          lineHeight: 1.25,
        }}>
          {content}
        </span>
      );
      continue;
    }

    // Delimited inline tags: ##text##, ###text###, ####text####, **bold**, ***extra***
    const regex = /(\*\*\*([^*]+)\*\*\*|\*\*([^*]+)\*\*|####([^#]+)####|###([^#]+)###|##([^#]+)##)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    const lineParts: React.ReactNode[] = [];

    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) lineParts.push(line.slice(lastIndex, match.index));
      if (match[1].startsWith("***")) lineParts.push(<span key={`${li}-${match.index}`} style={{ fontWeight: 900 }}>{match[2]}</span>);
      else if (match[1].startsWith("**")) lineParts.push(<strong key={`${li}-${match.index}`}>{match[3]}</strong>);
      else if (match[1].startsWith("####")) lineParts.push(<span key={`${li}-${match.index}`} style={{ fontSize: "1.4em", fontWeight: 800, display: "block" }}>{match[4]}</span>);
      else if (match[1].startsWith("###")) lineParts.push(<span key={`${li}-${match.index}`} style={{ fontSize: "1.2em", fontWeight: 800, display: "block" }}>{match[5]}</span>);
      else if (match[1].startsWith("##")) lineParts.push(<span key={`${li}-${match.index}`} style={{ fontSize: "1.05em", fontWeight: 700 }}>{match[6]}</span>);
      lastIndex = match.index + match[1].length;
    }
    if (lastIndex < line.length) lineParts.push(line.slice(lastIndex));
    parts.push(...(lineParts.length > 0 ? lineParts : [line]));
  }

  return parts.length > 0 ? parts : [text];
}

function formatText(text: string, bold: boolean, extraBold: boolean, size: string): { parts: React.ReactNode[]; css: React.CSSProperties } {
  const css: React.CSSProperties = {};
  if (extraBold) { css.fontWeight = "bold"; css.textShadow = "0px 0px 0.6px currentColor"; }
  else if (bold) { css.fontWeight = "bold"; }
  if (size === "medium") css.fontSize = "1.05em";
  else if (size === "large") css.fontSize = "1.2em";
  else if (size === "extra-large") css.fontSize = "1.4em";
  return { parts: parseInlineMarkdown(text), css };
}

function QrBlock({ content }: { content: string }) {
  const [dataUrl, setDataUrl] = useState("");
  useEffect(() => {
    QRCode.toDataURL(content || "https://example.com", { margin: 1, width: 120 })
      .then((url) => setDataUrl(url)).catch(() => setDataUrl(""));
  }, [content]);
  return dataUrl
    ? <img src={dataUrl} alt="QR" style={{ display: "block", margin: "0 auto", imageRendering: "pixelated", width: 80, height: 80 }} />
    : <div style={{ textAlign: "center", opacity: 0.3 }}>[QR]</div>;
}

function calcColWidths(cols: Array<{ width: number | string }>, total: number): number[] {
  const fixed = cols.reduce((s, c) => s + (c.width === "auto" ? 0 : (c.width as number)), 0);
  const autoCount = cols.filter((c) => c.width === "auto").length;
  const remaining = total - fixed - (cols.length - 1);
  const autoWidth = autoCount > 0 ? Math.max(4, Math.floor(remaining / autoCount)) : 0;
  return cols.map((c) => (c.width === "auto" ? autoWidth : (c.width as number)));
}

const selOutline: React.CSSProperties = { outline: "1px solid var(--accent)" };

// ── Shared Inspector UI primitives ──

const L: React.CSSProperties = {
  display: "block", marginBottom: "0.6rem", fontSize: "0.78rem",
  fontWeight: 600, color: "var(--text-muted, #64748b)",
  textTransform: "uppercase", letterSpacing: "0.05em",
};
const I: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.55rem 0.6rem", boxSizing: "border-box",
  borderRadius: "8px", border: "1px solid var(--border, #e5e7eb)",
  background: "var(--surface-alt, #f8fafc)", color: "var(--text)",
  fontSize: "0.85rem", outline: "none", fontFamily: "var(--font-mono, 'Inter', system-ui)",
  transition: "border-color 0.2s, box-shadow 0.2s",
};

function ShowIfField({ block, onChange }: { block: TicketBlock; onChange: (b: TicketBlock) => void }) {
  return (
    <div style={{ marginTop: "0.75rem", paddingTop: "0.5rem", borderTop: "1px dashed var(--border, #e2e8f0)" }}>
      <label style={{ ...L, color: "var(--muted, #64748b)", fontWeight: 400 }}>
        Mostrar si (condición)
        <input style={I} value={(block.showIf as string) ?? ""} placeholder="Ej: ${TOTAL}>0"
          onChange={(e) => onChange({ ...block, showIf: e.target.value || undefined })} />
      </label>
    </div>
  );
}

function Chk({ val, onChange, lbl }: { val: boolean; onChange: (v: boolean) => void; lbl: string }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", marginTop: "0.4rem" }}>
      <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text)" }}>{lbl}</span>
      <div style={{ position: "relative", width: 32, height: 18 }}>
        <input type="checkbox" checked={val} onChange={(e) => onChange(e.target.checked)}
          style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", cursor: "pointer" }} />
        <div style={{ width: 32, height: 18, borderRadius: 9,
          background: val ? "var(--accent, #0f766e)" : "var(--border, #d1d5db)", transition: "background 0.2s" }} />
        <div style={{ position: "absolute", top: 2, left: val ? 16 : 2, width: 14, height: 14,
          borderRadius: 7, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
          transition: "left 0.2s cubic-bezier(0.4, 0, 0.2, 1)" }} />
      </div>
    </label>
  );
}

function Sel({ val, onChange, opts, style }: { val: string; onChange: (v: string) => void; opts: string[]; style?: React.CSSProperties }) {
  return (
    <select style={{ ...I, marginTop: "0.25rem", ...style }} value={val} onChange={(e) => onChange(e.target.value)}>
      {opts.map((o) => <option key={o}>{o}</option>)}
    </select>
  );
}

function Fld({ label, node }: { label: string; node: React.ReactNode }) {
  return <label style={L}>{label}{node}</label>;
}

function BoldExtra({ block, onChange }: { block: Record<string, unknown>; onChange: (b: TicketBlock) => void }) {
  const bold = (block.bold as boolean) ?? false;
  const extra = (block.extraBold as boolean) ?? false;
  return (
    <div style={{ display: "flex", gap: "1rem" }}>
      <Chk val={bold} onChange={(v) => onChange({ ...block, bold: v, extraBold: v ? false : extra } as unknown as TicketBlock)} lbl="Negrita" />
      <Chk val={extra} onChange={(v) => onChange({ ...block, extraBold: v, bold: v ? false : bold } as unknown as TicketBlock)} lbl="Negrita Intensa" />
    </div>
  );
}

// ── Plugins ──

const TEXT_PLUGIN: BlockPlugin = {
  type: "text",
  metadata: { label: "Texto", icon: "T", category: "text" },
  createDefault(): TicketBlock {
    return { id: uid(), type: "text", text: "Texto aquí", align: "left", bold: false, size: "normal" };
  },
  Renderer: ({ block, selected, onSelect }) => {
    const text = replaceSpecialVariables((block.text as string) ?? "");
    const { parts, css } = formatText(text, (block.bold as boolean) ?? false, (block.extraBold as boolean) ?? false, (block.size as string) ?? "normal");
    const align = (block.align as string) ?? "left";
    return (
      <div onClick={onSelect} style={{ ...baseStyle, ...css, cursor: "pointer", textAlign: align as any, ...(selected ? selOutline : {}) }}>
        {parts}
      </div>
    );
  },
  Inspector: ({ block, onChange }) => (
    <div style={{ display: "grid", gap: "1.2rem" }}>
      <Fld label="Contenido" node={<textarea style={{ ...I, height: 80, resize: "vertical" }} value={(block.text as string) ?? ""}
        onChange={(e) => onChange({ ...block, text: e.target.value })} />} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
        <Fld label="Alineación" node={<Sel val={(block.align as string) ?? "left"} onChange={(v) => onChange({ ...block, align: v })}
          opts={["left", "center", "right"]} />} />
        <Fld label="Tamaño" node={<Sel val={(block.size as string) ?? "normal"} onChange={(v) => onChange({ ...block, size: v })}
          opts={["normal", "medium", "large", "extra-large"]} />} />
      </div>
      <BoldExtra block={block} onChange={onChange} />
      <ShowIfField block={block} onChange={onChange} />
    </div>
  ),
};

const SEPARATOR_PLUGIN: BlockPlugin = {
  type: "separator",
  metadata: { label: "Separador", icon: "—", category: "text" },
  createDefault(): TicketBlock {
    return { id: uid(), type: "separator", char: "-", align: "left" };
  },
  Renderer: ({ block, width, selected, onSelect }) => {
    const char = (block.char as string) ?? "-";
    return (
      <div onClick={onSelect} style={{ ...baseStyle, cursor: "pointer", ...(selected ? selOutline : {}) }}>
        {char.repeat(width)}
      </div>
    );
  },
  Inspector: ({ block, onChange }) => (
    <div style={{ display: "grid", gap: "1.2rem" }}>
      <Fld label="Carácter" node={<input style={I} value={(block.char as string) ?? "-"}
        placeholder="-" onChange={(e) => onChange({ ...block, char: e.target.value })} />} />
      <Fld label="Alineación" node={<Sel val={(block.align as string) ?? "left"} onChange={(v) => onChange({ ...block, align: v })}
        opts={["left", "center", "right"]} />} />
      <ShowIfField block={block} onChange={onChange} />
    </div>
  ),
};

const TOTAL_PLUGIN: BlockPlugin = {
  type: "total",
  metadata: { label: "Total", icon: "$", category: "data" },
  createDefault(): TicketBlock {
    return { id: uid(), type: "total", label: "TOTAL", value: "${TOTAL}", bold: true, align: "left" };
  },
  Renderer: ({ block, selected, onSelect }) => {
    const label = replaceSpecialVariables((block.label as string) ?? "TOTAL");
    const value = replaceSpecialVariables((block.value as string) ?? "0");
    const isBold = (block.bold as boolean) ?? false;
    const isExtra = (block.extraBold as boolean) ?? false;
    return (
      <div onClick={onSelect} style={{
        ...baseStyle, cursor: "pointer",
        fontWeight: isExtra || isBold ? "bold" : "normal",
        textShadow: isExtra ? "0px 0px 0.6px currentColor" : "none",
        display: "flex", justifyContent: "space-between",
        ...(selected ? selOutline : {}),
      }}>
        <span>{label}</span>
        <span>{value}</span>
      </div>
    );
  },
  Inspector: ({ block, onChange }) => (
    <div style={{ display: "grid", gap: "1.2rem" }}>
      <Fld label="Etiqueta" node={<input style={I} value={(block.label as string) ?? "TOTAL"}
        placeholder="TOTAL" onChange={(e) => onChange({ ...block, label: e.target.value })} />} />
      <Fld label="Valor" node={<input style={I} value={(block.value as string) ?? "0"}
        placeholder="${TOTAL}" onChange={(e) => onChange({ ...block, value: e.target.value })} />} />
      <Fld label="Alineación" node={<Sel val={(block.align as string) ?? "left"} onChange={(v) => onChange({ ...block, align: v })}
        opts={["left", "center", "right"]} />} />
      <BoldExtra block={block} onChange={onChange} />
      <ShowIfField block={block} onChange={onChange} />
    </div>
  ),
};

const QR_PLUGIN: BlockPlugin = {
  type: "qr",
  metadata: { label: "QR", icon: "▣", category: "data" },
  createDefault(): TicketBlock {
    return { id: uid(), type: "qr", content: "${URL}", align: "center", qrSize: 80 };
  },
  Renderer: ({ block, selected, onSelect }) => (
    <div onClick={onSelect} style={{ cursor: "pointer", textAlign: "center", padding: "4px 0", ...(selected ? selOutline : {}) }}>
      <QrBlock content={(block.content as string) ?? ""} />
    </div>
  ),
  Inspector: ({ block, onChange }) => (
    <div style={{ display: "grid", gap: "1.2rem" }}>
      <Fld label="Contenido" node={<input style={I} value={(block.content as string) ?? ""}
        placeholder="${URL}" onChange={(e) => onChange({ ...block, content: e.target.value })} />} />
      <Fld label="Alineación" node={<Sel val={(block.align as string) ?? "center"} onChange={(v) => onChange({ ...block, align: v })}
        opts={["left", "center", "right"]} />} />
      <Fld label="Tamaño px" node={<input type="number" style={I} min={32} max={200} step={8}
        value={(block.qrSize as number) ?? 80} onChange={(e) => onChange({ ...block, qrSize: parseInt(e.target.value) || 80 })} />} />
      <ShowIfField block={block} onChange={onChange} />
    </div>
  ),
};

const IF_PLUGIN: BlockPlugin = {
  type: "if",
  metadata: { label: "Si (If)", icon: "?", category: "logic" },
  createDefault(): TicketBlock {
    return { id: uid(), type: "if", expr: "${TOTAL}>0", text: "", bold: false, align: "left" };
  },
  Renderer: ({ block, selected }) => {
    const expr = (block.expr as string) ?? "";
    const text = replaceSpecialVariables((block.text as string) ?? "");
    const { parts, css } = formatText(text, (block.bold as boolean) ?? false, (block.extraBold as boolean) ?? false, (block.size as string) ?? "normal");
    return (
      <div style={{ ...baseStyle, ...css, border: "1px dashed #3b82f6", padding: "2px 4px", borderRadius: 4, ...(selected ? selOutline : {}) }}>
        <span style={{ fontSize: "0.65rem", background: "#dbeafe", padding: "0 4px", borderRadius: 3, marginRight: 4 }}>IF: {expr}</span>
        {parts}
      </div>
    );
  },
  Inspector: ({ block, onChange }) => (
    <div style={{ display: "grid", gap: "1.2rem" }}>
      <Fld label="Condición" node={<input style={I} value={(block.expr as string) ?? ""}
        placeholder="total > 100" onChange={(e) => onChange({ ...block, expr: e.target.value })} />} />
      <Fld label="Texto (si cumple)" node={<input style={I} value={(block.text as string) ?? ""}
        onChange={(e) => onChange({ ...block, text: e.target.value })} />} />
      <Fld label="Alineación" node={<Sel val={(block.align as string) ?? "left"} onChange={(v) => onChange({ ...block, align: v })}
        opts={["left", "center", "right"]} />} />
      <Fld label="Tamaño" node={<Sel val={(block.size as string) ?? "normal"} onChange={(v) => onChange({ ...block, size: v })}
        opts={["normal", "medium", "large", "extra-large"]} />} />
      <BoldExtra block={block} onChange={onChange} />
      <ShowIfField block={block} onChange={onChange} />
    </div>
  ),
};

const IFELSE_PLUGIN: BlockPlugin = {
  type: "ifelse",
  metadata: { label: "Si/Sino", icon: "?÷", category: "logic" },
  createDefault(): TicketBlock {
    return { id: uid(), type: "ifelse", expr: "${TOTAL}>0", thenText: "SI", elseText: "NO", align: "left" };
  },
  Renderer: ({ block, selected }) => {
    const expr = (block.expr as string) ?? "";
    const thenText = replaceSpecialVariables((block.thenText as string) ?? "");
    const elseText = replaceSpecialVariables((block.elseText as string) ?? "");
    const size = (block.size as string) ?? "normal";
    const { parts: thenParts, css: thenCss } = formatText(thenText, false, false, size);
    const { parts: elseParts, css: elseCss } = formatText(elseText, false, false, size);
    return (
      <div style={{ ...baseStyle, border: "1px dashed #3b82f6", padding: "2px 4px", borderRadius: 4, ...(selected ? selOutline : {}) }}>
        <span style={{ fontSize: "0.65rem", background: "#dbeafe", padding: "0 4px", borderRadius: 3, marginRight: 4 }}>IF/ELSE: {expr}</span>
        <span style={{ color: "#059669", ...thenCss }}>{thenParts}</span>
        {" / "}
        <span style={{ color: "#dc2626", ...elseCss }}>{elseParts}</span>
      </div>
    );
  },
  Inspector: ({ block, onChange }) => (
    <div style={{ display: "grid", gap: "1.2rem" }}>
      <Fld label="Condición" node={<input style={I} value={(block.expr as string) ?? ""}
        placeholder="${VAR}" onChange={(e) => onChange({ ...block, expr: e.target.value })} />} />
      <Fld label="Si verdadero (then)" node={<input style={I} value={(block.thenText as string) ?? ""}
        placeholder="Texto verdadero" onChange={(e) => onChange({ ...block, thenText: e.target.value })} />} />
      <Fld label="Si falso (else)" node={<input style={I} value={(block.elseText as string) ?? ""}
        placeholder="Texto falso" onChange={(e) => onChange({ ...block, elseText: e.target.value })} />} />
      <Fld label="Alineación" node={<Sel val={(block.align as string) ?? "left"} onChange={(v) => onChange({ ...block, align: v })}
        opts={["left", "center", "right"]} />} />
      <Fld label="Tamaño" node={<Sel val={(block.size as string) ?? "normal"} onChange={(v) => onChange({ ...block, size: v })}
        opts={["normal", "medium", "large", "extra-large"]} />} />
      <BoldExtra block={block} onChange={onChange} />
      <ShowIfField block={block} onChange={onChange} />
    </div>
  ),
};

const EACH_PLUGIN: BlockPlugin = {
  type: "each",
  metadata: { label: "Lista", icon: "≡", category: "data" },
  createDefault(): TicketBlock {
    return {
      id: uid(), type: "each", listVar: "ITEMS", showHeader: true,
      columns: [
        { field: "DESC", label: "Descripción", width: "auto", align: "left" },
        { field: "QTY", label: "Cant", width: 6, align: "right" },
        { field: "TOTAL", label: "Total", width: 10, align: "right" },
      ],
    };
  },
  Renderer: ({ block, width, selected, onSelect }) => {
    const cols = (block.columns as Array<Record<string, unknown>>) ?? [];
    const showHeader = (block.showHeader as boolean) ?? true;
    const colWidths = calcColWidths(cols as Array<{ width: number | string }>, width);
    return (
      <div onClick={onSelect} style={{ cursor: "pointer", ...(selected ? selOutline : {}) }}>
        {showHeader && (
          <div style={{ ...baseStyle, fontWeight: "bold", display: "flex" }}>
            {cols.map((col, i) => {
              const b = col.bold as boolean;
              const e = col.extraBold as boolean;
              return (
                <span key={i} style={{
                  width: colWidths[i] * 8, textAlign: ((col.align as string) ?? "left") as any, flexShrink: 0,
                  fontWeight: b ? "bold" : "normal",
                  textShadow: e ? "0px 0px 0.6px currentColor" : "none",
                }}>
                  {col.label as string}
                </span>
              );
            })}
          </div>
        )}
        <div style={{ ...baseStyle, display: "flex" }}>
          {cols.map((col, i) => (
            <span key={i} style={{ width: colWidths[i] * 8, textAlign: ((col.align as string) ?? "left") as any, flexShrink: 0 }}>
              {i === 0 ? "Item Demo" : "0.00"}
            </span>
          ))}
        </div>
      </div>
    );
  },
  Inspector: ({ block, onChange }) => {
    const columns = (block.columns as Array<Record<string, unknown>>) ?? [];
    const listVar = (block.listVar as string) ?? "ITEMS";
    const showHeader = (block.showHeader as boolean) ?? true;
    const childField = (block.childField as string) ?? "";
    const addCol = () => onChange({ ...block, columns: [...columns, { field: "CAMPO", label: "Campo", width: "auto", align: "left" }] });
    const delCol = (i: number) => onChange({ ...block, columns: columns.filter((_, j) => j !== i) });
    const updCol = (i: number, c: Record<string, unknown>) => onChange({
      ...block, columns: columns.map((col, j) => j === i ? { ...col, ...c } : col),
    });
    return (
      <div style={{ display: "grid", gap: "0.5rem" }}>
        <Fld label="Variable Lista" node={<input style={I} value={listVar} placeholder="ITEMS"
          onChange={(e) => onChange({ ...block, listVar: e.target.value })} />} />
        <Fld label="Campo Sub-items" node={<input style={I} value={childField} placeholder="Opcional"
          onChange={(e) => onChange({ ...block, childField: e.target.value || undefined })} />} />
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <Chk val={showHeader} onChange={(v) => onChange({ ...block, showHeader: v })} lbl="Mostrar Header" />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)" }}>Columnas ({columns.length})</span>
            <button type="button" onClick={addCol}
              style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: 4, border: "1px solid var(--border)", cursor: "pointer", background: "var(--surface)" }}>+ Agregar</button>
          </div>
          <div style={{ display: "grid", gap: "0.3rem", maxHeight: 250, overflowY: "auto" }}>
            {columns.map((col, i) => (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "1fr 1fr 50px 24px", gap: "0.3rem", alignItems: "center",
                padding: "0.4rem 0.5rem", borderRadius: 6, border: "1px solid var(--border)",
                background: "var(--surface-alt, #f8fafc)", fontSize: "0.75rem",
              }}>
                <input style={{ ...I, padding: "0.25rem 0.3rem", fontSize: "0.72rem" }}
                  value={(col.field as string) ?? ""} placeholder="campo"
                  onChange={(e) => updCol(i, { ...col, field: e.target.value })} />
                <input style={{ ...I, padding: "0.25rem 0.3rem", fontSize: "0.72rem" }}
                  value={(col.label as string) ?? ""} placeholder="Etiqueta"
                  onChange={(e) => updCol(i, { ...col, label: e.target.value })} />
                <select style={{ ...I, padding: "0.25rem", fontSize: "0.72rem" }}
                  value={(col.align as string) ?? "left"}
                  onChange={(e) => updCol(i, { ...col, align: e.target.value })}>
                  <option value="left">Izq</option>
                  <option value="center">Cen</option>
                  <option value="right">Der</option>
                </select>
                <button type="button" onClick={() => delCol(i)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 14, padding: 0 }}>×</button>
              </div>
            ))}
          </div>
        </div>
        <ShowIfField block={block} onChange={onChange} />
      </div>
    );
  },
};

const FEED_PLUGIN: BlockPlugin = {
  type: "feed",
  metadata: { label: "Avance", icon: "↵", category: "action" },
  createDefault(): TicketBlock {
    return { id: uid(), type: "feed", lines: 2 };
  },
  Renderer: ({ block, selected }) => (
    <div style={{ ...baseStyle, ...(selected ? selOutline : {}) }}>
      {Array((block.lines as number) || 1).fill(null).map((_, i) => <br key={i} />)}
    </div>
  ),
  Inspector: ({ block, onChange }) => (
    <div style={{ display: "grid", gap: "1.2rem" }}>
      <Fld label="Líneas" node={<input type="number" style={I} min={1} max={10}
        value={(block.lines as number) ?? 1}
        onChange={(e) => onChange({ ...block, lines: parseInt(e.target.value) || 1 })} />} />
      <ShowIfField block={block} onChange={onChange} />
    </div>
  ),
};

const CUT_PLUGIN: BlockPlugin = {
  type: "cut",
  metadata: { label: "Corte", icon: "✂", category: "action" },
  createDefault(): TicketBlock {
    return { id: uid(), type: "cut" };
  },
  Renderer: ({ width }) => <div style={baseStyle}>{"─".repeat(width)} ✂</div>,
  Inspector: ({ block, onChange }) => (
    <div style={{ padding: "1rem", color: "var(--muted)", fontSize: "0.85rem", textAlign: "center" }}>
      Bloque "corte" sin propiedades editables
      <ShowIfField block={block} onChange={onChange} />
    </div>
  ),
};

const BEEP_PLUGIN: BlockPlugin = {
  type: "beep",
  metadata: { label: "Beep", icon: "♪", category: "action" },
  createDefault(): TicketBlock {
    return { id: uid(), type: "beep" };
  },
  Renderer: () => (
    <span style={{ display: "inline-block", padding: "1px 6px", borderRadius: 4, background: "#fef3c7", color: "#92400e", fontSize: "0.7rem", fontWeight: 700 }}>
      BEEP
    </span>
  ),
  Inspector: ({ block, onChange }) => (
    <div style={{ padding: "1rem", color: "var(--muted)", fontSize: "0.85rem", textAlign: "center" }}>
      Bloque "beep" sin propiedades editables
      <ShowIfField block={block} onChange={onChange} />
    </div>
  ),
};

const DRAWER_PLUGIN: BlockPlugin = {
  type: "open-drawer",
  metadata: { label: "Cajón", icon: "⏏", category: "action" },
  createDefault(): TicketBlock {
    return { id: uid(), type: "open-drawer" };
  },
  Renderer: () => (
    <span style={{ display: "inline-block", padding: "1px 6px", borderRadius: 4, background: "#ede9fe", color: "#5b21b6", fontSize: "0.7rem", fontWeight: 700 }}>
      ABRIR CAJÓN
    </span>
  ),
  Inspector: ({ block, onChange }) => (
    <div style={{ padding: "1rem", color: "var(--muted)", fontSize: "0.85rem", textAlign: "center" }}>
      Bloque "open-drawer" sin propiedades editables
      <ShowIfField block={block} onChange={onChange} />
    </div>
  ),
};

export const BASE_BLOCK_PLUGINS: BlockPlugin[] = [
  TEXT_PLUGIN, SEPARATOR_PLUGIN, TOTAL_PLUGIN, QR_PLUGIN,
  EACH_PLUGIN, IF_PLUGIN, IFELSE_PLUGIN,
  FEED_PLUGIN, CUT_PLUGIN, BEEP_PLUGIN, DRAWER_PLUGIN,
];
