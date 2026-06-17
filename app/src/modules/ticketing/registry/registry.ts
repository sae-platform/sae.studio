import type { BlockPlugin } from "./types";

const registry = new Map<string, BlockPlugin>();

export function registerBlockPlugin(plugin: BlockPlugin): void {
  registry.set(plugin.type, plugin);
}

export function getBlockPlugin(type: string): BlockPlugin | undefined {
  return registry.get(type);
}

export function getRegisteredBlockTypes(): string[] {
  return Array.from(registry.keys());
}

export function getBlockPluginsByCategory(category: string): BlockPlugin[] {
  return Array.from(registry.values()).filter((p) => p.metadata.category === category);
}

export function getAllBlockPlugins(): BlockPlugin[] {
  return Array.from(registry.values());
}

export function createBlock(type: string): ReturnType<BlockPlugin["createDefault"]> | null {
  const plugin = registry.get(type);
  if (!plugin) return null;
  return plugin.createDefault();
}
