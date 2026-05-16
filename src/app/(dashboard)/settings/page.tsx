"use client";

import { useEffect, useState, useRef } from "react";
import { settingsApi } from "@/lib/api";
import { isAdmin } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { clearMasterDataCache } from "@/lib/masterDataCache";
import { ACCENT_PRESETS, FONT_PRESETS, applyAppearance } from "@/components/ThemeProvider";
import GuideSection from "@/components/GuideSection";

interface Setting {
  id: number;
  key: string;
  value: any;
  type: string;
  label: string;
  description: string;
  is_active: boolean;
}

interface GroupedSettings {
  [key: string]: Setting[];
}

const LOCAL_SETTINGS_KEY = "vcf_app_appearance";

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  return `${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)}`;
}

function darken(hex: string, pct = 0.15): string {
  const h = hex.replace("#", "");
  const r = Math.max(0, Math.round(parseInt(h.slice(0,2),16)*(1-pct)));
  const g = Math.max(0, Math.round(parseInt(h.slice(2,4),16)*(1-pct)));
  const b = Math.max(0, Math.round(parseInt(h.slice(4,6),16)*(1-pct)));
  return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`;
}

function loadAppearance() {
  try { return JSON.parse(localStorage.getItem(LOCAL_SETTINGS_KEY) || "{}"); }
  catch { return {}; }
}

function saveAppearance(data: object) {
  const current = loadAppearance();
  localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify({ ...current, ...data }));
}

const GROUP_META: Record<string, { label: string; icon: React.ReactNode; desc: string }> = {
  general: {
    label: "Sistem & Aplikasi",
    desc: "Nama aplikasi, zona waktu, dan konfigurasi dasar sistem",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
  vcf: {
    label: "Alur Kerja VCF",
    desc: "Validasi registrasi, opsi produk, dan tanda tangan digital",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  print: {
    label: "Dokumen & Cetak",
    desc: "Kop surat, alamat, footer, dan tipografi laporan cetak",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="6 9 6 2 18 2 18 9" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="8" />
      </svg>
    ),
  },
};

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<GroupedSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"system" | "appearance">("system");
  const [showGuideModal, setShowGuideModal] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [accentIdx, setAccentIdx] = useState(0);
  const [customAccentLight, setCustomAccentLight] = useState("#22c55e");
  const [customAccentDark, setCustomAccentDark] = useState("#4ade80");
  const [fontIdx, setFontIdx] = useState(0);
  const [isCustomAccent, setIsCustomAccent] = useState(false);
  const [borderRadius, setBorderRadius] = useState(12);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [colorSuccess, setColorSuccess] = useState("");
  const [colorDanger, setColorDanger] = useState("");
  const [colorWarning, setColorWarning] = useState("");
  const [colorInfo, setColorInfo] = useState("");

  useEffect(() => {
    if (!isAdmin()) {
      router.replace("/vcf");
    }
  }, [router]);

  useEffect(() => {
    fetchSettings();
    const saved = loadAppearance();
    if (saved.accentIdx !== undefined) setAccentIdx(saved.accentIdx);
    if (saved.customAccentLight) setCustomAccentLight(saved.customAccentLight);
    if (saved.customAccentDark) setCustomAccentDark(saved.customAccentDark);
    if (saved.isCustomAccent) setIsCustomAccent(saved.isCustomAccent);
    if (saved.fontIdx !== undefined) setFontIdx(saved.fontIdx);
    if (saved.borderRadius !== undefined) setBorderRadius(saved.borderRadius);
    if (saved.animationsEnabled !== undefined) setAnimationsEnabled(saved.animationsEnabled);
    if (saved.colorSuccess) setColorSuccess(saved.colorSuccess);
    if (saved.colorDanger)  setColorDanger(saved.colorDanger);
    if (saved.colorWarning) setColorWarning(saved.colorWarning);
    if (saved.colorInfo)    setColorInfo(saved.colorInfo);
  }, []);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  const fetchSettings = async () => {
    try {
      const res = await settingsApi.getAll();
      setSettings(res.data.data || {});
    } catch {
      showToast("error", "Gagal memuat pengaturan");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (key: string, value: any) => {
    setSaving(key);
    try {
      await settingsApi.update(key, { value });
      clearMasterDataCache();
      setSettings(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(group => {
          updated[group] = updated[group].map(s => s.key === key ? { ...s, value } : s);
        });
        return updated;
      });
      showToast("success", "Tersimpan");
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || "Gagal menyimpan";
      showToast("error", msg);
      // Re-fetch to ensure UI is in sync with server
      await fetchSettings();
    } finally {
      setSaving(null);
    }
  };

  const isDarkNow = () => document.documentElement.classList.contains("dark");

  const handleApplyAccent = (idx: number) => {
    setAccentIdx(idx); setIsCustomAccent(false);
    const p = ACCENT_PRESETS[idx];
    const hex = isDarkNow() ? p.dark : p.light;
    const rgb = isDarkNow() ? p.darkRgb : p.lightRgb;
    document.documentElement.style.setProperty("--accent-primary", hex);
    document.documentElement.style.setProperty("--accent-secondary", darken(hex));
    document.documentElement.style.setProperty("--accent-primary-rgb", rgb);
    saveAppearance({ accentIdx: idx, isCustomAccent: false });
    showToast("success", "Warna aksen diterapkan");
  };

  const handleApplyCustomAccent = () => {
    setIsCustomAccent(true);
    const hex = isDarkNow() ? customAccentDark : customAccentLight;
    document.documentElement.style.setProperty("--accent-primary", hex);
    document.documentElement.style.setProperty("--accent-secondary", darken(hex));
    document.documentElement.style.setProperty("--accent-primary-rgb", hexToRgb(hex));
    saveAppearance({ customAccentLight, customAccentDark, isCustomAccent: true });
    showToast("success", "Warna kustom diterapkan");
  };

  const handleSemanticColor = (key: "colorSuccess"|"colorDanger"|"colorWarning"|"colorInfo", cssVar: string, cssRgbVar: string, val: string, setter: (v: string) => void) => {
    setter(val);
    document.documentElement.style.setProperty(cssVar, val);
    document.documentElement.style.setProperty(cssRgbVar, hexToRgb(val));
    saveAppearance({ [key]: val });
  };

  const handleApplyFont = (idx: number) => {
    setFontIdx(idx);
    document.body.style.fontFamily = FONT_PRESETS[idx].value;
    saveAppearance({ fontIdx: idx });
    showToast("success", "Font diterapkan");
  };

  const handleBorderRadius = (v: number) => {
    setBorderRadius(v);
    document.documentElement.style.setProperty("--radius-card", `${v}px`);
    saveAppearance({ borderRadius: v });
  };

  const handleAnimations = (v: boolean) => {
    setAnimationsEnabled(v);
    document.documentElement.style.setProperty("--transition-speed", v ? "0.2s" : "0s");
    saveAppearance({ animationsEnabled: v });
  };

  const handleResetAppearance = () => {
    localStorage.removeItem(LOCAL_SETTINGS_KEY);
    setAccentIdx(0); setIsCustomAccent(false); setFontIdx(0); setBorderRadius(12); setAnimationsEnabled(true);
    setColorSuccess(""); setColorDanger(""); setColorWarning(""); setColorInfo("");
    ["--accent-primary","--accent-secondary","--accent-primary-rgb",
     "--color-success","--color-success-rgb","--color-danger","--color-danger-rgb",
     "--color-warning","--color-warning-rgb","--color-info","--color-info-rgb",
     "--radius-card","--transition-speed"].forEach(v => document.documentElement.style.removeProperty(v));
    document.body.style.removeProperty("fontFamily");
    applyAppearance(isDarkNow());
    showToast("success", "Tampilan direset ke default");
  };

  const renderInput = (setting: Setting) => {
    const disabled = saving === setting.key;
    if (setting.type === "boolean") {
      return (
        <div className="flex items-center gap-3">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${setting.value ? "text-emerald-500" : "text-slate-400"}`}>
            {setting.value ? "Aktif" : "Nonaktif"}
          </span>
          <button
            onClick={() => handleUpdate(setting.key, !setting.value)}
            disabled={disabled}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-all duration-300 focus:outline-none ${setting.value ? "bg-emerald-500 shadow-md shadow-emerald-500/20" : "bg-slate-200 dark:bg-slate-700"} ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${setting.value ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
      );
    }
    return <SettingTextInput setting={setting} onUpdate={handleUpdate} saving={disabled} />;
  };

  const TABS = [
    { id: "system", label: "Pengaturan Sistem", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg> },
    { id: "appearance", label: "Tampilan & Tema", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg> },
  ] as const;

  const GUIDE_ICON = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>;

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="spinner" />
      <span className="ml-3 text-text-muted">Memuat pengaturan...</span>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium animate-slideDown ${toast.type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>
          {toast.type === "success"
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-accent-primary/10 to-transparent border border-accent-primary/20">
        <h1 className="page-title text-3xl font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>Pengaturan</h1>
        <p className="page-subtitle text-lg font-medium" style={{ color: "var(--text-muted)" }}>Konfigurasi alur kerja, dokumen cetak, dan preferensi visual aplikasi VCF</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 p-1 rounded-xl mb-6 w-fit" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === tab.id ? "bg-white dark:bg-slate-700 shadow-sm text-text-primary" : "text-text-muted hover:text-text-primary"}`}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
        <button
          onClick={() => setShowGuideModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all text-text-muted hover:text-text-primary"
        >
          {GUIDE_ICON}Panduan Operasional
        </button>
      </div>

      {/* System Settings Tab */}
      {activeTab === "system" && (
        <div className="space-y-6">
          {Object.keys(settings).length === 0 ? (
            <div className="glass-card p-10 text-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-4 opacity-30"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
              <p className="text-text-muted mb-4">Belum ada pengaturan tersedia.</p>
              <button onClick={fetchSettings} className="btn btn-primary text-sm">Refresh</button>
            </div>
          ) : Object.entries(settings).map(([group, groupSettings]) => {
            const meta = GROUP_META[group] || { label: group, desc: "", icon: null };
            return (
              <div key={group} className="glass-card overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-border" style={{ background: "var(--bg-secondary)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--accent-primary)", color: "white", opacity: 0.9 }}>{meta.icon}</div>
                  <div>
                    <h2 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>{meta.label}</h2>
                    {meta.desc && <p className="text-xs" style={{ color: "var(--text-muted)" }}>{meta.desc}</p>}
                  </div>
                </div>
                <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                  {groupSettings.map(setting => (
                    <div key={setting.key} className="px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors hover:bg-slate-50/50 dark:hover:bg-white/5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{setting.label}</p>
                        {setting.description && <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>{setting.description}</p>}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {renderInput(setting)}
                        {saving === setting.key && <div className="spinner-accent w-4 h-4 flex-shrink-0" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setShowGuideModal(false)}>
          <div className="glass-card w-full max-w-4xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-border" style={{ background: "var(--bg-secondary)" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--accent-primary)", color: "white" }}>
                  {GUIDE_ICON}
                </div>
                <h2 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>Panduan Operasional</h2>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors hover:bg-white/10"
                style={{ color: "var(--text-muted)" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <GuideSection />
            </div>
          </div>
        </div>
      )}

      {/* Appearance Tab */}
      {activeTab === "appearance" && (
        <div className="space-y-6">

          {/* ── Accent Color ── */}
          <div className="glass-card overflow-hidden">
            <SectionHeader icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="13.5" cy="6.5" r="1" fill="currentColor"/><circle cx="17.5" cy="10.5" r="1" fill="currentColor"/><circle cx="8.5" cy="7.5" r="1" fill="currentColor"/><circle cx="6.5" cy="12.5" r="1" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>} title="Warna Aksen (Primary)" desc="Warna utama tombol, link, sidebar aktif, dan elemen interaktif" />
            <div className="p-6">
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Preset</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {ACCENT_PRESETS.map((preset, idx) => (
                  <button key={idx} onClick={() => handleApplyAccent(idx)}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all text-left ${!isCustomAccent && accentIdx === idx ? "border-2 shadow-md" : "border-border hover:border-slate-300"}`}
                    style={{ background: "var(--bg-secondary)", borderColor: !isCustomAccent && accentIdx === idx ? preset.light : undefined }}
                  >
                    <span className="w-5 h-5 rounded-full flex-shrink-0 shadow-sm border border-black/10" style={{ background: preset.light }} />
                    <span className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{preset.label}</span>
                    {!isCustomAccent && accentIdx === idx && <svg className="ml-auto flex-shrink-0" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                  </button>
                ))}
              </div>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Kustom</p>
              <div className="flex flex-wrap items-end gap-4 p-4 rounded-xl border border-dashed" style={{ borderColor: "var(--border)" }}>
                <ColorPickerField label="Mode Terang" value={customAccentLight} onChange={setCustomAccentLight} />
                <ColorPickerField label="Mode Gelap" value={customAccentDark} onChange={setCustomAccentDark} />
                <button onClick={handleApplyCustomAccent} className="btn btn-primary text-sm">Terapkan</button>
              </div>
            </div>
          </div>

          {/* ── Semantic Colors ── */}
          <div className="glass-card overflow-hidden">
            <SectionHeader icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>} title="Warna Semantik" desc="Warna tombol Simpan (success), Hapus (danger), Peringatan (warning), dan Info" />
            <div className="p-6 space-y-5">
              <SemanticColorRow
                label="Success — Tombol Simpan / Konfirmasi"
                swatch="#10b981" current={colorSuccess}
                onChange={v => handleSemanticColor("colorSuccess", "--color-success", "--color-success-rgb", v, setColorSuccess)}
              />
              <SemanticColorRow
                label="Danger — Tombol Hapus / Tolak"
                swatch="#ef4444" current={colorDanger}
                onChange={v => handleSemanticColor("colorDanger", "--color-danger", "--color-danger-rgb", v, setColorDanger)}
              />
              <SemanticColorRow
                label="Warning — Peringatan / Edit"
                swatch="#f59e0b" current={colorWarning}
                onChange={v => handleSemanticColor("colorWarning", "--color-warning", "--color-warning-rgb", v, setColorWarning)}
              />
              <SemanticColorRow
                label="Info — Tombol Informasi / Cetak"
                swatch="#3b82f6" current={colorInfo}
                onChange={v => handleSemanticColor("colorInfo", "--color-info", "--color-info-rgb", v, setColorInfo)}
              />
            </div>
          </div>

          {/* ── Live Button Preview ── */}
          <div className="glass-card p-6">
            <p className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>Preview Tombol</p>
            <div className="flex flex-wrap gap-3">
              <button className="btn btn-primary">Primary</button>
              <button className="btn btn-success">Simpan</button>
              <button className="btn btn-danger">Hapus</button>
              <button className="btn btn-warning">Peringatan</button>
              <button className="btn btn-secondary">Secondary</button>
            </div>
          </div>

          {/* ── Font ── */}
          <div className="glass-card overflow-hidden">
            <SectionHeader icon={<span className="font-bold text-sm">Aa</span>} title="Tipografi" desc="Font utama seluruh aplikasi" />
            <div className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {FONT_PRESETS.map((preset, idx) => (
                  <button key={idx} onClick={() => handleApplyFont(idx)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${fontIdx === idx ? "shadow-md" : "border-border hover:border-slate-300"}`}
                    style={{ background: "var(--bg-secondary)", fontFamily: preset.value, borderColor: fontIdx === idx ? "var(--accent-primary)" : undefined }}
                  >
                    <p className="text-lg font-bold mb-0.5" style={{ color: "var(--text-primary)" }}>Aa</p>
                    <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{preset.label}</p>
                    {fontIdx === idx && <p className="text-[10px] font-bold mt-1" style={{ color: "var(--accent-primary)" }}>Aktif ✓</p>}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── UI Options ── */}
          <div className="glass-card overflow-hidden">
            <SectionHeader icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>} title="Opsi Antarmuka" desc="Kelengkungan sudut dan animasi transisi" />
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              <div className="px-6 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Border Radius Kartu</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Kelengkungan sudut elemen UI</p>
                </div>
                <div className="flex items-center gap-3">
                  <input type="range" min={0} max={24} step={2} value={borderRadius} onChange={e => handleBorderRadius(Number(e.target.value))} className="w-32" style={{ accentColor: "var(--accent-primary)" }} />
                  <span className="text-sm font-mono w-12 text-right" style={{ color: "var(--text-primary)" }}>{borderRadius}px</span>
                </div>
              </div>
              <div className="px-6 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Animasi & Transisi</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Aktifkan animasi halus pada elemen UI</p>
                </div>
                <button onClick={() => handleAnimations(!animationsEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${animationsEnabled ? "" : "bg-slate-200 dark:bg-slate-700"}`}
                  style={{ background: animationsEnabled ? "var(--color-success)" : undefined }}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${animationsEnabled ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
            </div>
          </div>

          {/* ── Reset ── */}
          <div className="flex justify-end">
            <button onClick={handleResetAppearance} className="btn btn-secondary flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              Reset ke Default
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingTextInput({ setting, onUpdate, saving }: { setting: Setting; onUpdate: (k: string, v: any) => void; saving: boolean }) {
  const [localValue, setLocalValue] = useState(setting.value ?? "");

  useEffect(() => { setLocalValue(setting.value ?? ""); }, [setting.value]);

  const commit = () => {
    const newVal = setting.type === "integer" ? (parseInt(String(localValue)) || 0) : localValue;
    if (newVal !== setting.value) onUpdate(setting.key, newVal);
  };

  const onKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) (e.target as HTMLElement).blur(); };

  if (setting.key === "print.company_address" || setting.key === "print.footer_text") {
    return (
      <textarea
        value={localValue}
        onChange={e => setLocalValue(e.target.value)}
        onBlur={commit}
        disabled={saving}
        rows={setting.key === "print.footer_text" ? 2 : 3}
        placeholder={`Masukkan ${setting.label.toLowerCase()}...`}
        className="form-input w-80 text-sm leading-relaxed resize-none focus:ring-2 focus:ring-accent-primary/20"
      />
    );
  }

  if (setting.key === "print.font_family") {
    const fonts = [
      { label: "Arial (Standard)", value: "Arial, sans-serif" },
      { label: "Plus Jakarta Sans", value: "'Plus Jakarta Sans', sans-serif" },
      { label: "Inter", value: "Inter, sans-serif" },
      { label: "Roboto", value: "Roboto, sans-serif" },
      { label: "Open Sans", value: "'Open Sans', sans-serif" },
      { label: "Times New Roman", value: "'Times New Roman', serif" },
    ];
    return (
      <select value={localValue} onChange={e => { setLocalValue(e.target.value); onUpdate(setting.key, e.target.value); }} disabled={saving} className="form-select w-64">
        {fonts.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
      </select>
    );
  }

  if (setting.key === "general.timezone") {
    const zones = [
      { label: "WIB — Asia/Jakarta (UTC+7)", value: "Asia/Jakarta" },
      { label: "WITA — Asia/Makassar (UTC+8)", value: "Asia/Makassar" },
      { label: "WIT — Asia/Jayapura (UTC+9)", value: "Asia/Jayapura" },
      { label: "UTC / GMT", value: "UTC" },
    ];
    return (
      <select value={localValue} onChange={e => { setLocalValue(e.target.value); onUpdate(setting.key, e.target.value); }} disabled={saving} className="form-select w-64">
        {zones.map(z => <option key={z.value} value={z.value}>{z.label}</option>)}
      </select>
    );
  }

  return (
    <input
      type={setting.type === "integer" ? "number" : "text"}
      value={localValue}
      onChange={e => setLocalValue(e.target.value)}
      onBlur={commit}
      onKeyDown={onKeyDown}
      disabled={saving}
      className={`form-input ${setting.type === "integer" ? "w-28 text-right font-mono" : "w-64"}`}
    />
  );
}


function SectionHeader({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 px-6 py-4 border-b" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0" style={{ background: "var(--accent-primary)" }}>{icon}</div>
      <div>
        <h2 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>{title}</h2>
        {desc && <p className="text-xs" style={{ color: "var(--text-muted)" }}>{desc}</p>}
      </div>
    </div>
  );
}

function ColorPickerField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="form-label text-[10px]">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={e => onChange(e.target.value)} className="w-10 h-10 rounded-lg border cursor-pointer p-0.5" style={{ borderColor: "var(--border)" }} />
        <input type="text" value={value} onChange={e => onChange(e.target.value)} className="form-input w-28 font-mono text-xs" />
      </div>
    </div>
  );
}

function SemanticColorRow({ label, swatch, current, onChange }: { label: string; swatch: string; current: string; onChange: (v: string) => void }) {
  const active = current || swatch;
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: active }} />
        <p className="text-sm" style={{ color: "var(--text-primary)" }}>{label}</p>
        <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{current ? "(kustom)" : "(default)"}</span>
      </div>
      <div className="flex items-center gap-2">
        <input type="color" value={active} onChange={e => onChange(e.target.value)} className="w-9 h-9 rounded-lg border cursor-pointer p-0.5" style={{ borderColor: "var(--border)" }} />
        <input type="text" value={active} onChange={e => onChange(e.target.value)} className="form-input w-28 font-mono text-xs" />
        {current && (
          <button onClick={() => onChange("")} className="text-xs px-2 py-1 rounded" style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}>Reset</button>
        )}
      </div>
    </div>
  );
}
