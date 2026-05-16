"use client";

import { useEffect, useState } from "react";

interface ImportResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  success: number;
  failed: number;
  errors: string[];
  title?: string;
}

export default function ImportResultModal({
  isOpen,
  onClose,
  success,
  failed,
  errors,
  title = "Hasil Import",
}: ImportResultModalProps) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowDetails(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const hasErrors = errors.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div
        className="w-full max-w-md rounded-xl border shadow-2xl"
        style={{ background: "var(--bg-primary)", borderColor: "var(--border)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2">
            {failed === 0 ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            ) : success === 0 ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="m15 9-6 6M9 9l6 6" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
            )}
            <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ color: "var(--text-muted)" }}
            className="hover:opacity-70 transition-opacity"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-5">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div
              className="rounded-lg p-3 text-center"
              style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}
            >
              <div className="text-2xl font-bold" style={{ color: "#22c55e" }}>
                {success}
              </div>
              <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Berhasil
              </div>
            </div>
            <div
              className="rounded-lg p-3 text-center"
              style={{ background: failed > 0 ? "rgba(239,68,68,0.1)" : "rgba(148,163,184,0.1)", border: failed > 0 ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(148,163,184,0.3)" }}
            >
              <div className="text-2xl font-bold" style={{ color: failed > 0 ? "#ef4444" : "#94a3b8" }}>
                {failed}
              </div>
              <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Gagal
              </div>
            </div>
          </div>

          {/* Error Details */}
          {hasErrors && (
            <div className="mt-4">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-2 text-sm mb-2"
                style={{ color: "#ef4444" }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`transition-transform ${showDetails ? "rotate-180" : ""}`}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
                Detail Error ({errors.length})
              </button>
              {showDetails && (
                <div
                  className="rounded-lg p-3 text-sm overflow-y-auto max-h-40"
                  style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)" }}
                >
                  <ul className="space-y-1">
                    {errors.slice(0, 10).map((error, idx) => (
                      <li key={idx} style={{ color: "#ef4444" }} className="text-xs">
                        • {error}
                      </li>
                    ))}
                    {errors.length > 10 && (
                      <li style={{ color: "var(--text-muted)" }} className="text-xs italic">
                        ... dan {errors.length - 10} error lainnya
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {success > 0 && failed === 0 && (
            <div
              className="rounded-lg p-3 text-sm text-center"
              style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}
            >
              Semua data berhasil diimport!
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t flex justify-end" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
            style={{ background: "var(--primary)", color: "white" }}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
