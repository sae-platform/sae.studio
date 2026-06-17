import { useState } from "react";

interface PrinterSearchModalProps {
  onClose: () => void;
  onSelect: (p: string) => void;
  availablePrinters: string[];
}

export function PrinterSearchModal({ onClose, onSelect, availablePrinters }: PrinterSearchModalProps) {
  const [search, setSearch] = useState("");
  const filtered = availablePrinters.filter((p) =>
    p.toLowerCase().includes(search.toLowerCase()),
  );

  const INP: React.CSSProperties = {
    display: "block",
    width: "100%",
    padding: "0.6rem 0.75rem",
    boxSizing: "border-box",
    borderRadius: "8px",
    border: "1px solid var(--border)",
    background: "var(--surface-alt, #f8fafc)",
    color: "var(--text)",
    fontSize: "0.88rem",
    transition: "border-color 0.2s, box-shadow 0.2s",
    outline: "none",
  };

  return (
    <div
      className="modalBackdrop"
      style={{ zIndex: 4000, background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="modalCard"
        style={{ width: "400px", padding: "1.25rem" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h4 style={{ margin: "0 0 1rem 0" }}>Buscar Impresora</h4>
        <input
          autoFocus
          style={INP}
          placeholder="Escribe para buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div
          style={{
            maxHeight: "300px",
            overflowY: "auto",
            marginTop: "0.75rem",
            border: "1px solid var(--border)",
            borderRadius: "8px",
          }}
        >
          {filtered.length === 0 ? (
            <div
              style={{
                padding: "1rem",
                textAlign: "center",
                color: "var(--muted)",
                fontSize: "0.85rem",
              }}
            >
              No se encontraron impresoras.
            </div>
          ) : (
            filtered.map((p) => (
              <button
                key={p}
                className="printerSearchItem"
                style={{
                  display: "block",
                  width: "100%",
                  padding: "0.75rem 1rem",
                  background: "none",
                  border: "none",
                  textAlign: "left",
                  cursor: "pointer",
                  borderBottom: "1px solid var(--border)",
                  fontSize: "0.85rem",
                  transition: "background 0.2s",
                  color: "var(--text)",
                }}
                onClick={() => {
                  onSelect(p);
                  onClose();
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--bg-subtle, #f1f5f9)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "none")
                }
              >
                {p}
              </button>
            ))
          )}
        </div>
        <div
          style={{
            marginTop: "1rem",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button type="button" className="secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
