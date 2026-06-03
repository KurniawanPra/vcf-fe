"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { vcfApi } from "@/lib/api";
import { prefetchMasterData } from "@/lib/masterDataCache";
import { getStatusLabel, getStatusColor, getActionButtonStyle, getActionLabel } from "@/lib/utils";
import GuideSection from "@/components/GuideSection";
import SearchInput from "@/components/SearchInput";
import { useToast, ToastContainer } from "@/components/Toast";
import Pagination from "@/components/Pagination";
import MobileCardSkeleton from "@/components/MobileCardSkeleton";
import TableRowSkeleton from "@/components/TableRowSkeleton";
import RegisterButton from "@/components/RegisterButton";
import DatePickerModal, { DateRangeTrigger } from "@/components/DatePickerModal";

/** Get today's date string in WIB (Asia/Jakarta) as YYYY-MM-DD */
function getTodayWIB(): string {
  const now = new Date();
  return now.toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
}

/** Get date string 1 month ago in WIB as YYYY-MM-DD.
 *  If the previous month doesn't have the same day (e.g. May 31 → no April 31),
 *  falls back to the 1st of the current month instead. */
function getOneMonthAgoWIB(): string {
  const todayStr = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
  const d = new Date(todayStr);
  const targetMonth = d.getMonth() - 1;
  d.setMonth(targetMonth);
  // Overflow: JS jumped past the intended month (e.g. May 31 → May 1 instead of April 31)
  if (d.getMonth() !== ((targetMonth + 12) % 12)) {
    // Use 1st of the current month (tanggal_sampai's month)
    const firstOfMonth = new Date(todayStr);
    firstOfMonth.setDate(1);
    return firstOfMonth.toLocaleDateString("sv-SE");
  }
  return d.toLocaleDateString("sv-SE");
}

/** Check if a VCF's tanggal is before today (i.e. from a previous day) */
function isPreviousDay(tanggal: string): boolean {
  if (!tanggal) return false;
  const vcfDate = tanggal.split("T")[0]; // handle both "2026-05-28" and "2026-05-28T..." formats
  return vcfDate < getTodayWIB();
}


interface VcfSummary {
  id: number;
  nomor_urut: string;
  no_polisi: string;
  status: string;
  tipe_kegiatan: string;
  tanggal: string;
  transporter?: { nama_transporter: string };
  driver?: { nama_supir: string; no_sim?: string };
}

