import { useEffect } from "react";

type DuplicateCallbacks = {
  onDuplicate: () => void;
  canDuplicate: boolean;
};

export function useDuplicateShortcut({ onDuplicate, canDuplicate }: DuplicateCallbacks) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d" && !e.shiftKey) {
        if (!canDuplicate) return;
        e.preventDefault();
        onDuplicate();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canDuplicate, onDuplicate]);
}
