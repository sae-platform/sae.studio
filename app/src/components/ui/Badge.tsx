type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral";

type BadgeProps = {
  variant?: BadgeVariant;
  label: string;
};

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: "#d1fae5", text: "#065f46" },
  warning: { bg: "#fef3c7", text: "#92400e" },
  danger: { bg: "#fee2e2", text: "#991b1b" },
  info: { bg: "#dbeafe", text: "#1e40af" },
  neutral: { bg: "var(--bg-subtle, #f3f4f6)", text: "var(--text-muted, #6b7280)" },
};

function Badge({ variant = "neutral", label }: BadgeProps) {
  const style = variantStyles[variant];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: "18px",
        backgroundColor: style.bg,
        color: style.text,
      }}
    >
      {label}
    </span>
  );
}

export { Badge };
export type { BadgeVariant, BadgeProps };
