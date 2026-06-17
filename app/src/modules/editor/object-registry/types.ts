import type { ReactNode, FC } from "react";

export type CanvasObject = {
  id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  content: string;
  rotateDeg: number;
  scaleX: number;
  scaleY: number;
  skewX: number;
  skewY: number;
  groupId?: string;
  locked?: boolean;
  hidden?: boolean;
  [key: string]: unknown;
};

export type RendererProps = {
  obj: CanvasObject;
  zoom: number;
  variables?: { name: string }[];
};

export type InspectorProps = {
  obj: CanvasObject;
  onChange: (obj: CanvasObject) => void;
};

export type ObjectPlugin = {
  type: string;
  metadata: {
    label: string;
    icon: ReactNode;
    category: string;
  };
  createDefault(): CanvasObject;
  Renderer: FC<RendererProps>;
  Inspector?: FC<InspectorProps>;
};
