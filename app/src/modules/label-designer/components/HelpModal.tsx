import { Portal } from "@/components/Portal";

type HelpModalProps = {
  onClose: () => void;
};

export function HelpModal({ onClose }: HelpModalProps) {
  return (
    <Portal>
    <div className="modalBackdrop">
      <div className="modalCard" onClick={e=>e.stopPropagation()} style={{ width:"700px", maxHeight:"85vh", overflow:"auto", position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', opacity: 0.5, color: 'var(--text)' }}>×</button>
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ background: 'var(--accent)', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>?</span>
          Ayuda y Documentación
        </h2>
        <div className="helpGrid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', textAlign: 'left' }}>
          <section><h4 style={{ color: 'var(--accent)', borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Selección</h4>
            <ul style={{ paddingLeft: '1.2rem', fontSize: '0.85rem', lineHeight: '1.6' }}>
              <li><strong>Clic Simple:</strong> Selecciona un elemento.</li>
              <li><strong>Ctrl + Clic:</strong> Selección múltiple o deseleccionar.</li>
              <li><strong>Arrastre (Caja):</strong> Derecha: toca. Izquierda: contiene.</li>
              <li><strong>Doble Clic:</strong> Modo transformación (rotación y sesgado).</li>
            </ul>
          </section>
          <section><h4 style={{ color: 'var(--accent)', borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Reglas y Guías</h4>
            <ul style={{ paddingLeft: '1.2rem', fontSize: '0.85rem', lineHeight: '1.6' }}>
              <li><strong>Crear Guía:</strong> Arrastra desde la regla hacia el lienzo.</li>
              <li><strong>Mover Guía:</strong> Arrastra una guía existente.</li>
              <li><strong>Eliminar Guía:</strong> Arrastra de vuelta a su regla.</li>
              <li>Unidades: mm, cm, in, pt en la barra superior.</li>
            </ul>
          </section>
          <section><h4 style={{ color: 'var(--accent)', borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Herramientas</h4>
            <ul style={{ paddingLeft: '1.2rem', fontSize: '0.85rem', lineHeight: '1.6' }}>
              <li>Activa <strong>Modo Edición</strong> para crear herramientas.</li>
              <li>Usa <strong>"+ Nueva"</strong> para herramienta personalizada.</li>
              <li>Placeholders para variables predefinidas.</li>
            </ul>
          </section>
          <section><h4 style={{ color: 'var(--accent)', borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Variables {"{VAR}"}</h4>
            <ul style={{ paddingLeft: '1.2rem', fontSize: '0.85rem', lineHeight: '1.6' }}>
              <li>Formato <code>{"${nombre_variable}"}</code> en campos de texto.</li>
              <li>Define en pestaña <strong>Variables</strong> del panel derecho.</li>
              <li>Al imprimir se piden valores o se carga Excel.</li>
              <li>Soporta incrementos automáticos.</li>
            </ul>
          </section>
          <section style={{ gridColumn: 'span 2' }}><h4 style={{ color: 'var(--accent)', borderBottom: '2px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Impresoras Lógicas</h4>
            <p style={{ fontSize: '0.85rem', lineHeight: '1.6', marginBottom: '0.5rem' }}>Mapean nombres amigables a colas de impresión físicas en el servidor.</p>
            <ul style={{ paddingLeft: '1.2rem', fontSize: '0.85rem', lineHeight: '1.6' }}>
              <li>Accede desde <strong>Configuraciones → Impresoras Lógicas</strong>.</li>
              <li>Múltiples impresoras físicas por una lógica para redundancia.</li>
              <li>En el diálogo de impresión selecciona de la lista.</li>
            </ul>
          </section>
        </div>
        <div className="modalActions" style={{ marginTop: '2rem' }}>
          <button type="button" className="primary" onClick={onClose} style={{ width: '100%', padding: '0.8rem' }}>Entendido</button>
        </div>
      </div>
    </div>
    </Portal>
  );
}
