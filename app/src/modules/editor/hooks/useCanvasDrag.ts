import { useEffect, type RefObject } from "react";
import { useViewportStore, useSelectionStore, useCanvasStore } from "@/modules/editor/stores";
import { computeResize, computeRotate, computeSkew, clamp } from "@/modules/label-designer/transform";

const MIN = 4;

export function useCanvasDrag(
  boardRef: RefObject<HTMLDivElement | null>,
  viewportRef: RefObject<HTMLDivElement | null>,
) {
  const zoom = useViewportStore((s) => s.zoomPercent) / 100;
  const objects = useCanvasStore((s) => s.objects);
  const setObjects = useCanvasStore((s) => s.setObjects);
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const drag = useSelectionStore((s) => s.drag);
  const setDrag = useSelectionStore((s) => s.setDrag);
  const guidelines = useViewportStore((s) => s.guidelines);
  const setGuidelines = useViewportStore((s) => s.setGuidelines);
  const activeGuidelineDrag = useViewportStore((s) => s.activeGuidelineDrag);
  const setActiveGuidelineDrag = useViewportStore((s) => s.setActiveGuidelineDrag);

  useEffect(() => {
    if (!drag && !activeGuidelineDrag) return;

    const move = (ev: MouseEvent) => {
      if (activeGuidelineDrag && viewportRef.current) {
        const br = boardRef.current?.getBoundingClientRect();
        if (!br) return;
        const orient = guidelines.find((g) => g.id === activeGuidelineDrag.id)?.orientation;
        if (!orient) return;

        const isH = orient === "horizontal";
        const mousePos = isH ? ev.clientY : ev.clientX;
        const boardPos = isH ? br.top : br.left;
        const newPosPt = (mousePos - boardPos) / zoom;

        const vbr = viewportRef.current.getBoundingClientRect();
        const isInRuler = isH ? (ev.clientY < vbr.top + 24) : (ev.clientX < vbr.left + 24);

        if (!activeGuidelineDrag.hasExitedRuler && !isInRuler) {
          setActiveGuidelineDrag((prev) => (prev ? { ...prev, hasExitedRuler: true } : null));
        }

        if (activeGuidelineDrag.hasExitedRuler && isInRuler) {
          setGuidelines((prev) => prev.filter((g) => g.id !== activeGuidelineDrag.id));
        } else {
          setGuidelines((prev) =>
            prev.map((g) => (g.id === activeGuidelineDrag.id ? { ...g, posPt: newPosPt } : g)),
          );
        }
        return;
      }

      if (!drag) return;

      const dx = (ev.clientX - drag.startX) / zoom;
      const dy = (ev.clientY - drag.startY) / zoom;
      const dragObj = objects.find((o) => o.id === drag.id);
      const groupToMove = dragObj?.groupId
        ? objects.filter((o) => o.groupId === dragObj.groupId).map((o) => o.id)
        : selectedIds.includes(drag.id)
          ? selectedIds
          : [drag.id];

      setObjects((prev) =>
        prev.map((o) => {
          if (!groupToMove.includes(o.id)) return o;
          if (drag.mode === "move") {
            const origin = drag.originMap?.[o.id] ?? { x: o.x, y: o.y };
            return {
              ...o,
              x: clamp(origin.x + dx, ev.altKey ? -Infinity : -1000, ev.altKey ? Infinity : 2000),
              y: clamp(origin.y + dy, ev.altKey ? -Infinity : -1000, ev.altKey ? Infinity : 2000),
            };
          }
          if (o.id !== drag.id) return o;
          if (drag.mode === "transform") {
            const h = drag.handle ?? "se";
            const kind = drag.transformKind ?? (h.length === 2 ? "rotate" : "skewAuto");
            const num = (v: number, fb: number) => (Number.isFinite(v) ? v : fb);
            if (kind === "rotate") {
              const cx = drag.centerClientX ?? drag.startX;
              const cy = drag.centerClientY ?? drag.startY;
              const currentAngle = Math.atan2(ev.clientY - cy, ev.clientX - cx);
              const deltaDeg = ((currentAngle - (drag.startAngleRad ?? 0)) * 180) / Math.PI;
              return { ...o, rotateDeg: num(drag.startRotateDeg ?? o.rotateDeg, o.rotateDeg) + deltaDeg };
            }
            const sf = ev.shiftKey ? 0.12 : 0.28;
            if (kind === "skewAuto") {
              if (Math.abs(dx) >= Math.abs(dy)) {
                const dir = h === "w" || h === "nw" || h === "sw" ? -1 : 1;
                return { ...o, skewX: clamp(num(drag.startSkewX ?? o.skewX, o.skewX) + dx * dir * sf, -80, 80) };
              }
              const dir = h === "n" || h === "ne" || h === "nw" ? -1 : 1;
              return { ...o, skewY: clamp(num(drag.startSkewY ?? o.skewY, o.skewY) + dy * dir * sf, -80, 80) };
            }
            if (kind === "skewX") {
              const dir = h === "w" ? -1 : 1;
              return { ...o, skewX: clamp(num(drag.startSkewX ?? o.skewX, o.skewX) + dx * dir * sf, -80, 80) };
            }
            const dir = h === "n" ? -1 : 1;
            return { ...o, skewY: clamp(num(drag.startSkewY ?? o.skewY, o.skewY) + dy * dir * sf, -80, 80) };
          }
          const h = drag.handle ?? "se";
          let x = drag.x, y = drag.y, w = drag.w, hh = drag.h;
          if (h.includes("e")) w = Math.max(MIN, drag.w + dx);
          if (h.includes("s")) hh = Math.max(MIN, drag.h + dy);
          if (h.includes("w")) { const r = drag.x + drag.w; x = drag.x + dx; w = Math.max(MIN, r - x); }
          if (h.includes("n")) { const b = drag.y + drag.h; y = drag.y + dy; hh = Math.max(MIN, b - y); }
          if (x < -1000) { w += x + 1000; x = -1000; }
          if (y < -1000) { hh += y + 1000; y = -1000; }
          if (x + w > 3000) w = 3000 - x;
          if (y + hh > 3000) hh = 3000 - y;
          return { ...o, x, y, w, h: hh };
        }) as any,
      );
    };

    const up = () => {
      setDrag(null);
      setActiveGuidelineDrag(null);
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [drag, activeGuidelineDrag, zoom, setObjects, setGuidelines, setActiveGuidelineDrag, selectedIds, guidelines, boardRef, viewportRef]);
}
