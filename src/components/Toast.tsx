"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
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
    barColor: "var(--color-success, #10b981)",
    labelColor: "var(--color-success, #10b981)",
    icon: (
      <svg className="w-6 h-6 text-white fill-current" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 3.33331C10.8 3.33331 3.33337 10.8 3.33337 20C3.33337 29.2 10.8 36.6666 20 36.6666C29.2 36.6666 36.6667 29.2 36.6667 20C36.6667 10.8 29.2 3.33331 20 3.33331ZM16.6667 28.3333L8.33337 20L10.6834 17.65L16.6667 23.6166L29.3167 10.9666L31.6667 13.3333L16.6667 28.3333Z" />
      </svg>
    ),
  },
  error: {
    barColor: "var(--color-danger, #ef4444)",
    labelColor: "var(--color-danger, #ef4444)",
    icon: (
      <svg className="w-6 h-6 text-white fill-current" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 3.36667C10.8167 3.36667 3.3667 10.8167 3.3667 20C3.3667 29.1833 10.8167 36.6333 20 36.6333C29.1834 36.6333 36.6334 29.1833 36.6334 20C36.6334 10.8167 29.1834 3.36667 20 3.36667ZM19.1334 33.3333V22.9H13.3334L21.6667 6.66667V17.1H27.25L19.1334 33.3333Z" />
      </svg>
    ),
  },
  info: {
    barColor: "var(--color-info, #3b82f6)",
    labelColor: "var(--color-info, #3b82f6)",
    icon: (
      <svg className="w-6 h-6 text-white fill-current" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 3.33331C10.8 3.33331 3.33337 10.8 3.33337 20C3.33337 29.2 10.8 36.6666 20 36.6666C29.2 36.6666 36.6667 29.2 36.6667 20C36.6667 10.8 29.2 3.33331 20 3.33331ZM21.6667 28.3333H18.3334V25H21.6667V28.3333ZM21.6667 21.6666H18.3334V11.6666H21.6667V21.6666Z" />
      </svg>
    ),
  },
  warning: {
    barColor: "var(--color-warning, #f59e0b)",
    labelColor: "var(--color-warning, #f59e0b)",
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
    const tEnter = setTimeout(() => setPhase("idle"), 50);

    const start = Date.now();
    let rafId: number;
    const tick = () => {
      const elapsed = Date.now() - start;
      const pct = Math.max(0, 100 - (elapsed / DURATION) * 100);
      setProgress(pct);
      if (pct > 0) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    const tLeave = setTimeout(() => {
      setPhase("leave");
      setTimeout(() => onRemove(toast.id), 400);
    }, DURATION);

    return () => {
      clearTimeout(tEnter);
      clearTimeout(tLeave);
      cancelAnimationFrame(rafId);
    };
  }, [toast.id, onRemove]);

  const transform =
    phase === "enter"
      ? "translateX(calc(100% + 40px)) scale(0.9)"
      : phase === "leave"
      ? "translateX(calc(100% + 40px)) scale(0.92)"
      : "translateX(0) scale(1)";

  const opacity = phase === "idle" ? 1 : 0;

  const transition =
    phase === "enter"
      ? "none"
      : phase === "idle"
      ? "transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease"
      : "transform 0.35s cubic-bezier(0.7, 0, 0.84, 0), opacity 0.25s ease";

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
        background: "var(--bg-card)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRadius: "16px",
        border: "1px solid var(--border)",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
        pointerEvents: "all",
        position: "relative",
      }}
    >
      {/* Left colored accent bar + icon */}
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
        alignItems: "flex-start",
        justifyContent: "space-between",
        flex: 1,
        padding: "12px 14px",
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            fontWeight: 700,
            fontSize: "14px",
            color: "var(--text-primary)",
            display: "block",
            lineHeight: 1.3,
          }}>
            {toast.title || TYPE_LABEL[toast.type]}
          </span>
          {toast.message && (
            <p style={{
              fontSize: "13px",
              color: "var(--text-secondary)",
              margin: "3px 0 0",
              lineHeight: 1.4,
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
            color: "var(--text-muted)",
            padding: "4px",
            lineHeight: 0,
            flexShrink: 0,
            marginLeft: "8px",
            borderRadius: "6px",
            transition: "all 0.15s",
          }}
          className="hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-red-500"
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
        opacity: 0.6,
        transition: "width 0.1s linear",
      }} />
    </div>
  );
}

// Global container component used inside ToastProvider
function GlobalToastContainer({ toasts, onRemove }: ToastProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: "24px",
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

// Dummy container kept for backward compatibility so old pages compiling won't break
export function ToastContainer({ toasts, onRemove }: ToastProps) {
  return null;
}

// Context implementation
interface ToastContextType {
  toasts: ToastItem[];
  addToast: (type: ToastType, title: string, message?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

let _toastCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const MAX_TOASTS = 4; // Allow stacking up to 4 toasts in a global container

  const addToast = (type: ToastType, title: string, message?: string) => {
    const id = `toast-${++_toastCounter}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => {
      const next = [...prev, { id, type, title, message }];
      return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
    });
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <GlobalToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

// Global useToast Hook
export function useToast() {
  const context = useContext(ToastContext);
  
  // Fallback state if hook is used outside ToastProvider
  const [localToasts, setLocalToasts] = useState<ToastItem[]>([]);
  
  if (!context) {
    // If used outside provider, behave like old local toast system
    const addToast = (type: ToastType, title: string, message?: string) => {
      const id = `toast-local-${++_toastCounter}`;
      setLocalToasts((prev) => {
        const next = [...prev, { id, type, title, message }];
        return next.length > 2 ? next.slice(next.length - 2) : next;
      });
    };
    const removeToast = (id: string) => {
      setLocalToasts((prev) => prev.filter((t) => t.id !== id));
    };
    const toast = {
      success: (title: string, message?: string) => addToast("success", title, message),
      error: (title: string, message?: string) => addToast("error", title, message),
      info: (title: string, message?: string) => addToast("info", title, message),
      warning: (title: string, message?: string) => addToast("warning", title, message),
    };
    return { toasts: localToasts, removeToast, toast };
  }

  const toast = {
    success: (title: string, message?: string) => context.addToast("success", title, message),
    error: (title: string, message?: string) => context.addToast("error", title, message),
    info: (title: string, message?: string) => context.addToast("info", title, message),
    warning: (title: string, message?: string) => context.addToast("warning", title, message),
  };

  return {
    toasts: context.toasts,
    removeToast: context.removeToast,
    toast,
  };
}
