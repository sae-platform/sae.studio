import { useRef, useEffect, useState } from "react";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import { replaceVars } from "./canvas-utils";
import type { VariableDef } from "./types";

type BarcodeImageProps = {
  value: string;
  kind?: string;
  width: number;
  height: number;
  zoom: number;
  showText?: boolean;
  textPosition?: string;
  fontFamily?: string;
  fontSize?: number;
  textColor?: string;
  textAlign?: string;
  variables?: VariableDef[];
};

function QrImage({ value, width, height, zoom, variables = [] }: {
  value: string; kind?: string; width: number; height: number; zoom: number;
  variables?: VariableDef[];
}) {
  const [qrData, setQrData] = useState<string>("");
  useEffect(() => {
    if (!value) return;
    const displayValue = replaceVars(value, variables);
    QRCode.toDataURL(displayValue, {
      margin: 0,
      width: Math.round(Math.min(width, height) * zoom * 2),
      color: { dark: "#000000", light: "#ffffff00" },
    }).then((url) => setQrData(url)).catch(() => setQrData(""));
  }, [value, width, height, zoom]);
  return qrData ? (
    <img src={qrData} alt={value || ""} style={{ width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }} />
  ) : null;
}

export function BarcodeImage({
  value, kind, width, height, zoom, showText, textPosition,
  fontFamily, fontSize, textColor, textAlign, variables = [],
}: BarcodeImageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !value) return;

    const format = (kind || "CODE128").toUpperCase();
    const displayValue = replaceVars(value, variables);
    const scale = zoom * 2;

    if (format === "QR") {
      canvas.style.display = "none";
      return;
    }

    canvas.style.display = "";
    try {
      const fontSizePx = Math.max(8, Math.round((fontSize ?? 12) * zoom));
      JsBarcode(canvas, displayValue, {
        format,
        width: Math.max(1, Math.round(scale)),
        height: Math.max(20, Math.round(height * zoom)),
        displayValue: showText !== false,
        textPosition: textPosition || "bottom",
        textAlign: textAlign || "center",
        font: fontFamily || "monospace",
        fontSize: fontSizePx,
        fontOptions: "",
        margin: 0,
        background: "transparent",
        lineColor: textColor || "#000000",
      });
    } catch (e) {
      console.warn("Barcode render error:", e);
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.width = Math.max(100, width * scale);
        canvas.height = Math.max(30, height * zoom);
        ctx.fillStyle = "red";
        ctx.font = `${Math.round(10 * zoom)}px sans-serif`;
        ctx.fillText(`Error: ${displayValue}`, 5, 20);
      }
    }
  }, [value, kind, zoom, height, width, showText, textPosition, fontFamily, fontSize, textColor, textAlign, variables]);

  if ((kind || "CODE128").toUpperCase() === "QR") {
    return <QrImage value={value} kind={kind} width={width} height={height} zoom={zoom} variables={variables} />;
  }

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%", pointerEvents: "none" }} />;
}
