type FloatingToolbarProps = {
  x: number;
  y: number;
  visible: boolean;
  selectedCount: number;
  selectedType: string;
  objectProps: {
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    fontStyle?: string;
    textAlign?: string;
    textColor?: string;
  };
  onPropertyChange: (property: string, value: unknown) => void;
  onDelete: () => void;
};

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72, 96];

export function FloatingToolbar({
  x,
  y,
  visible,
  selectedCount,
  selectedType,
  objectProps,
  onPropertyChange,
  onDelete,
}: FloatingToolbarProps) {
  if (!visible || selectedCount === 0) return null;

  const isText = selectedType === "text" || selectedType === "barcode";

  return (
    <div
      style={{
        position: "fixed",
        left: x,
        top: y - 48,
        transform: "translateX(-50%)",
        zIndex: 500,
        display: "flex",
        alignItems: "center",
        gap: 2,
        padding: "4px 6px",
        background: "var(--surface, #fff)",
        border: "1px solid var(--border, #e5e7eb)",
        borderRadius: 8,
        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
        whiteSpace: "nowrap",
        pointerEvents: "auto",
      }}
    >
      {isText && (
        <>
          <div style={{ display: "flex", gap: 1 }}>
            <ToolBtn
              active={objectProps.fontWeight === "bold"}
              onClick={() =>
                onPropertyChange("fontWeight", objectProps.fontWeight === "bold" ? "normal" : "bold")
              }
              label="B"
              style={{ fontWeight: "bold" }}
            />
            <ToolBtn
              active={objectProps.fontStyle === "italic"}
              onClick={() =>
                onPropertyChange("fontStyle", objectProps.fontStyle === "italic" ? "normal" : "italic")
              }
              label="I"
              style={{ fontStyle: "italic" }}
            />
          </div>
          <Divider />
          <select
            value={objectProps.fontFamily ?? "sans-serif"}
            onChange={(e) => onPropertyChange("fontFamily", e.target.value)}
            style={selectStyle}
          >
            {FONTS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <select
            value={objectProps.fontSize ?? 12}
            onChange={(e) => onPropertyChange("fontSize", Number(e.target.value))}
            style={{ ...selectStyle, width: 52 }}
          >
            {FONT_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <Divider />
          <div style={{ display: "flex", gap: 1 }}>
            {(["left", "center", "right"] as const).map((a) => (
              <ToolBtn
                key={a}
                active={objectProps.textAlign === a}
                onClick={() => onPropertyChange("textAlign", a)}
                label={a === "left" ? "≡≡" : a === "center" ? "≡≡" : "≡≡"}
                style={{
                  textAlign: a as React.CSSProperties["textAlign"],
                  width: 24,
                  letterSpacing: a === "center" ? -3 : undefined,
                }}
              />
            ))}
          </div>
          <Divider />
          <input
            type="color"
            value={objectProps.textColor ?? "#000000"}
            onChange={(e) => onPropertyChange("textColor", e.target.value)}
            style={{ width: 24, height: 24, border: "none", cursor: "pointer", padding: 0, background: "none" }}
          />
        </>
      )}
      <Divider />
      <ToolBtn onClick={onDelete} label="×" style={{ color: "#ef4444", fontSize: 16 }} active={false} />
    </div>
  );
}

function ToolBtn({
  active,
  onClick,
  label,
  style,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 28,
        height: 28,
        border: "none",
        borderRadius: 4,
        background: active ? "var(--accent, #0f766e)" : "transparent",
        color: active ? "#fff" : "var(--text, #374151)",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 500,
        padding: 0,
        ...style,
      }}
    >
      {label}
    </button>
  );
}

function Divider() {
  return (
    <div
      style={{
        width: 1,
        height: 20,
        background: "var(--border, #e5e7eb)",
        margin: "0 2px",
      }}
    />
  );
}

const FONTS = [
  "sans-serif",
  "serif",
  "monospace",
  "Arial",
  "Helvetica",
  "Times New Roman",
  "Courier New",
  "Verdana",
  "Georgia",
  "Trebuchet MS",
];

const selectStyle: React.CSSProperties = {
  border: "1px solid var(--border, #e5e7eb)",
  borderRadius: 4,
  background: "var(--surface, #fff)",
  color: "var(--text, #111827)",
  fontSize: 11,
  padding: "3px 4px",
  cursor: "pointer",
  height: 28,
  outline: "none",
};
