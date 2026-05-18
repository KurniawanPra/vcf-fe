"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

const TOAST_CONFIG: Record<ToastType, {
  barColor: string;
  labelColor: string;
  icon: JSX.Element;
}> = {
  success: {
    barColor: "#10b981",
    labelColor: "#10b981",
    icon: (
      <svg className="w-6 h-6 text-white fill-current" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 3.33331C10.8 3.33331 3.33337 10.8 3.33337 20C3.33337 29.2 10.8 36.6666 20 36.6666C29.2 36.6666 36.6667 29.2 36.6667 20C36.6667 10.8 29.2 3.33331 20 3.33331ZM16.6667 28.3333L8.33337 20L10.6834 17.65L16.6667 23.6166L29.3167 10.9666L31.6667 13.3333L16.6667 28.3333Z" />
      </svg>
    ),
  },
  error: {
    barColor: "#ef4444",
    labelColor: "#ef4444",
    icon: (
      <svg className="w-6 h-6 text-white fill-current" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 3.36667C10.8167 3.36667 3.3667 10.8167 3.3667 20C3.3667 29.1833 10.8167 36.6333 20 36.6333C29.1834 36.6333 36.6334 29.1833 36.6334 20C36.6334 10.8167 29.1834 3.36667 20 3.36667ZM19.1334 33.3333V22.9H13.3334L21.6667 6.66667V17.1H27.25L19.1334 33.3333Z" />
      </svg>
    ),
  },
  info: {
    barColor: "#3b82f6",
    labelColor: "#3b82f6",
    icon: (
      <svg className="w-6 h-6 text-white fill-current" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 3.33331C10.8 3.33331 3.33337 10.8 3.33337 20C3.33337 29.2 10.8 36.6666 20 36.6666C29.2 36.6666 36.6667 29.2 36.6667 20C36.6667 10.8 29.2 3.33331 20 3.33331ZM21.6667 28.3333H18.3334V25H21.6667V28.3333ZM21.6667 21.6666H18.3334V11.6666H21.6667V21.6666Z" />
      </svg>
    ),
  },
  warning: {
    barColor: "#f59e0b",
    labelColor: "#f59e0b",
    icon: (
      <svg className="w-6 h-6 text-white fill-current" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 3.33331C10.8 3.33331 3.33337 10.8 3.33337 20C3.33337 29.2 10.8 36.6666 20 36.6666C29.2 36.6666 36.6667 29.2 36.6667 20C36.6667 10.8 29.2 3.33331 20 3.33331ZM21.6667 28.3333H18.3334V25H21.6667V28.3333ZM21.6667 21.6666H18.3334V11.6666H21.6667V21.6666Z" />
      </svg>
    ),
  },
};

const TYPE_LABEL: Record<ToastType, string> = {
  success: "Success",
  error: "Error",
  info: "Info",
  warning: "Warning",
};

const DURATION = 4000;

function ToastBadge({ toast, onRemove }: { toast: ToastItem; onRemove: (id: string) => void }) {
  const [phase, setPhase] = useState<"enter" | "idle" | "leave">("enter");
  const [progress, setProgress] = useState(100);

  const cfg = TOAST_CONFIG[toast.type];

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("idle"), 30);

    const start = Date.now();
    let rafId: number;
    const tick = () => {
      const elapsed = Date.now() - start;
      const pct = Math.max(0, 100 - (elapsed / DURATION) * 100);
      setProgress(pct);
      if (pct > 0) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    const t2 = setTimeout(() => {
      setPhase("leave");
      setTimeout(() => onRemove(toast.id), 400);
    }, DURATION);

    return () => { clearTimeout(t1); clearTimeout(t2); cancelAnimationFrame(rafId); };
  }, [toast.id, onRemove]);

  const transform =
    phase === "enter" ? "translateX(calc(100% + 40px)) scale(0.92)" :
    phase === "leave" ? "translateX(calc(100% + 40px)) scale(0.95)" :
    "translateX(0) scale(1)";

  const opacity = phase === "idle" ? 1 : 0;

  const transition =
    phase === "enter"
      ? "none"
      : phase === "idle"
      ? "transform 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease"
      : "transform 0.38s cubic-bezier(0.55, 0, 1, 0.45), opacity 0.3s ease";

  return (
    <div
      style={{
        transform,
        opacity,
        transition,
        display: "flex",
        width: "100%",
        maxWidth: "360px",
        overflow: "hidden",
        background: "#ffffff",
        borderRadius: "10px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)",
        pointerEvents: "all",
        position: "relative",
      }}
    >
      {/* Left colored bar + icon */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "48px",
        flexShrink: 0,
        background: cfg.barColor,
      }}>
        {cfg.icon}
      </div>

      {/* Content */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flex: 1,
        padding: "10px 14px",
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            fontWeight: 600,
            fontSize: "14px",
            color: cfg.labelColor,
            display: "block",
            lineHeight: 1.3,
          }}>
            {toast.title || TYPE_LABEL[toast.type]}
          </span>
          {toast.message && (
            <p style={{
              fontSize: "13px",
              color: "#4b5563",
              margin: "2px 0 0",
              lineHeight: 1.45,
              wordBreak: "break-word",
            }}>
              {toast.message}
            </p>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={() => { setPhase("leave"); setTimeout(() => onRemove(toast.id), 350); }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#9ca3af",
            padding: "4px",
            lineHeight: 0,
            flexShrink: 0,
            marginLeft: "8px",
            borderRadius: "4px",
            transition: "color 0.15s",
          }}
          aria-label="Tutup"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Progress bar at bottom */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        height: "3px",
        width: `${progress}%`,
        background: cfg.barColor,
        opacity: 0.4,
        transition: "width 0.1s linear",
      }} />
    </div>
  );
}

export function ToastContainer({ toasts, onRemove }: ToastProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        alignItems: "flex-end",
        pointerEvents: "none",
        width: "min(360px, calc(100vw - 32px))",
      }}
    >
      {toasts.map((t) => (
        <ToastBadge key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>,
    document.body
  );
}

// Hook
let _toastCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const MAX_TOASTS = 2;

  const addToast = (type: ToastType, title: string, message?: string) => {
    const id = `toast-${++_toastCounter}`;
    setToasts((prev) => {
      const next = [...prev, { id, type, title, message }];
      return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
    });
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const toast = {
    success: (title: string, message?: string) => addToast("success", title, message),
    error: (title: string, message?: string) => addToast("error", title, message),
    info: (title: string, message?: string) => addToast("info", title, message),
    warning: (title: string, message?: string) => addToast("warning", title, message),
  };

  return { toasts, removeToast, toast };
}
