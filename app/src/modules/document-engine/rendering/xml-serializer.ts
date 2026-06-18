// ============================================================
// SAE Document Engine — XML Serializer
// Bidirectional: parseXml ↔ serializeXml
// ============================================================

import type { SaeDocumentModel, DocumentMetadata, DataSourceDef, AssetDef, VariableDef } from "../models/document";
import type { PageDef, PageUnit } from "../models/page";
import { PAGE_PRESETS } from "../models/page";
import type { BandDef, BandType } from "../models/band";
import type { LayerDef } from "../models/layer";
import type { DocumentElement, TableColumnDef } from "../models/elements";
import type { DocumentTheme, ElementStyle } from "../models/theme";

// ── PARSE ─────────────────────────────────────────────────────

function attr(el: Element, name: string): string {
  return el.getAttribute(name) ?? "";
}

function attrNum(el: Element, name: string, fallback: number): number {
  const v = el.getAttribute(name);
  if (v === null || v === "") return fallback;
  const n = parseFloat(v);
  return isNaN(n) ? fallback : n;
}

function attrBool(el: Element, name: string, fallback = false): boolean {
  const v = el.getAttribute(name);
  if (v === null) return fallback;
  return v === "true" || v === "1";
}

function children(el: Element, tag: string): Element[] {
  return Array.from(el.children).filter((c) => c.tagName === tag);
}

function parseMetadata(el: Element | null): DocumentMetadata | undefined {
  if (!el) return undefined;
  return {
    title: attr(el, "title") || undefined,
    author: attr(el, "author") || undefined,
    subject: attr(el, "subject") || undefined,
    keywords: attr(el, "keywords") || undefined,
    created: attr(el, "created") || undefined,
    version: attr(el, "version") || "2.0",
  };
}

function parseDatasources(el: Element | null): DataSourceDef[] {
  if (!el) return [];
  return children(el, "datasource").map((ds) => ({
    name: attr(ds, "name"),
    type: attr(ds, "type") || "manual",
    columns: attr(ds, "columns") ? attr(ds, "columns").split(",").map((s) => s.trim()) : [],
    sampleData: attr(ds, "sampleData") || undefined,
  }));
}

function parseAssets(el: Element | null): AssetDef[] {
  if (!el) return [];
  return children(el, "asset").map((a) => ({
    id: attr(a, "id") || crypto.randomUUID(),
    name: attr(a, "name"),
    type: attr(a, "type") || "image",
    source: attr(a, "source"),
  }));
}

function parseVariables(el: Element | null): VariableDef[] {
  if (!el) return [];
  return children(el, "variable").map((v) => ({
    name: attr(v, "name"),
    type: attr(v, "type") || "text",
    initial: attr(v, "initial") || undefined,
    increment: attr(v, "increment") || undefined,
    step: attrNum(v, "step", 1) || undefined,
  }));
}

function parseLayers(el: Element | null): LayerDef[] {
  if (!el) return [{ id: "default", name: "Content", visible: true, locked: false, zIndex: 0 }];
  const layers = children(el, "layer").map((l, i) => ({
    id: attr(l, "id") || crypto.randomUUID(),
    name: attr(l, "name") || `Layer ${i + 1}`,
    visible: attrBool(l, "visible", true),
    locked: attrBool(l, "locked", false),
    zIndex: attrNum(l, "zIndex", i),
  }));
  return layers.length > 0 ? layers : [{ id: "default", name: "Content", visible: true, locked: false, zIndex: 0 }];
}

