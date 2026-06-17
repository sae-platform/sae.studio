import type { ObjectPlugin, CanvasObject } from "./types";
import {
  TextRenderer, BarcodeRenderer, ImageRenderer,
  LineRenderer, PathRenderer, BoxRenderer,
} from "@/modules/editor/components/ObjectRenderers";

let _id = 0;
function uid(): string { return `obj-${++_id}`; }
export function resetUid(): void { _id = 0; }

const TEXT_PLUGIN: ObjectPlugin = {
  type: "text",
  metadata: { label: "Texto", icon: "T", category: "basic" },
  createDefault(): CanvasObject {
    return {
      id: uid(), type: "text", x: 10, y: 10, w: 90, h: 24,
      content: "${texto}", rotateDeg: 0, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0,
      fontSize: 10, fontFamily: "sans-serif", lineColor: "#000000",
    };
  },
  Renderer: TextRenderer,
  Inspector: ({ obj, onChange }) => (
    <div className="inspectorSection">
      <header className="sectionHeader">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        <span>Apariencia</span>
      </header>
      <div className="inspectorFields">
        <label className="full">Color
          <div className="colorInput">
            <input type="color" value={(obj.lineColor as string) || "#000000"} onChange={e => onChange({ ...obj, lineColor: e.target.value })} />
            <span>{(obj.lineColor as string) || "#000000"}</span>
          </div>
        </label>
      </div>
    </div>
  ),
};

