import { getPlugin } from "../object-registry/registry";
import type { RendererProps } from "../object-registry/types";

export function ObjectRenderer({ obj, zoom, variables }: RendererProps) {
  const plugin = getPlugin(obj.type);
  if (!plugin) {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.3, fontSize: 10 }}>
        {obj.type}
      </div>
    );
  }
  return plugin.Renderer({ obj, zoom, variables });
}
