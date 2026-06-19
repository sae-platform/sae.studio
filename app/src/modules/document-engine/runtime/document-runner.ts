// ============================================================
// SAE Document Engine — Document Runner
// Evaluates expressions, expands tables, filters conditions
// ============================================================

import type { SaeDocumentModel, DataSourceDef } from "../models/document";
import type { PageDef } from "../models/page";
import type { BandDef } from "../models/band";
import type { DocumentElement, ComponentDef } from "../models/elements";
import { resolveTemplate, evaluateCondition, formatValue } from "../expressions";

// ── Preview Context ───────────────────────────────────────────

export interface PreviewContext {
  /** Flat key-value sample data, e.g. { "Cliente.Nombre": "Alejandro" } */
  sampleData: Record<string, unknown>;
  /** Named datasource records for table expansion */
  datasources: Record<string, Record<string, unknown>[]>;
  /** Variable values */
  variables: Record<string, unknown>;
  /** Component library for include resolution */
  componentLibrary?: ComponentDef[];
}

function buildContext(ctx: PreviewContext): Record<string, unknown> {
  return { ...ctx.sampleData, ...ctx.variables };
}

function expandDotPaths(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...data };
  for (const [key, value] of Object.entries(data)) {
    if (key.includes(".")) {
      const parts = key.split(".");
      let cur: Record<string, unknown> = result;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!cur[parts[i]]) cur[parts[i]] = {};
        cur = cur[parts[i]] as Record<string, unknown>;
      }
      cur[parts[parts.length - 1]] = value;
    }
  }
  return result;
}

// ── Rendered types ─────────────────────────────────────────────

export interface RenderedElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  /** Resolved string representation for display */
  resolvedContent?: string;
  /** For tables: expanded rows */
  rows?: Record<string, string>[][];
  /** Child elements (for panel/group) */
  children?: RenderedElement[];
  /** Original element reference */
  original: DocumentElement;
}

export interface RenderedBand {
  id: string;
  type: string;
  height: number;
  elements: RenderedElement[];
}

export interface RenderedPage {
  id: string;
  width: number;
  height: number;
  unit: string;
  header?: RenderedBand;
  body?: RenderedBand;
  footer?: RenderedBand;
  dataBands?: RenderedBand[];
}

export interface RenderedDocument {
  pages: RenderedPage[];
}

// ── Runner ────────────────────────────────────────────────────

function resolveSource(source: string, ctx: PreviewContext): Record<string, unknown>[] {
  // Try datasources by name (e.g. "Factura.Detalles" → datasources["Factura.Detalles"] or datasources["Factura"])
  if (ctx.datasources[source]) return ctx.datasources[source];
  const prefix = source.split(".")[0];
  if (ctx.datasources[prefix]) return ctx.datasources[prefix];
  return [];
}

function runElement(el: DocumentElement, context: Record<string, unknown>, ctx: PreviewContext): RenderedElement | null {
  // Evaluate showIf
  if (el.showIf && !evaluateCondition(el.showIf, context)) return null;

  // Apply styleRules — first matching rule overrides element props
  let resolvedEl = { ...el };
  const rules = (el as any).styleRules as any[] | undefined;
  if (rules) {
    for (const rule of rules) {
      if (evaluateCondition(rule.expr, context)) {
        if (rule.visible === false) return null;
        for (const key of Object.keys(rule)) {
          if (key === "expr") continue;
          if (rule[key] !== undefined && rule[key] !== false) (resolvedEl as any)[key] = rule[key];
          else if (rule[key] === false && key !== "bold" && key !== "italic" && key !== "underline" && key !== "strikethrough" && key !== "visible") (resolvedEl as any)[key] = rule[key];
        }
        break;
      }
    }
  }

  const base: RenderedElement = {
    id: resolvedEl.id,
    type: resolvedEl.type,
    x: resolvedEl.x,
    y: resolvedEl.y,
    width: resolvedEl.width,
    height: resolvedEl.height,
    original: el,
  };

  switch (resolvedEl.type) {
    case "text": {
      const raw = (resolvedEl as any).value ?? resolvedEl.content;
      const resolved = resolveTemplate(raw, context);
      const fmt = (resolvedEl as any).format;
      const fmtStr = (resolvedEl as any).formatString;
      const formatted = fmt ? formatValue(resolved, fmt, fmtStr) : resolved;
      return { ...base, resolvedContent: formatted, original: el };
    }

    case "image":
      return { ...base, resolvedContent: resolveTemplate(resolvedEl.source, context) };

    case "barcode":
    case "qr":
      return { ...base, resolvedContent: resolveTemplate(resolvedEl.value, context) };

    case "total":
    case "subtotal":
    case "variable": {
      const varName = resolvedEl.type === "variable" ? (resolvedEl as any).variableName : (resolvedEl as any).field;
      const val = context[varName] ?? resolveTemplate(`\${${varName}}`, context);
      return { ...base, resolvedContent: String(val ?? "") };
    }

    case "table": {
      const table = el as any;
      const rows = resolveSource(table.source, ctx);
      const expandedRows = rows.map((row) =>
        table.columns.map((col: any) => ({
          field: col.field,
          header: col.header ?? col.field,
          value: String(row[col.field] ?? ""),
          width: col.width,
          align: col.align,
        }))
      );
      return { ...base, rows: expandedRows as any };
    }

    case "panel":
    case "group": {
      const children = (el as any).elements
        .map((child: DocumentElement) => runElement(child, context, ctx))
        .filter((c: unknown): c is RenderedElement => c !== null);
      return { ...base, children };
    }

    case "if": {
      const condition = evaluateCondition((el as any).condition, context);
      const branch = condition ? (el as any).thenElements : ((el as any).elseElements ?? []);
      const children = branch
        .map((child: DocumentElement) => runElement(child, context, ctx))
        .filter((c: unknown): c is RenderedElement => c !== null);
      return { ...base, type: "group", children };
    }

    case "repeat": {
      const rows = resolveSource((el as any).source, ctx);
      const children: RenderedElement[] = [];
      for (const row of rows) {
        const rowCtx = { ...context, ...row };
        for (const child of (el as any).elements) {
          const rendered = runElement(child, rowCtx, ctx);
          if (rendered) children.push(rendered);
        }
      }
      return { ...base, type: "group", children };
    }

    case "rectangle":
    case "ellipse":
    case "pagebreak":
    case "sectionbreak":
      return base;

    case "include": {
      const compId = (el as any).component as string;
      const comp = (ctx as any).componentLibrary?.find?.((c: ComponentDef) => c.id === compId || c.name === compId);
      if (comp) {
        const children = comp.elements
          .map((ce: DocumentElement) => runElement(ce, context, ctx))
          .filter((re: unknown): re is RenderedElement => re !== null);
        return { ...base, type: "include", children, resolvedContent: comp.name };
      }
      return { ...base, resolvedContent: `[Comp: ${compId}]` };
    }

    default:
      return base;
  }
}

