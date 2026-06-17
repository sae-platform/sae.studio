import type { TicketBlock } from "../stores/ticket.store";
import { getBlockPlugin } from "@/modules/ticketing/registry";

type TicketPreviewProps = {
  blocks: TicketBlock[];
  width: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

function BlockPreview({ block, width, selected, onSelect }: {
  block: TicketBlock;
  width: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const plugin = getBlockPlugin(block.type);
  if (plugin) {
    return <plugin.Renderer block={block as any} width={width} selected={selected} onSelect={onSelect} />;
  }
  return (
    <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-all", overflowWrap: "anywhere", lineHeight: 1.55 }}>
      {block.type}
    </div>
  );
}

export function TicketPreview({ blocks, width, selectedId, onSelect }: TicketPreviewProps) {
  if (blocks.length === 0) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted)", fontSize: "0.85rem", border: "1px dashed var(--border)", borderRadius: 8 }}>
        (Tiquete vacío)
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: "'Courier New', Courier, monospace",
      fontSize: "0.78rem",
      color: "#0f172a",
      background: "#fff",
      borderRadius: 6,
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      padding: "1.5rem 1.1rem",
      width: `${width}ch`,
      maxWidth: "100%",
      overflowX: "auto",
      whiteSpace: "pre-wrap",
      wordBreak: "break-all",
      overflowWrap: "anywhere",
    }}>
      {blocks.map((block) => (
        <BlockPreview
          key={block.id}
          block={block}
          width={width}
          selected={block.id === selectedId}
          onSelect={() => onSelect(block.id)}
        />
      ))}
    </div>
  );
}
