type Props = {
  sel: Record<string, any>;
  setObjects: (updater: (prev: any[]) => any[]) => void;
};

export function InspectorPanel({ sel, setObjects }: Props) {
  const I: React.CSSProperties = {
    display: "block", width: "100%", padding: "0.4rem 0.5rem", boxSizing: "border-box",
    borderRadius: 6, border: "1px solid var(--border, #e5e7eb)",
    background: "var(--surface-alt, #f8fafc)", color: "var(--text)",
    fontSize: "0.85rem", outline: "none", fontFamily: "system-ui",
  };

  return (
    <div className="inspectorPanel">
        <div className="inspectorSection">
          <header className="sectionHeader">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
            <span>Geometría</span>
          </header>
          <div className="inspectorFields grid2">
            <label>X<input type="number" value={sel.x} onChange={e => setObjects(p => p.map(x => x.id === sel.id ? { ...x, x: Number(e.target.value) } : x))} /></label>
            <label>Y<input type="number" value={sel.y} onChange={e => setObjects(p => p.map(x => x.id === sel.id ? { ...x, y: Number(e.target.value) } : x))} /></label>
            <label>Ancho<input type="number" value={sel.w} onChange={e => setObjects(p => p.map(x => x.id === sel.id ? { ...x, w: Number(e.target.value) } : x))} /></label>
            <label>Alto<input type="number" value={sel.h} onChange={e => setObjects(p => p.map(x => x.id === sel.id ? { ...x, h: Number(e.target.value) } : x))} /></label>
          </div>
          <div className="inspectorFields grid3">
            <label>Rotación (°)<input type="number" step="0.5" value={Number(sel.rotateDeg || 0).toFixed(1)} onChange={e => setObjects(p => p.map(x => x.id === sel.id ? { ...x, rotateDeg: Number(e.target.value) } : x))} /></label>
            <label>Skew X (°)<input type="number" step="0.5" value={Number(sel.skewX || 0).toFixed(1)} onChange={e => setObjects(p => p.map(x => x.id === sel.id ? { ...x, skewX: Number(e.target.value) } : x))} /></label>
            <label>Skew Y (°)<input type="number" step="0.5" value={Number(sel.skewY || 0).toFixed(1)} onChange={e => setObjects(p => p.map(x => x.id === sel.id ? { ...x, skewY: Number(e.target.value) } : x))} /></label>
          </div>
          <div className="inspectorFields grid2">
            <label>Escala X<input type="number" step="0.1" value={sel.scaleX} onChange={e => setObjects(p => p.map(x => x.id === sel.id ? { ...x, scaleX: Number(e.target.value) } : x))} /></label>
            <label>Escala Y<input type="number" step="0.1" value={sel.scaleY} onChange={e => setObjects(p => p.map(x => x.id === sel.id ? { ...x, scaleY: Number(e.target.value) } : x))} /></label>
          </div>
        </div>

        <div className="inspectorSection">
          <header className="sectionHeader">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            <span>Apariencia</span>
          </header>
          <div className="inspectorFields grid2">
            {(sel.type === "box" || sel.type === "ellipse" || sel.type === "line" || sel.type === "path") && (
              <>
                <label className="full">Color Relleno
                  <div className="colorInput">
                    <input type="color" disabled={!sel.fillColor} value={sel.fillColor || "#ffffff"} onChange={e => setObjects(p => p.map(x => x.id === sel.id ? { ...x, fillColor: e.target.value } : x))} />
                    <span>{sel.fillColor || "Transparente"}</span>
                    <button className="btnIcon" onClick={() => setObjects(p => p.map(x => x.id === sel.id ? { ...x, fillColor: sel.fillColor ? undefined : "#ffffff" } : x))} title={sel.fillColor ? "Quitar Relleno" : "Poner Relleno"}>
                      {sel.fillColor ? "×" : "+"}
                    </button>
                  </div>
                </label>
                <label className="full">Color Borde
                  <div className="colorInput">
                    <input type="color" disabled={sel.lineWidth === 0} value={sel.lineColor || "#000000"} onChange={e => setObjects(p => p.map(x => x.id === sel.id ? { ...x, lineColor: e.target.value } : x))} />
                    <span>{sel.lineWidth === 0 ? "Sin Borde" : (sel.lineColor || "#000000")}</span>
                  </div>
                </label>
                <label className="full">Ancho Borde
                  <div className="colorInput">
                    <input type="number" min="0" step="0.5" value={sel.lineWidth ?? 1} onChange={e => setObjects(p => p.map(x => x.id === sel.id ? { ...x, lineWidth: Number(e.target.value) } : x))} />
                    <button className="btnIcon" onClick={() => setObjects(p => p.map(x => x.id === sel.id ? { ...x, lineWidth: (sel.lineWidth || 0) > 0 ? 0 : 1 } : x))} title={sel.lineWidth ? "Quitar Borde" : "Poner Borde"}>
                      {sel.lineWidth ? "×" : "+"}
                    </button>
                  </div>
                </label>
              </>
            )}
            {sel.type === "barcode" && (
              <label className="full">Tipo Barcode
                <select value={sel.barcodeKind || "CODE128"} onChange={e => setObjects(p => p.map(x => x.id === sel.id ? { ...x, barcodeKind: e.target.value } : x))}>
                  {["CODE128", "CODE39", "QR", "EAN13", "EAN8", "UPCA", "UPCE", "ITF", "DATAMATRIX"].map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </label>
            )}
            {sel.type === "barcode" && sel.barcodeKind !== "QR" && (
              <>
                <label className="toggleLabel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', cursor: 'pointer', margin: '0.4rem 0' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Mostrar texto</span>
                  <div style={{ position: 'relative' }}>
                    <input type="checkbox" className="toggleInput" id="chk-show-text"
                      checked={!!sel.showText}
                      onChange={e => setObjects(p => p.map(x => x.id === sel.id ? { ...x, showText: e.target.checked } : x))} />
                    <label htmlFor="chk-show-text" className="toggleTrack" data-checked={!!sel.showText}>
                      <div className="toggleThumb"></div>
                    </label>
                  </div>
                </label>
                <label className="full">Posición texto
                  <select value={sel.textPosition || "bottom"} onChange={e => setObjects(p => p.map(x => x.id === sel.id ? { ...x, textPosition: e.target.value as any } : x))}>
                    <option value="bottom">Abajo</option>
                    <option value="top">Arriba</option>
                  </select>
                </label>
                {sel.showText !== false && (
                  <>
                    <label className="full">Alineación texto
                      <select value={sel.textAlign || "center"} onChange={e => setObjects(p => p.map(x => x.id === sel.id ? { ...x, textAlign: e.target.value } : x))}>
                        <option value="left">Izquierda</option>
                        <option value="center">Centro</option>
                        <option value="right">Derecha</option>
                      </select>
                    </label>
                    <label className="full">Fuente texto
                      <select value={sel.fontFamily || "monospace"} onChange={e => setObjects(p => p.map(x => x.id === sel.id ? { ...x, fontFamily: e.target.value } : x))}>
                        <option value="monospace">Monospace</option>
                        <option value="sans-serif">Sans-serif</option>
                        <option value="serif">Serif</option>
                        <option value="Arial">Arial</option>
                        <option value="Helvetica">Helvetica</option>
                        <option value="Courier New">Courier New</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Verdana">Verdana</option>
                      </select>
                    </label>
                    <label className="full">Tamaño texto (pt)
                      <input type="number" min={6} max={72} step={1} value={sel.fontSize ?? 12} onChange={e => setObjects(p => p.map(x => x.id === sel.id ? { ...x, fontSize: Number(e.target.value) } : x))} />
                    </label>
                    <label className="full">Color texto
                      <input type="color" value={sel.textColor || "#000000"} onChange={e => setObjects(p => p.map(x => x.id === sel.id ? { ...x, textColor: e.target.value } : x))} />
                    </label>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {sel.type !== "box" && sel.type !== "ellipse" && sel.type !== "line" && (
        <div className="inspectorSection">
          <header className="sectionHeader">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            <span>{sel.type === "text" ? "Texto" : sel.type === "image" ? "Imagen" : "Contenido"}</span>
          </header>
          <div className="inspectorFields">
            {sel.type === "image" && (
              <div className="full imgUploadRow">
                <button type="button" className="mini" onClick={() => { const input = document.createElement("input"); input.type = "file"; input.accept = "image/*"; input.onchange = (e) => { const file = (e.target as HTMLInputElement).files?.[0]; if (file) { const reader = new FileReader(); reader.onload = (loadEv) => { setObjects(p => p.map(x => x.id === sel.id ? { ...x, content: loadEv.target?.result as string } : x)); }; reader.readAsDataURL(file); } }; input.click(); }}>Cargar Imagen</button>
              </div>
            )}
            {sel.type === "text" && (
              <>
                <label style={{ margin: 0 }}>Fuente
                  <select value={sel.fontFamily || "sans-serif"} onChange={e => setObjects(p => p.map(x => x.id === sel.id ? { ...x, fontFamily: e.target.value } : x))}>
                    <option value="sans-serif">Sans-serif</option>
                    <option value="serif">Serif</option>
                    <option value="monospace">Monospace</option>
                    <option value="Arial">Arial</option>
                    <option value="Helvetica">Helvetica</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Verdana">Verdana</option>
                    <option value="Tahoma">Tahoma</option>
                  </select>
                </label>
                <label style={{ margin: 0 }}>Tamaño
                  <input type="number" min={4} max={200} step={1}
                    value={sel.fontSize ?? 10}
                    onChange={e => setObjects(p => p.map(x => x.id === sel.id ? { ...x, fontSize: Number(e.target.value) } : x))}
                  />
                </label>
              </>
            )}
            {sel.type !== "image" && (
              <label className="full" style={{ margin: 0 }}>Contenido
                {sel.type === "text" ? (
                  <textarea rows={2} style={{ ...I, height: 60 }} value={sel.content} onChange={e => setObjects(p => p.map(x => x.id === sel.id ? { ...x, content: e.target.value } : x))} />
                ) : (
                  <input type="text" style={I} value={sel.content || ""} onChange={e => setObjects(p => p.map(x => x.id === sel.id ? { ...x, content: e.target.value } : x))} />
                )}
              </label>
            )}
          </div>
        </div>
        )}
    </div>
  );
}