const BARCODE_PLUGIN: ObjectPlugin = {
  type: "barcode",
  metadata: { label: "Código de Barras", icon: "▍", category: "data" },
  createDefault(): CanvasObject {
    return {
      id: uid(), type: "barcode", x: 10, y: 10, w: 120, h: 60,
      content: "123456", rotateDeg: 0, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0,
      barcodeKind: "CODE128", showText: true, textPosition: "bottom",
    };
  },
  Renderer: BarcodeRenderer,
  Inspector: ({ obj, onChange }) => (
    <div className="inspectorSection">
      <header className="sectionHeader">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        <span>Apariencia</span>
      </header>
      <div className="inspectorFields grid2">
        <label className="full">Tipo Barcode
          <select value={(obj.barcodeKind as string) || "CODE128"} onChange={e => onChange({ ...obj, barcodeKind: e.target.value })}>
            {["CODE128","CODE39","QR","EAN13","EAN8","UPCA","UPCE","ITF","DATAMATRIX"].map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </label>
        {(obj.barcodeKind as string) !== "QR" && (
          <>
            <label className="toggleLabel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", cursor: "pointer", margin: "0.4rem 0" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Mostrar texto</span>
              <div style={{ position: "relative" }}>
                <input type="checkbox" className="toggleInput" id="barcode-show-text" checked={!!obj.showText} onChange={e => onChange({ ...obj, showText: e.target.checked })} />
                <label htmlFor="barcode-show-text" className="toggleTrack" data-checked={!!obj.showText}><div className="toggleThumb" /></label>
              </div>
            </label>
            <label className="full">Posición texto
              <select value={(obj.textPosition as string) || "bottom"} onChange={e => onChange({ ...obj, textPosition: e.target.value })}>
                <option value="bottom">Abajo</option>
                <option value="top">Arriba</option>
              </select>
            </label>
            {(obj.showText as boolean) !== false && (
              <>
                <label className="full">Alineación texto
                  <select value={(obj.textAlign as string) || "center"} onChange={e => onChange({ ...obj, textAlign: e.target.value })}>
                    <option value="left">Izquierda</option>
                    <option value="center">Centro</option>
                    <option value="right">Derecha</option>
                  </select>
                </label>
                <label className="full">Fuente texto
                  <select value={(obj.fontFamily as string) || "monospace"} onChange={e => onChange({ ...obj, fontFamily: e.target.value })}>
                    {["monospace","sans-serif","serif","Arial","Helvetica","Courier New","Times New Roman","Verdana"].map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </label>
                <label className="full">Tamaño texto (pt)
                  <input type="number" min={6} max={72} step={1} value={(obj.fontSize as number) ?? 12} onChange={e => onChange({ ...obj, fontSize: Number(e.target.value) })} />
                </label>
                <label className="full">Color texto
                  <input type="color" value={(obj.textColor as string) || "#000000"} onChange={e => onChange({ ...obj, textColor: e.target.value })} />
                </label>
              </>
            )}
          </>
        )}
      </div>
    </div>
  ),
};

const BOX_PLUGIN: ObjectPlugin = {
  type: "box",
  metadata: { label: "Caja", icon: "□", category: "shape" },
  createDefault(): CanvasObject {
    return {
      id: uid(), type: "box", x: 10, y: 10, w: 80, h: 60,
      content: "", rotateDeg: 0, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0,
      fillColor: "#e2e8f0", lineColor: "#000000", lineWidth: 1,
    };
  },
  Renderer: BoxRenderer,
  Inspector: ({ obj, onChange }) => (
    <div className="inspectorSection">
      <header className="sectionHeader">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        <span>Apariencia</span>
      </header>
      <div className="inspectorFields grid2">
        <label className="full">Color Relleno
          <div className="colorInput">
            <input type="color" disabled={!obj.fillColor} value={(obj.fillColor as string) || "#ffffff"} onChange={e => onChange({ ...obj, fillColor: e.target.value })} />
            <button className="btnIcon" onClick={() => onChange({ ...obj, fillColor: obj.fillColor ? undefined : "#ffffff" })}>{(obj.fillColor as string) ? "×" : "+"}</button>
          </div>
        </label>
        <label className="full">Color Borde
          <div className="colorInput">
            <input type="color" disabled={(obj.lineWidth as number) === 0} value={(obj.lineColor as string) || "#000000"} onChange={e => onChange({ ...obj, lineColor: e.target.value })} />
          </div>
        </label>
        <label className="full">Ancho Borde
          <input type="number" min="0" step="0.5" value={(obj.lineWidth as number) ?? 1} onChange={e => onChange({ ...obj, lineWidth: Number(e.target.value) })} />
        </label>
      </div>
    </div>
  ),
};

const LINE_PLUGIN: ObjectPlugin = {
  type: "line",
  metadata: { label: "Línea", icon: "—", category: "shape" },
  createDefault(): CanvasObject {
    return {
      id: uid(), type: "line", x: 10, y: 10, w: 80, h: 2,
      content: "", rotateDeg: 0, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0,
      lineColor: "#000000", lineWidth: 1,
    };
  },
  Renderer: LineRenderer,
};

const ELLIPSE_PLUGIN: ObjectPlugin = {
  type: "ellipse",
  metadata: { label: "Elipse", icon: "○", category: "shape" },
  createDefault(): CanvasObject {
    return {
      id: uid(), type: "ellipse", x: 10, y: 10, w: 80, h: 60,
      content: "", rotateDeg: 0, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0,
      fillColor: "#e2e8f0", lineColor: "#000000", lineWidth: 1,
    };
  },
  Renderer: BoxRenderer,
};

const IMAGE_PLUGIN: ObjectPlugin = {
  type: "image",
  metadata: { label: "Imagen", icon: "🖼", category: "media" },
  createDefault(): CanvasObject {
    return {
      id: uid(), type: "image", x: 10, y: 10, w: 100, h: 80,
      content: "", rotateDeg: 0, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0,
    };
  },
  Renderer: ImageRenderer,
};

const PATH_PLUGIN: ObjectPlugin = {
  type: "path",
  metadata: { label: "Forma SVG", icon: "✦", category: "shape" },
  createDefault(): CanvasObject {
    return {
      id: uid(), type: "path", x: 10, y: 10, w: 60, h: 60,
      content: "", rotateDeg: 0, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0,
      fillColor: "transparent", lineColor: "#000000", lineWidth: 1,
    };
  },
  Renderer: PathRenderer,
};

export const BASE_PLUGINS: ObjectPlugin[] = [
  TEXT_PLUGIN, BARCODE_PLUGIN, BOX_PLUGIN, LINE_PLUGIN,
  ELLIPSE_PLUGIN, IMAGE_PLUGIN, PATH_PLUGIN,
];
