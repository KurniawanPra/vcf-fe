"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  loading?: boolean;
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Hapus Data",
  message = "Apakah Anda yakin ingin menghapus data ini?",
  loading = false,
}: DeleteConfirmModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      document.body.style.overflow = "hidden";
      window.dispatchEvent(new CustomEvent("modal-open"));
    } else {
      setTimeout(() => setMounted(false), 200);
      document.body.style.overflow = "unset";
      window.dispatchEvent(new CustomEvent("modal-close"));
    }
    return () => { 
      document.body.style.overflow = "unset";
      window.dispatchEvent(new CustomEvent("modal-close"));
    };
  }, [isOpen]);

  if (!isOpen && !mounted) return null;

  return createPortal(
    <div 
      className={`modal-overlay ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      onClick={onClose}
    >
      <div 
        className={`modal-content max-w-sm transition-all duration-200 transform ${isOpen ? "scale-100 translate-y-0" : "scale-95 translate-y-4"}`}
        onClick={(e) => e.stopPropagation()}
        style={{ padding: 0 }}
      >
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded flex items-center justify-center flex-shrink-0" style={{ background: "rgba(220,38,38,0.1)", color: "#dc2626" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{title}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Tindakan ini permanen</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {message}
          </p>
        </div>

        <div className="px-6 py-4 flex flex-col gap-2">
          <button
            onClick={onConfirm}
            disabled={loading}
            className="btn btn-danger w-full"
          >
            {loading ? "Menghapus..." : "Ya, Hapus Data"}
          </button>
          
          <button
            onClick={onClose}
            disabled={loading}
            className="btn btn-secondary w-full"
          >
            Batal
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
