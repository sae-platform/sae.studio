import type { TicketBlock } from "../stores/ticket.store";
import { getBlockPlugin } from "@/modules/ticketing/registry";

type PropsPanelProps = {
  block: TicketBlock;
  onChange: (block: TicketBlock) => void;
};

export function TicketPropertiesPanel({ block, onChange }: PropsPanelProps) {
  const plugin = getBlockPlugin(block.type);
  if (plugin?.Inspector) {
    return <plugin.Inspector block={block as any} onChange={onChange as any} />;
  }

  return (
    <div style={{ padding: "1rem", color: "var(--muted)", fontSize: "0.85rem", textAlign: "center" }}>
      Bloque "{block.type}" sin propiedades editables
    </div>
  );
}
