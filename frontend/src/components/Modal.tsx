"use client";

import { useEffect, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ open, onClose, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

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
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-3xl bg-cv-card p-7 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]">
        {children}
      </div>
    </div>
  );
}

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
      <h3 className="text-lg font-semibold text-cv-text1 mb-4">{title}</h3>
      <div className="text-sm text-cv-text2 mb-6">{children}</div>
      <div className="flex gap-3">
        <button
          onClick={onClose}
          disabled={busy}
          className="flex-1 rounded-2xl bg-cv-elevated py-3 text-sm font-medium text-cv-text2 hover:bg-cv-module hover:text-cv-text1 transition-all duration-200 disabled:opacity-30"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={busy}
          className={`flex-1 rounded-2xl py-3 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-30 ${
            confirmVariant === "green"
              ? "bg-cv-green hover:brightness-110"
              : "bg-cv-red hover:brightness-110"
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
