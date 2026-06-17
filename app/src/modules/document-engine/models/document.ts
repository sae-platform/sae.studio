// ============================================================
// SAE Document Engine — Root Document Model
// ============================================================

import type { PageDef } from "./page";
import { createPage } from "./page";
import type { DocumentElement } from "./elements";
import type { BandDef } from "./band";

// ── Sub-models ───────────────────────────────────────────────

export interface DocumentMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  created?: string;
  version: string;
}

export interface DataSourceDef {
  name: string;
  /** "manual" | "json" | "api" | "excel" */
  type: string;
  columns: string[];
  /** JSON string of sample rows */
  sampleData?: string;
}

export interface AssetDef {
  id: string;
  name: string;
  /** "image" | "font" | "file" */
  type: string;
  source: string;
}

export interface VariableDef {
  name: string;
  /** "text" | "integer" | "decimal" | "date" | "boolean" */
  type: string;
  initial?: string;
  /** "never" | "per_item" | "per_page" */
  increment?: string;
  step?: number;
}

// ── Root ─────────────────────────────────────────────────────

export interface SaeDocumentModel {
  version: string;
  metadata?: DocumentMetadata;
  datasources: DataSourceDef[];
  assets: AssetDef[];
  variables: VariableDef[];
  pages: PageDef[];
  embeddedTheme?: import("./theme").DocumentTheme;
}

// ── Factory ──────────────────────────────────────────────────

export function createDocument(preset?: string): SaeDocumentModel {
  return {
    version: "2.0",
    metadata: {
      title: "Nuevo Documento",
      version: "2.0",
    },
    datasources: [],
    assets: [],
    variables: [],
    pages: [createPage(preset ?? "A4")],
  };
}

// ── Element tree helpers ─────────────────────────────────────

type ElementVisitor = (el: DocumentElement, parent: DocumentElement | BandDef) => void;

function walkBand(band: BandDef, visitor: ElementVisitor) {
  for (const el of band.elements) {
    visitor(el, band);
    walkElement(el, visitor);
  }
}

function walkElement(el: DocumentElement, visitor: ElementVisitor) {
  if ("elements" in el && Array.isArray(el.elements)) {
    for (const child of el.elements as DocumentElement[]) {
      visitor(child, el);
      walkElement(child, visitor);
    }
  }
  if ("thenElements" in el) {
    for (const child of el.thenElements) {
      visitor(child, el);
      walkElement(child, visitor);
    }
    for (const child of (el.elseElements ?? [])) {
      visitor(child, el);
      walkElement(child, visitor);
    }
  }
}

/** Find an element by id across all pages and bands */
export function findElementById(doc: SaeDocumentModel, id: string): DocumentElement | null {
  for (const page of doc.pages) {
    for (const band of [page.header, page.body, page.footer]) {
      if (!band) continue;
      let found: DocumentElement | null = null;
      walkBand(band, (el) => { if (el.id === id) found = el; });
      if (found) return found;
    }
  }
  return null;
}

/** Immutably update an element anywhere in the tree */
export function updateElement(
  doc: SaeDocumentModel,
  id: string,
  patch: Partial<DocumentElement>,
): SaeDocumentModel {
  function patchInList(list: DocumentElement[]): DocumentElement[] {
    return list.map((el): DocumentElement => {
      if (el.id === id) return { ...el, ...patch } as DocumentElement;
      if ("elements" in el && Array.isArray(el.elements)) {
        return { ...el, elements: patchInList(el.elements as DocumentElement[]) } as DocumentElement;
      }
      if ("thenElements" in el) {
        return {
          ...el,
          thenElements: patchInList(el.thenElements),
          elseElements: el.elseElements ? patchInList(el.elseElements) : undefined,
        } as DocumentElement;
      }
      return el;
    });
  }

  function patchBand(band?: BandDef): BandDef | undefined {
    if (!band) return undefined;
    return { ...band, elements: patchInList(band.elements) };
  }

  return {
    ...doc,
    pages: doc.pages.map((p) => ({
      ...p,
      header: patchBand(p.header),
      body:   patchBand(p.body),
      footer: patchBand(p.footer),
    })),
  };
}

/** Remove an element by id from the entire tree */
export function removeElement(doc: SaeDocumentModel, id: string): SaeDocumentModel {
  function filterList(list: DocumentElement[]): DocumentElement[] {
    return list
      .filter((el) => el.id !== id)
      .map((el): DocumentElement => {
        if ("elements" in el && Array.isArray(el.elements)) {
          return { ...el, elements: filterList(el.elements as DocumentElement[]) } as DocumentElement;
        }
        if ("thenElements" in el) {
          return {
            ...el,
            thenElements: filterList(el.thenElements),
            elseElements: el.elseElements ? filterList(el.elseElements) : undefined,
          } as DocumentElement;
        }
        return el;
      });
  }

  function filterBand(band?: BandDef): BandDef | undefined {
    if (!band) return undefined;
    return { ...band, elements: filterList(band.elements) };
  }

  return {
    ...doc,
    pages: doc.pages.map((p) => ({
      ...p,
      header: filterBand(p.header),
      body:   filterBand(p.body),
      footer: filterBand(p.footer),
    })),
  };
}

/** Add an element to a specific band on a page */
export function addElementToBand(
  doc: SaeDocumentModel,
  pageIndex: number,
  band: "header" | "body" | "footer",
  element: DocumentElement,
): SaeDocumentModel {
  return {
    ...doc,
    pages: doc.pages.map((p, i) => {
      if (i !== pageIndex) return p;
      const b = p[band];
      if (!b) return p;
      return { ...p, [band]: { ...b, elements: [...b.elements, element] } };
    }),
  };
}

/** Update band height */
export function updateBandHeight(
  doc: SaeDocumentModel,
  pageIndex: number,
  band: "header" | "body" | "footer",
  height: number,
): SaeDocumentModel {
  return {
    ...doc,
    pages: doc.pages.map((p, i) => {
      if (i !== pageIndex) return p;
      const b = p[band];
      if (!b) return p;
      return { ...p, [band]: { ...b, height: Math.max(10, height) } };
    }),
  };
}
