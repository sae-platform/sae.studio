import { useMemo } from "react";
import type { DocumentElement } from "@/modules/document-engine/models/elements";
import type { RenderedElement } from "@/modules/document-engine/runtime/document-runner";

interface ElementRendererProps {
  element: DocumentElement;
  /** px per mm scale factor */
  scale: number;
  rendered?: RenderedElement;
}

export function ElementRenderer({ element, scale, rendered }: ElementRendererProps) {
  const el = element;

  if (el.type === "text") {
    const ta = el.align ?? "left";
    const va = el.verticalAlign === "middle" ? "center" : el.verticalAlign === "bottom" ? "flex-end" : "flex-start";
    const td = [
      el.underline ? "underline" : "",
      (el as any).strikethrough ? "line-through" : "",
      (el as any).overline ? "overline" : "",
    ].filter(Boolean).join(" ") || "none";
    const ag = (el as any).autoGrow;
    return (
      <div
        style={{
          width: "100%",
          height: ag ? "auto" : "100%",
          fontFamily: el.font ?? "Arial, sans-serif",
          fontSize: `${(el.size ?? 10) * scale * 0.352778}px`,
          fontWeight: el.bold ? "bold" : "normal",
          fontStyle: el.italic ? "italic" : "normal",
          textDecoration: td as any,
          color: el.color ?? "#1e293b",
          wordBreak: "break-word",
          overflow: ag ? "visible" : "hidden",
          whiteSpace: ag ? "normal" : "pre-wrap",
          lineHeight: (el as any).lineHeight ?? 1.3,
          letterSpacing: ((el as any).letterSpacing ?? 0) > 0 ? `${(el as any).letterSpacing}em` : undefined,
          textTransform: (el as any).textTransform !== "none" ? (el as any).textTransform : undefined,
          backgroundColor: (el as any).backgroundColor || undefined,
          padding: (el as any).padding ? `${(el as any).padding * scale * 0.352778}px` : undefined,
          opacity: el.hidden ? 0.3 : 1,
          display: "flex",
          alignItems: va as any,
        }}
      >
        <span style={{ width: "100%", textAlign: ta as any }}>
          {rendered?.resolvedContent ?? el.content}
        </span>
      </div>
    );
  }

  if (el.type === "image") {
    return (
      <div className="docEl__image">
        <span className="docEl__image-label">📷 {el.source}</span>
      </div>
    );
  }

  if (el.type === "barcode") {
    return (
      <div className="docEl__barcode">
        <div className="docEl__barcode-bars" />
        <span>{rendered?.resolvedContent ?? el.value}</span>
      </div>
    );
  }

  if (el.type === "qr") {
    return (
      <div className="docEl__qr">
        <svg viewBox="0 0 10 10" width="100%" height="100%">
          {/* Mini QR pattern */}
          {[0,1,2,3,4,5,6,7,8,9].map(r => [0,1,2,3,4,5,6,7,8,9].map(c => (
            ((r < 3 || r > 6) && (c < 3 || c > 6)) || (r === 4 && c === 4) || (r + c) % 3 === 0
              ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="currentColor" />
              : null
          )))}
        </svg>
      </div>
    );
  }

  if (el.type === "rectangle") {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: el.fillColor ?? "transparent",
          border: `${el.borderWidth ?? 1}px solid ${el.borderColor ?? "#334155"}`,
          borderRadius: el.borderRadius ? `${el.borderRadius * scale * 0.352778}px` : undefined,
          boxSizing: "border-box",
        }}
      />
    );
  }

  if (el.type === "ellipse") {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: el.fillColor ?? "transparent",
          border: `${el.borderWidth ?? 1}px solid ${el.borderColor ?? "#334155"}`,
          borderRadius: "999px",
          boxSizing: "border-box",
        }}
      />
    );
  }

  if (el.type === "line") {
    return (
      <hr
        style={{
          position: "absolute",
          margin: 0,
          padding: 0,
          border: 0,
          borderTop: `${el.lineWidth ?? 1}px solid ${el.color ?? "#334155"}`,
          width: "100%",
          top: "50%",
          transform: "translateY(-50%)",
        }}
      />
    );
  }

  if (el.type === "table") {
    const rows = rendered?.rows as any[] | undefined;
    return (
      <div className="docEl__table">
        <div className="docEl__table-head">
          {el.columns.map((col) => (
            <span
              key={col.field}
              style={{ flex: col.width ? `0 0 ${col.width}` : "1", textAlign: col.align ?? "left" }}
            >
              {col.header ?? col.field}
            </span>
          ))}
        </div>
        {rows && rows.length > 0
          ? rows.slice(0, 3).map((row: any[], ri) => (
              <div key={ri} className="docEl__table-row">
                {row.map((cell: any, ci) => (
                  <span key={ci} style={{ flex: cell.width ? `0 0 ${cell.width}` : "1", textAlign: cell.align ?? "left" }}>
                    {cell.value}
                  </span>
                ))}
              </div>
            ))
          : (
            <div className="docEl__table-row docEl__table-sample">
              {el.columns.map((col) => (
                <span key={col.field} style={{ flex: col.width ? `0 0 ${col.width}` : "1" }}>—</span>
              ))}
            </div>
          )
        }
        {rows && rows.length > 3 && (
          <div className="docEl__table-more">+{rows.length - 3} filas más</div>
        )}
      </div>
    );
  }

  if (el.type === "total" || el.type === "subtotal") {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontWeight: el.bold ? "bold" : "normal",
          fontSize: `${(el.size ?? 10) * scale * 0.352778}px`,
          color: el.color ?? "inherit",
          width: "100%",
        }}
      >
        <span>{el.label ?? (el.type === "total" ? "TOTAL" : "SUBTOTAL")}</span>
        <span>{rendered?.resolvedContent ?? `\${${el.field}}`}</span>
      </div>
    );
  }

  if (el.type === "variable") {
    return (
      <div
        style={{
          fontFamily: el.font ?? "Arial",
          fontSize: `${(el.size ?? 10) * scale * 0.352778}px`,
          fontWeight: el.bold ? "bold" : "normal",
          color: el.color ?? "inherit",
        }}
      >
        {rendered?.resolvedContent ?? `{${el.variableName}}`}
      </div>
    );
  }

  if (el.type === "panel") {
    return (
      <div
        className="docEl__panel"
        style={{
          background: el.fillColor ?? "transparent",
          border: el.borderColor ? `${el.borderWidth ?? 1}px solid ${el.borderColor}` : undefined,
          borderRadius: el.borderRadius ?? undefined,
          width: "100%",
          height: "100%",
          position: "relative",
        }}
      >
        <span className="docEl__type-badge">Panel</span>
      </div>
    );
  }

  if (el.type === "group" || el.type === "if" || el.type === "repeat") {
    const labels: Record<string, string> = { group: "Grupo", if: "Condición", repeat: "Repetir" };
    return (
      <div className="docEl__container">
        <span className="docEl__type-badge">{labels[el.type]}</span>
      </div>
    );
  }

  if (el.type === "pagebreak") {
    return <div className="docEl__pagebreak">— page break —</div>;
  }

  if (el.type === "sectionbreak") {
    return <div className="docEl__sectionbreak">— section break —</div>;
  }

  return <div className="docEl__unknown">{(el as any).type}</div>;
}
