import { useEffect, useRef, useCallback } from "react";
import { useWorkspaceStore } from "../stores";
import type { DocKind } from "../stores";
import type { EditorDocumentSummary } from "@/lib/api/client";

interface FileHandles {
  label: FileSystemFileHandle | null;
  ticket: FileSystemFileHandle | null;
  document: FileSystemFileHandle | null;
  setLabel: (h: FileSystemFileHandle | null) => void;
  setTicket: (h: FileSystemFileHandle | null) => void;
  setDocument: (h: FileSystemFileHandle | null) => void;
}

interface EditorApi {
  saveDocument: (payload: { id?: string; name: string; kind: string; xml: string }) => Promise<{ id: string; name?: string }>;
  deleteDocument: (id: string) => Promise<void>;
  getDocument: (id: string) => Promise<{ id: string; name: string; xml: string; kind: string }>;
  listDocuments: () => Promise<EditorDocumentSummary[]>;
}

interface UseDocumentPersistenceOptions {
  editorApi: EditorApi;
  fileHandles: FileHandles;
  setDocuments: (docs: EditorDocumentSummary[]) => void;
  setError: (err: string) => void;
  setResult: (res: string) => void;
  setShowResultModal: (show: boolean) => void;
}

const SAMPLE_LABEL_XML = `<saelabels version="1.0"><template brand="SAE" description="Demo" part="P-1" size="custom"><label_rectangle width_pt="144" height_pt="72" round_pt="0" x_waste_pt="0" y_waste_pt="0" /><layout dx_pt="0" dy_pt="0" nx="1" ny="1" x0_pt="0" y0_pt="0" /></template><objects /><variables /></saelabels>`;
const DEFAULT_TICKET_XML = `<?xml version="1.0" encoding="utf-8"?><saetickets version="1.0"><setup width="42"/><commands/></saetickets>`;
const DEFAULT_DOCUMENT_XML = `<saedocument version="1.0"><metadata/><datasources/><assets/><page width="210" height="297" unit="mm"><header><image source="logo.png" x="10" y="10" width="28" height="28"/><text x="45" y="14" width="120" height="10" font="Arial" size="18" bold="true">Factura Electrónica</text><text x="45" y="26" width="90" height="6" font="Arial" size="9">Consecutivo: \${Factura.Consecutivo}</text><line x1="10" y1="42" x2="200" y2="42"/></header><body><text x="10" y="52" width="90" height="6" font="Arial" size="10" bold="true">Cliente: \${Cliente.Nombre}</text><table source="Factura.Detalles"><column field="Cantidad" header="Cant" width="15"/><column field="Descripcion" header="Descripción" width="90"/><column field="Precio" header="Precio" width="30"/><column field="Total" header="Total" width="30"/></table><text x="140" y="205" width="55" height="6" font="Arial" size="10" bold="true" align="right">TOTAL: \${Factura.Total}</text></body><footer><qr value="\${Factura.Clave}" x="10" y="250" size="28"/><text x="45" y="255" width="145" height="6" font="Arial" size="8">Clave: \${Factura.Clave}</text></footer></page></saedocument>`;

interface PersistenceFns {
  saveDoc(): Promise<void>;
  saveAsDoc(): Promise<void>;
  deleteDocument(id: string): Promise<void>;
  confirmDiscardChanges(): Promise<boolean>;
  loadDocument(id: string): Promise<void>;
  resetDoc(kind: DocKind): void;
}

