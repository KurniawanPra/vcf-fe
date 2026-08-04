"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { vcfApi, violationApi } from "@/lib/api";
import { fetchAndCacheMasterData, getCachedMasterData } from "@/lib/masterDataCache";
import { formatTime, formatDate, isValidTime24h, getErrorMessage } from "@/lib/utils";
import { getUser } from "@/lib/auth";
import { generateQRSignature } from "@/lib/qrUtils";
import GuideSection from "@/components/GuideSection";
import ViolationWarningCard, { type ViolationCheckResult } from "@/components/ViolationWarningCard";
import SearchableDropdown from "@/components/SearchableDropdown";
import { useToast, ToastContainer } from "@/components/Toast";
import ValidationSummary, { type ValidationEntry } from "@/components/ValidationSummary";

interface SelectOption { id: number; nama?: string; nama_transporter?: string; nama_supir?: string; nama_item?: string; kode?: string; no_sim?: string; tgl_berlaku_sim?: string; jenis_sim?: string; is_active?: boolean | number | string; }
interface ChecklistItem { id: number; nama_item: string; urutan: number; is_active?: boolean | number | string; }
interface MuatanItem { id: number; nama_item: string; jenis: "both" | "dibawa" | "diisi"; urutan: number; is_active?: boolean | number | string; }

