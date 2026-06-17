import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type Align = "left" | "center" | "right";
export type FontSize = "normal" | "medium" | "large" | "extra-large";

export interface BlockBase {
  id: string;
  showIf?: string;
}

export interface TextBlock extends BlockBase {
  type: "text";
  text: string;
  align: Align;
  bold: boolean;
  extraBold?: boolean;
  size: FontSize;
}

export interface SeparatorBlock extends BlockBase {
  type: "separator";
  char: string;
  align?: Align;
}

export interface TotalBlock extends BlockBase {
  type: "total";
  label: string;
  value: string;
  bold: boolean;
  extraBold?: boolean;
  align?: Align;
}

export interface QrBlock extends BlockBase {
  type: "qr";
  content: string;
  align: Align;
  qrSize: number;
}

export interface FeedBlock extends BlockBase {
  type: "feed";
  lines: number;
}

export interface ActionBlock extends BlockBase {
  type: "cut" | "beep" | "open-drawer";
}

export interface IfBlock extends BlockBase {
  type: "if";
  expr: string;
  text: string;
  bold: boolean;
  extraBold?: boolean;
  size?: FontSize;
  align: Align;
}

export interface IfElseBlock extends BlockBase {
  type: "ifelse";
  expr: string;
  thenText: string;
  elseText: string;
  bold?: boolean;
  extraBold?: boolean;
  size?: FontSize;
  align: Align;
}

export interface EachColumn {
  field: string;
  label: string;
  width: "auto" | number;
  align: Align;
  showIf?: string;
  bold?: boolean;
  extraBold?: boolean;
  size?: FontSize;
}

export interface EachBlock extends BlockBase {
  type: "each";
  listVar: string;
  columns: EachColumn[];
  showHeader: boolean;
  childField?: string;
  childIndentCol?: number;
  align?: Align;
}

export type TicketBlock =
  | TextBlock
  | SeparatorBlock
  | EachBlock
  | TotalBlock
  | QrBlock
  | FeedBlock
  | ActionBlock
  | IfBlock
  | IfElseBlock;

export interface TicketGroup {
  id: string;
  name: string;
  icon?: string;
  type: "group";
  blocks: TicketBlock[];
  collapsed?: boolean;
  repeatable?: boolean;
  listVar?: string;
}

export type TicketNode = TicketBlock | TicketGroup;

export interface TicketState {
  blocks: TicketNode[];
  width: number;
  printers: string;
  selectedId: string | null;
  isPrinting: boolean;
  xml: string;
}

interface TicketActions {
  setBlocks: (blocks: TicketNode[]) => void;
  setWidth: (width: number) => void;
  setPrinters: (printers: string) => void;
  setSelectedId: (id: string | null) => void;
  setIsPrinting: (val: boolean) => void;
  setXml: (xml: string) => void;
  addBlock: (block: TicketBlock) => void;
  updateBlock: (id: string, updates: Partial<TicketBlock>) => void;
  deleteBlock: (id: string) => void;
  moveBlock: (fromId: string, toId: string) => void;
  toggleGroupCollapse: (groupId: string) => void;
  reset: () => void;
}

type TicketStore = TicketState & TicketActions;

const initialState: TicketState = {
  blocks: [],
  width: 42,
  printers: "",
  selectedId: null,
  isPrinting: false,
  xml: "",
};

function findGroupAndUpdate(
  nodes: TicketNode[],
  groupId: string,
  updater: (group: TicketGroup) => TicketGroup,
): TicketNode[] {
  return nodes.map((node): TicketNode => {
    if (node.type === "group" && node.id === groupId) {
      return updater(node as TicketGroup);
    }
    if (node.type === "group") {
      return {
        ...node,
        blocks: findGroupAndUpdate((node as TicketGroup).blocks, groupId, updater) as TicketBlock[],
      } as TicketGroup;
    }
    return node;
  });
}

export const useTicketStore = create<TicketStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      setBlocks: (blocks) => set({ blocks }),

      setWidth: (width) => set({ width }),

      setPrinters: (printers) => set({ printers }),

      setSelectedId: (id) => set({ selectedId: id }),

      setIsPrinting: (isPrinting) => set({ isPrinting }),

      setXml: (xml) => set({ xml }),

      addBlock: (block) =>
        set((state) => ({
          blocks: [...state.blocks, block],
          selectedId: block.id,
        })),

      updateBlock: (id, updates) =>
        set((state) => ({
          blocks: state.blocks.map((node): TicketNode => {
            if (node.type === "group") {
              const group = node as TicketGroup;
              return {
                ...group,
                blocks: group.blocks.map((b) =>
                  b.id === id ? ({ ...b, ...updates } as TicketBlock) : b,
                ),
              } as TicketGroup;
            }
            return node.id === id
              ? ({ ...(node as TicketBlock), ...updates } as TicketBlock)
              : node;
          }),
        })),

      deleteBlock: (id) =>
        set((state) => {
          const filterBlocks = (nodes: TicketNode[]): TicketNode[] =>
            nodes
              .filter((node) => node.id !== id)
              .map((node): TicketNode =>
                node.type === "group"
                  ? ({ ...node, blocks: filterBlocks((node as TicketGroup).blocks) as TicketBlock[] } as TicketGroup)
                  : node,
              );
          return { blocks: filterBlocks(state.blocks), selectedId: state.selectedId === id ? null : state.selectedId };
        }),

      moveBlock: (fromId, toId) =>
        set((state) => {
          const blocks = [...state.blocks];
          const fromIdx = blocks.findIndex((b) => b.id === fromId);
          const toIdx = blocks.findIndex((b) => b.id === toId);
          if (fromIdx === -1 || toIdx === -1) return state;
          const [moved] = blocks.splice(fromIdx, 1);
          blocks.splice(toIdx, 0, moved);
          return { blocks };
        }),

      toggleGroupCollapse: (groupId) =>
        set((state) => ({
          blocks: findGroupAndUpdate(state.blocks, groupId, (g) => ({
            ...g,
            collapsed: !g.collapsed,
          })),
        })),

      reset: () => set({ ...initialState }),
    }),
    { name: "ticket-store" },
  ),
);

let _tid = 0;
export function ticketUid(): string {
  return `t${++_tid}`;
}
export function resetTicketUid(): void {
  _tid = 0;
}
