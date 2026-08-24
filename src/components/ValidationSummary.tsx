"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export interface ValidationEntry {
  key: string;
  section: string;
  label: string;
  fieldId: string;
}

interface ValidationSummaryProps {
  errors: ValidationEntry[];
  onDismiss: () => void;
}

const DISMISS_DURATION = 8000;

export default function ValidationSummary({ errors, onDismiss }: ValidationSummaryProps) {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<"enter" | "idle" | "leave">("enter");
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (errors.length === 0) return;

    setPhase("enter");
    const tEnter = setTimeout(() => setPhase("idle"), 50);

    const start = Date.now();
    let rafId: number;
    const tick = () => {
      const elapsed = Date.now() - start;
      const pct = Math.max(0, 100 - (elapsed / DISMISS_DURATION) * 100);
      setProgress(pct);
      if (pct > 0) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    const tLeave = setTimeout(() => {
      setPhase("leave");
      setTimeout(() => onDismiss(), 400);
    }, DISMISS_DURATION);

    return () => {
      clearTimeout(tEnter);
      clearTimeout(tLeave);
      cancelAnimationFrame(rafId);
    };
  }, [errors, onDismiss]);

  if (!mounted || errors.length === 0) return null;

  const handleClose = () => {
    setPhase("leave");
    setTimeout(() => {
      onDismiss();
    }, 350);
  };

  const scrollTo = (fieldId: string) => {
    const el = document.getElementById(fieldId) || document.querySelector(`[data-field-id="${fieldId}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    (el as HTMLElement)?.focus?.();
  };

  const sections = Array.from(new Set(errors.map(e => e.section)));

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

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: "24px",
        right: "24px",
        zIndex: 999999,
        transform,
        opacity,
        transition,
        width: "min(360px, calc(100vw - 32px))",
        background: "var(--bg-card)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRadius: "16px",
        border: "1px solid var(--border)",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        pointerEvents: "all",
      }}
    >
      {/* Header */}
      <div 
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 14px",
          borderBottom: "1px solid var(--border)",
          background: "rgba(var(--color-warning-rgb), 0.1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="2.5" style={{ flexShrink: 0 }}>
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>
            {errors.length} field belum lengkap
          </span>
        </div>
        <button 
          onClick={handleClose} 
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-muted)",
            padding: "4px",
            lineHeight: 0,
            borderRadius: "6px",
            transition: "all 0.15s",
          }}
          className="hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-red-500"
          aria-label="Tutup"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Body / Missing Fields list */}
      <div 
        style={{
          padding: "12px 14px",
          maxHeight: "220px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {sections.map(section => (
          <div key={section} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <p 
              style={{ 
                fontSize: "10px", 
                fontWeight: 700, 
                textTransform: "uppercase", 
                letterSpacing: "0.05em",
                color: "var(--text-muted)",
                margin: 0
              }}
            >
              {section}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {errors.filter(e => e.section === section).map(e => (
                <button
                  key={e.key}
                  type="button"
                  onClick={() => scrollTo(e.fieldId)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "4px 8px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: 600,
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  className="hover:border-amber-400 hover:bg-amber-400/5 dark:hover:bg-amber-400/10 hover:text-amber-600 dark:hover:text-amber-400"
                >
                  {e.label}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Shrinking progress bar */}
      <div style={{ position: "relative", height: "3px", width: "100%", background: "transparent" }}>
        <div 
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            height: "3px",
            width: `${progress}%`,
            background: "var(--color-warning, #f59e0b)",
            opacity: 0.8,
            transition: "width 0.1s linear",
          }} 
        />
      </div>
    </div>,
    document.body
  );
}
