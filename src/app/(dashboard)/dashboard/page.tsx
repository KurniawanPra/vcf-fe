"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { activityLogApi, vcfApi } from "@/lib/api";
import { getUser, isAdmin } from "@/lib/auth";
import Pagination from "@/components/Pagination";
import MobileCardSkeleton from "@/components/MobileCardSkeleton";
import TableRowSkeleton from "@/components/TableRowSkeleton";
import RegisterButton from "@/components/RegisterButton";
import ViewVcfButton from "@/components/ViewVcfButton";

interface ActivityLog {
  id: number;
  user_id: number | null;
  user_name: string | null;
  user_role: string | null;
  event: string;
  module: string;
  action: string;
  subject_type: string | null;
  subject_id: number | null;
  description: string;
  subject_label: string | null;
  properties: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
}

interface VcfStats {
  total: number;
  today: number;
  active: number;
  system_speed: number;
}

const MODULE_OPTIONS = [
  { value: "", label: "Semua Modul" },
  { value: "vcf", label: "VCF (Transaksi)" },
  { value: "master", label: "Master Data" },
  { value: "auth", label: "Autentikasi" },
  { value: "settings", label: "Pengaturan" },
  { value: "timbangan", label: "Timbangan" },
  { value: "violation", label: "Pelanggaran" },
];

const ACTION_OPTIONS = [
  { value: "", label: "Semua Aksi" },
  { value: "created", label: "Created (Tambah)" },
  { value: "updated", label: "Updated (Ubah)" },
  { value: "deleted", label: "Deleted (Hapus)" },
  { value: "rejected", label: "Rejected (Tolak)" },
  { value: "finalized", label: "Finalized (Selesai)" },
  { value: "stage_completed", label: "Stage Done" },
  { value: "login", label: "Login" },
  { value: "logout", label: "Logout" },
];

const QUICK_ACTIONS = [
  { href: "/vcf/register", label: "Main Gate Masuk", sub: "Registrasi kendaraan baru", stage: "Bagian 1", colorClass: "border-indigo-500/20 hover:border-indigo-500 shadow-indigo-500/5 hover:shadow-indigo-500/10", barBg: "bg-indigo-500", iconBg: "bg-indigo-50 dark:bg-indigo-950/40", iconText: "text-indigo-600 dark:text-indigo-400" },
  { href: "/vcf?stage=bagian1_selesai", label: "Weighbridge Masuk", sub: "Timbang & periksa masuk", stage: "Bagian 2", colorClass: "border-amber-500/20 hover:border-amber-500 shadow-amber-500/5 hover:shadow-amber-500/10", barBg: "bg-amber-500", iconBg: "bg-amber-50 dark:bg-amber-950/40", iconText: "text-amber-600 dark:text-amber-400" },
  { href: "/vcf?stage=loading_unloading_selesai", label: "Weighbridge Keluar", sub: "Timbang & periksa keluar", stage: "Bagian 3", colorClass: "border-purple-500/20 hover:border-purple-500 shadow-purple-500/5 hover:shadow-purple-500/10", barBg: "bg-purple-500", iconBg: "bg-purple-50 dark:bg-purple-950/40", iconText: "text-purple-600 dark:text-purple-400" },
  { href: "/vcf?stage=bagian3_selesai", label: "Main Gate Keluar", sub: "Penutupan & keluar", stage: "Bagian 4", colorClass: "border-emerald-500/20 hover:border-emerald-500 shadow-emerald-500/5 hover:shadow-emerald-500/10", barBg: "bg-emerald-500", iconBg: "bg-emerald-50 dark:bg-emerald-950/40", iconText: "text-emerald-600 dark:text-emerald-400" },
];

function StatCardSkeleton() {
  return <div className="h-24 w-full rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse border border-slate-200 dark:border-slate-700" />;
}

