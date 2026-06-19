// Selection utilities ported from label designer
export type Rect = { l: number; t: number; r: number; b: number };

export function intersects(a: Rect, b: Rect): boolean {
  return !(a.r < b.l || a.l > b.r || a.b < b.t || a.t > b.b);
}

export function contains(container: Rect, target: Rect): boolean {
  return target.l >= container.l && target.t >= container.t && target.r <= container.r && target.b <= container.b;
}

export function objRect(o: { x: number; y: number; width?: number; height?: number }): Rect {
  return { l: o.x, t: o.y, r: o.x + (o.width ?? 60), b: o.y + (o.height ?? 10) };
}

export function areaFromPoints(p1: { x: number; y: number }, p2: { x: number; y: number }): Rect {
  return { l: Math.min(p1.x, p2.x), t: Math.min(p1.y, p2.y), r: Math.max(p1.x, p2.x), b: Math.max(p1.y, p2.y) };
}

export type SelectionMode = "touch" | "contain";
