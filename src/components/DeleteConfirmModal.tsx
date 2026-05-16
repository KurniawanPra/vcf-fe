"use client";

import { useEffect, useState } from "react";

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
  title = "Konfirmasi Hapus",
  message = "Apakah Anda yakin ingin menghapus data ini secara permanen? Tindakan ini tidak dapat dibatalkan.",
  loading = false,
}: DeleteConfirmModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      document.body.style.overflow = "hidden";
    } else {
      setTimeout(() => setMounted(false), 300);
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  if (!isOpen && !mounted) return null;

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-300 ${
        isOpen ? "opacity-100 backdrop-blur-sm" : "opacity-0 pointer-events-none"
      }`}
      style={{ background: "rgba(0, 0, 0, 0.4)" }}
      onClick={onClose}
    >
      <div 
        className={`w-full max-w-md overflow-hidden rounded-[2rem] border border-white/20 bg-white dark:bg-slate-900 shadow-2xl transition-all duration-500 transform ${
          isOpen ? "scale-100 translate-y-0" : "scale-90 translate-y-10"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Section with Red Gradient */}
        <div className="relative overflow-hidden bg-[conic-gradient(at_top_left,_#ef4444,_#be123c,_#881337)] p-8 text-white">
          <div className="relative z-10">
            <div className="mb-4 flex w-16 items-center justify-center rounded-full backdrop-blur-md animate-bounce-subtle">
              {/* <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
              </svg> */}
            </div>
            <h2 className="text-2xl font-black tracking-tight leading-tight">{title}</h2>
            <p className="mt-2 text-sm font-medium text-red-50/80 leading-relaxed">
              {message}
            </p>
          </div>
          
          {/* Decorative Circles */}
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -left-12 -bottom-12 h-40 w-40 rounded-full bg-black/10 blur-3xl" />
        </div>

        {/* Action Section */}
        <div className="p-8">
          <div className="flex flex-row gap-3">
            <button
              onClick={onConfirm}
              disabled={loading}
              className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-[conic-gradient(at_top_left,_#ef4444,_#be123c,_#881337)] py-4 font-bold text-white shadow-xl shadow-red-500/30 transition-all hover:bg-red-600 hover:-translate-y-1 active:translate-y-0 disabled:opacity-70 disabled:pointer-events-none"
            >
              <span className="relative z-10 flex items-center gap-2">
                {loading ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    MENGHAPUS...
                  </>
                ) : (
                  "Hapus Data"
                )}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </button>
            
            <button
              onClick={onClose}
              disabled={loading}
              className="w-full py-4 rounded-2xl font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-all active:scale-95 disabled:opacity-50"
            >
              BATALKAN
            </button>
          </div>
          
          <p className="mt-6 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">
            Tindakan ini bersifat permanen
          </p>
        </div>
      </div>
    </div>
  );
}
