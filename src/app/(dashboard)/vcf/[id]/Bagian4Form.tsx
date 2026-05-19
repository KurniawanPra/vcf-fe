"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { vcfApi } from "@/lib/api";
import { formatTime, isValidTime24h, getErrorMessage } from "@/lib/utils";
import { useToast, ToastContainer } from "@/components/Toast";
import { VCF_STATUS } from "@/constants/vcfStatus";


interface VcfData {
  nomor_urut: string;
  no_polisi: string;
  tanggal: string;
  tipe_kegiatan: string;
  jam_masuk: string;
  transporter?: { nama_transporter: string };
  driver?: { nama_supir: string };
  vcf_keluar?: { jam_keluar: string; emergency_respon_kontak: string; keterangan?: string };
  status: string;
  catatan?: string;
}

interface Props {
  vcfId: number;
  canEdit: boolean;
  canFill?: boolean;
  vcfData: VcfData;
  onSuccess: () => void;
}

export default function Bagian4Form({ vcfId, canEdit, canFill, vcfData, onSuccess }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toasts, removeToast, toast } = useToast();
  const [fieldErrors, setFieldErrors] = useState<{ jamKeluar?: boolean; emergencyKontak?: boolean; keterangan?: boolean }>({});
  const [jamKeluar, setJamKeluar] = useState("");
  const [emergencyKontak, setEmergencyKontak] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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

  // Pre-fill data if available
  useEffect(() => {
    if (vcfData.vcf_keluar) {
      const timeVal = vcfData.vcf_keluar.jam_keluar || "";
      let formattedTime = timeVal.substring(0, 5);
      if (timeVal.includes(":")) {
        const parts = timeVal.split(":");
        formattedTime = `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`.substring(0, 5);
      }
      setJamKeluar(formattedTime);
      setEmergencyKontak(vcfData.vcf_keluar.emergency_respon_kontak || "");
      setKeterangan(vcfData.vcf_keluar.keterangan || "");
      // If data exists and still before finalization, default to view mode (not editing)
      setIsEditing(false);
    } else if (canEdit) {
      setJamKeluar(formatTime());
    }
  }, [vcfData, canEdit]);

  // Dispatch modal events for showConfirm
  useEffect(() => {
    if (showConfirm) {
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
  }, [showConfirm]);

  const validateForm = (): { valid: boolean; message?: string } => {
    const errors: { jamKeluar?: boolean; emergencyKontak?: boolean; keterangan?: boolean } = {};
    
    if (!jamKeluar || jamKeluar.trim() === "") {
      errors.jamKeluar = true;
    } else if (!isValidTime24h(jamKeluar)) {
      errors.jamKeluar = true;
    }
    
    if (!emergencyKontak || emergencyKontak.trim() === "") {
      errors.emergencyKontak = true;
      setFieldErrors(errors);
      return { valid: false, message: "Emergency response kontak wajib diisi." };
    }
    
    if (!keterangan || keterangan.trim() === "") {
      errors.keterangan = true;
      setFieldErrors(errors);
      return { valid: false, message: "Keterangan wajib diisi." };
    }
    
    setFieldErrors(errors);
    return { valid: Object.keys(errors).length === 0 };
  };

  const handleSubmitInitial = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    const validation = validateForm();
    if (!validation.valid) {
      setError(validation.message || "Harap lengkapi semua field yang wajib diisi.");
      // Scroll ke field error pertama
      const firstErrorEl = document.querySelector('[data-field-error="true"]');
      firstErrorEl?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    
    setShowConfirm(true);
  };

  const handleFinalize = async () => {
    setLoading(true);
    setError("");
    try {
      // 1. Simpan/Update data Bagian 4 (Jam Keluar)
      if (!vcfData.vcf_keluar) {
        await vcfApi.createBagian4(vcfId, {
          jam_keluar: jamKeluar,
          emergency_respon_kontak: emergencyKontak,
          keterangan: keterangan,
        });
      } else {
        await vcfApi.updateBagian4(vcfId, {
          jam_keluar: jamKeluar,
          emergency_respon_kontak: emergencyKontak,
          keterangan: keterangan,
        });
      }

      // 2. Langsung Finalisasi (Keluar Main Gate)
      await vcfApi.finalizeVcf(vcfId);

      toast.success("VCF Selesai", "Kendaraan telah dikonfirmasi keluar dari Main Gate.");
      onSuccess();
      setTimeout(() => router.push(`/vcf/${vcfId}`), 1000);
    } catch (err: unknown) {
      toast.error("Gagal", getErrorMessage(err, "Gagal memproses finalisasi VCF."));
      setShowConfirm(false);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBagian4 = async () => {
    setLoading(true);
    setError("");
    try {
      await vcfApi.updateBagian4(vcfId, {
        jam_keluar: jamKeluar,
        emergency_respon_kontak: emergencyKontak,
        keterangan: keterangan,
      });
      toast.success("Berhasil", "Data Bagian 4 berhasil diperbarui.");
      setIsEditing(false);
      onSuccess();
    } catch (err: unknown) {
      toast.error("Gagal", getErrorMessage(err, "Gagal memperbarui Bagian 4."));
    } finally {
      setLoading(false);
    }
  };

  // Show completed view if status is selesai and user cannot edit
  if (vcfData.status === "selesai" && !canEdit) {
    return (
      <div className="space-y-6">
        <div className="glass-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-bg-primary dark:bg-white/5">
            <h3 className="font-bold text-text-primary dark:text-white uppercase tracking-wider text-sm">Hasil Akhir — Main Gate Keluar</h3>
          </div>
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                <p className="text-[10px] uppercase font-bold text-emerald-500/60 tracking-widest mb-2">Waktu Keluar</p>
                <p className="text-3xl font-black text-emerald-400 font-mono">
                  {vcfData.vcf_keluar?.jam_keluar?.substring(0, 5) || "—"} <span className="text-sm font-normal opacity-60">WIB</span>
                </p>
              </div>
              <div className="p-6 rounded-2xl bg-bg-primary dark:bg-white/5 border border-border/50">
                <p className="text-[10px] uppercase font-bold text-text-muted tracking-widest mb-2">Emergency Response Kontak</p>
                <p className="text-xl font-bold text-text-primary dark:text-white">
                  {vcfData.vcf_keluar?.emergency_respon_kontak || "—"}
                </p>
              </div>
            </div>

            {vcfData.vcf_keluar?.keterangan && (
              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-[10px] uppercase font-bold text-text-muted tracking-widest mb-2">Keterangan</p>
                <p className="text-sm text-text-primary dark:text-slate-200">{vcfData.vcf_keluar.keterangan}</p>
              </div>
            )}

            <div className="mt-8 pt-8 border-t border-border flex items-center justify-center gap-2 text-slate-400 text-xs italic">
              VCF Selesai Diproses
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show read-only view if data exists and not currently editing
  const hasExistingData = vcfData.vcf_keluar;
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

        <div className="glass-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-slate-50/50 dark:bg-white/5 flex justify-between items-center">
            <h3 className="font-bold text-text-primary dark:text-white uppercase tracking-wider text-sm">Hasil Pemeriksaan Main Gate Keluar</h3>
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
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2">Jam Keluar</p>
                <p className="text-2xl font-black text-slate-700 dark:text-white font-mono">{vcfData.vcf_keluar?.jam_keluar?.substring(0, 5)} <span className="text-xs font-normal opacity-50">WIB</span></p>
              </div>
              <div className="flex-1 p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2">Emergency Response Kontak</p>
                <p className="text-xl font-bold text-slate-700 dark:text-white">{vcfData.vcf_keluar?.emergency_respon_kontak}</p>
              </div>
            </div>

            <div className="mt-4 p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-2">Keterangan</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{vcfData.vcf_keluar?.keterangan || "—"}</p>
            </div>
          </div>
        </div>
      </div>
    ) : null;

  // Show waiting message if cannot fill and cannot edit
  if (!canFill && !canEdit) {
    return (
      <div className="p-8 rounded-2xl bg-slate-50 dark:bg-white/5 border-2 border-dashed border-slate-200 dark:border-white/10 text-center text-slate-400">
        Menunggu penyelesaian tahap sebelumnya untuk mengisi Bagian 4.
      </div>
    );
  }

  const isAlreadyFilled = !!vcfData.vcf_keluar;
  const isReadOnly = isAlreadyFilled && !isEditing;

  const formView = (
    <div className="max-w-4xl mx-auto space-y-6">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm mb-6">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-bg-card border border-slate-100 dark:border-white/5 p-6 rounded-3xl shadow-sm mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">Main Gate Keluar</h2>
            <p className="text-slate-400 text-xs font-medium">Validasi akhir sebelum kendaraan keluar</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { 
              label: "Nomor VCF", 
              value: vcfData.nomor_urut, 
              icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> 
            },
            { 
              label: "No. Polisi", 
              value: vcfData.no_polisi, 
              icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> 
            },
            { 
              label: "Jam Masuk", 
              value: vcfData.jam_masuk + " WIB", 
              icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> 
            },
          ].map((item, i) => (
            <div key={i} className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex items-center gap-3">
              <div className="text-slate-400">{item.icon}</div>
              <div className="min-w-0">
                <label className="text-[9px] uppercase font-black text-slate-400 block mb-0.5 tracking-wider">{item.label}</label>
                <p className="text-sm font-black text-slate-700 dark:text-white truncate">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmitInitial} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={`p-6 rounded-2xl bg-white dark:bg-white/5 border-2 ${isAlreadyFilled ? "border-emerald-500/30" : "border-slate-100 dark:border-white/10"} focus-within:border-blue-500 transition-all`}>
            <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-3 block">Jam Keluar (WIB)</label>
            <input
              type="text"
              className={`w-full bg-transparent text-2xl font-black font-mono focus:outline-none ${isAlreadyFilled ? "text-emerald-500" : ""}`}
              value={jamKeluar}
              onChange={(e) => {
                if (isReadOnly) return;
                let v = e.target.value.replace(/[^\d]/g, "");
                if (v.length > 4) v = v.slice(0, 4);
                setJamKeluar(v.length > 2 ? v.slice(0, 2) + ":" + v.slice(2) : v);
              }}
              readOnly={isReadOnly}
              placeholder="HH:MM"
              maxLength={5}
              required
            />
          </div>
          <div data-field-error={fieldErrors.emergencyKontak ? "true" : undefined} className={`p-6 rounded-2xl bg-white dark:bg-white/5 border-2 ${isAlreadyFilled ? "border-emerald-500/30" : fieldErrors.emergencyKontak ? "border-red-500 bg-red-50/30" : "border-slate-100 dark:border-white/10"} focus-within:border-blue-500 transition-all`}>
            <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-3 block">Emergency Response Kontak *</label>
            <input
              type="text"
              className={`w-full bg-transparent text-lg font-bold focus:outline-none ${isAlreadyFilled ? "text-text-primary dark:text-white" : ""}`}
              placeholder="0812..."
              value={emergencyKontak}
              onChange={(e) => {
                if (isReadOnly) return;
                setEmergencyKontak(e.target.value);
                if (fieldErrors.emergencyKontak) {
                  setFieldErrors(prev => ({ ...prev, emergencyKontak: false }));
                }
              }}
              readOnly={isReadOnly}
            />
            {fieldErrors.emergencyKontak && (
              <p className="text-[11px] text-red-500 mt-2">Emergency response wajib diisi</p>
            )}
          </div>
        </div>

        <div data-field-error={fieldErrors.keterangan ? "true" : undefined} className={`p-6 rounded-2xl bg-white dark:bg-white/5 border-2 ${isAlreadyFilled ? "border-emerald-500/30" : fieldErrors.keterangan ? "border-red-500 bg-red-50/30" : "border-slate-100 dark:border-white/10"} focus-within:border-blue-500 transition-all`}>
          <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-3 block">Keterangan *</label>
          <textarea
            className={`w-full bg-transparent text-base font-medium focus:outline-none resize-none ${isAlreadyFilled ? "text-text-primary dark:text-white" : ""}`}
            placeholder="Masukkan keterangan..."
            value={keterangan}
            onChange={(e) => {
              if (isReadOnly) return;
              setKeterangan(e.target.value);
              if (fieldErrors.keterangan) {
                setFieldErrors(prev => ({ ...prev, keterangan: false }));
              }
            }}
            readOnly={isReadOnly}
            rows={3}
          />
          {fieldErrors.keterangan && (
            <p className="text-[11px] text-red-500 mt-2">Keterangan wajib diisi</p>
          )}
        </div>

        <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10">
          <p className="text-[10px] font-bold text-amber-500 uppercase leading-relaxed text-center">
            {isAlreadyFilled 
              ? "DATA TELAH DICATAT. SILAKAN KONFIRMASI KELUAR MAIN GATE SEKARANG." 
              : "Peringatan: Pastikan seluruh pemeriksaan telah selesai sebelum mengonfirmasi keluar Main Gate."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
        {!isEditing && (
          <div className="flex flex-col sm:flex-row gap-3">
            {isAlreadyFilled && canEdit && (
              <button
                type="button"
                className="btn btn-secondary w-full sm:w-auto"
                onClick={() => setIsEditing(true)}
                disabled={loading}
              >
                Edit Data
              </button>
            )}

            {!isAlreadyFilled && (
              <button
                type="button"
                className="btn btn-secondary w-full sm:w-auto"
                onClick={() => {
                  setJamKeluar(formatTime());
                  setEmergencyKontak("");
                  setError("");
                }}
                disabled={loading}
              >
                Reset
              </button>
            )}

            <button
              type="submit"
              className="btn btn-success flex-1"
              disabled={loading}
            >
              {loading ? "Memproses..." : (isAlreadyFilled ? "Konfirmasi Keluar Sekarang" : "Simpan & Selesaikan")}
            </button>
          </div>
        )}
        </div>

      </form>

      {/* Confirmation Modal */}
      {showConfirm && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
          onClick={() => !loading && setShowConfirm(false)}
        >
          <div
            className="w-full sm:max-w-md bg-white dark:bg-slate-900 sm:rounded-2xl rounded-t-2xl overflow-hidden shadow-2xl"
            style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle (mobile) */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-white/10" />
            </div>

            <div className="px-6 pt-5 pb-6 space-y-5">
              {/* Header */}
              <div>
                <p className="text-[11px] font-semibold tracking-widest uppercase text-slate-400 dark:text-slate-500 mb-1">Konfirmasi</p>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Finalisasi Keluar?</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{vcfData.no_polisi}</span>
                  {vcfData.driver?.nama_supir ? ` · ${vcfData.driver.nama_supir}` : ""}
                  {" "}akan dinyatakan keluar dari area pabrik.
                </p>
              </div>

              {/* Summary row */}
              <div className="flex items-center justify-between py-3 border-t border-b border-slate-100 dark:border-white/5">
                <span className="text-xs text-slate-400 dark:text-slate-500">Jam Keluar</span>
                <span className="text-base font-bold font-mono text-slate-800 dark:text-white">{jamKeluar} <span className="font-normal text-slate-400 text-xs">WIB</span></span>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={handleFinalize}
                  disabled={loading}
                  className="btn btn-success w-full"
                  style={{ height: 44 }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                      Memproses...
                    </span>
                  ) : "Konfirmasi Keluar"}
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={loading}
                  className="btn btn-secondary w-full"
                  style={{ height: 44 }}
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );

  if (hasExistingData && !isEditing) return readOnlyView;
  
  if (hasExistingData && isEditing) {
    return (
      <>
        {readOnlyView}
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setIsEditing(false); setError(""); }}>
          <div className="bg-white dark:bg-bg-card w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col rounded-[32px] shadow-2xl border border-slate-200 dark:border-white/10" onClick={(e) => e.stopPropagation()}>
            {/* Sync Header with Bagian 3 */}
            <div className="px-8 py-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-white dark:bg-bg-card">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/5 flex items-center justify-center border border-emerald-100 dark:border-emerald-500/10">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">Edit Main Gate (Keluar)</h2>
                  <p className="text-slate-400 text-xs font-medium">Perbarui data pencatatan akhir kendaraan</p>
                </div>
              </div>
              <button onClick={() => { setIsEditing(false); setError(""); }} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 transition-all">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1 bg-white dark:bg-bg-card relative">
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
                 onClick={handleUpdateBagian4}
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
