"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { vcfApi } from "@/lib/api";
import { isAdmin } from "@/lib/auth";
import { getStatusLabel, getStatusColor, getErrorMessage } from "@/lib/utils";
import { exportToExcel } from "@/lib/exportUtils";
import PrintVCF from "../[id]/PrintVCF";
import PrintMasterTable from "@/components/print/PrintMasterTable";

interface Vcf {
  id: number;
  nomor_urut: string;
  no_polisi: string;
  status: string;
  tipe_kegiatan: string;
  tanggal: string;
  jam_masuk: string;
  transporter?: { nama_transporter: string };
  driver?: { nama_supir: string };
  produk?: string;
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

export default function VcfListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlStage = searchParams.get("stage");
  const stageFilter = urlStage || "";
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

  const [vcfs, setVcfs] = useState<Vcf[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tanggalDari, setTanggalDari] = useState(firstDay);
  const [tanggalSampai, setTanggalSampai] = useState(lastDay);
  const [viewMode, setViewMode] = useState<"card" | "table">("table");

  // Reject State
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);

  // Printing individual VCF
  const [printingVcf, setPrintingVcf] = useState<any>(null);
  const [fetchingPrint, setFetchingPrint] = useState(false);
  // Print daftar VCF (tabel)
  const [isPrinting, setIsPrinting] = useState(false);

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

  const fetchVcfs = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        per_page: "100",
      };
      if (tanggalDari) params.tanggal_dari = tanggalDari;
      if (tanggalSampai) params.tanggal_sampai = tanggalSampai;

      if (STAGE_FILTERS[stageFilter]) {
        params.status = STAGE_FILTERS[stageFilter];
      }
      if (search) params.search = search;
      const res = await vcfApi.getList(params);
      setVcfs(res.data.data || res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVcfs();
  }, [stageFilter, search, tanggalDari, tanggalSampai]);

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
      bagian2_selesai: "Antrian Weighbridge Keluar",
      bagian3_selesai: "Antrian Main Gate Keluar",
      selesai: "VCF Selesai",
      reject: "VCF Ditolak",
    }[stageFilter] || "Daftar VCF"
    : "Semua VCF";

  const getActionLabel = (vcf: Vcf) => {
    const map: Record<string, string> = {
      bagian1_selesai: "Isi Bagian 2",
      bagian2_selesai: "Isi Bagian 3",
      loading_unloading_proses: "Lihat Operasional",
      loading_unloading_selesai: "Isi Bagian 3",
      bagian3_selesai: "Isi Bagian 4",
      selesai: "Lihat Detail",
      reject: "Lihat Detail",
    };
    return map[vcf.status] ?? "Detail";
  };

  const getActionButtonStyle = (status: string) => {
    switch (status) {
      case "bagian1_selesai": return "bg-amber-500 text-white hover:bg-amber-600 shadow-sm";
      case "bagian2_selesai": return "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm";
      case "loading_unloading_proses":
      case "loading_unloading_selesai": return "bg-violet-600 text-white hover:bg-violet-700 shadow-sm";
      case "bagian3_selesai": return "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm";
      case "selesai":
      case "reject":
        return "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10";
      default:
        return "bg-blue-600 text-white hover:bg-blue-700 shadow-sm";
    }
  };

  const exportHeaders = ["No. Urut", "Tanggal", "No. Polisi", "Supir", "Transporter", "Produk", "Tipe", "Status"];
  const exportData = vcfs.map(v => [
    v.nomor_urut,
    v.tanggal,
    v.no_polisi,
    v.driver?.nama_supir || "—",
    v.transporter?.nama_transporter || "—",
    v.produk || "—",
    v.tipe_kegiatan?.replace(/_/g, " "),
    getStatusLabel(v.status),
  ]);

  return (
    <div className="page-container">
      <div className="flex flex-col h-full overflow-hidden">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-black text-text-primary dark:text-white tracking-tight">{stageLabel}</h1>
            <p className="text-sm text-secondary font-medium">Manajemen Formulir Kendaraan Terpadu</p>
          </div>

          <div className="flex items-center gap-3">
            {/* View toggle */}
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

            <button onClick={() => setIsPrinting(true)} className="px-4 py-2.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
              </svg>
              Print
            </button>
            <button onClick={() => exportToExcel(`VCF_Export_${stageFilter}`, exportHeaders, exportData)} className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center gap-2 hover:bg-slate-800 transition-all shadow-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Excel
            </button>
          </div>
        </div>

        {/* Filter Section - Unified for Mobile/Desktop */}
        <div className="glass-card p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Search Input */}
            <div className="md:col-span-6 relative">
              <label className="form-label mb-2 block font-bold text-xs uppercase tracking-wider opacity-60">Pencarian Cepat</label>
              <div className="relative">
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
            </div>

            {/* Date Filters */}
            <div className="md:col-span-4 grid grid-cols-2 gap-3">
              <div>
                <label className="form-label mb-2 block font-bold text-xs uppercase tracking-wider opacity-60">Dari Tanggal</label>
                <input type="date" className="form-input w-full py-3 text-sm" value={tanggalDari} onChange={(e) => setTanggalDari(e.target.value)} />
              </div>
              <div>
                <label className="form-label mb-2 block font-bold text-xs uppercase tracking-wider opacity-60">Sampai</label>
                <input type="date" className="form-input w-full py-3 text-sm" value={tanggalSampai} onChange={(e) => setTanggalSampai(e.target.value)} />
              </div>
            </div>

            {/* Reset Actions */}
            <div className="md:col-span-2 flex items-end">
              <button
                onClick={() => {
                  setSearch("");
                  setTanggalDari(firstDay);
                  setTanggalSampai(lastDay);
                }}
                className="w-full py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all"
              >
                Reset Filter
              </button>
            </div>
          </div>
        </div>

        {/* Tabel View */}
        {viewMode === "table" && (
          <div className="overflow-x-auto overflow-y-auto flex-1 glass-card border-none rounded-2xl">
            {loading ? (
              <div className="flex items-center justify-center py-20"><div className="spinner" /></div>
            ) : vcfs.length === 0 ? (
              <div className="py-20 text-center text-secondary font-medium">Data VCF tidak ditemukan.</div>
            ) : (
              <table className="data-table">
                <thead className="sticky top-0 z-10 bg-bg-card">
                  <tr>
                    <th className="w-24">No. Urut</th>
                    <th>Tanggal</th>
                    <th>No. Polisi</th>
                    <th>Supir</th>
                    <th>Transporter</th>
                    <th>Produk</th>
                    <th>Tipe</th>
                    <th>Status</th>
                    <th className="w-40">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {vcfs.map((vcf) => (
                    <tr key={vcf.id}>
                      <td className="font-mono font-bold text-blue-400">{vcf.nomor_urut}</td>
                      <td className="text-xs">{vcf.tanggal}</td>
                      <td className="font-bold text-text-primary dark:text-white">{vcf.no_polisi}</td>
                      <td className="text-xs">{vcf.driver?.nama_supir || "—"}</td>
                      <td className="text-xs">{vcf.transporter?.nama_transporter || "—"}</td>
                      <td>
                        {vcf.produk ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">{vcf.produk}</span>
                        ) : "—"}
                      </td>
                      <td>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${vcf.tipe_kegiatan?.includes("loading") ? "bg-indigo-500/10 text-indigo-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                          {vcf.tipe_kegiatan?.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${getStatusColor(vcf.status)}`}>{getStatusLabel(vcf.status)}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/vcf/${vcf.id}`}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${getActionButtonStyle(vcf.status)}`}
                          >
                            {getActionLabel(vcf)}
                          </Link>
                          <button
                            onClick={() => handlePrint(vcf.id)}
                            className="p-1.5 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-400 hover:text-slate-600 transition-all"
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
                      <Link
                        href={`/vcf/${vcf.id}`}
                        className={`flex-1 flex items-center justify-center rounded-xl py-3 text-[10px] font-bold uppercase tracking-widest transition-all ${getActionButtonStyle(vcf.status)}`}
                      >
                        {getActionLabel(vcf)}
                      </Link>

                      <button
                        onClick={() => handlePrint(vcf.id)}
                        disabled={fetchingPrint}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 text-slate-400 hover:bg-slate-100 transition-all"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectingId && (
        <div className="modal-overlay" onClick={() => setRejectingId(null)}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-red-400">Tolak VCF</h2>
              <button onClick={() => setRejectingId(null)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
            </div>
            <p className="text-sm text-secondary mb-4">Apakah Anda yakin ingin menolak VCF ini? Harap berikan alasan penolakan.</p>
            <textarea className="form-input w-full min-h-[100px] mb-6" placeholder="Alasan penolakan..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
            <div className="flex gap-3 justify-end">
              <button className="btn btn-secondary" onClick={() => setRejectingId(null)}>Batal</button>
              <button className="btn btn-primary" style={{ background: "#ef4444", borderColor: "#ef4444" }} onClick={handleReject} disabled={rejectLoading || !rejectReason.trim()}>{rejectLoading ? "Memproses..." : "Tolak VCF"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Printing individual VCF */}
      {printingVcf && <PrintVCF vcf={printingVcf} onClose={() => setPrintingVcf(null)} />}

      {/* Print daftar VCF */}
      {isPrinting && (
        <PrintMasterTable
          title={`Daftar VCF — ${stageLabel}`}
          subtitle={`Periode: ${tanggalDari} s/d ${tanggalSampai}${search ? ` · Pencarian: "${search}"` : ""}`}
          headers={exportHeaders}
          data={exportData}
          onClose={() => setIsPrinting(false)}
        />
      )}
    </div>
  );
}
