export interface UndoableOperation<TState = unknown> {
  type: string;
  description: string;
  undoData: TState;
  redoData?: TState;
  timestamp: number;
}

export interface HistoryState<TState = unknown> {
  past: UndoableOperation<TState>[];
  future: UndoableOperation<TState>[];
  maxEntries: number;
}
