import type { DocumentElement } from "./models/elements";

export function groupElements(bandElements: DocumentElement[], ids: Set<string>): DocumentElement[] | null {
  if (ids.size < 2) return null;
  const groupId = `g-${crypto.randomUUID().slice(0, 8)}`;
  return bandElements.map(el => ids.has(el.id) ? { ...el, groupId } as any as DocumentElement : el);
}

export function ungroupElements(bandElements: DocumentElement[], selectedIds: Set<string>): DocumentElement[] | null {
  const groupIds = new Set<string>();
  for (const el of bandElements) {
    const gid = (el as any).groupId as string | undefined;
    if (gid && selectedIds.has(el.id)) groupIds.add(gid);
  }
  if (groupIds.size === 0) return null;
  return bandElements.map(el => {
    const gid = (el as any).groupId as string | undefined;
    if (gid && groupIds.has(gid)) {
      const { groupId: _, ...rest } = el as any;
      return rest as DocumentElement;
    }
    return el;
  });
}
