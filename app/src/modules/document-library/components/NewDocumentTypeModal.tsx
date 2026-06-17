import { Portal } from "@/components/Portal";

type NewDocumentTypeModalProps = {
  onClose: () => void;
  onSelectLabel: () => void;
  onSelectTicket: () => void;
  onSelectDocument?: () => void;
};

export function NewDocumentTypeModal({ onClose, onSelectLabel, onSelectTicket, onSelectDocument }: NewDocumentTypeModalProps) {
  return (
    <Portal>
      <div className="modalBackdrop">
        <div className="modalCard" onClick={(e) => e.stopPropagation()} style={{ width: "1000px", maxWidth: "95vw", padding: "2.5rem" }}>
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <h2 style={{ margin: "0 0 0.5rem", fontSize: "2rem", fontWeight: 800 }}>Nuevo Documento</h2>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: "1rem" }}>Selecciona el tipo de proyecto para comenzar</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "2rem" }}>
            <button type="button" style={{ flex: 1, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "2rem 1.5rem", textAlign: "center", cursor: "pointer", transition: "all 0.3s", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}
              onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-5px)"; e.currentTarget.style.borderColor = "var(--accent)"; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = "var(--border)"; }}
              onClick={onSelectLabel}>
              <div style={{ fontSize: "3rem" }}>🏷️</div>
              <div style={{ fontWeight: 800, fontSize: "1.25rem", color: "var(--text)" }}>Etiqueta</div>
              <div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Diseño libre con soporte para campos dinámicos</div>
            </button>
            <button type="button" style={{ flex: 1, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "2rem 1.5rem", textAlign: "center", cursor: "pointer", transition: "all 0.3s", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}
              onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-5px)"; e.currentTarget.style.borderColor = "var(--accent)"; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = "var(--border)"; }}
              onClick={onSelectTicket}>
              <div style={{ fontSize: "3rem" }}>🎫</div>
              <div style={{ fontWeight: 800, fontSize: "1.25rem", color: "var(--text)" }}>Tiquete</div>
              <div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Formato ESC/POS para impresión térmica</div>
            </button>
            <button type="button" style={{ flex: 1, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "2rem 1.5rem", textAlign: "center", cursor: "pointer", transition: "all 0.3s", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}
              onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-5px)"; e.currentTarget.style.borderColor = "var(--accent)"; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = "var(--border)"; }}
              onClick={onSelectDocument}>
              <div style={{ fontSize: "3rem" }}>📄</div>
              <div style={{ fontWeight: 800, fontSize: "1.25rem", color: "var(--text)" }}>Documento PDF</div>
              <div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Facturas, cotizaciones, órdenes y reportes A4</div>
            </button>
          </div>
          <div style={{ marginTop: "2rem", display: "flex", justifyContent: "center" }}>
            <button type="button" className="secondary" style={{ padding: "0.75rem 2.5rem", borderRadius: "12px" }} onClick={onClose}>Cancelar</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
