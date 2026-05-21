"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { vcfApi, masterApi, violationApi, timbanganApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import { useToast, ToastContainer } from "@/components/Toast";
import { VCF_STATUS } from "@/constants/vcfStatus";
import { createPortal } from "react-dom";
import ViolationWarningCard, { type ViolationCheckResult } from "@/components/ViolationWarningCard";


interface CheckItem {
  id: number;
  nama_item: string;
  tipe_jawaban: string;
  pilihan_jawaban?: string;
  kode?: string;
}
interface Props { vcfId: number; canEdit: boolean; canFill?: boolean; vcfData: any; onSuccess: () => void; }

export default function Bagian3Form({ vcfId, canEdit, canFill, vcfData, onSuccess }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toasts, removeToast, toast } = useToast();
  const [fieldErrors, setFieldErrors] = useState<Record<number, boolean>>({});
  const [pemeriksaanItems, setPemeriksaanItems] = useState<CheckItem[]>([]);
  const [pemeriksaan, setPemeriksaan] = useState<Record<number, string>>({});
  
  // States for detail fields
  const [jenisBeban, setJenisBeban] = useState("");
  const [jumlahSegel, setJumlahSegel] = useState("");
  const [nomorSegel, setNomorSegel] = useState<string[]>([""]);
  const [keteranganUmum, setKeteranganUmum] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [scaleWeight, setScaleWeight] = useState("");

  const activityType = vcfData?.tipe_kegiatan || "";
  const isLoading = activityType.startsWith("loading");
  const isUnloading = activityType.startsWith("unloading");
  const existingWeight = isLoading ? vcfData?.timbangan?.bruto : vcfData?.timbangan?.tara;
  const hasExistingWeight = existingWeight !== null && existingWeight !== undefined;
  const masukWeight = isLoading ? vcfData?.timbangan?.tara : vcfData?.timbangan?.bruto;

  // Dispatch modal events for isEditing
  useEffect(() => {
    if (isEditing) {
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
  }, [isEditing]);

  // Reject Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectType, setRejectType] = useState<"warning" | "blacklist" | "reject_only">("reject_only");
  const [showSuccess, setShowSuccess] = useState(false);

  // Dispatch modal events for showRejectModal
  useEffect(() => {
    if (showRejectModal) {
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
  }, [showRejectModal]);

  // Dispatch modal events for showSuccess
  useEffect(() => {
    if (showSuccess) {
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
  }, [showSuccess]);

  const [dataLoading, setDataLoading] = useState(true);
  const [violationData, setViolationData] = useState<ViolationCheckResult>({});

  useEffect(() => {
    if (vcfData?.driver_id) {
      violationApi.check({ driver_id: vcfData.driver_id })
        .then(res => setViolationData(res.data?.data ?? {}))
        .catch(() => {});
    }
  }, [vcfData?.driver_id]);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setDataLoading(true);
        const res = await masterApi.getItemPemeriksaanKeluar();
        const items = (res.data.data || res.data).filter(
          (i: CheckItem & { is_active?: boolean }) => i.is_active !== false
        );
        setPemeriksaanItems(items);
        
        // Initial state
        const initial: Record<number, string> = {};
        items.forEach((i: CheckItem) => { initial[i.id] = ""; });
        setPemeriksaan(initial);

        // Map existing data if it exists
        if (vcfData && (vcfData.pemeriksaan_keluar?.length > 0 || vcfData.status === VCF_STATUS.BAGIAN3_SELESAI || vcfData.status === 'weighbridge_keluar' || vcfData.status === 'selesai')) {
          mapExistingData(items, vcfData);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setTimeout(() => setDataLoading(false), 500);
      }
    };
    fetchItems();
  }, [vcfId]);

  const mapExistingData = (items: CheckItem[], data: any) => {
    // 1. Map existing pemeriksaan data
    if (data.pemeriksaan_keluar) {
      const initial: Record<number, string> = {};
      items.forEach(i => { initial[i.id] = ""; });
      
      data.pemeriksaan_keluar.forEach((pk: any) => {
        const val = pk.nilai?.toString().trim() || "";
        const itemId = Number(pk.item_id);
        if (!isNaN(itemId)) {
          initial[itemId] = val;
        }
      });
      setPemeriksaan(initial);
    }

    // 2. Map beban tambahan detail
    if (data.beban_tambahan_keluar) {
      setJenisBeban(data.beban_tambahan_keluar.jenis_beban || "");
    }

    // 3. Map segel detail
    if (data.segel_keluar) {
      setJumlahSegel(data.segel_keluar.jumlah_segel?.toString() || "");
      if (data.segel_keluar.nomor_segel) {
        // Handle both object array and string (some APIs might return different formats)
        if (typeof data.segel_keluar.nomor_segel === 'string') {
          setNomorSegel(data.segel_keluar.nomor_segel.split(",").map((s: string) => s.trim()));
        } else if (Array.isArray(data.segel_keluar.nomor_segel)) {
          setNomorSegel(data.segel_keluar.nomor_segel.map((s: any) => s.nomor_segel || s));
        }
      }
    }

    // 4. Map Keterangan Umum
    setKeteranganUmum(data.segel_keluar?.keterangan || data.vcf_bagian3?.keterangan || "");
  };


  const validateForm = (): { valid: boolean; message?: string } => {
    const errors: Record<number, boolean> = {};
    let hasError = false;

    // Validasi setiap item pemeriksaan harus diisi
    pemeriksaanItems.forEach((item) => {
      const value = pemeriksaan[item.id];
      if (!value || value.trim() === "" || value === "—") {
        errors[item.id] = true;
        hasError = true;
      }
    });

    const btkItem = pemeriksaanItems.find(i => i.kode === "BTK");
    const sgkItem = pemeriksaanItems.find(i => i.kode === "SGK");

    // Validasi beban tambahan - jika "Ada" harus isi jenis beban
    if (btkItem && pemeriksaan[btkItem.id] === "Ada" && !jenisBeban.trim()) {
      errors[btkItem.id] = true;
      hasError = true;
      setFieldErrors(errors);
      return { valid: false, message: "Jenis beban tambahan wajib diisi jika memilih 'Ada'." };
    }

    // Validasi segel - jika "Terpasang" harus isi nomor segel
    if (sgkItem && pemeriksaan[sgkItem.id] === "Terpasang") {
      const validSegel = nomorSegel.filter(s => s.trim()).length > 0;
      if (!validSegel) {
        errors[sgkItem.id] = true;
        hasError = true;
        setFieldErrors(errors);
        return { valid: false, message: "Nomor segel wajib diisi jika memilih 'Terpasang'." };
      }
    }

    setFieldErrors(errors);
    return { valid: !hasError, message: hasError ? "Harap lengkapi semua pemeriksaan yang belum diisi." : undefined };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Validasi client-side sebelum submit
    const validation = validateForm();
    if (!validation.valid) {
      toast.error("Validasi Gagal", validation.message || "Harap lengkapi semua pemeriksaan yang belum diisi.");
      const firstErrorEl = document.querySelector('[data-error="true"]');
      firstErrorEl?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (!hasExistingWeight && !isEditing) {
      if (!scaleWeight || isNaN(parseFloat(scaleWeight)) || parseFloat(scaleWeight) <= 0) {
        toast.error("Validasi Gagal", `Berat ${isLoading ? 'Bruto' : 'Tarra'} wajib diisi dengan angka positif.`);
        return;
      }
      const weightNum = parseFloat(scaleWeight);
      const masukWeightNum = parseFloat(masukWeight);
      if (!isNaN(masukWeightNum)) {
        if (isLoading) {
          if (weightNum <= masukWeightNum) {
            toast.error("Validasi Gagal", `Berat Bruto keluar (${weightNum} kg) harus lebih besar dari berat Tarra masuk (${masukWeightNum} kg).`);
            return;
          }
        } else {
          if (weightNum >= masukWeightNum) {
            toast.error("Validasi Gagal", `Berat Tarra keluar (${weightNum} kg) harus lebih kecil dari berat Bruto masuk (${masukWeightNum} kg).`);
            return;
          }
        }
      }
    }

    setLoading(true);
    try {
      if (!hasExistingWeight && !isEditing) {
        const weightNum = parseFloat(scaleWeight);
        if (isLoading) {
          await timbanganApi.updateBruto(vcfId, weightNum);
        } else {
          await timbanganApi.updateTara(vcfId, weightNum);
        }
      }

      const pemItems = pemeriksaanItems.map((item) => ({
        item_id: item.id,
        nilai: pemeriksaan[item.id],
        keterangan: null,
      }));

      const btkItem = pemeriksaanItems.find(i => i.kode === "BTK");
      const sgkItem = pemeriksaanItems.find(i => i.kode === "SGK");

      const payload = {
        pemeriksaan: pemItems,
        beban_tambahan_ada: btkItem ? pemeriksaan[btkItem.id] === "Ada" : false,
        jenis_beban: jenisBeban || null,
        segel_terpasang: sgkItem ? pemeriksaan[sgkItem.id] === "Terpasang" : false,
        jumlah_segel: (sgkItem && pemeriksaan[sgkItem.id] === "Terpasang") ? (jumlahSegel ? parseInt(jumlahSegel) : nomorSegel.length) : null,
        nomor_segel: (sgkItem && pemeriksaan[sgkItem.id] === "Terpasang") ? nomorSegel.filter(Boolean) : [],
        keterangan: keteranganUmum || null,
      };

      if (isEditing) {
        await vcfApi.updateBagian3(vcfId, payload);
        setShowSuccess(true);
        toast.success("Berhasil", "Perubahan berhasil disimpan.");
        setTimeout(() => {
          setIsEditing(false);
          setShowSuccess(false);
          onSuccess();
        }, 1500);
      } else {
        await vcfApi.createBagian3(vcfId, payload);
        setShowSuccess(true);
        toast.success("Berhasil", "Pemeriksaan keluar berhasil disimpan.");
        setTimeout(() => {
          setShowSuccess(false);
          router.push("/vcf");
        }, 1500);
      }
    } catch (err: unknown) {
      toast.error("Gagal", getErrorMessage(err, "Gagal menyimpan Bagian 3."));
      setError(getErrorMessage(err, "Gagal menyimpan Bagian 3."));
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setError("");
    setLoading(true);
    try {
      // Catat pelanggaran hanya jika bukan reject_only
      if (rejectType !== "reject_only" && vcfData?.driver_id) {
        await violationApi.create({
          driver_id: vcfData.driver_id,
          no_polisi: vcfData.no_polisi ?? null,
          jenis_pelanggaran: rejectType === "blacklist" ? "[BLACKLIST] Ditolak WB Keluar" : "[WARNING] WB Keluar",
          keterangan: rejectReason,
          tanggal_pelanggaran: new Date().toISOString().split("T")[0],
        });
        if (rejectType === "blacklist") {
          await violationApi.updateDriverStatus(vcfData.driver_id, "blacklist");
        } else {
          await violationApi.updateDriverStatus(vcfData.driver_id, "warning");
        }
      }

      // Jika hanya warning, jangan tolak VCF - biarkan lanjut
      if (rejectType === "warning") {
        setShowRejectModal(false);
        toast.success("Warning Tercatat", "Pelanggaran driver dicatat. VCF dapat dilanjutkan.");
        // Refresh violation data to show updated status
        if (vcfData?.driver_id) {
          violationApi.check({ driver_id: vcfData.driver_id })
            .then(res => setViolationData(res.data?.data ?? {}))
            .catch(() => {});
        }
        setTimeout(() => {
          setLoading(false);
        }, 500);
        return;
      }

      await vcfApi.rejectBagian3(vcfId, { catatan_reject: rejectReason });
      setShowRejectModal(false);
      toast.success("VCF Ditolak",
        rejectType === "blacklist" ? "Driver diblokir dan VCF ditolak."
        : "VCF berhasil ditolak."
      );
      setTimeout(() => {
        router.push(`/vcf/${vcfId}`);
        onSuccess();
      }, 1000);
    } catch (err: unknown) {
      toast.error("Gagal", getErrorMessage(err, "Gagal reject VCF."));
      setError(getErrorMessage(err, "Gagal reject VCF."));
    } finally {
      setLoading(false);
    }
  };

  // Show read-only view if data exists and not currently editing
  const hasExistingData = vcfData.pemeriksaan_keluar && vcfData.pemeriksaan_keluar.length > 0;
  const readOnlyView = hasExistingData ? (
      <div className="space-y-6">
        {vcfData.status === "reject" && (
          <div className="p-5 rounded-2xl border-2 animate-pulse" style={{ background: "rgba(239,68,68,0.05)", borderColor: "rgba(239,68,68,0.2)" }}>
            <div className="flex items-center gap-3 mb-2 text-red-400 font-bold">
              VCF Ditolak di Tahap Ini
            </div>
            <p className="text-sm pl-11" style={{ color: "#fca5a5" }}>
              Alasan: {vcfData.catatan || "Tidak ada alasan penolakan yang dicatat."}
            </p>
          </div>
        )}

        <div className="p-6 border border-slate-100 dark:border-white/5 rounded-3xl shadow-sm bg-white dark:bg-bg-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-slate-50/50 dark:bg-white/5 flex justify-between items-center">
            <h3 className="font-bold text-text-primary dark:text-white uppercase tracking-wider text-sm">Hasil Pemeriksaan Weighbridge Keluar</h3>
            {/* Only admin can edit existing data */}
            {canEdit && (
              <button
                onClick={() => setIsEditing(true)}
                className="btn btn-secondary btn-sm flex items-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                EDIT
              </button>
            )}
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vcfData.pemeriksaan_keluar?.map((pk: any) => (
                <div key={pk.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-text-muted tracking-widest mb-1">{pk.item?.nama_item}</p>
                    <p className="font-bold text-text-primary dark:text-slate-200">{pk.nilai}</p>
                  </div>
                  {(pk.nilai === 'Rusak' || pk.nilai === 'Tidak' || pk.nilai === 'Tidak Ada' || pk.nilai === 'Sisa' || pk.nilai === 'Tidak Terpasang') ? (
                    <div className="text-[10px] font-black text-red-500 bg-red-500/10 px-2 py-1 rounded uppercase">{pk.nilai}</div>
                  ) : (
                    <div className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded uppercase">{pk.nilai}</div>
                  )}
                </div>
              ))}
            </div>

            {(vcfData.beban_tambahan_keluar || vcfData.segel_keluar) && (
              <div className="mt-6 pt-6 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-6">
                {vcfData.beban_tambahan_keluar && (
                  <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                    <p className="form-label text-blue-400">Beban Tambahan</p>
                    <p className="text-sm font-bold text-blue-500">{vcfData.beban_tambahan_keluar.jenis_beban}</p>
                  </div>
                )}
                {vcfData.segel_keluar && (
                  <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                    <p className="form-label text-emerald-700">Segel ({vcfData.segel_keluar.jumlah_segel} Unit)</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {vcfData.segel_keluar.nomor_segel?.map((s: any, i: number) => (
                      <span key={i} className="px-2 py-1 bg-emerald-500/10 rounded text-[13px] font-mono text-emerald-700">
                          {s.nomor_segel}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Timbangan Weighbridge Keluar Result */}
            <div className="mt-6 pt-6 border-t border-border space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">Hasil Timbangan Kendaraan</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Berat Masuk */}
                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                  <p className="form-label text-blue-500 font-bold mb-1">Berat Masuk ({isLoading ? "Tarra" : "Bruto"})</p>
                  <span className="px-2.5 py-1 bg-blue-500/10 rounded-lg text-lg font-mono text-blue-600 dark:text-blue-400 font-bold">
                    {isLoading 
                      ? (vcfData?.timbangan?.tara ? `${vcfData.timbangan.tara} kg` : "—") 
                      : (vcfData?.timbangan?.bruto ? `${vcfData.timbangan.bruto} kg` : "—")}
                  </span>
                </div>

                {/* Berat Keluar */}
                <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10">
                  <p className="form-label text-purple-500 font-bold mb-1">Berat Keluar ({isLoading ? "Bruto" : "Tarra"})</p>
                  <span className="px-2.5 py-1 bg-purple-500/10 rounded-lg text-lg font-mono text-purple-600 dark:text-purple-400 font-bold">
                    {isLoading 
                      ? (vcfData?.timbangan?.bruto ? `${vcfData.timbangan.bruto} kg` : "—") 
                      : (vcfData?.timbangan?.tara ? `${vcfData.timbangan.tara} kg` : "—")}
                  </span>
                </div>

                {/* Netto */}
                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                  <p className="form-label text-emerald-500 font-bold mb-1">Berat Bersih (Netto)</p>
                  <span className="px-2.5 py-1 bg-emerald-500/10 rounded-lg text-lg font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    {vcfData?.timbangan?.netto ? `${vcfData.timbangan.netto} kg` : "—"}
                  </span>
                  <span className="text-[10px] text-emerald-500/60 uppercase block mt-1">Formula: Bruto - Tarra</span>
                </div>
              </div>

              {/* Rujukan Timbangan Asal */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                <p className="form-label text-text-muted font-bold mb-2">Rujukan Timbangan Asal (Pendaftaran)</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-text-muted">Bruto Asal:</span>
                    <p className="font-bold text-text-primary text-base mt-0.5">{vcfData?.timbangan?.bruto_from ? `${vcfData.timbangan.bruto_from} kg` : "—"}</p>
                  </div>
                  <div>
                    <span className="text-xs text-text-muted">Tarra Asal:</span>
                    <p className="font-bold text-text-primary text-base mt-0.5">{vcfData?.timbangan?.tara_from ? `${vcfData.timbangan.tara_from} kg` : "—"}</p>
                  </div>
                </div>
              </div>
            </div>

            {vcfData.segel_keluar && (
              <div className="mt-6 pt-6 border-t border-border">
                <div className="p-4 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <p className="form-label text-text-muted">Keterangan</p>
                  <p className="text-sm text-text-primary dark:text-slate-200">{vcfData.segel_keluar?.keterangan || vcfData.vcf_bagian3?.keterangan || "Tidak ada keterangan"}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    ) : null;

  const formView = (
    <div className="max-w-4xl mx-auto space-y-6">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <ViolationWarningCard data={violationData} />

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* WEIGHING SCALE INPUT */}
        {!hasExistingWeight && (
          <div className="glass-card p-6 shadow-sm border border-blue-500/20 bg-blue-50/5 dark:bg-blue-500/[0.02]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-text-primary">Timbangan Weighbridge Keluar</h3>
                <p className="text-xs text-text-muted">Input berat kendaraan saat keluar & kalkulasi netto</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* WB Masuk Weight (ReadOnly Reference) */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex flex-col justify-center">
                <span className="text-xs text-text-muted font-bold uppercase tracking-wider mb-1">
                  Berat WB Masuk ({isLoading ? "Tarra" : "Bruto"})
                </span>
                <p className="text-2xl font-black font-mono text-text-primary">
                  {masukWeight ? `${masukWeight} kg` : "—"}
                </p>
              </div>

              {/* WB Keluar Weight Input */}
              <div>
                <label className="form-label font-bold text-blue-600">
                  {isLoading ? "Berat Bruto Keluar (kg) *" : "Berat Tarra Keluar (kg) *"}
                </label>
                <input
                  type="number"
                  step="any"
                  className="form-input text-lg font-mono"
                  placeholder={`Masukkan berat ${isLoading ? 'bruto' : 'tara'}...`}
                  value={scaleWeight}
                  onChange={(e) => setScaleWeight(e.target.value)}
                  required
                />
                <p className="text-xs text-text-muted mt-1">
                  Proses: <span className="font-bold uppercase text-blue-500">{isLoading ? "Loading (Keluar = Bruto)" : "Unloading (Keluar = Tara)"}</span>
                </p>
              </div>

              {/* Real-time Netto Calculation Display */}
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex flex-col justify-center">
                <span className="text-xs text-emerald-500/80 font-bold uppercase tracking-wider mb-1">
                  Kalkulasi Netto
                </span>
                <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {(() => {
                    const w = parseFloat(scaleWeight);
                    const m = parseFloat(masukWeight);
                    if (isNaN(w) || isNaN(m)) return "— kg";
                    const nettoVal = isLoading ? (w - m) : (m - w);
                    if (nettoVal < 0) return "Error (Bruto <= Tara)";
                    return `${nettoVal} kg`;
                  })()}
                </p>
                <span className="text-[10px] text-emerald-500/60 uppercase">Formula: Bruto - Tara</span>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          {pemeriksaanItems.map((item) => {
            const options = item.tipe_jawaban && item.tipe_jawaban.includes(',') ? item.tipe_jawaban.split(',').map(o => o.trim()) : null;
            const isSelect = Array.isArray(options) && options.length > 0;
            const value = pemeriksaan[item.id] || "";

            const hasError = fieldErrors[item.id];

            return (
              <div key={item.id} className="group transition-all duration-300" data-error={hasError ? "true" : undefined}>
                <div className={`p-5 rounded-2xl border transition-all duration-300 ${hasError 
                  ? 'bg-red-50/50 dark:bg-red-500/5 border-red-500 shadow-sm' 
                  : value 
                    ? 'bg-white dark:bg-white/5 border-blue-500/30 shadow-sm' 
                    : 'bg-slate-50/50 dark:bg-white/[0.02] border-slate-100 dark:border-white/5 hover:border-slate-200'
                }`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-text-primary dark:text-slate-200">{item.nama_item}</span>
                    </div>

                    {isSelect ? (
                      <div className="flex flex-wrap gap-2">
                        {options.map((opt: string) => {
                          const isSelected = value?.toString().trim().toLowerCase() === opt.trim().toLowerCase();
                          const isWarning = opt === "Rusak" || opt === "Tidak Terpasang" || opt === "Tidak Ada" || opt === "Sisa";
                          return (
                            <label
                              key={opt}
                              className={`
                                cursor-pointer px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 border
                                ${isSelected 
                                  ? (isWarning ? 'bg-red-500 border-red-500 text-white shadow-sm' : 'bg-blue-500 border-blue-500 text-white shadow-sm shadow-blue-200 dark:shadow-blue-900/30')
                                  : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:border-blue-300 dark:hover:border-blue-500/30'
                                }
                              `}
                            >
                              <input
                                type="radio"
                                className="hidden"
                                name={`pem-k-${item.id}`}
                                checked={isSelected}
                                onChange={() => setPemeriksaan((p) => ({ ...p, [item.id]: opt }))}
                              />
                              {opt}
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <input
                        type="text"
                        className="form-input md:max-w-[240px] bg-white dark:bg-white/5"
                        placeholder="Masukan hasil..."
                        value={value || ""}
                        onChange={(e) => setPemeriksaan((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      />
                    )}
                  </div>

                  {item.kode === "BTK" && value === "Ada" && (
                    <div className="mt-4 pt-4 border-t border-blue-500/10">
                      <label className="form-label text-blue-400">Sebutkan Jenis Beban (Keluar)</label>
                      <input
                        type="text"
                        className="form-input bg-blue-500/5 border-blue-500/20 focus:border-blue-500"
                        placeholder="..."
                        value={jenisBeban}
                        onChange={(e) => setJenisBeban(e.target.value)}
                      />
                    </div>
                  )}

                  {item.kode === "SGK" && value === "Terpasang" && (
                    <div className="mt-4 pt-4 border-t border-emerald-500/10 space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="form-label text-emerald-400">Nomor Segel (Keluar)</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            className="w-16 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs font-bold text-emerald-400 text-center"
                            value={jumlahSegel || String(nomorSegel.length)}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || nomorSegel.length;
                              const newCount = Math.max(1, val);
                              setJumlahSegel(String(newCount));
                              // Sync nomor segel array with new count
                              if (newCount > nomorSegel.length) {
                                setNomorSegel(prev => [...prev, ...Array(newCount - prev.length).fill("")]);
                              } else if (newCount < nomorSegel.length) {
                                setNomorSegel(prev => prev.slice(0, newCount));
                              }
                            }}
                            min={1}
                          />
                          <button
                            type="button"
                            className="p-1 rounded hover:bg-emerald-500/20 text-emerald-500"
                            onClick={() => setNomorSegel(p => p.length > 1 ? p.slice(0, -1) : p)}
                            disabled={nomorSegel.length <= 1}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className="p-1 rounded hover:bg-emerald-500/20 text-emerald-500"
                            onClick={() => setNomorSegel(p => [...p, ""])}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="12" y1="5" x2="12" y2="19" />
                              <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {nomorSegel.map((s, idx) => (
                          <div key={idx} className="relative">
                            <input
                              type="text"
                              className="form-input form-input-sm bg-emerald-500/5 border-emerald-500/10 focus:border-emerald-500 pr-8"
                              placeholder={`Segel Keluar #${idx + 1}`}
                              value={s}
                              onChange={(e) => setNomorSegel((prev) => { const n = [...prev]; n[idx] = e.target.value; return n; })}
                            />
                            {nomorSegel.length > 1 && (
                              <button
                                type="button"
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-500"
                                onClick={() => {
                                  setNomorSegel(prev => prev.filter((_, i) => i !== idx));
                                  setJumlahSegel(String(Math.max(1, nomorSegel.length - 1)));
                                }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <line x1="18" y1="6" x2="6" y2="18" />
                                  <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-6 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10">
          <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-3 block">Keterangan Tambahan <span className="text-text-muted font-normal">(Opsional)</span></label>
          <textarea
            className="form-input bg-white dark:bg-white/5 min-h-[100px]"
            placeholder="Tambahkan catatan jika diperlukan..."
            value={keteranganUmum}
            onChange={(e) => setKeteranganUmum(e.target.value)}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          {!isEditing && (
            <button
              type="button"
              className="btn btn-danger flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-2 text-sm sm:text-base order-2 sm:order-1"
              onClick={() => { setRejectReason(""); setRejectType("warning"); setShowRejectModal(true); }}
              disabled={loading}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/>
                <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span className="sm:hidden">TOLAK</span>
              <span className="hidden sm:inline">REJECT VCF</span>
            </button>
          )}
          {!isEditing && (
            <>
              <button
                type="button"
                className="btn btn-secondary py-2.5 sm:py-2 text-sm sm:text-base order-3 sm:order-2"
                onClick={() => {
                  const resetObj: Record<number, string> = {};
                  pemeriksaanItems.forEach(i => { resetObj[i.id] = ""; });
                  setPemeriksaan(resetObj);
                  setJenisBeban("");
                  setJumlahSegel("");
                  setNomorSegel([""]);
                  setKeteranganUmum("");
                  setError("");
                }}
                disabled={loading}
              >
                RESET
              </button>
              <button
                type="submit"
                className="btn btn-primary flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-2 text-sm sm:text-base order-1 sm:order-3"
                disabled={loading}
              >
                {loading ? "MEMPROSES..." : <><span className="sm:hidden">SIMPAN</span><span className="hidden sm:inline">SIMPAN & LANJUTKAN</span></>}
              </button>
            </>
          )}
        </div>
      </form>

      {/* Reject Modal */}
      {showRejectModal && createPortal(
        <div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
          onClick={() => { if (!loading) setShowRejectModal(false); }}
        >
          <div
            className="bg-white dark:bg-bg-card w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ maxHeight: "90vh", borderTop: "1px solid rgba(255,255,255,0.08)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle (mobile) */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-white/10" />
            </div>

            {/* Header */}
            <div className="px-6 pt-5 pb-4 border-b border-slate-100 dark:border-white/5">
              <p className="text-[11px] font-semibold tracking-widest uppercase text-slate-400 dark:text-slate-500 mb-1">Tindakan</p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Tolak VCF — WB Keluar</h3>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Info VCF */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                  <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Supir</p>
                  <p className="text-sm font-bold text-text-primary truncate">{vcfData?.supir?.nama_supir ?? vcfData?.driver?.nama_supir ?? "—"}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                  <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">No. Polisi</p>
                  <p className="text-sm font-bold text-text-primary font-mono">{vcfData?.no_polisi ?? "—"}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                  <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Tanggal</p>
                  <p className="text-sm font-bold text-text-primary">{vcfData?.tanggal ?? new Date().toLocaleDateString("id-ID")}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                  <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Jam Keluar</p>
                  <p className="text-sm font-bold text-text-primary">{vcfData?.jam_keluar ?? new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              </div>

              {/* Tipe Tindakan */}
              <div>
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2">Tipe Tindakan</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRejectType("reject_only")}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      rejectType === "reject_only"
                        ? "bg-slate-500/10 border-slate-500 text-slate-700 dark:text-slate-300"
                        : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:border-slate-400"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-black uppercase">Tolak VCF</span>
                    </div>
                    <p className="text-[10px] text-slate-400">Tolak saja, tanpa catatan pelanggaran</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRejectType("warning")}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      rejectType === "warning"
                        ? "bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-400"
                        : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:border-amber-400"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-black uppercase">Warning</span>
                    </div>
                    <p className="text-[10px] text-slate-400">Catat warning, VCF tetap lanjut</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRejectType("blacklist")}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      rejectType === "blacklist"
                        ? "bg-red-500/10 border-red-500 text-red-600 dark:text-red-400"
                        : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:border-red-400"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-black uppercase">Blacklist</span>
                    </div>
                    <p className="text-[10px] text-slate-400">Tolak VCF + blokir driver</p>
                  </button>
                </div>
                {rejectType === "blacklist" && (
                  <div className="mt-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
                    Driver akan langsung diblokir dan tidak bisa mendaftar VCF baru.
                  </div>
                )}
                {rejectType === "warning" && (
                  <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400">
                    VCF tidak ditolak. Driver dicatat warning dan bisa melanjutkan proses.
                  </div>
                )}
              </div>

              {/* Alasan */}
              <div>
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2">
                  {rejectType === "warning" ? "Alasan Warning *" : "Alasan Penolakan *"}
                </p>
                <textarea
                  className="w-full min-h-[90px] px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-red-500/50 transition-colors resize-none"
                  placeholder={rejectType === "warning" ? "Jelaskan pelanggaran yang dilakukan driver..." : "Jelaskan alasan penolakan secara detail..."}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  className="btn btn-secondary flex-1"
                  onClick={() => setShowRejectModal(false)}
                  disabled={loading}
                >Batal</button>
                <button
                  className={`flex-[2] btn font-black ${
                    rejectType === "blacklist" ? "btn-danger"
                    : rejectType === "warning" ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-500"
                    : "bg-slate-600 hover:bg-slate-700 text-white border-slate-600"
                  }`}
                  onClick={handleReject}
                  disabled={loading || !rejectReason.trim()}
                >
                  {loading ? <><span className="spinner" /> Memproses...</>
                    : rejectType === "blacklist" ? "Blacklist & Tolak VCF"
                    : rejectType === "warning" ? "Catat Warning"
                    : "Tolak VCF"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );

  if (dataLoading) {
    return (
      <div className="glass-card p-12 flex flex-col items-center justify-center space-y-4">
        <div className="spinner-accent w-10 h-10" style={{ borderColor: 'var(--accent-primary)' }} />
        <div className="flex flex-col items-center">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Memuat Data VCF...</p>
          <p className="text-[11px] text-slate-500">Menyiapkan formulir pemeriksaan keluar</p>
        </div>
      </div>
    );
  }

  if (hasExistingData && !isEditing) return (
    <div className="max-w-4xl mx-auto space-y-4">
      <ViolationWarningCard data={violationData} />
      {readOnlyView}
    </div>
  );
  
  if (hasExistingData && isEditing) {
    return (
      <>
        {readOnlyView}
         <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setIsEditing(false); setError(""); }}>
          <div className="bg-white dark:bg-bg-card w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10" onClick={(e) => e.stopPropagation()}>
            <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-white dark:bg-bg-card">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center border border-slate-100 dark:border-white/10">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-violet-500"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">Edit Security Weighbridge (Keluar)</h2>
                  <p className="text-slate-400 text-xs font-medium">Perbarui data pemeriksaan fisik kendaraan</p>
                </div>
              </div>
              <button onClick={() => { setIsEditing(false); setError(""); }} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 transition-all">
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
               <div className="max-w-4xl mx-auto">
                 {formView}
               </div>
            </div>
             <div className="p-6 border-t border-slate-100 dark:border-white/5 bg-white dark:bg-bg-card flex justify-end gap-3 shrink-0">
                <button 
                  type="button"
                  onClick={() => { setIsEditing(false); setError(""); }} 
                  className="btn btn-secondary btn-sm"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="btn btn-success btn-sm"
                >
                  {loading ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
             </div>
          </div>
        </div>
      </>
    );
  }

  return formView;
}
