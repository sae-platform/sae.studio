import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type NotificationType = "info" | "success" | "warning" | "error";

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  timestamp: number;
  data?: unknown;
};

type NotificationContextValue = {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (type: NotificationType, title: string, message: string, data?: unknown) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

const STORAGE_KEY = "sae_studio_notifications";
const MAX_NOTIFICATIONS = 50;

function loadNotifications(): Notification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveNotifications(notifications: Notification[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, MAX_NOTIFICATIONS)));
  } catch {
    // localStorage unavailable
  }
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(loadNotifications);

  const unreadCount = notifications.filter((n: Notification) => !n.read).length;

  const addNotification = useCallback(
    (type: NotificationType, title: string, message: string, data?: unknown) => {
      const notification: Notification = {
        id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
        type,
        title,
        message,
        read: false,
        timestamp: Date.now(),
        data,
      };
      setNotifications((prev: Notification[]) => {
        const next = [notification, ...prev].slice(0, MAX_NOTIFICATIONS);
        saveNotifications(next);
        return next;
      });
    },
    [],
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev: Notification[]) => {
      const next = prev.map((n: Notification) => (n.id === id ? { ...n, read: true } : n));
      saveNotifications(next);
      return next;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev: Notification[]) => {
      const next = prev.map((n: Notification) => ({ ...n, read: true }));
      saveNotifications(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    saveNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearAll }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return ctx;
}
