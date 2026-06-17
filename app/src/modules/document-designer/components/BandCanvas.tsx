import { useRef, useState, useCallback } from "react";
import type { BandDef } from "@/modules/document-engine/models/band";
import type { DocumentElement, DocumentElementType } from "@/modules/document-engine/models/elements";
import type { RenderedBand } from "@/modules/document-engine/runtime/document-runner";
import { ElementRenderer } from "./ElementRenderer";
import { ResizeHandles, type ResizeDirection } from "./ResizeHandle";
import { BandResizeHandle } from "./BandResizeHandle";

interface BandCanvasProps {
  band: BandDef;
  /** px per mm */
  scale: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, dx: number, dy: number) => void;
  onResize: (id: string, dw: number, dh: number, dx: number, dy: number) => void;
  onBandResize: (deltaMm: number) => void;
  onDrop: (type: DocumentElementType, x: number, y: number) => void;
  renderedBand?: RenderedBand;
  showResizeHandle: boolean;
}

export function BandCanvas({
  band, scale, selectedId, onSelect,
  onMove, onResize, onBandResize,
  onDrop, renderedBand, showResizeHandle,
}: BandCanvasProps) {
  const bandRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

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
    const type = e.dataTransfer.getData("element-type") as DocumentElementType;
    if (!type || !bandRef.current) return;
    const rect = bandRef.current.getBoundingClientRect();
    const xPx = e.clientX - rect.left;
    const yPx = e.clientY - rect.top;
    onDrop(type, xPx / scale, yPx / scale);
  }, [onDrop, scale]);

  // ── Element drag (move) ───────────────────────────────────
  const handleElementMouseDown = useCallback((e: React.MouseEvent, el: DocumentElement) => {
    if (el.locked) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect(el.id);

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
  }, [onMove, onSelect, scale]);

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
        onClick={(e) => { if (e.currentTarget === e.target) onSelect(null); }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <span className="docBandLabel">{band.type.toUpperCase()}</span>
        <span className="docBandHeight">{band.height}mm</span>

        {band.elements
          .filter((el) => !el.hidden)
          .map((el) => {
            const isSelected = el.id === selectedId;
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
                className={`docCanvasEl docCanvasEl--${el.type}${isSelected ? " selected" : ""}${el.locked ? " locked" : ""}`}
                style={{
                  position: "absolute",
                  left: x * scale,
                  top: y * scale,
                  width: Math.max(4, w * scale),
                  height: Math.max(4, h * scale),
                  cursor: el.locked ? "not-allowed" : "move",
                  boxSizing: "border-box",
                }}
                onMouseDown={(e) => handleElementMouseDown(e, el)}
                onClick={(e) => e.stopPropagation()}
              >
                <ElementRenderer element={el} scale={scale} rendered={rendered} />

                {isSelected && !el.locked && (
                  <ResizeHandles
                    onResize={(e, dir) => handleResizeStart(e, el, dir)}
                  />
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
