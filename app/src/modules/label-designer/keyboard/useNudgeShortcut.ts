import { useEffect } from "react";

type NudgeCallbacks = {
  onMove: (dx: number, dy: number) => void;
  canNudge: boolean;
};

export function useNudgeShortcut({ onMove, canNudge }: NudgeCallbacks) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) {
        return;
      }
      if (!canNudge) return;

      const step = e.shiftKey ? 10 : 1;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          onMove(-step, 0);
          break;
        case "ArrowRight":
          e.preventDefault();
          onMove(step, 0);
          break;
        case "ArrowUp":
          e.preventDefault();
          onMove(0, -step);
          break;
        case "ArrowDown":
          e.preventDefault();
          onMove(0, step);
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canNudge, onMove]);
}
