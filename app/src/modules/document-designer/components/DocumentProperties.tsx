import { useState } from "react";
import type { DocumentElement, TableColumnDef } from "@/modules/document-engine/models/elements";
import type { PageDef } from "@/modules/document-engine/models/page";
import type { DocumentTheme } from "@/modules/document-engine/models/theme";
import { THEME_PRESETS } from "@/modules/document-engine/models/theme-presets";
import { PAGE_PRESETS } from "@/modules/document-engine/models/page";

const THEME_PRESET_IDS = new Set(THEME_PRESETS.map((t) => t.id));
import { Trash2, Plus } from "lucide-react";

interface DocumentPropertiesProps {
  selected: DocumentElement | null;
  selectedPage: PageDef | null;
  onElementChange: (patch: Partial<DocumentElement>) => void;
  onPageChange: (patch: Partial<PageDef>) => void;
  onDelete: () => void;
  themeLibrary: DocumentTheme[];
  currentTheme?: DocumentTheme;
  onApplyTheme: (theme: DocumentTheme | null) => void;
  onSaveTheme: (theme: DocumentTheme) => void;
  onRemoveTheme: (id: string) => void;
}

type Tab = "position" | "style" | "data" | "columns";

const UNITS = ["mm", "cm", "in", "pt"] as const;
const FONT_SIZES = ["7", "8", "9", "10", "11", "12", "14", "16", "18", "20", "24", "28", "32", "36", "48", "72"];
const ALIGNS = ["left", "center", "right", "justify"] as const;

