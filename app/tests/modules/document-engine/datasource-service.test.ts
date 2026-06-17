import { describe, it, expect } from "vitest";
import {
  createManualSource,
  createJsonSource,
  createExcelSource,
  flattenDataSource,
} from "@/modules/document-engine/datasources";

describe("Datasource Service", () => {
  describe("createManualSource", () => {
    it("crea datasource desde array de filas", () => {
      const source = createManualSource([
        { NOMBRE: "Juan", EDAD: "30" },
        { NOMBRE: "Ana", EDAD: "25" },
      ]);
      expect(source.type).toBe("manual");
      expect(source.rows).toHaveLength(2);
      expect(source.columns).toEqual(["NOMBRE", "EDAD"]);
    });

    it("array vacío tiene columnas vacías", () => {
      const source = createManualSource([]);
      expect(source.rows).toEqual([]);
      expect(source.columns).toEqual([]);
    });
  });

  describe("createJsonSource", () => {
    it("parsea JSON array", () => {
      const source = createJsonSource('[{"a":"1"},{"a":"2"}]');
      expect(source.type).toBe("json");
      expect(source.rows).toHaveLength(2);
      expect(source.columns).toEqual(["a"]);
    });

    it("parsea JSON objeto único como array", () => {
      const source = createJsonSource('{"nombre":"Juan"}');
      expect(source.rows).toHaveLength(1);
      expect(source.columns).toEqual(["nombre"]);
    });

    it("JSON inválido retorna vacío", () => {
      const source = createJsonSource("no es json");
      expect(source.rows).toEqual([]);
      expect(source.columns).toEqual([]);
    });
  });

  describe("createExcelSource", () => {
    it("crea fuente desde datos de Excel ya parseados", () => {
      const source = createExcelSource([{ COD: "001", DESC: "Item 1" }]);
      expect(source.type).toBe("excel");
      expect(source.rows).toHaveLength(1);
      expect(source.columns).toEqual(["COD", "DESC"]);
    });
  });

  describe("flattenDataSource", () => {
    it("aplana filas con prefijo listVar", () => {
      const source = createManualSource([
        { NOMBRE: "Juan", EDAD: "30" },
        { NOMBRE: "Ana", EDAD: "25" },
      ]);
      const flat = flattenDataSource(source, "CLIENTES");
      expect(flat).toEqual({
        CLIENTES_0_NOMBRE: "Juan",
        CLIENTES_0_EDAD: "30",
        CLIENTES_1_NOMBRE: "Ana",
        CLIENTES_1_EDAD: "25",
        CLIENTES_COUNT: "2",
      });
    });

    it("fuente vacía solo tiene COUNT=0", () => {
      const source = createManualSource([]);
      const flat = flattenDataSource(source, "ITEMS");
      expect(flat).toEqual({ ITEMS_COUNT: "0" });
    });
  });
});
