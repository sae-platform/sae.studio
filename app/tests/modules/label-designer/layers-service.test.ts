import { describe, it, expect } from "vitest";
import {
  deleteSelected,
  duplicateSelected,
  bringToFront,
  sendToBack,
  groupObjects,
  ungroupObjects,
  moveLayer,
  reorderByDrop,
  getGroupIds,
  getGroupIdsForSelection,
} from "@/modules/label-designer/layers";
import type { LayerObj } from "@/modules/label-designer/layers";

type Obj = LayerObj & { type: string; name: string };

function obj(id: string, name: string, groupId?: string): Obj {
  return { id, name, type: "text", groupId };
}

describe("Layers Service", () => {
  const objs: Obj[] = [
    obj("1", "Fondo"),
    obj("2", "Medio"),
    obj("3", "Frente"),
    obj("4", "Extra"),
  ];

  describe("deleteSelected", () => {
    it("elimina objetos por IDs", () => {
      const result = deleteSelected(objs, ["2", "4"]);
      expect(result).toHaveLength(2);
      expect(result.map((o) => o.id)).toEqual(["1", "3"]);
    });

    it("no modifica si IDs no existen", () => {
      const result = deleteSelected(objs, ["99"]);
      expect(result).toEqual(objs);
    });
  });

  describe("duplicateSelected", () => {
    it("duplica objetos con offset", () => {
      const withPos = objs.map((o) => ({ ...o, x: 10, y: 20 }));
      const { updated, newIds } = duplicateSelected(withPos, ["2"]);
      expect(updated).toHaveLength(5);
      expect(newIds).toHaveLength(1);
      const copy = updated[4] as any;
      expect(copy.x).toBe(20);
      expect(copy.y).toBe(30);
    });

    it("retorna vacío si no hay seleccionados", () => {
      const { updated, newIds } = duplicateSelected(objs, []);
      expect(updated).toBe(objs);
      expect(newIds).toEqual([]);
    });
  });

  describe("bringToFront", () => {
    it("mueve al final del array", () => {
      const result = bringToFront(objs, "2");
      expect(result.map((o) => o.id)).toEqual(["1", "3", "4", "2"]);
    });

    it("no modifica si id no existe", () => {
      expect(bringToFront(objs, "99")).toEqual(objs);
    });
  });

  describe("sendToBack", () => {
    it("mueve al inicio del array", () => {
      const result = sendToBack(objs, "3");
      expect(result.map((o) => o.id)).toEqual(["3", "1", "2", "4"]);
    });
  });

  describe("groupObjects", () => {
    it("agrupa objetos seleccionados", () => {
      const { updated, groupId } = groupObjects(objs, ["1", "3"]);
      expect(groupId).toMatch(/^g-/);
      const g1 = updated.find((o) => o.id === "1");
      const g3 = updated.find((o) => o.id === "3");
      expect(g1?.groupId).toBe(groupId);
      expect(g3?.groupId).toBe(groupId);
      expect(updated.find((o) => o.id === "2")?.groupId).toBeUndefined();
    });

    it("requiere al menos 2 objetos", () => {
      const { updated, groupId } = groupObjects(objs, ["1"]);
      expect(groupId).toBe("");
      expect(updated).toBe(objs);
    });
  });

  describe("ungroupObjects", () => {
    it("desagrupa objetos del grupo del seleccionado", () => {
      const grouped = [
        obj("1", "A", "g1"),
        obj("2", "B", "g1"),
        obj("3", "C"),
      ];
      const result = ungroupObjects(grouped, ["1"]);
      expect(result[0].groupId).toBeUndefined();
      expect(result[1].groupId).toBeUndefined();
      expect(result[2].groupId).toBeUndefined();
    });
  });

  describe("moveLayer", () => {
    it("mueve hacia arriba", () => {
      const result = moveLayer(objs, "2", "up");
      expect(result.map((o) => o.id)).toEqual(["1", "3", "2", "4"]);
    });

    it("mueve hacia abajo", () => {
      const result = moveLayer(objs, "3", "down");
      expect(result.map((o) => o.id)).toEqual(["1", "3", "2", "4"]);
    });

    it("mueve al frente", () => {
      const result = moveLayer(objs, "1", "top");
      expect(result.map((o) => o.id)).toEqual(["2", "3", "4", "1"]);
    });

    it("mueve al fondo", () => {
      const result = moveLayer(objs, "4", "bottom");
      expect(result.map((o) => o.id)).toEqual(["4", "1", "2", "3"]);
    });

    it("mueve grupos completos", () => {
      const grouped: Obj[] = [
        obj("1", "A", "g1"),
        obj("2", "B", "g1"),
        obj("3", "C"),
        obj("4", "D"),
      ];
      const result = moveLayer(grouped, "group:g1", "top");
      expect(result.map((o) => o.id)).toEqual(["3", "4", "1", "2"]);
    });
  });

  describe("reorderByDrop", () => {
    it("reordena arrastrando un objeto sobre otro", () => {
      const result = reorderByDrop(objs, "4", "2");
      expect(result.map((o) => o.id)).toEqual(["1", "4", "2", "3"]);
    });

    it("no hace nada si origen igual a destino", () => {
      expect(reorderByDrop(objs, "2", "2")).toEqual(objs);
    });

    it("maneja grupos completos", () => {
      const grouped: Obj[] = [
        obj("1", "A", "g1"),
        obj("2", "B", "g1"),
        obj("3", "C"),
        obj("4", "D"),
      ];
      const result = reorderByDrop(grouped, "group:g1", "4");
      expect(result.map((o) => o.id)).toEqual(["3", "1", "2", "4"]);
    });
  });

  describe("getGroupIds", () => {
    it("devuelve miembros del grupo", () => {
      const objs: Obj[] = [obj("1", "A", "g1"), obj("2", "B", "g1"), obj("3", "C")];
      expect(getGroupIds(objs, "1")).toEqual(["1", "2"]);
    });

    it("devuelve solo el id si no tiene grupo", () => {
      expect(getGroupIds(objs, "4")).toEqual(["4"]);
    });
  });

  describe("getGroupIdsForSelection", () => {
    const groupObjs: Obj[] = [obj("1", "A", "g1"), obj("2", "B", "g1"), obj("3", "C")];

    it("selecciona grupo completo si ningún miembro está seleccionado", () => {
      expect(getGroupIdsForSelection(groupObjs, "1", [])).toEqual(["1", "2"]);
    });

    it("mantiene selección existente si ya hay miembros del grupo", () => {
      expect(getGroupIdsForSelection(groupObjs, "1", ["2", "3"])).toEqual(["2", "3"]);
    });

    it("devuelve solo el id sin grupo", () => {
      expect(getGroupIdsForSelection(groupObjs, "3", [])).toEqual(["3"]);
    });
  });
});
