"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { vcfApi } from "@/lib/api";
import { isAdmin } from "@/lib/auth";
import { getStatusLabel, getStatusColor, getErrorMessage } from "@/lib/utils";
import { exportToExcel, exportToPDF } from "@/lib/exportUtils";
import PrintVCF from "../[id]/PrintVCF";
import PrintAllVCF from "@/components/print/PrintAllVCF";
import PrintMasterTable from "@/components/print/PrintMasterTable";
import Pagination from "@/components/Pagination";
import DatePickerModal, { DateRangeTrigger } from "@/components/DatePickerModal";

interface Vcf {
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

const STAGE_FILTERS: Record<string, string> = {
  aktif: "aktif",
  bagian1_selesai: "bagian1_selesai",
  bagian2_selesai: "bagian2_selesai",
  loading_unloading_selesai: "loading_unloading_selesai",
  bagian3_selesai: "bagian3_selesai",
  selesai: "selesai",
  reject: "reject",
};

function VcfSearchParams({ children }: { children: (stageFilter: string) => JSX.Element }) {
  const searchParams = useSearchParams();
  const urlStage = searchParams.get("stage");
  const stageFilter = urlStage || "";
  return <>{children(stageFilter)}</>;
}

/** Get today's date string in WIB (Asia/Jakarta) as YYYY-MM-DD */
function getTodayWIB(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
}

/** Get date 1 month ago in WIB. If overflow (e.g. May 31 → no April 31),
 *  falls back to the 1st of the current month instead. */
function getOneMonthAgoWIB(): string {
  const todayStr = getTodayWIB();
  const d = new Date(todayStr);
  const targetMonth = d.getMonth() - 1;
  d.setMonth(targetMonth);
  if (d.getMonth() !== ((targetMonth + 12) % 12)) {
    const first = new Date(todayStr);
    first.setDate(1);
    return first.toLocaleDateString("sv-SE");
  }
  return d.toLocaleDateString("sv-SE");
}

function VcfListContent({ stageFilter }: { stageFilter: string }) {
  const router = useRouter();

  const [vcfs, setVcfs] = useState<Vcf[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tanggalDari, setTanggalDari] = useState(getOneMonthAgoWIB);
  const [tanggalSampai, setTanggalSampai] = useState(getTodayWIB);
  const [viewMode, setViewMode] = useState<"card" | "table">("table");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [lastPage, setLastPage] = useState(1);

  // DatePicker modal state
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Reject State
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);
  const [navigatingId, setNavigatingId] = useState<number | null>(null);

