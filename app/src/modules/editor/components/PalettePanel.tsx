type PalettePanelProps = {
  sidebarEditMode: boolean;
  setSidebarEditMode: (v: boolean) => void;
  setShowElementModal: (v: boolean) => void;
  elements: any[];
  TYPES: readonly string[];
  baseElementIds: string[];
  draggedElementRef: React.MutableRefObject<any>;
  resetDragState: () => void;
  setEditingElementId: (id: string) => void;
  setElementForm: (form: any) => void;
  editElement: (el: any) => void;
  ICON: Record<string, React.ReactNode>;
  PREDEFINED_SHAPES: { name: string; path: string }[];
};

export function PalettePanel({
  sidebarEditMode, setSidebarEditMode, setShowElementModal,
  elements, TYPES, baseElementIds,
  draggedElementRef, resetDragState,
  setEditingElementId, setElementForm, editElement,
  ICON, PREDEFINED_SHAPES,
}: PalettePanelProps) {
  const items = elements.length > 0 ? elements : TYPES.map((t) => ({
    id: t, key: t, name: t.charAt(0).toUpperCase() + t.slice(1),
    category: "basic", objectType: t, defaultWidthPt: 40, defaultHeightPt: 20,
    defaultContent: t === "text" || t === "barcode" ? t : "",
  }));

  return (
    <aside className="leftSidebar">
      <div className="sidebarHeader">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
          <h3>Herramientas</h3>
          <label className="editModeSwitch">
            <input type="checkbox" checked={sidebarEditMode} onChange={(e) => { setSidebarEditMode(e.target.checked); setShowElementModal(false); }} />
            <span className="track"><span className="thumb" /></span>
            <small style={{ marginLeft: "0.4rem", color: "var(--muted)", fontWeight: 600 }}>Edit</small>
          </label>
        </div>
        {sidebarEditMode && (
          <button type="button" style={{ width: "100%", marginTop: "0.5rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
            onClick={() => { setEditingElementId(""); setElementForm({ key: "text", name: "Nuevo", category: "basic", objectType: "text", defaultWidthPt: 90, defaultHeightPt: 24, defaultContent: "${texto}" }); setShowElementModal(true); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Nueva
          </button>
        )}
      </div>
      <div className="sidebarScroll">
        <div className="paletteGrid">
          {items.map((el: any) => (
            <div key={el.id} className="paletteCard" style={{ position: "relative" }}>
              <button type="button" className={`iconBtn ${sidebarEditMode ? "editing" : ""}`}
                draggable={!sidebarEditMode || !baseElementIds.includes(el.id)}
                onDragStart={(e) => { draggedElementRef.current = el; e.dataTransfer.setData("application/saelabel-element", JSON.stringify(el)); }}
                onDragEnd={resetDragState}
                onClick={() => { if (sidebarEditMode && !baseElementIds.includes(el.id)) { editElement(el); setShowElementModal(true); } }}>
                <span className="ico">{ICON[el.objectType as keyof typeof ICON]}</span>
                <small>{el.name}</small>
              </button>
              {sidebarEditMode && baseElementIds.includes(el.id) && (
                <span className="lockIco" title="Predefinido" style={{ position: "absolute", top: "4px", right: "4px", color: "var(--muted)", opacity: 0.6, pointerEvents: "none" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="sidebarSection" style={{ marginTop: "1.5rem" }}>
          <h4>Formas</h4>
          <div className="paletteGrid">
            {PREDEFINED_SHAPES.map((s) => (
              <div key={s.name} className="paletteCard">
                <button type="button" className="iconBtn" draggable
                  onDragStart={(e) => { const el = { key: "path", name: s.name, category: "shapes", objectType: "path", defaultWidthPt: 40, defaultHeightPt: 40, defaultContent: s.path }; draggedElementRef.current = el; e.dataTransfer.setData("application/saelabel-element", JSON.stringify(el)); }}
                  onDragEnd={resetDragState}>
                  <span className="ico">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d={s.path} /></svg>
                  </span>
                  <small>{s.name}</small>
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="editHint" style={{ marginTop: "1rem", fontSize: "0.75rem", color: "var(--muted)", lineHeight: "1.4", background: "#f8fafc", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border)" }}>
          <strong>Tip:</strong> Arrastra los elementos al lienzo para agregarlos. Doble clic en un elemento para activar rotación y sesgado.
        </div>
      </div>
    </aside>
  );
}
