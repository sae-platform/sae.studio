// ============================================================
// SAE Document Engine — Default Theme Presets
// ============================================================

import type { DocumentTheme } from "./theme";

export const DEFAULT_THEME: DocumentTheme = {
  id: "default",
  name: "Por defecto",
  description: "Tema base limpio",
  base: {
    fontFamily: "Inter, sans-serif",
    fontSize: 10,
    color: "#1e293b",
    alignment: "left",
    lineHeight: 1.4,
  },
  presets: {
    h1: { fontSize: 20, fontWeight: "bold", color: "#0f172a" },
    h2: { fontSize: 16, fontWeight: "bold", color: "#1e293b" },
    h3: { fontSize: 13, fontWeight: "bold", color: "#334155" },
    body: { fontSize: 10, color: "#334155" },
    small: { fontSize: 8, color: "#64748b" },
    "table-header": {
      fontWeight: "bold",
      backgroundColor: "#f1f5f9",
      color: "#1e293b",
      borderColor: "#cbd5e1",
    },
    "table-cell": { color: "#334155", borderColor: "#e2e8f0" },
    total: { fontWeight: "bold", fontSize: 12, color: "#0f172a", borderColor: "#94a3b8" },
    label: { fontWeight: "bold", fontSize: 9, color: "#64748b" },
  },
};

export const MODERN_THEME: DocumentTheme = {
  id: "modern",
  name: "Moderno",
  description: "Líneas limpias y tipografía sans-serif",
  base: {
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: 9.5,
    color: "#1a1a2e",
    alignment: "left",
    lineHeight: 1.5,
  },
  presets: {
    h1: { fontSize: 22, fontWeight: "bold", color: "#0077b6" },
    h2: { fontSize: 16, fontWeight: "bold", color: "#023e8a" },
    h3: { fontSize: 13, fontWeight: "bold", color: "#03045e" },
    body: { fontSize: 9.5, color: "#2b2d42" },
    small: { fontSize: 7.5, color: "#8d99ae" },
    "table-header": {
      fontWeight: "bold",
      backgroundColor: "#0077b6",
      color: "#ffffff",
      borderColor: "#023e8a",
    },
    "table-cell": { color: "#2b2d42", borderColor: "#dee2e6" },
    total: { fontWeight: "bold", fontSize: 11.5, color: "#03045e", borderColor: "#0077b6" },
    label: { fontWeight: "bold", fontSize: 8.5, color: "#8d99ae" },
  },
};

export const CLASSIC_THEME: DocumentTheme = {
  id: "classic",
  name: "Clásico",
  description: "Serif tradicional con líneas gruesas",
  base: {
    fontFamily: "Georgia, Times New Roman, serif",
    fontSize: 10.5,
    color: "#1a1a1a",
    alignment: "left",
    lineHeight: 1.35,
  },
  presets: {
    h1: { fontSize: 18, fontWeight: "bold", color: "#2d2d2d" },
    h2: { fontSize: 14, fontWeight: "bold", color: "#3d3d3d" },
    h3: { fontSize: 12, fontWeight: "bold", color: "#4d4d4d" },
    body: { fontSize: 10.5, color: "#1a1a1a" },
    small: { fontSize: 8, color: "#666666" },
    "table-header": {
      fontWeight: "bold",
      backgroundColor: "#e8e0d0",
      color: "#2d2d2d",
      borderColor: "#c4b9a8",
      borderWidth: 1.5,
    },
    "table-cell": { color: "#1a1a1a", borderColor: "#c4b9a8", borderWidth: 0.5 },
    total: { fontWeight: "bold", fontSize: 12, color: "#2d2d2d", borderColor: "#8c7c6a", borderWidth: 1.5 },
    label: { fontWeight: "bold", fontSize: 9, color: "#666666" },
  },
};

export const CORPORATE_THEME: DocumentTheme = {
  id: "corporate",
  name: "Corporativo",
  description: "Profesional con azules corporativos",
  base: {
    fontFamily: "Segoe UI, system-ui, sans-serif",
    fontSize: 9.5,
    color: "#212529",
    alignment: "left",
    lineHeight: 1.45,
  },
  presets: {
    h1: { fontSize: 19, fontWeight: "bold", color: "#003366" },
    h2: { fontSize: 14, fontWeight: "bold", color: "#004080" },
    h3: { fontSize: 12, fontWeight: "bold", color: "#0059b3" },
    body: { fontSize: 9.5, color: "#212529" },
    small: { fontSize: 7.5, color: "#6c757d" },
    "table-header": {
      fontWeight: "bold",
      backgroundColor: "#003366",
      color: "#ffffff",
      borderColor: "#002244",
    },
    "table-cell": { color: "#212529", borderColor: "#dee2e6" },
    total: { fontWeight: "bold", fontSize: 11, color: "#003366", borderColor: "#004080", borderWidth: 1.5 },
    label: { fontWeight: "bold", fontSize: 8.5, color: "#6c757d" },
  },
};

export const MINIMAL_THEME: DocumentTheme = {
  id: "minimal",
  name: "Mínimo",
  description: "Monocromático con espacios generosos",
  base: {
    fontFamily: "Helvetica, Arial, sans-serif",
    fontSize: 9.5,
    color: "#1a1a1a",
    alignment: "left",
    lineHeight: 1.6,
  },
  presets: {
    h1: { fontSize: 18, fontWeight: "bold", color: "#000000" },
    h2: { fontSize: 14, fontWeight: "bold", color: "#1a1a1a" },
    h3: { fontSize: 11.5, fontWeight: "bold", color: "#333333" },
    body: { fontSize: 9.5, color: "#1a1a1a" },
    small: { fontSize: 8, color: "#999999" },
    "table-header": {
      fontWeight: "bold",
      backgroundColor: "#f5f5f5",
      color: "#000000",
      borderColor: "#cccccc",
    },
    "table-cell": { color: "#1a1a1a", borderColor: "#e5e5e5" },
    total: { fontWeight: "bold", fontSize: 11, color: "#000000", borderColor: "#999999" },
    label: { fontWeight: "bold", fontSize: 8.5, color: "#999999" },
  },
};

export const THEME_PRESETS: DocumentTheme[] = [
  DEFAULT_THEME,
  MODERN_THEME,
  CLASSIC_THEME,
  CORPORATE_THEME,
  MINIMAL_THEME,
];

export function getThemeById(id: string): DocumentTheme | undefined {
  return THEME_PRESETS.find((t) => t.id === id);
}
