import { useEffect, type Dispatch, type SetStateAction } from "react";
import type { DocKind } from "../stores";

interface UseGlobalKeyboardParams {
  docKind: DocKind;
  saveDoc: () => void;
  propertiesModalOpen: boolean;
  setPropertiesModalOpen: Dispatch<SetStateAction<boolean>>;
  showNewConfigModal: boolean;
  setShowNewConfigModal: Dispatch<SetStateAction<boolean>>;
  showNewTypeModal: boolean;
  setShowNewTypeModal: Dispatch<SetStateAction<boolean>>;
  showApiConfigModal: boolean;
  setShowApiConfigModal: Dispatch<SetStateAction<boolean>>;
  showOpenDocModal: boolean;
  setShowOpenDocModal: Dispatch<SetStateAction<boolean>>;
  showResultModal: boolean;
  setShowResultModal: Dispatch<SetStateAction<boolean>>;
  showTemplatesGallery: boolean;
  setShowTemplatesGallery: Dispatch<SetStateAction<boolean>>;
  showAboutModal: boolean;
  setShowAboutModal: Dispatch<SetStateAction<boolean>>;
  showPrintersManagerModal: boolean;
  setShowPrintersManagerModal: Dispatch<SetStateAction<boolean>>;
}

export function useGlobalKeyboard(params: UseGlobalKeyboardParams) {
  const {
    docKind, saveDoc,
    propertiesModalOpen, setPropertiesModalOpen,
    showNewConfigModal, setShowNewConfigModal,
    showNewTypeModal, setShowNewTypeModal,
    showApiConfigModal, setShowApiConfigModal,
    showOpenDocModal, setShowOpenDocModal,
    showResultModal, setShowResultModal,
    showTemplatesGallery, setShowTemplatesGallery,
    showAboutModal, setShowAboutModal,
    showPrintersManagerModal, setShowPrintersManagerModal,
  } = params;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toUpperCase();
      const isTyping = tag === "TEXTAREA";

      // Ctrl shortcuts (always active)
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveDoc();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "p" && docKind === "saetickets") {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent("ticket-trigger-print"));
        return;
      }

      // Modal keyboard shortcuts
      const anyModalOpen =
        propertiesModalOpen || showNewConfigModal ||
        showNewTypeModal || showApiConfigModal || showOpenDocModal ||
        showResultModal || showTemplatesGallery || showAboutModal || showPrintersManagerModal;

      if (!anyModalOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        if (propertiesModalOpen)     { setPropertiesModalOpen(false); return; }
        if (showNewConfigModal)      { setShowNewConfigModal(false); return; }
        if (showNewTypeModal)        { setShowNewTypeModal(false); return; }
        if (showApiConfigModal)      { setShowApiConfigModal(false); return; }
        if (showOpenDocModal)        { setShowOpenDocModal(false); return; }
        if (showResultModal)         { setShowResultModal(false); return; }
        if (showTemplatesGallery)    { setShowTemplatesGallery(false); return; }
        if (showAboutModal)          { setShowAboutModal(false); return; }
        if (showPrintersManagerModal){ setShowPrintersManagerModal(false); return; }
      }

      if (e.key === "Enter" && !isTyping) {
        e.preventDefault();
        if (showNewConfigModal) {
          (document.querySelector(".modalCard button.primary") as HTMLButtonElement)?.click();
          return;
        }
        if (showApiConfigModal) {
          (document.querySelector(".modalCard button.primary") as HTMLButtonElement)?.click();
          return;
        }
        if (showResultModal || showAboutModal) {
          setShowResultModal(false);
          setShowAboutModal(false);
          return;
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    docKind, saveDoc,
    propertiesModalOpen, setPropertiesModalOpen,
    showNewConfigModal, setShowNewConfigModal,
    showNewTypeModal, setShowNewTypeModal,
    showApiConfigModal, setShowApiConfigModal,
    showOpenDocModal, setShowOpenDocModal,
    showResultModal, setShowResultModal,
    showTemplatesGallery, setShowTemplatesGallery,
    showAboutModal, setShowAboutModal,
    showPrintersManagerModal, setShowPrintersManagerModal,
  ]);
}
