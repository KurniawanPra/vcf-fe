"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type ToastType = "success" | "error" | "info";

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
  gradient: string;
  glow: string;
  iconBg: string;
  borderColor: string;
  progressColor: string;
  icon: JSX.Element;
  emoji: string;
}> = {
  success: {
    gradient: "linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)",
    glow: "0 8px 32px rgba(16,185,129,0.55), 0 2px 8px rgba(16,185,129,0.3)",
    iconBg: "rgba(255,255,255,0.25)",
    borderColor: "rgba(52,211,153,0.6)",
    progressColor: "rgba(255,255,255,0.7)",
    emoji: "✅",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    ),
  },
  error: {
    gradient: "linear-gradient(135deg, #dc2626 0%, #ef4444 50%, #f87171 100%)",
    glow: "0 8px 32px rgba(239,68,68,0.55), 0 2px 8px rgba(239,68,68,0.3)",
    iconBg: "rgba(255,255,255,0.25)",
    borderColor: "rgba(248,113,113,0.6)",
    progressColor: "rgba(255,255,255,0.7)",
    emoji: "❌",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
    ),
  },
  info: {
    gradient: "linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #60a5fa 100%)",
    glow: "0 8px 32px rgba(59,130,246,0.55), 0 2px 8px rgba(59,130,246,0.3)",
    iconBg: "rgba(255,255,255,0.25)",
    borderColor: "rgba(96,165,250,0.6)",
    progressColor: "rgba(255,255,255,0.7)",
    emoji: "ℹ️",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>
    ),
  },
};

const DURATION = 4000;

function ToastBadge({ toast, onRemove }: { toast: ToastItem; onRemove: (id: string) => void }) {
  const [phase, setPhase] = useState<"enter" | "idle" | "leave">("enter");
  const [progress, setProgress] = useState(100);

  const cfg = TOAST_CONFIG[toast.type];

  useEffect(() => {
    // Enter animation
    const t1 = setTimeout(() => setPhase("idle"), 20);

    // Progress bar countdown
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const pct = Math.max(0, 100 - (elapsed / DURATION) * 100);
      setProgress(pct);
      if (pct > 0) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    // Auto dismiss
    const t2 = setTimeout(() => {
      setPhase("leave");
      setTimeout(() => onRemove(toast.id), 400);
    }, DURATION);

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [toast.id, onRemove]);

  const transform =
    phase === "enter" ? "translateX(120%) scale(0.85)" :
    phase === "leave" ? "translateX(120%) scale(0.9)" :
    "translateX(0) scale(1)";

  const opacity = phase === "idle" ? 1 : 0;

  return (
    <div
      style={{
        position: "relative",
        transform,
        opacity,
        transition: phase === "enter"
          ? "transform 0.5s cubic-bezier(0.175,0.885,0.32,1.275), opacity 0.3s ease"
          : "transform 0.4s cubic-bezier(0.4,0,1,1), opacity 0.35s ease",
        background: cfg.gradient,
        border: `1.5px solid ${cfg.borderColor}`,
        borderRadius: "16px",
        boxShadow: cfg.glow,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        padding: "14px 16px 18px",
        minWidth: "300px",
        maxWidth: "400px",
        pointerEvents: "all",
        overflow: "hidden",
      }}
    >
      {/* Glass shimmer overlay */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 60%, transparent 100%)",
        borderRadius: "16px",
        pointerEvents: "none",
      }} />

      {/* Content row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", position: "relative", zIndex: 1 }}>
        {/* Icon circle */}
        <div style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: cfg.iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          border: "1.5px solid rgba(255,255,255,0.35)",
        }}>
          {cfg.icon}
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
          <p style={{
            fontSize: "14px",
            fontWeight: 700,
            color: "white",
            margin: 0,
            lineHeight: 1.3,
            textShadow: "0 1px 3px rgba(0,0,0,0.2)",
          }}>
            {toast.title}
          </p>
          {toast.message && (
            <p style={{
              fontSize: "12.5px",
              color: "rgba(255,255,255,0.88)",
              margin: "4px 0 0",
              lineHeight: 1.45,
              wordBreak: "break-word",
            }}>
              {toast.message}
            </p>
          )}
        </div>

        {/* Close btn */}
        <button
          onClick={() => { setPhase("leave"); setTimeout(() => onRemove(toast.id), 400); }}
          style={{
            background: "rgba(255,255,255,0.2)",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: "8px",
            cursor: "pointer",
            color: "white",
            padding: "4px",
            lineHeight: 0,
            flexShrink: 0,
            transition: "background 0.2s",
          }}
          aria-label="Tutup"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        height: "4px",
        width: `${progress}%`,
        background: cfg.progressColor,
        borderRadius: "0 0 0 16px",
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
        gap: "12px",
        alignItems: "flex-end",
        pointerEvents: "none",
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

  const addToast = (type: ToastType, title: string, message?: string) => {
    const id = `toast-${++_toastCounter}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const toast = {
    success: (title: string, message?: string) => addToast("success", title, message),
    error: (title: string, message?: string) => addToast("error", title, message),
    info: (title: string, message?: string) => addToast("info", title, message),
  };

  return { toasts, removeToast, toast };
}