function parseElement(node: Element): DocumentElement | null {
  const id = attr(node, "id") || crypto.randomUUID();
  const base = {
    id,
    x: attrNum(node, "x", 0),
    y: attrNum(node, "y", 0),
    width: node.hasAttribute("width") ? attrNum(node, "width", 60) : undefined,
    height: node.hasAttribute("height") ? attrNum(node, "height", 10) : undefined,
    showIf: attr(node, "showIf") || undefined,
    layerId: attr(node, "layerId") || undefined,
    locked: attrBool(node, "locked"),
    hidden: attrBool(node, "hidden"),
    preset: attr(node, "preset") || undefined,
    anchor: attr(node, "anchor") ? attr(node, "anchor").split(",") as any[] : undefined,
  };

  switch (node.tagName) {
    case "text":
      return {
        ...base, type: "text",
        content: node.textContent?.trim() ?? "",
        font: attr(node, "font") || undefined,
        size: node.hasAttribute("size") ? attrNum(node, "size", 10) : undefined,
        bold: attrBool(node, "bold"),
        italic: attrBool(node, "italic"),
        underline: attrBool(node, "underline"),
        align: (attr(node, "align") as any) || undefined,
        color: attr(node, "color") || undefined,
      };

    case "image":
      return {
        ...base, type: "image",
        source: attr(node, "source"),
        fit: (attr(node, "fit") as any) || undefined,
      };

    case "line":
      return {
        ...base, type: "line",
        x1: attrNum(node, "x1", base.x),
        y1: attrNum(node, "y1", base.y),
        x2: attrNum(node, "x2", base.x + 100),
        y2: attrNum(node, "y2", base.y),
        color: attr(node, "color") || undefined,
        lineWidth: node.hasAttribute("lineWidth") ? attrNum(node, "lineWidth", 1) : undefined,
      };

    case "rectangle":
      return {
        ...base, type: "rectangle",
        fillColor: attr(node, "fillColor") || undefined,
        borderColor: attr(node, "borderColor") || undefined,
        borderWidth: node.hasAttribute("borderWidth") ? attrNum(node, "borderWidth", 1) : undefined,
        borderRadius: node.hasAttribute("borderRadius") ? attrNum(node, "borderRadius", 0) : undefined,
      };

    case "ellipse":
      return {
        ...base, type: "ellipse",
        fillColor: attr(node, "fillColor") || undefined,
        borderColor: attr(node, "borderColor") || undefined,
        borderWidth: node.hasAttribute("borderWidth") ? attrNum(node, "borderWidth", 1) : undefined,
      };

    case "barcode":
      return {
        ...base, type: "barcode",
        value: attr(node, "value"),
        kind: (attr(node, "kind") as any) || undefined,
        showText: attrBool(node, "showText", true),
      };

    case "qr":
      return {
        ...base, type: "qr",
        value: attr(node, "value"),
        size: node.hasAttribute("size") ? attrNum(node, "size", 30) : undefined,
        errorLevel: (attr(node, "errorLevel") as any) || undefined,
      };

    case "table": {
      const columns: TableColumnDef[] = children(node, "column").map((c) => ({
        field: attr(c, "field"),
        header: attr(c, "header") || undefined,
        width: attr(c, "width") || undefined,
        align: (attr(c, "align") as any) || undefined,
        format: attr(c, "format") || undefined,
      }));
      return {
        ...base, type: "table",
        source: attr(node, "source"),
        columns,
        showHeader: attrBool(node, "showHeader", true),
        stripeColor: attr(node, "stripeColor") || undefined,
        headerColor: attr(node, "headerColor") || undefined,
        headerTextColor: attr(node, "headerTextColor") || undefined,
      };
    }

    case "total":
      return {
        ...base, type: "total",
        label: attr(node, "label") || undefined,
        field: attr(node, "field"),
        format: attr(node, "format") || undefined,
        font: attr(node, "font") || undefined,
        size: node.hasAttribute("size") ? attrNum(node, "size", 10) : undefined,
        bold: attrBool(node, "bold"),
        align: (attr(node, "align") as any) || undefined,
        color: attr(node, "color") || undefined,
      };

    case "subtotal":
      return {
        ...base, type: "subtotal",
        label: attr(node, "label") || undefined,
        field: attr(node, "field"),
        format: attr(node, "format") || undefined,
        font: attr(node, "font") || undefined,
        size: node.hasAttribute("size") ? attrNum(node, "size", 10) : undefined,
        bold: attrBool(node, "bold"),
        align: (attr(node, "align") as any) || undefined,
        color: attr(node, "color") || undefined,
      };

    case "variable":
      return {
        ...base, type: "variable",
        variableName: attr(node, "variableName"),
        font: attr(node, "font") || undefined,
        size: node.hasAttribute("size") ? attrNum(node, "size", 10) : undefined,
        bold: attrBool(node, "bold"),
        align: (attr(node, "align") as any) || undefined,
        color: attr(node, "color") || undefined,
      };

    case "panel":
      return {
        ...base, type: "panel",
        elements: parseElements(node),
        fillColor: attr(node, "fillColor") || undefined,
        borderColor: attr(node, "borderColor") || undefined,
        borderWidth: node.hasAttribute("borderWidth") ? attrNum(node, "borderWidth", 1) : undefined,
        borderRadius: node.hasAttribute("borderRadius") ? attrNum(node, "borderRadius", 0) : undefined,
      };

    case "group":
      return {
        ...base, type: "group",
        elements: parseElements(node),
      };

    case "if": {
      const thenNode = children(node, "then")[0];
      const elseNode = children(node, "else")[0];
      return {
        ...base, type: "if",
        condition: attr(node, "condition"),
        thenElements: thenNode ? parseElements(thenNode) : parseElements(node),
        elseElements: elseNode ? parseElements(elseNode) : undefined,
      };
    }

    case "repeat":
      return {
        ...base, type: "repeat",
        source: attr(node, "source"),
        elements: parseElements(node),
        direction: (attr(node, "direction") as any) || undefined,
        gap: node.hasAttribute("gap") ? attrNum(node, "gap", 0) : undefined,
      };

    case "pagebreak":
      return { ...base, type: "pagebreak" };

    case "sectionbreak":
      return { ...base, type: "sectionbreak" };

    default:
      return null;
  }
}

