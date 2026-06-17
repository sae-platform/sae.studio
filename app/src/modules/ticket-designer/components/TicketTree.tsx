import { useState, type DragEvent } from "react";
import type { TicketNode, TicketBlock, TicketGroup } from "../stores/ticket.store";
import { useTicketStore } from "../stores/ticket.store";

type TicketTreeProps = {
  nodes: TicketNode[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onDrop: (dragId: string, targetId: string) => void;
  onToggleCollapse: (groupId: string) => void;
};

export function TicketTree({ nodes, onSelect, onDelete, onDrop, onToggleCollapse }: TicketTreeProps) {
  const selectedId = useTicketStore((s: { selectedId: string | null }) => s.selectedId);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "4px 0" }}>
      {nodes.length === 0 ? (
        <div
          style={{
            padding: "3rem 1rem",
            textAlign: "center",
            color: "var(--text-muted, #9ca3af)",
            border: "2px dashed var(--border, #e5e7eb)",
            borderRadius: "12px",
            fontSize: "0.85rem",
            background: "var(--surface, transparent)",
          }}
        >
          ← Agrega bloques desde la paleta
        </div>
      ) : (
        nodes.map((node: TicketNode) =>
          node.type === "group" ? (
            <TicketGroupNode
              key={node.id}
              group={node as TicketGroup}
              selectedId={selectedId}
              onSelect={onSelect}
              onDelete={onDelete}
              onDrop={onDrop}
              onToggleCollapse={onToggleCollapse}
            />
          ) : (
            <TicketBlockRow
              key={node.id}
              block={node as TicketBlock}
              isSelected={selectedId === node.id}
              onSelect={() => onSelect(node.id)}
              onDelete={() => onDelete(node.id)}
              onDrop={(dragId) => onDrop(dragId, node.id)}
            />
          ),
        )
      )}
    </div>
  );
}

function TicketGroupNode({
  group,
  selectedId,
  onSelect,
  onDelete,
  onDrop,
  onToggleCollapse,
}: {
  group: TicketGroup;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onDrop: (dragId: string, targetId: string) => void;
  onToggleCollapse: (groupId: string) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const collapsed = group.collapsed ?? false;

  return (
    <div>
      <div
        draggable
        onDragStart={(e: DragEvent) => {
          e.dataTransfer.setData("text/plain", group.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragOver={(e: DragEvent) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e: DragEvent) => {
          e.preventDefault();
          setIsDragOver(false);
          const dragId = e.dataTransfer.getData("text/plain");
          if (dragId) onDrop(dragId, group.id);
        }}
        onClick={() => onSelect(group.id)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 12px",
          borderRadius: 8,
          cursor: "pointer",
          fontSize: "0.85rem",
          fontWeight: 600,
          background: selectedId === group.id ? "var(--accent, #0f766e)" : isDragOver ? "var(--surface, rgba(15,118,110,0.15))" : "transparent",
          color: selectedId === group.id ? "#fff" : "var(--text, #111827)",
          borderLeft: selectedId === group.id ? "4px solid transparent" : "4px solid #8b5cf6",
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: selectedId === group.id ? "0 4px 12px rgba(15,118,110,0.3)" : "none",
        }}
      >
        <span
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse(group.id);
          }}
          style={{ cursor: "pointer", fontSize: 10, width: 14 }}
        >
          {collapsed ? "▶" : "▼"}
        </span>
        <span style={{ flex: 1 }}>
          📁 {group.name} ({group.blocks.length})
          {group.repeatable && (
            <span style={{ fontSize: 10, color: "#f59e0b", marginLeft: 6 }}>↻</span>
          )}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(group.id);
          }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-muted, #9ca3af)",
            fontSize: 14,
            padding: "0 2px",
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
      {!collapsed && group.blocks.length > 0 && (
        <div style={{ paddingLeft: 16 }}>
          {group.blocks.map((block: TicketBlock) => (
            <TicketBlockRow
              key={block.id}
              block={block}
              isSelected={selectedId === block.id}
              onSelect={() => onSelect(block.id)}
              onDelete={() => onDelete(block.id)}
              onDrop={(dragId) => onDrop(dragId, block.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TicketBlockRow({
  block,
  isSelected,
  onSelect,
  onDelete,
  onDrop,
}: {
  block: TicketBlock;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDrop: (dragId: string) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  const icon: Record<string, string> = {
    text: "T", separator: "—", total: "$", qr: "▣",
    feed: "↵", cut: "✂", beep: "♪", "open-drawer": "⏏",
    if: "?", ifelse: "?÷", each: "≡",
  };

  const color: Record<string, string> = {
    each: "#f59e0b", if: "#3b82f6", ifelse: "#3b82f6",
    cut: "#9ca3af", beep: "#f59e0b", "open-drawer": "#8b5cf6",
  };

  return (
    <div
      draggable
      onDragStart={(e: DragEvent) => {
        e.dataTransfer.setData("text/plain", block.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={(e: DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e: DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const dragId = e.dataTransfer.getData("text/plain");
        if (dragId) onDrop(dragId);
      }}
      onClick={onSelect}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        borderRadius: 6,
        cursor: "pointer",
        fontSize: "0.8rem",
        fontWeight: 500,
        background: isSelected ? "var(--accent, #0f766e)" : isDragOver ? "var(--surface, rgba(15,118,110,0.1))" : "transparent",
        color: isSelected ? "#fff" : color[block.type] ?? "var(--text, #374151)",
        borderBottom: isDragOver ? "2px solid var(--accent, #0f766e)" : "2px solid transparent",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        boxShadow: isSelected ? "0 2px 8px rgba(15,118,110,0.2)" : "none",
        margin: "1px 0",
      }}
    >
      <span style={{ width: 16, textAlign: "center", fontSize: 11, opacity: 0.7 }}>
        {icon[block.type] ?? "?"}
      </span>
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {block.type === "text"
          ? (block as any).text?.slice(0, 30) || "Texto"
          : block.type === "each"
            ? `≡ ${(block as any).listVar ?? "ITEMS"}`
            : block.type}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: isSelected ? "rgba(255,255,255,0.6)" : "var(--text-muted, #9ca3af)",
          fontSize: 14,
          padding: "0 2px",
          lineHeight: 1,
          opacity: 0,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}
      >
        ×
      </button>
    </div>
  );
}
