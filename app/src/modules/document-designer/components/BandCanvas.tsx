import { useRef, useState, useCallback } from "react";
import type { BandDef } from "@/modules/document-engine/models/band";
import type { DocumentElement, DocumentElementType } from "@/modules/document-engine/models/elements";
import type { RenderedBand } from "@/modules/document-engine/runtime/document-runner";
import { ElementRenderer } from "./ElementRenderer";
import { ResizeHandles, type ResizeDirection } from "./ResizeHandle";
import { RotateHandle } from "./RotateHandle";
import { BandResizeHandle } from "./BandResizeHandle";

interface BandCanvasProps {
  band: BandDef;
  /** px per mm */
  scale: number;
  selectedId: string | null;
  selectedIds: Set<string>;
  onSelect: (id: string | null) => void;
  onSelectBand: () => void;
  onToggleSelect: (id: string) => void;
  onMove: (id: string, dx: number, dy: number) => void;
  onResize: (id: string, dw: number, dh: number, dx: number, dy: number) => void;
  onBandResize: (deltaMm: number) => void;
  onDrop: (type: DocumentElementType, x: number, y: number) => void;
  onDropDataSource?: (source: string) => void;
  onElementChange?: (patch: Partial<DocumentElement>) => void;
  renderedBand?: RenderedBand;
  showResizeHandle: boolean;
}

