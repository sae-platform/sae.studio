import { Portal } from "@/components/Portal";

type EditorTemplate = { id: string; name: string; kind: string; icon: string; description: string; xml: string };
type LabelPreset = { id: string; name: string; width: number; height: number; unit: string; brand: string; description: string; part: string; size: string };
type NewDocumentDraft = { kind: string; name: string; width: number; height: number; unit: string; brand: string; description: string; part: string; size: string };

type TemplatesGalleryProps = {
  templates: EditorTemplate[];
  LABEL_PRESETS: LabelPreset[];
  newDocumentDraft: NewDocumentDraft;
  onClose: () => void;
  onRefresh: () => void;
  onSelectTicketTemplate: (t: EditorTemplate) => void;
  onSelectLabelTemplate: (t: EditorTemplate) => void;
  onSelectPreset: (p: LabelPreset) => void;
};

export function TemplatesGallery({
  templates, LABEL_PRESETS, newDocumentDraft,
  onClose, onRefresh, onSelectTicketTemplate, onSelectLabelTemplate, onSelectPreset,
}: TemplatesGalleryProps) {
  const ticketTemplates = templates.filter((t) => t.kind === "saetickets");
  const labelTemplates = templates.filter((t) => t.kind === "sae" || t.kind === "glabels");

  return (
    <Portal>
      <div className="modalBackdrop">
        <div className="modalCard" onClick={(e) => e.stopPropagation()} style={{ width: "650px", maxWidth: "95vw", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "2rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-tabs)" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800 }}>Galería de Plantillas</h2>
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.9rem", color: "var(--muted)" }}>Selecciona un punto de partida para tu nuevo diseño</p>
            </div>
            <button className="winBtn" onClick={onClose} style={{ background: "rgba(0,0,0,0.05)", borderRadius: "50%", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>

          <div style={{ padding: "2rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "2.5rem", flex: 1 }}>
            <section>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(22,163,74,0.1)", color: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="4" width="20" height="16" rx="2" /><line x1="6" y1="8" x2="6" /><line x1="6" y1="12" x2="6" /><line x1="6" y1="16" x2="6" /></svg>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <h3 style={{ margin: 0, fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text)" }}>Tiquetes POS</h3>
                  <button onClick={onRefresh} style={{ fontSize: "0.75rem", background: "none", border: "none", color: "var(--primary)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem" }}>🔄 Refrescar</button>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {ticketTemplates.length > 0 ? (
                  ticketTemplates.map((t) => (
                    <button key={t.id} type="button" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1.25rem", textAlign: "left", cursor: "pointer", transition: "all 0.2s", display: "flex", gap: "1.25rem", alignItems: "center" }}
                      onMouseOver={(e) => { e.currentTarget.style.borderColor = "#16a34a"; e.currentTarget.style.background = "rgba(22,163,74,0.02)"; e.currentTarget.style.transform = "translateX(4px)"; }}
                      onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg-card)"; e.currentTarget.style.transform = "none"; }}
                      onClick={() => onSelectTicketTemplate(t)}>
                      <div style={{ fontSize: "2rem" }}>{t.icon || "📄"}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text)", marginBottom: "0.2rem" }}>{t.name}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.4 }}>{t.description}</div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div style={{ padding: "2rem", textAlign: "center", opacity: 0.5 }}>Cargando tiquetes...</div>
                )}
              </div>
            </section>

            <section>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(59,130,246,0.1)", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>
                </div>
                <h3 style={{ margin: 0, fontSize: "0.85rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text)" }}>Etiquetas y Logística</h3>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                {labelTemplates.map((t) => (
                  <button key={t.id} type="button" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1.25rem", textAlign: "left", cursor: "pointer", transition: "all 0.15s", display: "flex", gap: "1rem", alignItems: "center" }}
                    onMouseOver={(e) => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.background = "rgba(59,130,246,0.02)"; e.currentTarget.style.transform = "translateX(4px)"; }}
                    onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg-card)"; e.currentTarget.style.transform = "none"; }}
                    onClick={() => onSelectLabelTemplate(t)}>
                    <div style={{ fontSize: "1.75rem" }}>{t.icon || "🏷️"}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text)" }}>{t.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{t.description}</div>
                    </div>
                  </button>
                ))}
                {labelTemplates.length > 0 && (
                  <div style={{ gridColumn: "1 / -1", margin: "1rem 0", display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{ height: "1px", flex: 1, background: "var(--border)", opacity: 0.5 }} />
                    <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Tamaños Estándar</span>
                    <div style={{ height: "1px", flex: 1, background: "var(--border)", opacity: 0.5 }} />
                  </div>
                )}
                {LABEL_PRESETS.map((p) => (
                  <button key={p.id} type="button" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1rem", textAlign: "left", cursor: "pointer", transition: "all 0.15s", display: "flex", flexDirection: "column", gap: "0.4rem" }}
                    onMouseOver={(e) => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.background = "rgba(59,130,246,0.02)"; }}
                    onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg-card)"; }}
                    onClick={() => onSelectPreset(p)}>
                    <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text)" }}>{p.name}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <span style={{ padding: "2px 6px", background: "rgba(0,0,0,0.05)", borderRadius: "4px" }}>{p.width}x{p.height}{p.unit}</span>
                      <span>•</span><span>{p.brand}</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </div>
          <div style={{ padding: "1.25rem 2rem", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", background: "var(--bg-tabs)" }}>
            <button type="button" className="secondary" onClick={onClose}>Cerrar Galería</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
