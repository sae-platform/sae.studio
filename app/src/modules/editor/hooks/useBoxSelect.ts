import { useEffect, type RefObject } from "react";
import { useViewportStore, useSelectionStore, useCanvasStore } from "@/modules/editor/stores";
import { intersects, contains } from "@/modules/label-designer/selection";

export function useBoxSelect(boardRef: RefObject<HTMLDivElement | null>) {
  const zoom = useViewportStore((s) => s.zoomPercent) / 100;
  const boxSelect = useSelectionStore((s) => s.boxSelect);
  const setBoxSelect = useSelectionStore((s) => s.setBoxSelect);
  const setSelectedIds = useSelectionStore((s) => s.setSelectedIds);
  const objects = useCanvasStore((s) => s.objects);

  useEffect(() => {
    if (!boxSelect) return;
    const toPt = (clientX: number, clientY: number) => {
      const r = boardRef.current?.getBoundingClientRect() ?? { left: 0, top: 0 };
      return { x: (clientX - r.left) / zoom, y: (clientY - r.top) / zoom };
    };
    const move = (ev: MouseEvent) => {
      setBoxSelect((prev) => (prev ? { ...prev, currentClientX: ev.clientX, currentClientY: ev.clientY } : prev));
    };
    const up = () => {
      setBoxSelect((prev) => {
        if (!prev) return null;
        if (Math.abs(prev.currentClientX - prev.startClientX) < 3 && Math.abs(prev.currentClientY - prev.startClientY) < 3) {
          setSelectedIds([]);
          return null;
        }
        const p1 = toPt(prev.startClientX, prev.startClientY);
        const p2 = toPt(prev.currentClientX, prev.currentClientY);
        const area = { l: Math.min(p1.x, p2.x), t: Math.min(p1.y, p2.y), r: Math.max(p1.x, p2.x), b: Math.max(p1.y, p2.y) };
        const mode = prev.currentClientX >= prev.startClientX ? "touch" : "contain";
        const ids = objects
          .filter((o) => {
            const rect = { l: o.x, t: o.y, r: (o as any).x + (o as any).w, b: (o as any).y + (o as any).h };
            return mode === "touch" ? intersects(area, rect) : contains(area, rect);
          })
          .map((o) => o.id);
        setSelectedIds(ids);
        return null;
      });
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, [boxSelect, zoom, objects, boardRef]);
}
