import { describe, it, expect } from "vitest";
import { computeResize, computeRotate, computeSkew, clamp, MIN_SIZE } from "@/modules/label-designer/transform";

describe("Transform Service", () => {
  describe("computeResize", () => {
    const base = { startX: 0, startY: 0, startW: 100, startH: 50 };

    it("redimensiona hacia la derecha (handle e)", () => {
      const result = computeResize({ ...base, x: 0, y: 0, w: 100, h: 50, handle: "e", dx: 20, dy: 0 });
      expect(result.w).toBe(120);
      expect(result.h).toBe(50);
      expect(result.x).toBe(0);
                          });

    it("redimensiona hacia abajo (handle s)", () => {
      const result = computeResize({ ...base, x: 0, y: 0, w: 100, h: 50, handle: "s", dx: 0, dy: 30 });
      expect(result.h).toBe(80);
      expect(result.w).toBe(100);
    });

    it("redimensiona hacia la izquierda (handle w)", () => {
      const result = computeResize({ ...base, x: 0, y: 0, w: 100, h: 50, handle: "w", dx: -20, dy: 0 });
      expect(result.x).toBe(-20);
      expect(result.w).toBe(120);
    });

    it("redimensiona hacia arriba (handle n)", () => {
      const result = computeResize({ ...base, x: 0, y: 0, w: 100, h: 50, handle: "n", dx: 0, dy: -10 });
      expect(result.y).toBe(-10);
      expect(result.h).toBe(60);
    });

    it("esquina (handle se) redimensiona ambas direcciones", () => {
      const result = computeResize({ ...base, x: 0, y: 0, w: 100, h: 50, handle: "se", dx: 30, dy: 20 });
      expect(result.w).toBe(130);
      expect(result.h).toBe(70);
    });

    it("esquina (handle nw) redimensiona hacia arriba-izquierda", () => {
      const result = computeResize({ ...base, x: 0, y: 0, w: 100, h: 50, handle: "nw", dx: -20, dy: -10 });
      expect(result.x).toBe(-20);
      expect(result.y).toBe(-10);
      expect(result.w).toBe(120);
      expect(result.h).toBe(60);
    });

    it("respeta el tamaño mínimo", () => {
      const result = computeResize({ ...base, x: 0, y: 0, w: 100, h: 50, handle: "w", dx: 200, dy: 0 });
      expect(result.w).toBe(MIN_SIZE);
    });

    it("clampa en el límite inferior con resize hacia se", () => {
      // Handle "e" no modifica X ni Y; la posición solo cambia con handles que incluyen "w" o "n"
      const result = computeResize({ ...base, x: 0, y: 0, w: 100, h: 50, handle: "se", dx: 50, dy: 50 });
      expect(result.w).toBe(150);
      expect(result.h).toBe(100);
    });

    it("clampa en el límite superior (x + w > 3000)", () => {
      const result = computeResize({ startX: 2950, startY: 0, startW: 60, startH: 50, x: 2950, y: 0, w: 60, h: 50, handle: "e", dx: 50, dy: 0 });
      expect(result.w).toBeLessThanOrEqual(50);
    });
  });

  describe("computeRotate", () => {
    it("sin movimiento de mouse mantiene el ángulo actual", () => {
      const startAngle = Math.atan2(0 - 100, 100 - 100);
      const result = computeRotate({
        centerClientX: 100, centerClientY: 100,
        mouseClientX: 100, mouseClientY: 0,
        startAngleRad: startAngle,
        startRotateDeg: 0,
        currentRotateDeg: 0,
      });
      expect(result).toBeCloseTo(0, 0);
    });
  });

  describe("computeSkew", () => {
    it("skew horizontal hacia la derecha", () => {
      const result = computeSkew({
        handle: "e", dx: 10, dy: 0, shiftKey: false,
        startSkewX: 0, startSkewY: 0,
        currentSkewX: 0, currentSkewY: 0,
        kind: "skewX",
      });
      expect(result.skewX).toBeCloseTo(2.8, 1);
      expect(result.skewY).toBe(0);
    });

    it("skew fino con Shift", () => {
      const result = computeSkew({
        handle: "e", dx: 10, dy: 0, shiftKey: true,
        startSkewX: 0, startSkewY: 0,
        currentSkewX: 0, currentSkewY: 0,
        kind: "skewX",
      });
      expect(result.skewX).toBeCloseTo(1.2, 1);
    });

    it("skew clamp a [-80, 80]", () => {
      const result = computeSkew({
        handle: "e", dx: 1000, dy: 0, shiftKey: false,
        startSkewX: 75, startSkewY: 0,
        currentSkewX: 75, currentSkewY: 0,
        kind: "skewX",
      });
      expect(result.skewX).toBe(80);
    });

    it("skewAuto horizontal", () => {
      const result = computeSkew({
        handle: "e", dx: 20, dy: 5, shiftKey: false,
        startSkewX: 0, startSkewY: 0,
        currentSkewX: 0, currentSkewY: 0,
      });
      expect(result.skewX).toBeGreaterThan(0);
      expect(result.skewY).toBe(0);
    });

    it("skewAuto vertical", () => {
      const result = computeSkew({
        handle: "s", dx: 5, dy: 20, shiftKey: false,
        startSkewX: 0, startSkewY: 0,
        currentSkewX: 0, currentSkewY: 0,
      });
      expect(result.skewY).toBeGreaterThan(0);
      expect(result.skewX).toBe(0);
    });
  });

  describe("clamp", () => {
    it("clampa valor dentro del rango", () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });
});
