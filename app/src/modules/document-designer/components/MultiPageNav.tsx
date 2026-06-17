import { FilePlus, Trash2, Copy, ChevronUp, ChevronDown } from "lucide-react";
import type { PageDef } from "@/modules/document-engine/models/page";

interface MultiPageNavProps {
  pages: PageDef[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
  onDuplicate: (index: number) => void;
  onDelete: (index: number) => void;
  onMove: (from: number, to: number) => void;
}

export function MultiPageNav({
  pages, activeIndex, onSelect, onAdd, onDuplicate, onDelete, onMove,
}: MultiPageNavProps) {
  return (
    <div className="docPageNav">
      <div className="docPanelEyebrow" style={{ padding: "0.75rem 0.75rem 0.4rem" }}>
        Páginas ({pages.length})
      </div>
      <div className="docPageNav__list">
        {pages.map((page, i) => (
          <div
            key={page.id}
            className={`docPageNavItem${i === activeIndex ? " active" : ""}`}
            onClick={() => onSelect(i)}
          >
            <div className="docPageNavThumb">
              <span className="docPageNavNum">{i + 1}</span>
              <div
                className="docPageNavPreview"
                style={{ aspectRatio: `${page.width} / ${page.height}` }}
              />
            </div>
            <div className="docPageNavMeta">
              <span className="docPageNavSize">
                {page.width} × {page.height} {page.unit}
              </span>
              <div className="docPageNavActions">
                <button
                  type="button"
                  title="Subir"
                  disabled={i === 0}
                  onClick={(e) => { e.stopPropagation(); onMove(i, i - 1); }}
                >
                  <ChevronUp size={11} />
                </button>
                <button
                  type="button"
                  title="Bajar"
                  disabled={i === pages.length - 1}
                  onClick={(e) => { e.stopPropagation(); onMove(i, i + 1); }}
                >
                  <ChevronDown size={11} />
                </button>
                <button
                  type="button"
                  title="Duplicar"
                  onClick={(e) => { e.stopPropagation(); onDuplicate(i); }}
                >
                  <Copy size={11} />
                </button>
                <button
                  type="button"
                  title="Eliminar"
                  disabled={pages.length === 1}
                  onClick={(e) => { e.stopPropagation(); onDelete(i); }}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="docPageNavAdd" onClick={onAdd}>
        <FilePlus size={13} />
        Agregar página
      </button>
    </div>
  );
}
