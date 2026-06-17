import { useState, useEffect, useRef, type InputHTMLAttributes } from "react";

type SearchBarProps = InputHTMLAttributes<HTMLInputElement> & {
  onSearch: (value: string) => void;
  debounce?: number;
  width?: string | number;
  placeholder?: string;
};

function SearchBar({
  onSearch,
  debounce = 300,
  width = "100%",
  placeholder = "Buscar...",
  ...inputProps
}: SearchBarProps) {
  const [value, setValue] = useState("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => onSearch(value), debounce);
    return () => clearTimeout(timeoutRef.current);
  }, [value, debounce, onSearch]);

  return (
    <div style={{ position: "relative", width }}>
      <svg
        style={{
          position: "absolute",
          left: 10,
          top: "50%",
          transform: "translateY(-50%)",
          width: 14,
          height: 14,
          color: "var(--text-muted, #9ca3af)",
        }}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      >
        <circle cx={11} cy={11} r={8} />
        <path d="M21 21l-4.35-4.35" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        {...inputProps}
        style={{
          width: "100%",
          padding: "8px 36px 8px 32px",
          borderRadius: 9999,
          border: "1px solid var(--border, #e5e7eb)",
          background: "var(--surface, #fff)",
          color: "var(--text, #111827)",
          fontSize: 13,
          outline: "none",
          boxSizing: "border-box",
          ...inputProps.style,
        }}
      />
      {value && (
        <button
          onClick={() => setValue("")}
          style={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-muted, #9ca3af)",
            fontSize: 14,
            padding: 0,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

export { SearchBar };
export type { SearchBarProps };
