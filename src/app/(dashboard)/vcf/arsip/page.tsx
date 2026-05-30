"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { vcfApi } from "@/lib/api";
import { isAdmin } from "@/lib/auth";
import { getStatusLabel, getStatusColor, getErrorMessage } from "@/lib/utils";
import { exportToExcel } from "@/lib/exportUtils";
import PrintVCF from "../[id]/PrintVCF";
import PrintAllVCF from "@/components/print/PrintAllVCF";
import PrintMasterTable from "@/components/print/PrintMasterTable";
import Pagination from "@/components/Pagination";
import { useToast, ToastContainer } from "@/components/Toast";

/* ─────────────────── helpers ─────────────────── */
const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function pad(n: number) { return String(n).padStart(2, "0"); }

function getFirstDay(year: number, month: number) { return `${year}-${pad(month + 1)}-01`; }
function getLastDay(year: number, month: number) {
  const d = new Date(year, month + 1, 0);
  return `${year}-${pad(month + 1)}-${pad(d.getDate())}`;
}

interface VcfItem {
  id: number;
  nomor_urut: string;
  no_polisi: string;
  status: string;
  tipe_kegiatan: string;
  tanggal: string;
  jam_masuk: string;
  transporter?: { nama_transporter: string };
  driver?: { nama_supir: string; no_sim?: string };
  produk?: string;
  timbangan?: {
    bruto_from?: number | null;
    bruto?: number | null;
    tara_from?: number | null;
    tara?: number | null;
    netto_from?: number | null;
    netto?: number | null;
  };
  vcf_keluar?: { jam_keluar?: string; keterangan?: string };
  vcf_bagian2?: { keterangan?: string };
  vcf_bagian3?: { keterangan?: string };
  segel_masuk?: { jumlah_segel?: number; nomor_segel?: any[]; keterangan?: string };
  segel_keluar?: { jumlah_segel?: number; nomor_segel?: any[]; keterangan?: string };
  beban_tambahan_masuk?: { jenis_beban?: string };
  beban_tambahan_keluar?: { jenis_beban?: string };
  keterangan?: string;
}

interface MonthStat { total: number; selesai: number; reject: number; }

