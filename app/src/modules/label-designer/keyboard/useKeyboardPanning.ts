import { useEffect } from "react";

type PanningCallbacks = {
  onPanStart: () => void;
  onPanEnd: () => void;
};

export function useKeyboardPanning({ onPanStart, onPanEnd }: PanningCallbacks) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        document.body.style.cursor = "grab";
        onPanStart();
      }
    }

    function handleKeyUp(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        document.body.style.cursor = "";
        onPanEnd();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      document.body.style.cursor = "";
    };
  }, [onPanStart, onPanEnd]);
}
