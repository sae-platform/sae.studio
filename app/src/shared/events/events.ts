export interface HistoryChangeEvent {
  canUndo: boolean;
  canRedo: boolean;
  operationCount: number;
}

export interface DocumentChangeEvent {
  documentId: string;
  kind: "sae" | "saetickets";
  action: "created" | "updated" | "deleted";
}

export interface SelectionChangeEvent {
  count: number;
  types: string[];
}

export interface PrintEvent {
  printerName: string;
  documentType: "label" | "ticket";
  success: boolean;
  error?: string;
}

export interface SaveEvent {
  documentId: string;
  status: "saved" | "saving" | "modified" | "error";
}

export const Events = {
  HISTORY_CHANGE: "history.change",
  DOCUMENT_CHANGED: "document.changed",
  SELECTION_CHANGE: "selection.change",
  PRINT_REQUESTED: "print.requested",
  PRINT_COMPLETED: "print.completed",
  SAVE_STATUS: "save.status",
  RESTORE_PANELS: "panels.restore",
  THEME_CHANGE: "theme.change",
} as const;
