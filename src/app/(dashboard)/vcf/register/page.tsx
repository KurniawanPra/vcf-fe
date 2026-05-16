"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { vcfApi } from "@/lib/api";
import { fetchAndCacheMasterData, getCachedMasterData } from "@/lib/masterDataCache";
import { formatTime, formatDate, isValidTime24h, getErrorMessage } from "@/lib/utils";
import { getUser } from "@/lib/auth";
import { generateQRSignature } from "@/lib/qrUtils";
import GuideSection from "@/components/GuideSection";
import SearchableDropdown from "@/components/SearchableDropdown";
import { useToast, ToastContainer } from "@/components/Toast";

interface SelectOption { id: number; nama?: string; nama_transporter?: string; nama_supir?: string; nama_item?: string; kode?: string; no_sim?: string; tgl_berlaku_sim?: string; jenis_sim?: string; is_active?: boolean | number | string; }
interface ChecklistItem { id: number; nama_item: string; urutan: number; is_active?: boolean | number | string; }
interface MuatanItem { id: number; nama_item: string; jenis: "both" | "dibawa" | "diisi"; urutan: number; is_active?: boolean | number | string; }

type TipeKegiatan = "loading_lokal" | "loading_export" | "unloading_lokal" | "unloading_import" | "";
type TipeKendaraan = "bak_terbuka" | "tangki" | "umum" | "box" | "container" | "";

interface ValidationEntry {
  key: string;
  section: string;
  label: string;
  fieldId: string;
}

