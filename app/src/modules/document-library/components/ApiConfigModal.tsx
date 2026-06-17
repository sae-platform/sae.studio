import { Portal } from "@/components/Portal";

type ApiConfigModalProps = {
  apiBaseUrlDraft: string;
  setApiBaseUrlDraft: (url: string) => void;
  pingBackend: (url: string) => Promise<boolean>;
  pingStatus: string;
  setPingStatus: (status: string) => void;
  setApiBaseUrl: (url: string) => void;
  onClose: () => void;
};

export function ApiConfigModal({
  apiBaseUrlDraft, setApiBaseUrlDraft,
  pingBackend, pingStatus, setPingStatus,
  setApiBaseUrl, onClose,
}: ApiConfigModalProps) {
  return (
    <Portal>
      <div className="modalBackdrop">
        <div className="modalCard" onClick={(e) => e.stopPropagation()} style={{ width: "480px", maxWidth: "95vw" }}>
          <h3 style={{ marginTop: 0, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /><path d="M4.93 4.93a10 10 0 0 0 0 14.14" /></svg>
            Configuración de API
          </h3>
          <div style={{ background: "var(--bg-subtle)", borderRadius: "6px", padding: "0.75rem 1rem", marginBottom: "1.25rem", fontSize: "0.82rem", color: "var(--muted)", border: "1px solid var(--border)" }}>
            <strong>URL del servidor SAELABEL.Api local.</strong><br />
            Por defecto: <code style={{ background: "var(--bg-card)", padding: "0.1rem 0.3rem", borderRadius: "3px" }}>http://localhost:5117</code>
          </div>
          <label style={{ display: "block", margin: "0 0 0.5rem", fontSize: "0.85rem", fontWeight: 500 }}>API Base URL
            <input type="text" value={apiBaseUrlDraft} onChange={(e) => { setApiBaseUrlDraft(e.target.value); setPingStatus(""); }} placeholder="http://localhost:5117"
              style={{ display: "block", width: "100%", marginTop: "0.4rem", padding: "0.5rem", fontFamily: "monospace", fontSize: "0.9rem" }}
              onKeyDown={(e) => { if (e.key === "Enter") pingBackend(apiBaseUrlDraft.trim()); }} />
          </label>
          {pingStatus && (
            <div style={{ padding: "0.6rem 0.8rem", borderRadius: "5px", fontSize: "0.82rem", marginTop: "0.5rem", background: pingStatus.startsWith("✅") ? "#dcfce7" : pingStatus.startsWith("❌") ? "#fee2e2" : "#fef9c3", color: pingStatus.startsWith("✅") ? "#166534" : pingStatus.startsWith("❌") ? "#991b1b" : "#854d0e" }}>{pingStatus}</div>
          )}
          <div className="modalActions" style={{ marginTop: "1.5rem" }}>
            <button type="button" className="secondary" onClick={onClose}>Cancelar</button>
            <button type="button" className="secondary" onClick={async () => {
              const next = apiBaseUrlDraft.trim();
              if (!next) { setPingStatus("❌ La URL no puede estar vacía."); return; }
              await pingBackend(next);
            }}>Probar conexión</button>
            <button type="button" className="primary" onClick={async () => {
              const next = apiBaseUrlDraft.trim();
              if (!next) { setPingStatus("❌ La URL no puede estar vacía."); return; }
              const ok = await pingBackend(next);
              if (ok) { setApiBaseUrl(next); onClose(); setPingStatus(""); }
            }}>Probar y Guardar</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