export function BandCanvas({
  band, scale, selectedId, selectedIds, onSelect, onSelectBand, onToggleSelect,
  onMove, onResize, onBandResize,
  onDrop, onDropDataSource, onElementChange, renderedBand, showResizeHandle,
}: BandCanvasProps) {
  const bandRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const elementRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [, forceUpdate] = useState(0);

  const heightPx = band.height * scale;

  // ── Drag-over from palette ────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragOver(false), []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    // Check for datasource drop
    const dsName = e.dataTransfer.getData("datasource-name");
    if (dsName && onDropDataSource) {
      onDropDataSource(dsName);
      return;
    }

    const type = e.dataTransfer.getData("element-type") as DocumentElementType;
    if (!type || !bandRef.current) return;
    const rect = bandRef.current.getBoundingClientRect();
    const xPx = e.clientX - rect.left;
    const yPx = e.clientY - rect.top;
    onDrop(type, xPx / scale, yPx / scale);
  }, [onDrop, onDropDataSource, scale]);

  // ── Element drag (move) ───────────────────────────────────
  const handleElementMouseDown = useCallback((e: React.MouseEvent, el: DocumentElement) => {
    if (el.locked || editingTextId === el.id) return;

    if (e.ctrlKey || e.metaKey) {
      onToggleSelect(el.id);
      return;
    }

    onSelect(el.id);
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;

    const onMove_ = (me: MouseEvent) => {
      const dxPx = me.clientX - startX;
      const dyPx = me.clientY - startY;
      onMove(el.id, dxPx / scale, dyPx / scale);
    };

    const cleanup = () => {
      document.removeEventListener("mousemove", onMove_);
      document.removeEventListener("mouseup", cleanup);
    };
    document.addEventListener("mousemove", onMove_);
    document.addEventListener("mouseup", cleanup);
  }, [onMove, onSelect, onToggleSelect, scale, editingTextId]);

  // ── Resize ────────────────────────────────────────────────
  const handleResizeStart = useCallback((
    e: React.MouseEvent,
    el: DocumentElement,
    dir: ResizeDirection
  ) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;

    const onMove_ = (me: MouseEvent) => {
      const dxPx = me.clientX - startX;
      const dyPx = me.clientY - startY;
      const dx = dxPx / scale;
      const dy = dyPx / scale;

      let dw = 0, dh = 0, ox = 0, oy = 0;
      if (dir.includes("e")) { dw = dx; }
      if (dir.includes("w")) { dw = -dx; ox = dx; }
      if (dir.includes("s")) { dh = dy; }
      if (dir.includes("n")) { dh = -dy; oy = dy; }

      onResize(el.id, dw, dh, ox, oy);
    };

    const cleanup = () => {
      document.removeEventListener("mousemove", onMove_);
      document.removeEventListener("mouseup", cleanup);
    };
    document.addEventListener("mousemove", onMove_);
    document.addEventListener("mouseup", cleanup);
  }, [onResize, scale]);

  return (
    <div className="docBandWrap">
      <div
        ref={bandRef}
        className={`docBandCanvas docBandCanvas--${band.type}${isDragOver ? " docBandCanvas--dropover" : ""}`}
        style={{ height: heightPx, position: "relative" }}
        onClick={(e) => { if (e.currentTarget === e.target) { onSelect(null); if (band.type === "databand") onSelectBand(); } }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <span className="docBandLabel">{band.type === "databand" ? "DATA BAND" : band.type.toUpperCase()}</span>
        {band.type === "databand" && (
          <div style={{ position: "absolute", top: 3, left: 6, display: "flex", alignItems: "center", gap: 4, color: "#0f766e", fontSize: "0.48rem", fontWeight: 700, background: "rgba(15,118,110,0.08)", padding: "2px 6px", borderRadius: 4, letterSpacing: "0.03em" }}>
            <span>🗂</span> {band.source || "Sin fuente"}
          </div>
        )}
        <span className="docBandHeight">{band.height}mm</span>

        {band.elements
          .filter((el) => !el.hidden)
          .map((el) => {
            const isSelected = selectedIds.has(el.id);
            const rendered = renderedBand?.elements.find((r) => r.id === el.id);

            // Line elements use x1/y1/x2/y2
            const isLine = el.type === "line";
            const x = isLine ? Math.min((el as any).x1 ?? el.x, (el as any).x2 ?? el.x) : (el.x ?? 0);
            const y = isLine ? Math.min((el as any).y1 ?? el.y, (el as any).y2 ?? el.y) : (el.y ?? 0);
            const w = isLine
              ? Math.abs(((el as any).x2 ?? el.x) - ((el as any).x1 ?? el.x))
              : (el.width ?? 60);
            const h = isLine
              ? Math.abs(((el as any).y2 ?? el.y) - ((el as any).y1 ?? el.y)) || 2
              : (el.height ?? 10);

            return (
              <div
                key={el.id}
                ref={(r) => { if (r) elementRefs.current.set(el.id, r); else elementRefs.current.delete(el.id); }}
                className={`docCanvasEl docCanvasEl--${el.type}${isSelected ? " selected" : ""}${el.locked ? " locked" : ""}`}
                style={{
                  position: "absolute",
                  left: x * scale,
                  top: y * scale,
                  width: Math.max(4, w * scale),
                  height: Math.max(4, h * scale),
                  cursor: el.locked ? "not-allowed" : "move",
                  boxSizing: "border-box",
                  transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                }}
                onMouseDown={(e) => { if (el.type === "text" && editingTextId === el.id) return; handleElementMouseDown(e, el); }}
                onDoubleClick={() => {
                  if (el.type === "text" && !editingTextId) {
                    onSelect(el.id);
                    setEditingTextId(el.id);
                    setEditValue((el as any).content ?? "");
                  }
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {editingTextId === el.id ? (
                  <textarea
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onMouseDown={(e) => e.stopPropagation()}
                    onBlur={() => { if (onElementChange) onElementChange({ content: editValue } as any); setEditingTextId(null); }}
                    onKeyDown={(e) => { if (e.key === "Escape") { setEditingTextId(null); e.stopPropagation(); } if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (onElementChange) onElementChange({ content: editValue } as any); setEditingTextId(null); } }}
                    style={{ width:"100%", height:"100%", border:"2px solid #0f766e", borderRadius:3, padding:4, fontFamily:(el as any).font ?? "Arial", fontSize:`${((el as any).size ?? 10) * scale * 0.352778}px`, color:(el as any).color ?? "#1e293b", resize:"none", background:"#fff", outline:"none" }}
                  />
                ) : (
                  <ElementRenderer element={el} scale={scale} rendered={rendered} />
                )}

                {isSelected && !el.locked && editingTextId !== el.id && (
                  <>
                    <ResizeHandles
                      onResize={(e, dir) => handleResizeStart(e, el, dir)}
                    />
                    <RotateHandle
                      onRotate={(angle) => {
                        if (onElementChange) onElementChange({ rotation: angle } as any);
                      }}
                      scale={scale}
                      elementRect={elementRefs.current.get(el.id)?.getBoundingClientRect()}
                    />
                  </>
                )}
              </div>
            );
          })}
      </div>

      {showResizeHandle && (
        <BandResizeHandle onResize={onBandResize} scale={scale} />
      )}
    </div>
  );
}
