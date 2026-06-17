import { useState, useEffect, useCallback } from "react";

type MenuState = {
  activeMenu: string | null;
  activeSubMenu: string | null;
};

export function useMenuManager(onRefreshDocuments: () => void) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);

  const closeAllMenus = useCallback(() => {
    setActiveMenu(null);
    setActiveSubMenu(null);
    if (typeof document !== "undefined") {
      document.querySelectorAll(".appMenu details[open]").forEach((el) => {
        (el as HTMLDetailsElement).open = false;
      });
    }
  }, []);

  const toggleMenu = useCallback(
    (menuName: string) => {
      setActiveMenu((prev) => (prev === menuName ? null : menuName));
      setActiveSubMenu(null);
      if (menuName === "archivo") {
        onRefreshDocuments();
      }
    },
    [onRefreshDocuments],
  );

  const toggleSubMenu = useCallback((subMenuName: string) => {
    setActiveSubMenu((prev) => (prev === subMenuName ? null : subMenuName));
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".appMenu")) {
        closeAllMenus();
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [closeAllMenus]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".appMenu details")) {
        closeAllMenus();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [closeAllMenus]);

  return { activeMenu, activeSubMenu, toggleMenu, toggleSubMenu, closeAllMenus };
}
