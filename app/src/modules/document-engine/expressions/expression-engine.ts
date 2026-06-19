export type ExpressionContext = Record<string, unknown>;

function resolvePath(obj: unknown, path: string): unknown {
  if (obj === null || obj === undefined) return undefined;
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function evaluateSimpleExpr(expr: string, context: ExpressionContext): unknown {
  const trimmed = expr.trim();

  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if (trimmed === "undefined") return undefined;

  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);

  if (/^'[^']*'$/.test(trimmed) || /^"[^"]*"$/.test(trimmed)) {
    return trimmed.slice(1, -1);
  }

  if (trimmed.includes(".")) {
    return resolvePath(context, trimmed);
  }

  if (trimmed in context) return context[trimmed];

  return trimmed;
}

function parseTernary(expr: string, context: ExpressionContext): unknown {
  const qIdx = expr.indexOf("?");
  if (qIdx === -1) return evaluateComparison(expr, context);

  const condExpr = expr.slice(0, qIdx).trim();
  const rest = expr.slice(qIdx + 1);
  const colonIdx = rest.lastIndexOf(":");
  if (colonIdx === -1) return evaluateComparison(expr, context);

  const trueExpr = rest.slice(0, colonIdx).trim();
  const falseExpr = rest.slice(colonIdx + 1).trim();
  const cond = evaluateComparison(condExpr, context);

  if (cond) {
    return typeof trueExpr === "string" && /^'[^']*'$|^"[^"]*"$/.test(trueExpr)
      ? trueExpr.slice(1, -1)
      : evaluateTerm(trueExpr, context);
  }
  return typeof falseExpr === "string" && /^'[^']*'$|^"[^"]*"$/.test(falseExpr)
    ? falseExpr.slice(1, -1)
    : evaluateTerm(falseExpr, context);
}

function evaluateComparison(expr: string, context: ExpressionContext): unknown {
  const ops = [">=", "<=", "!=", "==", ">", "<"];
  for (const op of ops) {
    const idx = expr.indexOf(op);
    if (idx === -1) continue;
    const left = evaluateTerm(expr.slice(0, idx).trim(), context);
    const right = evaluateTerm(expr.slice(idx + op.length).trim(), context);
    switch (op) {
      case "==": return left == right;
      case "!=": return left != right;
      case ">=": return Number(left) >= Number(right);
      case "<=": return Number(left) <= Number(right);
      case ">": return Number(left) > Number(right);
      case "<": return Number(left) < Number(right);
    }
  }
  return evaluateTerm(expr, context);
}

function evaluateTerm(expr: string, context: ExpressionContext): unknown {
  const parts = expr.split(/(\+|-)/).filter(Boolean);
  if (parts.length === 1) return evaluateFactor(parts[0].trim(), context);

  let result = Number(evaluateFactor(parts[0].trim(), context));
  for (let i = 1; i < parts.length; i += 2) {
    const op = parts[i];
    const val = Number(evaluateFactor(parts[i + 1]?.trim() ?? "0", context));
    result = op === "+" ? result + val : result - val;
  }
  return result;
}

function evaluateFactor(expr: string, context: ExpressionContext): unknown {
  const parts = expr.split(/(\*|\/)/).filter(Boolean);
  if (parts.length === 1) return evaluateSimpleExpr(parts[0].trim(), context);

  let result = Number(evaluateSimpleExpr(parts[0].trim(), context));
  for (let i = 1; i < parts.length; i += 2) {
    const op = parts[i];
    const val = Number(evaluateSimpleExpr(parts[i + 1]?.trim() ?? "1", context));
    result = op === "*" ? result * val : result / val;
  }
  return result;
}

export function evaluateExpression(expr: string, context: ExpressionContext): unknown {
  try {
    return parseTernary(expr, context);
  } catch {
    return expr;
  }
}

