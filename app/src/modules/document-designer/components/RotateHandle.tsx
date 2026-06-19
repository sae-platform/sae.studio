import { useRef, useCallback } from "react";

interface RotateHandleProps {
  onRotate: (angleDeg: number) => void;
  /** px per mm */
  scale: number;
  elementRect?: DOMRect;
}

export function RotateHandle({ onRotate, scale, elementRect }: RotateHandleProps) {
  const dragging = useRef(false);
  const startAngle = useRef(0);
  const initialRotation = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;

    const center = elementRect
      ? { x: elementRect.left + elementRect.width / 2, y: elementRect.top + elementRect.height / 2 }
      : { x: 0, y: 0 };
    startAngle.current = Math.atan2(e.clientY - center.y, e.clientX - center.x);

    const onMove = (me: MouseEvent) => {
      if (!dragging.current) return;
      const currentAngle = Math.atan2(me.clientY - center.y, me.clientX - center.x);
      const deltaRad = currentAngle - startAngle.current;
      const deltaDeg = Math.round((deltaRad * 180) / Math.PI);
      if (Math.abs(deltaDeg) >= 1) {
        onRotate(initialRotation.current + deltaDeg);
      }
    };

    const onUp = () => {
      dragging.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [onRotate, elementRect]);

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        position: "absolute",
        top: -18,
        left: "50%",
        transform: "translateX(-50%)",
        width: 12,
        height: 12,
        borderRadius: "50%",
        background: "#fff",
        border: "2px solid #0f766e",
        cursor: "grab",
        zIndex: 20,
        boxShadow: "0 0 0 2px rgba(15,118,110,0.15)",
      }}
      title="Rotar"
    />
  );
}
