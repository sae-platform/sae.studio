import { type ReactNode, useEffect, useRef, type MouseEvent } from "react";
import { createPortal } from "react-dom";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string | number;
};

function Modal({ open, onClose, title, children, footer, width = 640 }: ModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  function handleBackdropClick(e: MouseEvent) {
    if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
      onClose();
    }
  }

  return createPortal(
    <div
      className="modalBackdrop"
      onClick={handleBackdropClick}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(4px)",
        animation: "modalAppear 0.15s ease-out",
      }}
    >
      <div
        ref={cardRef}
        className="modalCard"
        style={{
          background: "var(--surface, #fff)",
          border: "1px solid var(--border, #e5e7eb)",
          borderRadius: 12,
          padding: 0,
          width,
          maxWidth: "95vw",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
        }}
      >
        {title && (
          <div
            style={{
              padding: "20px 24px 0",
              fontSize: 18,
              fontWeight: 600,
              color: "var(--text, #111827)",
            }}
          >
            {title}
          </div>
        )}
        <div
          style={{
            padding: "16px 24px",
            overflowY: "auto",
            flex: 1,
          }}
        >
          {children}
        </div>
        {footer && (
          <div
            style={{
              padding: "12px 24px",
              borderTop: "1px solid var(--border, #e5e7eb)",
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export { Modal };
export type { ModalProps };
