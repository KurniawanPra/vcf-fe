"use client";

import { useState, useEffect, useCallback } from "react";
import { masterApi } from "@/lib/api";
import { exportToExcel } from "@/lib/exportUtils";
import { getErrorMessage } from "@/lib/utils";
import ImportConfirmModal from "@/components/ImportConfirmModal";
import ImportResultModal from "@/components/ImportResultModal";
import PrintMasterTable from "@/components/print/PrintMasterTable";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import { downloadImportTemplate, parseExcelPreview, importDataBatch } from "@/lib/importTemplate";
import { useToast, ToastContainer } from "@/components/Toast";

interface ChecklistItem {
  id: number;
  nama_item: string;
  keterangan: string;
  urutan: number;
  is_active: boolean;
}

export default function ChecklistPage() {
  const { toasts, removeToast, toast } = useToast();
  const [data, setData] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ChecklistItem | null>(null);
  const [form, setForm] = useState({ nama_item: "", keterangan: "", urutan: 0, is_active: true });
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
      const res = await masterApi.getItemKelengkapanSupir(params);
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
    setForm({ nama_item: "", keterangan: "", urutan: data.length + 1, is_active: true });
    setError("");
    setShowModal(true);
  };

  const openEdit = (item: ChecklistItem) => {
    setEditing(item);
    setForm({
      nama_item: item.nama_item,
      keterangan: item.keterangan || "",
      urutan: item.urutan,
      is_active: !!item.is_active,
    });
    setError("");
    setShowModal(true);
  };

  const handleToggleActive = async (item: ChecklistItem) => {
    try {
      await masterApi.updateItemKelengkapanSupir(item.id, { is_active: !item.is_active });
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
      await masterApi.deleteItemKelengkapanSupir(deleteId);
      setShowDeleteModal(false); fetchData();
      toast.success("Data dihapus", "Item checklist supir berhasil dihapus.");
    } catch (err: any) {
      toast.error("Gagal menghapus", getErrorMessage(err, "Gagal menghapus data."));
    } finally { setDeleting(false); setDeleteId(null); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      const payload = { ...form, keterangan: form.keterangan.trim() || "-" };
      if (editing) {
        await masterApi.updateItemKelengkapanSupir(editing.id, payload);
        toast.success("Data diperbarui", `Item "${form.nama_item}" berhasil diperbarui.`);
      } else {
        await masterApi.createItemKelengkapanSupir(payload);
        toast.success("Data disimpan", `Item "${form.nama_item}" berhasil ditambahkan.`);
      }
      setShowModal(false); fetchData();
    } catch (err: any) {
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
            <h1 className="page-title">Master Data — Item Checklist Supir</h1>
            <p className="page-subtitle">Kelola item pemeriksaan kelengkapan supir</p>
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
              <button onClick={() => downloadImportTemplate("ChecklistSupir", ["nama_item *", "keterangan", "urutan", "is_active (Ya/Tidak)"], [
                ["SIM", "Surat Izin Mengemudi aktif", 1, "Ya"],
                ["KTP", "Kartu Tanda Penduduk", 2, "Ya"],
                ["Seragam Kerja", "Pakaian safety standar", 3, "Ya"]
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
              <button onClick={() => exportToExcel("Data_Checklist", ["ID","Nama Item","Keterangan","Urutan","Status"], data.map(i => [i.id, i.nama_item, i.keterangan, i.urutan, i.is_active ? 'Aktif' : 'Nonaktif']))} className="w-full text-left px-4 py-2 text-sm hover:bg-bg-card-hover first:rounded-t-xl" style={{ color: "var(--text-primary)" }}>Excel (.xlsx)</button>
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
            className="w-full h-11 pl-11 pr-4 rounded-xl text-sm transition-all focus:outline-none shadow-sm"
            style={{
              background: "var(--bg-secondary)",
              border: "1.5px solid var(--border)",
              color: "var(--text-primary)",
              fontFamily: "'Inter', sans-serif",
            }}
          />
        </div>
        <button className="btn btn-secondary" onClick={handleReset}>
          Reset
        </button>
      </div>

      <div className="glass-card overflow-hidden overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="spinner" />
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-6 py-4 text-sm font-semibold text-secondary w-16">Urutan</th>
                <th className="px-6 py-4 text-sm font-semibold text-secondary">Nama Item</th>
                <th className="px-6 py-4 text-sm font-semibold text-secondary">Keterangan</th>
                <th className="px-6 py-4 text-sm font-semibold text-secondary">Status</th>
                <th className="px-6 py-4 text-sm font-semibold text-secondary text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-muted">
                    Tidak ada data ditemukan.
                  </td>
                </tr>
              ) : (
                data.map((item, idx) => (
                  <tr key={item.id} className="border-b border-white/5 hover:bg-bg-card-hover transition-colors group">
                    <td className="px-6 py-4 text-sm text-secondary font-mono">{item.urutan}</td>
                    <td className="px-6 py-4 font-medium text-white">{item.nama_item}</td>
                    <td className="px-6 py-4 text-sm text-secondary">{item.keterangan || "—"}</td>
                    <td className="px-6 py-4">
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
                          className="w-9 h-9 flex items-center justify-center text-violet-400 hover:bg-violet-400/10 rounded-xl transition-all"
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
        )}
      </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>
                {editing ? "Edit Item Checklist" : "Tambah Item Checklist"}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ color: "var(--text-muted)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            {error && (
              <div
                className="mb-4 p-3 rounded-lg text-sm"
                style={{ background: "rgba(239,68,68,0.1)", color: "#fca5a5" }}
              >
                ⚠️ {error}
              </div>
            )}
            <form onSubmit={handleSave}>
              <div className="mb-4">
                <label className="form-label">Nama Item *</label>
                <input
                  id="input-nama-item"
                  type="text"
                  className="form-input"
                  required
                  value={form.nama_item}
                  onChange={(e) => setForm((p) => ({ ...p, nama_item: e.target.value }))}
                  placeholder="Contoh: SPB/DO, Seragam, Sepatu dan Helm, ID Card"
                />
              </div>

              <div className="mb-4">
                <label className="form-label">Keterangan</label>
                <input
                  id="input-keterangan-checklist"
                  type="text"
                  className="form-input"
                  value={form.keterangan}
                  onChange={(e) => setForm((p) => ({ ...p, keterangan: e.target.value }))}
                />
              </div>

              <div className="mb-4">
                <label className="form-label">Urutan Tampilan</label>
                <input
                  id="input-urutan-checklist"
                  type="number"
                  className="form-input"
                  required
                  value={form.urutan}
                  onChange={(e) => setForm((p) => ({ ...p, urutan: parseInt(e.target.value) || 0 }))}
                />
                <p className="text-[10px] text-slate-400 mt-1 italic">* Menentukan posisi item ini di form registrasi</p>
              </div>
              <div className="mb-6 flex items-center gap-3">
                <input
                  id="check-active-checklist"
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                  style={{ width: 16, height: 16 }}
                />
                <label htmlFor="check-active-checklist" className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Aktif
                </label>
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Batal
                </button>
                <button id="btn-save-checklist" type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? (
                    <>
                      <span className="spinner" /> Menyimpan...
                    </>
                  ) : (
                    "Simpan"
                  )}
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
        message="Menghapus item checklist dapat mempengaruhi formulir pemeriksaan yang sudah ada. Lanjutkan?"
      />

      {isPrinting && (
        <PrintMasterTable
          title="Master Data — Item Checklist Supir"
          subtitle="Daftar item pemeriksaan kelengkapan supir sebelum kendaraan masuk area"
          headers={["Urutan", "Nama Item", "Keterangan", "Status"]}
          data={data.map(i => [i.urutan, i.nama_item, i.keterangan || "-", i.is_active ? 'Aktif' : 'Nonaktif'])}
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
            (data) => masterApi.createItemKelengkapanSupir({
              nama_item: data.nama_item,
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
          { key: "keterangan", label: "Keterangan" },
          { key: "is_active", label: "Status" },
        ]}
        title="Konfirmasi Import Item Checklist"
        loading={importLoading}
      />

      <ImportResultModal
        isOpen={showResultModal}
        onClose={() => setShowResultModal(false)}
        success={importResult.success}
        failed={importResult.failed}
        errors={importResult.errors}
        title="Hasil Import Item Checklist"
      />
    </div>
  );
}
