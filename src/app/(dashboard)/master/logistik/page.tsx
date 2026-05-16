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

interface Logistik {
  id: number;
  nama_logistik: string;
  is_active: boolean;
}

export default function LogistikPage() {
  const { toasts, removeToast, toast } = useToast();
  const [data, setData] = useState<Logistik[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Logistik | null>(null);
  const [form, setForm] = useState({ nama_logistik: "", is_active: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isPrinting, setIsPrinting] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [search, setSearch] = useState("");

  // Import states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [showResultModal, setShowResultModal] = useState(false);
  const [importResult, setImportResult] = useState({ success: 0, failed: 0, errors: [] as string[] });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      const res = await masterApi.getLogistik(params);
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
    setForm({ nama_logistik: "", is_active: true });
    setError("");
    setShowModal(true);
  };

  const openEdit = (item: Logistik) => {
    setEditing(item);
    setForm({ nama_logistik: item.nama_logistik, is_active: item.is_active });
    setError("");
    setShowModal(true);
  };

  const handleToggleActive = async (item: Logistik) => {
    try {
      await masterApi.updateLogistik(item.id, { is_active: !item.is_active });
      fetchData();
      toast.success("Status diperbarui", `Status "${item.nama_logistik}" berhasil diubah.`);
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
      await masterApi.deleteLogistik(deleteId);
      setShowDeleteModal(false); fetchData();
      toast.success("Data dihapus", "Data logistik berhasil dihapus.");
    } catch (err: any) {
      toast.error("Gagal menghapus", getErrorMessage(err, "Gagal menghapus data."));
    } finally { setDeleting(false); setDeleteId(null); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      if (editing) {
        await masterApi.updateLogistik(editing.id, form);
        toast.success("Data diperbarui", `Logistik "${form.nama_logistik}" berhasil diperbarui.`);
      } else {
        await masterApi.createLogistik(form);
        toast.success("Data disimpan", `Logistik "${form.nama_logistik}" berhasil ditambahkan.`);
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
            <h1 className="page-title">Master Data — Logistik</h1>
            <p className="page-subtitle">Kelola kategori logistik / tujuan pengiriman</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative group">
            <button className="btn btn-secondary flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              <span>Import</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            <div className="absolute right-0 mt-1 w-52 border border-border rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50" style={{ background: "var(--bg-secondary)" }}>
              <button onClick={() => downloadImportTemplate("Logistik", ["nama_logistik *", "is_active (Ya/Tidak)"], [
                ["CPO", "Ya"],["RBDPO", "Ya"],["Kernel", "Tidak"]
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
                      const nama = String(row["nama_logistik *"] ?? row["nama_logistik"] ?? "").trim();
                      if (!nama) return null;
                      return {
                        nama_logistik: nama,
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

          <div className="relative group">
            <button className="btn btn-secondary flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>Export</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>
            <div className="absolute right-0 mt-1 w-44 border border-border rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50" style={{ background: "var(--bg-secondary)" }}>
              <button onClick={() => exportToExcel("Data_Logistik", ["ID","Nama Logistik","Status"], data.map(i => [i.id, i.nama_logistik, i.is_active ? 'Aktif' : 'Nonaktif']))} className="w-full text-left px-4 py-2 text-sm hover:bg-bg-card-hover first:rounded-t-xl" style={{ color: "var(--text-primary)" }}>Excel (.xlsx)</button>
              <button onClick={() => setIsPrinting(true)} className="w-full text-left px-4 py-2 text-sm hover:bg-bg-card-hover last:rounded-b-xl" style={{ color: "var(--text-primary)" }}>Cetak / PDF</button>
            </div>
          </div>

          <button className="btn btn-primary flex items-center gap-2" onClick={openCreate}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>Tambah Logistik</span>
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
            type="text"
            placeholder="Cari nama logistik..."
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
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="px-6 py-4 text-sm font-semibold text-secondary">No.</th>
              <th className="px-6 py-4 text-sm font-semibold text-secondary">Nama Logistik</th>
              <th className="px-6 py-4 text-sm font-semibold text-secondary">Status</th>
              <th className="px-6 py-4 text-sm font-semibold text-secondary text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-secondary">Memuat data...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-secondary">Tidak ada data.</td></tr>
            ) : (
              data.map((item, idx) => (
                <tr key={item.id} className="border-b border-white/5 hover:bg-bg-card-hover transition-colors">
                  <td className="px-6 py-4 text-sm text-secondary">{idx + 1}</td>
                  <td className="px-6 py-4 text-sm font-medium text-white">{item.nama_logistik}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${item.is_active ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                      {item.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(item)} className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg></button>
                      <button onClick={() => handleDeleteClick(item.id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" /></svg></button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6 border-white/20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">{editing ? "Edit Logistik" : "Tambah Logistik"}</h2>
              <button onClick={() => setShowModal(false)} className="text-secondary hover:text-white transition-colors"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-1.5">Nama Logistik</label>
                <input type="text" required className="form-input" value={form.nama_logistik} onChange={(e) => setForm({ ...form, nama_logistik: e.target.value })} placeholder="Contoh: CPO, Kernel, dll." />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <input type="checkbox" id="is_active" className="w-4 h-4 rounded border-white/10 bg-white/5 text-primary focus:ring-primary" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                <label htmlFor="is_active" className="text-sm font-medium text-secondary cursor-pointer">Logistik Aktif</label>
              </div>
              {error && <p className="text-sm text-red-400 bg-red-400/10 p-3 rounded-lg">{error}</p>}
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary" disabled={saving}>Batal</button>
                <button type="submit" className="btn btn-primary min-w-[100px]" disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</button>
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
        message="Menghapus data logistik dapat mempengaruhi histori tujuan pengiriman pada formulir kontrol kendaraan. Lanjutkan?"
      />

      {isPrinting && (
        <PrintMasterTable
          title="Master Data — Logistik"
          subtitle="Daftar kategori logistik / tujuan pengiriman"
          headers={["Nama Logistik", "Status"]}
          data={data.map(i => [i.nama_logistik, i.is_active ? "Aktif" : "Nonaktif"])}
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
            (data) => masterApi.createLogistik({
              nama_logistik: data.nama_logistik,
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
          { key: "nama_logistik", label: "Nama Logistik" },
          { key: "is_active", label: "Status" },
        ]}
        title="Konfirmasi Import Logistik"
        loading={importLoading}
      />

      <ImportResultModal
        isOpen={showResultModal}
        onClose={() => setShowResultModal(false)}
        success={importResult.success}
        failed={importResult.failed}
        errors={importResult.errors}
        title="Hasil Import Logistik"
      />
    </div>
  );
}


