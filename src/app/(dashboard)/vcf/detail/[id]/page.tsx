"use client";

import { useState, useEffect, useCallback, Suspense, lazy } from "react";
import { useParams, useRouter } from "next/navigation";
import { vcfApi } from "@/lib/api";
import { isAdmin, getUser } from "@/lib/auth";
import { getStatusLabel, getStatusColor, formatDateTime, getErrorMessage } from "@/lib/utils";
import { exportToPDF, exportToDocx } from "@/lib/exportUtils";
import GuideSection from "@/components/GuideSection";

// Lazy load heavy components from the original [id] folder
const Bagian2Form = lazy(() => import("../../[id]/Bagian2Form"));
const Bagian3Form = lazy(() => import("../../[id]/Bagian3Form"));
const Bagian4Form = lazy(() => import("../../[id]/Bagian4Form"));
const PrintVCF = lazy(() => import("../../[id]/PrintVCF"));
const Bagian1EditModal = lazy(() => import("../../[id]/Bagian1EditModal"));

// Form loading skeleton
function FormSkeleton() {
  return (
    <div className="glass-card p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="spinner-accent" style={{ width: 22, height: 22 }} />
        <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Memuat formulir...</span>
      </div>
      <div className="animate-pulse space-y-4">
        <div className="h-5 w-44 rounded-lg" style={{ background: "var(--border)" }} />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-10 rounded-lg" style={{ background: "var(--border)" }} />
          <div className="h-10 rounded-lg" style={{ background: "var(--border)" }} />
        </div>
        <div className="h-10 rounded-lg" style={{ background: "var(--border)" }} />
        <div className="h-5 w-36 rounded-lg" style={{ background: "var(--border)" }} />
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3].map(i => <div key={i} className="h-14 rounded-xl" style={{ background: "var(--border)" }} />)}
        </div>
        <div className="h-20 rounded-lg" style={{ background: "var(--border)" }} />
      </div>
    </div>
  );
}

interface VcfDetail {
  id: number;
  nomor_urut: string;
  tanggal: string;
  created_at?: string;
  status: string;
  tipe_kegiatan: string;
  asal_tujuan: string;
  no_polisi: string;
  jam_masuk: string;
  produk?: string;
  tipe_kendaraan?: string;
  tahun_kendaraan?: number;
  transporter?: { nama_transporter: string };
  driver?: { nama_supir: string; no_sim: string; jenis_sim?: string; tgl_berlaku_sim?: string };
  kelengkapan_supir?: { id: number; item_id: number; nilai: any; keterangan?: string; item: { nama_item: string } }[];
  pemeriksaan_masuk?: { id: number; item_id: number; nilai: string; keterangan?: string; item: { nama_item: string }; petugas?: { nama: string }; waktu_input?: string; created_at?: string }[];
  pemeriksaan_keluar?: { id: number; item_id: number; nilai: string; keterangan?: string; item: { nama_item: string }; petugas?: { nama: string }; waktu_input?: string; created_at?: string }[];
  beban_tambahan_masuk?: { jenis_beban: string; ada: boolean };
  beban_tambahan_keluar?: { jenis_beban: string; ada: boolean };
  segel_masuk?: { jumlah_segel: number; kondisi?: string; nomor_segel: { nomor_segel: string }[]; petugas?: { nama: string }; waktu_input?: string; created_at?: string };
  segel_keluar?: { jumlah_segel: number; kondisi?: string; nomor_segel: { nomor_segel: string }[]; petugas?: { nama: string }; waktu_input?: string; created_at?: string };
  vcf_keluar?: { jam_keluar: string; emergency_respon_kontak: string; keterangan?: string; petugas?: { nama: string }; waktu_input?: string; created_at?: string };
  vcf_bagian2?: { keterangan?: string };
  vcf_bagian3?: { keterangan?: string };
  catatan?: string;
  jenis_kendaraan_id?: number;
  jenis_kendaraan?: { id: number; nama: string };
  muatan_dibawa?: { item_muatan_id?: number; item_muatan?: { id: number; nama_item?: string }; nama_item?: string; nilai?: string }[];
  muatan_diisi?: { item_muatan_id?: number; item_muatan?: { id: number; nama_item?: string }; nama_item?: string; nilai?: string }[];
  created_by?: { id: number; nama: string };
  nama_petugas_main_gate_masuk?: string;
  nama_petugas_wb_masuk?: string;
  nama_petugas_wb_keluar?: string;
  nama_petugas_main_gate_keluar?: string;
  keterangan?: string;
}