const ELEMENT_TAGS = new Set([
  "text", "image", "line", "rectangle", "ellipse",
  "barcode", "qr", "table",
  "total", "subtotal", "variable",
  "panel", "group", "if", "repeat",
  "pagebreak", "sectionbreak",
]);

function parseElements(container: Element): DocumentElement[] {
  return Array.from(container.children)
    .filter((c) => ELEMENT_TAGS.has(c.tagName))
    .map(parseElement)
    .filter((e): e is DocumentElement => e !== null);
}

function parseBand(el: Element | null, type: BandType): BandDef | undefined {
  if (!el) return undefined;
  return {
    id: attr(el, "id") || crypto.randomUUID(),
    type,
    height: attrNum(el, "height", type === "header" ? 40 : type === "footer" ? 35 : 180),
    canGrow: attrBool(el, "canGrow", type === "body"),
    canShrink: attrBool(el, "canShrink", false),
    elements: parseElements(el),
  };
}

function parsePage(el: Element): PageDef {
  const layersEl = children(el, "layers")[0] ?? null;
  return {
    id: attr(el, "id") || crypto.randomUUID(),
    width: attrNum(el, "width", 210),
    height: attrNum(el, "height", 297),
    unit: (attr(el, "unit") as PageUnit) || "mm",
    orientation: (attr(el, "orientation") as "portrait" | "landscape") || "portrait",
    marginTop: attrNum(el, "marginTop", 15),
    marginBottom: attrNum(el, "marginBottom", 15),
    marginLeft: attrNum(el, "marginLeft", 12),
    marginRight: attrNum(el, "marginRight", 12),
    header: parseBand(children(el, "header")[0] ?? null, "header"),
    body:   parseBand(children(el, "body")[0] ?? null, "body"),
    footer: parseBand(children(el, "footer")[0] ?? null, "footer"),
    layers: parseLayers(layersEl),
  };
}

// ── Theme parsers ────────────────────────────────────────────

