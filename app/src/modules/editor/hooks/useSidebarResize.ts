import { useEffect, type RefObject } from "react";
import { useUIStore } from "@/modules/editor/stores";
import { clamp } from "@/modules/label-designer/transform";

export function useSidebarResize(studioBodyRef: RefObject<HTMLDivElement | null>) {
  const leftSidebarWidth = useUIStore((s) => s.leftSidebarWidth);
  const setLeftSidebarWidth = useUIStore((s) => s.setLeftSidebarWidth);
  const rightSidebarWidth = useUIStore((s) => s.rightSidebarWidth);
  const setRightSidebarWidth = useUIStore((s) => s.setRightSidebarWidth);

  useEffect(() => {
    const stateRef = { current: null as { side: string; startX: number; startWidth: number; otherWidth: number; bodyWidth: number } | null };

    const onDown = (side: string) => (e: MouseEvent) => {
      stateRef.current = {
        side,
        startX: e.clientX,
        startWidth: side === "left" ? leftSidebarWidth : rightSidebarWidth,
        otherWidth: side === "left" ? rightSidebarWidth : leftSidebarWidth,
        bodyWidth: studioBodyRef.current?.getBoundingClientRect().width ?? 0,
      };
    };

    const onMove = (event: MouseEvent) => {
      const state = stateRef.current;
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

    const onUp = () => { stateRef.current = null; };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [leftSidebarWidth, rightSidebarWidth, studioBodyRef]);
}
