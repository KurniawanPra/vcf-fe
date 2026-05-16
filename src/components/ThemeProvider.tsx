"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/* ── shared presets ───────────────────────────────────────────── */
export const ACCENT_PRESETS = [
  { label: "Hijau (Default)", light: "#22c55e", lightRgb: "34,197,94",  dark: "#4ade80", darkRgb: "74,222,128" },
  { label: "Biru",            light: "#3b82f6", lightRgb: "59,130,246", dark: "#60a5fa", darkRgb: "96,165,250" },
  { label: "Ungu",            light: "#8b5cf6", lightRgb: "139,92,246", dark: "#a78bfa", darkRgb: "167,139,250" },
  { label: "Merah",           light: "#ef4444", lightRgb: "239,68,68",  dark: "#f87171", darkRgb: "248,113,113" },
  { label: "Orange",          light: "#f97316", lightRgb: "249,115,22", dark: "#fb923c", darkRgb: "251,146,60" },
  { label: "Teal",            light: "#14b8a6", lightRgb: "20,184,166", dark: "#2dd4bf", darkRgb: "45,212,191" },
  { label: "Indigo",          light: "#6366f1", lightRgb: "99,102,241", dark: "#818cf8", darkRgb: "129,140,248" },
  { label: "Pink",            light: "#ec4899", lightRgb: "236,72,153", dark: "#f472b6", darkRgb: "244,114,182" },
];

export const FONT_PRESETS = [
  { label: "Plus Jakarta Sans", value: "'Plus Jakarta Sans', sans-serif" },
  { label: "Inter",             value: "'Inter', sans-serif" },
  { label: "Poppins",           value: "'Poppins', sans-serif" },
  { label: "DM Sans",           value: "'DM Sans', sans-serif" },
];

/* hex → "r,g,b" */
function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r},${g},${b}`;
}

/* darken a hex color slightly for secondary */
function darken(hex: string, pct = 0.15): string {
  const h = hex.replace("#", "");
  const r = Math.max(0, Math.round(parseInt(h.slice(0,2),16) * (1-pct)));
  const g = Math.max(0, Math.round(parseInt(h.slice(2,4),16) * (1-pct)));
  const b = Math.max(0, Math.round(parseInt(h.slice(4,6),16) * (1-pct)));
  return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`;
}

function setVar(name: string, val: string) {
  document.documentElement.style.setProperty(name, val);
}

export function applyAppearance(isDark: boolean) {
  try {
    const a = JSON.parse(localStorage.getItem("vcf_app_appearance") || "{}");

    /* ── Accent color ── */
    let accentHex: string | null = null;
    let accentRgb: string | null = null;
    if (a.isCustomAccent && a.customAccentLight && a.customAccentDark) {
      accentHex = isDark ? a.customAccentDark : a.customAccentLight;
      accentRgb = hexToRgb(accentHex!);
    } else if (a.accentIdx !== undefined) {
      const p = ACCENT_PRESETS[a.accentIdx];
      if (p) {
        accentHex = isDark ? p.dark : p.light;
        accentRgb = isDark ? p.darkRgb : p.lightRgb;
      }
    }
    if (accentHex) {
      setVar("--accent-primary", accentHex);
      setVar("--accent-secondary", darken(accentHex));
      setVar("--accent-primary-rgb", accentRgb!);
    }

    /* ── Semantic overrides ── */
    if (a.colorDanger)  { setVar("--color-danger",  a.colorDanger);  setVar("--color-danger-rgb",  hexToRgb(a.colorDanger)); }
    if (a.colorSuccess) { setVar("--color-success", a.colorSuccess); setVar("--color-success-rgb", hexToRgb(a.colorSuccess)); }
    if (a.colorWarning) { setVar("--color-warning", a.colorWarning); setVar("--color-warning-rgb", hexToRgb(a.colorWarning)); }
    if (a.colorInfo)    { setVar("--color-info",    a.colorInfo);    setVar("--color-info-rgb",    hexToRgb(a.colorInfo)); }

    /* ── Font ── */
    if (a.fontIdx !== undefined && FONT_PRESETS[a.fontIdx]) {
      document.body.style.fontFamily = FONT_PRESETS[a.fontIdx].value;
    }

    /* ── Border radius ── */
    if (a.borderRadius !== undefined) {
      setVar("--radius-card", `${a.borderRadius}px`);
    }

    /* ── Animations ── */
    if (a.animationsEnabled === false) {
      setVar("--transition-speed", "0s");
    }
  } catch { /* ignore */ }
}

/* ── Component ────────────────────────────────────────────────── */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    const isDark = savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (isDark) {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    } else if (savedTheme) {
      setTheme(savedTheme);
    }
    applyAppearance(isDark);
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    const nowDark = newTheme === "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", nowDark);
    applyAppearance(nowDark);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div style={{ visibility: mounted ? "visible" : "hidden" }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};
