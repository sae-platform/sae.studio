type UpsertEditorElementPayload = {
  key: string;
  name: string;
  category: string;
  objectType: string;
  defaultWidthPt: number;
  defaultHeightPt: number;
  defaultContent: string;
};

type ElementEditorModalProps = {
  editingElementId: string;
  elementForm: UpsertEditorElementPayload;
  setElementForm: (updater: (prev: UpsertEditorElementPayload) => UpsertEditorElementPayload) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
  onSave: () => void;
  types: readonly string[];
};

export function ElementEditorModal({
  editingElementId, elementForm, setElementForm, onClose, onDelete, onSave, types,
}: ElementEditorModalProps) {
  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div className="modalCard" style={{ width: "400px", maxWidth: "90vw" }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>{editingElementId ? "Editar Herramienta" : "Nueva Herramienta"}</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
          <label style={{ display: "block", margin: 0 }}>Nombre
            <input style={{ display: "block", width: "100%", marginTop: "0.4rem" }} value={elementForm.name} placeholder="p.ej. Código de barras principal" onChange={(e) => setElementForm((p) => ({ ...p, name: e.target.value }))} />
          </label>
          <label style={{ display: "block", margin: 0 }}>Identificador (Key)
            <input style={{ display: "block", width: "100%", marginTop: "0.4rem" }} value={elementForm.key} placeholder="p.ej. barcode_main" onChange={(e) => setElementForm((p) => ({ ...p, key: e.target.value }))} />
          </label>
          <label style={{ display: "block", margin: 0 }}>Tipo Base
            <select style={{ display: "block", width: "100%", marginTop: "0.4rem" }} value={elementForm.objectType} onChange={(e) => setElementForm((p) => ({ ...p, objectType: e.target.value as any }))}>
              {types.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <label style={{ display: "block", margin: 0 }}>Ancho (pt)
              <input style={{ display: "block", width: "100%", marginTop: "0.4rem" }} type="number" value={elementForm.defaultWidthPt} onChange={(e) => setElementForm((p) => ({ ...p, defaultWidthPt: Number(e.target.value) || 1 }))} />
            </label>
            <label style={{ display: "block", margin: 0 }}>Alto (pt)
              <input style={{ display: "block", width: "100%", marginTop: "0.4rem" }} type="number" value={elementForm.defaultHeightPt} onChange={(e) => setElementForm((p) => ({ ...p, defaultHeightPt: Number(e.target.value) || 1 }))} />
            </label>
          </div>
          {(elementForm.objectType === "text" || elementForm.objectType === "barcode") && (
            <label style={{ display: "block", margin: 0 }}>Contenido o Variable
              <input style={{ display: "block", width: "100%", marginTop: "0.4rem" }} value={elementForm.defaultContent || ""} placeholder="Texto o e.g ${PRECIO}" onChange={(e) => setElementForm((p) => ({ ...p, defaultContent: e.target.value }))} />
            </label>
          )}
        </div>
        <div className="modalActions" style={{ marginTop: "2rem", display: "flex", gap: "0.5rem", justifyContent: "flex-end", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
          <button type="button" className="secondary" onClick={onClose}>Cancelar</button>
          {editingElementId && <button type="button" className="danger" onClick={() => onDelete(editingElementId)}>Eliminar</button>}
          <button type="button" className="primary" onClick={onSave}>Guardar</button>
        </div>
      </div>
    </div>
  );
}
