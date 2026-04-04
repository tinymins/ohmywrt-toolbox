import { ToastProvider, useToast } from "@acme/components";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { registerToastCallback } from "@/lib/message";

function ToastBridge() {
  const toast = useToast();
  useEffect(() => {
    registerToastCallback(({ type, content }) => {
      const method = toast[type as keyof typeof toast];
      if (typeof method === "function") {
        (method as (o: string) => void)(content);
      }
    });
  }, [toast]);
  return null;
}

export function MessageProvider({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ToastBridge />
      {children}
    </ToastProvider>
  );
}
