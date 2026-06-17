import { useState } from "react";
import { Portal } from "@/components/Portal";

type OpenDocumentModalProps = {
  openDocSearch: string;
  setOpenDocSearch: (v: string) => void;
  documents: { id: string; name: string; kind: string; updatedAtUtc: string }[];
  onClose: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
};

export function OpenDocumentModal({
  openDocSearch, setOpenDocSearch,
  documents, onClose, onSelect, onDelete,
}: OpenDocumentModalProps) {
  const filtered = documents.filter((d) =>
    d.name.toLowerCase().includes(openDocSearch.toLowerCase()),
  );

  return (
    <Portal>
      <div className="modalBackdrop">
        <div className="modalCard" onClick={(e) => e.stopPropagation()} style={{ width: "600px", maxWidth: "95vw" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ margin: 0 }}>Abrir documento de base de datos</h3>
            <button className="winBtn" onClick={onClose}>✕</button>
          </div>
          <div style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem" }}>
            <input type="text" placeholder="Buscar documento..." value={openDocSearch}
              onChange={(e) => setOpenDocSearch(e.target.value)} autoFocus
              style={{ flex: 1, padding: "0.5rem", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--surface-alt)", color: "var(--text)" }} />
          </div>
          <div style={{ maxHeight: "400px", overflowY: "auto", border: "1px solid var(--border)", borderRadius: "8px" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted)" }}>
                {documents.length === 0 ? "No hay documentos guardados." : "No se encontraron documentos."}
              </div>
            ) : (
              filtered.map((d) => (
                <div key={d.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1rem", borderBottom: "1px solid var(--border)", cursor: "pointer", transition: "background 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-subtle)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  onClick={() => onSelect(d.id)}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{d.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{d.kind === "saetickets" ? "Tiquete" : d.kind === "glabels" ? "gLabels" : "Etiqueta SAE"} — {new Date(d.updatedAtUtc).toLocaleDateString()}</div>
                  </div>
                  <button type="button" className="danger mini" style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}
                    onClick={(e) => { e.stopPropagation(); if (confirm("¿Eliminar este documento?")) onDelete(d.id); }}>
                    Eliminar
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}
