import { describe, it, expect } from "vitest";
import { evaluateVisibility, evaluateDynamicStyles } from "@/modules/document-engine/validation";

describe("Condition Service", () => {
  describe("evaluateVisibility", () => {
    it("sin regla retorna true", () => {
      expect(evaluateVisibility(undefined, {})).toBe(true);
    });

    it("condición verdadera retorna true", () => {
      expect(evaluateVisibility({ condition: "total > 100" }, { total: 150 })).toBe(true);
    });

    it("condición falsa retorna false", () => {
      expect(evaluateVisibility({ condition: "total > 100" }, { total: 50 })).toBe(false);
    });

    it("condición vacía retorna true", () => {
      expect(evaluateVisibility({ condition: "" }, {})).toBe(true);
    });
  });

  describe("evaluateDynamicStyles", () => {
    it("retorna vacío sin reglas", () => {
      expect(evaluateDynamicStyles([], {})).toEqual({});
    });

    it("aplica estilos de reglas que coinciden", () => {
      const rules = [
        { condition: "total > 100", styles: { color: "red", fontWeight: "bold" } },
        { condition: "total <= 100", styles: { color: "green" } },
      ] as any[];
      const styles = evaluateDynamicStyles(rules, { total: 150 });
      expect(styles).toEqual({ color: "red", fontWeight: "bold" });
    });

    it("acumula estilos de múltiples reglas que coinciden", () => {
      const rules = [
        { condition: "activo", styles: { color: "blue" } },
        { condition: "vip", styles: { fontWeight: "bold" } },
      ] as any[];
      const styles = evaluateDynamicStyles(rules, { activo: true, vip: true });
      expect(styles).toEqual({ color: "blue", fontWeight: "bold" });
    });

    it("no aplica reglas que no coinciden", () => {
      const rules = [
        { condition: "falso", styles: { color: "red" } },
      ];
      expect(evaluateDynamicStyles(rules, { falso: false })).toEqual({});
    });

    it("reglas posteriores sobrescriben anteriores", () => {
      const rules = [
        { condition: "true", styles: { color: "red" } },
        { condition: "true", styles: { color: "blue" } },
      ];
      const styles = evaluateDynamicStyles(rules, {});
      expect(styles).toEqual({ color: "blue" });
    });
  });
});