export function useDocumentPersistence(opts: UseDocumentPersistenceOptions): PersistenceFns {
  const { editorApi, fileHandles, setDocuments, setError, setResult, setShowResultModal } = opts;

  // Store subscriptions (reactive)
  const autoSaveEnabled = useWorkspaceStore((s) => s.autoSaveEnabled);
  const docKind = useWorkspaceStore((s) => s.docKind);

  const labelXml = useWorkspaceStore((s) => s.labelXml);
  const labelDocId = useWorkspaceStore((s) => s.labelDocId);
  const labelDocName = useWorkspaceStore((s) => s.labelDocName);
  const ticketXml = useWorkspaceStore((s) => s.ticketXml);
  const ticketDocId = useWorkspaceStore((s) => s.ticketDocId);
  const ticketDocName = useWorkspaceStore((s) => s.ticketDocName);
  const documentXml = useWorkspaceStore((s) => s.documentXml);
  const documentDocId = useWorkspaceStore((s) => s.documentDocId);
  const documentDocName = useWorkspaceStore((s) => s.documentDocName);

  // Store accessor (non-reactive, for use in callbacks)
  const getStore = useWorkspaceStore.getState;

  // Ref-based latest values for callbacks that depend on reactive state
  const saveStatusRef = useRef(useWorkspaceStore.getState().saveStatus);
  useEffect(() => {
    saveStatusRef.current = useWorkspaceStore.getState().saveStatus;
  });

  // Persistent ref for functions that reference other functions
  const fnRef = useRef<PersistenceFns | null>(null);

  // Build persistence functions
  // Rebuild when store deps change (but using getStore in callbacks avoids stale closures)
  const fns = useCallback((): PersistenceFns => {
    function resetDoc(kind: DocKind) {
      const s = getStore();
      if (kind === "saedocument") {
        s.setDocumentDocId("");
        s.setDocumentDocName("Nuevo Documento");
        s.setDocumentXml(DEFAULT_DOCUMENT_XML);
      } else if (kind === "saetickets") {
        s.setTicketDocId("");
        s.setTicketDocName("Nuevo Tiquete");
        s.setTicketXml(DEFAULT_TICKET_XML);
      } else {
        s.setLabelDocId("");
        s.setLabelDocName("Sin título");
        s.setLabelXml(SAMPLE_LABEL_XML);
      }
    }

    // Defined first because saveDoc references it
    async function saveAsDoc(): Promise<void> {
      const s = getStore();
      const ctx = s.docKind === "saetickets"
        ? { xml: s.ticketXml, docId: s.ticketDocId, docName: s.ticketDocName }
        : s.docKind === "saedocument"
        ? { xml: s.documentXml, docId: s.documentDocId, docName: s.documentDocName }
        : { xml: s.labelXml, docId: s.labelDocId, docName: s.labelDocName };

      if (typeof window !== "undefined" && "showSaveFilePicker" in window) {
        try {
          const ext = s.docKind === "saetickets" ? ".saeticket" : s.docKind === "saedocument" ? ".saedocument" : ".saelabel";
          const desc = s.docKind === "saetickets" ? "SAE Ticket" : s.docKind === "saedocument" ? "SAE Document" : "SAE Label";
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: (ctx.docName || "documento") + ext,
            types: [{ description: desc, accept: { "application/xml": [ext] } }],
          });
          if (s.docKind === "saedocument") fileHandles.setDocument(handle);
          else if (s.docKind === "saetickets") fileHandles.setTicket(handle);
          else fileHandles.setLabel(handle);

          const writable = await handle.createWritable();
          await writable.write(ctx.xml);
          await writable.close();

          const file = await handle.getFile();
          const newName = file.name.replace(/\.(saelabel|saeticket|saedocument|xml)$/i, "");
          if (s.docKind === "saedocument") s.setDocumentDocName(newName);
          else if (s.docKind === "saetickets") s.setTicketDocName(newName);
          else s.setLabelDocName(newName);

          s.setSaveStatus("saved");

          try {
            const res = await editorApi.saveDocument({ id: ctx.docId || undefined, name: ctx.docName, kind: s.docKind, xml: ctx.xml });
            if (!ctx.docId) {
              if (s.docKind === "saedocument") s.setDocumentDocId(res.id);
              else if (s.docKind === "saetickets") s.setTicketDocId(res.id);
              else s.setLabelDocId(res.id);
            }
            editorApi.listDocuments().then(setDocuments).catch(() => {});
          } catch {
            // backend sync is non-critical
          }
          return;
        } catch (e: any) {
          if (e.name === "AbortError") return;
        }
      }

      // Fallback: virtual save as
      const newName = (ctx.docName || "documento") + " (Copia)";
      try {
        const res = await editorApi.saveDocument({ name: newName, kind: s.docKind, xml: ctx.xml });
        if (s.docKind === "saetickets") { s.setTicketDocId(res.id); s.setTicketDocName(res.name || newName); }
        else { s.setLabelDocId(res.id); s.setLabelDocName(res.name || newName); }
        setResult(`Copia "${res.name || newName}" guardada exitosamente.`);
        setShowResultModal(true);
        editorApi.listDocuments().then(setDocuments).catch(() => {});
      } catch {
        setError("No se pudo guardar como.");
      }
    }

    async function saveDoc(): Promise<void> {
      const s = getStore();
      s.setSaveStatus("saving");
      const ctx = s.docKind === "saetickets"
        ? { xml: s.ticketXml, docId: s.ticketDocId, docName: s.ticketDocName }
        : s.docKind === "saedocument"
        ? { xml: s.documentXml, docId: s.documentDocId, docName: s.documentDocName }
        : { xml: s.labelXml, docId: s.labelDocId, docName: s.labelDocName };
      const fh = s.docKind === "saedocument" ? fileHandles.document : s.docKind === "saetickets" ? fileHandles.ticket : fileHandles.label;

      if (!fh) { await saveAsDoc(); return; }

      try {
        const writable = await (fh as any).createWritable();
        await writable.write(ctx.xml);
        await writable.close();

        const res = await editorApi.saveDocument({ id: ctx.docId || undefined, name: ctx.docName, kind: s.docKind, xml: ctx.xml });
        if (!ctx.docId) {
          if (s.docKind === "saedocument") s.setDocumentDocId(res.id);
          else if (s.docKind === "saetickets") s.setTicketDocId(res.id);
          else s.setLabelDocId(res.id);
        }
        s.setSaveStatus("saved");
        editorApi.listDocuments().then(setDocuments).catch(() => {});
      } catch {
        s.setSaveStatus("error");
        setError("Error al guardar archivo.");
      }
    }

    async function deleteDocument(id: string): Promise<void> {
      if (!window.confirm("¿Estás seguro de que deseas eliminar este documento?")) return;
      try {
        await editorApi.deleteDocument(id);
        const s = getStore();
        const docId = s.docKind === "saetickets"
          ? s.ticketDocId : s.docKind === "saedocument"
          ? s.documentDocId : s.labelDocId;
        if (docId === id) resetDoc(s.docKind);
        editorApi.listDocuments().then(setDocuments).catch(() => {});
      } catch {
        setError("Error al eliminar.");
      }
    }

    async function confirmDiscardChanges(): Promise<boolean> {
      if (saveStatusRef.current !== "modified") return true;
      const saveFirst = window.confirm(
        "Tienes cambios sin guardar. ¿Deseas guardarlos antes de continuar?\n\nAceptar: Guardar y continuar\nCancelar: Descartar cambios y continuar (o cerrar este mensaje para volver)"
      );
      if (saveFirst) { await saveDoc(); return saveStatusRef.current !== "modified"; }
      return window.confirm("¿Seguro que deseas descartar los cambios actuales?");
    }

    async function loadDocument(id: string): Promise<void> {
      if (!(await confirmDiscardChanges())) return;
      try {
        const full = await editorApi.getDocument(id);
        const kind = full.kind as DocKind;
        const s = getStore();
        s.setDocKind(kind);
        if (kind === "saedocument") {
          s.setDocumentDocId(full.id); s.setDocumentDocName(full.name); s.setDocumentXml(full.xml);
          fileHandles.setDocument(null);
        } else if (kind === "saetickets") {
          s.setTicketDocId(full.id); s.setTicketDocName(full.name); s.setTicketXml(full.xml);
          fileHandles.setTicket(null);
        } else {
          s.setLabelDocId(full.id); s.setLabelDocName(full.name); s.setLabelXml(full.xml);
          fileHandles.setLabel(null);
        }
      } catch { setError("Error al cargar documento."); }
    }

    return { saveDoc, saveAsDoc, deleteDocument, confirmDiscardChanges, loadDocument, resetDoc };
  }, [editorApi, fileHandles, setDocuments, setError, setResult, setShowResultModal, getStore]);

  fnRef.current = fns();

  // Initial document list load
  useEffect(() => {
    editorApi.listDocuments().then(setDocuments).catch(() => {});
  }, [editorApi, setDocuments]);

  // Auto-save Label
  useEffect(() => {
    if (!autoSaveEnabled || !labelXml) return;
    const s = getStore();
    s.setSaveStatus("modified");
    const timer = setTimeout(async () => {
      try {
        getStore().setSaveStatus("saving");
    await editorApi.saveDocument({ id: labelDocId || undefined, name: labelDocName, kind: docKind === "saetickets" ? "sae" : docKind, xml: labelXml });
        getStore().setSaveStatus("saved");
      } catch { getStore().setSaveStatus("error"); }
    }, 2000);
    return () => clearTimeout(timer);
  }, [labelXml, labelDocId, labelDocName, autoSaveEnabled, docKind, editorApi, getStore]);

  // Auto-save Ticket
  useEffect(() => {
    if (!autoSaveEnabled || !ticketXml) return;
    const s = getStore();
    s.setSaveStatus("modified");
    const timer = setTimeout(async () => {
      try {
        getStore().setSaveStatus("saving");
        await editorApi.saveDocument({ id: ticketDocId || undefined, name: ticketDocName, kind: "saetickets", xml: ticketXml });
        getStore().setSaveStatus("saved");
      } catch { getStore().setSaveStatus("error"); }
    }, 2000);
    return () => clearTimeout(timer);
  }, [ticketXml, ticketDocId, ticketDocName, autoSaveEnabled, editorApi, getStore]);

  // Auto-save Document
  useEffect(() => {
    if (!autoSaveEnabled || !documentXml) return;
    const s = getStore();
    s.setSaveStatus("modified");
    const timer = setTimeout(async () => {
      try {
        getStore().setSaveStatus("saving");
        const res = await editorApi.saveDocument({ id: documentDocId || undefined, name: documentDocName, kind: "saedocument", xml: documentXml });
        if (!documentDocId) getStore().setDocumentDocId(res.id);
        getStore().setSaveStatus("saved");
      } catch { getStore().setSaveStatus("error"); }
    }, 2000);
    return () => clearTimeout(timer);
  }, [documentXml, documentDocId, documentDocName, autoSaveEnabled, editorApi, getStore]);

  return fnRef.current!;
}
