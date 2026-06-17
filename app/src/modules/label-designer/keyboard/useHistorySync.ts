import { useEffect } from "react";

export function useKeyboardHistorySync(
  onUndo: () => void,
  onRedo: () => void,
  canUndo: boolean,
  canRedo: boolean,
  operationCount: number,
) {
  useEffect(() => {
    function handleUndo() {
      onUndo();
    }
    function handleRedo() {
      onRedo();
    }

    window.addEventListener("saelabel:history-undo", handleUndo);
    window.addEventListener("saelabel:history-redo", handleRedo);

    window.dispatchEvent(
      new CustomEvent("saelabel:history-change", {
        detail: { canUndo, canRedo },
      }),
    );

    return () => {
      window.removeEventListener("saelabel:history-undo", handleUndo);
      window.removeEventListener("saelabel:history-redo", handleRedo);
    };
  }, [onUndo, onRedo, canUndo, canRedo, operationCount]);
}
