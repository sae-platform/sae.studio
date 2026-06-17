import { create } from "zustand";
import { devtools } from "zustand/middleware";

type TabName = "properties" | "layers" | "variables" | "preview";

interface UIState {
  activeRightTab: TabName;
  tabOrder: TabName[];
  leftSidebarWidth: number;
  rightSidebarWidth: number;
  sidebarEditMode: boolean;
  status: string;
  showHelpModal: boolean;
  showPrintModal: boolean;
  showPrintersManagerModal: boolean;
  showElementModal: boolean;
  isBoardDragOver: boolean;
  editingElementId: string;
  darkMode: boolean;
}

interface UIActions {
  setActiveRightTab: (tab: TabName) => void;
  setTabOrder: (order: TabName[]) => void;
  setLeftSidebarWidth: (w: number) => void;
  setRightSidebarWidth: (w: number) => void;
  setSidebarEditMode: (enabled: boolean) => void;
  setStatus: (status: string) => void;
  setShowHelpModal: (show: boolean) => void;
  setShowPrintModal: (show: boolean) => void;
  setShowPrintersManagerModal: (show: boolean) => void;
  setShowElementModal: (show: boolean) => void;
  setIsBoardDragOver: (over: boolean) => void;
  setEditingElementId: (id: string) => void;
  setDarkMode: (dark: boolean) => void;
  restoreSidebars: () => void;
  reset: () => void;
}

type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>()(
  devtools(
    (set) => ({
      activeRightTab: "properties",
      tabOrder: ["properties", "layers", "variables", "preview"],
      leftSidebarWidth: 300,
      rightSidebarWidth: 300,
      sidebarEditMode: false,
      status: "",
      showHelpModal: false,
      showPrintModal: false,
      showPrintersManagerModal: false,
      showElementModal: false,
      isBoardDragOver: false,
      editingElementId: "",
      darkMode: false,

      setActiveRightTab: (activeRightTab) => set({ activeRightTab }),
      setTabOrder: (tabOrder) => set({ tabOrder }),
      setLeftSidebarWidth: (leftSidebarWidth) => set({ leftSidebarWidth }),
      setRightSidebarWidth: (rightSidebarWidth) => set({ rightSidebarWidth }),
      setSidebarEditMode: (sidebarEditMode) => set({ sidebarEditMode }),
      setStatus: (status) => set({ status }),
      setShowHelpModal: (showHelpModal) => set({ showHelpModal }),
      setShowPrintModal: (showPrintModal) => set({ showPrintModal }),
      setShowPrintersManagerModal: (showPrintersManagerModal) => set({ showPrintersManagerModal }),
      setShowElementModal: (showElementModal) => set({ showElementModal }),
      setIsBoardDragOver: (isBoardDragOver) => set({ isBoardDragOver }),
      setEditingElementId: (editingElementId) => set({ editingElementId }),
      setDarkMode: (darkMode) => set({ darkMode }),
      restoreSidebars: () => set({ leftSidebarWidth: 300, rightSidebarWidth: 300 }),
      reset: () => set({
        activeRightTab: "properties", tabOrder: ["properties", "layers", "variables", "preview"],
        leftSidebarWidth: 300, rightSidebarWidth: 300, sidebarEditMode: false,
        status: "", showHelpModal: false, showPrintModal: false, showPrintersManagerModal: false,
        showElementModal: false, isBoardDragOver: false, editingElementId: "",
      }),
    }),
    { name: "ui-store" },
  ),
);