function ValidationSummary({ errors, onDismiss }: { errors: ValidationEntry[]; onDismiss: () => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (errors.length === 0) { setLeaving(false); return; }
    const leaveTimer = setTimeout(() => setLeaving(true), 6500);
    const clearTimer = setTimeout(() => onDismiss(), 7000);
    return () => { clearTimeout(leaveTimer); clearTimeout(clearTimer); };
  }, [errors, onDismiss]);

  const handleDismiss = () => {
    setLeaving(true);
    setTimeout(() => onDismiss(), 500);
  };

  if (errors.length === 0) return null;

  const sections = Array.from(new Set(errors.map(e => e.section)));
  const scrollTo = (fieldId: string) => {
    const el = document.getElementById(fieldId) || document.querySelector(`[data-field-id="${fieldId}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    (el as HTMLElement)?.focus?.();
  };

  return (
    <div
      className="fixed top-4 right-4 z-50 w-80 rounded-2xl shadow-xl overflow-hidden"
      style={{
        background: "rgba(251,191,36,0.95)",
        border: "1px solid rgba(251,191,36,0.3)",
        backdropFilter: "blur(8px)",
        animation: leaving
          ? "slideOutRight 0.5s ease-in forwards"
          : "slideInRight 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-amber-300/40">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="shrink-0">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="text-sm font-bold text-white">{errors.length} field belum lengkap</span>
        </div>
        <button onClick={handleDismiss} className="text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-2 max-h-60 overflow-y-auto">
        {sections.map(section => (
          <div key={section}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/60 mb-1">{section}</p>
            <div className="flex flex-wrap gap-1.5">
              {errors.filter(e => e.section === section).map(e => (
                <button
                  key={e.key}
                  type="button"
                  onClick={() => scrollTo(e.fieldId)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white/20 hover:bg-white/30 text-white transition-colors border border-white/20"
                >
                  {e.label}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Progress bar auto-dismiss */}
      <div className="h-0.5 bg-white/20">
        <div
          className="h-full bg-white/60"
          style={{ animation: "shrinkWidth 7s linear forwards" }}
        />
      </div>
    </div>
  );
}

// Loading Section Component
function SectionSkeleton({ title }: { title: string }) {
  return (
    <div className="glass-card p-8 shadow-sm opacity-70">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
        <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
            <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function VcfRegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { toasts, removeToast, toast } = useToast();
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});


  const [validationErrors, setValidationErrors] = useState<ValidationEntry[]>([]);
  const [masterLoading, setMasterLoading] = useState(true);
  const [masterProgress, setMasterProgress] = useState(0);
  const [showGuide, setShowGuide] = useState(false);

  // Settings
  const [showProdukLainnya, setShowProdukLainnya] = useState(true);
  const [produkOptions, setProdukOptions] = useState<{ kode: string; label: string }[]>([]);

  // Master data
  const [transporters, setTransporters] = useState<SelectOption[]>([]);
  const [drivers, setDrivers] = useState<SelectOption[]>([]);
  const [allDrivers, setAllDrivers] = useState<SelectOption[]>([]);
  const [jenisKendaraan, setJenisKendaraan] = useState<SelectOption[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [muatanItems, setMuatanItems] = useState<MuatanItem[]>([]);
  const [nextNumber, setNextNumber] = useState("");

  // Form state
  const [tanggal, setTanggal] = useState(formatDate());
  const [jamMasuk, setJamMasuk] = useState("");
  const [tipeKegiatan, setTipeKegiatan] = useState<TipeKegiatan>("");
  const [produkKode, setProdukKode] = useState<string>("");
  const [produkLainnya, setProdukLainnya] = useState("");
  const [transporterId, setTransporterId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [noPolisi, setNoPolisi] = useState("");
  const [jenisKendaraanId, setJenisKendaraanId] = useState("");
  const [tipeKendaraan, setTipeKendaraan] = useState<TipeKendaraan>("");
  const [tahunKendaraan, setTahunKendaraan] = useState("");
  const [tujuan, setTujuan] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [checklist, setChecklist] = useState<Record<number, boolean | null>>({});

  const [muatanDibawa, setMuatanDibawa] = useState<Record<number, { checked: boolean; nilai: string }>>({});
  const [muatanDiisi, setMuatanDiisi] = useState<Record<number, { checked: boolean; nilai: string }>>({});
  const [muatanDibawaLainnya, setMuatanDibawaLainnya] = useState({ checked: false, nilai: "" });
  const [muatanDiisiLainnya, setMuatanDiisiLainnya] = useState({ checked: false, nilai: "" });

  const applyMasterData = (data: ReturnType<typeof getCachedMasterData>) => {
    if (!data) return;
    setTransporters(data.transporters);
    const mappedDrivers = (data.drivers || []).map((d: any) => ({
      ...d,
      display_name: d.no_sim ? `${d.nama_supir} - ${d.no_sim}` : d.nama_supir
    }));
    setAllDrivers(mappedDrivers);
    setDrivers(mappedDrivers);
    setShowProdukLainnya(data.showProdukLainnya);
    setProdukOptions(data.produkOptions);
    setJenisKendaraan(data.jenisKendaraan);

    const cItems: ChecklistItem[] = data.checklistItems;
    setChecklistItems(cItems);
    const initialChecklist: Record<number, boolean | null> = {};
    cItems.forEach((item) => { initialChecklist[item.id] = null; });
    setChecklist(initialChecklist);

    const mItems: MuatanItem[] = data.muatanItems;
    setMuatanItems(mItems);
    const initDibawa: Record<number, { checked: boolean; nilai: string }> = {};
    const initDiisi: Record<number, { checked: boolean; nilai: string }> = {};
    mItems.forEach((m) => {
      if (m.jenis === "dibawa" || m.jenis === "both") initDibawa[m.id] = { checked: false, nilai: "" };
      if (m.jenis === "diisi" || m.jenis === "both") initDiisi[m.id] = { checked: false, nilai: "" };
    });
    setMuatanDibawa(initDibawa);
    setMuatanDiisi(initDiisi);
  };

  useEffect(() => {
    const cached = getCachedMasterData();
    if (cached) {
      // Instant — use cached data, no loading screen
      applyMasterData(cached);
      setMasterProgress(100);
      setMasterLoading(false);
      return;
    }

    // Not cached — fetch with progress
    setMasterLoading(true);
    setMasterProgress(0);
    fetchAndCacheMasterData((pct) => setMasterProgress(pct))
      .then((data) => {
        applyMasterData(data);
      })
      .catch((e) => console.error(e))
      .finally(() => setMasterLoading(false));
  }, []);

  useEffect(() => {
    const fetchNext = async () => {
      try {
        const nRes = await vcfApi.getNextNumber({ tanggal });
        setNextNumber(nRes.data.next_number);
      } catch { /* ignore */ }
    };
    fetchNext();
  }, [tanggal]);

  const validateForm = (): boolean => {
    const errors: Record<string, boolean> = {};
    const entries: ValidationEntry[] = [];
    let isValid = true;

    const addError = (key: string, section: string, label: string, fieldId: string) => {
      errors[key] = true;
      entries.push({ key, section, label, fieldId });
      isValid = false;
    };

    if (!jamMasuk || !isValidTime24h(jamMasuk))
      addError("jamMasuk", "Informasi Dasar", "Jam Masuk", "field-jam-masuk");
    if (!tipeKegiatan)
      addError("tipeKegiatan", "Informasi Dasar", "Tipe Kegiatan", "field-tipe-kegiatan");
    if (!produkKode)
      addError("produk", "Informasi Dasar", "Produk", "field-produk");
    if (produkKode === "OTHERS" && !produkLainnya.trim())
      addError("produkLainnya", "Informasi Dasar", "Detail Produk Lainnya", "field-produk-lainnya");
    if (!transporterId)
      addError("transporter", "Informasi Kendaraan", "Transporter", "field-transporter");
    if (!driverId)
      addError("driver", "Informasi Kendaraan", "Supir", "field-driver");
    if (!noPolisi.trim())
      addError("noPolisi", "Informasi Kendaraan", "No. Polisi", "field-no-polisi");
    if (!jenisKendaraanId)
      addError("jenisKendaraan", "Informasi Kendaraan", "Jenis Kendaraan", "field-jenis-kendaraan");

    if (tahunKendaraan) {
      const year = parseInt(tahunKendaraan, 10);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year > currentYear) {
        addError("tahunKendaraan", "Informasi Kendaraan", "Tahun Kendaraan (Maks. " + currentYear + ")", "field-tahun-kendaraan");
      }
    }

    const emptyChecklistItems = checklistItems.filter(item => checklist[item.id] === null);
    if (emptyChecklistItems.length > 0)
      addError("checklist", "Kelengkapan Supir", `${emptyChecklistItems.length} item belum dijawab`, "field-checklist");

    setFieldErrors(errors);
    setValidationErrors(entries);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    // Client-side validation
    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setValidationErrors([]);

    const kelengkapanSupir = checklistItems
      .filter((item) => checklist[item.id] !== null)
      .map((item) => ({
        item_id: item.id,
        nilai: checklist[item.id],
        keterangan: "-",
      }));

    const produkStr = produkKode === "OTHERS" ? `OTHERS: ${produkLainnya.trim()}` : produkKode;

    const buildMuatanPayload = (src: Record<number, { checked: boolean; nilai: string }>, lainnya: { checked: boolean; nilai: string }) => {
      const payload: Array<{ item_muatan_id: number | null; nilai: string; keterangan: string }> = Object.entries(src)
        .filter(([, v]) => v.checked)
        .map(([id, v]) => ({
          item_muatan_id: parseInt(id, 10),
          nilai: v.nilai?.trim() ? v.nilai.trim() : "1",
          keterangan: "-",
        }));

      // Add lainnya if checked - send without item_muatan_id (null)
      if (lainnya.checked && lainnya.nilai?.trim()) {
        payload.push({
          item_muatan_id: null,
          nilai: lainnya.nilai.trim(),
          keterangan: "-",
        });
      }

      return payload;
    };

    const keteranganFinal = keterangan.trim() || "-";

    setLoading(true);
    try {
      // Generate QR Signature before submit
      const qrSignature = await generateQRSignature("bagian1");

      const payload = {
        tanggal,
        produk: produkStr,
        tipe_kegiatan: tipeKegiatan,
        asal_tujuan: tujuan || "-",
        jenis_kendaraan_id: parseInt(jenisKendaraanId),
        no_polisi: noPolisi.toUpperCase(),
        tipe_kendaraan: tipeKendaraan || "-",
        tahun_kendaraan: tahunKendaraan ? parseInt(tahunKendaraan, 10) : null,
        transporter_id: parseInt(transporterId),
        driver_id: parseInt(driverId),
        jam_masuk: jamMasuk,
        kelengkapan_supir: kelengkapanSupir,
        muatan_dibawa: isUnloading ? buildMuatanPayload(muatanDibawa, muatanDibawaLainnya) : [],
        muatan_diisi: isLoading ? buildMuatanPayload(muatanDiisi, muatanDiisiLainnya) : [],
        keterangan: keteranganFinal,
        qr_signature: qrSignature,
      };

      const res = await vcfApi.createBagian1(payload);
      const vcfId = res.data.data?.id || res.data.id;
      
      toast.success("Registrasi Berhasil", "Data VCF telah didaftarkan ke sistem.");
      
      const user = getUser();
      setTimeout(() => {
        router.push("/vcf");
      }, 1000);
    } catch (err: any) {
      toast.error("Registrasi Gagal", getErrorMessage(err, "Gagal menyimpan VCF."));
    } finally {
      setLoading(false);
    }
  };

  const isLoading = tipeKegiatan.startsWith("loading");
  const isUnloading = tipeKegiatan.startsWith("unloading");

  if (masterLoading) {
    return (
      <div className="max-w-5xl mx-auto pb-8">
        <div className="mb-8">
          <h1 className="page-title text-3xl mb-1">Registrasi VCF</h1>
          <p className="page-subtitle text-lg">Pendaftaran Kendaraan Masuk (Main Gate)</p>
        </div>
        <div className="glass-card p-16 flex flex-col items-center justify-center min-h-[60vh] gap-6">
          <div className="w-16 h-16 rounded-full border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 animate-spin" />
          <div className="text-center">
            <p className="font-bold text-text-primary text-lg mb-1">Memuat Data</p>
            <p className="text-text-muted text-sm">Harap tunggu, data master sedang disiapkan...</p>
          </div>
          <div className="w-64 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 transition-all duration-500 ease-out" style={{ width: `${masterProgress}%` }} />
          </div>
          <p className="text-blue-500 font-bold text-sm">{masterProgress}%</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="page-title text-3xl mb-1">Registrasi VCF</h1>
          <p className="page-subtitle text-lg">Pendaftaran Kendaraan Masuk (Main Gate)</p>
        </div>
        <button
          type="button"
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

      <ValidationSummary errors={validationErrors} onDismiss={() => setValidationErrors([])} />
      <ToastContainer toasts={toasts} onRemove={removeToast} />


      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: DOKUMEN & LOGISTIK */}
        <div className="glass-card p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
            </div>
            <h2 className="text-xl font-bold text-text-primary">Informasi Dasar & Logistik</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div>
              <label className="form-label">No. Urut</label>
              <div className="text-2xl font-bold text-blue-600 tracking-wider py-2">
                {nextNumber || "....."}
              </div>
              <p className="text-xs text-slate-400">Otomatis generate harian</p>
            </div>
            <div>
              <label className="form-label">Tanggal</label>
              <input type="date" className="form-input text-lg" value={tanggal} onChange={(e) => setTanggal(e.target.value)} required />
            </div>
            <div id="field-jam-masuk" data-field-error={fieldErrors.jamMasuk ? "true" : undefined}>
              <label className="form-label">Jam Masuk (WIB) *</label>
              <input
                type="text"
                className={`form-input text-lg font-mono transition-all duration-300 ${fieldErrors.jamMasuk ? 'bg-red-50 dark:bg-red-500/10 border-red-500 shadow-lg shadow-red-500/10' : ''}`}
                value={jamMasuk}
                onChange={(e) => {
                  let v = e.target.value.replace(/[^\d]/g, "");
                  if (v.length > 4) v = v.slice(0, 4);
                  setJamMasuk(v.length > 2 ? v.slice(0, 2) + ":" + v.slice(2) : v);
                  if (fieldErrors.jamMasuk) {
                    setFieldErrors(prev => ({ ...prev, jamMasuk: false }));
                  }
                }}
                placeholder="HH:MM"
                maxLength={5}
              />
              {fieldErrors.jamMasuk && (
                <p className="text-[11px] text-red-500 mt-1">Jam masuk wajib diisi format HH:MM</p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div id="field-tipe-kegiatan">
              <label className="form-label mb-3">Tipe Kegiatan & Logistik *</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Loading */}
                <div
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${isLoading ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/5' : 'border-slate-100 dark:border-white/5 hover:border-slate-200'}`}
                  onClick={() => setTipeKegiatan(tipeKegiatan.startsWith("loading") ? "" : "loading_lokal")}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${isLoading ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-500'}`}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                    </div>
                    <span className={`font-bold ${isLoading ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600'}`}>LOADING</span>
                  </div>
                  {isLoading && (
                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                      {["lokal", "export"].map(t => (
                        <button key={t} type="button" onClick={() => setTipeKegiatan(`loading_${t}` as any)} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase ${tipeKegiatan === `loading_${t}` ? 'bg-blue-500 text-white' : 'bg-white border border-slate-200 text-slate-500'}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Unloading */}
                <div
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${isUnloading ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/5' : 'border-slate-100 dark:border-white/5 hover:border-slate-200'}`}
                  onClick={() => setTipeKegiatan(isUnloading ? "" : "unloading_lokal")}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${isUnloading ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-500'}`}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                    </div>
                    <span className={`font-bold ${isUnloading ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600'}`}>UNLOADING</span>
                  </div>
                  {isUnloading && (
                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                      {["lokal", "import"].map(t => (
                        <button key={t} type="button" onClick={() => setTipeKegiatan(`unloading_${t}` as any)} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase ${tipeKegiatan === `unloading_${t}` ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-200 text-slate-500'}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div id="field-produk">
              <label className="form-label mb-3">Produk *</label>
              <div className="flex flex-wrap gap-2">
                {produkOptions.map((p: { kode: string; label: string }) => (
                  <button
                    key={p.kode} type="button"
                    onClick={() => setProdukKode(p.kode)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${produkKode === p.kode ? 'bg-blue-500 border-blue-500 text-white shadow-md shadow-blue-200' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'}`}
                  >
                    {p.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setProdukKode("OTHERS")}
                  className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${produkKode === "OTHERS" ? 'bg-blue-500 border-blue-500 text-white shadow-md shadow-blue-200' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'}`}
                >
                  Lainnya
                </button>
              </div>
              {produkKode === "OTHERS" && (
                <input type="text" className="form-input mt-3" placeholder="Sebutkan produk lainnya..." value={produkLainnya} onChange={e => setProdukLainnya(e.target.value)} required />
              )}
            </div>
          </div>
        </div>

        {/* SECTION 2: KENDARAAN & SUPIR */}
        {masterLoading ? (
          <SectionSkeleton title="Kendaraan & Personel" />
        ) : (
          <div className="glass-card p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13" rx="1" /><path d="M16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>
              </div>
              <h2 className="text-xl font-bold text-text-primary">Kendaraan & Personel</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div id="field-transporter">
                  <SearchableDropdown
                    label="Nama Transporter"
                    options={transporters}
                    value={transporterId}
                    onChange={setTransporterId}
                    placeholder="Pilih Transporter"
                    required
                    displayField="nama_transporter"
                  />
                </div>
                <div id="field-no-polisi">
                  <label className="form-label">No. Polisi *</label>
                  <input type="text" className="form-input uppercase" placeholder="BK 1234 ABC" value={noPolisi} onChange={e => setNoPolisi(e.target.value)} required />
                </div>
                <div id="field-jenis-kendaraan">
                  <label className="form-label">Jenis Kendaraan *</label>
                  <select
                    className="form-select uppercase"
                    value={tipeKendaraan}
                    onChange={e => {
                      const val = e.target.value;
                      setTipeKendaraan(val as any);
                      // Find matching jenis_kendaraan_id from master data by name/kode
                      const match = jenisKendaraan.find(j =>
                        j.nama?.toLowerCase().includes(val.toLowerCase()) ||
                        j.kode?.toLowerCase().includes(val.toLowerCase())
                      );
                      if (match) {
                        setJenisKendaraanId(String(match.id));
                      } else if (jenisKendaraan.length > 0) {
                        // Fallback to first one if no match found (to satisfy backend requirement)
                        setJenisKendaraanId(String(jenisKendaraan[0].id));
                      }
                    }}
                    required
                  >
                    <option value="">Pilih Jenis</option>
                    {[
                      { val: "bak_terbuka", label: "Bak Terbuka" },
                      { val: "tangki", label: "Tangki" },
                      { val: "umum", label: "Umum" },
                      { val: "box", label: "Box" },
                      { val: "container", label: "Container" }
                    ].map(t => (
                      <option key={t.val} value={t.val}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-4">
                <div id="field-driver">
                  <SearchableDropdown
                    label="Nama Supir"
                    options={drivers}
                    value={driverId}
                    onChange={setDriverId}
                    placeholder="Pilih Supir"
                    required
                    displayField="display_name"
                  />
                </div>
                <div>
                  <label className="form-label">No. SIM</label>
                  <input type="text" className="form-input bg-slate-50 dark:bg-white/5" value={allDrivers.find(d => String(d.id) === driverId)?.no_sim || ""} readOnly placeholder="Terisi otomatis" />
                </div>
                <div>
                  <label className="form-label">Berlaku SIM</label>
                  <input
                    type="text"
                    className="form-input bg-slate-50 dark:bg-white/5"
                    value={(() => {
                      const d = allDrivers.find(d => String(d.id) === driverId);
                      return d?.tgl_berlaku_sim ? d.tgl_berlaku_sim.split('T')[0] : "";
                    })()}
                    readOnly
                    placeholder="Terisi otomatis"
                  />
                </div>

              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div id="field-tahun-kendaraan" data-field-error={fieldErrors.tahunKendaraan ? "true" : undefined}>
                <label className="form-label">Tahun Kendaraan</label>
                <input
                  type="number"
                  className={`form-input ${fieldErrors.tahunKendaraan ? 'border-red-500 bg-red-50 dark:bg-red-500/10' : ''}`}
                  placeholder="Contoh: 2022"
                  value={tahunKendaraan}
                  onChange={e => {
                    setTahunKendaraan(e.target.value);
                    if (fieldErrors.tahunKendaraan) {
                      setFieldErrors(prev => ({ ...prev, tahunKendaraan: false }));
                    }
                  }}
                />
                {fieldErrors.tahunKendaraan && (
                  <p className="text-[11px] text-red-500 mt-1">Tahun tidak boleh lebih dari {new Date().getFullYear()}</p>
                )}
              </div>
              <div>
                <label className="form-label">Tujuan</label>
                <input type="text" className="form-input" placeholder="Masukkan tujuan" value={tujuan} onChange={e => setTujuan(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: PEMERIKSAAN KELENGKAPAN */}
        {masterLoading ? (
          <SectionSkeleton title="Pemeriksaan Kelengkapan Supir" />
        ) : (
          <div id="field-checklist" className="glass-card p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-text-primary">Pemeriksaan Kelengkapan Supir</h2>
                <p className="text-sm text-text-muted">Wajib diisi semua item (Ya/Tidak).</p>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {Object.values(checklist).filter((v) => v !== null).length}/{checklistItems.length} terisi
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {checklistItems.map((item) => {
                const val = checklist[item.id];
                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl border transition-all"
                    style={{
                      background: val === true ? "rgba(16,185,129,0.06)" : val === false ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.02)",
                      borderColor: val === true ? "rgba(16,185,129,0.25)" : val === false ? "rgba(239,68,68,0.25)" : "var(--border)",
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-text-primary dark:text-slate-200 truncate">
                          {item.nama_item}
                        </p>
                        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                          Status: <span className="font-semibold">{val === null ? "Belum dipilih" : val ? "Ya" : "Tidak"}</span>
                        </p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setChecklist((p) => ({ ...p, [item.id]: true }))}
                          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${val === true ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white/0 border-border text-slate-500 hover:border-emerald-500/50"}`}
                        >
                          Ya
                        </button>
                        <button
                          type="button"
                          onClick={() => setChecklist((p) => ({ ...p, [item.id]: false }))}
                          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${val === false ? "bg-rose-500 border-rose-500 text-white" : "bg-white/0 border-border text-slate-500 hover:border-rose-500/50"}`}
                        >
                          Tidak
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION 4: MUATAN - only show when tipe kegiatan selected */}
        {!tipeKegiatan ? (
          <div className="glass-card p-6 shadow-sm border-2 border-dashed border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-3 text-text-muted">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-sm font-medium">Pilih <strong>Tipe Kegiatan</strong> (Loading/Unloading) terlebih dahulu untuk melihat detail muatan.</p>
            </div>
          </div>
        ) : (
          <div className="glass-card p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
              </div>
              <h2 className="text-xl font-bold text-text-primary">Jenis & Detail Muatan</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* Muatan Dibawa - Only shown for UNLOADING */}
              {isUnloading && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Muatan yang Dibawa</h3>
                  <div className="space-y-3">
                    {muatanItems.filter(m => m.jenis === 'dibawa' || m.jenis === 'both').map(m => (
                      <div key={m.id} className="p-4 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/30 dark:bg-white/5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-text-primary dark:text-slate-300 text-sm">{m.nama_item}</span>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => {
                              setMuatanDibawa(p => {
                                const newState: Record<number, { checked: boolean; nilai: string }> = {};
                                Object.keys(p).forEach(k => {
                                  newState[parseInt(k)] = { checked: true, nilai: "0" };
                                });
                                newState[m.id] = { checked: true, nilai: "1" };
                                return newState;
                              });
                              setMuatanDibawaLainnya({ checked: true, nilai: "0" });
                            }} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${muatanDibawa[m.id]?.checked && muatanDibawa[m.id]?.nilai !== "0" ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-bg-secondary dark:bg-white/10 text-text-muted border border-slate-100 dark:border-white/10'}`}>Ya</button>
                            <button type="button" onClick={() => setMuatanDibawa(p => ({ ...p, [m.id]: { checked: true, nilai: "0" } }))} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${muatanDibawa[m.id]?.checked && muatanDibawa[m.id]?.nilai === "0" ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' : 'bg-bg-secondary dark:bg-white/10 text-text-muted border border-slate-100 dark:border-white/10'}`}>Tidak</button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {/* Lainnya — controlled by vcf.show_produk_lainnya setting */}
                    {showProdukLainnya && (
                      <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/10">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-text-muted text-sm italic">Lainnya</span>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => {
                              setMuatanDibawa(p => {
                                const newState: Record<number, { checked: boolean; nilai: string }> = {};
                                Object.keys(p).forEach(k => {
                                  newState[parseInt(k)] = { checked: true, nilai: "0" };
                                });
                                return newState;
                              });
                              setMuatanDibawaLainnya(prev => ({ checked: true, nilai: prev.nilai === "0" ? "" : prev.nilai }));
                            }} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${muatanDibawaLainnya.checked && muatanDibawaLainnya.nilai !== "0" ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-bg-secondary dark:bg-white/10 text-text-muted border border-slate-100 dark:border-white/10'}`}>Ya</button>
                            <button type="button" onClick={() => setMuatanDibawaLainnya({ checked: true, nilai: "0" })} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${muatanDibawaLainnya.checked && muatanDibawaLainnya.nilai === "0" ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' : 'bg-bg-secondary dark:bg-white/10 text-text-muted border border-slate-100 dark:border-white/10'}`}>Tidak</button>
                          </div>
                        </div>
                        {muatanDibawaLainnya.checked && muatanDibawaLainnya.nilai !== "0" && (
                          <div className="mt-2">
                            <input type="text" className="form-input text-xs" placeholder="Sebutkan muatan lainnya..." value={muatanDibawaLainnya.nilai} onChange={(e) => setMuatanDibawaLainnya({ checked: true, nilai: e.target.value })} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Muatan Diisi - Only shown for LOADING */}
              {isLoading && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Muatan yang Akan Diisi</h3>
                  <div className="space-y-3">
                    {muatanItems.filter(m => m.jenis === 'diisi' || m.jenis === 'both').map(m => (
                      <div key={m.id} className="p-4 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/30 dark:bg-white/5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-text-primary dark:text-slate-300 text-sm">{m.nama_item}</span>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => {
                              setMuatanDiisi(p => {
                                const newState: Record<number, { checked: boolean; nilai: string }> = {};
                                Object.keys(p).forEach(k => {
                                  newState[parseInt(k)] = { checked: true, nilai: "0" };
                                });
                                newState[m.id] = { checked: true, nilai: "1" };
                                return newState;
                              });
                              setMuatanDiisiLainnya({ checked: true, nilai: "0" });
                            }} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${muatanDiisi[m.id]?.checked && muatanDiisi[m.id]?.nilai !== "0" ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-bg-secondary dark:bg-white/10 text-text-muted border border-slate-100 dark:border-white/10'}`}>Ya</button>
                            <button type="button" onClick={() => setMuatanDiisi(p => ({ ...p, [m.id]: { checked: true, nilai: "0" } }))} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${muatanDiisi[m.id]?.checked && muatanDiisi[m.id]?.nilai === "0" ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' : 'bg-bg-secondary dark:bg-white/10 text-text-muted border border-slate-100 dark:border-white/10'}`}>Tidak</button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {/* Lainnya hardcoded — no master data needed */}
                    <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/10">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-text-muted text-sm italic">Lainnya</span>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => {
                            setMuatanDiisi(p => {
                              const newState: Record<number, { checked: boolean; nilai: string }> = {};
                              Object.keys(p).forEach(k => {
                                newState[parseInt(k)] = { checked: true, nilai: "0" };
                              });
                              return newState;
                            });
                            setMuatanDiisiLainnya(prev => ({ checked: true, nilai: prev.nilai === "0" ? "" : prev.nilai }));
                          }} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${muatanDiisiLainnya.checked && muatanDiisiLainnya.nilai !== "0" ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-bg-secondary dark:bg-white/10 text-text-muted border border-slate-100 dark:border-white/10'}`}>Ya</button>
                          <button type="button" onClick={() => setMuatanDiisiLainnya({ checked: true, nilai: "0" })} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${muatanDiisiLainnya.checked && muatanDiisiLainnya.nilai === "0" ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' : 'bg-bg-secondary dark:bg-white/10 text-text-muted border border-slate-100 dark:border-white/10'}`}>Tidak</button>
                        </div>
                      </div>
                      {muatanDiisiLainnya.checked && muatanDiisiLainnya.nilai !== "0" && (
                        <div className="mt-2">
                          <input type="text" className="form-input text-xs" placeholder="Sebutkan muatan lainnya..." value={muatanDiisiLainnya.nilai} onChange={(e) => setMuatanDiisiLainnya({ checked: true, nilai: e.target.value })} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION 5: KETERANGAN */}
        <div className="glass-card p-8 shadow-sm">
          <label className="form-label mb-3">Keterangan Tambahan (Opsional)</label>
          <textarea className="form-input" rows={4} placeholder="Masukkan catatan jika ada..." value={keterangan} onChange={e => setKeterangan(e.target.value)} />
        </div>

        {/* ACTIONS */}
        <div className="flex items-center justify-end gap-4 pt-4">
          <button type="button" onClick={() => router.back()} className="btn btn-secondary px-8">Batal</button>
          <button type="submit" disabled={loading} className="btn btn-primary px-12 py-4 text-lg">
            {loading ? <><span className="spinner" /> Menyimpan...</> : "Simpan & Daftarkan VCF"}
          </button>
        </div>
      </form>
    </div>
  );
}
