type LayerNode = { kind: "group"; groupId: string; members: any[] } | { kind: "item"; object: any };

type LayersPanelProps = {
  layerNodes: LayerNode[];
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  dragLayerId: string | null;
  setDragLayerId: (id: string | null) => void;
  reorderByLayerDrop: (drag: string, target: string) => void;
  handleContextMenu: (e: React.MouseEvent, id: string) => void;
  toggleHide: (id: string) => void;
  toggleLock: (id: string) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  moveLayer: (id: string, dir: "up" | "down" | "top" | "bottom") => void;
  groupSelected: () => void;
  deleteObjects: (ids: string[]) => void;
  ICON: Record<string, React.ReactNode>;
  GROUP_ICON: React.ReactNode;
};

export function LayersPanel({
  layerNodes, selectedIds, setSelectedIds,
  dragLayerId, setDragLayerId, reorderByLayerDrop,
  handleContextMenu, toggleHide, toggleLock,
  bringToFront, sendToBack, moveLayer, groupSelected, deleteObjects,
  ICON, GROUP_ICON,
}: LayersPanelProps) {
  return (
    <div className="layersPanel">
      <div className="layersList">
        {layerNodes.map((node) =>
          node.kind === "group" ? (
            <div key={node.groupId} className="layerGroupWrap">
              <div className="layerItem layerGroup" draggable
                onDragStart={() => setDragLayerId(`group:${node.groupId}`)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); if (dragLayerId) reorderByLayerDrop(dragLayerId, `group:${node.groupId}`); setDragLayerId(null); }}
                onClick={() => setSelectedIds(node.members.map((m: any) => m.id))}
                onContextMenu={(e: any) => handleContextMenu(e, `group:${node.groupId}`)}>
                <span className="layerIcon">{GROUP_ICON}</span>
                <span>Grupo ({node.members.length})</span>
              </div>
              {node.members.map((m: any) => (
                <div key={m.id} className={`layerItem layerChild ${selectedIds.includes(m.id) ? "selected" : ""}`}
                  onClick={() => setSelectedIds([m.id])}
                  onContextMenu={(e: any) => handleContextMenu(e, m.id)}
                  onDragOver={(e) => e.preventDefault()}>
                  <span className="layerIcon">{ICON[m.type as keyof typeof ICON]}</span>
                  <span style={{ flex: 1, textDecoration: m.hidden ? "line-through" : "none", opacity: m.hidden ? 0.4 : 1 }}>{m.type}</span>
                  <button type="button" className="layerActionBtn" title={m.hidden ? "Mostrar" : "Ocultar"}
                    onClick={(e) => { e.stopPropagation(); toggleHide(m.id); }}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, padding: "0 2px", opacity: 0.5 }}>
                    {m.hidden ? "👁‍🗨" : "👁"}
                  </button>
                  <button type="button" className="layerActionBtn" title={m.locked ? "Desbloquear" : "Bloquear"}
                    onClick={(e) => { e.stopPropagation(); toggleLock(m.id); }}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, padding: "0 2px", opacity: 0.5 }}>
                    {m.locked ? "🔒" : "🔓"}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div key={node.object.id} className={`layerItem ${selectedIds.includes(node.object.id) ? "selected" : ""}`}
              draggable onDragStart={() => setDragLayerId(node.object.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); if (dragLayerId) reorderByLayerDrop(dragLayerId, node.object.id); setDragLayerId(null); }}
              onClick={() => setSelectedIds([node.object.id])}
              onContextMenu={(e: any) => handleContextMenu(e, node.object.id)}>
              <span className="layerIcon">{ICON[node.object.type as keyof typeof ICON]}</span>
              <span style={{ flex: 1, textDecoration: node.object.hidden ? "line-through" : "none", opacity: node.object.hidden ? 0.4 : 1 }}>{node.object.type}</span>
              <button type="button" className="layerActionBtn" title={node.object.hidden ? "Mostrar" : "Ocultar"}
                onClick={(e) => { e.stopPropagation(); toggleHide(node.object.id); }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, padding: "0 2px", opacity: 0.5 }}>
                {node.object.hidden ? "👁‍🗨" : "👁"}
              </button>
              <button type="button" className="layerActionBtn" title={node.object.locked ? "Desbloquear" : "Bloquear"}
                onClick={(e) => { e.stopPropagation(); toggleLock(node.object.id); }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, padding: "0 2px", opacity: 0.5 }}>
                {node.object.locked ? "🔒" : "🔓"}
              </button>
            </div>
          ),
        )}
      </div>
      <div className="layersToolbar">
        <button type="button" className="toolBtn" title="Traer al frente" onClick={() => selectedIds[0] && bringToFront(selectedIds[0])}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 3l-6 6" /><path d="M21 3v6" /><path d="M21 3h-6" /><path d="M14 14l-4 4" /><path d="M10 18v-4" /><path d="M10 18h4" /></svg>
        </button>
        <button type="button" className="toolBtn" title="Enviar al fondo" onClick={() => selectedIds[0] && sendToBack(selectedIds[0])}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21l6-6" /><path d="M3 21v-6" /><path d="M3 21h6" /><path d="M10 10l4-4" /><path d="M14 6v4" /><path d="M14 6h-4" /></svg>
        </button>
        <div className="toolDivider" />
        <button type="button" className="toolBtn" title="Subir capa" onClick={() => selectedIds[0] && moveLayer(selectedIds[0], "up")}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15" /></svg>
        </button>
        <button type="button" className="toolBtn" title="Bajar capa" onClick={() => selectedIds[0] && moveLayer(selectedIds[0], "down")}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
        </button>
        <div className="toolDivider" />
        <button type="button" className="toolBtn" title="Agrupar" onClick={groupSelected} disabled={selectedIds.length < 2}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 9h6v6H9z" /></svg>
        </button>
        <button type="button" className="toolBtn danger" title="Eliminar" onClick={() => deleteObjects(selectedIds)} disabled={selectedIds.length === 0}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
        </button>
      </div>
    </div>
  );
}
