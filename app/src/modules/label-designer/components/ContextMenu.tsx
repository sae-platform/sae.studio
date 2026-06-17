type ContextMenuProps = {
  x: number;
  y: number;
  id: string | null;
  selectedIds: string[];
  objects: Array<{ id: string; groupId?: string }>;
  canGroup: boolean;
  canUngroup: boolean;
  onClose: () => void;
  onMoveLayer: (token: string, dir: "up" | "down" | "top" | "bottom") => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClearSelection: () => void;
  onGroup: () => void;
  onUngroup: () => void;
  onOpenProperties: () => void;
};

export function ContextMenu({
  x,
  y,
  id,
  selectedIds,
  objects,
  canGroup,
  canUngroup,
  onClose,
  onMoveLayer,
  onDuplicate,
  onDelete,
  onClearSelection,
  onGroup,
  onUngroup,
  onOpenProperties,
}: ContextMenuProps) {
  const token = id && id !== "canvas" ? id : selectedIds[0];

  return (
    <div className="contextMenu" style={{ left: x, top: y }}>
      {selectedIds.length > 0 ? (
        <>
          {id && id !== "canvas" && (
            <>
              <div className="menuItem" onClick={() => { onOpenProperties(); onClose(); }}>Propiedades</div>
              <div className="menuLine" />
            </>
          )}
          <div className="menuItem" onClick={() => onMoveLayer(token, "top")}>Traer al frente</div>
          <div className="menuItem" onClick={() => onMoveLayer(token, "up")}>Traer adelante</div>
          <div className="menuItem" onClick={() => onMoveLayer(token, "down")}>Enviar atrás</div>
          <div className="menuItem" onClick={() => onMoveLayer(token, "bottom")}>Enviar al fondo</div>
          <div className="menuLine" />
          <div className="menuItem" onClick={onDuplicate}>Duplicar seleccionados</div>
          {canGroup && (
            <div className="menuItem" onClick={() => { onGroup(); onClose(); }}>
              Agrupar <span style={{ marginLeft: "auto", opacity: 0.5, fontSize: "0.75rem", paddingLeft: "1.5rem" }}>Ctrl+G</span>
            </div>
          )}
          {canUngroup && (
            <div className="menuItem" onClick={() => { onUngroup(); onClose(); }}>
              Desagrupar <span style={{ marginLeft: "auto", opacity: 0.5, fontSize: "0.75rem", paddingLeft: "1.5rem" }}>Ctrl+Shift+G</span>
            </div>
          )}
          <div className="menuLine" />
          <div className="menuItem danger" onClick={onDelete}>Eliminar seleccionados</div>
          <div className="menuLine" />
          <div className="menuItem" onClick={() => { onClearSelection(); onClose(); }}>Limpiar selección</div>
        </>
      ) : (
        <div className="menuItem" style={{ opacity: 0.5, cursor: "default" }}>Sin elementos seleccionados</div>
      )}
    </div>
  );
}
