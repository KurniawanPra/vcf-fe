"use client";

import { useState, useEffect, useCallback } from "react";
import { masterApi } from "@/lib/api";
import { exportToExcel } from "@/lib/exportUtils";
import { getErrorMessage } from "@/lib/utils";
import * as XLSX from 'xlsx';
import PrintMasterTable from "@/components/print/PrintMasterTable";
import { downloadImportTemplate, parseExcelPreview, importDataBatch } from "@/lib/importTemplate";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import ImportConfirmModal from "@/components/ImportConfirmModal";
import ImportResultModal from "@/components/ImportResultModal";
import { useToast, ToastContainer } from "@/components/Toast";

interface InspectionItem {
  id: number;
  nama_item: string;
  kode: string;
  tipe_jawaban: string;
  keterangan: string;
  urutan: number;
  is_active: boolean;
  has_detail?: boolean;
  keterangan_detail?: string;
}

export default function PemeriksaanMasukPage() {
  const { toasts, removeToast, toast } = useToast();
  const [data, setData] = useState<InspectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<InspectionItem | null>(null);
  const [form, setForm] = useState({ 
    nama_item: "", 
    kode: "",
    tipe_jawaban: "Bagus,Tidak Bagus",
    keterangan: "", 
    urutan: 0, 
    is_active: true,
    has_detail: false,
    keterangan_detail: ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Import states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [showResultModal, setShowResultModal] = useState(false);
  const [importResult, setImportResult] = useState({ success: 0, failed: 0, errors: [] as string[] });

  // Filters
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      const res = await masterApi.getItemPemeriksaanMasuk(params);
      setData(res.data.data || res.data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [search]);

  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchData();
  }, [fetchData, debouncedSearch]);

  const handleReset = () => {
    setSearch("");
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ 
      nama_item: "", 
      kode: "",
      tipe_jawaban: "Bagus,Tidak Bagus",
      keterangan: "", 
      urutan: data.length + 1, 
      is_active: true,
      has_detail: false,
      keterangan_detail: ""
    });
    setError("");
    setShowModal(true);
  };

  const openEdit = (item: InspectionItem) => {
    setEditing(item);
    setForm({
      nama_item: item.nama_item,
      kode: item.kode || "",
      tipe_jawaban: item.tipe_jawaban || "Bagus,Tidak Bagus",
      keterangan: item.keterangan || "",
      urutan: item.urutan,
      is_active: item.is_active,
      has_detail: item.has_detail || false,
      keterangan_detail: item.keterangan_detail || ""
    });
    setError("");
    setShowModal(true);
  };

  const handleToggleActive = async (item: InspectionItem) => {
    try {
      await masterApi.updateItemPemeriksaanMasuk(item.id, { is_active: !item.is_active });
      fetchData();
      toast.success("Status diperbarui", `Status "${item.nama_item}" berhasil diubah.`);
    } catch (err: any) { toast.error("Gagal mengubah status", getErrorMessage(err, "Terjadi kesalahan.")); }
  };

  const handleDeleteClick = (id: number) => {
    setDeleteId(id);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await masterApi.deleteItemPemeriksaanMasuk(deleteId);
      setShowDeleteModal(false); fetchData();
      toast.success("Data dihapus", "Item pemeriksaan masuk berhasil dihapus.");
    } catch (err: unknown) {
      toast.error("Gagal menghapus", getErrorMessage(err, "Gagal menghapus data."));
    } finally { setDeleting(false); setDeleteId(null); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      if (editing) {
        await masterApi.updateItemPemeriksaanMasuk(editing.id, form);
        toast.success("Data diperbarui", `Item "${form.nama_item}" berhasil diperbarui.`);
      } else {
        await masterApi.createItemPemeriksaanMasuk(form);
        toast.success("Data disimpan", `Item "${form.nama_item}" berhasil ditambahkan.`);
      }
      setShowModal(false); fetchData();
    } catch (err: unknown) {
      const msg = getErrorMessage(err, "Gagal menyimpan data.");
      setError(msg);
      toast.error(editing ? "Gagal memperbarui" : "Gagal menyimpan", msg);
    } finally { setSaving(false); }
  };

  return (
    <div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setCollapsed(v => !v)} className="w-8 h-8 flex items-center justify-center rounded-lg transition-all hover:bg-white/10" title={collapsed ? "Expand" : "Collapse"} style={{ color: "var(--text-secondary)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.25s" }}><path d="m6 9 6 6 6-6" /></svg>
          </button>
          <div>
            <h1 className="page-title">Master Data — Checklist Masuk</h1>
            <p className="page-subtitle">Kelola item pemeriksaan saat kendaraan masuk (Main Gate Masuk)</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Import */}
          <div className="relative group">
            <button className="btn btn-secondary flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              <span>Import</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            <div className="absolute right-0 mt-1 w-52 border border-border rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50" style={{ background: "var(--bg-secondary)" }}>
              <button onClick={() => downloadImportTemplate("ChecklistMasuk", ["nama_item *", "kode", "tipe_jawaban", "keterangan", "urutan", "is_active (Ya/Tidak)"], [
                ["Kondisi Tangki", "KT", "Bagus,Tidak Bagus", "Periksa kebocoran", 1, "Ya"],
                ["Valve / Penutup", "VP", "Ada,Tidak Ada", "Cek kondisi valve", 2, "Ya"],
                ["Kebersihan Tangki", "KBT", "Bersih,Kotor", "Periksa sisa muatan", 3, "Ya"]
              ])} className="w-full text-left px-4 py-2 text-sm hover:bg-bg-card-hover first:rounded-t-xl flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                Unduh Template (.xlsx)
              </button>
              <label className="w-full text-left px-4 py-2 text-sm hover:bg-bg-card-hover last:rounded-b-xl flex items-center gap-2 cursor-pointer" style={{ color: "var(--text-primary)" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                Upload File Excel
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0]; if (!file) return;
                  e.target.value = "";
                  const { data, errors } = await parseExcelPreview(
                    file,
                    (row) => {
                      const nama = String(row["nama_item *"] ?? row["nama_item"] ?? "").trim();
                      if (!nama) return null;
                      return {
                        nama_item: nama,
                        kode: String(row["kode"] ?? "").trim() || "-",
                        tipe_jawaban: String(row["tipe_jawaban"] ?? "").trim() || "-",
                        keterangan: String(row["keterangan"] ?? "").trim() || "-",
                        urutan: parseInt(String(row["urutan"] ?? "0")) || 0,
                        is_active: String(row["is_active (Ya/Tidak)"] ?? row["is_active"] ?? "Ya").trim().toLowerCase() !== "tidak" ? "Ya" : "Tidak",
                      };
                    }
                  );
                  setImportData(data);
                  setImportErrors(errors);
                  setShowImportModal(true);
                  if (errors.length > 0) {
                    console.warn("Import preview errors:", errors);
                  }
                }} />
              </label>
            </div>
          </div>

          {/* Export */}
          <div className="relative group">
            <button className="btn btn-secondary flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
              <span>Export</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            <div className="absolute right-0 mt-1 w-44 border border-border rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50" style={{ background: "var(--bg-secondary)" }}>
              <button onClick={() => exportToExcel("Checklist_Masuk", ["ID","Kode","Nama Item","Tipe Jawaban","Urutan","Status"], data.map(i => [i.id, i.kode, i.nama_item, i.tipe_jawaban, i.urutan, i.is_active ? 'Aktif' : 'Nonaktif']))} className="w-full text-left px-4 py-2 text-sm hover:bg-bg-card-hover first:rounded-t-xl" style={{ color: "var(--text-primary)" }}>Excel (.xlsx)</button>
              <button onClick={() => setIsPrinting(true)} className="w-full text-left px-4 py-2 text-sm hover:bg-bg-card-hover last:rounded-b-xl" style={{ color: "var(--text-primary)" }}>Cetak / PDF</button>
            </div>
          </div>

          <button id="btn-add-checklist" className="btn btn-primary flex items-center gap-2" onClick={openCreate}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>Tambah Item</span>
          </button>
        </div>
      </div>

      <div style={{ overflow: "hidden", maxHeight: collapsed ? "0px" : "9000px", transition: "max-height 0.4s cubic-bezier(0.4,0,0.2,1)", opacity: collapsed ? 0 : 1 }}>
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary pointer-events-none">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <input
            id="input-search-checklist"
            type="text"
            placeholder="Cari nama item checklist..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 pl-11 pr-4 rounded-xl text-sm transition-all focus:outline-none"
            style={{
              background: "var(--bg-secondary)",
              border: "1.5px solid var(--border)",
              color: "var(--text-primary)",
              fontFamily: "'Inter', sans-serif",
            }}
            onFocus={(e) => {
              e.currentTarget.style.border = "1.5px solid rgba(59, 130, 246, 0.5)";
              e.currentTarget.style.background = "var(--bg-card-hover)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.border = "1.5px solid var(--border)";
              e.currentTarget.style.background = "var(--bg-secondary)";
            }}
          />
        </div>
        <button className="btn btn-secondary" onClick={handleReset}>
          Reset
        </button>
      </div>

      <div className="glass-card overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-bg-primary">
              <th className="px-6 py-4 text-sm font-semibold text-secondary w-16 text-center">Urutan</th>
              <th className="px-6 py-4 text-sm font-semibold text-secondary">Nama Item</th>
              <th className="px-6 py-4 text-sm font-semibold text-secondary">Opsi</th>
              <th className="px-6 py-4 text-sm font-semibold text-secondary">Keterangan</th>
              <th className="px-6 py-4 text-sm font-semibold text-secondary">Status</th>
              <th className="px-6 py-4 text-sm font-semibold text-secondary text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-secondary">
                  Memuat data...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-secondary">
                  Tidak ada data.
                </td>
              </tr>
            ) : (
              data.map((item, idx) => (
                <tr key={item.id} className="border-b border-border hover:bg-bg-card-hover transition-colors group">
                  <td className="px-6 py-4 text-sm text-secondary font-mono text-center">{item.urutan}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{item.nama_item}</div>
                    <div className="text-[10px] text-secondary font-mono mt-0.5">{item.kode || "TANPA_KODE"}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(item.tipe_jawaban || "Bagus,Tidak Bagus").split(',').map((opt, i) => (
                        <span key={i} className="px-2 py-0.5 rounded text-[10px] text-secondary border bg-bg-primary border-border">
                          {opt.trim()}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-secondary">{item.keterangan || "-"}</td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleToggleActive(item)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-200 focus:outline-none ${
                        item.is_active 
                          ? "bg-green-500/20 border border-green-500/30" 
                          : "bg-red-500/20 border border-red-500/30"
                      }`}
                      title={item.is_active ? "Klik untuk Nonaktifkan" : "Klik untuk Aktifkan"}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full transition-transform duration-200 ${
                          item.is_active 
                            ? "translate-x-5 bg-green-400" 
                            : "translate-x-1 bg-red-400"
                        }`}
                      />
                    </button>
                    <p className={`text-[9px] mt-0.5 font-bold ${item.is_active ? "text-green-500/60" : "text-red-500/60"}`}>
                      {item.is_active ? "AKTIF" : "NONAKTIF"}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEdit(item)}
                        className="w-9 h-9 flex items-center justify-center text-blue-400 hover:bg-blue-400/10 rounded-xl transition-all"
                        title="Edit Item"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteClick(item.id)}
                        className="w-9 h-9 flex items-center justify-center text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                        title="Hapus"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>
                {editing ? "Edit Item" : "Tambah Item"}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ color: "var(--text-muted)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1.5">Nama Item</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={form.nama_item}
                    onChange={(e) => setForm({ ...form, nama_item: e.target.value })}
                    placeholder="Contoh: Kondisi Ban"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1.5">Kode Item</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={form.kode}
                    onChange={(e) => setForm({ ...form, kode: e.target.value })}
                    placeholder="Contoh: BAN_KONDISI"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1.5">Opsi Jawaban</label>
                <select
                  required
                  className="form-select"
                  value={form.tipe_jawaban}
                  onChange={(e) => setForm({ ...form, tipe_jawaban: e.target.value })}
                >
                  <option value="Bagus,Tidak Bagus">Bagus / Tidak Bagus</option>
                  <option value="Ada,Tidak Ada">Ada / Tidak Ada</option>
                  <option value="Terpasang,Tidak Terpasang">Terpasang / Tidak Terpasang</option>
                  <option value="Sesuai,Tidak Sesuai">Sesuai / Tidak Sesuai</option>
                  <option value="Lengkap,Tidak Lengkap">Lengkap / Tidak Lengkap</option>
                  <option value="Kosong,Sisa">Kosong / Sisa</option>
                  <option value="input">Isian Teks (Manual Input)</option>
                </select>
                <p className="text-[10px] text-secondary mt-2 italic">* Pilih pola jawaban yang akan muncul di form pemeriksaan.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1.5">Keterangan</label>
                <textarea
                  className="form-input min-h-[60px]"
                  value={form.keterangan}
                  onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                  placeholder="Keterangan tambahan..."
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="is_active"
                  className="w-4 h-4 rounded border-white/10 bg-white/5 text-primary focus:ring-primary"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                <label htmlFor="is_active" className="text-sm font-medium text-secondary cursor-pointer">
                  Item Aktif (Ditampilkan di form pemeriksaan)
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-1.5">Urutan Tampilan</label>
                <input
                  type="number"
                  required
                  className="form-input"
                  value={form.urutan}
                  onChange={(e) => setForm({ ...form, urutan: parseInt(e.target.value) || 0 })}
                  placeholder="Nomor urutan..."
                />
                <p className="text-[10px] text-slate-400 mt-1 italic">* Menentukan posisi item ini di form pemeriksaan.</p>
              </div>

              {error && <p className="text-sm text-red-400 bg-red-400/10 p-3 rounded-lg">{error}</p>}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary"
                  disabled={saving}
                >
                  Batal
                </button>
                <button type="submit" className="btn btn-primary min-w-[100px]" disabled={saving}>
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        loading={deleting}
        message="Menghapus item pemeriksaan ini dapat berpengaruh pada formulir pemeriksaan VCF yang sudah ada secara permanen. Lanjutkan?"
      />

      {isPrinting && (
        <PrintMasterTable
          title="Master Data — Checklist Masuk"
          subtitle="Item pemeriksaan kendaraan saat masuk (Main Gate Masuk)"
          headers={["Urutan", "Nama Item", "Kode", "Tipe Jawaban", "Keterangan", "Status"]}
          data={data.map(i => [i.urutan, i.nama_item, i.kode, i.tipe_jawaban, i.keterangan, i.is_active ? "Aktif" : "Nonaktif"])}
          onClose={() => setIsPrinting(false)}
        />
      )}

      <ImportConfirmModal
        isOpen={showImportModal}
        onClose={() => { setShowImportModal(false); setImportData([]); setImportErrors([]); }}
        onConfirm={async (selectedData) => {
          setImportLoading(true);
          const result = await importDataBatch(
            selectedData,
            (data) => masterApi.createItemPemeriksaanMasuk({
              nama_item: data.nama_item,
              kode: data.kode === "-" ? null : data.kode,
              tipe_jawaban: data.tipe_jawaban === "-" ? null : data.tipe_jawaban,
              keterangan: data.keterangan === "-" ? null : data.keterangan,
              urutan: data.urutan,
              is_active: data.is_active === "Ya"
            })
          );
          setImportLoading(false);
          setShowImportModal(false);
          setImportData([]);
          fetchData();
          return result;
        }}
        onResult={(result) => {
          setImportResult(result);
          setShowResultModal(true);
        }}
        data={importData}
        columns={[
          { key: "urutan", label: "Urutan" },
          { key: "nama_item", label: "Nama Item" },
          { key: "kode", label: "Kode" },
          { key: "tipe_jawaban", label: "Tipe" },
          { key: "is_active", label: "Status" },
        ]}
        title="Konfirmasi Import Checklist Masuk"
        loading={importLoading}
      />

      <ImportResultModal
        isOpen={showResultModal}
        onClose={() => setShowResultModal(false)}
        success={importResult.success}
        failed={importResult.failed}
        errors={importResult.errors}
        title="Hasil Import Checklist Masuk"
      />
    </div>
  );
}