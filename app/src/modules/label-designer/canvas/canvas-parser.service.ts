import { n, toHexColor } from "@/modules/label-designer/object";

export type Unit = "mm" | "cm" | "in" | "pt";

export type Kind = "sae" | "glabels";

export type Obj = {
  id: string;
  xmlIndex: number | null;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  content: string;
  rotateDeg: number;
  scaleX: number;
  scaleY: number;
  skewX: number;
  skewY: number;
  groupId?: string;
  barcodeKind?: string;
  fillColor?: string;
  lineColor?: string;
  textColor?: string;
  textAlign?: string;
  lineWidth?: number;
  showText?: boolean;
  textPosition?: "top" | "bottom";
  fontFamily?: string;
  fontSize?: number;
  locked?: boolean;
  hidden?: boolean;
};

export type VariableDef = {
  name: string;
  type?: string;
  initial?: string;
  increment?: string;
  step?: number;
};

export type Parsed = {
  kind: Kind;
  widthPt: number;
  heightPt: number;
  objects: Obj[];
  variables: VariableDef[];
  xmlDocument: Document;
};

export function parse(xml: string): Parsed {
  const d = new DOMParser().parseFromString(xml, "application/xml");
  if (d.querySelector("parsererror")) throw new Error("XML invalido.");
  const root = d.documentElement.nodeName.toLowerCase();

  if (root === "saelabels") {
    const rect = d.documentElement.getElementsByTagName("label_rectangle")[0];
    const objects = Array.from(
      d.documentElement.getElementsByTagName("objects")[0]?.getElementsByTagName("object") ?? [],
    ).map((e, i) => ({
      id: `o-${i}`, xmlIndex: i,
      type: (e.getAttribute("type") ?? "text").toLowerCase(),
      x: n(e.getAttribute("x_pt"), 0), y: n(e.getAttribute("y_pt"), 0),
      w: n(e.getAttribute("w_pt"), 40), h: n(e.getAttribute("h_pt"), 20),
      content: e.getElementsByTagName("content")[0]?.textContent?.trim() ?? "",
      rotateDeg: n(e.getAttribute("rot_deg"), 0),
      scaleX: n(e.getAttribute("scale_x"), 1),
      scaleY: n(e.getAttribute("scale_y"), 1),
      skewX: n(e.getAttribute("skew_x"), 0),
      skewY: n(e.getAttribute("skew_y"), 0),
      barcodeKind: e.getAttribute("style")?.toUpperCase() ?? undefined,
      fillColor: toHexColor(e.getAttribute("fill_color") ?? e.getAttribute("color")),
      lineColor: toHexColor(e.getAttribute("line_color")),
      lineWidth: n(e.getAttribute("line_width"), 1),
      groupId: e.getAttribute("group_id") ?? undefined,
      showText: e.getAttribute("show_text") === "true",
      textPosition: (e.getAttribute("text_pos") as any) || "bottom",
    }));

    const variablesNode = d.documentElement.getElementsByTagName("variables")[0];
    const variables: VariableDef[] = [];
    if (variablesNode) {
      for (const v of Array.from(variablesNode.getElementsByTagName("variable"))) {
        variables.push({
          name: v.getAttribute("name") || "VAR",
          type: v.getAttribute("type") || "text",
          initial: v.getAttribute("initial") || "",
          increment: v.getAttribute("increment") || "never",
          step: Number(v.getAttribute("step")) || undefined,
        });
      }
    }

    return {
      kind: "sae",
      widthPt: n(rect?.getAttribute("width_pt"), 200),
      heightPt: n(rect?.getAttribute("height_pt"), 100),
      objects,
      variables,
      xmlDocument: d,
    };
  }

  if (root === "glabels-document" || root === "glabels-template" || root === "template") {
    const t = d.documentElement.nodeName === "Template"
      ? d.documentElement
      : d.documentElement.getElementsByTagName("Template")[0];
    const rect = t?.getElementsByTagName("Label-rectangle")[0];
    const objects = Array.from(d.documentElement.getElementsByTagName("Objects")[0]?.children ?? [])
      .filter((x) => x.nodeName.startsWith("Object-"))
      .map((e, i) => ({
        id: `o-${i}`, xmlIndex: i,
        type: e.nodeName.replace("Object-", "").toLowerCase(),
        x: n(e.getAttribute("x"), 0), y: n(e.getAttribute("y"), 0),
        w: n(e.getAttribute("w"), 40), h: n(e.getAttribute("h"), 20),
        content: e.getElementsByTagName("p")[0]?.textContent?.trim() ?? e.getAttribute("data") ?? "",
        rotateDeg: n(e.getAttribute("rot_deg"), 0),
        scaleX: n(e.getAttribute("scale_x"), 1),
        scaleY: n(e.getAttribute("scale_y"), 1),
        skewX: n(e.getAttribute("skew_x"), 0),
        skewY: n(e.getAttribute("skew_y"), 0),
        barcodeKind: e.getAttribute("style")?.toUpperCase() ?? undefined,
        fillColor: toHexColor(e.getAttribute("fill_color") ?? e.getAttribute("color")),
        lineColor: toHexColor(e.getAttribute("line_color")),
        lineWidth: n(e.getAttribute("line_width"), 1),
        groupId: e.getAttribute("group_id") ?? undefined,
        showText: e.getAttribute("text") === "true",
        textPosition: (e.getAttribute("text_pos") as any) || "bottom",
        fontFamily: e.getAttribute("font_family") || undefined,
        fontSize: e.getAttribute("font_size") ? n(e.getAttribute("font_size"), 10) : undefined,
      }));

    return {
      kind: "glabels",
      widthPt: n(rect?.getAttribute("width"), 200),
      heightPt: n(rect?.getAttribute("height"), 100),
      objects,
      variables: [],
      xmlDocument: d,
    };
  }

  throw new Error("Solo saelabels/glabels.");
}
