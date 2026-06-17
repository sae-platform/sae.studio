// ============================================================
// SAE Document Engine — Element Types
// Canvas + Bands + Components model
// ============================================================

/** Anchor constraints for positioning relative to page/band edges */
export type Anchor = "left" | "right" | "top" | "bottom" | "hcenter" | "vcenter";

/** Base properties shared by all positioned elements */
export interface BaseElement {
  id: string;
  type: string;
  /** X position in band coordinates (mm by default) */
  x: number;
  /** Y position in band coordinates (mm by default) */
  y: number;
  width?: number;
  height?: number;
  /** Optional anchor constraints */
  anchor?: Anchor[];
  /** Expression to show/hide this element */
  showIf?: string;
  /** Layer this element belongs to */
  layerId?: string;
  locked?: boolean;
  hidden?: boolean;
  preset?: string;
}

// ── Basic Elements ──────────────────────────────────────────

export interface TextElement extends BaseElement {
  type: "text";
  content: string;
  font?: string;
  size?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: "left" | "center" | "right" | "justify";
  color?: string;
}

export interface ImageElement extends BaseElement {
  type: "image";
  source: string;
  fit?: "contain" | "cover" | "fill";
}

export interface LineElement extends BaseElement {
  type: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  lineWidth?: number;
}

export interface RectangleElement extends BaseElement {
  type: "rectangle";
  fillColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
}

export interface EllipseElement extends BaseElement {
  type: "ellipse";
  fillColor?: string;
  borderColor?: string;
  borderWidth?: number;
}

// ── Data Elements ───────────────────────────────────────────

export interface BarcodeElement extends BaseElement {
  type: "barcode";
  value: string;
  kind?: "code128" | "code39" | "ean13" | "ean8" | "upca" | "itf";
  showText?: boolean;
}

export interface QrElement extends BaseElement {
  type: "qr";
  value: string;
  size?: number;
  errorLevel?: "L" | "M" | "Q" | "H";
}

export interface TableColumnDef {
  field: string;
  header?: string;
  width?: string;
  align?: "left" | "center" | "right";
  format?: string;
}

export interface TableElement extends BaseElement {
  type: "table";
  source: string;
  columns: TableColumnDef[];
  showHeader?: boolean;
  stripeColor?: string;
  headerColor?: string;
  headerTextColor?: string;
}

// ── Business Elements ────────────────────────────────────────

export interface TotalElement extends BaseElement {
  type: "total";
  label?: string;
  field: string;
  format?: string;
  font?: string;
  size?: number;
  bold?: boolean;
  align?: "left" | "center" | "right";
  color?: string;
}

export interface SubtotalElement extends BaseElement {
  type: "subtotal";
  label?: string;
  field: string;
  format?: string;
  font?: string;
  size?: number;
  bold?: boolean;
  align?: "left" | "center" | "right";
  color?: string;
}

export interface VariableElement extends BaseElement {
  type: "variable";
  variableName: string;
  font?: string;
  size?: number;
  bold?: boolean;
  align?: "left" | "center" | "right";
  color?: string;
}

// ── Container / Logic Elements ───────────────────────────────

export interface PanelElement extends BaseElement {
  type: "panel";
  elements: DocumentElement[];
  fillColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
}

export interface GroupElement extends BaseElement {
  type: "group";
  elements: DocumentElement[];
}

export interface IfElement extends BaseElement {
  type: "if";
  condition: string;
  thenElements: DocumentElement[];
  elseElements?: DocumentElement[];
}

export interface RepeatElement extends BaseElement {
  type: "repeat";
  source: string;
  elements: DocumentElement[];
  direction?: "row" | "column";
  gap?: number;
}

// ── Page Control Elements ────────────────────────────────────

export interface PageBreakElement extends BaseElement {
  type: "pagebreak";
}

export interface SectionBreakElement extends BaseElement {
  type: "sectionbreak";
}

// ── Discriminated Union ──────────────────────────────────────

export type DocumentElement =
  | TextElement
  | ImageElement
  | LineElement
  | RectangleElement
  | EllipseElement
  | BarcodeElement
  | QrElement
  | TableElement
  | TotalElement
  | SubtotalElement
  | VariableElement
  | PanelElement
  | GroupElement
  | IfElement
  | RepeatElement
  | PageBreakElement
  | SectionBreakElement;

export type DocumentElementType = DocumentElement["type"];

/** Element types that can contain child elements */
export type ContainerElementType = "panel" | "group" | "if" | "repeat";

/** Returns true if the element is a container */
export function isContainer(el: DocumentElement): el is PanelElement | GroupElement | IfElement | RepeatElement {
  return ["panel", "group", "if", "repeat"].includes(el.type);
}

/** All non-container element types that can be inserted from the palette */
export const PRIMITIVE_ELEMENT_TYPES = [
  "text", "image", "line", "rectangle", "ellipse",
  "barcode", "qr", "table",
  "total", "subtotal", "variable",
  "panel", "group", "if", "repeat",
  "pagebreak", "sectionbreak",
] as const satisfies DocumentElementType[];