export function resolveTemplate(
  template: string,
  context: ExpressionContext,
  pageNumber?: number,
  totalPages?: number,
): string {
  return template.replace(/\$\{([^}]+)\}/g, (_match, expr: string) => {
    const trimmed = expr.trim();

    // Builtins
    if (trimmed.startsWith("!")) {
      return resolveBuiltin(trimmed, pageNumber, totalPages);
    }

    // Functions: SUM(), AVG(), COUNT(), MAX(), MIN()
    const funcMatch = trimmed.match(/^(\w+)\(([^)]*)\)$/);
    if (funcMatch) {
      const result = resolveFunction(funcMatch[1].toUpperCase(), funcMatch[2].trim(), context);
      return result === undefined || result === null ? "" : String(result);
    }

    const result = evaluateExpression(trimmed, context);
    return result === undefined || result === null ? "" : String(result);
  });
}

function resolveBuiltin(name: string, page?: number, total?: number): string {
  const now = new Date();
  switch (name) {
    case "!DATE": return now.toLocaleDateString("es-CR");
    case "!TIME": return now.toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" });
    case "!DATETIME": return `${now.toLocaleDateString("es-CR")} ${now.toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" })}`;
    case "!YEAR": return String(now.getFullYear());
    case "!MONTH": return String(now.getMonth() + 1).padStart(2, "0");
    case "!DAY": return String(now.getDate()).padStart(2, "0");
    case "!PAGE": return page != null ? String(page) : "1";
    case "!TOTAL_PAGES": return total != null ? String(total) : "1";
    default: return "";
  }
}

function resolveFunction(name: string, arg: string, context: ExpressionContext): unknown {
  // Resolve array from context (e.g., "Items" → context["Items"])
  const resolved = evaluateExpression(arg, context);
  if (!resolved || !Array.isArray(resolved)) return resolved;

  const arr = resolved as Record<string, unknown>[];
  if (arr.length === 0) return name === "COUNT" ? 0 : undefined;

  // For SUM/AVG/MAX/MIN, extract numeric values using the field path
  // e.g., SUM(Items.Total) → sum all Items[i].Total
  // e.g., COUNT(Items) → count items
  // e.g., SUM(Detalle.Total) → if Detalle is an array of {Total: number}
  const values = arr.map(item => Number(item[arg.split(".").pop()!] ?? 0)).filter(v => !isNaN(v));

  switch (name) {
    case "SUM": return values.reduce((a, b) => a + b, 0);
    case "AVG": return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    case "COUNT": return arr.length;
    case "MAX": return values.length > 0 ? Math.max(...values) : 0;
    case "MIN": return values.length > 0 ? Math.min(...values) : 0;
    default: return undefined;
  }
}

export function formatValue(value: unknown, format?: string, formatString?: string): string {
  if (value === null || value === undefined) return "";
  const num = Number(value);

  switch (format) {
    case "currency": return new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", minimumFractionDigits: 2 }).format(isNaN(num) ? 0 : num);
    case "number": return new Intl.NumberFormat("es-CR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(isNaN(num) ? 0 : num);
    case "percent": return new Intl.NumberFormat("es-CR", { style: "percent", minimumFractionDigits: 2 }).format(isNaN(num) ? 0 : num / 100);
    case "date": {
      const d = new Date(String(value));
      return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("es-CR");
    }
    case "datetime": {
      const d = new Date(String(value));
      return isNaN(d.getTime()) ? String(value) : `${d.toLocaleDateString("es-CR")} ${d.toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" })}`;
    }
    case "custom": {
      if (!formatString) return String(value);
      // Simple formatting: #,##0.00 → Intl
      const decimals = (formatString.match(/0\.(0+)/)?.[1]?.length) ?? 0;
      return new Intl.NumberFormat("es-CR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(isNaN(num) ? 0 : num);
    }
    default: return String(value);
  }
}

export function evaluateCondition(
  expression: string | undefined,
  context: ExpressionContext,
): boolean {
  if (!expression || expression.trim() === "") return true;
  const result = evaluateExpression(expression.trim(), context);
  return Boolean(result);
}
