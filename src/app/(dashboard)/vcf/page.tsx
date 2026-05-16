"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation"; // used in RegisterButton
import { vcfApi } from "@/lib/api";
import { prefetchMasterData } from "@/lib/masterDataCache";
import { getStatusLabel, getStatusColor } from "@/lib/utils";
import GuideSection from "@/components/GuideSection";

interface VcfSummary {
  id: number;
  nomor_urut: string;
  no_polisi: string;
  status: string;
  tipe_kegiatan: string;
  tanggal: string;
  transporter?: { nama_transporter: string };
  driver?: { nama_supir: string };
}

function RegisterButton() {
  const router = useRouter();
  const [nav, setNav] = useState(false);
  return (
    <button
      onClick={() => { setNav(true); router.push("/vcf/register"); }}
      disabled={nav}
      className="glass-card flex-1 md:flex-none p-2 px-6 flex items-center justify-center gap-2 group hover:border-blue-500/50 transition-all disabled:opacity-70"
    >
      {nav ? (
        <svg className="animate-spin w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14" /></svg>
        </div>
      )}
      <p className="text-[13px] font-bold text-primary uppercase">{nav ? "Memuat..." : "Registrasi"}</p>
    </button>
  );
}

const getActionLabel = (status: string) => {
  const map: Record<string, string> = {
    bagian1_selesai: "Isi Bagian 2",
    bagian2_selesai: "Isi Bagian 3",
    loading_unloading_proses: "Lihat Operasional",
    loading_unloading_selesai: "Isi Bagian 3",
    bagian3_selesai: "Isi Bagian 4",
    weighbridge_keluar: "Keluar Main Gate",
    selesai: "Lihat Detail",
    reject: "Lihat Detail",
  };
  return map[status] ?? "Detail";
};

const getActionButtonStyle = (status: string) => {
  switch (status) {
    case "bagian1_selesai": return "border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-white shadow-sm hover:shadow-amber-500/20";
    case "bagian2_selesai": return "border-indigo-500 text-indigo-500 hover:bg-indigo-500 hover:text-white shadow-sm hover:shadow-indigo-500/20";
    case "loading_unloading_proses":
    case "loading_unloading_selesai": return "border-violet-500 text-violet-500 hover:bg-violet-500 hover:text-white shadow-sm hover:shadow-violet-500/20";
    case "bagian3_selesai": return "border-emerald-500 text-emerald-500 hover:bg-emerald-500 hover:text-white shadow-sm hover:shadow-emerald-500/20";
    case "selesai":
    case "reject":
      return "border-slate-300 text-slate-500 hover:bg-slate-500 hover:text-white dark:border-white/20 dark:text-slate-400 dark:hover:bg-white/20 dark:hover:text-white";
    default:
      return "border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white shadow-sm hover:shadow-blue-500/20";
  }
};

// Skeleton Components
function TableRowSkeleton() {
  return (
    <tr>
      <td><div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></td>
      <td><div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></td>
      <td><div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></td>
      <td><div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></td>
      <td><div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></td>
      <td><div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></td>
    </tr>
  );
}

function MobileCardSkeleton() {
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    </div>
  );
}

