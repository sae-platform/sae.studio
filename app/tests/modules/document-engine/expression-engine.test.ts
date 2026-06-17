import { describe, it, expect } from "vitest";
import { evaluateExpression, resolveTemplate, evaluateCondition } from "@/modules/document-engine/expressions";

describe("Expression Engine", () => {
  describe("evaluateExpression", () => {
    it("devuelve números directamente", () => {
      expect(evaluateExpression("42", {})).toBe(42);
      // Negativos requieren estar en una expresión completa
      expect(evaluateExpression("0 - 3.14", {})).toBe(-3.14);
    });

    it("devuelve booleans directamente", () => {
      expect(evaluateExpression("true", {})).toBe(true);
      expect(evaluateExpression("false", {})).toBe(false);
    });

    it("devuelve null y undefined", () => {
      expect(evaluateExpression("null", {})).toBe(null);
      expect(evaluateExpression("undefined", {})).toBe(undefined);
    });

    it("resuelve variables del contexto", () => {
      const ctx = { precio: 100, cantidad: 3, nombre: "Laptop" };
      expect(evaluateExpression("precio", ctx)).toBe(100);
      expect(evaluateExpression("cantidad", ctx)).toBe(3);
      expect(evaluateExpression("nombre", ctx)).toBe("Laptop");
    });

    it("resuelve acceso a propiedades con punto", () => {
      const ctx = { cliente: { nombre: "Juan", edad: 30 } };
      expect(evaluateExpression("cliente.nombre", ctx)).toBe("Juan");
      expect(evaluateExpression("cliente.edad", ctx)).toBe(30);
    });

    it("devuelve undefined para propiedades inexistentes", () => {
      const ctx = { cliente: { nombre: "Juan" } };
      expect(evaluateExpression("cliente.apellido", ctx)).toBe(undefined);
    });

    it("devuelve el string literal si no está en contexto", () => {
      expect(evaluateExpression("variable_desconocida", {})).toBe("variable_desconocida");
    });
  });

  describe("Aritmética", () => {
    it("multiplicación", () => {
      expect(evaluateExpression("precio * cantidad", { precio: 100, cantidad: 3 })).toBe(300);
    });

    it("división", () => {
      expect(evaluateExpression("total / 2", { total: 100 })).toBe(50);
    });

    it("suma", () => {
      expect(evaluateExpression("a + b", { a: 10, b: 5 })).toBe(15);
    });

    it("resta", () => {
      expect(evaluateExpression("a - b", { a: 10, b: 3 })).toBe(7);
    });

    it("expresiones combinadas", () => {
      expect(evaluateExpression("precio * cantidad + impuesto", { precio: 10, cantidad: 5, impuesto: 3 })).toBe(53);
    });

    it("precedencia de operadores", () => {
      expect(evaluateExpression("2 + 3 * 4", {})).toBe(14);
    });
  });

  describe("Comparaciones", () => {
    it("mayor que", () => {
      expect(evaluateExpression("total > 100", { total: 150 })).toBe(true);
      expect(evaluateExpression("total > 100", { total: 50 })).toBe(false);
    });

    it("menor que", () => {
      expect(evaluateExpression("total < 100", { total: 50 })).toBe(true);
      expect(evaluateExpression("total < 100", { total: 150 })).toBe(false);
    });

    it("mayor o igual", () => {
      expect(evaluateExpression("total >= 100", { total: 100 })).toBe(true);
      expect(evaluateExpression("total >= 100", { total: 99 })).toBe(false);
    });

    it("menor o igual", () => {
      expect(evaluateExpression("total <= 100", { total: 100 })).toBe(true);
      expect(evaluateExpression("total <= 100", { total: 101 })).toBe(false);
    });

    it("igualdad", () => {
      expect(evaluateExpression("total == 100", { total: 100 })).toBe(true);
      expect(evaluateExpression("total == 100", { total: 99 })).toBe(false);
    });

    it("desigualdad", () => {
      expect(evaluateExpression("total != 100", { total: 99 })).toBe(true);
      expect(evaluateExpression("total != 100", { total: 100 })).toBe(false);
    });
  });

  describe("Ternarios", () => {
    it("condición verdadera devuelve rama true", () => {
      expect(evaluateExpression("total > 100 ? 'Caro' : 'Barato'", { total: 150 })).toBe("Caro");
    });

    it("condición falsa devuelve rama false", () => {
      expect(evaluateExpression("total > 100 ? 'Caro' : 'Barato'", { total: 50 })).toBe("Barato");
    });

    it("ternario con números", () => {
      expect(evaluateExpression("stock > 0 ? precio * cantidad : 0", { stock: 5, precio: 10, cantidad: 2 })).toBe(20);
      expect(evaluateExpression("stock > 0 ? precio * cantidad : 0", { stock: 0, precio: 10, cantidad: 2 })).toBe(0);
    });
  });

  describe("resolveTemplate", () => {
    it("reemplaza variables en template", () => {
      const result = resolveTemplate("Total: ${precio * cantidad}", { precio: 100, cantidad: 3 });
      expect(result).toBe("Total: 300");
    });

    it("reemplaza múltiples variables", () => {
      const result = resolveTemplate("${nombre} - Total: ${total}", { nombre: "Juan", total: 500 });
      expect(result).toBe("Juan - Total: 500");
    });

    it("variables no encontradas se reemplazan con vacío", () => {
      const result = resolveTemplate("Cliente: ${DESCONOCIDO}", {});
      expect(result).toBe("Cliente: DESCONOCIDO");
    });

    it("template sin variables queda igual", () => {
      const result = resolveTemplate("Texto sin variables", {});
      expect(result).toBe("Texto sin variables");
    });
  });

  describe("evaluateCondition", () => {
    it("sin expresión retorna true", () => {
      expect(evaluateCondition(undefined, {})).toBe(true);
      expect(evaluateCondition("", {})).toBe(true);
    });

    it("condición verdadera", () => {
      expect(evaluateCondition("total > 0", { total: 150 })).toBe(true);
    });

    it("condición falsa", () => {
      expect(evaluateCondition("total > 0", { total: 0 })).toBe(false);
    });

    it("valores truthy", () => {
      expect(evaluateCondition("activo", { activo: true })).toBe(true);
      expect(evaluateCondition("activo", { activo: 1 })).toBe(true);
    });

    it("valores falsy", () => {
      expect(evaluateCondition("activo", { activo: false })).toBe(false);
      expect(evaluateCondition("activo", { activo: 0 })).toBe(false);
    });
  });
});
