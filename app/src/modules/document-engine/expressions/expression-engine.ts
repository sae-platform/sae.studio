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
): string {
  return template.replace(/\$\{([^}]+)\}/g, (_match, expr: string) => {
    const result = evaluateExpression(expr.trim(), context);
    return result === undefined || result === null ? "" : String(result);
  });
}

export function evaluateCondition(
  expression: string | undefined,
  context: ExpressionContext,
): boolean {
  if (!expression || expression.trim() === "") return true;
  const result = evaluateExpression(expression.trim(), context);
  return Boolean(result);
}
