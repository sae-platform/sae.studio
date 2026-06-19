import {
  Type, Image, Minus, Square, Circle,
  Barcode, QrCode, Table2,
  DollarSign, Hash, Variable,
  LayoutPanelLeft, Group, GitBranch, Repeat2,
  FileDown, Scissors, Plus, Database,
} from "lucide-react";

interface PaletteItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  group: string;
  defaultWidth: number;
  defaultHeight: number;
}

const PALETTE_ITEMS: PaletteItem[] = [
  // Básicos
  { id: "text",        label: "Texto",       icon: Type,            group: "Básicos",  defaultWidth: 80,  defaultHeight: 8  },
  { id: "image",       label: "Imagen",      icon: Image,           group: "Básicos",  defaultWidth: 30,  defaultHeight: 30 },
  { id: "line",        label: "Línea",       icon: Minus,           group: "Básicos",  defaultWidth: 100, defaultHeight: 0  },
  { id: "rectangle",   label: "Rectángulo",  icon: Square,          group: "Básicos",  defaultWidth: 50,  defaultHeight: 20 },
  { id: "ellipse",     label: "Elipse",      icon: Circle,          group: "Básicos",  defaultWidth: 30,  defaultHeight: 30 },
  // Datos
  { id: "table",       label: "Tabla",       icon: Table2,          group: "Datos",    defaultWidth: 180, defaultHeight: 40 },
  { id: "barcode",     label: "Código",      icon: Barcode,         group: "Datos",    defaultWidth: 55,  defaultHeight: 18 },
  { id: "qr",          label: "QR",          icon: QrCode,          group: "Datos",    defaultWidth: 30,  defaultHeight: 30 },
  // Negocio
  { id: "total",       label: "Total",       icon: DollarSign,      group: "Negocio",  defaultWidth: 80,  defaultHeight: 8  },
  { id: "subtotal",    label: "Subtotal",    icon: Hash,            group: "Negocio",  defaultWidth: 80,  defaultHeight: 8  },
  { id: "variable",    label: "Variable",    icon: Variable,        group: "Negocio",  defaultWidth: 60,  defaultHeight: 8  },
  // Lógica
  { id: "panel",       label: "Panel",       icon: LayoutPanelLeft, group: "Lógica",   defaultWidth: 80,  defaultHeight: 40 },
  { id: "group",       label: "Grupo",       icon: Group,           group: "Lógica",   defaultWidth: 80,  defaultHeight: 30 },
  { id: "if",          label: "Condición",   icon: GitBranch,       group: "Lógica",   defaultWidth: 80,  defaultHeight: 20 },
  { id: "repeat",      label: "Repetir",     icon: Repeat2,         group: "Lógica",   defaultWidth: 80,  defaultHeight: 30 },
  // Página
  { id: "pagebreak",   label: "Salto Página",icon: FileDown,        group: "Página",   defaultWidth: 180, defaultHeight: 4  },
  { id: "sectionbreak",label: "Salto Sección",icon: Scissors,      group: "Página",   defaultWidth: 180, defaultHeight: 4  },
  // Datos
  { id: "databand",    label: "Banda Datos", icon: Database,        group: "Página",   defaultWidth: 0,   defaultHeight: 0  },
];

const GROUPS = ["Básicos", "Datos", "Negocio", "Lógica", "Página"];

interface DocumentPaletteProps {
  onAddPage: () => void;
  onAddDataBand?: () => void;
}

export function DocumentPalette({ onAddPage, onAddDataBand }: DocumentPaletteProps) {
  const handleDragStart = (e: React.DragEvent, item: PaletteItem) => {
    e.dataTransfer.setData("element-type", item.id);
    e.dataTransfer.setData("element-width", String(item.defaultWidth));
    e.dataTransfer.setData("element-height", String(item.defaultHeight));
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <aside className="docPalette">
      <div className="docPanelEyebrow">Componentes</div>

      {GROUPS.map((group) => {
        const items = PALETTE_ITEMS.filter((i) => i.group === group);
        return (
          <div key={group} className="docPaletteGroup">
            <div className="docPaletteGroupLabel">{group}</div>
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="docPaletteItem"
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                  title={`Arrastrar ${item.label} al diseñador`}
                >
                  <Icon size={13} />
                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>
        );
      })}

      <div className="docPaletteGroup">
        <div className="docPaletteGroupLabel">Páginas</div>
        <button type="button" className="docPaletteItem docPaletteItem--action" onClick={onAddPage}>
          <Plus size={13} />
          <span>Agregar página</span>
        </button>
        {onAddDataBand && (
          <button type="button" className="docPaletteItem docPaletteItem--action" onClick={onAddDataBand} style={{ marginTop: 4 }}>
            <Database size={13} />
            <span>Agregar Banda Datos</span>
          </button>
        )}
      </div>
    </aside>
  );
}