const STEPS = [
  { key: "pendaftaran", label: "Pendaftaran", n: 1 },
  { key: "bagian1_selesai", label: "Weighbridge Masuk", n: 2 },
  { key: "bagian2_selesai", label: "Weighbridge Keluar", n: 3 },
  { key: "loading_unloading_proses", label: "Weighbridge Keluar", n: 3 },
  { key: "loading_unloading_selesai", label: "Weighbridge Keluar", n: 3 },
  { key: "bagian3_selesai", label: "Main Gate Keluar", n: 4 },
  { key: "selesai", label: "Selesai", n: 4 },
];

function getStepNumber(vcf: VcfDetail | null): number {
  if (!vcf) return 1;
  if (vcf.status === "reject") {
    if (vcf.catatan?.includes("[REJECTED AT WB KELUAR]")) return 3;
    if (vcf.catatan?.includes("[REJECTED AT WB MASUK]")) return 2;
    return 1;
  }
  const step = STEPS.find((s) => s.key === vcf.status);
  return step?.n || 1;
}

export default function VcfDetailAliasPage() {
  const params = useParams();
  const router = useRouter();
  const vcfId = Number(params.id);

  const [vcf, setVcf] = useState<VcfDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"info" | "bagian2" | "bagian3" | "bagian4" | "reject_detail">("info");
  const [hasInitializedTab, setHasInitializedTab] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showBagian1Edit, setShowBagian1Edit] = useState(false);

  const fetchVcf = useCallback(async () => {
    try {
      const res = await vcfApi.getDetail(vcfId);
      const data = res.data;
      setVcf(data);

      if (!hasInitializedTab) {
        if (data.status === "bagian1_selesai") {
          setActiveTab("bagian2");
        } else if (["bagian2_selesai", "loading_unloading_selesai"].includes(data.status)) {
          setActiveTab("bagian3");
        } else if (data.status === "bagian3_selesai") {
          setActiveTab("bagian4");
        }
        setHasInitializedTab(true);
      }
    } catch {
      // handle silently
    } finally {
      setLoading(false);
    }
  }, [vcfId, hasInitializedTab]);

  useEffect(() => {
    fetchVcf();
  }, [fetchVcf]);

  // Dispatch modal events for Bagian1EditModal
  useEffect(() => {
    if (showBagian1Edit) {
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
  }, [showBagian1Edit]);

  // Dispatch modal events for PrintVCF
  useEffect(() => {
    if (showPrint) {
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
  }, [showPrint]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="spinner" style={{ width: 32, height: 32 }} />
        <span className="ml-3" style={{ color: "var(--text-muted)" }}>Memuat data VCF...</span>
      </div>
    );
  }

  if (!vcf) {
    return (
      <div className="flex flex-col items-center justify-center py-32" style={{ color: "var(--text-muted)" }}>
        <p>Data VCF tidak ditemukan.</p>
        <button className="btn btn-primary mt-4" onClick={() => router.push("/vcf")}>
          Kembali ke Daftar
        </button>
      </div>
    );
  }

  const currentStep = getStepNumber(vcf);
  const isDone = vcf.status === "selesai";
  const isRejected = vcf.status === "reject";
  const userIsAdmin = isAdmin();

  const canEditRegistrasi = userIsAdmin;
  const canFillBagian2 = vcf.status === "bagian1_selesai";
  const canFillBagian3 = ["bagian2_selesai", "loading_unloading_selesai"].includes(vcf.status);
  const canFillBagian4 = ["bagian3_selesai", "weighbridge_keluar"].includes(vcf.status);

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-8">
      <div className="space-y-5 sm:space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={() => router.back()}
          className="p-2.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors shrink-0"
          title="Kembali"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base sm:text-2xl font-black text-slate-800 dark:text-white font-mono truncate">VCF #{vcf.nomor_urut}</h1>
          <p className="text-[11px] sm:text-sm text-slate-400 font-medium truncate mt-1">
            {vcf.no_polisi} · {vcf.driver?.nama_supir}
          </p>
        </div>
      </div>

      {/* Status badge and actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <span
          className={`status-badge text-[10px] sm:text-xs ${getStatusColor(vcf.status)}`}
          style={isRejected ? { background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" } : {}}
        >
          {isRejected ? "Ditolak" : getStatusLabel(vcf.status)}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGuide(true)}
            className="px-3 py-2.5 sm:px-4 sm:py-2.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 font-bold text-[10px] sm:text-xs flex items-center gap-1.5 sm:gap-2 hover:bg-slate-50 transition-all shadow-sm"
          >
            <svg width="12" height="12" className="sm:w-14 sm:h-14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
            <span className="hidden sm:inline">PANDUAN</span>
          </button>
          <button
            onClick={() => setShowPrint(true)}
            className="px-3 py-2.5 sm:px-5 sm:py-2.5 rounded-xl bg-slate-900 text-white font-bold text-[10px] sm:text-xs flex items-center gap-1.5 sm:gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
          >
            <svg width="12" height="12" className="sm:w-14 sm:h-14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
            </svg>
            <span className="hidden sm:inline">CETAK VCF</span>
          </button>
        </div>
      </div>

      {/* Guide Modal */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setShowGuide(false)}>
          <div className="glass-card w-full max-w-4xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-border" style={{ background: "var(--bg-secondary)" }}>
              <div className="flex items-center gap-3">
                <h2 className="font-bold text-base">Panduan Operasional</h2>
              </div>
              <button onClick={() => setShowGuide(false)}>✕</button>
            </div>
            <div className="p-6">
              <GuideSection />
            </div>
          </div>
        </div>
      )}

      {/* Bagian1 Edit Modal */}
      {showBagian1Edit && (
        <Suspense fallback={null}>
          <Bagian1EditModal
            vcfId={vcf.id}
            onClose={() => setShowBagian1Edit(false)}
            onSuccess={() => {
              setShowBagian1Edit(false);
              fetchVcf();
            }}
          />
        </Suspense>
      )}

      {/* Progress steps */}
      <div className="bg-white dark:bg-bg-card border border-slate-100 dark:border-white/5 p-3 sm:p-6 rounded-2xl sm:rounded-[32px] shadow-sm mb-4 sm:mb-6">
        <div className="grid grid-cols-4 gap-2 sm:gap-0 sm:flex sm:flex-row items-center">
          {[
            { n: 1, label: "MG", sub: "Masuk" },
            { n: 2, label: "WB", sub: "Masuk" },
            { n: 3, label: "WB", sub: "Keluar" },
            { n: 4, label: "MG", sub: "Keluar" },
          ].map((step, idx) => (
            <div key={step.n} className="flex flex-col items-center">
              <div
                className="w-7 h-7 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl border-2 flex items-center justify-center text-[10px] sm:text-xs font-black transition-all duration-500"
                style={
                  step.n < currentStep || isDone
                    ? { borderColor: "#10b981", background: "#10b981", color: "white", boxShadow: "0 8px 16px rgba(16,185,129,0.2)" }
                    : step.n === currentStep
                    ? (isRejected
                      ? { borderColor: "#ef4444", background: "rgba(239,68,68,0.1)", color: "#ef4444", transform: "scale(1.1)" }
                      : { borderColor: "#3b82f6", background: "rgba(59,130,246,0.1)", color: "#3b82f6", transform: "scale(1.1)" })
                    : { borderColor: "var(--border-light)", color: "var(--text-muted)" }
                }
              >
                {step.n < currentStep || isDone ? (
                  <svg width="12" height="12" className="sm:w-18 sm:h-18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (isRejected && step.n === currentStep) ? "!" : step.n}
              </div>
              <span className="text-[8px] sm:text-[10px] sm:text-[11px] font-black mt-1 sm:mt-2 text-center uppercase tracking-wider leading-tight" style={{ color: step.n <= currentStep ? "var(--text-primary)" : "var(--text-muted)" }}>
                {step.label}
              </span>
              <span className="text-[7px] hidden sm:block font-normal mt-0.5 text-center uppercase tracking-wider" style={{ color: step.n <= currentStep ? "var(--text-muted)" : "var(--text-muted)" }}>
                {step.sub}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2.5 mb-5 overflow-x-auto pb-2">
        {[
          { key: "info", label: "Data Registrasi VCF", always: true },
          { key: "reject_detail", label: "Detail Penolakan", always: isRejected },
          { key: "bagian2", label: "Weighbridge Masuk", always: !isRejected && (currentStep >= 2 || canFillBagian2 || (vcf?.pemeriksaan_masuk && vcf.pemeriksaan_masuk.length > 0)) },
          { key: "bagian3", label: "Weighbridge Keluar", always: !isRejected && (currentStep >= 3 || canFillBagian3 || (vcf?.pemeriksaan_keluar && vcf.pemeriksaan_keluar.length > 0)) },
          { key: "bagian4", label: "Main Gate Keluar", always: !isRejected && (currentStep >= 4 || canFillBagian4 || vcf?.status === "selesai") },
        ]
          .filter((t) => t.always)
          .map((tab) => (
            <button
              key={tab.key}
              className={`px-4 sm:px-5 py-2.5 rounded-xl text-[10px] sm:text-xs font-bold whitespace-nowrap transition-all border shrink-0 ${
                activeTab === tab.key
                  ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                  : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:border-slate-300'
              }`}
              onClick={() => setActiveTab(tab.key as any)}
            >
              {tab.label}
            </button>
          ))}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        <Suspense fallback={<FormSkeleton />}>
          {activeTab === "info" && (
            <div className="glass-card p-6">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-bold">Informasi Registrasi</h2>
                 {canEditRegistrasi && (
                   <button onClick={() => setShowBagian1Edit(true)} className="btn btn-sm btn-secondary">Edit Registrasi</button>
                 )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 <div>
                    <label className="text-xs text-text-muted block mb-1">No. Urut</label>
                    <p className="font-bold">{vcf.nomor_urut}</p>
                 </div>
                 <div>
                    <label className="text-xs text-text-muted block mb-1">No. Polisi</label>
                    <p className="font-bold">{vcf.no_polisi}</p>
                 </div>
                 <div>
                    <label className="text-xs text-text-muted block mb-1">Supir</label>
                    <p className="font-bold">{vcf.driver?.nama_supir || "—"}</p>
                 </div>
                 <div>
                    <label className="text-xs text-text-muted block mb-1">Transporter</label>
                    <p className="font-bold">{vcf.transporter?.nama_transporter || "—"}</p>
                 </div>
                 <div>
                    <label className="text-xs text-text-muted block mb-1">Produk</label>
                    <p className="font-bold">{vcf.produk || "—"}</p>
                 </div>
                 <div>
                    <label className="text-xs text-text-muted block mb-1">Tipe</label>
                    <p className="font-bold uppercase">{vcf.tipe_kegiatan?.replace(/_/g, ' ')}</p>
                 </div>
              </div>
              {vcf.keterangan && (
                <div className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-border">
                  <label className="text-xs text-text-muted block mb-1">Keterangan</label>
                  <p className="text-sm">{vcf.keterangan}</p>
                </div>
              )}
            </div>
          )}
          
          {activeTab === "bagian2" && (
            <Bagian2Form
              vcfId={vcfId}
              vcfData={vcf}
              canEdit={userIsAdmin}
              canFill={canFillBagian2}
              onSuccess={fetchVcf}
              onReject={fetchVcf}
            />
          )}

          {activeTab === "bagian3" && (
            <Bagian3Form
              vcfId={vcfId}
              vcfData={vcf}
              canEdit={userIsAdmin}
              canFill={canFillBagian3}
              onSuccess={fetchVcf}
            />
          )}

          {activeTab === "bagian4" && (
            <Bagian4Form
              vcfId={vcfId}
              vcfData={vcf}
              canEdit={userIsAdmin}
              canFill={canFillBagian4}
              onSuccess={fetchVcf}
            />
          )}
        </Suspense>
      </div>

      {showPrint && (
        <Suspense fallback={null}>
          <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-2 sm:p-6 animate-in fade-in duration-300">
             <div className="bg-white dark:bg-slate-900 w-full max-w-5xl h-full sm:h-auto max-h-[95vh] overflow-y-auto rounded-[32px] relative shadow-2xl border border-white/10">
                <div className="sticky top-0 right-0 p-4 sm:p-6 flex justify-end z-20 pointer-events-none">
                  <button 
                    onClick={() => setShowPrint(false)} 
                    className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white border border-white/20 hover:bg-white/20 transition-all pointer-events-auto"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  </button>
                </div>
                <div className="px-4 pb-8 sm:px-12 sm:pb-12 -mt-12">
                  <PrintVCF vcf={vcf} onClose={() => setShowPrint(false)} />
                </div>
             </div>
          </div>
        </Suspense>
      )}
    </div>
  </div>
);
}
