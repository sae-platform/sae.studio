import { Eye, EyeOff, Lock, Unlock, Plus, Trash2 } from "lucide-react";
import type { LayerDef } from "@/modules/document-engine/models/layer";
import { createLayer } from "@/modules/document-engine/models/layer";

interface LayersPanelProps {
  layers: LayerDef[];
  activeLayerId: string;
  onChange: (layers: LayerDef[]) => void;
  onActiveChange: (id: string) => void;
}

export function LayersPanel({ layers, activeLayerId, onChange, onActiveChange }: LayersPanelProps) {
  const sorted = [...layers].sort((a, b) => b.zIndex - a.zIndex);

  const toggle = (id: string, key: "visible" | "locked") => {
    onChange(layers.map((l) => l.id === id ? { ...l, [key]: !l[key] } : l));
  };

  const rename = (id: string, name: string) => {
    onChange(layers.map((l) => l.id === id ? { ...l, name } : l));
  };

  const addLayer = () => {
    const maxZ = Math.max(0, ...layers.map((l) => l.zIndex));
    onChange([...layers, createLayer(`Capa ${layers.length + 1}`, maxZ + 1)]);
  };

  const deleteLayer = (id: string) => {
    if (layers.length <= 1) return;
    onChange(layers.filter((l) => l.id !== id));
    if (activeLayerId === id) {
      const remaining = layers.filter((l) => l.id !== id);
      if (remaining.length) onActiveChange(remaining[0].id);
    }
  };

  return (
    <div className="docLayersPanel">
      <div className="docPanelEyebrow" style={{ padding: "0.75rem 0.75rem 0.4rem" }}>
        Capas
      </div>
      <div className="docLayersList">
        {sorted.map((layer) => (
          <div
            key={layer.id}
            className={`docLayerItem${layer.id === activeLayerId ? " active" : ""}${!layer.visible ? " invisible" : ""}`}
            onClick={() => onActiveChange(layer.id)}
          >
            <button
              type="button"
              className="docLayerBtn"
              title={layer.visible ? "Ocultar" : "Mostrar"}
              onClick={(e) => { e.stopPropagation(); toggle(layer.id, "visible"); }}
            >
              {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
            </button>
            <button
              type="button"
              className="docLayerBtn"
              title={layer.locked ? "Desbloquear" : "Bloquear"}
              onClick={(e) => { e.stopPropagation(); toggle(layer.id, "locked"); }}
            >
              {layer.locked ? <Lock size={12} /> : <Unlock size={12} />}
            </button>
            <input
              className="docLayerName"
              value={layer.name}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => rename(layer.id, e.target.value)}
            />
            <button
              type="button"
              className="docLayerBtn docLayerBtn--del"
              disabled={layers.length <= 1}
              onClick={(e) => { e.stopPropagation(); deleteLayer(layer.id); }}
            >
              <Trash2 size={11} />
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="docPageNavAdd" onClick={addLayer}>
        <Plus size={13} /> Agregar capa
      </button>
    </div>
  );
}
