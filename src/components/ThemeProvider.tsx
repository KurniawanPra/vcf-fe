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
  { label: "Hijau (Default)", light: "#22a84a", lightRgb: "34,168,74",  dark: "#34d870", darkRgb: "52,216,112" },
  { label: "Biru",            light: "#3b82f6", lightRgb: "59,130,246", dark: "#60a5fa", darkRgb: "96,165,250" },
  { label: "Ungu",            light: "#8b5cf6", lightRgb: "139,92,246", dark: "#a78bfa", darkRgb: "167,139,250" },
  { label: "Merah",           light: "#ef4444", lightRgb: "239,68,68",  dark: "#f87171", darkRgb: "248,113,113" },
  { label: "Orange",          light: "#f97316", lightRgb: "249,115,22", dark: "#fb923c", darkRgb: "251,146,60" },
  { label: "Teal",            light: "#14b8a6", lightRgb: "20,184,166", dark: "#2dd4bf", darkRgb: "45,212,191" },
  { label: "Indigo",          light: "#6366f1", lightRgb: "99,102,241", dark: "#818cf8", darkRgb: "129,140,248" },
  { label: "Pink",            light: "#ec4899", lightRgb: "236,72,153", dark: "#f472b6", darkRgb: "244,114,182" },
  { label: "RGB Neon", light: "#ff00ff", lightRgb: "255,0,255", dark: "#00ffff", darkRgb: "0,255,255", isRgbNeon: true },
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
    let isRgbNeon = false;
    if (a.isCustomAccent && a.customAccentLight && a.customAccentDark) {
      accentHex = isDark ? a.customAccentDark : a.customAccentLight;
      accentRgb = hexToRgb(accentHex!);
    } else if (a.accentIdx !== undefined) {
      const p = ACCENT_PRESETS[a.accentIdx];
      if (p) {
        accentHex = isDark ? p.dark : p.light;
        accentRgb = isDark ? p.darkRgb : p.lightRgb;
        isRgbNeon = !!p.isRgbNeon;
      }
    }
    if (accentHex) {
      setVar("--accent-primary", accentHex);
      setVar("--accent-secondary", darken(accentHex));
      setVar("--accent-primary-rgb", accentRgb!);
    }

    /* ── RGB Neon Animation ── */
    if (isRgbNeon) {
      startRgbNeonAnimation();
    } else {
      stopRgbNeonAnimation();
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

import { usePathname } from "next/navigation";

/* ── Component ────────────────────────────────────────────────── */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/login") {
      // Force light mode and fixed color for login page
      document.documentElement.classList.remove("dark");
      setTheme("light");
      setVar("--accent-primary", ACCENT_PRESETS[0].light);
      setVar("--accent-secondary", darken(ACCENT_PRESETS[0].light));
      setVar("--accent-primary-rgb", ACCENT_PRESETS[0].lightRgb);
      stopRgbNeonAnimation();
      setMounted(true);
      return;
    }

    const savedTheme = localStorage.getItem("theme") as Theme | null;
    // Default to light mode if no saved theme
    const isDark = savedTheme === "dark";
    if (isDark) {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    } else {
      setTheme("light");
      document.documentElement.classList.remove("dark");
    }
    applyAppearance(isDark);
    setMounted(true);
  }, [pathname]);

  const toggleTheme = () => {
    if (pathname === "/login") return; // Disable toggle on login page
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

/* ── RGB Neon Global Animation ─────────────────────────────────── */
let rgbNeonInterval: ReturnType<typeof setInterval> | null = null;
const RGB_NEON_COLORS = [
  { hex: "#ff0000", rgb: "255,0,0" },
  { hex: "#ff00ff", rgb: "255,0,255" },
  { hex: "#0000ff", rgb: "0,0,255" },
  { hex: "#00ffff", rgb: "0,255,255" },
  { hex: "#00ff00", rgb: "0,255,0" },
  { hex: "#ffff00", rgb: "255,255,0" },
];

export function startRgbNeonAnimation() {
  // Clear existing interval if any
  if (rgbNeonInterval) {
    clearInterval(rgbNeonInterval);
    rgbNeonInterval = null;
  }

  let colorIndex = 0;

  const updateColor = () => {
    const color = RGB_NEON_COLORS[colorIndex];
    document.documentElement.style.setProperty("--accent-primary", color.hex);
    document.documentElement.style.setProperty("--accent-secondary", darken(color.hex));
    document.documentElement.style.setProperty("--accent-primary-rgb", color.rgb);
    document.documentElement.style.setProperty("--rgb-neon-glow", color.rgb);
    colorIndex = (colorIndex + 1) % RGB_NEON_COLORS.length;
  };

  updateColor(); // Set initial color
  rgbNeonInterval = setInterval(updateColor, 800);

  // Add liquid glow CSS if not present
  if (!document.getElementById('rgb-neon-liquid')) {
    const style = document.createElement('style');
    style.id = 'rgb-neon-liquid';
    style.textContent = `
      body {
        position: relative;
        min-height: 100vh;
        width: 100%;
        margin: 0;
        padding: 0;
      }
      body::before {
        content: '';
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        z-index: -1;
        animation: liquid-glow 3s ease-in-out infinite;
      }
      @keyframes liquid-glow {
        0%, 100% {
          box-shadow: 
            0 0 60px rgba(var(--rgb-neon-glow), 0.3), 
            0 0 120px rgba(var(--rgb-neon-glow), 0.2),
            inset 0 0 60px rgba(var(--rgb-neon-glow), 0.1);
        }
        50% {
          box-shadow: 
            0 0 80px rgba(var(--rgb-neon-glow), 0.5), 
            0 0 160px rgba(var(--rgb-neon-glow), 0.3),
            inset 0 0 80px rgba(var(--rgb-neon-glow), 0.2);
        }
      }
      .btn-primary, .glass-card {
        animation: liquid-border 2s ease-in-out infinite;
      }
      @keyframes liquid-border {
        0%, 100% {
          box-shadow: 
            0 0 20px rgba(var(--rgb-neon-glow), 0.4), 
            0 0 40px rgba(var(--rgb-neon-glow), 0.2);
        }
        50% {
          box-shadow: 
            0 0 30px rgba(var(--rgb-neon-glow), 0.6), 
            0 0 60px rgba(var(--rgb-neon-glow), 0.4);
        }
      }
    `;
    document.head.appendChild(style);
  }
}

export function stopRgbNeonAnimation() {
  if (rgbNeonInterval) {
    clearInterval(rgbNeonInterval);
    rgbNeonInterval = null;
  }
  const liquidStyle = document.getElementById('rgb-neon-liquid');
  if (liquidStyle) liquidStyle.remove();
  document.documentElement.style.removeProperty("--rgb-neon-glow");
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};
