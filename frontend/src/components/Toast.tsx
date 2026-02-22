"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

// ─── types ────────────────────────────────────────────────────────
type ToastVariant = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
  link?: { label: string; href: string };
}

interface ToastContextValue {
  toast: (
    message: string,
    variant?: ToastVariant,
    link?: Toast["link"]
  ) => void;
}

// ─── context ──────────────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
});

export const useToast = () => useContext(ToastContext);

// ─── icons ────────────────────────────────────────────────────────
function CheckIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function XCircleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// ─── toast item ───────────────────────────────────────────────────
const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: "border-green-800/60 bg-green-950/90 text-green-400",
  error: "border-red-800/60 bg-red-950/90 text-red-400",
  info: "border-blue-800/60 bg-blue-950/90 text-blue-400",
};

function ToastItem({
  toast: t,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: number) => void;
}) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setExiting(true), 4500);
    const remove = setTimeout(() => onDismiss(t.id), 5000);
    return () => {
      clearTimeout(timer);
      clearTimeout(remove);
    };
  }, [t.id, onDismiss]);

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-sm transition-all duration-300 ${
        VARIANT_STYLES[t.variant]
      } ${exiting ? "translate-x-full opacity-0" : "translate-x-0 opacity-100"}`}
    >
      <span className="mt-0.5 shrink-0">
        {t.variant === "success" && <CheckIcon />}
        {t.variant === "error" && <XCircleIcon />}
        {t.variant === "info" && <InfoIcon />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug">{t.message}</p>
        {t.link && (
          <a
            href={t.link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-xs underline opacity-80 hover:opacity-100"
          >
            {t.link.label}
          </a>
        )}
      </div>
      <button
        onClick={() => onDismiss(t.id)}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M1 1l12 12M13 1L1 13" />
        </svg>
      </button>
    </div>
  );
}

// ─── provider ─────────────────────────────────────────────────────
let _nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (
      message: string,
      variant: ToastVariant = "info",
      link?: Toast["link"]
    ) => {
      const id = ++_nextId;
      setToasts((prev) => [...prev, { id, message, variant, link }]);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      {/* Toast container — bottom-right */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)] pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