  // Printing individual VCF
  const [printingVcf, setPrintingVcf] = useState<any>(null);
  const [fetchingPrint, setFetchingPrint] = useState(false);
  // Print daftar VCF (tabel)
  const [fetchingPrintHtml, setFetchingPrintHtml] = useState(false);
  const [printHtmlData, setPrintHtmlData] = useState<any[][] | null>(null);
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
      alert("Gagal mengambil detail VCF untuk pencetakan.");
    } finally {
      setFetchingPrint(false);
    }
  };

  const handlePrintHTML = async () => {
    if (fetchingPrintHtml) return;
    setFetchingPrintHtml(true);
    try {
      const params: Record<string, string> = { per_page: "10000" };
      if (tanggalDari) params.tanggal_dari = tanggalDari;
      if (tanggalSampai) params.tanggal_sampai = tanggalSampai;
      if (STAGE_FILTERS[stageFilter]) params.status = STAGE_FILTERS[stageFilter];
      if (debouncedSearch) params.search = debouncedSearch;

      const res = await vcfApi.getList(params);
      const list: any[] = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
          ? res.data
          : [];

      if (list.length === 0) {
        alert("Tidak ada VCF pada rentang tanggal/filter yang dipilih.");
        return;
      }

      const formatted = list.map(v => [
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
      setPrintHtmlData(formatted);
    } catch (err: any) {
      alert("Gagal memuat data VCF: " + (err.response?.data?.message || err.message || "Terjadi kesalahan."));
    } finally {
      setFetchingPrintHtml(false);
    }
  };

  const handlePrintAll = async () => {
    if (fetchingPrintAll) return;
    setFetchingPrintAll(true);
    try {
      const params: Record<string, string> = { per_page: "1000" };
      if (tanggalDari) params.tanggal_dari = tanggalDari;
      if (tanggalSampai) params.tanggal_sampai = tanggalSampai;
      if (STAGE_FILTERS[stageFilter]) params.status = STAGE_FILTERS[stageFilter];
      if (debouncedSearch) params.search = debouncedSearch;
      const listRes = await vcfApi.getList(params);
      const list: any[] = Array.isArray(listRes.data?.data)
        ? listRes.data.data
        : Array.isArray(listRes.data)
          ? listRes.data
          : [];
      if (list.length === 0) {
        alert("Tidak ada VCF pada rentang tanggal/filter yang dipilih.");
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
        alert("Gagal memuat detail VCF untuk dicetak.");
        return;
      }
      setPrintingAllVcfs(validDetails);
    } catch (err: any) {
      alert("Gagal memuat data VCF: " + (err.response?.data?.message || err.message || "Terjadi kesalahan."));
    } finally {
      setFetchingPrintAll(false);
    }
  };

  const handleExportExcel = async () => {
    if (exportingExcel) return;
    setExportingExcel(true);
    try {
      const params: Record<string, string> = { per_page: "10000" };
      if (tanggalDari) params.tanggal_dari = tanggalDari;
      if (tanggalSampai) params.tanggal_sampai = tanggalSampai;
      if (STAGE_FILTERS[stageFilter]) params.status = STAGE_FILTERS[stageFilter];
      if (debouncedSearch) params.search = debouncedSearch;

      const res = await vcfApi.getList(params);
      const list: any[] = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
          ? res.data
          : [];

      if (list.length === 0) {
        alert("Tidak ada VCF pada rentang tanggal/filter yang dipilih.");
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
        `VCF_Export_${stageFilter || 'Semua'}`,
        exportHeaders,
        formattedData,
        `Daftar VCF — ${stageLabel}`,
        `Periode: ${tanggalDari} s/d ${tanggalSampai}${search ? ` · Pencarian: "${search}"` : ""}`
      );
    } catch (err: any) {
      alert("Gagal memuat data VCF untuk export: " + (err.response?.data?.message || err.message || "Terjadi kesalahan."));
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
  }, [debouncedSearch, tanggalDari, tanggalSampai, stageFilter]);

  const fetchVcfs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        per_page: "10",
        page: String(currentPage),
      };
      if (tanggalDari) params.tanggal_dari = tanggalDari;
      if (tanggalSampai) params.tanggal_sampai = tanggalSampai;

      if (STAGE_FILTERS[stageFilter]) {
        params.status = STAGE_FILTERS[stageFilter];
      }
      if (debouncedSearch) params.search = debouncedSearch;
      const res = await vcfApi.getList(params);
      const responseData = res.data;
      // Support Laravel paginate() response shape: { data: [], total, last_page, ... }
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
      console.error("Error fetching VCF list:", err);
      alert("Gagal mengambil data VCF: " + (err.response?.data?.message || err.message || "Terjadi kesalahan."));
    } finally {
      setLoading(false);
    }
  }, [stageFilter, tanggalDari, tanggalSampai, debouncedSearch, currentPage]);

  useEffect(() => {
    fetchVcfs();
  }, [fetchVcfs]);

  // Dispatch modal events for reject modal
  useEffect(() => {
    if (rejectingId !== null) {
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
  }, [rejectingId]);

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
    if (printHtmlData) {
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
  }, [printHtmlData]);

  const handleReject = async () => {
    if (!rejectingId || !rejectReason.trim()) return;
    setRejectLoading(true);
    try {
      await vcfApi.rejectVcf(rejectingId, { catatan_reject: rejectReason });
      setRejectingId(null);
      setRejectReason("");
      fetchVcfs();
    } catch (err: any) {
      alert(getErrorMessage(err, "Gagal menolak VCF."));
    } finally {
      setRejectLoading(false);
    }
  };

  const stageLabel = stageFilter
    ? {
      aktif: "Kendaraan di Area (Aktif)",
      bagian1_selesai: "Antrian Weighbridge Masuk",
      bagian2_selesai: "Antrian Main Gate Keluar",
      bagian3_selesai: "Antrian Main Gate Keluar",
      selesai: "VCF Selesai",
      reject: "VCF Ditolak",
    }[stageFilter] || "Daftar VCF"
    : "Semua VCF";

  const getActionLabel = (vcf: Vcf) => {
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

  return (
    <div className="page-container">
      <div className="flex flex-col h-full overflow-hidden">

        {/* Header Section */}
        <div className="morph-in flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{stageLabel}</h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Manajemen Formulir Kendaraan Terpadu</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            {/* View toggle */}
            <div className="flex items-center justify-between sm:justify-start gap-2">
              <div className="flex items-center rounded-lg overflow-hidden border p-1" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
                <button
                  onClick={() => setViewMode("table")}
                  className="p-1.5 rounded-md transition-all"
                  style={{ background: viewMode === "table" ? "rgba(37,99,235,0.1)" : "transparent", color: viewMode === "table" ? "#2563eb" : "var(--text-muted)" }}
                  title="Tampilan Tabel"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode("card")}
                  className="p-1.5 rounded-md transition-all"
                  style={{ background: viewMode === "card" ? "rgba(37,99,235,0.1)" : "transparent", color: viewMode === "card" ? "#2563eb" : "var(--text-muted)" }}
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
            <div className="grid grid-cols-3 sm:flex sm:flex-row gap-2 sm:gap-2">
              <button
                onClick={handlePrintHTML}
                disabled={fetchingPrintHtml}
                className="btn btn-secondary btn-sm flex items-center justify-center gap-2 text-xs whitespace-nowrap"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
                </svg>
                <span className="hidden sm:inline">{fetchingPrintHtml ? "Memuat..." : "Print HTML"}</span>
                <span className="sm:hidden">{fetchingPrintHtml ? "..." : "HTML"}</span>
              </button>
              <button
                onClick={handlePrintAll}
                disabled={fetchingPrintAll}
                className="btn btn-warning btn-sm flex items-center justify-center gap-2 text-xs whitespace-nowrap"
                title="Cetak Semua VCF (Form Lengkap) dalam rentang tanggal terpilih — 1 VCF per halaman"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
                </svg>
                <span className="hidden sm:inline">{fetchingPrintAll ? "Memuat..." : "Print Semua"}</span>
                <span className="sm:hidden">{fetchingPrintAll ? "..." : "Semua"}</span>
              </button>
              <button
                onClick={handleExportExcel}
                disabled={exportingExcel}
                className="btn btn-success btn-sm flex items-center justify-center gap-2 text-xs whitespace-nowrap"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {exportingExcel ? "..." : "Excel"}
              </button>
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="morph-in glass-card p-4 md:p-5 mb-6">
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-stretch md:items-end">
            {/* Search Input */}
            <div className="flex-1 min-w-0">
              <label className="form-label mb-2 block">Pencarian</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary pointer-events-none">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Cari No. Urut, No. Polisi, Supir, Transporter..."
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
            </div>

            {/* Date Range — Custom Calendar Trigger */}
            <div className="md:w-auto" style={{ minWidth: 260 }}>
              <label className="form-label mb-2 block">Rentang Tanggal</label>
              <DateRangeTrigger
                startDate={tanggalDari}
                endDate={tanggalSampai}
                onClick={() => setIsDatePickerOpen(true)}
              />
            </div>

            {/* Reset */}
            <button
              onClick={() => {
                setSearch("");
                setTanggalDari(getOneMonthAgoWIB());
                setTanggalSampai(getTodayWIB());
              }}
              className="btn btn-secondary btn-sm md:self-end h-12 flex items-center justify-center"
            >
              Reset
            </button>
          </div>
        </div>

        {/* DatePicker Modal */}
        <DatePickerModal
          isOpen={isDatePickerOpen}
          onClose={() => setIsDatePickerOpen(false)}
          startDate={tanggalDari}
          endDate={tanggalSampai}
          onApply={(start, end) => {
            setTanggalDari(start);
            setTanggalSampai(end);
          }}
        />

        {/* Tabel View */}
        {viewMode === "table" && (
          <div className="overflow-x-auto overflow-y-auto flex-1 glass-card border-none rounded-2xl">
            {loading ? (
              <div className="flex items-center justify-center py-20"><div className="spinner" /></div>
            ) : vcfs.length === 0 ? (
              <div className="py-20 text-center font-medium" style={{ color: "var(--text-muted)" }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3" style={{ color: "var(--border)" }}>
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 12h6M9 16h4" />
                </svg>
                Data VCF tidak ditemukan.
              </div>
            ) : (
              <>
                <table className="data-table">
                  <thead className="sticky top-0 z-10" style={{ background: "var(--bg-card)" }}>
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
                        <td className="font-mono font-bold" style={{ color: "#2563eb" }}>{vcf.nomor_urut}</td>
                        <td className="text-xs">{vcf.tanggal}</td>
                        <td className="w-32 min-w-32 text-center font-bold whitespace-nowrap" style={{ color: "var(--text-primary)" }}>{vcf.no_polisi}</td>
                        <td className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{vcf.driver?.nama_supir || "—"}</td>
                        <td className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{vcf.driver?.no_sim || "—"}</td>
                        <td className="text-xs">{vcf.transporter?.nama_transporter || "—"}</td>
                        <td>
                          {vcf.produk ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: "rgba(37,99,235,0.08)", color: "#2563eb", border: "1px solid rgba(37,99,235,0.15)" }}>{vcf.produk}</span>
                          ) : "—"}
                        </td>
                        <td className="w-32 min-w-32 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase whitespace-nowrap ${vcf.tipe_kegiatan?.includes("loading") ? "bg-indigo-500/10 text-indigo-500" : "bg-emerald-500/10 text-emerald-600"}`}>
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
              <div className="py-20 text-center font-medium" style={{ color: "var(--text-muted)" }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3" style={{ color: "var(--border)" }}>
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 12h6M9 16h4" />
                </svg>
                Data VCF tidak ditemukan.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-3">
                  {vcfs.map((vcf) => (
                    <div key={vcf.id} className="glass-card p-4 space-y-3 transition-all group relative overflow-hidden flex flex-col" style={{ borderColor: "var(--border)" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(37,99,235,0.3)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-sm" style={{ color: "#2563eb" }}>{vcf.nomor_urut}</span>
                        <span className={`status-badge text-[10px] ${getStatusColor(vcf.status)}`}>{getStatusLabel(vcf.status)}</span>
                      </div>

                      <div className="flex-1">
                        <h3 className="font-bold text-lg leading-tight" style={{ color: "var(--text-primary)" }}>{vcf.no_polisi}</h3>
                        <p className="text-xs mt-1 font-medium truncate" style={{ color: "var(--text-muted)" }}>{vcf.transporter?.nama_transporter || "—"}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg p-2.5" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-light)" }}>
                          <p className="text-[9px] uppercase font-bold tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Supir</p>
                          <p className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>{vcf.driver?.nama_supir || "—"}</p>
                        </div>
                        <div className="rounded-lg p-2.5" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-light)" }}>
                          <p className="text-[9px] uppercase font-bold tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Produk</p>
                          <p className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>{vcf.produk || "—"}</p>
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
      </div>

      {/* Reject Modal */}
      {rejectingId && (
        <div className="modal-overlay" onClick={() => setRejectingId(null)}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold" style={{ color: "#dc2626" }}>Tolak VCF</h2>
              <button onClick={() => setRejectingId(null)} style={{ color: "var(--text-muted)" }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
            </div>
            <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>Apakah Anda yakin ingin menolak VCF ini? Harap berikan alasan penolakan.</p>
            <textarea className="form-input w-full min-h-[100px] mb-6" placeholder="Alasan penolakan..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
            <div className="flex gap-3 justify-end">
              <button className="btn btn-secondary" onClick={() => setRejectingId(null)}>Batal</button>
              <button className="btn btn-danger" onClick={handleReject} disabled={rejectLoading || !rejectReason.trim()}>{rejectLoading ? "Memproses..." : "Tolak VCF"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Printing individual VCF */}
      {printingVcf && <PrintVCF vcf={printingVcf} onClose={() => setPrintingVcf(null)} />}

      {/* Print Semua VCF (1 VCF per halaman, sesuai rentang tanggal) */}
      {printingAllVcfs && (
        <PrintAllVCF
          vcfs={printingAllVcfs}
          subtitle={`Periode: ${tanggalDari} s/d ${tanggalSampai}${stageFilter ? ` · ${stageLabel}` : ""}${search ? ` · Pencarian: "${search}"` : ""}`}
          onClose={() => setPrintingAllVcfs(null)}
        />
      )}

      {/* Print daftar VCF */}
      {printHtmlData && (
        <PrintMasterTable
          title={`Daftar VCF — ${stageLabel}`}
          subtitle={`Periode: ${tanggalDari} s/d ${tanggalSampai}${search ? ` · Pencarian: "${search}"` : ""}`}
          headers={exportHeaders}
          data={printHtmlData}
          orientation="landscape"
          onClose={() => setPrintHtmlData(null)}
        />
      )}
    </div>
  );
}

export default function VcfListPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="spinner" /></div>}>
      <VcfSearchParams>
        {(stageFilter) => <VcfListContent stageFilter={stageFilter} />}
      </VcfSearchParams>
    </Suspense>
  );
}