function parseStyle(node: Element): ElementStyle {
  const style: ElementStyle = {};
  const v = (key: string) => attr(node, key) || undefined;
  const f = v("fontFamily"); if (f) style.fontFamily = f;
  const fs = node.hasAttribute("fontSize") ? attrNum(node, "fontSize", NaN) : NaN;
  if (!isNaN(fs)) style.fontSize = fs;
  const fw = v("fontWeight") as ElementStyle["fontWeight"];
  if (fw) style.fontWeight = fw;
  const fst = v("fontStyle") as ElementStyle["fontStyle"];
  if (fst) style.fontStyle = fst;
  const c = v("color"); if (c) style.color = c;
  const bg = v("backgroundColor"); if (bg) style.backgroundColor = bg;
  const bc = v("borderColor"); if (bc) style.borderColor = bc;
  if (node.hasAttribute("borderWidth")) style.borderWidth = attrNum(node, "borderWidth", 0);
  if (node.hasAttribute("borderRadius")) style.borderRadius = attrNum(node, "borderRadius", 0);
  const al = v("alignment") as ElementStyle["alignment"];
  if (al) style.alignment = al;
  if (node.hasAttribute("lineHeight")) style.lineHeight = attrNum(node, "lineHeight", 0);
  return style;
}

function parseTheme(el: Element | null): DocumentTheme | undefined {
  if (!el) return undefined;
  const baseStyle = parseStyle(children(el, "base")[0] ?? null as any);
  const presets: Record<string, ElementStyle> = {};
  for (const p of children(el, "preset")) {
    const name = attr(p, "name");
    if (!name) continue;
    presets[name] = parseStyle(p);
  }
  return {
    id: attr(el, "id") || crypto.randomUUID(),
    name: attr(el, "name") || "Sin nombre",
    description: attr(el, "description") || undefined,
    base: baseStyle,
    presets,
  };
}

// ── Runtime format parser ─────────────────────────────────

