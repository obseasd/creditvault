"use client";

import { useEffect, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ open, onClose, children }: ModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Content */}
      <div className="relative w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {children}
      </div>
    </div>
  );
}

// ─── Confirmation variant ─────────────────────────────────────────
interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  confirmVariant?: "green" | "red";
  busy?: boolean;
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  children,
  confirmLabel = "Confirm",
  confirmVariant = "green",
  busy = false,
}: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose}>
      <h3 className="text-lg font-bold text-white mb-3">{title}</h3>
      <div className="text-sm text-gray-400 mb-6">{children}</div>
      <div className="flex gap-3">
        <button
          onClick={onClose}
          disabled={busy}
          className="flex-1 rounded-xl border border-gray-700 py-2.5 text-sm font-medium text-gray-400 hover:border-gray-500 hover:text-white transition-colors disabled:opacity-40"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={busy}
          className={`flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-40 ${
            confirmVariant === "green"
              ? "bg-green-600 hover:bg-green-500"
              : "bg-red-600 hover:bg-red-500"
          }`}
        >
          {busy ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Processing...
            </span>
          ) : (
            confirmLabel
          )}
        </button>
      </div>
    </Modal>
  );
}
