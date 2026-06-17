import type { ReactNode, FC } from "react";
import type { CanvasObject, ObjectPlugin } from "@/modules/editor/object-registry";

export interface IObjectRenderer {
  type: string;
  render(obj: CanvasObject, zoom: number): ReactNode;
}

export interface IObjectInspector {
  type: string;
  renderFields(obj: CanvasObject, onChange: (obj: CanvasObject) => void): ReactNode;
}

export interface IObjectFactory {
  type: string;
  createDefault(): CanvasObject;
}
