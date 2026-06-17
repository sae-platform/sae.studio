import { Portal } from "@/components/Portal";

type ResultModalProps = {
  result: string;
  onClose: () => void;
  onCopy: () => void;
};

export function ResultModal({ result, onClose, onCopy }: ResultModalProps) {
  return (
    <Portal>
      <div className="modalBackdrop">
        <div className="modalCard" onClick={(e) => e.stopPropagation()}>
          <h3>Resultado actual</h3>
          <pre style={{ maxHeight: "55vh", marginBottom: "0.6rem" }}>{result || "Sin resultado todavia."}</pre>
          <div className="modalActions">
            <button type="button" className="secondary" onClick={onClose}>Cerrar</button>
            <button type="button" className="secondary" onClick={onCopy} disabled={!result}>Copiar</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
