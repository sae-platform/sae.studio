import { useWorkspaceStore } from "../stores";
import { useMenuManager } from "@/application/useMenuManager";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { EditorDocumentSummary } from "@/lib/api/client";

interface TopBarProps {
  saveDoc: () => void;
  saveAsDoc: () => void;
  loadDocument: (id: string) => void;
  openNewDocumentTypeModal: () => void;
  openLocalFile: () => void;
  openApiConfigModal: () => void;
  setShowOpenDocModal: (show: boolean) => void;
  setShowTemplatesGallery: (show: boolean) => void;
  setPropertiesModalOpen: (show: boolean) => void;
  setShowPrintersManagerModal: (show: boolean) => void;
  setShowAboutModal: (show: boolean) => void;
  setResult: (res: string) => void;
  setShowResultModal: (show: boolean) => void;
  documents: EditorDocumentSummary[];
  refreshDocuments: () => Promise<void>;
}

export function TopBar(props: TopBarProps) {
  const {
    saveDoc, saveAsDoc, loadDocument,
    openNewDocumentTypeModal, openLocalFile, openApiConfigModal,
    setShowOpenDocModal, setShowTemplatesGallery, setPropertiesModalOpen,
    setShowPrintersManagerModal, setShowAboutModal,
    setResult, setShowResultModal,
    documents, refreshDocuments,
  } = props;

  const darkMode = useWorkspaceStore((s) => s.darkMode);
  const setDarkMode = useWorkspaceStore((s) => s.setDarkMode);
  const autoSaveEnabled = useWorkspaceStore((s) => s.autoSaveEnabled);
  const setAutoSaveEnabled = useWorkspaceStore((s) => s.setAutoSaveEnabled);
  const canUndo = useWorkspaceStore((s) => s.canUndo);
  const canRedo = useWorkspaceStore((s) => s.canRedo);
  const xml = useWorkspaceStore((s) => s.docKind === "saetickets" ? s.ticketXml : s.labelXml);

  const { activeMenu, activeSubMenu, toggleMenu, toggleSubMenu, closeAllMenus } = useMenuManager(refreshDocuments);

  return (
    <nav className="appMenu" data-tauri-drag-region style={{ overflow: "visible" }}>
      <details className="menuDropdown" open={activeMenu === "archivo"}>
        <summary className="menuItem" style={{ textAlign: "left" }} onClick={(e) => { e.preventDefault(); toggleMenu("archivo"); }}>Archivo</summary>
        <div className="menuDropdownList">
          <button type="button" className="menuDropdownItem" onClick={() => { openNewDocumentTypeModal(); closeAllMenus(); }}>
            Nuevo...
          </button>
          <button type="button" className="menuDropdownItem" onClick={() => { refreshDocuments(); setShowOpenDocModal(true); closeAllMenus(); }}>
            Abrir de biblioteca...
          </button>
          <button type="button" className="menuDropdownItem" onClick={() => { openLocalFile(); closeAllMenus(); }}>
            Abrir Archivo Local...
          </button>
          <button type="button" className="menuDropdownItem" onClick={() => { setShowTemplatesGallery(true); closeAllMenus(); }}>
            Plantillas
          </button>
          <button type="button" className="menuDropdownItem" onClick={() => { setPropertiesModalOpen(true); closeAllMenus(); }}>
            Propiedades Documento
          </button>
          <div className="menuDivider" />
          <button type="button" className="menuDropdownItem" onClick={() => { saveDoc(); closeAllMenus(); }}>
            Guardar
          </button>
          <button type="button" className="menuDropdownItem" onClick={() => { saveAsDoc(); closeAllMenus(); }}>
            Guardar como (Copia)
          </button>
          <div className="menuDivider" />
          <details className="menuSubDropdown" open={activeSubMenu === "labels"}>
            <summary className="menuDropdownItem" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", padding: "0.65rem 1.25rem", boxSizing: "border-box" }} onClick={(e) => { e.preventDefault(); toggleSubMenu("labels"); }}>
              <span>Etiquetas recientes</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, flexShrink: 0 }}><polyline points="9 18 15 12 9 6" /></svg>
            </summary>
            <div className="menuSubDropdownList">
              {documents.filter((d) => d.kind !== "saetickets").length > 0 ? documents.filter((d) => d.kind !== "saetickets").slice(0, 10).map((d) => (
                <button key={d.id} type="button" className="menuDropdownItem" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", width: "100%", padding: "0.5rem 0.75rem" }} onClick={() => { loadDocument(d.id); closeAllMenus(); }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, fontSize: "0.8rem" }}>{d.name}</span>
                  <small style={{ opacity: 0.4, fontSize: "0.62rem", flexShrink: 0, fontWeight: 700 }}>{new Date(d.updatedAtUtc || Date.now()).toLocaleDateString()}</small>
                </button>
              )) : <div className="menuDropdownItem disabled">No hay etiquetas</div>}
            </div>
          </details>
          <details className="menuSubDropdown" open={activeSubMenu === "tickets"}>
            <summary className="menuDropdownItem" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", padding: "0.65rem 1.25rem", boxSizing: "border-box" }} onClick={(e) => { e.preventDefault(); toggleSubMenu("tickets"); }}>
              <span>Tiquetes recientes</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, flexShrink: 0 }}><polyline points="9 18 15 12 9 6" /></svg>
            </summary>
            <div className="menuSubDropdownList">
              {documents.filter((d) => d.kind === "saetickets").length > 0 ? documents.filter((d) => d.kind === "saetickets").slice(0, 10).map((d) => (
                <button key={d.id} type="button" className="menuDropdownItem" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", width: "100%", padding: "0.5rem 0.75rem" }} onClick={() => { loadDocument(d.id); closeAllMenus(); }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, fontSize: "0.8rem" }}>{d.name}</span>
                  <small style={{ opacity: 0.4, fontSize: "0.62rem", flexShrink: 0, fontWeight: 700 }}>{new Date(d.updatedAtUtc || Date.now()).toLocaleDateString()}</small>
                </button>
              )) : <div className="menuDropdownItem disabled">No hay tiquetes</div>}
            </div>
          </details>
        </div>
      </details>
      <details className="menuDropdown" open={activeMenu === "editar"}>
        <summary className="menuItem" style={{ textAlign: "left" }} onClick={(e) => { e.preventDefault(); toggleMenu("editar"); }}>Editar</summary>
        <div className="menuDropdownList">
          <button
            type="button"
            className="menuDropdownItem"
            disabled={!canUndo}
            style={{ opacity: canUndo ? 1 : 0.5, cursor: canUndo ? "pointer" : "default", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.65rem 1.25rem" }}
            onClick={() => { if (!canUndo) return; window.dispatchEvent(new CustomEvent("saelabel:history-undo")); closeAllMenus(); }}
          >
            <span>Deshacer</span>
            <span style={{ opacity: 0.5, fontSize: "0.75rem", marginLeft: "2rem" }}>Ctrl + Z</span>
          </button>
          <button
            type="button"
            className="menuDropdownItem"
            disabled={!canRedo}
            style={{ opacity: canRedo ? 1 : 0.5, cursor: canRedo ? "pointer" : "default", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.65rem 1.25rem" }}
            onClick={() => { if (!canRedo) return; window.dispatchEvent(new CustomEvent("saelabel:history-redo")); closeAllMenus(); }}
          >
            <span>Rehacer</span>
            <span style={{ opacity: 0.5, fontSize: "0.75rem", marginLeft: "2rem" }}>Ctrl + Y</span>
          </button>
          <div className="menuDivider" />
          <button type="button" className="menuDropdownItem" onClick={() => { setResult(xml); setShowResultModal(true); closeAllMenus(); }}>
            Ver resultado XML
          </button>
        </div>
      </details>
      <details className="menuDropdown" open={activeMenu === "config"}>
        <summary className="menuItem" style={{ textAlign: "left" }} onClick={(e) => { e.preventDefault(); toggleMenu("config"); }}>Configuraciones</summary>
        <div className="menuDropdownList">
          <button type="button" className="menuDropdownItem" onClick={() => { openApiConfigModal(); closeAllMenus(); }}>
            Config API
          </button>
          <button type="button" className="menuDropdownItem" onClick={() => { setShowPrintersManagerModal(true); closeAllMenus(); }}>
            Impresoras Lógicas
          </button>
          <div className="menuDropdownItem" style={{ cursor: "default", padding: "0.65rem 1.25rem", boxSizing: "border-box", width: "auto" }} onClick={(e) => e.stopPropagation()}>
            <label className="toggleLabel" style={{ padding: 0, width: "auto", flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", pointerEvents: "none", gap: "2rem" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text)" }}>Auto-guardado</span>
              <span
                className="toggleTrack mini"
                style={{ pointerEvents: "auto", flexShrink: 0 }}
                data-checked={String(autoSaveEnabled)}
                onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
                role="switch"
                aria-checked={autoSaveEnabled}
              >
                <span className="toggleThumb" />
              </span>
            </label>
          </div>
        </div>
      </details>
      <div className="menuItem" onClick={() => setShowAboutModal(true)}>Acerca de</div>

      <div style={{ flex: 1, minWidth: "20px" }} data-tauri-drag-region />

      <div style={{
        position: "absolute", left: "50%", transform: "translateX(-50%)",
        pointerEvents: "none", userSelect: "none",
        display: "flex", alignItems: "center", gap: "0.6rem",
      }} data-tauri-drag-region>
        <div style={{
          background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
          width: "24px", height: "24px", borderRadius: "6px",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 4px rgba(22, 163, 74, 0.2)",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <span className="studioLogoText" style={{
          fontSize: "0.9rem", fontWeight: 800,
          background: "linear-gradient(to right, #111, #444)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          letterSpacing: "-0.01em", fontFamily: "Inter, system-ui, sans-serif",
        }}>
          SAE <span style={{ color: "#16a34a", WebkitTextFillColor: "#16a34a" }}>Studio</span>
        </span>
      </div>

      <div className="windowControls">
        <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginRight: "0.25rem", userSelect: "none" }}
          title={darkMode ? "Modo oscuro activo — click para cambiar a claro" : "Modo claro activo — click para cambiar a oscuro"}
        >
          <span style={{ opacity: 0.6, display: "flex", alignItems: "center", color: "var(--muted)" }}>
            {darkMode ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
          </span>
          <span className="toggleTrack" data-checked={String(darkMode)} onClick={() => { const s = useWorkspaceStore.getState(); setDarkMode(!s.darkMode); }} role="switch" aria-checked={darkMode} style={{ cursor: "pointer" }}>
            <span className="toggleThumb" />
          </span>
        </span>
        <button className="winBtn" onClick={() => getCurrentWindow().minimize()}>
          <svg width="10" height="1" viewBox="0 0 10 1"><line x1="0" y1="0.5" x2="10" y2="0.5" stroke="currentColor" strokeWidth="1" /></svg>
        </button>
        <button className="winBtn" onClick={() => getCurrentWindow().toggleMaximize()}>
          <svg width="10" height="10" viewBox="0 0 10 10"><rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1" /></svg>
        </button>
        <button className="winBtn close" onClick={() => getCurrentWindow().close()}>
          <svg width="10" height="10" viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.2" /><line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.2" /></svg>
        </button>
      </div>
    </nav>
  );
}
