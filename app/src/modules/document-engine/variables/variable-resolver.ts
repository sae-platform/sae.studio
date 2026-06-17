import type { VariableDef } from "@/modules/document-engine/models";

export type VariableScope = Record<string, string>;

export function buildVariableMap(variables: VariableDef[]): VariableScope {
  const map: VariableScope = {};
  for (const v of variables) {
    map[v.name] = v.initial ?? "";
  }
  return map;
}

export function resolveVariable(
  name: string,
  scope: VariableScope,
  indices?: { i?: number; j?: number },
): string {
  let key = name;
  if (indices?.i !== undefined) {
    key = key.replace(/\{i\}/g, String(indices.i));
  }
  if (indices?.j !== undefined) {
    key = key.replace(/\{j\}/g, String(indices.j));
  }
  return scope[key] ?? `\${${name}}`;
}

export function detectVariables(
  template: string,
  excludeBuiltin: boolean = true,
): string[] {
  const pattern = /\$\{([^}]+)\}/g;
  const vars = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(template)) !== null) {
    const name = match[1].trim();
    if (excludeBuiltin && (name.startsWith("!") || isBuiltin(name))) continue;
    vars.add(name);
  }
  return Array.from(vars);
}

function isBuiltin(name: string): boolean {
  const builtins = [
    "DATE", "TIME", "NOW", "YEAR", "MONTH", "DAY",
    "NOMBRE", "EMPRESA", "DIRECCION", "TELEFONO", "NIT",
    "CAJA", "CAJERO", "TURNO", "SUCURSAL", "TERMINAL",
  ];
  return builtins.includes(name.toUpperCase());
}

export const SPECIAL_VARIABLES: { category: string; vars: { name: string; label: string }[] }[] = [
  {
    category: "Fecha y Hora",
    vars: [
      { name: "DATE", label: "Fecha actual" },
      { name: "TIME", label: "Hora actual" },
      { name: "NOW", label: "Fecha y hora" },
      { name: "YEAR", label: "Año" },
      { name: "MONTH", label: "Mes" },
      { name: "DAY", label: "Día" },
    ],
  },
  {
    category: "Empresa",
    vars: [
      { name: "NOMBRE", label: "Nombre empresa" },
      { name: "EMPRESA", label: "Razón social" },
      { name: "DIRECCION", label: "Dirección" },
      { name: "TELEFONO", label: "Teléfono" },
      { name: "NIT", label: "NIT/Cédula" },
    ],
  },
  {
    category: "Sesión",
    vars: [
      { name: "CAJA", label: "Caja" },
      { name: "CAJERO", label: "Cajero" },
      { name: "TURNO", label: "Turno" },
      { name: "SUCURSAL", label: "Sucursal" },
      { name: "TERMINAL", label: "Terminal" },
    ],
  },
];

export function replaceSpecialVariables(
  text: string,
  company?: Record<string, string>,
  session?: Record<string, string>,
): string {
  return text.replace(/\$\{!([A-Z_]+)(?::([^}]+))?\}/g, (_match, name: string, format?: string) => {
    const key = name.toUpperCase();
    if (key === "DATE" || key === "TIME" || key === "NOW" || key === "DATETIME") {
      const now = new Date();
      if (format) {
        return formatDate(now, format);
      }
      switch (key) {
        case "DATE": return now.toLocaleDateString("es-CR");
        case "TIME": return now.toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" });
        case "NOW":
        case "DATETIME":
          return now.toLocaleString("es-CR");
      }
    }
    if (key === "YEAR") return String(new Date().getFullYear());
    if (key === "MONTH") return String(new Date().getMonth() + 1);
    if (key === "DAY") return String(new Date().getDate());

    const companyVal = company?.[key];
    if (companyVal !== undefined) return companyVal;

    const sessionVal = session?.[key];
    if (sessionVal !== undefined) return sessionVal;

    return `\${!${name}}`;
  });
}

function formatDate(date: Date, format: string): string {
  const map: Record<string, string> = {
    YYYY: String(date.getFullYear()),
    YY: String(date.getFullYear()).slice(-2),
    MM: String(date.getMonth() + 1).padStart(2, "0"),
    DD: String(date.getDate()).padStart(2, "0"),
    HH: String(date.getHours()).padStart(2, "0"),
    mm: String(date.getMinutes()).padStart(2, "0"),
    ss: String(date.getSeconds()).padStart(2, "0"),
  };
  let result = format;
  for (const [key, val] of Object.entries(map)) {
    result = result.replace(key, val);
  }
  return result;
}
