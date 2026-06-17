import { useState } from "react";
import type { SaeDocumentModel } from "@/modules/document-engine/models/document";
import { Database, Plus, ChevronDown, ChevronRight } from "lucide-react";

interface DataSourcePanelProps {
  doc: SaeDocumentModel;
  sampleJson: string;
  onSampleJsonChange: (json: string) => void;
  onDocChange: (doc: SaeDocumentModel) => void;
}

export function DataSourcePanel({ doc, sampleJson, onSampleJsonChange, onDocChange }: DataSourcePanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [jsonError, setJsonError] = useState<string | null>(null);

  const handleJsonChange = (value: string) => {
    onSampleJsonChange(value);
    try {
      JSON.parse(value);
      setJsonError(null);
    } catch (e: any) {
      setJsonError(e.message);
    }
  };

  return (
    <div className="docDsPanel">
      <div className="docPanelEyebrow" style={{ marginBottom: "0.5rem" }}>
        <Database size={12} style={{ marginRight: "0.35rem" }} />
        Datos & Fuentes
      </div>

      {/* Quick sample data */}
      <div className="docDsSection">
        <button
          type="button"
          className="docDsSectionTitle"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          Datos de prueba (JSON)
        </button>

        {expanded && (
          <>
            <textarea
              className={`docInput docDsTextarea${jsonError ? " docInput--error" : ""}`}
              value={sampleJson}
              onChange={(e) => handleJsonChange(e.target.value)}
              placeholder={`{\n  "Cliente": {\n    "Nombre": "Alejandro"\n  },\n  "Factura": {\n    "Total": 9500\n  }\n}`}
              spellCheck={false}
            />
            {jsonError && <span className="docDsError">{jsonError}</span>}
          </>
        )}
      </div>

      {/* Declared datasources */}
      <div className="docDsSection">
        <div className="docDsSectionTitle" style={{ cursor: "default" }}>
          Fuentes de datos ({doc.datasources.length})
        </div>
        {doc.datasources.map((ds, i) => (
          <div key={i} className="docDsItem">
            <span className="docDsName">{ds.name}</span>
            <span className="docDsType">{ds.type}</span>
          </div>
        ))}
        <button
          type="button"
          className="docColAdd"
          onClick={() => onDocChange({
            ...doc,
            datasources: [
              ...doc.datasources,
              { name: `DS${doc.datasources.length + 1}`, type: "manual", columns: [], sampleData: "[]" },
            ],
          })}
        >
          <Plus size={12} /> Agregar fuente
        </button>
      </div>

      {/* Variables */}
      <div className="docDsSection">
        <div className="docDsSectionTitle" style={{ cursor: "default" }}>
          Variables ({doc.variables.length})
        </div>
        {doc.variables.map((v, i) => (
          <div key={i} className="docDsItem">
            <span className="docDsName">{v.name}</span>
            <span className="docDsType">{v.type}</span>
          </div>
        ))}
        <button
          type="button"
          className="docColAdd"
          onClick={() => onDocChange({
            ...doc,
            variables: [...doc.variables, { name: `Var${doc.variables.length + 1}`, type: "text", initial: "" }],
          })}
        >
          <Plus size={12} /> Agregar variable
        </button>
      </div>
    </div>
  );
}
