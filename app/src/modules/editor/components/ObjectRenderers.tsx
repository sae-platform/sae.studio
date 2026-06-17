import type { RendererProps } from "../object-registry/types";
import { BarcodeImage, replaceVars } from "@/modules/label-designer/object";

function renderMarkdown(text: string, baseFontSize: number, zoom: number): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];

  for (let li = 0; li < lines.length; li++) {
    if (li > 0) nodes.push(<br key={`br-${li}`} />);

    const line = lines[li];
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      const sizes = [1.5, 1.3, 1.15, 1.05];
      const weights = [800, 800, 700, 700];
      nodes.push(
        <span key={`h-${li}`} style={{
          fontSize: `${Math.max(8, baseFontSize * (sizes[level - 1] ?? 1))}px`,
          fontWeight: weights[level - 1] ?? 700,
          display: "block",
          lineHeight: 1.25,
        }}>
          {parseInlineFormatting(content)}
        </span>
      );
      continue;
    }

    nodes.push(parseInlineFormatting(line));
  }

  return nodes;
}

function parseInlineFormatting(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*\*([^*]+)\*\*\*|\*\*([^*]+)\*\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let pi = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[1].startsWith("***")) {
      parts.push(
        <span key={pi++} style={{ fontWeight: "bold", textShadow: "0px 0px 0.6px currentColor" }}>
          {match[2]}
        </span>
      );
    } else {
      parts.push(<strong key={pi++}>{match[3]}</strong>);
    }
    lastIndex = match.index + match[1].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length > 0 ? parts : [text];
}

export function TextRenderer({ obj, zoom, variables = [] }: RendererProps) {
  const raw = (obj.content as string) || "${texto}";
  const resolved = replaceVars(raw, variables as any);
  const baseFontSize = Math.max(6, ((obj.fontSize as number) ?? 10) * zoom);

  return (
    <div style={{
      width: "100%", height: "100%", overflow: "hidden",
      display: "flex", alignItems: "flex-start",
      fontSize: `${baseFontSize}px`,
      lineHeight: 1.2, color: (obj.lineColor as string) || "#000",
      fontFamily: (obj.fontFamily as string) || "sans-serif",
      fontWeight: "normal", padding: "1px 2px",
      boxSizing: "border-box", whiteSpace: "pre-wrap",
      wordBreak: "break-word", pointerEvents: "none", userSelect: "none",
    }}>
      {renderMarkdown(resolved, baseFontSize, zoom)}
    </div>
  );
}

export function BarcodeRenderer({ obj, zoom, variables = [] }: RendererProps) {
  return (
    <div className="barcodeViz" style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <BarcodeImage
        value={(obj.content as string) || "123456"}
        kind={obj.barcodeKind as string}
        width={obj.w}
        height={obj.h}
        zoom={zoom}
        showText={obj.showText as boolean}
        textPosition={obj.textPosition as string}
        fontFamily={obj.fontFamily as string}
        fontSize={obj.fontSize as number}
        textColor={obj.textColor as string}
        textAlign={obj.textAlign as string}
        variables={variables as any}
      />
    </div>
  );
}

export function ImageRenderer({ obj }: RendererProps) {
  const content = obj.content as string;
  return content ? (
    <img src={content} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }} />
  ) : (
    <div className="imgPlaceholder">Imagen</div>
  );
}

export function LineRenderer({ obj }: RendererProps) {
  return (
    <div className="lineViz" style={{ width: "100%", height: "100%", background: (obj.lineColor as string) || "currentColor" }} />
  );
}

export function PathRenderer({ obj, zoom }: RendererProps) {
  return (
    <svg viewBox="0 0 24 24" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
      <path
        d={obj.content as string}
        fill={(obj.fillColor as string) || "transparent"}
        stroke={(obj.lineColor as string) || "black"}
        strokeWidth={obj.lineWidth ? (obj.lineWidth as number) * (24 / Math.max(obj.w, obj.h)) : 0}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function BoxRenderer({ obj, zoom }: RendererProps) {
  return (
    <div style={{
      width: "100%", height: "100%",
      background: (obj.fillColor as string) || "transparent",
      border: ((obj.lineWidth as number) ?? 1) > 0 ? `${((obj.lineWidth as number) ?? 1) * zoom}px solid ${(obj.lineColor as string) || "black"}` : "none",
      borderRadius: obj.type === "ellipse" ? "50%" : "0",
      boxSizing: "border-box",
    }} />
  );
}
