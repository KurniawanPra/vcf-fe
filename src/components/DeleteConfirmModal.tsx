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
    } else {
      setTimeout(() => setMounted(false), 200);
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  if (!isOpen && !mounted) return null;

  return createPortal(
    <div 
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-200 ${
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      style={{ background: "rgba(15, 23, 42, 0.8)" }}
      onClick={onClose}
    >
      <div 
        className={`w-full max-w-md overflow-hidden rounded-2xl border-2 border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 transition-all duration-200 ${
          isOpen ? "scale-100" : "scale-95"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight mb-1">{title}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
            {message}
          </p>
        </div>

        <div className="px-6 pb-6 space-y-4">
          <div className="flex gap-3 pt-2">
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-[2] py-2.5 rounded-xl font-bold text-red-500 border-2 border-red-500/30 hover:border-red-500 hover:bg-red-500/5 transition-all text-xs disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? "Menghapus..." : "Hapus"}
            </button>
            
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl font-bold text-slate-500 border-2 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 transition-colors text-xs disabled:opacity-50"
            >
              Batal
            </button>
          </div>
          
          <p className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">
            Tindakan ini bersifat permanen
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
