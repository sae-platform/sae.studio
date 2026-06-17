import { evaluateCondition } from "@/modules/document-engine/expressions";
import type { ExpressionContext } from "@/modules/document-engine/expressions";

export interface StyleRule {
  condition: string;
  styles: Record<string, string>;
}

export interface VisibilityRule {
  condition: string;
}

export function evaluateVisibility(
  rule: VisibilityRule | undefined,
  context: ExpressionContext,
): boolean {
  if (!rule) return true;
  return evaluateCondition(rule.condition, context);
}

export function evaluateDynamicStyles(
  rules: StyleRule[],
  context: ExpressionContext,
): Record<string, string> {
  const styles: Record<string, string> = {};
  for (const rule of rules) {
    if (evaluateCondition(rule.condition, context)) {
      Object.assign(styles, rule.styles);
    }
  }
  return styles;
}
