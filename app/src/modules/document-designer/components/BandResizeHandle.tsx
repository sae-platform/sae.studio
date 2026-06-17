import { useRef, useCallback } from "react";

interface BandResizeHandleProps {
  onResize: (deltaMm: number) => void;
  /** px per mm */
  scale: number;
}

export function BandResizeHandle({ onResize, scale }: BandResizeHandleProps) {
  const dragging = useRef(false);
  const startY = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    startY.current = e.clientY;

    const onMove = (me: MouseEvent) => {
      if (!dragging.current) return;
      const deltaPx = me.clientY - startY.current;
      const deltaMm = deltaPx / scale;
      if (Math.abs(deltaMm) >= 0.3) {
        onResize(deltaMm);
        startY.current = me.clientY;
      }
    };

    const onUp = () => {
      dragging.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [onResize, scale]);

  return (
    <div className="docBandResize" onMouseDown={handleMouseDown} />
  );
}