export default function VcfQuickAccessPage() {
  const { toasts, removeToast, toast } = useToast();
  const [vcfs, setVcfs] = useState<VcfSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tanggalDari, setTanggalDari] = useState(getOneMonthAgoWIB);
  const [tanggalSampai, setTanggalSampai] = useState(getTodayWIB);
  const [viewMode, setViewMode] = useState<"card" | "table">("table");
  const [showGuide, setShowGuide] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Derived stats: count of previous-day unfinished VCFs
  const pendingPrevDays = useMemo(() => vcfs.filter(v => isPreviousDay(v.tanggal)).length, [vcfs]);
  const todayCount = useMemo(() => vcfs.filter(v => !isPreviousDay(v.tanggal)).length, [vcfs]);
  const wbMasukCount = useMemo(() => vcfs.filter(v => v.status === "bagian1_selesai").length, [vcfs]);
  const wbKeluarCount = useMemo(() => vcfs.filter(v => v.status === "bagian2_selesai").length, [vcfs]);
  const mgKeluarCount = useMemo(() => vcfs.filter(v => v.status === "bagian3_selesai").length, [vcfs]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Dispatch modal events for showGuide
  useEffect(() => {
    if (showGuide) {
      document.body.style.overflow = "hidden";
      window.dispatchEvent(new CustomEvent("modal-open"));
    } else {
      document.body.style.overflow = "unset";
      window.dispatchEvent(new CustomEvent("modal-close"));
    }
    return () => {
      document.body.style.overflow = "unset";
      window.dispatchEvent(new CustomEvent("modal-close"));
    };
  }, [showGuide]);

  const fetchActive = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        search: debouncedSearch,
        per_page: 9999,
        tanggal_dari: tanggalDari,
        tanggal_sampai: tanggalSampai,
      };
      if (filter) params.status = filter;
      const activeRes = await vcfApi.getList(params);
      const items: VcfSummary[] = activeRes.data.data || activeRes.data;

      const allowedStatuses = ["bagian1_selesai", "bagian2_selesai", "bagian3_selesai"];
      const filteredItems = items.filter((v) => allowedStatuses.includes(v.status));
      setVcfs(filteredItems);
    } catch (err: any) {
      console.error("Error fetching VCF data:", err);
    } finally {
      setLoading(false);
    }
  }, [filter, debouncedSearch, tanggalDari, tanggalSampai]);

  useEffect(() => {
    setCurrentPage(1);
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
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      {/* Header */}
      <div className="morph-in mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Operasional VCF
          </h1>
          <p className="text-secondary text-sm">Data VCF Hari Ini</p>
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
      <div className="morph-in flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
        {[
          { label: "Semua", stage: "", cls: "filter-tab-green" },
          { label: "Aktif", stage: "aktif", cls: "filter-tab-blue" },
          { label: "WB Masuk", stage: "bagian1_selesai", cls: "filter-tab-amber" },
          { label: "WB Keluar", stage: "bagian2_selesai", cls: "filter-tab-violet" },
          { label: "MG Keluar", stage: "bagian3_selesai", cls: "filter-tab-emerald" },
        ].map((tab) => (
          <button
            key={tab.stage}
            onClick={() => setFilter(tab.stage)}
            className={`filter-tab ${tab.cls} flex-shrink-0 ${filter === tab.stage ? "active" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search & Date Filter Section */}
      <div className="morph-in flex flex-col gap-3 mb-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* Search Input */}
          <SearchInput
            placeholder="Cari No. Polisi atau Supir..."
            value={search}
            onChange={setSearch}
          />

          {/* Date Range — Custom Calendar */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <DateRangeTrigger
              startDate={tanggalDari}
              endDate={tanggalSampai}
              onClick={() => setIsDatePickerOpen(true)}
            />
            <button
              onClick={() => { setTanggalDari(getOneMonthAgoWIB()); setTanggalSampai(getTodayWIB()); setCurrentPage(1); }}
              className="btn btn-secondary btn-sm flex-shrink-0"
              style={{ minHeight: 42 }}
              title="Reset ke 1 bulan terakhir"
            >
              Reset
            </button>
          </div>

          <DatePickerModal
            isOpen={isDatePickerOpen}
            onClose={() => setIsDatePickerOpen(false)}
            startDate={tanggalDari}
            endDate={tanggalSampai}
            onApply={(start, end) => {
              setTanggalDari(start);
              setTanggalSampai(end);
              setCurrentPage(1);
            }}
          />
        </div>

        {/* Stat Badges + Action Buttons Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Stat Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="glass-card flex-1 sm:flex-none h-12 px-2 sm:px-4 flex flex-col items-center justify-center text-center min-w-[80px]" style={{ borderColor: "rgba(99,102,241,0.3)", background: "rgba(99,102,241,0.05)" }}>
              <p className="text-[9px] font-bold text-indigo-500 uppercase leading-none mb-0.5">Hari Ini</p>
              <p className="text-xl font-bold text-indigo-500 leading-none">{todayCount}</p>
            </div>
            <div className="glass-card flex-1 sm:flex-none h-12 px-2 sm:px-4 flex flex-col items-center justify-center text-center min-w-[80px]" style={{ borderColor: "rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.05)" }}>
              <p className="text-[9px] font-bold text-amber-500 uppercase leading-none mb-0.5">Ditunda</p>
              <p className="text-xl font-bold text-amber-500 leading-none">{pendingPrevDays}</p>
            </div>
            <div className="glass-card flex-1 sm:flex-none h-12 px-2 sm:px-4 flex flex-col items-center justify-center text-center min-w-[80px]" style={{ borderColor: "rgba(59,130,246,0.3)", background: "rgba(59,130,246,0.05)" }}>
              <p className="text-[9px] font-bold text-blue-500 uppercase leading-none mb-0.5">WB Masuk</p>
              <p className="text-xl font-bold text-blue-500 leading-none">{wbMasukCount}</p>
            </div>
            <div className="glass-card flex-1 sm:flex-none h-12 px-2 sm:px-4 flex flex-col items-center justify-center text-center min-w-[80px]" style={{ borderColor: "rgba(139,92,246,0.3)", background: "rgba(139,92,246,0.05)" }}>
              <p className="text-[9px] font-bold text-violet-500 uppercase leading-none mb-0.5">WB Keluar</p>
              <p className="text-xl font-bold text-violet-500 leading-none">{wbKeluarCount}</p>
            </div>
            <div className="glass-card flex-1 sm:flex-none h-12 px-2 sm:px-4 flex flex-col items-center justify-center text-center min-w-[80px]" style={{ borderColor: "rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.05)" }}>
              <p className="text-[9px] font-bold text-emerald-500 uppercase leading-none mb-0.5">MG Keluar</p>
              <p className="text-xl font-bold text-emerald-500 leading-none">{mgKeluarCount}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-stretch gap-2">
            {/* View Mode Toggle */}
            <div className="glass-card h-12 px-2 flex items-center justify-center">
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/10 rounded-lg p-1 justify-center">
                <button
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 flex justify-center rounded-md transition-all ${viewMode === "table" ? "bg-white dark:bg-slate-700 shadow-sm" : "hover:bg-white/50 dark:hover:bg-white/10"}`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode("card")}
                  className={`p-1.5 flex justify-center rounded-md transition-all ${viewMode === "card" ? "bg-white dark:bg-slate-700 shadow-sm" : "hover:bg-white/50 dark:hover:bg-white/10"}`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Register Button */}
            <div className="[&>button]:h-12 [&>button]:justify-center">
              <RegisterButton />
            </div>
          </div>
        </div>
      </div>

      {/* Monitoring Section */}
      <div className="morph-in glass-card overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
          <div>
            <h2 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Pemantauan VCF di Area Operasional</h2>
            <p className="text-[10px] text-secondary">Kendaraan yang sedang berada di dalam area pabrik INL</p>
          </div>
          <div className="flex items-center gap-3">
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
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {vcfs.slice((currentPage - 1) * 10, currentPage * 10).map((vcf) => {
                    const isOverdue = isPreviousDay(vcf.tanggal);
                    return (
                      <Link
                        key={vcf.id}
                        href={`/vcf/${vcf.id}`}
                        className="block p-4 rounded-xl border transition-all hover:border-blue-500/40 hover:shadow-md group"
                        style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex flex-col">
                            <span className="font-mono font-bold text-blue-400 text-sm">{vcf.nomor_urut}</span>
                            {isOverdue && (
                              <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                                {new Date(vcf.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            )}
                          </div>
                          <span className={`status-badge text-[9px] ${getStatusColor(vcf.status)}`}>
                            {getStatusLabel(vcf.status)}
                          </span>
                        </div>
                        <div className="mb-3">
                          <p className="font-bold text-text-primary dark:text-white text-base leading-tight">{vcf.no_polisi}</p>
                          <div className="flex flex-col mt-0.5">
                            <span className="text-[11px] text-secondary font-semibold">{vcf.driver?.nama_supir || "—"}</span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{vcf.driver?.no_sim || "—"}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-500 uppercase">
                            {vcf.tipe_kegiatan?.replace(/_/g, " ")}
                          </span>
                          <span className={`action-btn action-btn-sm ${getActionButtonStyle(vcf.status)}`}>
                            {getActionLabel(vcf.status)}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
                <div className="px-4 pb-4">
                  <Pagination currentPage={currentPage} totalItems={vcfs.length} itemsPerPage={10} onPageChange={(p) => setCurrentPage(p)} />
                </div>
              </>
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
              <>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>No.</th><th>No. Polisi</th><th>Supir</th><th>Transporter</th><th>Tipe</th><th>Status</th><th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vcfs.slice((currentPage - 1) * 10, currentPage * 10).map((vcf) => {
                      const isOverdue = isPreviousDay(vcf.tanggal);
                      return (
                        <tr key={vcf.id}>
                          <td>
                            <div className="flex flex-col">
                              <span className="font-mono font-bold text-blue-400">{vcf.nomor_urut}</span>
                              {isOverdue && (
                                <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium mt-0.5 whitespace-nowrap">
                                  {new Date(vcf.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="font-semibold whitespace-nowrap">{vcf.no_polisi}</td>
                          <td className="text-secondary text-sm">
                            <div className="flex flex-col">
                              <span className="font-semibold text-text-primary dark:text-white">{vcf.driver?.nama_supir || "—"}</span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{vcf.driver?.no_sim || "—"}</span>
                            </div>
                          </td>
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
                              className={`${getActionButtonStyle(vcf.status)}`}
                            >
                              {getActionLabel(vcf.status)}
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="px-6 pb-4">
                  <Pagination currentPage={currentPage} totalItems={vcfs.length} itemsPerPage={10} onPageChange={(p) => setCurrentPage(p)} />
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
