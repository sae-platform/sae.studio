import { pt, toAffine } from "@/modules/label-designer/object";
import type { Obj, VariableDef } from "./canvas-parser.service";

export type SerializeParams = {
  xmlDocument: Document;
  kind: string;
  metadata: {
    version: string;
    brand: string;
    description: string;
    part: string;
    size: string;
  };
  templateWidthPt: number;
  templateHeightPt: number;
  objects: Obj[];
  variables: VariableDef[];
};

export function serializeDocument(params: SerializeParams): string {
  const {
    xmlDocument, kind, metadata, templateWidthPt, templateHeightPt, objects, variables,
  } = params;
  const next = xmlDocument.cloneNode(true) as XMLDocument;

  if (kind === "sae") {
    next.documentElement.setAttribute("version", metadata.version || "1.0");
    const templateNode = next.documentElement.getElementsByTagName("template")[0];
    if (templateNode) {
      templateNode.setAttribute("brand", metadata.brand || "Custom");
      templateNode.setAttribute("description", metadata.description || "Etiqueta");
      templateNode.setAttribute("part", metadata.part || "P-1");
      templateNode.setAttribute("size", metadata.size || "custom");
    }
    const rectNode = next.documentElement.getElementsByTagName("label_rectangle")[0];
    if (rectNode) {
      rectNode.setAttribute("width_pt", pt(Math.max(1, templateWidthPt)));
      rectNode.setAttribute("height_pt", pt(Math.max(1, templateHeightPt)));
    }
    let node = next.documentElement.getElementsByTagName("objects")[0];
    if (!node) { node = next.createElement("objects"); next.documentElement.appendChild(node); }
    while (node.firstChild) node.removeChild(node.firstChild);

    for (const o of objects) {
      const e = next.createElement("object");
      e.setAttribute("type", o.type);
      e.setAttribute("x_pt", pt(o.x));
      e.setAttribute("y_pt", pt(o.y));
      e.setAttribute("w_pt", pt(o.w));
      e.setAttribute("h_pt", pt(o.h));

      const style = o.type === "barcode" ? (o.barcodeKind?.toLowerCase() || "code128") : "";
      e.setAttribute("style", style);

      if (o.type === "line") {
        e.setAttribute("dx_pt", pt(o.w));
        e.setAttribute("dy_pt", pt(o.h));
      } else {
        e.setAttribute("dx_pt", "0");
        e.setAttribute("dy_pt", "0");
      }

      e.setAttribute("color", o.lineColor || "#000000");
      e.setAttribute("show_text", o.showText ? "true" : "false");
      e.setAttribute("text_pos", o.textPosition || "bottom");
      e.setAttribute("checksum", "false");
      e.setAttribute("rot_deg", pt(o.rotateDeg));
      e.setAttribute("scale_x", pt(o.scaleX));
      e.setAttribute("scale_y", pt(o.scaleY));
      e.setAttribute("skew_x", pt(o.skewX));
      e.setAttribute("skew_y", pt(o.skewY));

      if (o.fillColor) e.setAttribute("color", o.fillColor);
      if (o.lineColor) e.setAttribute("line_color", o.lineColor);
      if (o.lineWidth) e.setAttribute("line_width", pt(o.lineWidth));
      if (o.groupId) e.setAttribute("group_id", o.groupId);

      const c = next.createElement("content");
      c.textContent = o.content;
      e.appendChild(c);
      node.appendChild(e);
    }

    let varsNode = next.documentElement.getElementsByTagName("variables")[0];
    if (!varsNode) {
      varsNode = next.createElement("variables");
      next.documentElement.appendChild(varsNode);
    }
    while (varsNode.firstChild) varsNode.removeChild(varsNode.firstChild);
    for (const v of variables) {
      const ve = next.createElement("variable");
      ve.setAttribute("name", v.name);
      if (v.type) ve.setAttribute("type", v.type);
      if (v.initial) ve.setAttribute("initial", v.initial);
      if (v.increment) ve.setAttribute("increment", v.increment);
      if (v.step !== undefined) ve.setAttribute("step", String(v.step));
      varsNode.appendChild(ve);
    }
  } else {
    next.documentElement.setAttribute("version", metadata.version || "4.0");
    const templateNode = next.documentElement.nodeName === "Template"
      ? next.documentElement
      : next.documentElement.getElementsByTagName("Template")[0];
    if (templateNode) {
      templateNode.setAttribute("brand", metadata.brand || "Custom");
      templateNode.setAttribute("description", metadata.description || "Etiqueta");
      templateNode.setAttribute("part", metadata.part || "P-1");
      templateNode.setAttribute("size", metadata.size || "custom");
    }
    const rectNode = templateNode?.getElementsByTagName("Label-rectangle")[0];
    if (rectNode) {
      rectNode.setAttribute("width", `${pt(Math.max(1, templateWidthPt))}pt`);
      rectNode.setAttribute("height", `${pt(Math.max(1, templateHeightPt))}pt`);
    }
    let node = next.documentElement.getElementsByTagName("Objects")[0];
    if (!node) { node = next.createElement("Objects"); next.documentElement.appendChild(node); }
    while (node.firstChild) node.removeChild(node.firstChild);

    for (const o of objects) {
      const tag = o.type === "text" ? "Object-text"
        : o.type === "barcode" ? "Object-barcode"
        : o.type === "box" ? "Object-box"
        : o.type === "line" ? "Object-line"
        : o.type === "ellipse" ? "Object-ellipse"
        : o.type === "path" ? "Object-path"
        : "Object-image";
      const e = next.createElement(tag);
      e.setAttribute("x", `${pt(o.x)}pt`); e.setAttribute("y", `${pt(o.y)}pt`);
      e.setAttribute("w", `${pt(o.w)}pt`); e.setAttribute("h", `${pt(o.h)}pt`);
      const m = toAffine(o);
      e.setAttribute("a0", pt(m.a)); e.setAttribute("a1", pt(m.b));
      e.setAttribute("a2", pt(m.c)); e.setAttribute("a3", pt(m.d));
      e.setAttribute("a4", "0"); e.setAttribute("a5", "0");
      e.setAttribute("lock_aspect_ratio", o.type === "image" ? "true" : "false");
      e.setAttribute("shadow", "false");
      e.setAttribute("rot_deg", pt(o.rotateDeg));
      e.setAttribute("scale_x", pt(o.scaleX)); e.setAttribute("scale_y", pt(o.scaleY));
      e.setAttribute("skew_x", pt(o.skewX)); e.setAttribute("skew_y", pt(o.skewY));
      e.setAttribute("fill_color", o.fillColor || "none");
      e.setAttribute("line_color", o.lineColor || "none");
      if (o.lineWidth) e.setAttribute("line_width", pt(o.lineWidth));
      if (o.groupId) e.setAttribute("group_id", o.groupId);

      if (o.type === "text") {
        e.setAttribute("color", o.fillColor || "#000000");
        e.setAttribute("font_family", o.fontFamily || "Sans");
        e.setAttribute("font_size", String(o.fontSize ?? 10));
        e.setAttribute("align", "left");
        e.setAttribute("valign", "top");
        const p = next.createElement("p");
        p.textContent = o.content || "${texto}";
        e.appendChild(p);
      }
      if (o.type === "barcode") {
        e.setAttribute("style", o.barcodeKind?.toLowerCase() || "code128");
        e.setAttribute("data", o.content || "${barcode}");
        e.setAttribute("text", o.showText ? "true" : "false");
        e.setAttribute("text_pos", o.textPosition || "bottom");
        e.setAttribute("checksum", "false");
      }
      if (o.type === "box" || o.type === "ellipse") {
        if (!o.lineWidth) e.setAttribute("line_width", "1pt");
      }
      if (o.type === "line") {
        e.setAttribute("dx", `${pt(o.w)}pt`);
        e.setAttribute("dy", "0pt");
        if (!o.lineWidth) e.setAttribute("line_width", "1pt");
      }
      if (o.type === "image") e.setAttribute("src", o.content ?? "");
      if (o.type === "path") e.setAttribute("data", o.content ?? "");
      node.appendChild(e);
    }
  }

  return new XMLSerializer().serializeToString(next);
}
