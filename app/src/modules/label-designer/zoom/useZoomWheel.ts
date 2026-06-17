import { useEffect, type RefObject } from "react";

export function useZoomWheel(
  viewportRef: RefObject<HTMLElement | null>,
  onZoomChange: (delta: number) => void,
) {
  useEffect(() => {
    function handleWheel(e: WheelEvent) {
      if (!viewportRef.current?.contains(e.target as Node)) return;
      if (!e.ctrlKey) return;

      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? -15 : 15;
      onZoomChange(delta);
    }

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [viewportRef, onZoomChange]);
}
