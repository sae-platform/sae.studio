type VariableDef = {
  name: string;
  type?: string;
  initial?: string;
  increment?: string;
  step?: number;
};

type VariablesPanelProps = {
  variables: VariableDef[];
  setVariables: (updater: VariableDef[] | ((prev: VariableDef[]) => VariableDef[])) => void;
  newVarName: string;
  setNewVarName: (name: string) => void;
  selectedObject: Record<string, any> | null;
  setObjects: (updater: any) => void;
  setStatus: (status: string) => void;
};

export function VariablesPanel({
  variables, setVariables, newVarName, setNewVarName,
  selectedObject, setObjects, setStatus,
}: VariablesPanelProps) {
  return (
    <div className="variablesPanel" style={{ padding: "1rem" }}>
      <h4 style={{ marginTop: 0, marginBottom: "0.5rem", color: "var(--text)" }}>Variables Mapeables</h4>

      <div className="variablesInfoBox" style={{ background: "var(--primary-light, #e0f2fe)", border: "1px solid var(--primary, #3b82f6)", color: "var(--primary-dark, #1e40af)", padding: "0.8rem", borderRadius: "8px", marginBottom: "1.5rem", fontSize: "0.8rem", lineHeight: "1.4" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.4rem", fontWeight: 600 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
          ¿Cómo insertar variables?
        </div>
        Para inyectar valores dinámicos en tu etiqueta, primero <strong>selecciona un elemento de Texto o Código de Barras</strong> en el lienzo. Luego, <strong>haz clic en la variable</strong> de la lista de abajo para insertarla.
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <input style={{ flex: 1 }} placeholder="Nombre Variable..." value={newVarName}
          onChange={(e) => setNewVarName(e.target.value.toUpperCase().replace(/\s+/g, "_"))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newVarName.trim() && !variables.some((x) => x.name === newVarName.trim())) {
              setVariables([...variables, { name: newVarName.trim(), type: "text", increment: "never" }]);
              setNewVarName("");
            }
          }}
        />
        <button type="button" className="mini primary" onClick={() => {
          if (newVarName.trim() && !variables.some((x) => x.name === newVarName.trim())) {
            setVariables([...variables, { name: newVarName.trim(), type: "text", increment: "never" }]);
            setNewVarName("");
          }
        }}>Añadir</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {variables.map((v) => {
          const isNumeric = ["integer", "int", "decimal", "float", "double"].includes(v.type || "text");
          return (
            <div key={v.name} className="variableCard" style={{ display: "flex", flexDirection: "column", gap: "0.5rem", background: "var(--surface, #1e293b)", padding: "0.8rem", borderRadius: "8px", border: "1px solid var(--border)", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <code style={{ fontSize: "0.8rem", color: "#60a5fa", backgroundColor: "rgba(30, 64, 175, 0.2)", padding: "0.4rem 0.6rem", borderRadius: "6px", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.4rem", transition: "all 0.2s", border: "1px solid rgba(96, 165, 250, 0.3)", userSelect: "none" }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(30, 64, 175, 0.4)"; e.currentTarget.style.borderColor = "#60a5fa"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "rgba(30, 64, 175, 0.2)"; e.currentTarget.style.borderColor = "rgba(96, 165, 250, 0.3)"; }}
                  onClick={() => {
                    if (selectedObject && (selectedObject.type === "text" || selectedObject.type === "barcode")) {
                      setObjects((p: any[]) => p.map((o: any) => o.id === selectedObject.id ? { ...o, content: (o.content || "") + `\${${v.name}}` } : o));
                      setStatus(`Variable \${${v.name}} insertada.`);
                    } else {
                      setStatus("Selecciona un elemento de texto o código de barras primero.");
                    }
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  {`{${v.name}}`}
                </code>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <select value={v.type || "text"} onChange={(e) => setVariables(variables.map((x) => x.name === v.name ? { ...x, type: e.target.value } : x))} style={{ fontSize: "0.8rem", padding: "6px 12px", borderRadius: "6px", border: "1px solid var(--border)", backgroundColor: "var(--bg-card, #0f172a)", color: "var(--text)", fontWeight: 500, cursor: "pointer", outline: "none", width: "110px" }}>
                    <option value="text">Texto</option>
                    <option value="integer">Entero</option>
                    <option value="decimal">Decimal</option>
                    <option value="date">Fecha</option>
                  </select>
                  <button type="button" className="iconBtn mini danger" style={{ border: "none", background: "transparent", padding: "4px", cursor: "pointer", borderRadius: "4px" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#fee2e2")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    onClick={() => setVariables(variables.filter((x) => x.name !== v.name))}
                    title="Eliminar variable"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>
              </div>
              {isNumeric && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginTop: "0.2rem", paddingTop: "0.4rem", borderTop: "1px dashed var(--border)" }}>
                  <label style={{ margin: 0, fontSize: "0.7rem", color: "var(--muted)" }}>Valor Inicial (Opcional)
                    <input style={{ display: "block", width: "100%", marginTop: "0.2rem", fontSize: "0.75rem", padding: "0.2rem" }} type="text" placeholder="ej. 1" value={v.initial || ""} onChange={(e) => setVariables(variables.map((x) => x.name === v.name ? { ...x, initial: e.target.value } : x))} />
                  </label>
                  <label style={{ margin: 0, fontSize: "0.7rem", color: "var(--muted)" }}>Incremento
                    <select style={{ display: "block", width: "100%", marginTop: "0.2rem", fontSize: "0.75rem", padding: "0.2rem" }} value={v.increment || "never"} onChange={(e) => setVariables(variables.map((x) => x.name === v.name ? { ...x, increment: e.target.value } : x))}>
                      <option value="never">Ninguno</option>
                      <option value="per_item">Por Elemento / Etiqueta</option>
                      <option value="per_page">Por Página</option>
                    </select>
                  </label>
                  {v.increment && v.increment !== "never" && (
                    <label style={{ margin: 0, fontSize: "0.7rem", color: "var(--muted)", gridColumn: "span 2" }}>Paso / Multiplicador
                      <input style={{ display: "block", width: "100%", marginTop: "0.2rem", fontSize: "0.75rem", padding: "0.2rem" }} type="number" placeholder="ej. 1 (Opcional)" value={v.step ?? ""} onChange={(e) => setVariables(variables.map((x) => x.name === v.name ? { ...x, step: e.target.value ? Number(e.target.value) : undefined } : x))} />
                    </label>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