function parseRuntimeDocument(root: Element): SaeDocumentModel {
  const setup = children(root, "setup")[0] ?? null;
  const pageSize = attr(setup!, "pageSize") || "A4";
  const orientation = attr(setup!, "orientation") || "portrait";
  const marginTop = attrNum(setup!, "marginTop", 15);
  const marginBottom = attrNum(setup!, "marginBottom", 15);
  const marginLeft = attrNum(setup!, "marginLeft", 12);
  const marginRight = attrNum(setup!, "marginRight", 12);

  // Resolve page dimensions from preset name or parse "WxH" string
  let width = 210, height = 297;
  const preset = PAGE_PRESETS[pageSize];
  if (preset) {
    width = preset.width;
    height = preset.height;
  } else {
    const match = pageSize.match(/^(\d+\.?\d*)x(\d+\.?\d*)$/i);
    if (match) { width = parseFloat(match[1]); height = parseFloat(match[2]); }
  }

  // Convert runtime elements to design-time elements
  function parseRuntimeElements(el: Element): DocumentElement[] {
    const elements: DocumentElement[] = [];
    let y = 0;
    for (const child of Array.from(el.children)) {
      const tag = child.tagName.toLowerCase();
      if (tag === "text") {
        const content = child.textContent?.trim() ?? "";
        elements.push({
          id: crypto.randomUUID(),
          type: "text",
          x: 10, y,
          width: width - marginLeft - marginRight - 20,
          height: attrNum(child, "height", 8),
          content,
          font: "Arial",
          size: attrNum(child, "size", 10),
          bold: attrBool(child, "bold"),
          align: (attr(child, "align") as any) || "left",
          color: attr(child, "color") || "#1e293b",
        });
        y += 5 + (attrNum(child, "size", 10) * 0.4);
      } else if (tag === "spacer") {
        y += attrNum(child, "height", 5);
      } else if (tag === "line") {
        elements.push({
          id: crypto.randomUUID(),
          type: "line",
          x: 10, y, x1: 10, y1: y,
          x2: width - marginLeft - marginRight - 10, y2: y,
          width: width - marginLeft - marginRight - 20,
          height: 2,
          color: "#cbd5e1",
          lineWidth: 1,
        });
        y += 3;
      } else if (tag === "table") {
        const cols = Array.from(child.children).filter(c => c.tagName.toLowerCase() === "column").map(c => ({
          field: attr(c, "field") || "",
          header: attr(c, "header") || "",
          width: attr(c, "width") || undefined,
          align: (attr(c, "align") as any) || "left",
        }));
        elements.push({
          id: crypto.randomUUID(),
          type: "table",
          x: 10, y,
          width: width - marginLeft - marginRight - 20,
          height: 40,
          source: attr(child, "source") || "ITEMS",
          columns: cols,
          showHeader: attrBool(child, "showHeader", true),
        });
        y += 45;
      } else if (tag === "image") {
        elements.push({
          id: crypto.randomUUID(),
          type: "image",
          x: 10, y,
          width: attrNum(child, "width", 30),
          height: attrNum(child, "height", 30),
          source: attr(child, "source") || "logo.png",
        });
        y += attrNum(child, "height", 30) + 5;
      } else if (tag === "qr") {
        const sz = attrNum(child, "size", 30);
        elements.push({
          id: crypto.randomUUID(),
          type: "qr",
          x: 10, y,
          width: sz, height: sz,
          size: sz,
          value: attr(child, "content") || child.textContent?.trim() || "",
        });
        y += sz + 5;
      } else if (tag === "total" || tag === "subtotal") {
        elements.push({
          id: crypto.randomUUID(),
          type: tag as any,
          x: 10, y,
          width: width - marginLeft - marginRight - 20,
          height: 8,
          label: attr(child, "label") || "",
          field: (attr(child, "value") || "").replace(/^\$\{/, "").replace(/\}$/, ""),
          bold: attrBool(child, "bold", tag === "total"),
          align: (attr(child, "align") as any) || "right",
          size: attrNum(child, "size", 10),
        });
        y += 10;
      }
    }
    return elements;
  }

  const headerElements = parseRuntimeElements(children(root, "header")[0] ?? root);
  const bodyElements   = parseRuntimeElements(children(root, "body")[0] ?? root);
  const footerElements = parseRuntimeElements(children(root, "footer")[0] ?? root);

  const page: PageDef = {
    id: crypto.randomUUID(),
    width, height,
    unit: "mm",
    orientation: orientation as any,
    marginTop, marginBottom, marginLeft, marginRight,
    layers: [{ id: "default", name: "Content", visible: true, locked: false, zIndex: 0 }],
    header: { id: crypto.randomUUID(), type: "header", height: Math.max(40, headerElements.length * 15), canGrow: false, canShrink: false, elements: headerElements },
    body:   { id: crypto.randomUUID(), type: "body",   height: Math.max(200, bodyElements.length * 15), canGrow: true, canShrink: false, elements: bodyElements },
    footer: { id: crypto.randomUUID(), type: "footer", height: Math.max(35, footerElements.length * 15), canGrow: false, canShrink: false, elements: footerElements },
  };

  return {
    version: attr(root, "version") || "2.0",
    metadata: { title: attr(setup!, "pageSize") || "Documento", version: "2.0" },
    datasources: [],
    assets: [],
    variables: [],
    pages: [page],
  };
}

export function parseXml(xml: string): SaeDocumentModel | null {
  try {
    const parser = new DOMParser();
    const dom = parser.parseFromString(xml.trim(), "application/xml");
    if (dom.querySelector("parsererror")) return null;
    const root = dom.documentElement;
    if (!root || root.tagName !== "saedocument") return null;

    const designPages = children(root, "page");
    if (designPages.length > 0) {
      // Design-time format: <page> elements
      return {
        version: attr(root, "version") || "2.0",
        metadata: parseMetadata(children(root, "metadata")[0] ?? null),
        datasources: parseDatasources(children(root, "datasources")[0] ?? null),
        assets: parseAssets(children(root, "assets")[0] ?? null),
        variables: parseVariables(children(root, "variables")[0] ?? null),
        pages: designPages.map(parsePage),
        embeddedTheme: parseTheme(children(root, "theme")[0] ?? null),
      };
    }

    // Runtime format: <setup> + flat <header>/<body>/<footer>
    return parseRuntimeDocument(root);
  } catch {
    return null;
  }
}

