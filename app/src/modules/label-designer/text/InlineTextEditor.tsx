import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from "react";

type InlineTextEditorProps = {
  initialText: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  zoom: number;
  onCommit: (text: string) => void;
  onCancel: () => void;
  variables: { name: string }[];
};

export function InlineTextEditor({
  initialText,
  x,
  y,
  width,
  height,
  fontSize,
  fontFamily,
  zoom,
  onCommit,
  onCancel,
  variables,
}: InlineTextEditorProps) {
  const [text, setText] = useState(initialText);
  const [showVarPicker, setShowVarPicker] = useState(false);
  const [varPickerAutoOpen, setVarPickerAutoOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const commit = useCallback(() => {
    onCommit(text);
  }, [text, onCommit]);

  const cancel = useCallback(() => {
    onCancel();
  }, [onCancel]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.focus();
    ta.select();

    function resize() {
      if (!ta) return;
      ta.style.height = "auto";
      ta.style.height = `${Math.max(ta.scrollHeight, height)}px`;
    }
    resize();
    ta.addEventListener("input", resize);
    return () => ta.removeEventListener("input", resize);
  }, [height]);

  useEffect(() => {
    if (text.endsWith("${!") && !varPickerAutoOpen) {
      setVarPickerAutoOpen(true);
      setShowVarPicker(true);
    }
    if (!text.endsWith("${!") && varPickerAutoOpen) {
      setVarPickerAutoOpen(false);
      setShowVarPicker(false);
    }
  }, [text, varPickerAutoOpen]);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (showVarPicker) return;
    if (e.key === "Enter" && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      commit();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      if (showVarPicker) {
        setShowVarPicker(false);
        setVarPickerAutoOpen(false);
      } else {
        cancel();
      }
    }
  }

  function handleBlur() {
    if (showVarPicker) return;
    commit();
  }

  function insertVariable(varName: string) {
    setText((prev) => {
      const prefix = prev.endsWith("${!") ? "" : prev.endsWith(" ") || prev.length === 0 ? "" : " ";
      return `${prev}${prefix}\${!${varName}}`;
    });
    setShowVarPicker(false);
    setVarPickerAutoOpen(false);
    textareaRef.current?.focus();
  }

  const inputLeft = x * zoom;
  const inputTop = y * zoom;
  const inputWidth = Math.max(width * zoom, 200);
  const inputFontSize = Math.max(fontSize * zoom, 12);

  return (
    <div
      style={{
        position: "absolute",
        left: inputLeft,
        top: inputTop,
        zIndex: 100,
        minWidth: inputWidth,
      }}
    >
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        style={{
          fontFamily,
          fontSize: inputFontSize,
          color: "var(--text, #111827)",
          background: "var(--surface, #fff)",
          border: "2px solid var(--accent, #0f766e)",
          borderRadius: 4,
          padding: "4px 8px",
          width: "100%",
          minWidth: 200,
          resize: "none",
          overflow: "hidden",
          outline: "none",
          boxSizing: "border-box",
          lineHeight: 1.3,
          boxShadow: "0 0 0 2px rgba(15,118,110,0.2)",
        }}
      />
      <button
        onClick={() => setShowVarPicker(!showVarPicker)}
        style={{
          position: "absolute",
          right: 4,
          top: 4,
          background: "var(--bg-subtle, #f3f4f6)",
          border: "1px solid var(--border, #e5e7eb)",
          borderRadius: 3,
          padding: "2px 6px",
          cursor: "pointer",
          fontSize: 11,
          fontWeight: 600,
          color: "var(--text-muted, #6b7280)",
        }}
      >
        {"{ }"}
      </button>
      {showVarPicker && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: 4,
            background: "var(--surface, #fff)",
            border: "1px solid var(--border, #e5e7eb)",
            borderRadius: 6,
            boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
            maxHeight: 200,
            overflowY: "auto",
            zIndex: 101,
          }}
        >
          {variables.length === 0 ? (
            <div style={{ padding: 8, fontSize: 12, color: "var(--text-muted, #9ca3af)" }}>
              Sin variables disponibles
            </div>
          ) : (
            variables.map((v) => (
              <div
                key={v.name}
                onClick={() => insertVariable(v.name)}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.background = "var(--accent, #0f766e)";
                  (e.target as HTMLElement).style.color = "#fff";
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.background = "transparent";
                  (e.target as HTMLElement).style.color = "var(--text, #111827)";
                }}
                style={{
                  padding: "4px 10px",
                  fontSize: 12,
                  cursor: "pointer",
                  color: "var(--text, #111827)",
                }}
              >
                {`\${${v.name}}`}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
