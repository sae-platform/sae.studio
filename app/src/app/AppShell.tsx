import { type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { queryClient } from "@/infrastructure/api";
import { NotificationProvider } from "./NotificationContext";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--surface, #fff)",
              color: "var(--text, #111827)",
              border: "1px solid var(--border, #e5e7eb)",
            },
          }}
        />
      </NotificationProvider>
    </QueryClientProvider>
  );
}