// ── SERIALIZE ─────────────────────────────────────────────────

function setAttrs(el: Element, attrs: Record<string, string | number | boolean | undefined | null>): void {
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === "" || v === false) continue;
    el.setAttribute(k, String(v));
  }
}

function serializeElement(doc: Document, el: DocumentElement): Element {
  const node = doc.createElement(el.type);
  const base: Record<string, unknown> = {
    id: el.id,
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
    showIf: el.showIf,
    layerId: el.layerId,
    lock: el.locked || undefined,
    hidden: el.hidden || undefined,
    preset: el.preset || undefined,
    anchor: el.anchor?.join(",") || undefined,
  };
  setAttrs(node, base as any);

  switch (el.type) {
    case "text":
      setAttrs(node, { font: el.font, size: el.size, bold: el.bold || undefined, italic: el.italic || undefined, underline: el.underline || undefined, align: el.align, color: el.color });
      node.textContent = el.content;
      break;
    case "image":
      setAttrs(node, { source: el.source, fit: el.fit });
      break;
    case "line":
      setAttrs(node, { x1: el.x1, y1: el.y1, x2: el.x2, y2: el.y2, color: el.color, lineWidth: el.lineWidth });
      break;
    case "rectangle":
      setAttrs(node, { fillColor: el.fillColor, borderColor: el.borderColor, borderWidth: el.borderWidth, borderRadius: el.borderRadius });
      break;
    case "ellipse":
      setAttrs(node, { fillColor: el.fillColor, borderColor: el.borderColor, borderWidth: el.borderWidth });
      break;
    case "barcode":
      setAttrs(node, { value: el.value, kind: el.kind, showText: el.showText });
      break;
    case "qr":
      setAttrs(node, { value: el.value, size: el.size, errorLevel: el.errorLevel });
      break;
    case "table":
      setAttrs(node, { source: el.source, showHeader: el.showHeader, stripeColor: el.stripeColor, headerColor: el.headerColor, headerTextColor: el.headerTextColor });
      for (const col of el.columns) {
        const colNode = doc.createElement("column");
        setAttrs(colNode, { field: col.field, header: col.header, width: col.width, align: col.align, format: col.format });
        node.appendChild(colNode);
      }
      break;
    case "total":
    case "subtotal":
      setAttrs(node, { label: el.label, field: el.field, format: el.format, font: el.font, size: el.size, bold: el.bold || undefined, align: el.align, color: el.color });
      break;
    case "variable":
      setAttrs(node, { variableName: el.variableName, font: el.font, size: el.size, bold: el.bold || undefined, align: el.align, color: el.color });
      break;
    case "panel":
      setAttrs(node, { fillColor: el.fillColor, borderColor: el.borderColor, borderWidth: el.borderWidth, borderRadius: el.borderRadius });
      for (const child of el.elements) node.appendChild(serializeElement(doc, child));
      break;
    case "group":
      for (const child of el.elements) node.appendChild(serializeElement(doc, child));
      break;
    case "if": {
      node.setAttribute("condition", el.condition);
      const thenNode = doc.createElement("then");
      for (const child of el.thenElements) thenNode.appendChild(serializeElement(doc, child));
      node.appendChild(thenNode);
      if (el.elseElements?.length) {
        const elseNode = doc.createElement("else");
        for (const child of el.elseElements) elseNode.appendChild(serializeElement(doc, child));
        node.appendChild(elseNode);
      }
      break;
    }
    case "repeat":
      setAttrs(node, { source: el.source, direction: el.direction, gap: el.gap });
      for (const child of el.elements) node.appendChild(serializeElement(doc, child));
      break;
  }
  return node;
}