export function DocumentProperties({
  selected, selectedPage, onElementChange, onPageChange, onDelete,
  themeLibrary, currentTheme, onApplyTheme, onSaveTheme, onRemoveTheme,
}: DocumentPropertiesProps) {
  const [tab, setTab] = useState<Tab>("position");

  if (!selected && !selectedPage) {
    return (
      <aside className="docProperties">
        <div className="docPanelEyebrow">Propiedades</div>
        <div className="docPropertiesEmpty">
          <strong>Sin selección</strong>
          <span>Selecciona un elemento en el diseñador.</span>
        </div>
      </aside>
    );
  }

  // ── Page properties ──────────────────────────────────────
  if (selectedPage && !selected) {
    return (
      <aside className="docProperties">
        <div className="docPanelEyebrow">Página</div>

        <PropField label="Preset">
          <select className="docInput" onChange={(e) => {
            const p = PAGE_PRESETS[e.target.value];
            if (p) {
              const isLandscape = selectedPage.orientation === "landscape";
              onPageChange({
                width: isLandscape ? p.height : p.width,
                height: isLandscape ? p.width : p.height,
                unit: p.unit,
              });
            }
          }}>
            <option value="">— Personalizado —</option>
            {Object.keys(PAGE_PRESETS).map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </PropField>

        <div className="docFieldGrid2">
          <NumField label="Ancho" value={selectedPage.width} onChange={(v) => onPageChange({ width: v })} />
          <NumField label="Alto" value={selectedPage.height} onChange={(v) => onPageChange({ height: v })} />
        </div>

        <PropField label="Unidad">
          <select className="docInput" value={selectedPage.unit} onChange={(e) => onPageChange({ unit: e.target.value as any })}>
            {UNITS.map((u) => <option key={u}>{u}</option>)}
          </select>
        </PropField>

        <PropField label="Orientación">
          <select className="docInput" value={selectedPage.orientation ?? "portrait"} onChange={(e) => onPageChange({ orientation: e.target.value as any })}>
            <option value="portrait">Vertical</option>
            <option value="landscape">Horizontal</option>
          </select>
        </PropField>

        <div className="docPanelEyebrow" style={{ marginTop: 12 }}>Márgenes (mm)</div>
        <div className="docFieldGrid2">
          <NumField label="Superior" value={selectedPage.marginTop ?? 15} onChange={(v) => onPageChange({ marginTop: v })} />
          <NumField label="Inferior" value={selectedPage.marginBottom ?? 15} onChange={(v) => onPageChange({ marginBottom: v })} />
        </div>
        <div className="docFieldGrid2">
          <NumField label="Izquierdo" value={selectedPage.marginLeft ?? 12} onChange={(v) => onPageChange({ marginLeft: v })} />
          <NumField label="Derecho" value={selectedPage.marginRight ?? 12} onChange={(v) => onPageChange({ marginRight: v })} />
        </div>

        <div className="docPanelEyebrow" style={{ marginTop: 12 }}>Tema</div>
        <div style={{ display: "flex", gap: 4, alignItems: "end" }}>
          <div style={{ flex: 1 }}>
            <PropField label="Tema activo">
              <select
                className="docInput"
                value={currentTheme?.id ?? ""}
                onChange={(e) => {
                  const id = e.target.value;
                  if (!id) {
                    onApplyTheme(null);
                    return;
                  }
                  const t = themeLibrary.find((t) => t.id === id);
                  if (t) onApplyTheme(t);
                }}
              >
                <option value="">— Sin tema —</option>
                {themeLibrary.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </PropField>
          </div>
          {currentTheme && (
            <button type="button" className="docIconBtn" title="Guardar tema" onClick={() => {
              const name = prompt("Nombre del tema:", currentTheme.name);
              if (name) onSaveTheme({ ...currentTheme, id: crypto.randomUUID(), name });
            }}>
              <Plus size={14} />
            </button>
          )}
          {currentTheme && currentTheme.id !== "default" && !THEME_PRESET_IDS.has(currentTheme.id) && (
            <button type="button" className="docIconBtn docIconBtn--danger" title="Eliminar tema" onClick={() => onRemoveTheme(currentTheme.id)}>
              <Trash2 size={14} />
            </button>
          )}
        </div>
        {currentTheme && (
          <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 4, marginBottom: 4 }}>
            {Object.keys(currentTheme.presets).length} presets · {currentTheme.base.fontFamily ?? "Sin fuente base"}
          </div>
        )}
      </aside>
    );
  }

  if (!selected) return null;
  const el = selected;

  // Determine available tabs
  const hasCols = el.type === "table";
  const hasStyle = ["text", "total", "subtotal", "variable", "rectangle", "ellipse", "panel"].includes(el.type);
  const hasData = ["barcode", "qr", "table", "total", "subtotal", "variable", "image", "if", "repeat"].includes(el.type);

  const tabs: { id: Tab; label: string }[] = [
    { id: "position", label: "Posición" },
    ...(hasStyle ? [{ id: "style" as Tab, label: "Estilo" }] : []),
    ...(hasData  ? [{ id: "data"  as Tab, label: "Datos"  }] : []),
    ...(hasCols  ? [{ id: "columns" as Tab, label: "Columnas" }] : []),
  ];

  const activeTab = tabs.find((t) => t.id === tab) ? tab : "position";

  return (
    <aside className="docProperties">
      <div className="docPropHeader">
        <div className="docPanelEyebrow">{TYPE_LABEL[el.type] ?? el.type}</div>
        <button type="button" className="docPropDelete" onClick={onDelete} title="Eliminar elemento">
          <Trash2 size={13} />
        </button>
      </div>

      {tabs.length > 1 && (
        <div className="docPropTabs">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`docPropTab${activeTab === t.id ? " active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Position Tab ── */}
      {activeTab === "position" && (
        <div className="docPropBody">
          {el.type === "line" ? (
            <>
              <div className="docFieldGrid2">
                <NumField label="X1" value={(el as any).x1 ?? 0} onChange={(v) => onElementChange({ ...el, x1: v } as any)} />
                <NumField label="Y1" value={(el as any).y1 ?? 0} onChange={(v) => onElementChange({ ...el, y1: v } as any)} />
              </div>
              <div className="docFieldGrid2">
                <NumField label="X2" value={(el as any).x2 ?? 100} onChange={(v) => onElementChange({ ...el, x2: v } as any)} />
                <NumField label="Y2" value={(el as any).y2 ?? 0} onChange={(v) => onElementChange({ ...el, y2: v } as any)} />
              </div>
            </>
          ) : (
            <>
              <div className="docFieldGrid2">
                <NumField label="X (mm)" value={el.x} onChange={(v) => onElementChange({ x: v })} />
                <NumField label="Y (mm)" value={el.y} onChange={(v) => onElementChange({ y: v })} />
              </div>
              {el.type !== "qr" ? (
                <div className="docFieldGrid2">
                  <NumField label="Ancho" value={el.width ?? 60} onChange={(v) => onElementChange({ width: v })} />
                  <NumField label="Alto" value={el.height ?? 10} onChange={(v) => onElementChange({ height: v })} />
                </div>
              ) : (
                <NumField label="Tamaño" value={(el as any).size ?? 30} onChange={(v) => onElementChange({ ...(el as any), size: v })} />
              )}
            </>
          )}

          <div className="docFieldGrid2">
            <CheckField label="Bloqueado" checked={el.locked ?? false} onChange={(v) => onElementChange({ locked: v })} />
            <CheckField label="Oculto" checked={el.hidden ?? false} onChange={(v) => onElementChange({ hidden: v })} />
          </div>

          <CheckField label="Anclado al fondo" checked={(el as any).anchor?.includes("bottom") ?? false} onChange={(v) => {
            const cur = [...((el as any).anchor ?? []) as string[]];
            const idx = cur.indexOf("bottom");
            if (v && idx === -1) cur.push("bottom");
            if (!v && idx !== -1) cur.splice(idx, 1);
            onElementChange({ anchor: cur.length > 0 ? cur as any : undefined } as any);
          }} />

          <PropField label="Mostrar si">
            <input className="docInput" value={(el as any).showIf ?? ""} placeholder="Expresión..." onChange={(e) => onElementChange({ showIf: e.target.value } as any)} />
          </PropField>
        </div>
      )}

      {/* ── Style Tab ── */}
      {activeTab === "style" && (
        <div className="docPropBody">
          {currentTheme && (
            <PropField label="Preset">
              <select
                className="docInput"
                value={(el as any).preset ?? ""}
                onChange={(e) => onElementChange({ ...(el as any), preset: e.target.value || undefined })}
              >
                <option value="">— Ninguno —</option>
                {Object.keys(currentTheme.presets).map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </PropField>
          )}
          {("font" in el) && (
            <>
              <PropField label="Fuente">
                <input className="docInput" value={(el as any).font ?? "Arial"} onChange={(e) => onElementChange({ ...(el as any), font: e.target.value })} />
              </PropField>
              <div className="docFieldGrid2">
                <PropField label="Tamaño">
                  <select className="docInput" value={String((el as any).size ?? "10")} onChange={(e) => onElementChange({ ...(el as any), size: parseFloat(e.target.value) })}>
                    {FONT_SIZES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </PropField>
                <PropField label="Color">
                  <input type="color" className="docInput docColorInput" value={(el as any).color ?? "#000000"} onChange={(e) => onElementChange({ ...(el as any), color: e.target.value })} />
                </PropField>
              </div>
              <div className="docFieldRow">
                <CheckField label="Negrita" checked={(el as any).bold ?? false} onChange={(v) => onElementChange({ ...(el as any), bold: v })} />
                <CheckField label="Cursiva" checked={(el as any).italic ?? false} onChange={(v) => onElementChange({ ...(el as any), italic: v })} />
                {el.type === "text" && <CheckField label="Subrayado" checked={(el as any).underline ?? false} onChange={(v) => onElementChange({ ...(el as any), underline: v })} />}
              </div>
              {("align" in el) && (
                <PropField label="Alineación">
                  <div className="docAlignGroup">
                    {ALIGNS.map((a) => (
                      <button key={a} type="button" className={`docAlignBtn${(el as any).align === a ? " active" : ""}`} onClick={() => onElementChange({ ...(el as any), align: a })}>
                        {a === "left" ? "⬅" : a === "center" ? "⬛" : a === "right" ? "➡" : "▤"}
                      </button>
                    ))}
                  </div>
                </PropField>
              )}
            </>
          )}
          {("fillColor" in el) && (
            <div className="docFieldGrid2">
              <PropField label="Relleno">
                <input type="color" className="docInput docColorInput" value={(el as any).fillColor ?? "#ffffff"} onChange={(e) => onElementChange({ ...(el as any), fillColor: e.target.value })} />
              </PropField>
              <PropField label="Borde">
                <input type="color" className="docInput docColorInput" value={(el as any).borderColor ?? "#334155"} onChange={(e) => onElementChange({ ...(el as any), borderColor: e.target.value })} />
              </PropField>
            </div>
          )}
        </div>
      )}

      {/* ── Data Tab ── */}
      {activeTab === "data" && (
        <div className="docPropBody">
          {(el.type === "barcode" || el.type === "qr") && (
            <PropField label="Valor">
              <input className="docInput" value={(el as any).value ?? ""} placeholder="\${Variable}" onChange={(e) => onElementChange({ ...(el as any), value: e.target.value })} />
            </PropField>
          )}
          {el.type === "image" && (
            <PropField label="Origen">
              <input className="docInput" value={(el as any).source ?? ""} placeholder="logo.png" onChange={(e) => onElementChange({ ...(el as any), source: e.target.value })} />
            </PropField>
          )}
          {(el.type === "total" || el.type === "subtotal") && (
            <>
              <PropField label="Campo">
                <input className="docInput" value={(el as any).field ?? ""} placeholder="Factura.Total" onChange={(e) => onElementChange({ ...(el as any), field: e.target.value })} />
              </PropField>
              <PropField label="Etiqueta">
                <input className="docInput" value={(el as any).label ?? ""} placeholder="TOTAL" onChange={(e) => onElementChange({ ...(el as any), label: e.target.value })} />
              </PropField>
              <PropField label="Formato">
                <input className="docInput" value={(el as any).format ?? ""} placeholder="#,##0.00" onChange={(e) => onElementChange({ ...(el as any), format: e.target.value })} />
              </PropField>
            </>
          )}
          {el.type === "variable" && (
            <PropField label="Nombre de variable">
              <input className="docInput" value={(el as any).variableName ?? ""} onChange={(e) => onElementChange({ ...(el as any), variableName: e.target.value })} />
            </PropField>
          )}
          {el.type === "table" && (
            <>
              <PropField label="Origen de datos">
                <input className="docInput" value={(el as any).source ?? ""} placeholder="Factura.Detalles" onChange={(e) => onElementChange({ ...(el as any), source: e.target.value })} />
              </PropField>
              <CheckField label="Mostrar encabezado" checked={(el as any).showHeader ?? true} onChange={(v) => onElementChange({ ...(el as any), showHeader: v })} />
            </>
          )}
          {el.type === "if" && (
            <PropField label="Condición">
              <input className="docInput" value={(el as any).condition ?? ""} placeholder="Variable == 'valor'" onChange={(e) => onElementChange({ ...(el as any), condition: e.target.value })} />
            </PropField>
          )}
          {el.type === "repeat" && (
            <PropField label="Origen de datos">
              <input className="docInput" value={(el as any).source ?? ""} placeholder="ITEMS" onChange={(e) => onElementChange({ ...(el as any), source: e.target.value })} />
            </PropField>
          )}
          {el.type === "barcode" && (
            <PropField label="Tipo">
              <select className="docInput" value={(el as any).kind ?? "code128"} onChange={(e) => onElementChange({ ...(el as any), kind: e.target.value })}>
                {["code128", "code39", "ean13", "ean8", "upca", "itf"].map((k) => <option key={k}>{k}</option>)}
              </select>
            </PropField>
          )}
        </div>
      )}

      {/* ── Columns Tab (table) ── */}
      {activeTab === "columns" && el.type === "table" && (
        <TableColumnsEditor
          columns={(el as any).columns ?? []}
          onChange={(cols) => onElementChange({ ...(el as any), columns: cols })}
        />
      )}
    </aside>
  );
}

// ── Sub-components ────────────────────────────────────────────

function PropField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="docField">
      <span>{label}</span>
      {children}
    </label>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <PropField label={label}>
      <input
        type="number"
        className="docInput"
        value={value}
        step={0.5}
        onChange={(e) => {
          const n = parseFloat(e.target.value);
          if (!isNaN(n)) onChange(n);
        }}
      />
    </PropField>
  );
}

function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="docCheckbox">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function TableColumnsEditor({
  columns, onChange,
}: {
  columns: TableColumnDef[];
  onChange: (cols: TableColumnDef[]) => void;
}) {
  return (
    <div className="docPropBody">
      <div className="docColList">
        {columns.map((col, i) => (
          <div key={i} className="docColRow">
            <input
              className="docInput docColInput"
              placeholder="campo"
              value={col.field}
              onChange={(e) => {
                const next = [...columns];
                next[i] = { ...col, field: e.target.value };
                onChange(next);
              }}
            />
            <input
              className="docInput docColInput"
              placeholder="encabezado"
              value={col.header ?? ""}
              onChange={(e) => {
                const next = [...columns];
                next[i] = { ...col, header: e.target.value };
                onChange(next);
              }}
            />
            <input
              className="docInput docColInput--sm"
              placeholder="ancho"
              value={col.width ?? ""}
              onChange={(e) => {
                const next = [...columns];
                next[i] = { ...col, width: e.target.value };
                onChange(next);
              }}
            />
            <button
              type="button"
              className="docColDelete"
              onClick={() => onChange(columns.filter((_, j) => j !== i))}
              title="Eliminar columna"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="docColAdd"
        onClick={() => onChange([...columns, { field: "", header: "" }])}
      >
        <Plus size={12} /> Agregar columna
      </button>
    </div>
  );
}

const TYPE_LABEL: Record<string, string> = {
  text: "Texto", image: "Imagen", line: "Línea", rectangle: "Rectángulo",
  ellipse: "Elipse", barcode: "Código de Barras", qr: "Código QR",
  table: "Tabla", total: "Total", subtotal: "Subtotal", variable: "Variable",
  panel: "Panel", group: "Grupo", if: "Condición", repeat: "Repetir",
  pagebreak: "Salto de Página", sectionbreak: "Salto de Sección",
};
