export type LayerObj = { id: string; groupId?: string };

export function deleteSelected<T extends LayerObj>(objects: T[], ids: string[]): T[] {
  return objects.filter((o) => !ids.includes(o.id));
}

export function duplicateSelected<T extends LayerObj>(objects: T[], ids: string[]): { updated: T[]; newIds: string[] } {
  const toCopy = objects.filter((x) => ids.includes(x.id));
  if (toCopy.length === 0) return { updated: objects, newIds: [] };

  const copies = toCopy.map((o) => ({
    ...o,
    id: `o-${Date.now()}-${Math.random()}`,
    x: (o as any).x + 10,
    y: (o as any).y + 10,
  })) as T[];

  return { updated: [...objects, ...copies], newIds: copies.map((c) => c.id) };
}

export function bringToFront<T extends LayerObj>(objects: T[], id: string): T[] {
  const idx = objects.findIndex((o) => o.id === id);
  if (idx === -1) return objects;
  const next = [...objects];
  const [item] = next.splice(idx, 1);
  next.push(item);
  return next;
}

export function sendToBack<T extends LayerObj>(objects: T[], id: string): T[] {
  const idx = objects.findIndex((o) => o.id === id);
  if (idx === -1) return objects;
  const next = [...objects];
  const [item] = next.splice(idx, 1);
  next.unshift(item);
  return next;
}

export function groupObjects<T extends LayerObj>(objects: T[], ids: string[]): { updated: T[]; groupId: string } {
  if (ids.length < 2) return { updated: objects, groupId: "" };
  const groupId = `g-${crypto.randomUUID()}`;
  const updated = objects.map((o) => (ids.includes(o.id) ? { ...o, groupId } : o));
  return { updated, groupId };
}

export function ungroupObjects<T extends LayerObj>(objects: T[], selectedIds: string[]): T[] {
  const groupIds = new Set(
    objects
      .filter((o) => selectedIds.includes(o.id) && o.groupId)
      .map((o) => o.groupId!),
  );
  return objects.map((o) => (o.groupId && groupIds.has(o.groupId) ? { ...o, groupId: undefined } : o));
}

export function moveLayer<T extends LayerObj>(
  objects: T[],
  token: string,
  direction: "up" | "down" | "top" | "bottom",
): T[] {
  const ids = token.startsWith("group:")
    ? objects.filter((o) => o.groupId === token.slice(6)).map((o) => o.id)
    : [token];
  if (ids.length === 0) return objects;

  const idx = objects.findIndex((o) => o.id === ids[0]);
  if (idx < 0) return objects;

  const block = objects.filter((o) => ids.includes(o.id));
  const rest = objects.filter((o) => !ids.includes(o.id));

  if (direction === "up") rest.splice(Math.min(rest.length, idx + 1), 0, ...block);
  else if (direction === "down") rest.splice(Math.max(0, idx - 1), 0, ...block);
  else if (direction === "top") rest.push(...block);
  else rest.unshift(...block);

  return rest;
}

export function reorderByDrop<T extends LayerObj>(
  objects: T[],
  dragToken: string,
  targetToken: string,
): T[] {
  const dIds = dragToken.startsWith("group:")
    ? objects.filter((o) => o.groupId === dragToken.slice(6)).map((o) => o.id)
    : [dragToken];
  const tIds = targetToken.startsWith("group:")
    ? objects.filter((o) => o.groupId === targetToken.slice(6)).map((o) => o.id)
    : [targetToken];

  if (dIds.some((id) => tIds.includes(id))) return objects;

  const block = objects.filter((o) => dIds.includes(o.id));
  const rest = objects.filter((o) => !dIds.includes(o.id));
  const idx = rest.findIndex((o) => o.id === tIds[0]);
  if (idx < 0) return objects;

  rest.splice(idx, 0, ...block);
  return rest;
}

export function getGroupIds<T extends LayerObj>(objects: T[], id: string): string[] {
  const obj = objects.find((o) => o.id === id);
  if (!obj?.groupId) return [id];
  return objects.filter((o) => o.groupId === obj.groupId).map((o) => o.id);
}

export function getGroupIdsForSelection<T extends LayerObj>(
  objects: T[],
  id: string,
  selectedIds: string[],
): string[] {
  const obj = objects.find((o) => o.id === id);
  if (!obj?.groupId) return selectedIds.includes(id) ? selectedIds : [id];
  const groupIds = objects
    .filter((o) => o.groupId === obj.groupId)
    .map((o) => o.id);
  return selectedIds.some((sid) => groupIds.includes(sid)) ? selectedIds : groupIds;
}
