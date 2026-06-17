import { Portal } from "@/components/Portal";
import { open } from "@tauri-apps/plugin-shell";
import pkg from "../../../../package.json";

type AboutModalProps = {
  onClose: () => void;
};

export function AboutModal({ onClose }: AboutModalProps) {
  return (
    <Portal>
      <div className="modalBackdrop" onClick={onClose}>
        <div className="modalCard" onClick={(e) => e.stopPropagation()} style={{ width: "400px", textAlign: "center" }}>
          <div style={{ marginBottom: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ width: "84px", height: "84px", background: "var(--primary,#16a34a)", borderRadius: "18px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "2.5rem", marginBottom: "1rem", boxShadow: "0 8px 20px rgba(22,163,74,0.2)" }}>🏷️</div>
            <p style={{ margin: 0 }}>SAE Studio</p>
            <p style={{ margin: "0.2rem 0", opacity: 0.6, fontSize: "0.85rem" }}>Versión {pkg.version}</p>
          </div>
          <div style={{ background: "var(--bg-tabs)", padding: "1.25rem", borderRadius: "12px", marginBottom: "1.5rem", border: "1px solid var(--border)" }}>
            <p style={{ margin: "0 0 1rem 0", fontSize: "0.9rem", color: "var(--text)" }}>
              Suite profesional de diseño de etiquetas y tiquetes para motores de impresión SAE.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", alignItems: "center" }}>
              <a href={pkg.homepage} onClick={(e) => { e.preventDefault(); open(pkg.homepage); }} style={{ cursor: "pointer", color: "var(--accent)", fontWeight: 600, textDecoration: "none", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                Visitar sitio web
              </a>
              <a href={typeof pkg.repository === "string" ? pkg.repository : pkg.repository?.url} onClick={(e) => { e.preventDefault(); open(typeof pkg.repository === "string" ? pkg.repository : (pkg.repository?.url || "")); }} style={{ cursor: "pointer", color: "var(--text)", opacity: 0.7, fontWeight: 500, textDecoration: "none", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" /></svg>
                Repositorio GitHub
              </a>
              <div style={{ marginTop: "0.5rem", fontSize: "0.65rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Licencia MIT</div>
            </div>
          </div>
          <button type="button" className="primary" onClick={onClose} style={{ width: "100%" }}>Cerrar</button>
        </div>
      </div>
    </Portal>
  );
}
