"use client";

import { createContext, useContext, useState, useCallback, ReactNode, useRef } from "react";

export type ToastType = "success" | "error" | "info";

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  messages: ToastMessage[];
  showToast: (message: string, type?: ToastType) => void;
  dismissToast: () => void;
}

const ToastContext = createContext<ToastContextValue>({
  messages: [],
  showToast: () => {},
  dismissToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissToast = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setMessages([]);
  }, []);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = nextId++;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setMessages([{ id, message, type }]);
    timeoutRef.current = setTimeout(() => {
      setMessages((prev) => prev.filter((m) => m.id !== id));
      timeoutRef.current = null;
    }, 10000);
  }, []);

  return (
    <ToastContext.Provider value={{ messages, showToast, dismissToast }}>
      {children}
    </ToastContext.Provider>
  );
}
