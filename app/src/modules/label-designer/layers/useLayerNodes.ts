import { useRef, useMemo } from "react";

export type LayerNode<T extends { id: string; groupId?: string }> =
  | { kind: "group"; groupId: string; members: T[] }
  | { kind: "item"; object: T };

export function useLayerNodes<T extends { id: string; groupId?: string }>(objects: T[]): LayerNode<T>[] {
  return useMemo(() => {
    const reversed = [...objects].reverse();
    const seenGroups = new Set<string>();
    const nodes: LayerNode<T>[] = [];

    for (const obj of reversed) {
      if (obj.groupId) {
        if (seenGroups.has(obj.groupId)) continue;
        seenGroups.add(obj.groupId);
        nodes.push({
          kind: "group",
          groupId: obj.groupId,
          members: reversed.filter((x) => x.groupId === obj.groupId),
        });
      } else {
        nodes.push({ kind: "item", object: obj });
      }
    }

    return nodes;
  }, [objects]);
}
