import { useCallback, useRef } from "react";
import { useHistoryStore } from "./history.store";

export function useSnapshotHistory<T>(maxEntries = 60) {
  const historyRef = useRef<T[][]>([[]]);
  const historyIdxRef = useRef(0);
  const isUndoingRef = useRef(false);

  const pushSnapshot = useCallback(
    (snapshot: T[]) => {
      if (isUndoingRef.current) return;
      const h = historyRef.current;
      const idx = historyIdxRef.current;
      const newHistory = h.slice(0, idx + 1);
      const cloned = structuredClone?.(snapshot) ?? JSON.parse(JSON.stringify(snapshot));
      newHistory.push(cloned);
      if (newHistory.length > maxEntries) newHistory.shift();
      historyRef.current = newHistory;
      historyIdxRef.current = newHistory.length - 1;
    },
    [maxEntries],
  );

  const undo = useCallback((): T[] | null => {
    if (historyIdxRef.current <= 0) return null;
    historyIdxRef.current--;
    isUndoingRef.current = true;
    const restored = structuredClone?.(historyRef.current[historyIdxRef.current])
      ?? JSON.parse(JSON.stringify(historyRef.current[historyIdxRef.current]));
    isUndoingRef.current = false;
    return restored as T[];
  }, []);

  const redo = useCallback((): T[] | null => {
    if (historyIdxRef.current >= historyRef.current.length - 1) return null;
    historyIdxRef.current++;
    isUndoingRef.current = true;
    const restored = structuredClone?.(historyRef.current[historyIdxRef.current])
      ?? JSON.parse(JSON.stringify(historyRef.current[historyIdxRef.current]));
    isUndoingRef.current = false;
    return restored as T[];
  }, []);

  const canUndo = useCallback(() => historyIdxRef.current > 0, []);
  const canRedo = useCallback(() => historyIdxRef.current < historyRef.current.length - 1, []);

  const seed = useCallback(
    (snapshot: T[]) => {
      const cloned = structuredClone?.(snapshot) ?? JSON.parse(JSON.stringify(snapshot));
      historyRef.current = [cloned];
      historyIdxRef.current = 0;
    },
    [],
  );

  return { pushSnapshot, undo, redo, canUndo, canRedo, seed };
}
