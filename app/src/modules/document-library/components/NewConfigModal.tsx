import { Portal } from "@/components/Portal";

type LabelPreset = { id: string; name: string; width: number; height: number; unit: string; brand: string; description: string };
type NewDocumentDraft = { kind: string; name: string; width: number; height: number; unit: string; brand: string; description: string; part: string; size: string };

type NewConfigModalProps = {
  newDocumentDraft: NewDocumentDraft;
  setNewDocumentDraft: (updater: (prev: NewDocumentDraft) => NewDocumentDraft) => void;
  selectedPresetId: string;
  setSelectedPresetId: (id: string) => void;
  LABEL_PRESETS: LabelPreset[];
  onClose: () => void;
  onCreate: (draft: NewDocumentDraft) => void;
  applyPreset: (id: string) => void;
};

export function NewConfigModal({
  newDocumentDraft, setNewDocumentDraft,
  selectedPresetId, LABEL_PRESETS, onClose, onCreate, applyPreset,
}: NewConfigModalProps) {
  return (
    <Portal>
      <div className="modalBackdrop">
        <div className="modalCard" onClick={(e) => e.stopPropagation()}>
          <h3>Configurar etiqueta ({newDocumentDraft.kind})</h3>
          <div className="newDocGrid">
            <label className="menuField">Plantilla
              <select value={selectedPresetId} onChange={(e) => applyPreset(e.target.value)}>
                {LABEL_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label className="menuField">Nombre
              <input value={newDocumentDraft.name} onChange={(e) => setNewDocumentDraft((p) => ({ ...p, name: e.target.value }))} />
            </label>
            <label className="menuField">Ancho
              <input type="number" min={0.1} step={0.1} value={newDocumentDraft.width} onChange={(e) => setNewDocumentDraft((p) => ({ ...p, width: Math.max(0.1, Number(e.target.value) || 0.1) }))} />
            </label>
            <label className="menuField">Alto
              <input type="number" min={0.1} step={0.1} value={newDocumentDraft.height} onChange={(e) => setNewDocumentDraft((p) => ({ ...p, height: Math.max(0.1, Number(e.target.value) || 0.1) }))} />
            </label>
            <label className="menuField">Unidad
              <select value={newDocumentDraft.unit} onChange={(e) => setNewDocumentDraft((p) => ({ ...p, unit: e.target.value as any }))}>
                <option value="mm">mm</option><option value="cm">cm</option><option value="in">in</option><option value="pt">pt</option>
              </select>
            </label>
            <label className="menuField">Brand
              <input value={newDocumentDraft.brand} onChange={(e) => setNewDocumentDraft((p) => ({ ...p, brand: e.target.value }))} />
            </label>
            <label className="menuField">Description
              <input value={newDocumentDraft.description} onChange={(e) => setNewDocumentDraft((p) => ({ ...p, description: e.target.value }))} />
            </label>
            <label className="menuField">Part
              <input value={newDocumentDraft.part} onChange={(e) => setNewDocumentDraft((p) => ({ ...p, part: e.target.value }))} />
            </label>
          </div>
          <div style={{ marginTop: "2rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <button type="button" className="secondary" onClick={onClose}>Cancelar</button>
            <button type="button" className="primary" onClick={() => onCreate(newDocumentDraft)}>Comenzar Diseño</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
