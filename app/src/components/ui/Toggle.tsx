type ToggleProps = {
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
  disabled?: boolean;
};

function Toggle({ label, checked, onChange, hint, disabled = false }: ToggleProps) {
  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div style={{ position: "relative", width: 36, height: 20, flexShrink: 0 }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          style={{
            position: "absolute",
            opacity: 0,
            width: "100%",
            height: "100%",
            cursor: disabled ? "default" : "pointer",
          }}
        />
        <div
          style={{
            width: 36,
            height: 20,
            borderRadius: 10,
            background: checked ? "var(--accent, #0f766e)" : "var(--border, #d1d5db)",
            transition: "background 0.2s",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 2,
            left: checked ? 18 : 2,
            width: 16,
            height: 16,
            borderRadius: 8,
            background: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            transition: "left 0.2s",
          }}
        />
      </div>
      {(label || hint) && (
        <span style={{ fontSize: 13, color: "var(--text, #374151)", fontWeight: 500 }}>
          {label}
          {hint && (
            <span style={{ color: "var(--text-muted, #9ca3af)", marginLeft: 4 }}>
              {hint}
            </span>
          )}
        </span>
      )}
    </label>
  );
}

export { Toggle };
export type { ToggleProps };
