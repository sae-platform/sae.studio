import { describe, it, expect, beforeEach } from "vitest";
import { useHistoryStore } from "@/shared/history";

describe("History Store", () => {
  beforeEach(() => {
    useHistoryStore.getState().clear();
  });

  function store() {
    return useHistoryStore.getState();
  }

  it("push agrega operación al pasado", () => {
    store().push({ type: "test", description: "Test 1", undoData: { a: 1 } });
    expect(store().past).toHaveLength(1);
    expect(store().past[0].description).toBe("Test 1");
  });

  it("canUndo es true después de push", () => {
    store().push({ type: "test", description: "A", undoData: {} });
    expect(store().canUndo()).toBe(true);
  });

  it("canUndo es false al inicio", () => {
    expect(store().canUndo()).toBe(false);
  });

  it("undo retorna la operación y la mueve a futuro", () => {
    store().push({ type: "test", description: "Op 1", undoData: { x: 10 } });
    const op = store().undo();
    expect(op?.description).toBe("Op 1");
    expect(store().past).toHaveLength(0);
    expect(store().future).toHaveLength(1);
  });

  it("redo restaura desde futuro", () => {
    store().push({ type: "test", description: "Op 1", undoData: { x: 10 } });
    store().undo();
    const op = store().redo();
    expect(op?.description).toBe("Op 1");
    expect(store().past).toHaveLength(1);
    expect(store().future).toHaveLength(0);
  });

  it("futuro se descarta al hacer nuevo push después de undo", () => {
    store().push({ type: "test", description: "Op 1", undoData: {} });
    store().push({ type: "test", description: "Op 2", undoData: {} });
    store().undo();
    expect(store().future).toHaveLength(1);
    store().push({ type: "test", description: "Op 3", undoData: {} });
    expect(store().future).toHaveLength(0);
    expect(store().past).toHaveLength(2);
    expect(store().past[1].description).toBe("Op 3");
  });

  it("respeta maxEntries", () => {
    store().setMaxEntries(3);
    for (let i = 0; i < 5; i++) {
      store().push({ type: "test", description: `Op ${i}`, undoData: {} });
    }
    expect(store().past).toHaveLength(3);
    expect(store().past[0].description).toBe("Op 2");
    expect(store().past[2].description).toBe("Op 4");
  });

  it("clear vacía todo", () => {
    store().push({ type: "test", description: "X", undoData: {} });
    store().undo();
    store().clear();
    expect(store().past).toHaveLength(0);
    expect(store().future).toHaveLength(0);
  });
});