function runBand(band: BandDef, context: Record<string, unknown>, ctx: PreviewContext): RenderedBand | RenderedBand[] {
  if (band.type === "databand" && band.source) {
    const rows = resolveSource(band.source, ctx);
    if (rows.length === 0) return [];
    return rows.map((row, i) => {
      const rowCtx = { ...context, ...row };
      return {
        id: `${band.id}-${i}`,
        type: band.type,
        height: band.height,
        elements: band.elements
          .map((el) => runElement(el, rowCtx, ctx))
          .filter((e): e is RenderedElement => e !== null),
      } as RenderedBand;
    });
  }

  return {
    id: band.id,
    type: band.type,
    height: band.height,
    elements: band.elements
      .map((el) => runElement(el, context, ctx))
      .filter((e): e is RenderedElement => e !== null),
  };
}

function runPage(page: PageDef, context: Record<string, unknown>, ctx: PreviewContext): RenderedPage {
  const dataBandsResult: RenderedBand[] = [];
  if (page.dataBands) {
    for (const db of page.dataBands) {
      const result = runBand(db, context, ctx);
      if (Array.isArray(result)) dataBandsResult.push(...result);
    }
  }
  return {
    id: page.id,
    width: page.width,
    height: page.height,
    unit: page.unit,
    header: page.header ? (runBand(page.header, context, ctx) as RenderedBand) : undefined,
    body:   page.body   ? (runBand(page.body,   context, ctx) as RenderedBand) : undefined,
    footer: page.footer ? (runBand(page.footer, context, ctx) as RenderedBand) : undefined,
    dataBands: dataBandsResult.length > 0 ? dataBandsResult : undefined,
  };
}

export function runDocument(doc: SaeDocumentModel, ctx: PreviewContext): RenderedDocument {
  const context = expandDotPaths(buildContext(ctx));
  return {
    pages: doc.pages.map((page) => runPage(page, context, ctx)),
  };
}

/** Create an empty PreviewContext from the document's declared datasources */
export function createPreviewContext(
  doc: SaeDocumentModel,
  sampleJson?: string,
): PreviewContext {
  let sampleData: Record<string, unknown> = {};
  if (sampleJson) {
    try { sampleData = JSON.parse(sampleJson); } catch { /* ignore */ }
  }

  // Parse datasource sampleData
  const datasources: Record<string, Record<string, unknown>[]> = {};
  for (const ds of doc.datasources) {
    if (ds.sampleData) {
      try {
        const parsed = JSON.parse(ds.sampleData);
        datasources[ds.name] = Array.isArray(parsed) ? parsed : [parsed];
      } catch { /* ignore */ }
    } else {
      datasources[ds.name] = [];
    }
  }

  const variables: Record<string, unknown> = {};
  for (const v of doc.variables) {
    variables[v.name] = v.initial ?? "";
  }

  return { sampleData, datasources, variables, componentLibrary: doc.componentLibrary };
}
