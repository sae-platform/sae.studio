import type { ReactNode, FC } from "react";

export type TicketBlock = {
  id: string;
  type: string;
  showIf?: string;
  [key: string]: unknown;
};

export type BlockRendererProps = {
  block: TicketBlock;
  width: number;
  selected?: boolean;
  onSelect?: () => void;
};

export type BlockInspectorProps = {
  block: TicketBlock;
  onChange: (block: TicketBlock) => void;
};

export type BlockPlugin = {
  type: string;
  metadata: {
    label: string;
    icon: ReactNode;
    category: string;
  };
  createDefault(): TicketBlock;
  Renderer: FC<BlockRendererProps>;
  Inspector?: FC<BlockInspectorProps>;
};
