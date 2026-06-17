import { useEffect, type RefObject } from "react";
import { useViewportStore } from "@/modules/editor/stores";

export function useCanvasPan(viewportRef: RefObject<HTMLDivElement | null>) {
  const panState = useViewportStore((s) => s.panState);
  const setPanState = useViewportStore((s) => s.setPanState);

  useEffect(() => {
    if (!panState) return;
    const move = (ev: MouseEvent) => {
      if (!viewportRef.current) return;
      viewportRef.current.scrollLeft = panState.startScrollLeft - (ev.clientX - panState.startX);
      viewportRef.current.scrollTop = panState.startScrollTop - (ev.clientY - panState.startY);
    };
    const up = () => setPanState(null);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, [panState, viewportRef]);
}