function serializeBand(doc: Document, band: BandDef): Element {
  const el = doc.createElement(band.type);
  setAttrs(el, { id: band.id, height: band.height, canGrow: band.canGrow || undefined, canShrink: band.canShrink || undefined });
  for (const item of band.elements) el.appendChild(serializeElement(doc, item));
  return el;
}

function serializePage(doc: Document, page: PageDef): Element {
  const el = doc.createElement("page");
  setAttrs(el, { id: page.id, width: page.width, height: page.height, unit: page.unit,
    orientation: page.orientation !== "portrait" ? page.orientation : undefined,
    marginTop: page.marginTop, marginBottom: page.marginBottom,
    marginLeft: page.marginLeft, marginRight: page.marginRight });

  // Layers
  if (page.layers.length > 0) {
    const layersEl = doc.createElement("layers");
    for (const layer of page.layers) {
      const l = doc.createElement("layer");
      setAttrs(l, { id: layer.id, name: layer.name, visible: layer.visible, locked: layer.locked || undefined, zIndex: layer.zIndex });
      layersEl.appendChild(l);
    }
    el.appendChild(layersEl);
  }

  if (page.header) el.appendChild(serializeBand(doc, page.header));
  if (page.body)   el.appendChild(serializeBand(doc, page.body));
  if (page.footer) el.appendChild(serializeBand(doc, page.footer));
  return el;
}

function serializeTheme(doc: Document, theme: DocumentTheme): Element {
  const el = doc.createElement("theme");
  setAttrs(el, { id: theme.id, name: theme.name, description: theme.description });

  const baseEl = doc.createElement("base");
  setAttrs(baseEl, theme.base as any);
  el.appendChild(baseEl);

  for (const [name, style] of Object.entries(theme.presets)) {
    const p = doc.createElement("preset");
    p.setAttribute("name", name);
    setAttrs(p, style as any);
    el.appendChild(p);
  }

  return el;
}

export function serializeXml(model: SaeDocumentModel): string {
  const doc = new DOMParser().parseFromString('<saedocument/>', "application/xml");
  const root = doc.documentElement;
  root.setAttribute("version", model.version);

  // Metadata
  const meta = doc.createElement("metadata");
  if (model.metadata) setAttrs(meta, model.metadata as any);
  root.appendChild(meta);

  // Datasources
  const ds = doc.createElement("datasources");
  for (const d of model.datasources) {
    const n = doc.createElement("datasource");
    setAttrs(n, { name: d.name, type: d.type, columns: d.columns.join(","), sampleData: d.sampleData });
    ds.appendChild(n);
  }
  root.appendChild(ds);

  // Assets
  const assets = doc.createElement("assets");
  for (const a of model.assets) {
    const n = doc.createElement("asset");
    setAttrs(n, { id: a.id, name: a.name, type: a.type, source: a.source });
    assets.appendChild(n);
  }
  root.appendChild(assets);

  // Variables
  const vars = doc.createElement("variables");
  for (const v of model.variables) {
    const n = doc.createElement("variable");
    setAttrs(n, { name: v.name, type: v.type, initial: v.initial, increment: v.increment, step: v.step });
    vars.appendChild(n);
  }
  root.appendChild(vars);

  // Theme
  if (model.embeddedTheme) {
    root.appendChild(serializeTheme(doc, model.embeddedTheme));
  }

  // Pages
  for (const page of model.pages) root.appendChild(serializePage(doc, page));

  const raw = new XMLSerializer().serializeToString(doc);
  // Pretty-print minimally: insert newlines between top-level children
  return raw
    .replace(/><(metadata|datasources|assets|variables|theme|page)/g, ">\n  <$1")
    .replace(/<\/(metadata|datasources|assets|variables|theme|page)>/g, "</$1>\n");
}

/** Round-trip: parse → serialize. Returns null if parse fails. */
export function roundTrip(xml: string): string | null {
  const model = parseXml(xml);
  if (!model) return null;
  return serializeXml(model);
}
