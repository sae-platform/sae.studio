import { LABEL_PRESETS } from "./labelPresets";

interface SizeSelectorModalProps {
  onClose: () => void;
  onSelect: (widthMm: number | undefined, heightMm: number | undefined) => void;
  mediaType: "receipt" | "label";
  currentValue?: number;
  isPrinterSpecific?: boolean;
}

export function SizeSelectorModal({
  onClose,
  onSelect,
  mediaType,
  currentValue,
  isPrinterSpecific,
}: SizeSelectorModalProps) {
  const isLabel = mediaType === "label";

  return (
    <div
      className="modalBackdrop"
      style={{ zIndex: 4000, background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="modalCard"
        style={{ width: "450px", padding: "1.25rem" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.25rem",
          }}
        >
          <div>
            <h4 style={{ margin: 0 }}>
              Seleccionar {isLabel ? "Tamaño de Etiqueta" : "Ancho de Papel"}
            </h4>
            {isPrinterSpecific && (
              <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                Configuración específica para esta impresora
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gap: "0.75rem",
            maxHeight: "400px",
            overflowY: "auto",
            padding: "0.25rem",
          }}
        >
          {isPrinterSpecific && (
            <button
              className="sizeSelectItem"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.2rem",
                padding: "0.85rem 1rem",
                background: currentValue === undefined
                  ? "var(--accent-light, rgba(15,118,110,0.1))"
                  : "var(--bg-card, #1e293b)",
                border: `2px solid ${currentValue === undefined ? "var(--accent)" : "var(--border)"}`,
                borderRadius: "10px",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s",
              }}
              onClick={() => {
                onSelect(undefined, undefined);
                onClose();
              }}
            >
              <span
                style={{
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  color: currentValue === undefined ? "var(--accent)" : "var(--text)",
                }}
              >
                Usar valor general (Heredado)
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                Respeta la configuración principal de la impresora lógica
              </span>
            </button>
          )}

          {!isLabel ? (
            <>
              {[80, 58, undefined].map((value) => {
                const opt = {
                  value,
                  label: value ? `${value} mm` : "Ancho Libre",
                  sub: value
                    ? value === 80
                      ? "Estándar térmico (42 cols)"
                      : "Portátil / Mini (32 cols)"
                    : "Sin restricción",
                };
                return (
                  <button
                    key={opt.label}
                    className="sizeSelectItem"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.2rem",
                      padding: "0.85rem 1rem",
                      background: currentValue === value
                        ? "var(--accent-light, rgba(15,118,110,0.1))"
                        : "var(--bg-card, #1e293b)",
                      border: `2px solid ${currentValue === value ? "var(--accent)" : "var(--border)"}`,
                      borderRadius: "10px",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s",
                    }}
                    onClick={() => {
                      onSelect(opt.value, undefined);
                      onClose();
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: "0.95rem",
                        color: currentValue === value ? "var(--accent)" : "var(--text)",
                      }}
                    >
                      {opt.label}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                      {opt.sub}
                    </span>
                  </button>
                );
              })}
            </>
          ) : (
            LABEL_PRESETS.map((preset) => (
              <button
                key={preset.id}
                className="sizeSelectItem"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.2rem",
                  padding: "0.85rem 1rem",
                  background:
                    (preset.id === "custom" && !currentValue) || preset.widthMm === currentValue
                      ? "var(--accent-light, rgba(15,118,110,0.1))"
                      : "var(--bg-card, #1e293b)",
                  border: `2px solid ${
                    (preset.id === "custom" && !currentValue) || preset.widthMm === currentValue
                      ? "var(--accent)"
                      : "var(--border)"
                  }`,
                  borderRadius: "10px",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s",
                }}
                onClick={() => {
                  onSelect(preset.widthMm > 0 ? preset.widthMm : undefined, preset.heightMm > 0 ? preset.heightMm : undefined);
                  onClose();
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    color:
                      (preset.id === "custom" && !currentValue) || preset.widthMm === currentValue
                        ? "var(--accent)"
                        : "var(--text)",
                  }}
                >
                  {preset.name}
                </span>
                <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                  {preset.widthMm > 0 ? `${preset.widthMm} × ${preset.heightMm} mm — ` : ""}
                  {preset.description}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
