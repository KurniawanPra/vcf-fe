"use client";

import { useState, useEffect } from "react";
import { vcfApi } from "@/lib/api";
import { fetchAndCacheMasterData, getCachedMasterData } from "@/lib/masterDataCache";
import { formatTime, formatDate, isValidTime24h, getErrorMessage } from "@/lib/utils";
import { getUser, isAdmin } from "@/lib/auth";
import { generateQRSignature } from "@/lib/qrUtils";
import SearchableDropdown from "@/components/SearchableDropdown";
import { useToast, ToastContainer } from "@/components/Toast";
import { VCF_STATUS } from "@/constants/vcfStatus";

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
  if (errors.length === 0) return null;
  const sections = Array.from(new Set(errors.map(e => e.section)));
  const scrollTo = (fieldId: string) => {
    const el = document.getElementById(fieldId) || document.querySelector(`[data-field-id="${fieldId}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    (el as HTMLElement)?.focus?.();
  };
  return (
    <div className="mb-6 rounded-2xl border border-amber-400/30 bg-amber-50/80 dark:bg-amber-900/10 backdrop-blur-sm overflow-hidden animate-slideDown">
      <div className="flex items-center justify-between px-5 py-3 border-b border-amber-400/20">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-amber-500 shrink-0">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span className="text-sm font-bold text-amber-700 dark:text-amber-400">{errors.length} field belum lengkap</span>
        </div>
        <button onClick={onDismiss} className="text-amber-500 hover:text-amber-700 transition-colors p-1 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div className="px-5 py-3 space-y-2">
        {sections.map(section => (
          <div key={section}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600/70 dark:text-amber-400/70 mb-1">{section}</p>
            <div className="flex flex-wrap gap-2">
              {errors.filter(e => e.section === section).map(e => (
                <button
                  key={e.key}
                  type="button"
                  onClick={() => scrollTo(e.fieldId)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors border border-amber-300/40"
                >
                  {e.label}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function normalizeToHHmm(value: string): string {
  const cleaned = (value || "").replace(/[^\d:]/g, "");
  const m = cleaned.match(/^(\d{2}):(\d{2})/);
  if (!m) return cleaned;
  return `${m[1]}:${m[2]}`;
}

interface Props {
  vcfId: number;
  onSuccess: () => void;
  onClose: () => void;
}

export default function Bagian1EditModal({ vcfId, onSuccess, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const { toasts, removeToast, toast } = useToast();
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
  const [validationErrors, setValidationErrors] = useState<ValidationEntry[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [masterLoading, setMasterLoading] = useState(true);
  const [masterProgress, setMasterProgress] = useState(0);
  
  // Settings
  const [showProdukLainnya, setShowProdukLainnya] = useState(true);
  const [produkOptions, setProdukOptions] = useState<{kode: string; label: string}[]>([]);

  // Master data
  const [transporters, setTransporters] = useState<SelectOption[]>([]);
  const [drivers, setDrivers] = useState<SelectOption[]>([]);
  const [allDrivers, setAllDrivers] = useState<SelectOption[]>([]);
  const [jenisKendaraan, setJenisKendaraan] = useState<SelectOption[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [muatanItems, setMuatanItems] = useState<MuatanItem[]>([]);
  const [noUrut, setNoUrut] = useState("");

  // Form state
  const [tanggal, setTanggal] = useState("");
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

  const parseKeterangan = (raw: string) => {
    if (!raw || raw === "-") return { note: "", dibawa: "", diisi: "" };
    const note = raw.split(" | ")[0];
    return { note, dibawa: "", diisi: "" };
  };

  const applyMasterData = (data: any) => {
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
    setChecklistItems(data.checklistItems);
    setMuatanItems(data.muatanItems);
  };

  useEffect(() => {
    const init = async () => {
      setMasterLoading(true);
      setMasterProgress(10);
      try {
        const cached = getCachedMasterData();
        let mData = cached;
        if (!cached) {
          mData = await fetchAndCacheMasterData((pct) => setMasterProgress(10 + (pct * 0.4)));
        }
        applyMasterData(mData);
        setMasterProgress(50);

        const res = await vcfApi.getDetail(vcfId);
        const v = res.data;

        if (["selesai", "reject"].includes(v.status) && !isAdmin()) {
          onClose();
          return;
        }

        setNoUrut(v.nomor_urut || "");
        setTanggal(v.tanggal || "");
        setJamMasuk(normalizeToHHmm(v.jam_masuk || ""));
        setTipeKegiatan((v.tipe_kegiatan as TipeKegiatan) || "");

        const pStr: string = v.produk || "";
        const foundProduk = mData?.produkOptions.find((p: any) => p.kode === pStr);
        if (foundProduk) {
          setProdukKode(foundProduk.kode);
        } else if (pStr.startsWith("OTHERS:")) {
          setProdukKode("OTHERS");
          setProdukLainnya(pStr.replace(/^OTHERS:\s*/i, "").trim());
        } else if (pStr) {
          setProdukKode("OTHERS");
          setProdukLainnya(pStr);
        }

        setTransporterId(String(v.transporter_id || ""));
        setDriverId(String(v.driver_id || ""));
        setNoPolisi(v.no_polisi || "");
        setJenisKendaraanId(String(v.jenis_kendaraan_id || ""));
        setTipeKendaraan((v.tipe_kendaraan as TipeKendaraan) || "");
        setTahunKendaraan(v.tahun_kendaraan ? String(v.tahun_kendaraan) : "");
        setTujuan(v.asal_tujuan && v.asal_tujuan !== "-" ? v.asal_tujuan : "");

        const { note, dibawa, diisi } = parseKeterangan(v.keterangan || "");
        setKeterangan(note);
        if (dibawa) setMuatanDibawaLainnya({ checked: true, nilai: dibawa });
        if (diisi) setMuatanDiisiLainnya({ checked: true, nilai: diisi });

        const initialChecklist: Record<number, boolean | null> = {};
        (v.kelengkapan_supir || []).forEach((ks: any) => {
          initialChecklist[ks.item_id] = ks.nilai === true || ks.nilai === 1;
        });
        mData?.checklistItems.forEach((item: any) => {
          if (!(item.id in initialChecklist)) initialChecklist[item.id] = null;
        });
        setChecklist(initialChecklist);

        const initDibawa: Record<number, { checked: boolean; nilai: string }> = {};
        const initDiisi: Record<number, { checked: boolean; nilai: string }> = {};
        
        // Initialize based on master items, but don't force "checked" if not needed
        mData?.muatanItems.forEach((m: any) => {
          if (m.jenis === "dibawa" || m.jenis === "both") initDibawa[m.id] = { checked: false, nilai: "0" };
          if (m.jenis === "diisi" || m.jenis === "both") initDiisi[m.id] = { checked: false, nilai: "0" };
        });

        // Reset Others state
        setMuatanDibawaLainnya({ checked: false, nilai: "" });
        setMuatanDiisiLainnya({ checked: false, nilai: "" });

        (v.muatan_dibawa || []).forEach((m: any) => {
          const val = m.nilai?.toString() || "";
          if (m.item_muatan_id && initDibawa[m.item_muatan_id]) {
            initDibawa[m.item_muatan_id] = { checked: true, nilai: val || "1" };
          } else if (val && val !== "0" && val !== "-") {
            setMuatanDibawaLainnya({ checked: true, nilai: val });
          }
        });

        (v.muatan_diisi || []).forEach((m: any) => {
          const val = m.nilai?.toString() || "";
          if (m.item_muatan_id && initDiisi[m.item_muatan_id]) {
            initDiisi[m.item_muatan_id] = { checked: true, nilai: val || "1" };
          } else if (val && val !== "0" && val !== "-") {
            setMuatanDiisiLainnya({ checked: true, nilai: val });
          }
        });

        setMuatanDibawa(initDibawa);
        setMuatanDiisi(initDiisi);

        setMasterProgress(100);
      } catch (err: any) {
        toast.error("Gagal Memuat", getErrorMessage(err, "Gagal memuat data VCF."));
      } finally {
        setMasterLoading(false);
      }
    };
    init();
  }, [vcfId, onClose, toast]);

  const isLoading = tipeKegiatan.startsWith("loading");
  const isUnloading = tipeKegiatan.startsWith("unloading");

  const validateForm = (): boolean => {
    const errors: Record<string, boolean> = {};
    const entries: ValidationEntry[] = [];
    let isValid = true;

    const addError = (key: string, section: string, label: string, fieldId: string) => {
      errors[key] = true;
      entries.push({ key, section, label, fieldId });
      isValid = false;
    };

    if (!jamMasuk || !isValidTime24h(jamMasuk)) addError("jamMasuk", "Informasi Dasar", "Jam Masuk", "field-jam-masuk");
    if (!tipeKegiatan) addError("tipeKegiatan", "Informasi Dasar", "Tipe Kegiatan", "field-tipe-kegiatan");
    if (!produkKode) addError("produk", "Informasi Dasar", "Produk", "field-produk");
    if (produkKode === "OTHERS" && !produkLainnya.trim()) addError("produkLainnya", "Informasi Dasar", "Detail Produk Lainnya", "field-produk-lainnya");
    if (!transporterId) addError("transporter", "Informasi Kendaraan", "Transporter", "field-transporter");
    if (!driverId) addError("driver", "Informasi Kendaraan", "Supir", "field-driver");
    if (!noPolisi.trim()) addError("noPolisi", "Informasi Kendaraan", "No. Polisi", "field-no-polisi");
    if (!jenisKendaraanId) addError("jenisKendaraan", "Informasi Kendaraan", "Jenis Kendaraan", "field-jenis-kendaraan");

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

    if (!validateForm()) {
      return;
    }
    setValidationErrors([]);

    const kelengkapanSupir = checklistItems.map((item) => ({
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
      if (lainnya.checked && lainnya.nilai?.trim()) {
        payload.push({ item_muatan_id: null, nilai: lainnya.nilai.trim(), keterangan: "-" });
      }
      return payload;
    };

    const keteranganFinal = keterangan.trim() || "-";

    setLoading(true);
    try {
      const qrSignature = await generateQRSignature("bagian1");
      const payload = {
        tanggal, produk: produkStr, tipe_kegiatan: tipeKegiatan, asal_tujuan: tujuan || "-",
        jenis_kendaraan_id: parseInt(jenisKendaraanId), no_polisi: noPolisi.toUpperCase(),
        tipe_kendaraan: tipeKendaraan || "-", tahun_kendaraan: tahunKendaraan ? parseInt(tahunKendaraan, 10) : null,
        transporter_id: parseInt(transporterId), driver_id: parseInt(driverId), jam_masuk: jamMasuk,
        kelengkapan_supir: kelengkapanSupir, muatan_dibawa: isUnloading ? buildMuatanPayload(muatanDibawa, muatanDibawaLainnya) : [],
        muatan_diisi: isLoading ? buildMuatanPayload(muatanDiisi, muatanDiisiLainnya) : [],
        keterangan: keteranganFinal, qr_signature: qrSignature,
      };

      await vcfApi.updateBagian1(vcfId, payload);
      setShowSuccess(true);
      toast.success("Berhasil", "Perubahan VCF berhasil disimpan.");
      setTimeout(() => onSuccess(), 1500);
    } catch (err: any) {
      toast.error("Gagal Menyimpan", getErrorMessage(err, "Gagal menyimpan perubahan VCF."));
    } finally {
      setLoading(false);
    }
  };

  if (masterLoading) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-sm" style={{ background: "rgba(0,0,0,0.6)" }}>
        <div className="glass-card w-full max-w-5xl p-16 flex flex-col items-center justify-center min-h-[60vh] gap-6">
          <div className="w-16 h-16 rounded-full border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 animate-spin" />
          <div className="text-center">
            <p className="font-bold text-text-primary text-lg mb-1">Memuat Data</p>
            <p className="text-text-muted text-sm">Harap tunggu, data sedang disiapkan...</p>
          </div>
          <div className="w-64 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 transition-all duration-500 ease-out" style={{ width: `${masterProgress}%` }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-bg-card w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10" onClick={(e) => e.stopPropagation()}>
        {/* Minimalist Header */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-white dark:bg-bg-card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center border border-slate-100 dark:border-white/10">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-500"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">Edit Registrasi VCF</h2>
              <p className="text-slate-400 text-xs font-medium">Perbarui informasi dasar dan logistik kendaraan</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 transition-all">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="p-8 overflow-y-auto flex-1 bg-white dark:bg-bg-card relative">
          {showSuccess && (
            <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-white/95 dark:bg-slate-900/98 backdrop-blur-sm animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center border-2 border-emerald-100 mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-1">Berhasil Disimpan</h3>
              <p className="text-slate-400 text-sm font-medium">Data telah diperbarui secara aman.</p>
              
              <style>{`
                .animate-fadeIn { animation: fadeIn 0.2s ease-out forwards; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
              `}</style>
            </div>
          )}
          <ValidationSummary errors={validationErrors} onDismiss={() => setValidationErrors([])} />
          <ToastContainer toasts={toasts} onRemove={removeToast} />

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* SECTION 1: DOKUMEN & LOGISTIK */}
            <div className="p-8 border border-slate-100 dark:border-white/5 rounded-3xl shadow-sm mb-6">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                </div>
                <h2 className="text-xl font-bold text-text-primary">Informasi Dasar & Logistik</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div>
                  <label className="form-label">No. Urut</label>
                  <div className="text-2xl font-bold text-blue-600 tracking-wider py-2">{noUrut || "....."}</div>
                </div>
                <div>
                  <label className="form-label">Tanggal</label>
                  <input type="date" className="form-input text-lg" value={tanggal} onChange={(e) => setTanggal(e.target.value)} required />
                </div>
                <div id="field-jam-masuk" data-field-error={fieldErrors.jamMasuk ? "true" : undefined}>
                  <label className="form-label">Jam Masuk (WIB) *</label>
                  <input type="text" className={`form-input text-lg font-mono transition-all duration-300 ${fieldErrors.jamMasuk ? 'bg-red-50 dark:bg-red-500/10 border-red-500 shadow-lg shadow-red-500/10' : ''}`} value={jamMasuk} onChange={(e) => { let v = e.target.value.replace(/[^\d]/g, ""); if (v.length > 4) v = v.slice(0, 4); setJamMasuk(v.length > 2 ? v.slice(0, 2) + ":" + v.slice(2) : v); if (fieldErrors.jamMasuk) setFieldErrors(prev => ({ ...prev, jamMasuk: false })); }} placeholder="HH:MM" maxLength={5} />
                  {fieldErrors.jamMasuk && <p className="text-[11px] text-red-500 mt-1">Jam masuk wajib diisi format HH:MM</p>}
                </div>
              </div>

              <div className="space-y-6">
                <div id="field-tipe-kegiatan">
                  <label className="form-label mb-3">Tipe Kegiatan & Logistik *</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Loading */}
                    <div className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${isLoading ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/5' : 'border-slate-100 dark:border-white/5 hover:border-slate-200'}`} onClick={() => setTipeKegiatan(tipeKegiatan.startsWith("loading") ? "" : "loading_lokal")}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`p-2 rounded-lg ${isLoading ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-500'}`}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg></div>
                        <span className={`font-bold ${isLoading ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600'}`}>LOADING</span>
                      </div>
                      {isLoading && (
                        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                          {["lokal", "export"].map(t => (
                            <button key={t} type="button" onClick={() => setTipeKegiatan(`loading_${t}` as any)} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase ${tipeKegiatan === `loading_${t}` ? 'bg-blue-500 text-white' : 'bg-white border border-slate-200 text-slate-500'}`}>{t}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Unloading */}
                    <div className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${isUnloading ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/5' : 'border-slate-100 dark:border-white/5 hover:border-slate-200'}`} onClick={() => setTipeKegiatan(isUnloading ? "" : "unloading_lokal")}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`p-2 rounded-lg ${isUnloading ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-500'}`}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg></div>
                        <span className={`font-bold ${isUnloading ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600'}`}>UNLOADING</span>
                      </div>
                      {isUnloading && (
                        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                          {["lokal", "import"].map(t => (
                            <button key={t} type="button" onClick={() => setTipeKegiatan(`unloading_${t}` as any)} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase ${tipeKegiatan === `unloading_${t}` ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-200 text-slate-500'}`}>{t}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div id="field-produk">
                  <label className="form-label mb-3">Produk *</label>
                  <div className="flex flex-wrap gap-2">
                    {produkOptions.map((p: {kode: string; label: string}) => (
                      <button key={p.kode} type="button" onClick={() => setProdukKode(p.kode)} className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${produkKode === p.kode ? 'bg-blue-500 border-blue-500 text-white shadow-md shadow-blue-200' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'}`}>{p.label}</button>
                    ))}
                    <button type="button" onClick={() => setProdukKode("OTHERS")} className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${produkKode === "OTHERS" ? 'bg-blue-500 border-blue-500 text-white shadow-md shadow-blue-200' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'}`}>Lainnya</button>
                  </div>
                  {produkKode === "OTHERS" && (
                    <input type="text" className="form-input mt-3" placeholder="Sebutkan produk lainnya..." value={produkLainnya} onChange={e => setProdukLainnya(e.target.value)} required />
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 2: KENDARAAN & SUPIR */}
            <div className="p-8 border border-slate-100 dark:border-white/5 rounded-3xl shadow-sm mb-6">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13" rx="1" /><path d="M16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>
                </div>
                <h2 className="text-xl font-bold text-text-primary">Kendaraan & Personel</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div id="field-transporter">
                    <SearchableDropdown label="Nama Transporter" options={transporters} value={transporterId} onChange={setTransporterId} placeholder="Pilih Transporter" required displayField="nama_transporter" />
                  </div>
                  <div id="field-no-polisi">
                    <label className="form-label">No. Polisi *</label>
                    <input type="text" className="form-input uppercase" placeholder="BK 1234 ABC" value={noPolisi} onChange={e => setNoPolisi(e.target.value)} required />
                  </div>
                  <div id="field-jenis-kendaraan">
                    <label className="form-label">Jenis Kendaraan *</label>
                    <select className="form-select uppercase" value={tipeKendaraan} onChange={e => { const val = e.target.value; setTipeKendaraan(val as any); const match = jenisKendaraan.find(j => j.nama?.toLowerCase().includes(val.toLowerCase()) || j.kode?.toLowerCase().includes(val.toLowerCase())); if (match) { setJenisKendaraanId(String(match.id)); } else if (jenisKendaraan.length > 0) { setJenisKendaraanId(String(jenisKendaraan[0].id)); } }} required>
                      <option value="">Pilih Jenis</option>
                      {[{ val: "bak_terbuka", label: "Bak Terbuka" }, { val: "tangki", label: "Tangki" }, { val: "umum", label: "Umum" }, { val: "box", label: "Box" }, { val: "container", label: "Container" }].map(t => (
                        <option key={t.val} value={t.val}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-4">
                  <div id="field-driver">
                    <SearchableDropdown label="Nama Supir" options={drivers} value={driverId} onChange={setDriverId} placeholder="Pilih Supir" required displayField="display_name" />
                  </div>
                  <div>
                    <label className="form-label">No. SIM</label>
                    <input type="text" className="form-input bg-slate-50 dark:bg-white/5" value={allDrivers.find(d => String(d.id) === driverId)?.no_sim || ""} readOnly placeholder="Terisi otomatis" />
                  </div>
                  <div>
                    <label className="form-label">Berlaku SIM</label>
                    <input type="text" className="form-input bg-slate-50 dark:bg-white/5" value={(() => { const d = allDrivers.find(d => String(d.id) === driverId); return d?.tgl_berlaku_sim ? d.tgl_berlaku_sim.split('T')[0] : ""; })()} readOnly placeholder="Terisi otomatis" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div id="field-tahun-kendaraan" data-field-error={fieldErrors.tahunKendaraan ? "true" : undefined}>
                  <label className="form-label">Tahun Kendaraan</label>
                  <input type="number" className={`form-input ${fieldErrors.tahunKendaraan ? 'border-red-500 bg-red-50 dark:bg-red-500/10' : ''}`} placeholder="Contoh: 2022" value={tahunKendaraan} onChange={e => { setTahunKendaraan(e.target.value); if (fieldErrors.tahunKendaraan) setFieldErrors(prev => ({ ...prev, tahunKendaraan: false })); }} />
                  {fieldErrors.tahunKendaraan && <p className="text-[11px] text-red-500 mt-1">Tahun tidak boleh lebih dari {new Date().getFullYear()}</p>}
                </div>
                <div>
                  <label className="form-label">Tujuan</label>
                  <input type="text" className="form-input" placeholder="Masukkan tujuan" value={tujuan} onChange={e => setTujuan(e.target.value)} />
                </div>
              </div>
            </div>

            {/* SECTION 3: PEMERIKSAAN KELENGKAPAN */}
            <div id="field-checklist" className="p-8 border border-slate-100 dark:border-white/5 rounded-3xl shadow-sm">
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
                    <div key={item.id} className="p-4 rounded-2xl border border-slate-100 dark:border-white/10 bg-white dark:bg-bg-card shadow-sm transition-all">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-text-primary dark:text-slate-200 truncate">{item.nama_item}</p>
                          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Status: <span className="font-semibold">{val === null ? "Belum dipilih" : val ? "Ya" : "Tidak"}</span></p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button type="button" onClick={() => setChecklist((p) => ({ ...p, [item.id]: true }))} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${val === true ? "bg-slate-900 border-slate-900 text-white" : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:border-slate-300"}`}>Ya</button>
                          <button type="button" onClick={() => setChecklist((p) => ({ ...p, [item.id]: false }))} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${val === false ? "bg-rose-500 border-rose-500 text-white" : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:border-slate-300"}`}>Tidak</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION 4: MUATAN */}
            {!tipeKegiatan ? (
              <div className="glass-card p-6 shadow-sm border-2 border-dashed border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-3 text-text-muted">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <p className="text-sm font-medium">Pilih <strong>Tipe Kegiatan</strong> (Loading/Unloading) terlebih dahulu untuk melihat detail muatan.</p>
                </div>
              </div>
            ) :
            <div className="p-8 border border-slate-100 dark:border-white/5 rounded-3xl shadow-sm mb-6">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
                </div>
                <h2 className="text-xl font-bold text-text-primary">Jenis & Detail Muatan</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {isUnloading && (
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Muatan yang Dibawa</h3>
                    <div className="space-y-3">
                      {muatanItems.filter(m => m.jenis === 'dibawa' || m.jenis === 'both').map(m => (
                        <div key={m.id} className="p-4 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/30 dark:bg-white/5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-text-primary dark:text-slate-300 text-sm">{m.nama_item}</span>
                            <div className="flex gap-2">
                               <button type="button" onClick={() => { const reset: Record<number, { checked: boolean; nilai: string }> = {}; muatanItems.filter(x => x.jenis === 'dibawa' || x.jenis === 'both').forEach(x => { reset[x.id] = { checked: true, nilai: "0" }; }); reset[m.id] = { checked: true, nilai: "1" }; setMuatanDibawa(p => ({ ...p, ...reset })); setMuatanDibawaLainnya({ checked: true, nilai: "0" }); }} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all border ${muatanDibawa[m.id]?.checked && muatanDibawa[m.id]?.nilai !== "0" ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500'}`}>Ya</button>
                               <button type="button" onClick={() => setMuatanDibawa(p => ({ ...p, [m.id]: { checked: true, nilai: "0" } }))} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all border ${muatanDibawa[m.id]?.checked && muatanDibawa[m.id]?.nilai === "0" ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500'}`}>Tidak</button>
                             </div>
                          </div>
                        </div>
                      ))}
                      {showProdukLainnya && (
                      <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/10">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-text-muted text-sm italic">Lainnya</span>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => { const reset: Record<number, { checked: boolean; nilai: string }> = {}; muatanItems.filter(x => x.jenis === 'dibawa' || x.jenis === 'both').forEach(x => { reset[x.id] = { checked: true, nilai: "0" }; }); setMuatanDibawa(p => ({ ...p, ...reset })); setMuatanDibawaLainnya(prev => ({ checked: true, nilai: prev.nilai === "0" ? "" : prev.nilai })); }} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${muatanDibawaLainnya.checked && muatanDibawaLainnya.nilai !== "0" ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : (muatanDibawaLainnya.checked ? 'bg-blue-500 text-white shadow-lg shadow-blue-200' : 'bg-bg-secondary dark:bg-white/10 text-text-muted border border-slate-100 dark:border-white/10')}`}>Ya</button>
                            <button type="button" onClick={() => setMuatanDibawaLainnya({ checked: false, nilai: "0" })} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${!muatanDibawaLainnya.checked ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' : 'bg-bg-secondary dark:bg-white/10 text-text-muted border border-slate-100 dark:border-white/10'}`}>Tidak</button>
                          </div>
                        </div>
                        {muatanDibawaLainnya.checked && (
                          <div className="mt-2">
                            <input type="text" className="form-input text-xs" placeholder="Sebutkan muatan lainnya..." value={muatanDibawaLainnya.nilai} onChange={(e) => setMuatanDibawaLainnya({ checked: true, nilai: e.target.value })} />
                          </div>
                        )}
                      </div>
                      )}
                    </div>
                  </div>
                )}

                {isLoading && (
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Muatan yang Akan Diisi</h3>
                    <div className="space-y-3">
                      {muatanItems.filter(m => m.jenis === 'diisi' || m.jenis === 'both').map(m => (
                        <div key={m.id} className="p-4 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/30 dark:bg-white/5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-text-primary dark:text-slate-300 text-sm">{m.nama_item}</span>
                            <div className="flex gap-2">
                              <button type="button" onClick={() => { const reset: Record<number, { checked: boolean; nilai: string }> = {}; muatanItems.filter(x => x.jenis === 'diisi' || x.jenis === 'both').forEach(x => { reset[x.id] = { checked: true, nilai: "0" }; }); reset[m.id] = { checked: true, nilai: "1" }; setMuatanDiisi(reset); setMuatanDiisiLainnya({ checked: false, nilai: "0" }); }} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${muatanDiisi[m.id]?.nilai === "1" ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-bg-secondary dark:bg-white/10 text-text-muted border border-slate-100 dark:border-white/10'}`}>Ya</button>
                              <button type="button" onClick={() => { setMuatanDiisi(p => ({ ...p, [m.id]: { checked: true, nilai: "0" } })); }} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${muatanDiisi[m.id] !== undefined && muatanDiisi[m.id]?.nilai === "0" ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' : 'bg-bg-secondary dark:bg-white/10 text-text-muted border border-slate-100 dark:border-white/10'}`}>Tidak</button>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Lainnya */}
                      <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/10">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-text-muted text-sm italic">Lainnya</span>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => { const reset: Record<number, { checked: boolean; nilai: string }> = {}; muatanItems.filter(x => x.jenis === 'diisi' || x.jenis === 'both').forEach(x => { reset[x.id] = { checked: true, nilai: "0" }; }); setMuatanDiisi(reset); setMuatanDiisiLainnya(prev => ({ checked: true, nilai: prev.nilai && prev.nilai !== "0" ? prev.nilai : "", })); }} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${muatanDiisiLainnya.checked ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-bg-secondary dark:bg-white/10 text-text-muted border border-slate-100 dark:border-white/10'}`}>Ya</button>
                            <button type="button" onClick={() => setMuatanDiisiLainnya({ checked: false, nilai: "0" })} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${!muatanDiisiLainnya.checked ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' : 'bg-bg-secondary dark:bg-white/10 text-text-muted border border-slate-100 dark:border-white/10'}`}>Tidak</button>
                          </div>
                        </div>
                        {muatanDiisiLainnya.checked && (
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
            }

            {/* SECTION 5: KETERANGAN */}
            <div className="p-8 border border-slate-100 dark:border-white/5 rounded-3xl shadow-sm mb-6">
              <label className="form-label mb-3">Keterangan Tambahan (Opsional)</label>
              <textarea className="form-input" rows={4} placeholder="Masukkan catatan jika ada..." value={keterangan} onChange={e => setKeterangan(e.target.value)} />
            </div>
          </form>
        </div>

        {/* ACTIONS */}
        <div className="p-6 border-t border-slate-100 dark:border-white/5 bg-white dark:bg-bg-card flex justify-end gap-3 shrink-0">
          <button 
            type="button"
            onClick={onClose} 
            className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors text-sm"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-8 py-2.5 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all text-sm shadow-sm"
          >
            {loading ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </div>
    </div>
  );
}
