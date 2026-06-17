import * as XLSX from "xlsx";
import type { LogicalPrinterDto } from "@/lib/api/client";

type PrintFormState = {
  printerName: string;
  copies: number;
  isPrinting: boolean;
};

type VariableDef = {
  name: string;
  type?: string;
};

type PrintModalProps = {
  printForm: PrintFormState;
  setPrintForm: (updater: (prev: PrintFormState) => PrintFormState) => void;
  showPrintersManager: () => void;
  onClose: () => void;
  availablePrinters: LogicalPrinterDto[];
  variables: VariableDef[];
  printTab: "manual" | "excel";
  setPrintTab: (tab: "manual" | "excel") => void;
  manualVars: Record<string, string>;
  setManualVars: (updater: (prev: Record<string, string>) => Record<string, string>) => void;
  excelData: Record<string, any>[];
  setExcelData: (data: Record<string, any>[]) => void;
  excelCols: string[];
  setExcelCols: (cols: string[]) => void;
  excelMapping: Record<string, string>;
  setExcelMapping: (updater: (prev: Record<string, string>) => Record<string, string>) => void;
  onPrint: () => void;
};

export function PrintModal({
  printForm, setPrintForm, showPrintersManager, onClose, availablePrinters,
  variables, printTab, setPrintTab, manualVars, setManualVars,
  excelData, setExcelData, excelCols, setExcelCols, excelMapping, setExcelMapping, onPrint,
}: PrintModalProps) {
  return (
    <div className="modalBackdrop" onClick={() => !printForm.isPrinting && onClose()} style={{ zIndex: 2000 }}>
      <div className="modalCard" style={{ width: "400px", maxWidth: "90vw" }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
          Imprimir Etiqueta
        </h3>
        <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "1.5rem" }}>
          Selecciona una impresora lógica configurada o escribe el nombre físico.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <label style={{ display: "block", margin: 0, fontSize: "0.85rem", fontWeight: 500 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Nombre de Impresora</span>
              <button type="button" className="toolbarBtn" style={{ padding: "0.2rem 0.4rem", fontSize: "0.75rem" }} onClick={showPrintersManager}>Administrar Impresoras</button>
            </div>
            {availablePrinters.length > 0 && (
              <select style={{ display: "block", width: "100%", marginTop: "0.4rem", padding: "0.5rem" }} value={printForm.printerName} onChange={(e) => setPrintForm((p) => ({ ...p, printerName: e.target.value }))} disabled={printForm.isPrinting}>
                <option value="">-- Seleccionar impresora o escribir nombre abajo --</option>
                {availablePrinters.map((p) => (
                  <option key={p.id} value={p.name}>{p.name} (Física: {p.printers?.map((x) => x.name).join(", ") || "N/A"})</option>
                ))}
              </select>
            )}
            <input style={{ display: "block", width: "100%", marginTop: "0.4rem", padding: "0.5rem" }} value={printForm.printerName} placeholder="Ej. ZDesigner GK420t" onChange={(e) => setPrintForm((p) => ({ ...p, printerName: e.target.value }))} disabled={printForm.isPrinting} />
          </label>
          <label style={{ display: "block", margin: 0, fontSize: "0.85rem", fontWeight: 500 }}>Cantidad de Copias {printTab === "excel" ? "(por registro)" : ""}</label>
          <input style={{ display: "block", width: "100%", marginTop: "0.4rem", padding: "0.5rem" }} type="number" min="1" value={printForm.copies} onChange={(e) => setPrintForm((p) => ({ ...p, copies: Math.max(1, Number(e.target.value) || 1) }))} disabled={printForm.isPrinting} />

          {variables.length > 0 && (
            <div style={{ marginTop: "1rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
              <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
                <button type="button" className={printTab === "manual" ? "primary" : "secondary"} onClick={() => setPrintTab("manual")}>Valores Manuales</button>
                <button type="button" className={printTab === "excel" ? "primary" : "secondary"} onClick={() => setPrintTab("excel")}>Cargar Excel (Lote)</button>
              </div>
              {printTab === "manual" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {variables.map((v) => (
                    <label key={v.name} style={{ display: "block", fontSize: "0.85rem" }}>
                      {v.name}
                      <input type="text" style={{ display: "block", width: "100%", padding: "0.4rem" }} value={manualVars[v.name] || ""} onChange={(e) => setManualVars((p) => ({ ...p, [v.name]: e.target.value }))} />
                    </label>
                  ))}
                </div>
              )}
              {printTab === "excel" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label style={{ display: "block", fontSize: "0.85rem" }}>
                    Archivo Excel (.xlsx, .csv)
                    <input type="file" accept=".xlsx, .xls, .csv" style={{ display: "block", width: "100%", padding: "0.4rem" }} onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const data = await file.arrayBuffer();
                      const workbook = XLSX.read(data);
                      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                      const json = XLSX.utils.sheet_to_json(worksheet);
                      setExcelData(json as Record<string, any>[]);
                      if (json.length > 0) setExcelCols(Object.keys(json[0] as object));
                    }} />
                  </label>
                  {excelCols.length > 0 && (
                    <div style={{ marginTop: "1rem", background: "var(--surface2)", padding: "0.8rem", borderRadius: "4px" }}>
                      <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.85rem" }}>Mapeo de Columnas ({excelData.length} filas)</h4>
                      {variables.map((v) => (
                        <div key={v.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                          <span style={{ fontSize: "0.85rem" }}>{v.name}</span>
                          <select style={{ padding: "0.3rem", width: "150px" }} value={excelMapping[v.name] || ""} onChange={(e) => setExcelMapping((p) => ({ ...p, [v.name]: e.target.value }))}>
                            <option value="">-- Ignorar --</option>
                            {excelCols.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="modalActions" style={{ marginTop: "2rem", display: "flex", gap: "0.5rem", justifyContent: "flex-end", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
          <button type="button" className="secondary" onClick={onClose} disabled={printForm.isPrinting}>Cancelar</button>
          <button type="button" className="primary" onClick={onPrint} disabled={printForm.isPrinting}>
            {printForm.isPrinting ? "Imprimiendo..." : "Enviar a Imprimir"}
          </button>
        </div>
      </div>
    </div>
  );
}
