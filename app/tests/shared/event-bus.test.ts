import { describe, it, expect, vi } from "vitest";
import { eventBus } from "@/shared/events";

describe("Event Bus", () => {
  it("registra y llama listener", () => {
    const fn = vi.fn();
    eventBus.on("test.event", fn);
    eventBus.emit("test.event", { data: 42 });
    expect(fn).toHaveBeenCalledWith({ data: 42 });
  });

  it("off desregistra listener", () => {
    const fn = vi.fn();
    eventBus.on("test.off", fn);
    eventBus.off("test.off", fn);
    eventBus.emit("test.off", {});
    expect(fn).not.toHaveBeenCalled();
  });

  it("múltiples listeners para el mismo evento", () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    eventBus.on("test.multi", fn1);
    eventBus.on("test.multi", fn2);
    eventBus.emit("test.multi", "x");
    expect(fn1).toHaveBeenCalledWith("x");
    expect(fn2).toHaveBeenCalledWith("x");
  });

  it("once llama solo una vez", () => {
    const fn = vi.fn();
    eventBus.once("test.once", fn);
    eventBus.emit("test.once", 1);
    eventBus.emit("test.once", 2);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(1);
  });

  it("clear borra un evento específico", () => {
    const fn = vi.fn();
    eventBus.on("test.clear", fn);
    eventBus.clear("test.clear");
    eventBus.emit("test.clear", {});
    expect(fn).not.toHaveBeenCalled();
  });

  it("clear sin argumentos borra todo", () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    eventBus.on("test.a", fn1);
    eventBus.on("test.b", fn2);
    eventBus.clear();
    eventBus.emit("test.a", {});
    eventBus.emit("test.b", {});
    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).not.toHaveBeenCalled();
  });

  it("errores en listeners no rompen otros listeners", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const bad = () => { throw new Error("fail"); };
    const good = vi.fn();
    eventBus.on("test.error", bad);
    eventBus.on("test.error", good);
    eventBus.emit("test.error", {});
    expect(good).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