export default function DashboardPage() {
  const router = useRouter();
  const user = getUser();
  
  // States
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<VcfStats>({
    total: 0,
    today: 0,
    active: 0,
    system_speed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"card" | "table">("table");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState("");
  const [selectedAction, setSelectedAction] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  // Modal Detail Log
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Selamat Pagi" : now.getHours() < 17 ? "Selamat Siang" : "Selamat Sore";

  // Fetch VCF Stats
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await vcfApi.getStats();
      if (res.data) {
        setStats(res.data);
      }
    } catch {
      // silent fail
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch Logs Data
  const fetchLogs = useCallback(async (page: number) => {
    try {
      setLoading(true);
      const params: any = {
        page,
        per_page: 15,
        search: searchQuery,
        module: selectedModule,
        action: selectedAction,
      };

      if (selectedDate) {
        params.date = selectedDate;
      }

      const res = await activityLogApi.getList(params);
      if (res.data) {
        setLogs(res.data.data || []);
        setTotalItems(res.data.total || 0);
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedModule, selectedAction, selectedDate]);

  // Initial fetch and polling
  useEffect(() => {
    fetchStats();
    fetchLogs(currentPage);

    const statsInterval = setInterval(fetchStats, 45000);
    const logsInterval = setInterval(() => fetchLogs(currentPage), 30000);

    return () => {
      clearInterval(statsInterval);
      clearInterval(logsInterval);
    };
  }, [fetchStats, fetchLogs, currentPage]);

  // Dispatch modal events for layout
  useEffect(() => {
    if (selectedLog) {
      window.dispatchEvent(new CustomEvent("modal-open"));
    } else {
      window.dispatchEvent(new CustomEvent("modal-close"));
    }
    return () => {
      window.dispatchEvent(new CustomEvent("modal-close"));
    };
  }, [selectedLog]);

  // Reset page to 1 when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  useEffect(() => {
    handleFilterChange();
  }, [searchQuery, selectedModule, selectedAction, selectedDate]);

  // Get module badge styles
  const getModuleBadge = (module: string) => {
    switch (module.toLowerCase()) {
      case "vcf":
        return "bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/50";
      case "master":
        return "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50";
      case "auth":
        return "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50";
      case "settings":
        return "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700/50";
      case "timbangan":
        return "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50";
      case "violation":
        return "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50";
      default:
        return "bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-800";
    }
  };

  // Get action badge styles
  const getActionBadge = (action: string) => {
    switch (action.toLowerCase()) {
      case "created":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20";
      case "updated":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20";
      case "deleted":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20";
      case "rejected":
        return "bg-red-600/10 text-red-600 dark:text-red-400 border border-red-600/20";
      case "finalized":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20";
      case "stage_completed":
        return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20";
      case "login":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20";
      case "logout":
        return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20";
      default:
        return "bg-slate-500/10 text-slate-500 border border-slate-500/20";
    }
  };

  // Human-readable date time
  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Clean JSON Properties renderer
  const renderLogProperties = (props: any) => {
    if (!props) return <span className="text-slate-400 dark:text-slate-600 text-xs italic">Tidak ada detail data.</span>;

    // Format 1: field, old, new
    if (typeof props === "object" && "old" in props && "new" in props) {
      return (
        <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-500 dark:text-slate-400">Kolom/Key:</span>
            <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-indigo-500 dark:text-indigo-400 font-bold">{props.key || props.field || "Value"}</code>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-1 border-t border-slate-100 dark:border-slate-800">
            <div>
              <span className="block font-semibold text-rose-500">Nilai Lama:</span>
              <pre className="mt-1 p-2 rounded bg-rose-500/5 border border-rose-500/10 text-rose-600 dark:text-rose-400 font-mono overflow-x-auto max-h-36 whitespace-pre-wrap">{String(props.old)}</pre>
            </div>
            <div>
              <span className="block font-semibold text-emerald-500">Nilai Baru:</span>
              <pre className="mt-1 p-2 rounded bg-emerald-500/5 border border-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono overflow-x-auto max-h-36 whitespace-pre-wrap">{String(props.new)}</pre>
            </div>
          </div>
        </div>
      );
    }

    // Format 2: changed_fields
    if (typeof props === "object" && Array.isArray(props.changed_fields)) {
      return (
        <div className="text-xs text-slate-700 dark:text-slate-300">
          <span className="font-semibold text-slate-500 dark:text-slate-400">Field yang Diperbarui:</span>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {props.changed_fields.map((f: string, i: number) => (
              <span key={i} className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium font-mono text-[11px]">
                {f}
              </span>
            ))}
          </div>
        </div>
      );
    }

    // Format 3: Catatan Reject
    if (typeof props === "object" && "catatan_reject" in props) {
      return (
        <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-500 dark:text-slate-400">Tahap Penolakan:</span>
            <span className="font-bold text-slate-800 dark:text-white">{props.stage || "N/A"}</span>
          </div>
          <div>
            <span className="block font-semibold text-red-500">Alasan Reject:</span>
            <div className="mt-1 p-2.5 rounded-lg bg-red-500/5 border border-red-500/10 text-red-600 dark:text-red-400 italic">
              &quot;{props.catatan_reject}&quot;
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
        <span className="font-semibold text-slate-500 dark:text-slate-400">Properties (Payload JSON):</span>
        <pre className="mt-1 p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300 font-mono text-[11px] overflow-x-auto max-h-60 overflow-y-auto whitespace-pre-wrap">
          {JSON.stringify(props, null, 2)}
        </pre>
      </div>
    );
  };

  const STAT_CARDS = [
    {
      key: "total",
      label: "Total VCF",
      sub: "Semua record VCF",
      color: "#3b82f6",
      value: stats.total,
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124l-.317-5.136a5.378 5.378 0 00-1.2-3.218l-2.28-2.28a.75.75 0 00-.53-.22H15m3.75 12h.007v.008H18.75V18.75zm-6-13.5V3.375c0-.621-.504-1.125-1.125-1.125h-2.25a1.125 1.125 0 00-1.125 1.125V5.25m4.5 0A2.25 2.25 0 009 3.75a2.25 2.25 0 00-2.25 1.5M9 5.25h3m-6 0h.008v.008H6V5.25zm0 9h.008v.008H6V14.25zm0 2.25h.008v.008H6v-.008zm1.5-4.5h.008v.008H7.5v-.008zm0 2.25h.008v.008H7.5v-.008zm1.5-4.5h.008v.008H9v-.008zm0 2.25h.008v.008H9v-.008zm3-3H6m12 0h-3" />
        </svg>
      ),
    },
    {
      key: "today",
      label: "VCF Hari Ini",
      sub: "VCF tercatat hari ini",
      color: "#10b981",
      value: stats.today,
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      key: "active",
      label: "VCF di Area",
      sub: "Kendaraan aktif di area",
      color: "#f59e0b",
      value: stats.active,
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124l-.317-5.136a5.378 5.378 0 00-1.2-3.218l-2.28-2.28a.75.75 0 00-.53-.22H15m3.75 12h.007v.008H18.75V18.75zm-6-13.5V3.375c0-.621-.504-1.125-1.125-1.125h-2.25a1.125 1.125 0 00-1.125 1.125V5.25m4.5 0A2.25 2.25 0 009 3.75a2.25 2.25 0 00-2.25 1.5M9 5.25h3m-6 0h.008v.008H6V5.25zm0 9h.008v.008H6V14.25zm0 2.25h.008v.008H6v-.008zm1.5-4.5h.008v.008H7.5v-.008zm0 2.25h.008v.008H7.5v-.008zm1.5-4.5h.008v.008H9v-.008zm0 2.25h.008v.008H9v-.008zm3-3H6m12 0h-3" />
        </svg>
      ),
    },
    {
      key: "system_speed",
      label: "Kecepatan Sistem",
      sub: "Response time (ms)",
      color: "#8b5cf6",
      value: stats.system_speed,
      icon: (
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-8 antialiased text-slate-800 dark:text-slate-100">
      
      {/* ── HEADER SECTION ──────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-sans">
            {greeting}, {user?.nama?.split(" ")[0] || "Pengguna"}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
            <span className="font-medium">{isAdmin() ? "Administrator · PT. Industri Nabati Lestari" : "Officer · Main Gate"}</span>
            <span className="hidden sm:inline opacity-40">•</span>
            <span className="text-slate-400 dark:text-slate-500">
              {now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </span>
          </p>
        </div>

        <RegisterButton label="Registrasi VCF Baru" />
      </div>

      {/* ── QUICK ACTIONS (Officer Only) ────────── */}
      {!isAdmin() && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK_ACTIONS.map(a => (
            <Link
              key={a.href}
              href={a.href}
              className={`group relative block rounded-xl p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 ${a.colorClass}`}
            >
              <div className={`absolute top-0 left-0 right-0 h-[3px] rounded-t-xl ${a.barBg}`} />
              <div className="flex items-center justify-between mb-4">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm ${a.iconBg} ${a.iconText}`}>
                  {a.stage.split(" ")[1]}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${a.iconText}`}>
                  {a.stage}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {a.label}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {a.sub}
              </p>
            </Link>
          ))}
        </div>
      )}

      {/* ── Quick Shortcut VCF ───────────────── */}
      <div style={{ marginTop: "12px", marginBottom: "20px" }}>
        <ViewVcfButton label="Lihat Monitoring VCF Aktif" />
      </div>

      {/* ── Stat Cards (Activity Log Stats) ─────────────────────────── */}
      <div
        data-stat-grid
        className="order-2 lg:order-1 mb-8"
        style={{ display: "grid", gridTemplateColumns: "repeat(1, 1fr)", gap: "12px" }}
      >
        <style>{`
          @media (min-width: 480px) {
            [data-stat-grid] {
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 12px !important;
            }
          }
          @media (min-width: 1024px) {
            [data-stat-grid] {
              grid-template-columns: repeat(4, 1fr) !important;
              gap: 16px !important;
            }
          }
        `}</style>
        {statsLoading ? [1,2,3,4].map(i => <StatCardSkeleton key={i}/>) : STAT_CARDS.map(card => (
            <div key={card.key} style={{
              borderRadius: 14, padding: "18px 16px", position: "relative", overflow: "hidden",
              background: "var(--bg-card)", border: `2px solid ${card.color}25`,
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
              minWidth: 0,
            }}>
              <div className="flex items-center justify-between w-full mb-3">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{card.label}</span>
                <div className="p-1.5 rounded-lg" style={{ color: card.color, background: `${card.color}15` }}>
                  {card.icon}
                </div>
              </div>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white leading-none font-sans tracking-tight">
                {card.value}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-medium">{card.sub}</p>
              {/* Soft background glow */}
              <div className="absolute right-0 bottom-0 w-16 h-16 rounded-full blur-2xl opacity-15 pointer-events-none" style={{ backgroundColor: card.color }} />
            </div>
        ))}
      </div>

      {/* ── ACTIVITY LOGS PANEL ───────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        
        {/* Controls Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-base text-slate-900 dark:text-white">Log Aktivitas Sistem</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Seluruh kegiatan operasional, perubahan, dan penolakan VCF tercatat di sini</p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="px-5 py-4 bg-slate-50/50 dark:bg-slate-900/20 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Cari deskripsi, nama user, target..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 transition-colors shadow-2xs"
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center border border-slate-200 dark:border-slate-700 p-0.5 rounded-lg bg-white dark:bg-slate-800">
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-md transition-all ${viewMode === "table" ? "bg-slate-100 dark:bg-slate-700 text-blue-600 dark:text-blue-400" : "text-slate-400 hover:text-slate-600"}`}
                title="Tampilan Tabel"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("card")}
                className={`p-1.5 rounded-md transition-all ${viewMode === "card" ? "bg-slate-100 dark:bg-slate-700 text-blue-600 dark:text-blue-400" : "text-slate-400 hover:text-slate-600"}`}
                title="Tampilan Kartu"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Module Filter */}
            <div>
              <select
                value={selectedModule}
                onChange={(e) => { setSelectedModule(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
              >
                {MODULE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Action Filter */}
            <div>
              <select
                value={selectedAction}
                onChange={(e) => { setSelectedAction(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
              >
                {ACTION_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Date Filter */}
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => { setSelectedDate(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
              />
              {selectedDate && (
                <button
                  onClick={() => { setSelectedDate(""); setCurrentPage(1); }}
                  className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── CARD VIEW PANEL ── */}
        {viewMode === "card" && (
          <div className="p-5">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map(i => <MobileCardSkeleton key={i} />)}
              </div>
            ) : logs.length === 0 ? (
              <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-sm">Tidak ada catatan log aktivitas yang cocok.</div>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="block p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/40 hover:border-blue-500/30 hover:shadow-sm transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold font-mono">
                          {formatDateTime(log.created_at)}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${getActionBadge(log.action)}`}>
                          {log.action}
                        </span>
                      </div>
                      
                      <div className="mb-4">
                        <span className={`inline-block px-1.5 py-0.5 rounded border text-[9px] font-extrabold uppercase tracking-wide mb-2 ${getModuleBadge(log.module)}`}>
                          {log.module}
                        </span>
                        <p className="font-bold text-slate-900 dark:text-white text-xs leading-relaxed group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {log.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-850">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                            {log.user_name || "Sistem"}
                          </span>
                          <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">
                            {log.user_role || "System Process"}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline">
                          Lihat Detail →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Pagination currentPage={currentPage} totalItems={totalItems} itemsPerPage={15} onPageChange={(p) => setCurrentPage(p)} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TABLE VIEW PANEL ── */}
        {viewMode === "table" && (
          <div className="overflow-x-auto JSON-table-container">
            {loading ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-wider font-bold border-b border-slate-100 dark:border-slate-800">
                    <th className="p-4 pl-6">Waktu</th>
                    <th className="p-4">Modul</th>
                    <th className="p-4">Aktor</th>
                    <th className="p-4">Deskripsi Aktivitas</th>
                    <th className="p-4">Target / Label</th>
                    <th className="p-4 pr-6 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>{[1, 2, 3, 4, 5].map(i => <TableRowSkeleton key={i} />)}</tbody>
              </table>
            ) : logs.length === 0 ? (
              <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-sm font-medium">Tidak ada catatan log aktivitas.</div>
            ) : (
              <div className="w-full">  
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/60 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-100 dark:border-slate-800/80">
                      <th className="p-4 pl-6 font-bold text-slate-400 dark:text-slate-500 w-[160px]">Waktu</th>
                      <th className="p-4 font-bold text-slate-700 dark:text-slate-300 w-[120px]">Modul & Aksi</th>
                      <th className="p-4 font-bold text-slate-700 dark:text-slate-300 w-[180px]">Aktor</th>
                      <th className="p-4 font-bold text-slate-700 dark:text-slate-300">Deskripsi Aktivitas</th>
                      <th className="p-4 font-bold text-slate-700 dark:text-slate-300 w-[180px]">Target Label</th>
                      <th className="p-4 text-start pr-6 font-bold text-slate-700 dark:text-slate-300 text-right w-[110px]">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-sm">
                    {logs.map((log) => (
                      <tr 
                        key={log.id} 
                        className="even:bg-slate-50/[0.2] dark:even:bg-slate-950/[0.1] hover:bg-blue-50/20 dark:hover:bg-slate-800/20 transition-colors duration-150 group/row"
                      >
                        <td className="p-4 pl-6 font-medium">
                          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            {formatDateTime(log.created_at)}
                          </span>
                        </td>
                        
                        <td className="p-4">
                          <div className="flex flex-col gap-1 items-start">
                            <span className={`inline-block px-2 py-0.5 rounded border text-[9px] font-extrabold uppercase tracking-wide ${getModuleBadge(log.module)}`}>
                              {log.module}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${getActionBadge(log.action)}`}>
                              {log.action}
                            </span>
                          </div>
                        </td>
                        
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {log.user_name || <span className="text-slate-400 dark:text-slate-600 font-normal italic">System</span>}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
                              {log.user_role || "Process"}
                            </span>
                          </div>
                        </td>
                        
                        <td className="p-4 font-semibold text-slate-800 dark:text-slate-100 max-w-[400px]">
                          <p className="text-xs leading-relaxed">{log.description}</p>
                        </td>
                        
                        <td className="p-4">
                          {log.subject_label ? (
                            <span className="inline-flex items-center text-[10px] font-extrabold px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono tracking-tight border border-slate-200/40 dark:border-slate-700/50 shadow-2xs">
                              {log.subject_label}
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-700 font-mono text-xs">—</span>
                          )}
                        </td>
                        
                        <td className="p-4 pr-6 text-right">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="inline-flex items-center justify-center text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 dark:text-blue-400 transition-all duration-200 group-hover/row:scale-[1.03]"
                          >
                            <span>Detail</span>
                            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" className="ml-1">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                <div className="p-5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/[0.1] dark:bg-slate-950/[0.05]">
                  <Pagination currentPage={currentPage} totalItems={totalItems} itemsPerPage={15} onPageChange={(p) => setCurrentPage(p)} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── MODAL DETAIL LOG ─────────────────────────── */}
      {mounted && selectedLog && createPortal(
        <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Detail Log Aktivitas</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">ID Log: #{selectedLog.id} · {formatDateTime(selectedLog.created_at)}</p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="py-6 space-y-6">
              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 text-xs">
                <div className="space-y-1">
                  <span className="text-slate-400 dark:text-slate-500 font-semibold block uppercase tracking-wider text-[10px]">Aktor / User</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedLog.user_name || "Sistem / Automasi"}</span>
                  <span className="text-slate-400 block">{selectedLog.user_role || "Internal Process"}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 dark:text-slate-500 font-semibold block uppercase tracking-wider text-[10px]">IP Address</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">{selectedLog.ip_address || "—"}</span>
                </div>
                <div className="space-y-1 col-span-2 pt-2 border-t border-slate-200/40 dark:border-slate-800/40">
                  <span className="text-slate-400 dark:text-slate-500 font-semibold block uppercase tracking-wider text-[10px]">User Agent</span>
                  <span className="text-slate-600 dark:text-slate-400 font-mono text-[11px] block break-all">{selectedLog.user_agent || "—"}</span>
                </div>
              </div>

              {/* Event & Module details */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">Modul:</span>
                    <span className={`px-2 py-0.5 rounded border text-[10px] font-extrabold uppercase tracking-wide ${getModuleBadge(selectedLog.module)}`}>
                      {selectedLog.module}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">Aksi:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide ${getActionBadge(selectedLog.action)}`}>
                      {selectedLog.action}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/10 dark:border-blue-500/20 rounded-xl">
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-1">Aktivitas</span>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white leading-relaxed">{selectedLog.description}</p>
                </div>
              </div>

              {/* Properties / Changes Log */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                {renderLogProperties(selectedLog.properties)}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-850 dark:text-slate-200 text-xs font-bold transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}