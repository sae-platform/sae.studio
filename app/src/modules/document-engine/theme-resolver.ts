// ============================================================
// SAE Document Engine — Theme Style Resolution
// ============================================================

import type { DocumentTheme, ElementStyle } from "./models/theme";
import type { DocumentElement } from "./models/elements";

export function cloneStyle(s: ElementStyle): ElementStyle {
  return { ...s };
}

export function mergeStyle(base: ElementStyle, overrides: ElementStyle): ElementStyle {
  const merged = { ...base };
  for (const k of Object.keys(overrides) as (keyof ElementStyle)[]) {
    const v = overrides[k];
    if (v !== undefined) (merged as any)[k] = v;
  }
  return merged;
}

export interface ResolvedElementStyle {
  fontFamily?: string;
  fontSize: number;
  fontWeight?: string;
  fontStyle?: string;
  color: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  alignment?: string;
  lineHeight?: number;
}

const DEFAULTS: ResolvedElementStyle = {
  fontSize: 10,
  color: "#1e293b",
};

export function resolveElementStyle(
  el: DocumentElement,
  theme?: DocumentTheme,
): ResolvedElementStyle {
  let style: ElementStyle = {};

  if (theme) {
    style = mergeStyle(style, theme.base);
    if (el.preset && theme.presets[el.preset]) {
      style = mergeStyle(style, theme.presets[el.preset]);
    }
  }

  const explicit: ElementStyle = {};
  if ("font" in el && (el as any).font) explicit.fontFamily = (el as any).font;
  if ("size" in el && (el as any).size != null) explicit.fontSize = (el as any).size;
  if ("bold" in el && (el as any).bold) explicit.fontWeight = "bold";
  if ("italic" in el && (el as any).italic) explicit.fontStyle = "italic";
  if ("color" in el && (el as any).color) explicit.color = (el as any).color;
  if ("align" in el && (el as any).align) explicit.alignment = (el as any).align;
  if ("fillColor" in el && (el as any).fillColor) explicit.backgroundColor = (el as any).fillColor;
  if ("borderColor" in el && (el as any).borderColor) explicit.borderColor = (el as any).borderColor;
  if ("borderWidth" in el && (el as any).borderWidth != null) explicit.borderWidth = (el as any).borderWidth;
  if ("borderRadius" in el && (el as any).borderRadius != null) explicit.borderRadius = (el as any).borderRadius;

  style = mergeStyle(style, explicit);

  return {
    ...DEFAULTS,
    ...style,
    fontSize: style.fontSize ?? DEFAULTS.fontSize,
    color: style.color ?? DEFAULTS.color,
  };
}
