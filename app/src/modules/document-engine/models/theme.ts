// ============================================================
// SAE Document Engine — Theme Model
// ============================================================

export interface ElementStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: "normal" | "bold";
  fontStyle?: "normal" | "italic";
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  alignment?: "left" | "center" | "right" | "justify";
  lineHeight?: number;
}

export interface DocumentTheme {
  id: string;
  name: string;
  description?: string;
  base: ElementStyle;
  presets: Record<string, ElementStyle>;
}

export function createTheme(name: string, desc?: string): DocumentTheme {
  return {
    id: crypto.randomUUID(),
    name,
    description: desc,
    base: {},
    presets: {},
  };
}

export function themeLabel(theme: DocumentTheme): string {
  return theme.description ? `${theme.name} — ${theme.description}` : theme.name;
}

export const ELEMENT_STYLE_KEYS: (keyof ElementStyle)[] = [
  "fontFamily", "fontSize", "fontWeight", "fontStyle",
  "color", "backgroundColor", "borderColor", "borderWidth",
  "borderRadius", "alignment", "lineHeight",
];
