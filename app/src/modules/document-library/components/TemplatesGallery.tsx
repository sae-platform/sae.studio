import { useState } from "react";
import { Portal } from "@/components/Portal";

type EditorTemplate = { id: string; name: string; kind: string; category: string; icon: string; description: string; xml: string };
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
  onSelectDocumentTemplate?: (t: EditorTemplate) => void;
  onSelectPreset: (p: LabelPreset) => void;
};

const CATEGORY_META: Record<string, { label: string; icon: string; color: string }> = {
  restaurant: { label: "Restaurante", icon: "🍽️",  color: "#16a34a" },
  retail:    { label: "Retail",     icon: "🛒",   color: "#ea580c" },
  warehouse: { label: "Bodega",     icon: "📦",   color: "#2563eb" },
  hotel:     { label: "Hotel",      icon: "🏨",   color: "#9333ea" },
};

type FilterTab = "all" | "tickets" | "documents" | "labels";

interface CategoryTab { key: string; label: string; icon: string; color: string; count: number; }

export function TemplatesGallery({
  templates, LABEL_PRESETS, newDocumentDraft,
  onClose, onRefresh, onSelectTicketTemplate, onSelectLabelTemplate, onSelectDocumentTemplate, onSelectPreset,
}: TemplatesGalleryProps) {

  const [activeCat, setActiveCat] = useState<string>("all");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");

  const ticketTemplates = templates.filter(t => t.kind === "saetickets");
  const labelTemplates  = templates.filter(t => t.kind === "sae" || t.kind === "glabels");
  const documentTemplates = templates.filter(t => t.kind === "saedocument");

  const allByCat = new Map<string, EditorTemplate[]>();
  for (const t of templates) {
    const cat = t.category || "restaurant";
    const list = allByCat.get(cat) ?? [];
    list.push(t);
    allByCat.set(cat, list);
  }

  const categoryTabs: CategoryTab[] = [
    { key: "all", label: "Todo", icon: "📋", color: "#0f766e", count: templates.length },
    ...Array.from(allByCat.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, items]) => ({ key, label: CATEGORY_META[key]?.label ?? key, icon: CATEGORY_META[key]?.icon ?? "📁", color: CATEGORY_META[key]?.color ?? "#6b7280", count: items.length })),
  ];

  const currentCatItems = activeCat === "all" ? templates : (allByCat.get(activeCat) ?? []);

  const shownItems = filterTab === "all" ? currentCatItems
    : filterTab === "tickets" ? currentCatItems.filter(t => t.kind === "saetickets")
    : filterTab === "documents" ? currentCatItems.filter(t => t.kind === "saedocument")
    : currentCatItems.filter(t => t.kind === "sae" || t.kind === "glabels");

  const shownDocuments = shownItems.filter(t => t.kind === "saedocument");
  const shownTickets = shownItems.filter(t => t.kind === "saetickets");
  const shownLabels = shownItems.filter(t => t.kind === "sae" || t.kind === "glabels");

  const hasMultipleCats = categoryTabs.length > 2;

  return (
    <Portal>
      <div className="modalBackdrop">
        <div className="modalCard" onClick={e => e.stopPropagation()} style={{ width: "min(900px, 96vw)", maxWidth: "min(900px, 96vw)", height: "min(620px, 85dvh)", maxHeight: "85dvh", display: "flex", flexDirection: "column", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "1.5rem 2rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-tabs)", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "#0f766e15", color: "#0f766e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>📋</div>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800 }}>Galería de Plantillas</h2>
                <p style={{ margin: "0.1rem 0 0", fontSize: "0.72rem", color: "var(--muted)" }}>{templates.length} plantillas disponibles</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              <button onClick={onRefresh} className="tplBtn">🔄</button>
              <button className="tplBtn" onClick={onClose}>✕</button>
            </div>
          </div>

          {hasMultipleCats && (
            <div className="tplCatBar">
              {categoryTabs.map(ct => (
                <button key={ct.key} type="button"
                  className={`tplCatTab ${activeCat === ct.key ? "tplCatTab--active" : ""}`}
                  style={activeCat === ct.key ? { borderColor: ct.color, color: ct.color, background: ct.color + "10" } : {}}
                  onClick={() => setActiveCat(ct.key)}>
                  <span>{ct.icon}</span> <span>{ct.label}</span> <span className="tplCatTabCount">{ct.count}</span>
                </button>
              ))}
            </div>
          )}

          <div className="tplFilterBar">
            {([
              { key: "all", label: "Todo" },
              { key: "tickets", label: "Tiquetes" },
              { key: "documents", label: "Documentos" },
              { key: "labels", label: "Etiquetas" },
            ] as const).map(f => (
              <button key={f.key} type="button"
                className={`tplFilterTab ${filterTab === f.key ? "tplFilterTab--active" : ""}`}
                onClick={() => setFilterTab(f.key)}>
                {f.label}
              </button>
            ))}
          </div>

          <div style={{ padding: "1.25rem 2rem", overflowY: "auto", flex: 1, overscrollBehavior: "contain" }}>
            {shownItems.length === 0 && (
              <div style={{ textAlign: "center", padding: "3rem 0", color: "#94a3b8", fontSize: "0.85rem" }}>
                No hay plantillas en esta categoría
              </div>
            )}

            {shownTickets.length > 0 && (
              <div style={{ marginBottom: shownDocuments.length > 0 || shownLabels.length > 0 ? "1.5rem" : 0 }}>
                {!(activeCat !== "all" && shownTickets.length === shownItems.length) && (
                  <div style={{ fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#16a34a", marginBottom: "0.5rem" }}>🧾 Tiquetes</div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  {shownTickets.map(t => <TemplateCard key={t.id} template={t} onClick={() => onSelectTicketTemplate(t)} />)}
                </div>
              </div>
            )}

            {shownDocuments.length > 0 && (
              <div style={{ marginBottom: shownLabels.length > 0 ? "1.5rem" : 0 }}>
                {!(activeCat !== "all" && shownDocuments.length === shownItems.length) && (
                  <div style={{ fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#ea580c", marginBottom: "0.5rem" }}>📄 Documentos</div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
                  {shownDocuments.map(t => <TemplateCard key={t.id} template={t} onClick={() => onSelectDocumentTemplate?.(t)} />)}
                </div>
              </div>
            )}

            {shownLabels.length > 0 && (
              <div>
                {!(activeCat !== "all" && shownLabels.length === shownItems.length) && (
                  <div style={{ fontSize: "0.65rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#3b82f6", marginBottom: "0.5rem" }}>🏷️ Etiquetas</div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
                  {shownLabels.map(t => <TemplateCard key={t.id} template={t} onClick={() => onSelectLabelTemplate(t)} />)}
                </div>
              </div>
            )}
          </div>

          <div style={{ padding: "0.85rem 2rem", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-tabs)", flexShrink: 0 }}>
            <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>SAE Studio</div>
            <button type="button" className="tplFooterBtn" onClick={onClose}>Cerrar</button>
          </div>
        </div>
      </div>

      <style>{`
        .tplBtn {
          width: 32px; height: 32px; border: 1px solid #cbd5e1; border-radius: 8px;
          background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center;
          font-size: 0.75rem; color: #64748b; transition: all 0.12s;
        }
        .tplBtn:hover { background: #f1f5f9; color: #1e293b; }
        .tplFooterBtn {
          padding: 0.4rem 1.2rem; border: 1px solid #cbd5e1; border-radius: 7px;
          background: #fff; cursor: pointer; font-size: 0.75rem; font-weight: 600; color: #475569; transition: all 0.12s;
        }
        .tplFooterBtn:hover { background: #f1f5f9; }

        .tplCatBar {
          padding: 0.4rem 1.5rem; display: flex; gap: 0.3rem;
          border-bottom: 1px solid #e5e7eb; background: #f8fafc;
          overflow-x: auto; flex-shrink: 0;
        }
        .tplFilterBar {
          padding: 0.3rem 1.5rem; display: flex; gap: 0;
          border-bottom: 1px solid #e5e7eb; background: #fff; flex-shrink: 0;
        }

        .tplCatTab {
          display: flex; align-items: center; gap: 0.25rem;
          padding: 0.4rem 0.75rem;
          border: 1.5px solid #e5e7eb; border-radius: 999px;
          background: #fff; cursor: pointer;
          font-size: 0.7rem; font-weight: 600; font-family: inherit;
          color: #64748b; transition: all 0.15s; white-space: nowrap;
        }
        .tplCatTab:hover { border-color: #cbd5e1; color: #334155; }
        .tplCatTab--active { border-width: 1.5px; }
        .tplCatTabCount {
          font-size: 0.6rem; font-weight: 700;
          background: #f1f5f9; color: #64748b;
          padding: 0px 5px; border-radius: 999px; min-width: 16px; text-align: center;
        }

        .tplFilterTab {
          padding: 0.5rem 1rem; border: none; border-bottom: 2.5px solid transparent;
          background: transparent; cursor: pointer; font-size: 0.73rem; font-weight: 600; font-family: inherit;
          color: #94a3b8; transition: all 0.15s; margin-bottom: -1px;
          display: flex; align-items: center; gap: 0.35rem; border-radius: 6px 6px 0 0;
        }
        .tplFilterTab:hover { color: #475569; background: #f8fafc; }
        .tplFilterTab--active { color: #0f172a; border-bottom-color: #0f172a; }

        .tplCard {
          display: flex; align-items: center; gap: 0.65rem; padding: 0.6rem 0.75rem;
          border: 1px solid #e2e8f0; border-radius: 8px; background: #fff;
          cursor: pointer; text-align: left; transition: all 0.1s; width: 100%;
        }
        .tplCard:hover { border-color: #94a3b8; background: #f8fafc; transform: translateX(2px); }
        .tplCardIcon { font-size: 1.2rem; flex-shrink: 0; }
        .tplCardName { font-weight: 700; font-size: 0.78rem; color: #1e293b; margin-bottom: 1px; }
        .tplCardDesc { font-size: 0.66rem; color: #94a3b8; line-height: 1.3; }
        .tplCatTag {
          font-size: 0.58rem; padding: 1px 6px; border-radius: 4px;
          font-weight: 600; margin-left: auto; flex-shrink: 0;
        }

        [data-theme="dark"] .tplBtn, [data-theme="dark"] .tplFooterBtn { background: #1e293b; border-color: #334155; color: #94a3b8; }
        [data-theme="dark"] .tplBtn:hover, [data-theme="dark"] .tplFooterBtn:hover { background: #1e2d42; color: #cbd5e1; }
        [data-theme="dark"] .tplCatBar { background: #0b1120; border-color: #1e293b; }
        [data-theme="dark"] .tplFilterBar { background: #0b1120; border-color: #1e293b; }
        [data-theme="dark"] .tplCatTab { background: #1e293b; border-color: #334155; color: #94a3b8; }
        [data-theme="dark"] .tplCatTab:hover { border-color: #475569; color: #cbd5e1; }
        [data-theme="dark"] .tplCatTabCount { background: #0f172a; color: #94a3b8; }
        [data-theme="dark"] .tplCard { background: #1e293b; border-color: #334155; }
        [data-theme="dark"] .tplCard:hover { background: #1e2d42; border-color: #475569; }
        [data-theme="dark"] .tplCardName { color: #e2e8f0; }
        [data-theme="dark"] .tplFilterTab { color: #64748b; }
        [data-theme="dark"] .tplFilterTab:hover { color: #cbd5e1; background: #1e293b; }
        [data-theme="dark"] .tplFilterTab--active { color: #f1f5f9; border-bottom-color: #f1f5f9; }
      `}</style>
    </Portal>
  );
}

function TemplateCard({ template, onClick }: { template: EditorTemplate; onClick: () => void }) {
  return (
    <button type="button" className="tplCard" onClick={onClick}>
      <span className="tplCardIcon">{template.icon || "📄"}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="tplCardName">{template.name}</div>
        {template.description && <div className="tplCardDesc">{template.description}</div>}
      </div>
      <span className="tplCatTag" style={{ background: (CATEGORY_META[template.category]?.color ?? "#6b7280") + "15", color: CATEGORY_META[template.category]?.color ?? "#6b7280" }}>
        {CATEGORY_META[template.category]?.label ?? template.category}
      </span>
    </button>
  );
}