type TipeKegiatan = "loading_lokal" | "loading_export" | "unloading_lokal" | "unloading_import" | "";
type TipeKendaraan = "bak_terbuka" | "tangki" | "umum" | "box" | "container" | "";

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
  const [localToast, setLocalToast] = useState<{
    title: string;
    message: string;
    type: "error" | "warning" | "success";
  } | null>(null);

  const showLocalToast = (title: string, message: string, type: "error" | "warning" | "success" = "error") => {
    setLocalToast({ title, message, type });
  };

  useEffect(() => {
    if (localToast) {
      const timer = setTimeout(() => {
        setLocalToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [localToast]);

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

  // Violation check state
  const [violationData, setViolationData] = useState<ViolationCheckResult>({});
  const [violationLoading, setViolationLoading] = useState(false);
  // Modal konfirmasi pelanggaran
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [violationModalAcknowledged, setViolationModalAcknowledged] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Dispatch modal events for showViolationModal
  useEffect(() => {
    if (showViolationModal) {
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
  }, [showViolationModal]);

  // Form state
  const [tanggal, setTanggal] = useState(formatDate());
  const [jamMasuk, setJamMasuk] = useState(formatTime());
  const [isJamMasukManual, setIsJamMasukManual] = useState(false);
  const [dramaticTime, setDramaticTime] = useState("");
  const [tipeKegiatan, setTipeKegiatan] = useState<TipeKegiatan>("");
  const [produkKode, setProdukKode] = useState<string>("");
  const [produkLainnya, setProdukLainnya] = useState("");
  const [transporterId, setTransporterId] = useState("");
  const [driverId, setDriverId] = useState<string>("");
  const [noPolisi, setNoPolisi] = useState<string>("");
  const [jenisKendaraanId, setJenisKendaraanId] = useState("");
  const [tipeKendaraan, setTipeKendaraan] = useState<TipeKendaraan>("");
  const [tahunKendaraan, setTahunKendaraan] = useState("");
  const [tujuan, setTujuan] = useState("");
  const [keterangan, setKeterangan] = useState("");

  const [checklist, setChecklist] = useState<Record<number, boolean | null>>({});
  const [muatanDibawa, setMuatanDibawa] = useState<Record<number, { checked: boolean; nilai: string }>>({});
  const [muatanDiisi, setMuatanDiisi] = useState<Record<number, { checked: boolean; nilai: string }>>({});
  const [muatanDibawaLainnya, setMuatanDibawaLainnya] = useState({ checked: null as boolean | null, nilai: "" });
  const [muatanDiisiLainnya, setMuatanDiisiLainnya] = useState({ checked: null as boolean | null, nilai: "" });

  // Segel states for Unloading flow (input at registration)
  const [segelTerpasang, setSegelTerpasang] = useState("");
  const [jumlahSegel, setJumlahSegel] = useState("");
  const [nomorSegel, setNomorSegel] = useState<string[]>([""]);

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
      applyMasterData(cached);
      setMasterProgress(100);
      setMasterLoading(false);
      return;
    }

    setMasterLoading(true);
    setMasterProgress(0);
    fetchAndCacheMasterData((pct) => setMasterProgress(pct))
      .then((data) => {
        applyMasterData(data);
      })
      .catch((e) => console.error(e))
      .finally(() => setMasterLoading(false));
  }, []);

  // Realtime clock for Jam Masuk if not manually edited
  useEffect(() => {
    if (!isJamMasukManual) {
      setJamMasuk(formatTime());
      const interval = setInterval(() => {
        setJamMasuk(formatTime());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isJamMasukManual]);

  // Dramatic ticking for seconds and ms
  useEffect(() => {
    if (!isJamMasukManual) {
      const interval = setInterval(() => {
        const now = new Date();
        const ss = String(now.getSeconds()).padStart(2, "0");
        const ms = String(Math.floor(now.getMilliseconds() / 10)).padStart(2, "0");
        setDramaticTime(`:${ss}.${ms}`);
      }, 47);
      return () => clearInterval(interval);
    }
  }, [isJamMasukManual]);


  const runViolationCheck = async (newDriverId?: string, newNoPolisi?: string) => {
    const did = newDriverId !== undefined ? newDriverId : driverId;
    const pol = newNoPolisi !== undefined ? newNoPolisi : noPolisi;
    // Reset ack whenever driver/polisi changes
    setViolationModalAcknowledged(false);
    if (!did && !pol) { setViolationData({}); return; }
    setViolationLoading(true);
    try {
      const params: { driver_id?: string; no_polisi?: string } = {};
      if (did) params.driver_id = did;
      if (pol) params.no_polisi = pol.toUpperCase();
      const res = await violationApi.check(params);
      const data = res.data?.data ?? {};
      setViolationData(data);
      const status = data?.driver?.status;
      if (status === "warning" || status === "blacklist") {
        setShowViolationModal(true);
      }
    } catch {
      setViolationData({});
    } finally {
      setViolationLoading(false);
    }
  };

  useEffect(() => {
    const fetchNext = async () => {
      try {
        const nRes = await vcfApi.getNextNumber({ tanggal });
        setNextNumber(nRes.data.next_number);
      } catch { /* ignore */ }
    };
    fetchNext();
  }, [tanggal]);

  const validateForm = (currentJamMasuk?: string): boolean => {
    const errors: Record<string, boolean> = {};
    const entries: ValidationEntry[] = [];
    let isValid = true;

    const addError = (key: string, section: string, label: string, fieldId: string, toastMessage?: string) => {
      errors[key] = true;
      entries.push({ key, section, label, fieldId });
      isValid = false;
      // Show local bottom toast for the first error
      if (entries.length === 1 && toastMessage) {
        showLocalToast("Peringatan Validasi", toastMessage, "error");
      }
    };
    const jamMasukToCheck = currentJamMasuk ?? jamMasuk;

    // 1. Tipe Kegiatan
    if (!tipeKegiatan) {
      addError("tipeKegiatan", "Informasi Dasar", "Tipe Kegiatan", "field-tipe-kegiatan", "Tipe kegiatan wajib dipilih.");
    }
    // 2. Tanggal
    if (!tanggal) {
      addError("tanggal", "Informasi Dasar", "Tanggal", "field-tanggal", "Tanggal wajib diisi.");
    }
    // 3. Jam Masuk
    if (!jamMasukToCheck || !isValidTime24h(jamMasukToCheck)) {
      addError("jamMasuk", "Informasi Dasar", "Jam Masuk", "field-jam-masuk", "Jam masuk wajib diisi dengan format HH:MM.");
    }
    // 4. Produk
    if (!produkKode) {
      addError("produk", "Informasi Dasar", "Produk", "field-produk", "Produk wajib dipilih.");
    }
    // 5. Produk Lainnya (if OTHERS)
    if (produkKode === "OTHERS" && !produkLainnya.trim()) {
      addError("produkLainnya", "Informasi Dasar", "Detail Produk Lainnya", "field-produk-lainnya", "Detail produk lainnya wajib diisi.");
    }
    // 6. Transporter
    if (!transporterId) {
      addError("transporter", "Informasi Kendaraan", "Transporter", "field-transporter", "Transporter wajib dipilih.");
    }
    // 7. No. Polisi
    if (!noPolisi.trim()) {
      addError("noPolisi", "Informasi Kendaraan", "No. Polisi", "field-no-polisi", "Nomor polisi kendaraan wajib diisi.");
    }
    // 8. Jenis/Tipe Kendaraan
    if (!tipeKendaraan) {
      addError("tipeKendaraan", "Informasi Kendaraan", "Jenis Kendaraan", "field-jenis-kendaraan", "Jenis kendaraan wajib dipilih.");
    }
    // 9. Supir
    if (!driverId) {
      addError("driver", "Informasi Kendaraan", "Supir", "field-driver", "Nama supir wajib dipilih.");
    }
    // 10. Tahun Kendaraan
    if (!tahunKendaraan) {
      addError("tahunKendaraan", "Informasi Kendaraan", "Tahun Kendaraan", "field-tahun-kendaraan", "Tahun kendaraan wajib diisi.");
    } else {
      const year = parseInt(tahunKendaraan, 10);
      if (isNaN(year) || year < 1950 || year > 2100) {
        addError("tahunKendaraan", "Informasi Kendaraan", "Tahun Kendaraan (1950 - 2100)", "field-tahun-kendaraan", "Tahun kendaraan harus antara 1950 sampai 2100.");
      }
    }
    // 11. Asal / Tujuan
    if (!tujuan.trim()) {
      const label = isLoading ? "Tujuan" : "Asal";
      addError("tujuan", "Informasi Kendaraan", label, "field-tujuan", `${label} wajib diisi.`);
    }

    // 12. Checklist kelengkapan supir
    const emptyChecklistItems = checklistItems.filter(item => checklist[item.id] === null);
    if (emptyChecklistItems.length > 0) {
      addError("checklist", "Kelengkapan Supir", `${emptyChecklistItems.length} item belum dijawab`, "field-checklist", "Semua item Pemeriksaan Kelengkapan Supir wajib dijawab.");
    }

    // 13. Muatan (Dibawa / Diisi)
    if (isUnloading) {
      const adaMuatanDibawa = Object.values(muatanDibawa).some(v => v.checked && v.nilai === "1")
        || muatanDibawaLainnya.checked === true;
      if (!adaMuatanDibawa) {
        addError("muatanDibawa", "Jenis & Detail Muatan", "Muatan yang Dibawa (1)", "field-muatan", "Muatan yang Dibawa harus dipilih.");
      } else if (muatanDibawaLainnya.checked === true && !muatanDibawaLainnya.nilai.trim()) {
        addError("muatanDibawaLainnya", "Jenis & Detail Muatan", "Detail Muatan Lainnya", "field-muatan-lainnya", "Detail muatan lainnya wajib diisi.");
      }
    }

    if (isLoading) {
      const adaMuatanDiisi = Object.values(muatanDiisi).some(v => v.checked && v.nilai === "1")
        || muatanDiisiLainnya.checked === true;
      if (!adaMuatanDiisi) {
        addError("muatanDiisi", "Jenis & Detail Muatan", "Muatan yang Akan Diisi (minimal 1)", "field-muatan", "Muatan yang Akan Diisi harus dipilih.");
      } else if (muatanDiisiLainnya.checked === true && !muatanDiisiLainnya.nilai.trim()) {
        addError("muatanDiisiLainnya", "Jenis & Detail Muatan", "Detail Muatan Lainnya", "field-muatan-lainnya", "Detail muatan lainnya wajib diisi.");
      }
    }

    // 14. Nomor Segel
    if (isUnloading) {
      const validSegel = nomorSegel.filter(s => s.trim()).length > 0;
      if (!validSegel) {
        addError("nomorSegel", "Segel Kendaraan", "Nomor Segel (Minimal 1)", "field-segel", "Minimal 1 Nomor Segel Kendaraan harus diisi.");
      }
    }

    setFieldErrors(errors);
    setValidationErrors(entries);

    // Scroll to first invalid field if any
    if (entries.length > 0) {
      const firstErrorFieldId = entries[0].fieldId;
      if (firstErrorFieldId) {
        const el = document.getElementById(firstErrorFieldId) || document.querySelector(`[data-field-id="${firstErrorFieldId}"]`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        (el as HTMLElement)?.focus?.();
      }
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setValidationErrors([]);

    // Auto-set jam masuk to current time on submit
    const currentJamMasuk = isJamMasukManual ? jamMasuk : formatTime();
    setJamMasuk(currentJamMasuk);

    if (!validateForm(currentJamMasuk)) {
      return;
    }

    const kelengkapanSupir = checklistItems
      .filter((item) => checklist[item.id] !== null)
      .map((item) => ({
        item_id: item.id,
        nilai: checklist[item.id],
        keterangan: "-",
      }));

    const produkStr = produkKode === "OTHERS" ? `OTHERS: ${produkLainnya.trim()}` : produkKode;

    const buildMuatanPayload = (src: Record<number, { checked: boolean; nilai: string }>, lainnya: { checked: boolean | null; nilai: string }) => {
      const payload: Array<{ item_muatan_id: number | null; nilai: string; keterangan: string }> = Object.entries(src)
        .filter(([, v]) => v.checked && v.nilai !== "NO")
        .map(([id, v]) => ({
          item_muatan_id: parseInt(id, 10),
          nilai: v.nilai?.trim() ? v.nilai.trim() : "1",
          keterangan: "-",
        }));

      // Add lainnya if checked === true - send without item_muatan_id (null)
      if (lainnya.checked === true && lainnya.nilai?.trim() && lainnya.nilai !== "NO") {
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
        // Segel data for Unloading flow
        segel_terpasang: isUnloading ? true : null,
        jumlah_segel: isUnloading ? (jumlahSegel ? parseInt(jumlahSegel, 10) : nomorSegel.length) : null,
        nomor_segel: isUnloading ? nomorSegel.map((s) => s.trim()).filter(Boolean) : [],
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

  const handleReset = () => {
    setShowResetModal(true);
  };

  const confirmReset = () => {
    setTanggal(formatDate());
    setJamMasuk(formatTime());
    setIsJamMasukManual(false);
    setTipeKegiatan("");
    setProdukKode("");
    setProdukLainnya("");
    setTransporterId("");
    setDriverId("");
    setNoPolisi("");
    setJenisKendaraanId("");
    setTipeKendaraan("");
    setTahunKendaraan("");
    setTujuan("");
    setKeterangan("");
    setSegelTerpasang("");
    setJumlahSegel("");
    setNomorSegel([""]);

    const initialChecklist: Record<number, boolean | null> = {};
    checklistItems.forEach((item) => { initialChecklist[item.id] = null; });
    setChecklist(initialChecklist);

    const initDibawa: Record<number, { checked: boolean; nilai: string }> = {};
    const initDiisi: Record<number, { checked: boolean; nilai: string }> = {};
    muatanItems.forEach((m) => {
      if (m.jenis === "dibawa" || m.jenis === "both") initDibawa[m.id] = { checked: false, nilai: "" };
      if (m.jenis === "diisi" || m.jenis === "both") initDiisi[m.id] = { checked: false, nilai: "" };
    });
    setMuatanDibawa(initDibawa);
    setMuatanDiisi(initDiisi);
    setMuatanDibawaLainnya({ checked: null, nilai: "" });
    setMuatanDiisiLainnya({ checked: null, nilai: "" });

    setFieldErrors({});
    setValidationErrors([]);
    setViolationData({});
    setViolationModalAcknowledged(false);
    setShowResetModal(false);

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const isLoading = tipeKegiatan.startsWith("loading");
  const isUnloading = tipeKegiatan.startsWith("unloading");
  const isDriverBlacklisted = violationData?.driver?.status === "blacklist";

  // Reset segel fields when segel value is not 'Terpasang'
  useEffect(() => {
    if (segelTerpasang !== "Terpasang") {
      setJumlahSegel("");
      setNomorSegel([""]);
    }
  }, [segelTerpasang]);

  const updateSegel = (idx: number, val: string) => {
    setNomorSegel((prev) => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  };

  const addSegelInput = () => {
    setNomorSegel((prev) => {
      const next = [...prev, ""];
      setJumlahSegel(String(next.length));
      return next;
    });
  };

  const removeSegelInput = (idx: number) => {
    setNomorSegel((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((_, i) => i !== idx);
      setJumlahSegel(String(next.length));
      return next;
    });
  };

  const syncJumlahSegel = (val: string) => {
    const n = parseInt(val) || 1;
    setJumlahSegel(val);
    setNomorSegel((prev) => {
      const next = [...prev];
      while (next.length < n) next.push("");
      while (next.length > n) next.pop();
      return next;
    });
  };

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
    <div className="max-w-5xl mx-auto pb-28 md:pb-8 px-4 md:px-0">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="page-title text-xl md:text-3xl mb-1">Registrasi VCF</h1>
          <p className="page-subtitle text-sm md:text-lg">Pendaftaran Kendaraan Masuk (Main Gate)</p>
        </div>
        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${showGuide
            ? "bg-blue-500/10 text-blue-500 border-blue-500/30"
            : "bg-bg-secondary text-text-muted border-border hover:border-blue-500/30"
            }`}
        >
          <span>{showGuide ? "Tutup Panduan" : "Panduan Operasional"}</span>
        </button>
      </div>

      {showGuide && (
        <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
          <GuideSection />
        </div>
      )}

      {/* ValidationSummary and local ToastContainer removed in favor of bottom-centered custom toast */}

      {/* Violation loading spinner */}
      {violationLoading && (
        <div className="flex items-center gap-2 text-xs text-text-muted mb-4 px-1">
          <div className="w-3 h-3 rounded-full border-2 border-current/30 border-t-current animate-spin" />
          Mengecek riwayat pelanggaran...
        </div>
      )}

      {/* Inline badge setelah ack warning */}
      {!violationLoading && violationModalAcknowledged && violationData?.driver?.status === "warning" && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 mb-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-amber-500 shrink-0">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
            ⚠ {violationData.driver?.nama_supir} memiliki riwayat pelanggaran — registrasi dilanjutkan dengan catatan.
          </span>
        </div>
      )}

      {/* Violation modal portal */}
      {mounted && showViolationModal && violationData?.driver && createPortal((() => {
        const d = violationData.driver!;
        const isBlocked = d.status === "blacklist";
        return (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
            <div className={`bg-white dark:bg-bg-card w-full max-w-md rounded-3xl shadow-2xl border-2 overflow-hidden ${isBlocked ? "border-red-500/40" : "border-amber-500/40"
              }`}>
              {/* Top bar */}
              <div className={`h-1.5 w-full ${isBlocked ? "bg-gradient-to-r from-red-500 to-rose-500" : "bg-gradient-to-r from-amber-400 to-orange-400"}`} />
              <div className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isBlocked ? "bg-red-500/15" : "bg-amber-500/15"
                    }`}>
                    {isBlocked ? (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-red-500">
                        <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                      </svg>
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-amber-500">
                        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h3 className={`font-black text-lg ${isBlocked ? "text-red-600 dark:text-red-400" : "text-amber-700 dark:text-amber-400"}`}>
                      {isBlocked ? "⛔ Driver Diblokir" : "⚠ Peringatan Driver"}
                    </h3>
                    <p className="text-sm text-text-muted mt-0.5">
                      {isBlocked
                        ? "Driver ini masuk daftar blacklist. Registrasi VCF tidak dapat dilanjutkan."
                        : "Driver ini memiliki riwayat pelanggaran. Registrasi dapat dilanjutkan."
                      }
                    </p>
                  </div>
                </div>

                {/* Driver info */}
                <div className={`rounded-xl p-3 mb-4 ${isBlocked ? "bg-red-500/5 border border-red-500/15" : "bg-amber-500/5 border border-amber-500/15"}`}>
                  <p className="font-bold text-text-primary">{d.nama_supir}</p>
                  <p className="text-xs text-text-muted font-mono">{d.no_sim}</p>
                </div>

                {/* Violation list */}
                {d.violations?.length > 0 && (
                  <ul className="space-y-1.5 mb-4 max-h-40 overflow-y-auto">
                    {d.violations.map((v: any) => (
                      <li key={v.id} className={`text-xs px-3 py-2 rounded-lg ${isBlocked ? "bg-red-500/10 text-red-700 dark:text-red-400" : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                        }`}>
                        <span className="font-semibold">{v.jenis_pelanggaran}</span>
                        {v.keterangan && <span className="text-text-muted"> — {v.keterangan}</span>}
                        <div className="text-[10px] text-text-muted mt-0.5">{v.tanggal_pelanggaran?.split("T")[0]}</div>
                      </li>
                    ))}
                  </ul>
                )}

                {isBlocked ? (
                  <div className="space-y-2">
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 font-medium">
                      Hubungi administrator untuk membuka status blacklist driver ini.
                    </div>
                    <button
                      className="w-full btn py-3 font-bold rounded-xl bg-slate-100 dark:bg-white/10 text-text-primary hover:bg-slate-200 dark:hover:bg-white/15 transition-all"
                      onClick={() => { setShowViolationModal(false); setDriverId(""); setViolationData({}); }}
                    >
                      Ganti Driver
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-3 mt-2">
                    <button
                      className="flex-1 btn py-3 font-bold rounded-xl bg-slate-100 dark:bg-white/10 text-text-primary hover:bg-slate-200 dark:hover:bg-white/15 transition-all"
                      onClick={() => { setShowViolationModal(false); setDriverId(""); setViolationData({}); }}
                    >
                      Ganti Driver
                    </button>
                    <button
                      className="flex-[2] btn py-3 font-black rounded-xl bg-amber-500 hover:bg-amber-600 text-white transition-all"
                      onClick={() => { setShowViolationModal(false); setViolationModalAcknowledged(true); }}
                    >
                      Lanjutkan Tetap
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })(), document.body)}

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* SECTION 1: DOKUMEN & LOGISTIK */}
        <div className="glass-card p-4 md:p-8 shadow-sm">
          <div className="border-l-4 border-blue-500 pl-4 mb-8">
            <h2 className="text-xl font-bold text-text-primary">Informasi Dasar & Logistik</h2>
            <p className="text-xs text-text-muted mt-1">Pilih tanggal, jam masuk, tipe kegiatan, dan produk yang diangkut.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div>
              <label className="form-label">No. Urut</label>
              <div className="text-2xl font-bold text-blue-600 tracking-wider py-2">
                {nextNumber || "....."}
              </div>
              <p className="text-xs text-slate-400">Otomatis reset bulanan</p>
            </div>
            <div id="field-tanggal">
              <label className="form-label">Tanggal *</label>
              <input
                type="date"
                className={`form-input text-lg ${fieldErrors.tanggal ? '!border-red-500 !bg-red-50 dark:!bg-red-500/10' : ''}`}
                value={tanggal}
                onChange={(e) => {
                  const val = e.target.value;
                  setTanggal(val);
                  setFieldErrors(prev => ({ ...prev, tanggal: !val }));
                }}
                onBlur={(e) => {
                  const val = e.target.value;
                  setFieldErrors(prev => ({ ...prev, tanggal: !val }));
                }}
                required
              />
            </div>
            <div id="field-jam-masuk" data-field-error={fieldErrors.jamMasuk ? "true" : undefined}>
              <label className="form-label">Jam Masuk (WIB) *</label>
              <div className="flex items-center gap-2 w-full">
                <div className="flex items-baseline gap-1 flex-1">
                  <input
                    type="text"
                    className={`form-input w-full text-lg font-mono transition-all duration-300 ${fieldErrors.jamMasuk ? '!bg-red-50 dark:!bg-red-500/10 !border-red-500 shadow-lg shadow-red-500/10' : ''}`}
                    value={jamMasuk}
                    onChange={(e) => {
                      setIsJamMasukManual(true);
                      let v = e.target.value.replace(/[^\d]/g, "");
                      if (v.length > 4) v = v.slice(0, 4);
                      const formatted = v.length > 2 ? v.slice(0, 2) + ":" + v.slice(2) : v;
                      setJamMasuk(formatted);
                      setFieldErrors(prev => ({ ...prev, jamMasuk: !formatted || !isValidTime24h(formatted) }));
                    }}
                    onBlur={(e) => {
                      const val = e.target.value;
                      setFieldErrors(prev => ({ ...prev, jamMasuk: !val || !isValidTime24h(val) }));
                    }}
                    placeholder="HH:MM"
                    maxLength={5}
                  />
                  {!isJamMasukManual && dramaticTime && (
                    <span className="text-sm font-black font-mono text-blue-500/80 tracking-tighter w-12 text-left animate-pulse">
                      {dramaticTime}
                    </span>
                  )}
                </div>
                {isJamMasukManual && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsJamMasukManual(false);
                      setFieldErrors((prev) => ({ ...prev, jamMasuk: false }));
                    }}
                    className="px-2 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded text-[10px] font-bold uppercase hover:bg-blue-500/20 transition-colors"
                  >
                    NOW
                  </button>
                )}
              </div>
              {fieldErrors.jamMasuk && (
                <p className="text-[11px] text-red-500 mt-1">Jam masuk wajib diisi format HH:MM</p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div id="field-tipe-kegiatan">
              <label className="form-label mb-3">Tipe Kegiatan & Logistik *</label>
              <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 rounded-2xl transition-all ${fieldErrors.tipeKegiatan ? 'ring-2 ring-red-500 ring-offset-2 dark:ring-offset-bg-card' : ''}`}>
                {/* Loading */}
                <div
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${isLoading ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/5' : 'border-slate-100 dark:border-white/5 hover:border-slate-200'}`}
                  onClick={() => {
                    const val = tipeKegiatan.startsWith("loading") ? "" : "loading_lokal";
                    setTipeKegiatan(val);
                    setFieldErrors(prev => ({ ...prev, tipeKegiatan: !val }));
                  }}
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
                        <button key={t} type="button" onClick={() => {
                          const val = `loading_${t}` as any;
                          setTipeKegiatan(val);
                          setFieldErrors(prev => ({ ...prev, tipeKegiatan: !val }));
                        }} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase ${tipeKegiatan === `loading_${t}` ? 'bg-blue-500 text-white' : 'bg-white border border-slate-200 text-slate-500'}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Unloading */}
                <div
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${isUnloading ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/5' : 'border-slate-100 dark:border-white/5 hover:border-slate-200'}`}
                  onClick={() => {
                    const val = isUnloading ? "" : "unloading_lokal";
                    setTipeKegiatan(val);
                    setFieldErrors(prev => ({ ...prev, tipeKegiatan: !val }));
                  }}
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
                        <button key={t} type="button" onClick={() => {
                          const val = `unloading_${t}` as any;
                          setTipeKegiatan(val);
                          setFieldErrors(prev => ({ ...prev, tipeKegiatan: !val }));
                        }} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase ${tipeKegiatan === `unloading_${t}` ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-200 text-slate-500'}`}>
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
              <div className={`flex flex-wrap gap-2 p-1.5 rounded-2xl transition-all ${fieldErrors.produk ? 'ring-2 ring-red-500 ring-offset-2 dark:ring-offset-bg-card' : ''}`}>
                {produkOptions.map((p: { kode: string; label: string }) => (
                  <button
                    key={p.kode} type="button"
                    onClick={() => {
                      const val = p.kode;
                      setProdukKode(val);
                      setFieldErrors(prev => ({ ...prev, produk: !val }));
                    }}
                    className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${produkKode === p.kode ? 'bg-blue-500 border-blue-500 text-white shadow-md shadow-blue-200' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'}`}
                  >
                    {p.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const val = "OTHERS";
                    setProdukKode(val);
                    setFieldErrors(prev => ({ ...prev, produk: !val, produkLainnya: !produkLainnya.trim() }));
                  }}
                  className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${produkKode === "OTHERS" ? 'bg-blue-500 border-blue-500 text-white shadow-md shadow-blue-200' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'}`}
                >
                  Lainnya
                </button>
              </div>
              {produkKode === "OTHERS" && (
                <input
                  id="field-produk-lainnya"
                  type="text"
                  className={`form-input mt-3 ${fieldErrors.produkLainnya ? '!border-red-500 !bg-red-50 dark:!bg-red-500/10' : ''}`}
                  placeholder="Sebutkan produk lainnya..."
                  value={produkLainnya}
                  onChange={e => {
                    const val = e.target.value;
                    setProdukLainnya(val);
                    setFieldErrors(prev => ({ ...prev, produkLainnya: !val.trim() }));
                  }}
                  onBlur={e => {
                    const val = e.target.value;
                    setFieldErrors(prev => ({ ...prev, produkLainnya: !val.trim() }));
                  }}
                  required
                />
              )}
            </div>
          </div>


        </div>



        {/* Segel Input - Only for Unloading flow */}
        {isUnloading && (
          <div id="field-segel" className="glass-card p-6 shadow-sm">
            <div className="border-l-4 border-emerald-500 pl-4 mb-6">
              <h2 className="text-lg font-bold text-text-primary">Nomor Segel Kendaraan</h2>
              <p className="text-xs text-text-muted mt-1">Input jumlah dan nomor segel yang terpasang pada kendaraan (Unloading).</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-emerald-400">Jumlah Segel</label>
                <input
                  type="number"
                  className="w-20 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm font-bold text-emerald-400 text-center focus:outline-none focus:border-emerald-500"
                  value={jumlahSegel || String(nomorSegel.length)}
                  onChange={(e) => syncJumlahSegel(e.target.value)}
                  min={1}
                />
              </div>
              <div className="space-y-2">
                {nomorSegel.map((segel, idx) => (
                  <div key={idx} className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        className={`w-full px-4 py-3 bg-emerald-500/5 border rounded-lg text-sm font-medium text-text-primary dark:text-white placeholder-emerald-500/40 focus:outline-none focus:border-emerald-500 transition-colors ${
                          fieldErrors.nomorSegel ? 'border-red-500 bg-red-50 dark:bg-red-500/10' : 'border-emerald-500/10'
                        }`}
                        placeholder={`Segel #${idx + 1}`}
                        value={segel}
                        onChange={(e) => {
                          updateSegel(idx, e.target.value);
                          if (fieldErrors.nomorSegel) {
                            setFieldErrors(prev => ({ ...prev, nomorSegel: false }));
                          }
                        }}
                      />
                      {nomorSegel.length > 1 && (
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
                          onClick={() => removeSegelInput(idx)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="w-full py-3 border-2 border-dashed border-emerald-500/30 rounded-xl text-sm font-bold text-emerald-500 uppercase hover:bg-emerald-500/5 transition-colors flex items-center justify-center gap-2"
                onClick={addSegelInput}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                Tambah Segel
              </button>
            </div>
          </div>
        )}

        {/* SECTION 2: KENDARAAN & SUPIR */}
        {masterLoading ? (
          <SectionSkeleton title="Kendaraan & Personel" />
        ) : (
          <div className="glass-card p-4 md:p-8 shadow-sm">
            <div className="border-l-4 border-amber-500 pl-4 mb-8">
              <h2 className="text-xl font-bold text-text-primary">Kendaraan & Personel</h2>
              <p className="text-xs text-text-muted mt-1">Pilih transporter, nomor polisi, jenis kendaraan, dan nama pengemudi.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div id="field-transporter">
                  <SearchableDropdown
                    label="Nama Transporter"
                    options={transporters}
                    value={transporterId}
                    onChange={(val) => {
                      setTransporterId(val);
                      setFieldErrors(prev => ({ ...prev, transporter: !val }));
                    }}
                    placeholder="Pilih Transporter"
                    required
                    displayField="nama_transporter"
                    hasError={fieldErrors.transporter}
                  />
                </div>
                <div id="field-no-polisi">
                  <label className="form-label">No. Polisi *</label>
                  <input
                    type="text"
                    className={`form-input uppercase ${fieldErrors.noPolisi ? '!border-red-500 !bg-red-50 dark:!bg-red-500/10' : ''}`}
                    placeholder="BK 1234 ABC"
                    value={noPolisi}
                    onChange={e => {
                      const val = e.target.value;
                      setNoPolisi(val);
                      setFieldErrors(prev => ({ ...prev, noPolisi: !val.trim() }));
                    }}
                    onBlur={e => {
                      const val = e.target.value;
                      setFieldErrors(prev => ({ ...prev, noPolisi: !val.trim() }));
                      runViolationCheck(undefined, val);
                    }}
                    required
                  />
                </div>
                <div id="field-jenis-kendaraan">
                  <label className="form-label">Jenis Kendaraan *</label>
                  <select
                    className={`form-select uppercase ${fieldErrors.tipeKendaraan ? '!border-red-500 !bg-red-50 dark:!bg-red-500/10' : ''}`}
                    value={tipeKendaraan}
                    onChange={e => {
                      const val = e.target.value;
                      setTipeKendaraan(val as any);
                      setFieldErrors(prev => ({ ...prev, tipeKendaraan: !val }));
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
                    onBlur={e => {
                      const val = e.target.value;
                      setFieldErrors(prev => ({ ...prev, tipeKendaraan: !val }));
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
                    onChange={(val) => {
                      setDriverId(val);
                      runViolationCheck(val, undefined);
                      setFieldErrors(prev => ({ ...prev, driver: !val }));
                    }}
                    placeholder="Pilih Supir"
                    required
                    displayField="display_name"
                    hasError={fieldErrors.driver}
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
                <label className="form-label">Tahun Kendaraan *</label>
                <input
                  type="number"
                  className={`form-input ${fieldErrors.tahunKendaraan ? '!border-red-500 !bg-red-50 dark:!bg-red-500/10' : ''}`}
                  placeholder="Contoh: 2022"
                  value={tahunKendaraan}
                  onChange={e => {
                    const val = e.target.value;
                    setTahunKendaraan(val);
                    const year = parseInt(val, 10);
                    const isErr = !val || isNaN(year) || year < 1950 || year > 2100;
                    setFieldErrors(prev => ({ ...prev, tahunKendaraan: isErr }));
                  }}
                  onBlur={e => {
                    const val = e.target.value;
                    const year = parseInt(val, 10);
                    const isErr = !val || isNaN(year) || year < 1950 || year > 2100;
                    setFieldErrors(prev => ({ ...prev, tahunKendaraan: isErr }));
                  }}
                />
                {fieldErrors.tahunKendaraan && (
                  <p className="text-[11px] text-red-500 mt-1">Tahun harus antara 1950 sampai 2100</p>
                )}
              </div>
              <div id="field-tujuan">
                <label className="form-label">{isLoading ? "Tujuan *" : "Asal *"}</label>
                <input
                  type="text"
                  className={`form-input ${fieldErrors.tujuan ? '!border-red-500 !bg-red-50 dark:!bg-red-500/10' : ''}`}
                  placeholder={isLoading ? "Masukkan tujuan" : "Masukkan asal"}
                  value={tujuan}
                  onChange={e => {
                    const val = e.target.value;
                    setTujuan(val);
                    setFieldErrors(prev => ({ ...prev, tujuan: !val.trim() }));
                  }}
                  onBlur={e => {
                    const val = e.target.value;
                    setFieldErrors(prev => ({ ...prev, tujuan: !val.trim() }));
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: PEMERIKSAAN KELENGKAPAN */}
        {masterLoading ? (
          <SectionSkeleton title="Pemeriksaan Kelengkapan Supir" />
        ) : (
          <div id="field-checklist" className={`glass-card p-4 md:p-8 shadow-sm border transition-all ${fieldErrors.checklist ? 'ring-2 ring-red-500 ring-offset-2 dark:ring-offset-bg-card' : ''}`}>
            <div className="flex items-center justify-between border-l-4 border-purple-500 pl-4 mb-8">
              <div>
                <h2 className="text-xl font-bold text-text-primary">Pemeriksaan Kelengkapan Supir</h2>
                <p className="text-xs text-text-muted mt-1">Verifikasi kepatuhan dan kelengkapan dokumen serta APD pengemudi.</p>
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
                          onClick={() => {
                            setChecklist((p) => {
                              const next = { ...p, [item.id]: true };
                              const emptyLeft = checklistItems.filter(x => next[x.id] === null);
                              if (emptyLeft.length === 0 && fieldErrors.checklist) {
                                setFieldErrors(prev => ({ ...prev, checklist: false }));
                              }
                              return next;
                            });
                          }}
                          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${val === true ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white/0 border-border text-slate-500 hover:border-emerald-500/50"}`}
                        >
                          Ya
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setChecklist((p) => {
                              const next = { ...p, [item.id]: false };
                              const emptyLeft = checklistItems.filter(x => next[x.id] === null);
                              if (emptyLeft.length === 0 && fieldErrors.checklist) {
                                setFieldErrors(prev => ({ ...prev, checklist: false }));
                              }
                              return next;
                            });
                          }}
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
          <div id="field-muatan" className={`glass-card p-4 md:p-8 shadow-sm border transition-all ${fieldErrors.muatanDibawa || fieldErrors.muatanDiisi ? 'ring-2 ring-red-500 ring-offset-2 dark:ring-offset-bg-card' : ''}`}>
            <div className="border-l-4 border-emerald-500 pl-4 mb-8">
              <h2 className="text-xl font-bold text-text-primary">Jenis & Detail Muatan</h2>
              <p className="text-xs text-text-muted mt-1">Pilih item muatan yang dibawa masuk atau diisi ke dalam kendaraan.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* Muatan Dibawa - Only shown for UNLOADING */}
              {isUnloading && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Muatan yang Dibawa *</h3>
                  <div className="space-y-3">
                    {muatanItems.filter(m => m.jenis === 'dibawa' || m.jenis === 'both').map(m => {
                      const isYes = muatanDibawa[m.id]?.nilai === "1";
                      const isNo = muatanDibawa[m.id]?.nilai === "NO";
                      return (
                        <div key={m.id} className={`p-4 rounded-xl border transition-all ${isYes ? 'border-emerald-500/30 bg-emerald-500/5' : isNo ? 'border-rose-500/20 bg-rose-500/5' : 'border-slate-100 dark:border-white/5 bg-slate-50/30 dark:bg-white/5'}`}>
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-bold text-text-primary dark:text-slate-300 text-sm flex-1 min-w-0">{m.nama_item}</span>
                            <div className="flex gap-2 shrink-0">
                              <button type="button" onClick={() => {
                                const reset: Record<number, { checked: boolean; nilai: string }> = {};
                                muatanItems.filter(x => x.jenis === 'dibawa' || x.jenis === 'both').forEach(x => {
                                  reset[x.id] = { checked: true, nilai: "NO" };
                                });
                                reset[m.id] = { checked: true, nilai: "1" };
                                setMuatanDibawa(reset);
                                setMuatanDibawaLainnya({ checked: false, nilai: "" });
                                if (fieldErrors.muatanDibawa) {
                                  setFieldErrors(prev => ({ ...prev, muatanDibawa: false }));
                                }
                              }} className={`min-w-[52px] min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold transition-all border ${isYes ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:border-emerald-400'}`}>Ya</button>
                              <button type="button" onClick={() => {
                                setMuatanDibawa(p => {
                                  const next = { ...p, [m.id]: { checked: true, nilai: "NO" } };
                                  const hasYes = Object.values(next).some(v => v.checked && v.nilai === "1") || muatanDibawaLainnya.checked === true;
                                  if (hasYes && fieldErrors.muatanDibawa) {
                                    setFieldErrors(prev => ({ ...prev, muatanDibawa: false }));
                                  }
                                  return next;
                                });
                              }} className={`min-w-[52px] min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold transition-all border ${isNo ? 'bg-rose-500 border-rose-500 text-white shadow-sm' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:border-rose-400'}`}>Tidak</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {showProdukLainnya && (
                      <div className={`p-4 rounded-xl border border-dashed transition-all ${muatanDibawaLainnya.checked === true ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-200 dark:border-white/10 bg-slate-50/10'}`}>
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-bold text-text-muted text-sm italic">Lainnya</span>
                          <div className="flex gap-2 shrink-0">
                            <button type="button" onClick={() => {
                              const reset: Record<number, { checked: boolean; nilai: string }> = {};
                              muatanItems.filter(x => x.jenis === 'dibawa' || x.jenis === 'both').forEach(x => {
                                reset[x.id] = { checked: true, nilai: "NO" };
                              });
                              setMuatanDibawa(reset);
                              setMuatanDibawaLainnya({ checked: true, nilai: "" });
                              if (fieldErrors.muatanDibawa) {
                                setFieldErrors(prev => ({ ...prev, muatanDibawa: false }));
                              }
                            }} className={`min-w-[52px] min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold transition-all border ${muatanDibawaLainnya.checked === true ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:border-emerald-400'}`}>Ya</button>
                            <button type="button" onClick={() => {
                              setMuatanDibawaLainnya({ checked: false, nilai: "" });
                              const hasYes = Object.values(muatanDibawa).some(v => v.checked && v.nilai === "1");
                              if (hasYes && fieldErrors.muatanDibawa) {
                                setFieldErrors(prev => ({ ...prev, muatanDibawa: false }));
                              }
                              if (fieldErrors.muatanDibawaLainnya) {
                                setFieldErrors(prev => ({ ...prev, muatanDibawaLainnya: false }));
                              }
                            }} className={`min-w-[52px] min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold transition-all border ${muatanDibawaLainnya.checked === false ? 'bg-rose-500 border-rose-500 text-white shadow-sm' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:border-rose-400'}`}>Tidak</button>
                          </div>
                        </div>
                        {muatanDibawaLainnya.checked === true && (
                          <div className="mt-3">
                            <input
                              id="field-muatan-lainnya"
                              type="text"
                              className={`form-input ${fieldErrors.muatanDibawaLainnya ? 'border-red-500 bg-red-50 dark:bg-red-500/10' : ''}`}
                              placeholder="Sebutkan muatan lainnya..."
                              value={muatanDibawaLainnya.nilai}
                              onChange={(e) => {
                                setMuatanDibawaLainnya({ checked: true, nilai: e.target.value });
                                if (fieldErrors.muatanDibawaLainnya) {
                                  setFieldErrors(prev => ({ ...prev, muatanDibawaLainnya: false }));
                                }
                              }}
                            />
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
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Muatan yang Akan Diisi *</h3>
                  <div className="space-y-3">
                    {muatanItems.filter(m => m.jenis === 'diisi' || m.jenis === 'both').map(m => {
                      const isYes = muatanDiisi[m.id]?.nilai === "1";
                      const isNo = muatanDiisi[m.id]?.nilai === "NO";
                      return (
                        <div key={m.id} className={`p-4 rounded-xl border transition-all ${isYes ? 'border-emerald-500/30 bg-emerald-500/5' : isNo ? 'border-rose-500/20 bg-rose-500/5' : 'border-slate-100 dark:border-white/5 bg-slate-50/30 dark:bg-white/5'}`}>
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-bold text-text-primary dark:text-slate-300 text-sm flex-1 min-w-0">{m.nama_item}</span>
                            <div className="flex gap-2 shrink-0">
                              <button type="button" onClick={() => {
                                const reset: Record<number, { checked: boolean; nilai: string }> = {};
                                muatanItems.filter(x => x.jenis === 'diisi' || x.jenis === 'both').forEach(x => {
                                  reset[x.id] = { checked: true, nilai: "NO" };
                                });
                                reset[m.id] = { checked: true, nilai: "1" };
                                setMuatanDiisi(reset);
                                setMuatanDiisiLainnya({ checked: false, nilai: "" });
                                if (fieldErrors.muatanDiisi) {
                                  setFieldErrors(prev => ({ ...prev, muatanDiisi: false }));
                                }
                              }} className={`min-w-[52px] min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold transition-all border ${isYes ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:border-emerald-400'}`}>Ya</button>
                              <button type="button" onClick={() => {
                                setMuatanDiisi(p => {
                                  const next = { ...p, [m.id]: { checked: true, nilai: "NO" } };
                                  const hasYes = Object.values(next).some(v => v.checked && v.nilai === "1") || muatanDiisiLainnya.checked === true;
                                  if (hasYes && fieldErrors.muatanDiisi) {
                                    setFieldErrors(prev => ({ ...prev, muatanDiisi: false }));
                                  }
                                  return next;
                                });
                              }} className={`min-w-[52px] min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold transition-all border ${isNo ? 'bg-rose-500 border-rose-500 text-white shadow-sm' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:border-rose-400'}`}>Tidak</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {/* Lainnya hardcoded — no master data needed */}
                    <div className={`p-4 rounded-xl border border-dashed transition-all ${muatanDiisiLainnya.checked === true ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-200 dark:border-white/10 bg-slate-50/10'}`}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-bold text-text-muted text-sm italic">Lainnya</span>
                        <div className="flex gap-2 shrink-0">
                          <button type="button" onClick={() => {
                            const reset: Record<number, { checked: boolean; nilai: string }> = {};
                            muatanItems.filter(x => x.jenis === 'diisi' || x.jenis === 'both').forEach(x => {
                              reset[x.id] = { checked: true, nilai: "NO" };
                            });
                            setMuatanDiisi(reset);
                            setMuatanDiisiLainnya({ checked: true, nilai: "" });
                            if (fieldErrors.muatanDiisi) {
                              setFieldErrors(prev => ({ ...prev, muatanDiisi: false }));
                            }
                          }} className={`min-w-[52px] min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold transition-all border ${muatanDiisiLainnya.checked === true ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:border-emerald-400'}`}>Ya</button>
                          <button type="button" onClick={() => {
                            setMuatanDiisiLainnya({ checked: false, nilai: "" });
                            const hasYes = Object.values(muatanDiisi).some(v => v.checked && v.nilai === "1");
                            if (hasYes && fieldErrors.muatanDiisi) {
                              setFieldErrors(prev => ({ ...prev, muatanDiisi: false }));
                            }
                            if (fieldErrors.muatanDiisiLainnya) {
                              setFieldErrors(prev => ({ ...prev, muatanDiisiLainnya: false }));
                            }
                          }} className={`min-w-[52px] min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold transition-all border ${muatanDiisiLainnya.checked === false ? 'bg-rose-500 border-rose-500 text-white shadow-sm' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:border-rose-400'}`}>Tidak</button>
                        </div>
                      </div>
                      {muatanDiisiLainnya.checked === true && (
                        <div className="mt-3">
                          <input
                            id="field-muatan-lainnya"
                            type="text"
                            className={`form-input ${fieldErrors.muatanDiisiLainnya ? 'border-red-500 bg-red-50 dark:bg-red-500/10' : ''}`}
                            placeholder="Sebutkan muatan lainnya..."
                            value={muatanDiisiLainnya.nilai}
                            onChange={(e) => {
                              setMuatanDiisiLainnya({ checked: true, nilai: e.target.value });
                              if (fieldErrors.muatanDiisiLainnya) {
                                setFieldErrors(prev => ({ ...prev, muatanDiisiLainnya: false }));
                              }
                            }}
                          />
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
        <div className="glass-card p-4 md:p-8 shadow-sm">
          <div className="border-l-4 border-slate-500 pl-4 mb-8">
            <h2 className="text-xl font-bold text-text-primary">Keterangan Tambahan</h2>
            <p className="text-xs text-text-muted mt-1">Catatan tambahan opsional terkait kendaraan atau pengemudi.</p>
          </div>
          <textarea className="form-input" rows={4} placeholder="Masukkan catatan jika ada..." value={keterangan} onChange={e => setKeterangan(e.target.value)} />
        </div>

        {/* ACTIONS — sticky bottom bar on mobile */}
        <div className="fixed bottom-0 left-0 right-0 md:static z-40 bg-bg-card/95 backdrop-blur-lg md:bg-transparent border-t border-border md:border-0 px-4 py-3 md:p-0 md:pt-4">
          <div className="flex items-center justify-end gap-3 max-w-5xl mx-auto">
            <button type="button" onClick={handleReset} className="btn btn-secondary px-6 md:px-8 py-3 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border-rose-500/30">Reset</button>
            <button type="button" onClick={() => router.back()} className="btn btn-secondary px-6 md:px-8 py-3">Batal</button>
            {isDriverBlacklisted ? (
              <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/30">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-red-500 shrink-0">
                  <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                </svg>
                <span className="text-xs md:text-sm font-bold text-red-600 dark:text-red-400">Driver blacklist</span>
              </div>
            ) : (
              <button type="submit" disabled={loading} className="btn btn-primary flex-1 md:flex-none px-8 md:px-12 py-3 md:py-4 text-sm md:text-lg">
                {loading ? <><span className="spinner" /> Menyimpan...</> : "Simpan & Daftarkan VCF"}
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Reset Confirmation Modal */}
      {mounted && showResetModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowResetModal(false)}>
          <div className="bg-white dark:bg-bg-card w-full max-w-sm rounded-3xl shadow-2xl border border-white/10 overflow-hidden animate-slideUp" onClick={e => e.stopPropagation()}>
            <div className="h-1 w-full bg-gradient-to-r from-rose-500 to-red-500" />
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-4">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-rose-500">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
                </svg>
              </div>
              <h3 className="font-bold text-text-primary text-lg mb-2">Reset Form?</h3>
              <p className="text-sm text-text-muted mb-6">
                Semua data yang sudah Anda isi pada form ini akan dikosongkan. Tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="flex gap-3">
                <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowResetModal(false)}>Batal</button>
                <button type="button" className="btn bg-rose-500 hover:bg-rose-600 text-white flex-[2] font-bold" onClick={confirmReset}>Ya, Reset Form</button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Validation Toast Portal (Sticky Top-Right) */}
      {mounted && localToast && (
        createPortal(
          <div className="fixed top-6 right-6 z-[99999] w-full max-w-sm px-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <div 
              className="bg-white dark:bg-bg-card rounded-2xl shadow-2xl flex overflow-hidden"
              style={{
                border: `1.5px solid var(--color-${localToast.type === "error" ? "danger" : localToast.type === "warning" ? "warning" : "success"})`
              }}
            >
              <div className={`w-12 flex items-center justify-center shrink-0 ${
                localToast.type === "error" ? "bg-red-500" : localToast.type === "warning" ? "bg-amber-500" : "bg-emerald-500"
              }`}>
                {localToast.type === "error" && (
                  <svg className="w-5 h-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
                {localToast.type === "warning" && (
                  <svg className="w-5 h-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
                {localToast.type === "success" && (
                  <svg className="w-5 h-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="flex-1 p-4 pr-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-text-primary">{localToast.title}</h4>
                    <p className="text-xs text-text-muted mt-1">{localToast.message}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLocalToast(null)}
                    className="text-text-muted hover:text-text-primary p-1 ml-2"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      )}
    </div>
  );
}
