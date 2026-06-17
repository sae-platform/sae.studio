export const MIN_SIZE = 4;

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function ensureNum(value: number | undefined, fallback: number): number {
  return value ?? fallback;
}

export type ResizeHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export const RESIZE_HANDLES: ResizeHandle[] = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];

export type DragHandle = { name: ResizeHandle; kind: "rotate" | "skewAuto" | "skewX" | "skewY" };

export function getTransformKind(handle: ResizeHandle): "rotate" | "skewAuto" {
  return handle.length === 2 ? "rotate" : "skewAuto";
}

export type ResizeInput = {
  x: number;
  y: number;
  w: number;
  h: number;
  handle: ResizeHandle;
  dx: number;
  dy: number;
  startX: number;
  startY: number;
  startW: number;
  startH: number;
};

export function computeResize(input: ResizeInput): { x: number; y: number; w: number; h: number } {
  const { handle, dx, dy, startX, startY, startW, startH } = input;
  let x = startX;
  let y = startY;
  let w = startW;
  let ht = startH;

  if (handle.includes("e")) w = Math.max(MIN_SIZE, startW + dx);
  if (handle.includes("s")) ht = Math.max(MIN_SIZE, startH + dy);
  if (handle.includes("w")) {
    const right = startX + startW;
    x = startX + dx;
    w = Math.max(MIN_SIZE, right - x);
  }
  if (handle.includes("n")) {
    const bottom = startY + startH;
    y = startY + dy;
    ht = Math.max(MIN_SIZE, bottom - y);
  }

  if (x < -1000) { w += x + 1000; x = -1000; }
  if (y < -1000) { ht += y + 1000; y = -1000; }
  if (x + w > 3000) w = 3000 - x;
  if (y + ht > 3000) ht = 3000 - y;

  return { x, y, w, h: ht };
}

export type RotateInput = {
  centerClientX: number;
  centerClientY: number;
  mouseClientX: number;
  mouseClientY: number;
  startAngleRad: number;
  startRotateDeg: number | undefined;
  currentRotateDeg: number;
};

export function computeRotate(input: RotateInput): number {
  const { centerClientX, centerClientY, mouseClientX, mouseClientY, startAngleRad, startRotateDeg } = input;
  const currentAngle = Math.atan2(mouseClientY - centerClientY, mouseClientX - centerClientX);
  const deltaDeg = ((currentAngle - startAngleRad) * 180) / Math.PI;
  return ensureNum(startRotateDeg, input.currentRotateDeg) + deltaDeg;
}

export type SkewInput = {
  handle: ResizeHandle;
  dx: number;
  dy: number;
  shiftKey: boolean;
  startSkewX: number | undefined;
  startSkewY: number | undefined;
  currentSkewX: number;
  currentSkewY: number;
  kind?: "skewAuto" | "skewX" | "skewY";
};

export function computeSkew(input: SkewInput): { skewX: number; skewY: number } {
  const { handle, dx, dy, shiftKey, startSkewX, startSkewY, currentSkewX, currentSkewY } = input;
  const skewFactor = shiftKey ? 0.12 : 0.28;
  const kind = input.kind ?? (handle.length === 2 ? "rotate" : "skewAuto");
  let skewX = currentSkewX;
  let skewY = currentSkewY;

  if (kind === "skewAuto") {
    if (Math.abs(dx) >= Math.abs(dy)) {
      const dir = handle === "w" || handle === "nw" || handle === "sw" ? -1 : 1;
      skewX = clamp(ensureNum(startSkewX, currentSkewX) + dx * dir * skewFactor, -80, 80);
    } else {
      const dir = handle === "n" || handle === "ne" || handle === "nw" ? -1 : 1;
      skewY = clamp(ensureNum(startSkewY, currentSkewY) + dy * dir * skewFactor, -80, 80);
    }
  } else if (kind === "skewX") {
    const dir = handle === "w" ? -1 : 1;
    skewX = clamp(ensureNum(startSkewX, currentSkewX) + dx * dir * skewFactor, -80, 80);
  } else {
    const dir = handle === "n" ? -1 : 1;
    skewY = clamp(ensureNum(startSkewY, currentSkewY) + dy * dir * skewFactor, -80, 80);
  }

  return { skewX, skewY };
}
