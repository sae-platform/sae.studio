import { describe, it, expect } from "vitest";
import { intersects, contains, objRect, areaFromPoints, hitTestObjects } from "@/modules/label-designer/selection";

describe("Selection Utilities", () => {
  describe("intersects", () => {
    it("detecta intersección", () => {
      const a = { l: 0, t: 0, r: 10, b: 10 };
      const b = { l: 5, t: 5, r: 15, b: 15 };
      expect(intersects(a, b)).toBe(true);
    });

    it("detecta no intersección", () => {
      const a = { l: 0, t: 0, r: 10, b: 10 };
      const b = { l: 20, t: 20, r: 30, b: 30 };
      expect(intersects(a, b)).toBe(false);
    });

    it("contención completa también es intersección", () => {
      const outer = { l: 0, t: 0, r: 100, b: 100 };
      const inner = { l: 20, t: 20, r: 80, b: 80 };
      expect(intersects(outer, inner)).toBe(true);
    });
  });

  describe("contains", () => {
    it("contiene completamente", () => {
      const outer = { l: 0, t: 0, r: 100, b: 100 };
      const inner = { l: 20, t: 20, r: 80, b: 80 };
      expect(contains(outer, inner)).toBe(true);
    });

    it("no contiene si se sale por la derecha", () => {
      const outer = { l: 0, t: 0, r: 100, b: 100 };
      const inner = { l: 20, t: 20, r: 120, b: 80 };
      expect(contains(outer, inner)).toBe(false);
    });

    it("no contiene si está fuera", () => {
      const outer = { l: 0, t: 0, r: 100, b: 100 };
      const inner = { l: 200, t: 200, r: 300, b: 300 };
      expect(contains(outer, inner)).toBe(false);
    });
  });

  describe("objRect", () => {
    it("convierte objeto con x,y,w,h a rect", () => {
      const rect = objRect({ x: 10, y: 20, w: 30, h: 40 });
      expect(rect).toEqual({ l: 10, t: 20, r: 40, b: 60 });
    });
  });

  describe("areaFromPoints", () => {
    it("crea área desde dos puntos", () => {
      const area = areaFromPoints({ x: 10, y: 20 }, { x: 30, y: 50 });
      expect(area).toEqual({ l: 10, t: 20, r: 30, b: 50 });
    });

    it("maneja puntos en orden inverso", () => {
      const area = areaFromPoints({ x: 30, y: 50 }, { x: 10, y: 20 });
      expect(area).toEqual({ l: 10, t: 20, r: 30, b: 50 });
    });
  });

  describe("hitTestObjects", () => {
    const objects = [
      { id: "a", x: 0, y: 0, w: 50, h: 50 },
      { id: "b", x: 30, y: 30, w: 50, h: 50 },
      { id: "c", x: 100, y: 100, w: 50, h: 50 },
    ];

    it("modo touch selecciona por intersección", () => {
      const area = { l: 0, t: 0, r: 60, b: 60 };
      const ids = hitTestObjects(objects, area, "touch");
      expect(ids).toEqual(["a", "b"]);
    });

    it("modo contain selecciona solo los completamente dentro", () => {
      const area = { l: 0, t: 0, r: 160, b: 160 };
      const ids = hitTestObjects(objects, area, "contain");
      expect(ids).toEqual(["a", "b", "c"]);
    });

    it("modo contain no selecciona objetos parcialmente fuera", () => {
      const area = { l: 0, t: 0, r: 60, b: 60 };
      const ids = hitTestObjects(objects, area, "contain");
      expect(ids).toEqual(["a"]);
    });

    it("área vacía no selecciona nada", () => {
      const area = { l: 200, t: 200, r: 250, b: 250 };
      expect(hitTestObjects(objects, area, "touch")).toEqual([]);
      expect(hitTestObjects(objects, area, "contain")).toEqual([]);
    });
  });
});
