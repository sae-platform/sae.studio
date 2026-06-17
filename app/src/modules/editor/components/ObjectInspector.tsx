import type { RendererProps } from "../object-registry/types";
import { getPlugin } from "../object-registry/registry";

type InspectorPanelProps = {
  obj: Record<string, any>;
  onChange: (obj: Record<string, any>) => void;
};

export function ObjectInspector({ obj, onChange }: InspectorPanelProps) {
  const plugin = getPlugin(obj.type as string);

  // Geometry fields - shared by all types
  const geoFields = (
    <div className="inspectorSection">
      <header className="sectionHeader">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
        <span>Geometría</span>
      </header>
      <div className="inspectorFields grid2">
        <label>X<input type="number" value={obj.x} onChange={e => onChange({ ...obj, x: Number(e.target.value) })} /></label>
        <label>Y<input type="number" value={obj.y} onChange={e => onChange({ ...obj, y: Number(e.target.value) })} /></label>
        <label>Ancho<input type="number" value={obj.w} onChange={e => onChange({ ...obj, w: Number(e.target.value) })} /></label>
        <label>Alto<input type="number" value={obj.h} onChange={e => onChange({ ...obj, h: Number(e.target.value) })} /></label>
      </div>
      <div className="inspectorFields grid3">
        <label>Rotación (°)<input type="number" step="0.5" value={Number(obj.rotateDeg || 0).toFixed(1)} onChange={e => onChange({ ...obj, rotateDeg: Number(e.target.value) })} /></label>
        <label>Skew X (°)<input type="number" step="0.5" value={Number(obj.skewX || 0).toFixed(1)} onChange={e => onChange({ ...obj, skewX: Number(e.target.value) })} /></label>
        <label>Skew Y (°)<input type="number" step="0.5" value={Number(obj.skewY || 0).toFixed(1)} onChange={e => onChange({ ...obj, skewY: Number(e.target.value) })} /></label>
      </div>
      <div className="inspectorFields grid2">
        <label>Escala X<input type="number" step="0.1" value={obj.scaleX} onChange={e => onChange({ ...obj, scaleX: Number(e.target.value) })} /></label>
        <label>Escala Y<input type="number" step="0.1" value={obj.scaleY} onChange={e => onChange({ ...obj, scaleY: Number(e.target.value) })} /></label>
      </div>
    </div>
  );

  // Plugin-specific fields
  const specificFields = plugin?.Inspector
    ? (plugin.Inspector as any)({ obj, onChange })
    : null;

  // Content field for types that need it
  const needsContent = obj.type !== "box" && obj.type !== "ellipse" && obj.type !== "line";
  const contentField = needsContent ? (
    <div className="inspectorSection">
      <header className="sectionHeader">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        <span>{obj.type === "text" ? "Texto" : obj.type === "image" ? "Imagen" : "Contenido"}</span>
      </header>
      <div className="inspectorFields">
        {obj.type === "image" ? (
          <div className="full imgUploadRow">
            <button type="button" className="mini" onClick={() => { const input = document.createElement("input"); input.type = "file"; input.accept = "image/*"; input.onchange = (e) => { const file = (e.target as HTMLInputElement).files?.[0]; if (file) { const reader = new FileReader(); reader.onload = (loadEv) => { onChange({ ...obj, content: loadEv.target?.result as string }); }; reader.readAsDataURL(file); } }; input.click(); }}>Cargar Imagen</button>
          </div>
        ) : obj.type === "text" ? (
          <>
            <label style={{ margin: 0 }}>Fuente
              <select value={obj.fontFamily || "sans-serif"} onChange={e => onChange({ ...obj, fontFamily: e.target.value })}>
                {["sans-serif","serif","monospace","Arial","Helvetica","Times New Roman","Courier New","Georgia","Verdana","Tahoma"].map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </label>
            <label style={{ margin: 0 }}>Tamaño
              <input type="number" min={4} max={200} step={1} value={obj.fontSize ?? 10} onChange={e => onChange({ ...obj, fontSize: Number(e.target.value) })} />
            </label>
            <label className="full" style={{ margin: 0 }}>Contenido
              <textarea rows={2} value={obj.content} onChange={e => onChange({ ...obj, content: e.target.value })} />
            </label>
          </>
        ) : (
          <label className="full" style={{ margin: 0 }}>Contenido
            <input type="text" value={obj.content || ""} onChange={e => onChange({ ...obj, content: e.target.value })} />
          </label>
        )}
      </div>
    </div>
  ) : null;

  return (
    <div className="inspectorPanel">
      <div className="inspectorScroll">
        {geoFields}
        {specificFields}
        {contentField}
      </div>
    </div>
  );
}
