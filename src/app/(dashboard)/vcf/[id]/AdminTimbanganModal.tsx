"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/Toast";
import { timbanganApi } from "@/lib/api";

interface AdminTimbanganModalProps {
  isOpen: boolean;
  onClose: () => void;
  vcfId: number;
  initialData?: {
    bruto_from?: number | string | null;
    tara_from?: number | string | null;
    bruto?: number | string | null;
    tara?: number | string | null;
  } | null;
  onSuccess: () => void;
}

export default function AdminTimbanganModal({
  isOpen,
  onClose,
  vcfId,
  initialData,
  onSuccess,
}: AdminTimbanganModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    bruto_from: "",
    tara_from: "",
    bruto: "",
    tara: "",
  });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.dispatchEvent(new CustomEvent("modal-open"));
      setFormData({
        bruto_from: initialData?.bruto_from?.toString() || "",
        tara_from: initialData?.tara_from?.toString() || "",
        bruto: initialData?.bruto?.toString() || "",
        tara: initialData?.tara?.toString() || "",
      });
    } else {
      document.body.style.overflow = "unset";
      window.dispatchEvent(new CustomEvent("modal-close"));
    }
    return () => {
      document.body.style.overflow = "unset";
      window.dispatchEvent(new CustomEvent("modal-close"));
    };
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        bruto_from: formData.bruto_from ? parseFloat(formData.bruto_from) : null,
        tara_from: formData.tara_from ? parseFloat(formData.tara_from) : null,
        bruto: formData.bruto ? parseFloat(formData.bruto) : null,
        tara: formData.tara ? parseFloat(formData.tara) : null,
      };

      await timbanganApi.updateAdmin(vcfId, payload);
      toast.success("Berhasil", "Data timbangan berhasil diubah oleh Admin");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(
        "Gagal Menyimpan",
        err.response?.data?.message || "Terjadi kesalahan saat menyimpan data timbangan."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers and one dot
    let val = e.target.value.replace(/[^0-9.]/g, "");
    const parts = val.split(".");
    if (parts.length > 2) {
      val = parts[0] + "." + parts.slice(1).join("");
    }
    setFormData((prev) => ({ ...prev, [e.target.name]: val }));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden border border-slate-200 dark:border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Override Data Timbangan</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Hak Akses Admin</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <form id="admin-timbangan-form" onSubmit={handleSubmit} className="space-y-5">
            
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
              <div className="col-span-2 mb-1">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tahap 1: Rujukan Timbangan Asal</p>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Bruto Asal (kg)</label>
                <input
                  type="text"
                  name="bruto_from"
                  value={formData.bruto_from}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Tara Asal (kg)</label>
                <input
                  type="text"
                  name="tara_from"
                  value={formData.tara_from}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
              <div className="col-span-2 mb-1">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tahap 2 & 3: Hasil Timbang Weighbridge</p>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Bruto WB (kg)</label>
                <input
                  type="text"
                  name="bruto"
                  value={formData.bruto}
                  onChange={handleInputChange}
                  className="form-input text-blue-600 dark:text-blue-400 font-bold"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Tara WB (kg)</label>
                <input
                  type="text"
                  name="tara"
                  value={formData.tara}
                  onChange={handleInputChange}
                  className="form-input text-purple-600 dark:text-purple-400 font-bold"
                  placeholder="0"
                />
              </div>
              <div className="col-span-2 mt-2 pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Netto (Otomatis):</span>
                <span className="text-sm font-black text-emerald-500">
                  {formData.bruto && formData.tara && parseFloat(formData.bruto) >= parseFloat(formData.tara)
                    ? `${(parseFloat(formData.bruto) - parseFloat(formData.tara)).toFixed(2)} kg`
                    : "—"}
                </span>
              </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/50">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="btn btn-secondary"
          >
            Batal
          </button>
          <button
            type="submit"
            form="admin-timbangan-form"
            disabled={loading}
            className="btn btn-primary bg-orange-500 hover:bg-orange-600 text-white border-none"
          >
            {loading ? "Menyimpan..." : "Simpan Override"}
          </button>
        </div>
      </div>
    </div>
  );
}
