"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";


interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export default function LogoutConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
}: LogoutConfirmModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      document.body.style.overflow = "hidden";
      window.dispatchEvent(new CustomEvent("modal-open"));
    } else {
      const timer = setTimeout(() => setMounted(false), 300);
      document.body.style.overflow = "unset";
      window.dispatchEvent(new CustomEvent("modal-close"));
      return () => clearTimeout(timer);
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
        className={`modal-content transition-all duration-300 transform ${isOpen ? "scale-100 translate-y-0 opacity-100" : "scale-95 translate-y-4 opacity-0"}`}
        onClick={(e) => e.stopPropagation()}
        style={{ width: "440px", maxWidth: "90vw", padding: "24px" }}
      >
        <h3 className="text-lg font-bold mb-2 text-center" style={{ color: "var(--text-primary)" }}>Keluar dari sistem?</h3>
        <p className="text-sm text-center mb-6" style={{ color: "var(--text-secondary)" }}>
          Sesi Anda akan diakhiri dan Anda harus masuk kembali.
        </p>

        <div className="flex flex-col gap-2">
          <button
            onClick={onConfirm}
            disabled={loading}
            className="btn btn-danger w-full justify-center h-10"
          >
            {loading ? "Memproses..." : "Ya, keluar"}
          </button>

          <button
            onClick={onClose}
            disabled={loading}
            className="btn btn-secondary w-full justify-center h-10"
          >
            Batal
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}