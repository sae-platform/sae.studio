export {
  registerPlugin, getPlugin, getRegisteredTypes, getPluginsByCategory,
  getAllPlugins, createObject, hasInspector,
  BASE_PLUGINS, resetUid as resetPluginUid,
} from "./object-registry";
export type { CanvasObject, RendererProps, InspectorProps, ObjectPlugin } from "./object-registry";

export {
  useCanvasStore, useSelectionStore, useViewportStore, useUIStore,
} from "./stores";
export type { BoxSelectState, DragState, Guideline, ContextMenuState } from "./stores";

export {
  CommandManager,
  AddObjectCommand, DeleteObjectsCommand, UpdateObjectCommand,
  MoveObjectsCommand, GroupObjectsCommand, UngroupObjectsCommand, ReorderObjectsCommand,
} from "./commands";
export type { Command } from "./commands";
