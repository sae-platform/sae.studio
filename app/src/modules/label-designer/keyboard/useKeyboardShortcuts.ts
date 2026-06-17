import { useEffect } from "react";

type KeyboardShortcutCallbacks = {
  onDelete: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onPrint: () => void;
  onSave: () => void;
  onGroup: () => void;
  onUngroup: () => void;
  onEscape: () => void;
  canDelete: boolean;
};

export function useKeyboardShortcuts(callbacks: KeyboardShortcutCallbacks) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) {
        return;
      }

      switch (true) {
        case e.key === "Escape":
          callbacks.onEscape();
          break;

        case (e.key === "Delete" || e.key === "Backspace") && callbacks.canDelete:
          e.preventDefault();
          callbacks.onDelete();
          break;

        case (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey:
          e.preventDefault();
          callbacks.onUndo();
          break;

        case (e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey)):
          e.preventDefault();
          callbacks.onRedo();
          break;

        case (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p":
          e.preventDefault();
          callbacks.onPrint();
          break;

        case (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s":
          e.preventDefault();
          callbacks.onSave();
          break;

        case (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "g" && !e.shiftKey:
          e.preventDefault();
          callbacks.onGroup();
          break;

        case (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "g" && e.shiftKey:
          e.preventDefault();
          callbacks.onUngroup();
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [callbacks]);
}