/* ══════════════════════════════════════════════════
   VIEW 1 — Kalender Tahunan
══════════════════════════════════════════════════ */
function YearCalendar({
  year, onSelectMonth, onChangeYear,
}: {
  year: number;
  onSelectMonth: (m: number) => void;
  onChangeYear: (y: number) => void;
}) {
  const now = new Date();
  const [stats, setStats] = useState<(MonthStat | null)[]>(new Array(12).fill(null));
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingStats(true);
      try {
        // Fetch summary for the whole year in one shot (big per_page, no pagination)
        const res = await vcfApi.getList({
          tanggal_dari: `${year}-01-01`,
          tanggal_sampai: `${year}-12-31`,
          per_page: "10000",
        });
        const raw = res.data;
        const list: VcfItem[] = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];

        // Bucket by month
        const buckets: MonthStat[] = Array.from({ length: 12 }, () => ({ total: 0, selesai: 0, reject: 0 }));
        list.forEach(v => {
          const m = new Date(v.tanggal).getMonth();
          if (m >= 0 && m < 12) {
            buckets[m].total++;
            if (v.status === "selesai") buckets[m].selesai++;
            if (v.status === "reject") buckets[m].reject++;
          }
        });
        if (!cancelled) setStats(buckets);
      } catch {
        if (!cancelled) setStats(new Array(12).fill({ total: 0, selesai: 0, reject: 0 }));
      } finally {
        if (!cancelled) setLoadingStats(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [year]);

  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="space-y-6">
      {/* Year Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-400">
              <path d="M5 8h14M5 8a2 2 0 1 0 0-4h14a2 2 0 1 0 0 4M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8m-9 4h4" />
            </svg>
            Arsip VCF
          </h1>
          <p className="page-subtitle">Pilih bulan untuk melihat data VCF</p>
        </div>

        {/* Year picker arrows */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onChangeYear(year + 1)}
            disabled={year >= now.getFullYear()}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
          </button>

          <select
            className="form-select h-10 text-base font-black px-3 w-auto"
            value={year}
            onChange={e => onChangeYear(Number(e.target.value))}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          <button
            onClick={() => onChangeYear(year - 1)}
            disabled={year <= now.getFullYear() - 5}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6" /></svg>
          </button>
        </div>
      </div>

      {/* 12-Month Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {BULAN.map((nama, i) => {
          const isFuture = year === now.getFullYear() && i > now.getMonth();
          const isThisMonth = year === now.getFullYear() && i === now.getMonth();
          const stat = stats[i];
          const hasData = stat && stat.total > 0;

          return (
            <button
              key={i}
              onClick={() => !isFuture && onSelectMonth(i)}
              disabled={isFuture}
              className={`glass-card p-4 text-left transition-all group relative overflow-hidden
                ${isFuture
                  ? "opacity-30 cursor-not-allowed"
                  : "hover:border-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                }
                ${isThisMonth ? "border-indigo-500/50 shadow-lg shadow-indigo-500/10" : ""}
              `}
            >
              {/* Subtle accent top bar */}
              {isThisMonth && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-violet-500" />
              )}

              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-bold text-text-muted uppercase tracking-wider">{pad(i + 1)}</p>
                  <p className={`text-base font-black mt-0.5 ${isThisMonth ? "text-indigo-400" : "text-text-primary group-hover:text-indigo-400 transition-colors"}`}>
                    {nama}
                  </p>
                </div>
                {isThisMonth && (
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 leading-none">
                    KINI
                  </span>
                )}
              </div>

              {loadingStats ? (
                <div className="h-4 w-16 rounded bg-white/5 animate-pulse" />
              ) : hasData ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                    <span className="text-lg font-black text-text-primary leading-none">{stat!.total}</span>
                    <span className="text-[10px] text-text-muted">VCF</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-text-muted">
                    <span className="text-emerald-500 font-bold">{stat!.selesai} selesai</span>
                    {stat!.reject > 0 && <span className="text-rose-500 font-bold">· {stat!.reject} reject</span>}
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-text-muted italic">Tidak ada data</p>
              )}

              {/* Arrow on hover */}
              {!isFuture && (
                <div className="absolute right-3 bottom-3 text-text-muted opacity-0 group-hover:opacity-100 transition-all translate-x-1 group-hover:translate-x-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   VIEW 2 — Daftar VCF per Bulan
══════════════════════════════════════════════════ */
function MonthList({
  year, month, onBack,
}: {
  year: number;
  month: number;
  onBack: () => void;
}) {
  const router = useRouter();
  const { toasts, removeToast, toast } = useToast();

  const firstDay = getFirstDay(year, month);
  const lastDay = getLastDay(year, month);

  const [vcfs, setVcfs] = useState<VcfItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [viewMode, setViewMode] = useState<"card" | "table">("table");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [lastPage, setLastPage] = useState(1);

  const [navigatingId, setNavigatingId] = useState<number | null>(null);

  // Printing individual VCF
  const [printingVcf, setPrintingVcf] = useState<any>(null);
  const [fetchingPrint, setFetchingPrint] = useState(false);
  // Print daftar VCF (tabel)
  const [isPrinting, setIsPrinting] = useState(false);
  // Print Semua VCF (multi-page form, sesuai filter rentang tanggal)
  const [printingAllVcfs, setPrintingAllVcfs] = useState<any[] | null>(null);
  const [fetchingPrintAll, setFetchingPrintAll] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  const handlePrint = async (id: number) => {
    setFetchingPrint(true);
    try {
      const res = await vcfApi.getDetail(id);
      setPrintingVcf(res.data);
    } catch {
      toast.error("Gagal", "Gagal mengambil detail VCF untuk pencetakan.");
    } finally {
      setFetchingPrint(false);
    }
  };

  const handlePrintAll = async () => {
    if (fetchingPrintAll) return;
    setFetchingPrintAll(true);
    try {
      const params: Record<string, string> = {
        per_page: "1000",
        tanggal_dari: firstDay,
        tanggal_sampai: lastDay,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      const listRes = await vcfApi.getList(params);
      const list: any[] = Array.isArray(listRes.data?.data)
        ? listRes.data.data
        : Array.isArray(listRes.data)
          ? listRes.data
          : [];
      if (list.length === 0) {
        toast.error("Kosong", "Tidak ada VCF pada rentang tanggal/filter yang dipilih.");
        return;
      }
      if (list.length > 200) {
        const ok = confirm(
          `Akan mencetak ${list.length} VCF (1 VCF = 1 halaman). Lanjutkan?`
        );
        if (!ok) return;
      }
      const details = await Promise.all(
        list.map((v) => vcfApi.getDetail(v.id).then((r) => r.data).catch(() => null))
      );
      const validDetails = details.filter(Boolean);
      if (validDetails.length === 0) {
        toast.error("Gagal", "Gagal memuat detail VCF untuk dicetak.");
        return;
      }
      setPrintingAllVcfs(validDetails);
    } catch (err: any) {
      toast.error("Gagal", "Gagal memuat data VCF: " + (err.response?.data?.message || err.message || "Terjadi kesalahan."));
    } finally {
      setFetchingPrintAll(false);
    }
  };

  const handleExportExcel = async () => {
    if (exportingExcel) return;
    setExportingExcel(true);
    try {
      const params: Record<string, string> = {
        per_page: "10000",
        tanggal_dari: firstDay,
        tanggal_sampai: lastDay,
      };
      if (debouncedSearch) params.search = debouncedSearch;

      const res = await vcfApi.getList(params);
      const list: any[] = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
          ? res.data
          : [];

      if (list.length === 0) {
        toast.error("Kosong", "Tidak ada VCF pada rentang tanggal/filter yang dipilih.");
        return;
      }

      const formattedData = list.map(v => [
        v.nomor_urut,
        v.tanggal,
        v.jam_masuk?.substring(0, 5) || "-",
        v.vcf_keluar?.jam_keluar?.substring(0, 5) || "-",
        v.no_polisi,
        v.driver?.nama_supir || "-",
        v.driver?.no_sim || "-",
        v.transporter?.nama_transporter || "-",
        v.produk || "-",
        v.tipe_kegiatan?.replace(/_/g, " "),
        getStatusLabel(v.status),
        formatSegel(v.segel_masuk),
        formatSegel(v.segel_keluar),
        v.beban_tambahan_masuk?.jenis_beban || "-",
        v.beban_tambahan_keluar?.jenis_beban || "-",
        v.keterangan || "-",
        v.vcf_bagian2?.keterangan || v.segel_masuk?.keterangan || "-",
        v.vcf_bagian3?.keterangan || v.segel_keluar?.keterangan || "-",
        v.vcf_keluar?.keterangan || "-",
      ]);

      exportToExcel(
        `Arsip_VCF_${BULAN[month]}_${year}`,
        exportHeaders,
        formattedData,
        `Arsip VCF — ${BULAN[month]} ${year}`,
        `Periode: ${firstDay} s/d ${lastDay}${search ? ` · Pencarian: "${search}"` : ""}`
      );
    } catch (err: any) {
      toast.error("Gagal", "Gagal memuat data VCF untuk export: " + (err.response?.data?.message || err.message || "Terjadi kesalahan."));
    } finally {
      setExportingExcel(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset ke halaman 1 ketika filter/search berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, firstDay, lastDay]);

  const fetchVcfs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        per_page: "10",
        page: String(currentPage),
        tanggal_dari: firstDay,
        tanggal_sampai: lastDay,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      const res = await vcfApi.getList(params);
      const responseData = res.data;
      if (responseData.data && Array.isArray(responseData.data)) {
        setVcfs(responseData.data);
        setTotalItems(responseData.total ?? responseData.data.length);
        setLastPage(responseData.last_page ?? 1);
      } else {
        setVcfs(responseData);
        setTotalItems(responseData.length);
        setLastPage(1);
      }
    } catch (err: any) {
      toast.error("Gagal", "Gagal mengambil data VCF: " + (err.response?.data?.message || err.message || "Terjadi kesalahan."));
    } finally {
      setLoading(false);
    }
  }, [firstDay, lastDay, debouncedSearch, currentPage]);

  useEffect(() => {
    fetchVcfs();
  }, [fetchVcfs]);

  // Dispatch modal events for PrintVCF
  useEffect(() => {
    if (printingVcf) {
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
  }, [printingVcf]);

  // Dispatch modal events for PrintAllVCF
  useEffect(() => {
    if (printingAllVcfs) {
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
  }, [printingAllVcfs]);

  // Dispatch modal events for PrintMasterTable
  useEffect(() => {
    if (isPrinting) {
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
  }, [isPrinting]);

  const getActionLabel = (vcf: VcfItem) => {
    const map: Record<string, string> = {
      bagian1_selesai: "WB Masuk",
      bagian2_selesai: "WB Keluar",
      loading_unloading_proses: "Lihat Operasional",
      loading_unloading_selesai: "WB Keluar",
      bagian3_selesai: "MG Keluar",
      selesai: "Lihat Detail",
      reject: "Lihat Detail",
    };
    return map[vcf.status] ?? "Detail";
  };

  const getActionButtonStyle = (status: string) => {
    switch (status) {
      case "bagian1_selesai": return "action-btn action-btn-amber";
      case "bagian2_selesai": return "action-btn action-btn-indigo";
      case "loading_unloading_proses":
      case "loading_unloading_selesai": return "action-btn action-btn-violet";
      case "bagian3_selesai": return "action-btn action-btn-emerald";
      case "selesai":
      case "reject": return "action-btn action-btn-slate";
      default: return "action-btn action-btn-blue";
    }
  };

  const formatSegel = (segel?: { jumlah_segel?: number; nomor_segel?: any[] }) => {
    if (!segel || !segel.nomor_segel || segel.nomor_segel.length === 0) return "-";
    return segel.nomor_segel.map((s: any) => typeof s === 'string' ? s : s.nomor_segel).join(", ");
  };

  const exportHeaders = [
    "No. Urut", "Tanggal", "Jam Masuk", "Jam Keluar", "No. Polisi", "Supir", "No. SIM", "Transporter", "Produk", "Tipe", "Status",
    "Segel Masuk", "Segel Keluar",
    "Beban Tambahan Masuk", "Beban Tambahan Keluar",
    "Keterangan 1", "Keterangan 2", "Keterangan 3", "Keterangan 4",
  ];
  const exportData = vcfs.map(v => [
    v.nomor_urut,
    v.tanggal,
    v.jam_masuk?.substring(0, 5) || "-",
    v.vcf_keluar?.jam_keluar?.substring(0, 5) || "-",
    v.no_polisi,
    v.driver?.nama_supir || "-",
    v.driver?.no_sim || "-",
    v.transporter?.nama_transporter || "-",
    v.produk || "-",
    v.tipe_kegiatan?.replace(/_/g, " "),
    getStatusLabel(v.status),
    formatSegel(v.segel_masuk),
    formatSegel(v.segel_keluar),
    v.beban_tambahan_masuk?.jenis_beban || "-",
    v.beban_tambahan_keluar?.jenis_beban || "-",
    v.keterangan || "-",
    v.vcf_bagian2?.keterangan || v.segel_masuk?.keterangan || "-",
    v.vcf_bagian3?.keterangan || v.segel_keluar?.keterangan || "-",
    v.vcf_keluar?.keterangan || "-",
  ]);

  return (
    <div className="space-y-5">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-xl flex items-center justify-center glass-card hover:border-indigo-500/30 transition-all text-text-muted hover:text-text-primary"
            title="Kembali ke kalender"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted font-semibold">Arsip VCF</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted"><path d="m9 18 6-6-6-6" /></svg>
              <span className="text-xs text-indigo-400 font-bold">{BULAN[month]} {year}</span>
            </div>
            <h1 className="text-lg font-black text-text-primary mt-0.5 leading-tight">
              Arsip VCF — {BULAN[month]} {year}
            </h1>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          {/* View toggle */}
          <div className="flex items-center justify-between sm:justify-start gap-2">
            <div className="flex items-center rounded-lg overflow-hidden border border-border bg-bg-secondary p-1">
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-md transition-all ${viewMode === "table" ? "bg-blue-500/10 text-blue-500" : "text-secondary"}`}
                title="Tampilan Tabel"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("card")}
                className={`p-1.5 rounded-md transition-all ${viewMode === "card" ? "bg-blue-500/10 text-blue-500" : "text-secondary"}`}
                title="Tampilan Kartu"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 sm:flex sm:flex-row gap-2 sm:gap-3">
            <button onClick={() => setIsPrinting(true)} className="btn btn-secondary btn-sm flex items-center justify-center gap-2 text-xs whitespace-nowrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
              </svg>
              <span className="hidden sm:inline">Print HTML</span>
              <span className="sm:hidden">HTML</span>
            </button>
            <button
              onClick={handlePrintAll}
              disabled={fetchingPrintAll}
              className="btn btn-primary btn-sm flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 border-none text-white disabled:opacity-60 text-xs whitespace-nowrap"
              title="Cetak Semua VCF (Form Lengkap) dalam rentang tanggal terpilih — 1 VCF per halaman"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
              </svg>
              <span className="hidden sm:inline">{fetchingPrintAll ? "Memuat..." : "Print Semua VCF"}</span>
              <span className="sm:hidden">{fetchingPrintAll ? "..." : "Semua"}</span>
            </button>
            <button
              onClick={handleExportExcel}
              disabled={exportingExcel}
              className="btn btn-primary btn-sm flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 border-none text-white disabled:opacity-60 text-xs whitespace-nowrap"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {exportingExcel ? "..." : "Excel"}
            </button>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="glass-card p-5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Search Input */}
          <div className="md:col-span-10 relative">
            <label className="form-label mb-2 block font-bold text-xs uppercase tracking-wider opacity-60">Pencarian</label>
            <div className="relative flex-1">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary pointer-events-none">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
              </div>
              <input type="text" placeholder="Cari No. Urut, No. Polisi, Supir, No. SIM, Transporter, Produk, Tipe, Status..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full h-11 pl-11 pr-4 rounded-xl text-sm transition-all focus:outline-none"
                style={{ background: "var(--bg-secondary)", border: "1.5px solid var(--border)", color: "var(--text-primary)" }}
                onFocus={(e) => { e.currentTarget.style.border = "1.5px solid rgba(59,130,246,0.5)"; e.currentTarget.style.background = "var(--bg-card-hover)"; }}
                onBlur={(e) => { e.currentTarget.style.border = "1.5px solid var(--border)"; e.currentTarget.style.background = "var(--bg-secondary)"; }}
              />
            </div>
          </div>

          {/* Reset Actions */}
          <div className="md:col-span-2 flex items-end">
            <button
              onClick={() => {
                setSearch("");
              }}
              className="btn btn-secondary btn-sm w-full h-11"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Table View */}
      {viewMode === "table" && (
        <div className="overflow-x-auto overflow-y-auto glass-card border-none rounded-2xl">
          {loading ? (
            <div className="flex items-center justify-center py-20"><div className="spinner" /></div>
          ) : vcfs.length === 0 ? (
            <div className="py-20 text-center text-secondary font-medium">Data VCF tidak ditemukan.</div>
          ) : (
            <>
              <table className="data-table">
                <thead className="sticky top-0 z-10 bg-bg-card">
                  <tr>
                    <th className="w-24 text-center">No. Urut</th>
                    <th className="text-center">Tanggal</th>
                    <th className="w-32 min-w-32 text-center">No. Polisi</th>
                    <th className="text-center">Supir</th>
                    <th className="text-center">No. SIM</th>
                    <th className="text-center">Transporter</th>
                    <th className="text-center">Produk</th>
                    <th className="text-center">Tipe</th>
                    <th className="text-center">Status</th>
                    <th className="w-40 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {vcfs.map((vcf) => (
                    <tr key={vcf.id}>
                      <td className="font-mono font-bold text-blue-400">{vcf.nomor_urut}</td>
                      <td className="text-xs">{vcf.tanggal}</td>
                      <td className="w-32 min-w-32 text-center font-bold text-text-primary dark:text-white whitespace-nowrap">{vcf.no_polisi}</td>
                      <td className="text-xs font-semibold text-text-primary dark:text-white">{vcf.driver?.nama_supir || "—"}</td>
                      <td className="text-xs font-mono text-slate-400 dark:text-slate-500">{vcf.driver?.no_sim || "—"}</td>
                      <td className="text-xs">{vcf.transporter?.nama_transporter || "—"}</td>
                      <td>
                        {vcf.produk ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">{vcf.produk}</span>
                        ) : "—"}
                      </td>
                      <td className="w-32 min-w-32 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase whitespace-nowrap ${vcf.tipe_kegiatan?.includes("loading") ? "bg-indigo-500/10 text-indigo-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                          {vcf.tipe_kegiatan?.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="w-32 min-w-32 text-center">
                        <span className={`status-badge ${getStatusColor(vcf.status)}`}>{getStatusLabel(vcf.status)}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setNavigatingId(vcf.id); router.push(`/vcf/${vcf.id}`); }}
                            disabled={navigatingId === vcf.id}
                            className={`action-btn-sm ${getActionButtonStyle(vcf.status)} flex items-center gap-1.5`}
                          >
                            {navigatingId === vcf.id
                              ? <><div className="w-3 h-3 rounded-full border-2 border-current/30 border-t-current animate-spin" /> Memuat...</>
                              : getActionLabel(vcf)}
                          </button>
                          <button
                            onClick={() => handlePrint(vcf.id)}
                            className="btn-icon btn-icon-edit"
                            disabled={fetchingPrint}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-6 pb-4">
                <Pagination currentPage={currentPage} totalItems={totalItems} itemsPerPage={10} onPageChange={(p) => setCurrentPage(p)} />
              </div>
            </>
          )}
        </div>
      )}

      {/* Card View */}
      {viewMode === "card" && (
        <div className="overflow-y-auto flex-1 min-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-20"><div className="spinner" /></div>
          ) : vcfs.length === 0 ? (
            <div className="py-20 text-center text-secondary font-medium">Data VCF tidak ditemukan.</div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
                {vcfs.map((vcf) => (
                  <div key={vcf.id} className="glass-card p-5 space-y-4 hover:border-blue-500/40 transition-all group relative overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-blue-400 text-sm tracking-tight">{vcf.nomor_urut}</span>
                      <span className={`status-badge text-[10px] ${getStatusColor(vcf.status)}`}>{getStatusLabel(vcf.status)}</span>
                    </div>

                    <div className="flex-1">
                      <h3 className="font-black text-text-primary dark:text-white text-lg leading-tight group-hover:text-blue-400 transition-colors">{vcf.no_polisi}</h3>
                      <p className="text-xs text-secondary mt-1 font-medium truncate">{vcf.transporter?.nama_transporter || "—"}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-bg-primary dark:bg-white/5 rounded-xl p-2.5 border border-border/50">
                        <p className="text-[9px] text-secondary uppercase font-bold tracking-wider mb-1 opacity-60">Supir</p>
                        <p className="text-xs font-bold text-text-primary dark:text-white truncate">{vcf.driver?.nama_supir || "—"}</p>
                      </div>
                      <div className="bg-bg-primary dark:bg-white/5 rounded-xl p-2.5 border border-border/50">
                        <p className="text-[9px] text-secondary uppercase font-bold tracking-wider mb-1 opacity-60">Produk</p>
                        <p className="text-xs font-bold text-text-primary dark:text-white truncate">{vcf.produk || "—"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => { setNavigatingId(vcf.id); router.push(`/vcf/${vcf.id}`); }}
                        disabled={navigatingId === vcf.id}
                        className={`flex-1 ${getActionButtonStyle(vcf.status)} flex items-center justify-center gap-1.5`}
                      >
                        {navigatingId === vcf.id
                          ? <><div className="w-3 h-3 rounded-full border-2 border-current/30 border-t-current animate-spin" /> Memuat...</>
                          : getActionLabel(vcf)}
                      </button>

                      <button
                        onClick={() => handlePrint(vcf.id)}
                        disabled={fetchingPrint}
                        className="btn-icon btn-icon-edit"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-6 pb-4">
                <Pagination currentPage={currentPage} totalItems={totalItems} itemsPerPage={10} onPageChange={(p) => setCurrentPage(p)} />
              </div>
            </>
          )}
        </div>
      )}

      {/* Printing individual VCF */}
      {printingVcf && <PrintVCF vcf={printingVcf} onClose={() => setPrintingVcf(null)} />}

      {/* Print Semua VCF (1 VCF per halaman, sesuai rentang tanggal) */}
      {printingAllVcfs && (
        <PrintAllVCF
          vcfs={printingAllVcfs}
          subtitle={`Periode: ${firstDay} s/d ${lastDay}${search ? ` · Pencarian: "${search}"` : ""}`}
          onClose={() => setPrintingAllVcfs(null)}
        />
      )}

      {/* Print daftar VCF */}
      {isPrinting && (
        <PrintMasterTable
          title={`Daftar VCF — Arsip ${BULAN[month]} ${year}`}
          subtitle={`Periode: ${firstDay} s/d ${lastDay}${search ? ` · Pencarian: "${search}"` : ""}`}
          headers={exportHeaders}
          data={exportData}
          orientation="landscape"
          onClose={() => setIsPrinting(false)}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   ROOT — switch between calendar and list
══════════════════════════════════════════════════ */
export default function ArsipVCFPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  if (selectedMonth !== null) {
    return (
      <MonthList
        year={year}
        month={selectedMonth}
        onBack={() => setSelectedMonth(null)}
      />
    );
  }

  return (
    <YearCalendar
      year={year}
      onSelectMonth={m => setSelectedMonth(m)}
      onChangeYear={y => setYear(y)}
    />
  );
}
