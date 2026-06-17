import { describe, it, expect } from "vitest";
import {
  buildVariableMap,
  detectVariables,
  replaceSpecialVariables,
} from "@/modules/document-engine/variables";

describe("Variable Resolver", () => {
  describe("buildVariableMap", () => {
    it("construye mapa desde definiciones", () => {
      const vars = [
        { name: "NOMBRE", type: "text" as const, initial: "Juan" },
        { name: "PRECIO", type: "text" as const, initial: "100" },
      ];
      const map = buildVariableMap(vars);
      expect(map).toEqual({ NOMBRE: "Juan", PRECIO: "100" });
    });

    it("variables sin initial tienen string vacío", () => {
      const vars = [{ name: "X", type: "text" as const }];
      expect(buildVariableMap(vars)).toEqual({ X: "" });
    });
  });

  describe("detectVariables", () => {
    it("detecta variables en texto", () => {
      const vars = detectVariables("${CLIENTE} compró ${CANTIDAD} items");
      expect(vars).toEqual(["CLIENTE", "CANTIDAD"]);
    });

    it("excluye variables built-in", () => {
      const vars = detectVariables("${DATE} ${NOMBRE} ${TIME}");
      expect(vars).toEqual([]);
    });

    it("excluye variables especiales (!)", () => {
      const vars = detectVariables("${!date} ${CLIENTE}");
      expect(vars).toEqual(["CLIENTE"]);
    });

    it("incluye variables built-in si excludeBuiltin=false", () => {
      const vars = detectVariables("${DATE} ${NOMBRE}", false);
      expect(vars).toEqual(["DATE", "NOMBRE"]);
    });

    it("retorna array vacío si no hay variables", () => {
      expect(detectVariables("Texto sin variables")).toEqual([]);
    });
  });

  describe("replaceSpecialVariables", () => {
    it("reemplaza ${!DATE} con fecha actual", () => {
      const result = replaceSpecialVariables("Fecha: ${!DATE}");
      expect(result).not.toContain("${!DATE}");
      expect(result).toMatch(/Fecha: \d/);
    });

    it("reemplaza ${!DATE:DD/MM/YYYY} con formato", () => {
      const result = replaceSpecialVariables("${!DATE:DD/MM/YYYY}", {});
      expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });

    it("reemplaza ${!TIME} con hora", () => {
      const result = replaceSpecialVariables("Hora: ${!TIME}");
      expect(result).toMatch(/Hora: \d{2}:\d{2}/);
    });

    it("reemplaza ${!YEAR} con año actual", () => {
      const result = replaceSpecialVariables("${!YEAR}");
      expect(result).toBe(String(new Date().getFullYear()));
    });

    it("reemplaza ${!MONTH} con mes", () => {
      const result = replaceSpecialVariables("${!MONTH}");
      expect(result).toBe(String(new Date().getMonth() + 1));
    });

    it("reemplaza variables de empresa", () => {
      const result = replaceSpecialVariables("${!EMPRESA}", { EMPRESA: "Mi Empresa" });
      expect(result).toBe("Mi Empresa");
    });

    it("reemplaza variables de sesión", () => {
      const result = replaceSpecialVariables(
        "${!CAJERO} en ${!CAJA}",
        undefined,
        { CAJERO: "Juan", CAJA: "Caja 1" },
      );
      expect(result).toBe("Juan en Caja 1");
    });

    it("prioriza empresa sobre sesión", () => {
      const result = replaceSpecialVariables(
        "${!NOMBRE}",
        { NOMBRE: "Empresa S.A." },
        { NOMBRE: "Juan" },
      );
      expect(result).toBe("Empresa S.A.");
    });

    it("conserva variables no encontradas", () => {
      const result = replaceSpecialVariables("${!VARIABLE_INEXISTENTE}");
      expect(result).toBe("${!VARIABLE_INEXISTENTE}");
    });

    it("texto sin variables queda igual", () => {
      expect(replaceSpecialVariables("Hola mundo")).toBe("Hola mundo");
    });
  });
});
