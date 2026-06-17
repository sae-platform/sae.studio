import type { CSSProperties } from "react";

export type ResizeDirection = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";

interface ResizeHandleProps {
  direction: ResizeDirection;
  onMouseDown: (e: React.MouseEvent, dir: ResizeDirection) => void;
}

const HANDLE_STYLES: Record<ResizeDirection, CSSProperties> = {
  n:  { top: -4,     left: "50%",  transform: "translateX(-50%)", cursor: "n-resize"  },
  ne: { top: -4,     right: -4,                                    cursor: "ne-resize" },
  e:  { top: "50%",  right: -4,    transform: "translateY(-50%)", cursor: "e-resize"  },
  se: { bottom: -4,  right: -4,                                    cursor: "se-resize" },
  s:  { bottom: -4,  left: "50%",  transform: "translateX(-50%)", cursor: "s-resize"  },
  sw: { bottom: -4,  left: -4,                                     cursor: "sw-resize" },
  w:  { top: "50%",  left: -4,     transform: "translateY(-50%)", cursor: "w-resize"  },
  nw: { top: -4,     left: -4,                                     cursor: "nw-resize" },
};

const ALL_DIRECTIONS: ResizeDirection[] = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];

interface ResizeHandlesProps {
  onResize: (e: React.MouseEvent, dir: ResizeDirection) => void;
}

export function ResizeHandles({ onResize }: ResizeHandlesProps) {
  return (
    <>
      {ALL_DIRECTIONS.map((dir) => (
        <div
          key={dir}
          className="docResizeHandle"
          style={{ position: "absolute", width: 8, height: 8, ...HANDLE_STYLES[dir] }}
          onMouseDown={(e) => { e.stopPropagation(); onResize(e, dir); }}
        />
      ))}
    </>
  );
}
