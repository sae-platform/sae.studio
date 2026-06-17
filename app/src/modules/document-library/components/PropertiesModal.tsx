import { Portal } from "@/components/Portal";

type PropertiesModalProps = {
  docName: string;
  setDocName: (name: string) => void;
  docKind: string;
  metaVersion: string;
  setMetaVersion: (v: string) => void;
  metaBrand: string;
  setMetaBrand: (v: string) => void;
  metaPart: string;
  setMetaPart: (v: string) => void;
  metaSize: string;
  setMetaSize: (v: string) => void;
  metaDescription: string;
  setMetaDescription: (v: string) => void;
  onClose: () => void;
};

export function PropertiesModal({
  docName, setDocName, docKind,
  metaVersion, setMetaVersion, metaBrand, setMetaBrand,
  metaPart, setMetaPart, metaSize, setMetaSize,
  metaDescription, setMetaDescription, onClose,
}: PropertiesModalProps) {
  return (
    <Portal>
      <div className="modalBackdrop" onClick={onClose}>
        <div className="modalCard" onClick={(e) => e.stopPropagation()}>
          <h3 style={{ marginBottom: "1.25rem" }}>Propiedades del Documento</h3>
          <div className="newDocGrid">
            <label className="menuField full">
              Nombre
              <input value={docName} onChange={(e) => setDocName(e.target.value)} />
            </label>
            {docKind !== "saetickets" ? (
              <>
                <label className="menuField">Version<input value={metaVersion} onChange={(e) => setMetaVersion(e.target.value)} /></label>
                <label className="menuField">Brand<input value={metaBrand} onChange={(e) => setMetaBrand(e.target.value)} /></label>
                <label className="menuField">Part<input value={metaPart} onChange={(e) => setMetaPart(e.target.value)} /></label>
                <label className="menuField">Size<input value={metaSize} onChange={(e) => setMetaSize(e.target.value)} /></label>
                <label className="menuField full">Description<textarea rows={2} value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} /></label>
              </>
            ) : (
              <div style={{ gridColumn: "1 / -1", padding: "1rem", background: "#f1f5f9", borderRadius: "8px", fontSize: "0.85rem", color: "#475569" }}>
                <strong>Configuración de Tiquete</strong><br />
                Las dimensiones se definen en el bloque Setup del XML como 42 (80mm) o 32 (58mm).
              </div>
            )}
          </div>
          <div className="modalActions">
            <button type="button" className="primary" onClick={onClose}>Aceptar</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
