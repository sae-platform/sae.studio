import type { ObjectPlugin } from "./types";

const registry = new Map<string, ObjectPlugin>();

export function registerPlugin(plugin: ObjectPlugin): void {
  if (registry.has(plugin.type)) {
    console.warn(`[ObjectRegistry] Plugin "${plugin.type}" already registered, overwriting.`);
  }
  registry.set(plugin.type, plugin);
}

export function getPlugin(type: string): ObjectPlugin | undefined {
  return registry.get(type);
}

export function getRegisteredTypes(): string[] {
  return Array.from(registry.keys());
}

export function getPluginsByCategory(category: string): ObjectPlugin[] {
  return Array.from(registry.values()).filter((p) => p.metadata.category === category);
}

export function getAllPlugins(): ObjectPlugin[] {
  return Array.from(registry.values());
}

export function createObject(type: string): ReturnType<ObjectPlugin["createDefault"]> | null {
  const plugin = registry.get(type);
  if (!plugin) return null;
  return plugin.createDefault();
}

export function renderObject(type: string, props: Parameters<ObjectPlugin["Renderer"]>[0]): ReturnType<ObjectPlugin["Renderer"]> | null {
  const plugin = registry.get(type);
  if (!plugin) return null;
  return plugin.Renderer(props as any);
}

export function hasInspector(type: string): boolean {
  const plugin = registry.get(type);
  return plugin?.Inspector !== undefined;
}
