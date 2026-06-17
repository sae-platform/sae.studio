import { toUnit, fromUnit, unitStep } from "@/modules/label-designer/object";

type EditorToolbarProps = {
  zoomPercent: number;
  setZoomPercent: (zoom: number) => void;
  templateUnit: string;
  setTemplateUnit: (unit: string) => void;
  templateWidthPt: number;
  setTemplateWidthPt: (w: number) => void;
  templateHeightPt: number;
  setTemplateHeightPt: (h: number) => void;
  dynamicResize: boolean;
  setDynamicResize: (v: boolean) => void;
  objects: any[];
  setObjects: (updater: any) => void;
  pushHistory: (objects: any[]) => void;
  onPrint: () => void;
  onHelp: () => void;
  onPreview?: () => void;
};

export function EditorToolbar({
  zoomPercent, setZoomPercent,
  templateUnit, setTemplateUnit,
  templateWidthPt, setTemplateWidthPt,
  templateHeightPt, setTemplateHeightPt,
  dynamicResize, setDynamicResize,
  objects, setObjects, pushHistory,
  onPrint, onHelp, onPreview,
}: EditorToolbarProps) {
  return (
    <header className="studioTopbar">
      <div style={{ display: "flex", gap: "0.5rem", padding: "0 1rem" }}>
        <button type="button" className="primary" onClick={onPrint} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1.25rem", fontSize: "0.85rem" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
          Imprimir
        </button>
        {onPreview && (
          <button type="button" className="secondary" onClick={onPreview} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1.25rem", fontSize: "0.85rem" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
            Vista Previa
          </button>
        )}
      </div>
      <div className="toolbarGroup">
        <div className="toolbarDivider" />
        <div className="zoomControlContainer">
          <span className="controlIcon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /><line x1="11" y1="8" x2="11" y2="14" /></svg>
          </span>
          <label className="zoomLabel">Zoom
            <input type="range" min={25} max={500} step={5} value={zoomPercent} onChange={(e) => setZoomPercent(Number(e.target.value))} />
          </label>
          <span className="zoomBadge">{zoomPercent}%</span>
        </div>
        <div className="toolbarDivider" />
        <div className="sizeControlsContainer">
          <label className="zoomLabel sizeLabel">
            <span className="sizeAxis">W</span>
            <span className="unitInput">
              <input type="number" title={`Ancho (${templateUnit})`} value={Number(toUnit(templateWidthPt, templateUnit as any).toFixed(3))} step={unitStep(templateUnit as any)} onChange={(e) => {
                const newPt = Math.max(1, fromUnit(Number(e.target.value), templateUnit as any));
                if (dynamicResize && templateWidthPt > 0) {
                  const ratio = newPt / templateWidthPt;
                  const next = objects.map((o: any) => ({ ...o, x: o.x * ratio, y: o.y * ratio, w: o.w * ratio, h: o.h * ratio, fontSize: o.fontSize ? o.fontSize * ratio : o.fontSize, lineWidth: o.lineWidth ? o.lineWidth * ratio : o.lineWidth }));
                  setObjects(next);
                  pushHistory(next);
                }
                setTemplateWidthPt(newPt);
              }} />
              <small>{templateUnit}</small>
            </span>
          </label>
          <label className="zoomLabel sizeLabel">
            <span className="sizeAxis">H</span>
            <span className="unitInput">
              <input type="number" title={`Alto (${templateUnit})`} value={Number(toUnit(templateHeightPt, templateUnit as any).toFixed(3))} step={unitStep(templateUnit as any)} onChange={(e) => {
                const newPt = Math.max(1, fromUnit(Number(e.target.value), templateUnit as any));
                if (dynamicResize && templateHeightPt > 0) {
                  const ratio = newPt / templateHeightPt;
                  const next = objects.map((o: any) => ({ ...o, x: o.x * ratio, y: o.y * ratio, w: o.w * ratio, h: o.h * ratio, fontSize: o.fontSize ? o.fontSize * ratio : o.fontSize, lineWidth: o.lineWidth ? o.lineWidth * ratio : o.lineWidth }));
                  setObjects(next);
                  pushHistory(next);
                }
                setTemplateHeightPt(newPt);
              }} />
              <small>{templateUnit}</small>
            </span>
          </label>
          <select className="unitSelect" value={templateUnit} onChange={(e) => setTemplateUnit(e.target.value)}>
            <option value="mm">mm</option>
            <option value="cm">cm</option>
            <option value="in">in</option>
            <option value="pt">pt</option>
          </select>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "4px", height: "2rem" }} title="Escalar objetos proporcionalmente al cambiar de tamaño">
            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted)", whiteSpace: "nowrap", lineHeight: 1 }}>Proporcional</span>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input type="checkbox" className="toggleInput" id="chk-dyn-resize" checked={dynamicResize} onChange={(e) => setDynamicResize(e.target.checked)} />
              <label htmlFor="chk-dyn-resize" className="toggleTrack" data-checked={dynamicResize} style={{ margin: 0 }}><div className="toggleThumb" /></label>
            </div>
          </div>
        </div>
        <div className="toolbarDivider" />
        <button onClick={onHelp} title="Documentación y guía de uso"
          style={{ background: "var(--primary,#16a34a)", color: "#fff", border: "none", borderRadius: "50%", width: 28, height: 28, padding: 0, fontSize: "0.9rem", fontWeight: 800, cursor: "help", flexShrink: 0, boxShadow: "0 2px 6px rgba(22,163,74,0.3)", display: "flex", alignItems: "center", justifyContent: "center", marginLeft: "0.5rem" }}
        >?</button>
      </div>
    </header>
  );
}
