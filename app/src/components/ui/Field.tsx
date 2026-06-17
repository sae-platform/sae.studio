import { type ReactNode } from "react";

type FieldProps = {
  label: string;
  hint?: string;
  children: ReactNode;
};

function Field({ label, hint, children }: FieldProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text, #374151)" }}>
          {label}
        </span>
        {hint && (
          <span style={{ fontSize: 11, color: "var(--text-muted, #9ca3af)" }}>
            {hint}
        </span>
        )}
      </div>
      {children}
    </div>
  );
}

export { Field };
export type { FieldProps };
