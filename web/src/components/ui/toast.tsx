import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { ToastKind, ToastMessage } from "../../types/toast";

interface ToastApi { showToast: (text: string, kind?: ToastKind) => void; }
const ToastContext = createContext<ToastApi | null>(null);
let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  // Stable function: the timer lives here, so a re-render can never restart it.
  const showToast = useCallback((text: string, kind: ToastKind = "success") => {
    const id = nextId++;
    setToasts((t) => [...t, { id, kind, text }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);
  const api = useMemo(() => ({ showToast }), [showToast]);
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div role="status" aria-live="polite" className="fixed inset-x-3 bottom-3 z-50 flex flex-col gap-2 sm:left-auto sm:w-96">
        {toasts.map((t) => (
          <p key={t.id} className={`border-2 bg-paper px-4 py-3 font-semibold ${t.kind === "error" ? "border-magenta text-magenta" : "border-bottle text-ink"}`}>
            {t.kind === "error" ? "Problem: " : "Done: "}{t.text}
          </p>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
