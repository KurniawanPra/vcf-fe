"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { vcfApi, masterApi, violationApi } from "@/lib/api";
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

interface Props {
  vcfId: number;
  canEdit: boolean;
  canFill?: boolean;
  vcfData: any;
  onSuccess: () => void;
  onReject: () => void;
}

export default function Bagian2Form({ vcfId, canEdit, canFill, vcfData, onSuccess, onReject }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toasts, removeToast, toast } = useToast();
  const [fieldErrors, setFieldErrors] = useState<Record<number, boolean>>({});
  const [pemeriksaanItems, setPemeriksaanItems] = useState<CheckItem[]>([]);
  const [pemeriksaan, setPemeriksaan] = useState<Record<number, string>>({});

  // States for detail fields
  const [jenisBeban, setJenisBeban] = useState("");
  const [keteranganUmum, setKeteranganUmum] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Segel Masuk — for Unloading flow (input at WB Masuk)
  const [nomorSegel, setNomorSegel] = useState<string[]>([""]);
  const [jumlahSegel, setJumlahSegel] = useState("1");

  const syncJumlahSegel = (val: string) => {
    const n = Math.max(1, Math.min(20, parseInt(val) || 1));
    setJumlahSegel(String(n));
    setNomorSegel(prev => {
      const arr = [...prev];
      while (arr.length < n) arr.push("");
      return arr.slice(0, n);
    });
  };

  const activityType = vcfData?.tipe_kegiatan || "";
  const isLoading = activityType.startsWith("loading");
  const isUnloading = activityType.startsWith("unloading");

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
        // Ekstrak tipe dasar: 'loading' atau 'unloading' dari tipe_kegiatan VCF
        const tipeBase = activityType.startsWith('loading') ? 'loading'
          : activityType.startsWith('unloading') ? 'unloading'
          : undefined;
        const res = await masterApi.getItemPemeriksaanMasuk(tipeBase ? { tipe_kegiatan: tipeBase } : undefined);
        const items = (res.data.data || res.data).filter(
          (i: CheckItem & { is_active?: boolean }) => i.is_active !== false
        );
        setPemeriksaanItems(items);
        
        // Initial state for new entries
        const initial: Record<number, string> = {};
        items.forEach((i: CheckItem) => { initial[i.id] = ""; });
        setPemeriksaan(initial);

        // If data exists, it means we are in edit mode or viewing existing data
        if (vcfData) {
          mapExistingData(items, vcfData);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setTimeout(() => setDataLoading(false), 500);
      }
    };
    fetchItems();
  }, [vcfId, activityType]);

  const mapExistingData = (items: CheckItem[], data: any) => {
    // 1. Map existing pemeriksaan data
    if (data.pemeriksaan_masuk) {
      const initial: Record<number, string> = {};
      items.forEach(i => { initial[i.id] = ""; });
      
      data.pemeriksaan_masuk.forEach((pm: any) => {
        const val = pm.nilai?.toString().trim() || "";
        const itemId = Number(pm.item_id);
        if (!isNaN(itemId)) {
          initial[itemId] = val;
        }
      });
      setPemeriksaan(initial);
    }

    // 2. Map beban tambahan detail
    if (data.beban_tambahan_masuk) {
      setJenisBeban(data.beban_tambahan_masuk.jenis_beban || "");
    }

    // 3. Map segel masuk data (unloading: segel diinput di WB Masuk)
    if (data.segel_masuk) {
      const nums = data.segel_masuk.nomor_segel?.map((s: any) => s.nomor_segel || s) || [];
      if (nums.length > 0) {
        setNomorSegel(nums);
        setJumlahSegel(String(nums.length));
      } else if (data.segel_masuk.jumlah_segel > 0) {
        setJumlahSegel(String(data.segel_masuk.jumlah_segel));
        setNomorSegel(Array(data.segel_masuk.jumlah_segel).fill(""));
      }
    }

    // 4. Map Keterangan Umum
    setKeteranganUmum(data.segel_masuk?.keterangan || data.vcf_bagian2?.keterangan || "");
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
          jenis_pelanggaran: rejectType === "blacklist" ? "[BLACKLIST] Ditolak WB Masuk" : "[WARNING] WB Masuk",
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

      await vcfApi.rejectBagian2(vcfId, { catatan_reject: rejectReason });
      setShowRejectModal(false);
      toast.success("VCF Ditolak",
        rejectType === "blacklist" ? "Driver diblokir dan VCF ditolak."
        : "VCF berhasil ditolak."
      );
      setTimeout(() => {
        router.push(`/vcf/${vcfId}`);
        onReject();
      }, 1000);
    } catch (err: unknown) {
      toast.error("Gagal", getErrorMessage(err, "Gagal reject VCF."));
      setError(getErrorMessage(err, "Gagal reject VCF."));
    } finally {
      setLoading(false);
    }
  };


  const validateForm = (): { valid: boolean; message?: string } => {
    const errors: Record<number, boolean> = {};
    let hasError = false;

    pemeriksaanItems.forEach((item) => {
      const value = pemeriksaan[item.id];
      if (!value || value.trim() === "" || value === "—") {
        errors[item.id] = true;
        hasError = true;
      }
    });

    const btmItem = pemeriksaanItems.find(i => i.kode === "BTM");
    if (btmItem && pemeriksaan[btmItem.id] === "Ada" && !jenisBeban.trim()) {
      errors[btmItem.id] = true;
      hasError = true;
      setFieldErrors(errors);
      return { valid: false, message: "Jenis beban tambahan wajib diisi jika memilih 'Ada'." };
    }

    setFieldErrors(errors);
    return { valid: !hasError, message: hasError ? "Harap lengkapi semua pemeriksaan yang belum diisi." : undefined };
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");

    // Validasi client-side sebelum submit
    const validation = validateForm();
    if (!validation.valid) {
      toast.error("Validasi Gagal", validation.message || "Harap lengkapi semua pemeriksaan yang belum diisi.");
      const firstErrorEl = document.querySelector('[data-error="true"]');
      firstErrorEl?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }




    setLoading(true);
    try {

      const pemItems = pemeriksaanItems.map((item) => ({
        item_id: item.id,
        nilai: pemeriksaan[item.id],
        keterangan: null,
      }));

      const btmItem = pemeriksaanItems.find(i => i.kode === "BTM");

      const sgmItem = pemeriksaanItems.find(i => i.kode === "SGM");
      const segelTerpasang = isUnloading
        ? (sgmItem ? pemeriksaan[sgmItem.id] === "Terpasang" : nomorSegel.some(s => s.trim()))
        : false;
      const validSegel = nomorSegel.filter(s => s.trim());

      const payload = {
        pemeriksaan: pemItems,
        beban_tambahan_ada: btmItem ? pemeriksaan[btmItem.id] === "Ada" : false,
        jenis_beban: jenisBeban || null,
        segel_terpasang: segelTerpasang,
        jumlah_segel: segelTerpasang ? (jumlahSegel ? parseInt(jumlahSegel) : validSegel.length) : null,
        nomor_segel: segelTerpasang ? validSegel : [],
        keterangan: keteranganUmum || null,
      };

      if (isEditing) {
        await vcfApi.updateBagian2(vcfId, payload);
        setShowSuccess(true);
        toast.success("Berhasil", "Perubahan berhasil disimpan.");
        setTimeout(() => {
          setIsEditing(false);
          setShowSuccess(false);
          onSuccess();
        }, 1500);
      } else {
        await vcfApi.createBagian2(vcfId, payload);
        toast.success("Berhasil", "Pemeriksaan masuk berhasil disimpan.");
        setTimeout(() => {
          onSuccess();
          router.push("/vcf");
        }, 1000);
        return;
      }

      setTimeout(() => {
        router.push(`/vcf/${vcfId}`);
        onSuccess();
      }, 1000);
    } catch (err: unknown) {
      toast.error("Gagal", getErrorMessage(err, "Gagal menyimpan Bagian 2."));
      setError(getErrorMessage(err, "Gagal menyimpan Bagian 2."));
    } finally {
      setLoading(false);
    }
  };

  // Show read-only view if data exists and not currently editing
  const hasExistingData = vcfData.pemeriksaan_masuk && vcfData.pemeriksaan_masuk.length > 0;
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
          <h3 className="font-bold text-text-primary dark:text-white uppercase tracking-wider text-sm">Hasil Pemeriksaan Weighbridge Masuk</h3>
          {/* Only admin can edit existing data */}
          {canEdit && (
            <button
              onClick={() => setIsEditing(true)}
              className="btn btn-secondary btn-sm flex items-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
              EDIT
            </button>
          )}
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vcfData.pemeriksaan_masuk?.map((pm: any) => (
              <div key={pm.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                <div>
                  <p className="text-[10px] uppercase font-bold text-text-muted tracking-widest mb-1">{pm.item?.nama_item}</p>
                  <p className="font-bold text-text-primary dark:text-slate-200">{pm.nilai}</p>
                </div>
                {(pm.nilai === 'Rusak' || pm.nilai === 'Tidak' || pm.nilai === 'Tidak Ada' || pm.nilai === 'Tidak Terpasang') ? (
                  <div className="text-[10px] font-black text-red-500 bg-red-500/10 px-2 py-1 rounded uppercase">{pm.nilai}</div>
                ) : (
                  <div className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded uppercase">{pm.nilai}</div>
                )}
              </div>
            ))}
          </div>

          {(vcfData.beban_tambahan_masuk || (isUnloading && vcfData.segel_masuk)) && (
            <div className="mt-6 pt-6 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-6">
              {vcfData.beban_tambahan_masuk && (
                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                  <p className="form-label text-blue-500">Beban Tambahan</p>
                  <span className="px-2 py-1 bg-blue-500/10 rounded text-[16px] font-mono text-blue-500 font-bold">
                    {vcfData.beban_tambahan_masuk.jenis_beban}
                  </span>
                </div>
              )}
              {isUnloading && vcfData.segel_masuk && (
                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                  <div className="flex items-center gap-2 mb-2">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-amber-500"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    <p className="form-label text-amber-500 mb-0">Segel Masuk ({vcfData.segel_masuk.jumlah_segel} Unit)</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {vcfData.segel_masuk.nomor_segel?.map((s: any, i: number) => (
                      <span key={i} className="px-2.5 py-1 bg-amber-500/10 rounded-lg text-xs font-mono text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20">
                        {typeof s === 'string' ? s : s.nomor_segel}
                      </span>
                    ))}
                  </div>
                  {/* {vcfData.segel_masuk.keterangan && (
                    <p className="text-[10px] text-amber-500/60 mt-2 italic">{vcfData.segel_masuk.keterangan}</p>
                  )} */}
                </div>
              )}
            </div>
          )}

          {/* Keterangan WB Masuk */}
          <div className="mt-6 pt-6 border-t border-border">
            <div className="p-4 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
              <p className="form-label text-text-muted">Keterangan WB Masuk</p>
              <p className="text-sm text-text-primary dark:text-slate-200">{vcfData.vcf_bagian2?.keterangan || vcfData.segel_masuk?.keterangan || "Tidak ada keterangan"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  const formView = (
    <div className="max-w-4xl mx-auto space-y-6 pb-28 md:pb-0">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Quick VCF Info Banner for petugas */}
      <div className="glass-card p-3 md:p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs">
          <span className="px-2.5 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg font-bold">{vcfData?.no_polisi}</span>
          <span className="text-text-muted">•</span>
          <span className="font-medium text-text-primary">{vcfData?.driver?.nama_supir || "—"}</span>
          <span className="text-text-muted">•</span>
          <span className="font-bold uppercase text-amber-600 dark:text-amber-400">{activityType.replace("_", " ")}</span>
          {vcfData?.produk && <><span className="text-text-muted">•</span><span className="text-text-muted">{vcfData.produk}</span></>}
        </div>
      </div>
      <ViolationWarningCard data={violationData} />

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3 animate-headShake">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
  


        {/* CHECKLIST — Android section style */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 px-1 mb-3">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-blue-500"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <span className="text-[11px] font-black uppercase tracking-widest text-blue-500">Pemeriksaan Weighbridge Masuk</span>
            <span className="ml-auto text-[10px] text-text-muted">{Object.values(pemeriksaan).filter(v => v && v !== '').length}/{pemeriksaanItems.length} terisi</span>
          </div>
          {pemeriksaanItems.map((item) => {
            const options = item.tipe_jawaban && item.tipe_jawaban.includes(',') ? item.tipe_jawaban.split(',').map(o => o.trim()) : null;
            const isSelect = Array.isArray(options) && options.length > 0;
            const value = pemeriksaan[item.id] || "";
            const hasError = fieldErrors[item.id];

            return (
              <div key={item.id} data-error={hasError ? "true" : undefined}>
                <div className={`px-4 py-3.5 rounded-2xl border-l-4 bg-white dark:bg-white/[0.03] border border-l-4 transition-all duration-200
                  ${hasError
                    ? 'border-l-rose-500 border-rose-200 dark:border-rose-900/30 bg-rose-50/30 dark:bg-rose-500/5'
                    : value
                      ? (value === options?.[options.length-1]
                        ? 'border-l-rose-400 border-slate-100 dark:border-white/5'
                        : 'border-l-emerald-400 border-slate-100 dark:border-white/5')
                      : 'border-l-slate-200 dark:border-l-white/10 border-slate-100 dark:border-white/5'
                  }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${value ? (value === (options?.[options.length-1]) ? 'bg-rose-500' : 'bg-emerald-500') : 'bg-slate-300 dark:bg-slate-600'}`} />
                      <span className="font-semibold text-base text-text-primary dark:text-slate-200">{item.nama_item}</span>
                    </div>

                    {isSelect ? (
                      <div className="flex gap-2 flex-wrap">
                        {options!.map((opt: string, idx: number) => {
                          const isSelected = value?.toString().trim().toLowerCase() === opt.trim().toLowerCase();
                          const isLastOption = idx === options!.length - 1;
                          const isNegative = isLastOption;
                          return (
                            <label
                              key={opt}
                              className={`
                                cursor-pointer min-w-[64px] min-h-[44px] px-5 py-2.5 rounded-full text-sm font-bold
                                transition-all duration-150 border-2 flex items-center justify-center select-none
                                ${isSelected
                                  ? isNegative
                                    ? 'bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-200 dark:shadow-rose-900/30'
                                    : 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-200 dark:shadow-emerald-900/30'
                                  : 'bg-transparent border-slate-200 dark:border-white/15 text-slate-500 hover:border-blue-400 hover:text-blue-500'
                                }
                              `}
                            >
                              <input type="radio" className="hidden" name={`pem-${item.id}`} checked={isSelected}
                                onChange={() => setPemeriksaan((p) => ({ ...p, [item.id]: opt }))} />
                              {opt}
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <input
                        type="text"
                        className="form-input md:max-w-[240px] bg-white dark:bg-white/5"
                        placeholder="Masukan hasil pemeriksaan..."
                        value={value || ""}
                        onChange={(e) => setPemeriksaan((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      />
                    )}
                  </div>

                  {/* Contextual Details */}
                  {item.kode === "BTM" && value === "Ada" && (
                    <div className="mt-4 pt-4 border-t border-blue-500/10 animate-slideDown">
                      <label className="form-label text-blue-400">Sebutkan Jenis Beban</label>
                      <input
                        type="text"
                        className="form-input bg-blue-500/5 border-blue-500/20 focus:border-blue-500"
                        placeholder="Contoh: Sparepart, Ban Serep, dll..."
                        value={jenisBeban}
                        onChange={(e) => setJenisBeban(e.target.value)}
                      />
                    </div>
                  )}

                  {/* Segel — unloading only */}
                  {item.kode === "SGM" && isUnloading && (
                    <>
                      {/* Read-only reference: tampilkan segel yang sudah ada dari data VCF */}
                      {!isEditing && vcfData?.segel_masuk && (
                        <div className="mt-3 pt-3 border-t border-amber-500/10 animate-slideDown">
                          <div className="flex items-center gap-2 mb-2">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-amber-500"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                            <span className="text-[10px] uppercase font-black text-amber-500 tracking-widest">Segel Masuk ({vcfData.segel_masuk.jumlah_segel} Unit)</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {vcfData.segel_masuk.nomor_segel?.map((s: any, i: number) => (
                              <span key={i} className="px-2.5 py-1 bg-amber-500/10 rounded-lg text-xs font-mono text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20">
                                {typeof s === 'string' ? s : s.nomor_segel}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {!isEditing && !vcfData?.segel_masuk && (
                        <div className="mt-3 pt-3 border-t border-amber-500/10">
                          <p className="text-[11px] text-text-muted italic px-1">Belum ada data segel masuk.</p>
                        </div>
                      )}

                      {/* Editable segel input — only in edit mode */}
                      {isEditing && value === "Terpasang" && (
                        <div className="mt-4 pt-4 border-t border-amber-500/10 animate-slideDown">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-amber-500"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                              <span className="text-[10px] uppercase font-black text-amber-500 tracking-widest">Nomor Segel Masuk</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-slate-400">Jumlah:</span>
                              <input type="number" min={1} max={20}
                                className="w-14 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs font-bold text-amber-600 dark:text-amber-400 text-center focus:outline-none focus:border-amber-500"
                                value={jumlahSegel} onChange={(e) => syncJumlahSegel(e.target.value)} />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {nomorSegel.map((segel, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400 w-6 text-right">{idx+1}.</span>
                                <input type="text"
                                  className="form-input flex-1 font-mono bg-amber-500/5 border-amber-500/15 focus:border-amber-500"
                                  placeholder={`No. Segel ${idx+1}`}
                                  value={segel}
                                  onChange={(e) => setNomorSegel(prev => { const n=[...prev]; n[idx]=e.target.value; return n; })} />
                                {nomorSegel.length > 1 && (
                                  <button type="button"
                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-rose-400 hover:bg-rose-500/10 hover:text-rose-500 transition-colors shrink-0"
                                    onClick={() => {
                                      setNomorSegel(prev => prev.filter((_, i) => i !== idx));
                                      setJumlahSegel(String(nomorSegel.length - 1));
                                    }}
                                    title="Hapus baris segel"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                          <button type="button"
                            className="mt-2 w-full py-2 border-2 border-dashed border-amber-400/40 rounded-xl text-[10px] font-bold text-amber-500 uppercase hover:bg-amber-500/5 transition-colors"
                            onClick={() => syncJumlahSegel(String(nomorSegel.length + 1))}>
                            + Tambah Baris Segel
                          </button>
                        </div>
                      )}
                    </>
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

        {/* Action Bar */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 max-w-4xl mx-auto pb-8">
          {!isEditing && (
            <button
              type="button"
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-sm font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 active:bg-rose-500/20 transition-all order-2 sm:order-1"
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
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-sm font-bold bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300 border border-slate-200 dark:border-white/10 active:bg-slate-200 dark:active:bg-white/10 transition-all order-3 sm:order-2"
                onClick={() => {
                  const resetObj: Record<number, string> = {};
                  pemeriksaanItems.forEach(i => { resetObj[i.id] = ""; });
                  setPemeriksaan(resetObj);
                  setJenisBeban("");
                  setKeteranganUmum("");
                  setError("");
                }}
                disabled={loading}
              >
                RESET
              </button>
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-full text-sm font-bold bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 active:scale-[0.98] transition-all order-1 sm:order-3"
                disabled={loading}
              >
                {loading ? <><span className="spinner border-white" /> MEMPROSES...</> : <><span className="sm:hidden">SIMPAN</span><span className="hidden sm:inline">SIMPAN & LANJUTKAN</span></>}
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
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Tolak VCF — WB Masuk</h3>
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
                  <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Jam</p>
                  <p className="text-sm font-bold text-text-primary">{vcfData?.jam_masuk ?? new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              </div>

                {/* Tipe Pelanggaran */}
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
        <div className="spinner-accent w-10 h-10" />
        <div className="flex flex-col items-center">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Memuat Data VCF...</p>
          <p className="text-[11px] text-slate-500">Menyiapkan formulir pemeriksaan masuk</p>
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
            {/* Minimalist Header */}
            <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-white dark:bg-bg-card">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center border border-slate-100 dark:border-white/10">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-500"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">Edit Security Weighbridge (Masuk)</h2>
                  <p className="text-slate-400 text-xs font-medium">Perbarui data pemeriksaan fisik kendaraan</p>
                </div>
              </div>
              <button onClick={() => { setIsEditing(false); setError(""); }} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 transition-all">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
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