export default function VcfQuickAccessPage() {
  const [vcfs, setVcfs] = useState<VcfSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("aktif");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [viewMode, setViewMode] = useState<"card" | "table">("table");
  const [showGuide, setShowGuide] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchActive = useCallback(async () => {
    setLoading(true);
    try {
      const res = await vcfApi.getList({
        status: filter,
        search: debouncedSearch,
        per_page: 15
      });
      const items = res.data.data || res.data;
      setVcfs(items.filter((v: VcfSummary) => v.status !== "selesai" && v.status !== "reject"));
    } catch {

    } finally {
      setLoading(false);
    }
  }, [filter, debouncedSearch]);

  useEffect(() => {
    fetchActive();
    // Prefetch master data in background so register page is instant
    prefetchMasterData();
  }, [fetchActive]);

  // Auto-refresh every 30 seconds, but only when not searching
  useEffect(() => {
    if (debouncedSearch) return; // Don't auto-refresh when user is searching
    const interval = setInterval(fetchActive, 30000);
    return () => clearInterval(interval);
  }, [fetchActive, debouncedSearch]);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Operasional VCF
          </h1>
          <p className="text-secondary text-sm">Akses cepat formulir pemeriksaan kendaraan — PT. INL</p>
        </div>
        <button
          onClick={() => setShowGuide(!showGuide)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${showGuide
            ? "bg-blue-500/10 text-blue-500 border-blue-500/30"
            : "bg-bg-secondary text-text-muted border-border hover:border-blue-500/30"
            }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          <span>{showGuide ? "Tutup Panduan" : "Panduan Operasional"}</span>
        </button>
      </div>

      {showGuide && (
        <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
          <GuideSection />
        </div>
      )}

      {/* Stage Filters / Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
        {[
          { label: "Semua Aktif", stage: "aktif", color: "var(--accent-primary)" },
          { label: "WB Masuk", stage: "bagian1_selesai", color: "#f59e0b" },
          { label: "Loading", stage: "bagian2_selesai", color: "#6366f1" },
          { label: "WB Keluar", stage: "loading_unloading_selesai", color: "#8b5cf6" },
        ].map((tab) => (
          <button
            key={tab.stage}
            onClick={() => setFilter(tab.stage)}
            className="btn btn-sm flex-shrink-0 px-6 py-3 font-bold text-[11px] uppercase tracking-wider"
            style={
              filter === tab.stage
                ? {
                  background: tab.color,
                  borderColor: tab.color,
                  color: "white",
                  boxShadow: `0 8px 16px ${tab.color}33`,
                }
                : {
                  background: "var(--bg-secondary)",
                  color: "var(--text-muted)",
                  border: "1px solid var(--border)",
                }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search & Stats Section */}
      <div className="flex flex-col md:flex-row items-center gap-4 mb-8">
        <div className="relative flex-1 w-full">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary pointer-events-none">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Cari No. Polisi atau Supir..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 pl-11 pr-4 rounded-xl text-sm transition-all focus:outline-none"
            style={{
              background: "var(--bg-card)",
              border: "1.5px solid var(--border)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        <div className="flex gap-4 w-full md:w-auto">
          <div className="glass-card flex-1 md:flex-none md:min-w-[120px] p-2 px-4 flex flex-col items-center justify-center text-center">
            <p className="text-[9px] font-bold text-secondary uppercase mb-0.5">Total</p>
            <p className="text-xl font-bold text-blue-500">{vcfs.length}</p>
          </div>
          <RegisterButton />
        </div>
      </div>

      {/* Monitoring Section */}
      <div className="glass-card overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
          <div>
            <h2 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Monitoring VCF di Area</h2>
            <p className="text-[10px] text-secondary">Kendaraan yang sedang berada di dalam area pabrik INL</p>
          </div>
          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex items-center rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
              <button
                onClick={() => setViewMode("table")}
                title="Tampilan tabel"
                className="p-2 transition-all"
                style={viewMode === "table"
                  ? { background: "rgba(59,130,246,0.15)", color: "#60a5fa" }
                  : { color: "var(--text-muted)" }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("card")}
                title="Tampilan kartu"
                className="p-2 transition-all"
                style={viewMode === "card"
                  ? { background: "rgba(59,130,246,0.15)", color: "#60a5fa" }
                  : { color: "var(--text-muted)" }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              </button>
            </div>
            <Link href="/vcf/list?stage=aktif" className="text-xs font-bold text-blue-500 hover:underline">
              Lihat Semua
            </Link>
          </div>
        </div>

        {/* ── CARD VIEW ── */}
        {viewMode === "card" && (
          <div className="p-4">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map(i => <MobileCardSkeleton key={i} />)}
              </div>
            ) : vcfs.length === 0 ? (
              <div className="py-12 text-center text-secondary text-sm">Tidak ada kendaraan aktif saat ini.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {vcfs.map((vcf) => (
                  <Link
                    key={vcf.id}
                    href={`/vcf/${vcf.id}`}
                    className="block p-4 rounded-xl border transition-all hover:border-blue-500/40 hover:shadow-md group"
                    style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className="font-mono font-bold text-blue-400 text-sm">{vcf.nomor_urut}</span>
                      <span className={`status-badge text-[9px] ${getStatusColor(vcf.status)}`}>
                        {getStatusLabel(vcf.status)}
                      </span>
                    </div>
                    <div className="mb-3">
                      <p className="font-bold text-text-primary dark:text-white text-base leading-tight">{vcf.no_polisi}</p>
                      <p className="text-[11px] text-secondary mt-0.5">{vcf.driver?.nama_supir || "—"}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-500 uppercase">
                        {vcf.tipe_kegiatan?.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] font-bold text-blue-400 group-hover:underline">
                        {getActionLabel(vcf.status)} →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TABLE VIEW ── */}
        {viewMode === "table" && (
          <div className="overflow-x-auto">
            {loading ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>No.</th><th>No. Polisi</th><th>Supir</th><th>Tipe</th><th>Status</th><th>Aksi</th>
                  </tr>
                </thead>
                <tbody>{[1, 2, 3, 4, 5].map(i => <TableRowSkeleton key={i} />)}</tbody>
              </table>
            ) : vcfs.length === 0 ? (
              <div className="py-12 text-center text-secondary text-sm">Tidak ada kendaraan aktif saat ini.</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>No.</th><th>No. Polisi</th><th>Supir</th><th>Transporter</th><th>Tipe</th><th>Status</th><th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {vcfs.map((vcf) => (
                    <tr key={vcf.id}>
                      <td><span className="font-mono font-bold text-blue-400">{vcf.nomor_urut}</span></td>
                      <td className="font-semibold">{vcf.no_polisi}</td>
                      <td className="text-secondary text-sm">{vcf.driver?.nama_supir || "—"}</td>
                      <td className="text-secondary text-sm">{vcf.transporter?.nama_transporter || "—"}</td>
                      <td>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-500 uppercase">
                          {vcf.tipe_kegiatan?.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${getStatusColor(vcf.status)}`}>
                          {getStatusLabel(vcf.status)}
                        </span>
                      </td>
                      <td>
                        <Link
                          href={`/vcf/${vcf.id}`}
                          className={`flex items-center justify-center rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all border-2 ${getActionButtonStyle(vcf.status)}`}
                        >
                          {getActionLabel(vcf.status)}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
