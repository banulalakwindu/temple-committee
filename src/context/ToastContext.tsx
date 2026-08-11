import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ToastTone = "success" | "error" | "info";

type Toast = {
  id: number;
  message: string;
  tone: ToastTone;
};

type NotifyOptions = {
  tone?: ToastTone;
  scrollTop?: boolean;
};

type ToastContextValue = {
  notify: (message: string, options?: NotifyOptions) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let toastId = 0;

export function scrollPageToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
  document.documentElement.scrollTo({ top: 0, behavior: "smooth" });
  document.body.scrollTo({ top: 0, behavior: "smooth" });
  for (const sel of [".admin-content", ".admin-main", ".public-main", ".app-root"]) {
    const el = document.querySelector(sel);
    if (el instanceof HTMLElement) {
      el.scrollTo({ top: 0, behavior: "smooth" });
    }
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((message: string, options?: NotifyOptions) => {
    const tone = options?.tone ?? "success";
    const scrollTop = options?.scrollTop ?? tone === "success";
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, tone }]);
    if (scrollTop) scrollPageToTop();
  }, []);

  useEffect(() => {
    if (!toasts.length) return;
    const latest = toasts[toasts.length - 1];
    const timer = window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== latest.id));
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [toasts]);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack no-print" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.tone}`} role="status">
            <span>{toast.message}</span>
            <button
              type="button"
              className="toast-close"
              aria-label="Close"
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast requires ToastProvider");
  return ctx;
}
