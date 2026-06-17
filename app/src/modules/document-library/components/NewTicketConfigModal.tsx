import { Portal } from "@/components/Portal";

type NewTicketConfigModalProps = {
  newTicketDraft: { name: string; width: number };
  setNewTicketDraft: (updater: (prev: { name: string; width: number }) => { name: string; width: number }) => void;
  onClose: () => void;
  onCreate: (draft: { name: string; width: number }) => void;
};

export function NewTicketConfigModal({ newTicketDraft, setNewTicketDraft, onClose, onCreate }: NewTicketConfigModalProps) {
  return (
    <Portal>
      <div className="modalBackdrop">
        <div className="modalCard" onClick={(e) => e.stopPropagation()} style={{ width: "450px", padding: "2rem" }}>
          <h2 style={{ margin: "0 0 1.5rem", fontSize: "1.5rem" }}>Configurar Tiquete</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <label className="menuField">
              Nombre del tiquete
              <input value={newTicketDraft.name} onChange={(e) => setNewTicketDraft((p) => ({ ...p, name: e.target.value }))} placeholder="Mi Tiquete" />
            </label>
            <div>
              <label className="menuField" style={{ marginBottom: "1rem" }}>Ancho de papel</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                {[
                  { value: 80, label: "80mm — Estándar", desc: "42 columnas, ideal para cocina" },
                  { value: 58, label: "58mm — Portátil", desc: "32 columnas, mini impresoras" },
                ].map((opt) => (
                  <button key={opt.value} type="button"
                    onClick={() => setNewTicketDraft((p) => ({ ...p, width: opt.value }))}
                    style={{
                      padding: "1rem", borderRadius: "12px", cursor: "pointer", textAlign: "left",
                      border: `2px solid ${newTicketDraft.width === opt.value ? "var(--accent)" : "var(--border)"}`,
                      background: newTicketDraft.width === opt.value ? "var(--bg-subtle)" : "var(--bg-card)",
                      transition: "all 0.2s",
                    }}>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem", color: newTicketDraft.width === opt.value ? "var(--accent)" : "var(--text)" }}>{opt.label}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "0.3rem" }}>{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ marginTop: "2rem", display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
            <button type="button" className="secondary" onClick={onClose}>Cancelar</button>
            <button type="button" className="primary" onClick={() => onCreate(newTicketDraft)}>Comenzar Diseño</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
