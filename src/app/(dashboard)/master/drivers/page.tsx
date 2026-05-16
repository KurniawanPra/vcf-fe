"use client";

import { useState, useEffect, useCallback } from "react";
import { masterApi } from "@/lib/api";
import { clearMasterDataCache } from "@/lib/masterDataCache";
import { exportToExcel } from "@/lib/exportUtils";
import { formatDate, getErrorMessage } from "@/lib/utils";
import * as XLSX from 'xlsx';
import PrintMasterTable from "@/components/print/PrintMasterTable";
import { downloadImportTemplate, parseExcelPreview, importDataBatch } from "@/lib/importTemplate";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import ImportConfirmModal from "@/components/ImportConfirmModal";
import ImportResultModal from "@/components/ImportResultModal";
import { useToast, ToastContainer } from "@/components/Toast";

interface Driver {
  id: number;
  nama_supir: string;
  no_sim: string;
  jenis_sim: string;
  tgl_berlaku_sim: string;
  is_active: boolean;
}

const SIM_TYPES = ["A", "B1", "B2", "B2 Umum", "BII Umum", "C", "D"];

export default function DriversPage() {
  const { toasts, removeToast, toast } = useToast();
  const [data, setData] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [form, setForm] = useState({
    nama_supir: "",
    no_sim: "",
    jenis_sim: "BII Umum",
    tgl_berlaku_sim: "",
    is_active: true,
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
      const dRes = await masterApi.getDrivers(params);
      setData(dRes.data.data || dRes.data);
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

  const handleReset = () => { setSearch(""); };

  const openCreate = () => {
    setEditing(null);
    setForm({ nama_supir: "", no_sim: "", jenis_sim: "BII Umum", tgl_berlaku_sim: "", is_active: true });
    setError("");
    setShowModal(true);
  };

  const handleEdit = (item: Driver) => {
    setEditing(item);
    setForm({
      nama_supir: item.nama_supir,
      no_sim: item.no_sim,
      jenis_sim: item.jenis_sim,
      tgl_berlaku_sim: item.tgl_berlaku_sim ? item.tgl_berlaku_sim.split('T')[0] : "",
      is_active: item.is_active,
    });
    setError("");
    setShowModal(true);
  };

  const handleToggleActive = async (item: Driver) => {
    try {
      await masterApi.updateDriver(item.id, { is_active: !item.is_active });
      clearMasterDataCache();
      fetchData();
      toast.success("Status diperbarui", `Status supir "${item.nama_supir}" berhasil diubah.`);
    } catch (err: any) {
      toast.error("Gagal mengubah status", getErrorMessage(err, "Terjadi kesalahan."));
    }
  };

  const handleDeleteClick = (id: number) => {
    setDeleteId(id);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await masterApi.deleteDriver(deleteId);
      clearMasterDataCache();
      setShowDeleteModal(false);
      fetchData();
      toast.success("Data dihapus", "Data supir berhasil dihapus.");
    } catch (err: any) {
      toast.error("Gagal menghapus", getErrorMessage(err, "Gagal menghapus data supir."));
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = { ...form };
      if (editing) {
        await masterApi.updateDriver(editing.id, payload);
        toast.success("Data diperbarui", `Supir "${form.nama_supir}" berhasil diperbarui.`);
      } else {
        await masterApi.createDriver(payload);
        toast.success("Data disimpan", `Supir "${form.nama_supir}" berhasil ditambahkan.`);
      }
      clearMasterDataCache();
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      const msg = getErrorMessage(err, "Gagal menyimpan data.");
      setError(msg);
      toast.error(editing ? "Gagal memperbarui" : "Gagal menyimpan", msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCollapsed(v => !v)}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all hover:bg-white/10"
            title={collapsed ? "Expand" : "Collapse"}
            style={{ color: "var(--text-secondary)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.25s" }}>
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <div>
            <h1 className="page-title">Master Data — Supir</h1>
            <p className="page-subtitle">Kelola data supir dan penugasan transporter utama</p>
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
              <button onClick={() => downloadImportTemplate("Supir", ["nama_supir *", "no_sim *", "jenis_sim", "tgl_berlaku_sim (YYYY-MM-DD)", "is_active (Ya/Tidak)"], [
                ["Budi Santoso", "1234567890", "BII Umum", "2026-12-31", "Ya"],
                ["Agus Salim", "0987654321", "B2", "2025-06-30", "Ya"],
                ["Hendra Wijaya", "1122334455", "B1", "2027-03-15", "Ya"]
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
                  const { data, errors } = await parseExcelPreview(file, (row) => {
                    const nama = String(row["nama_supir *"] ?? row["nama_supir"] ?? "").trim();
                    const sim = String(row["no_sim *"] ?? row["no_sim"] ?? "").trim();
                    if (!nama || !sim) return null;
                    return {
                      nama_supir: nama, no_sim: sim,
                      jenis_sim: String(row["jenis_sim"] ?? "BII Umum").trim() || "-",
                      tgl_berlaku_sim: String(row["tgl_berlaku_sim (YYYY-MM-DD)"] ?? row["tgl_berlaku_sim"] ?? "").trim() || "-",
                      is_active: String(row["is_active (Ya/Tidak)"] ?? row["is_active"] ?? "Ya").trim().toLowerCase() !== "tidak" ? "Ya" : "Tidak",
                    };
                  });
                  setImportData(data); setImportErrors(errors); setShowImportModal(true);
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
              <button onClick={() => exportToExcel("Data_Supir", ["Nama Supir","No SIM","Jenis SIM","Berlaku SIM","Status"], data.map(d => [d.nama_supir, d.no_sim, d.jenis_sim, d.tgl_berlaku_sim ? d.tgl_berlaku_sim.split('T')[0] : "-", d.is_active ? 'Aktif' : 'Nonaktif']))} className="w-full text-left px-4 py-2 text-sm hover:bg-bg-card-hover first:rounded-t-xl" style={{ color: "var(--text-primary)" }}>Excel (.xlsx)</button>
              <button onClick={() => setIsPrinting(true)} className="w-full text-left px-4 py-2 text-sm hover:bg-bg-card-hover last:rounded-b-xl" style={{ color: "var(--text-primary)" }}>Cetak / PDF</button>
            </div>
          </div>

          <button id="btn-add-driver" className="btn btn-primary flex items-center gap-2" onClick={openCreate}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
            <span>Tambah Supir</span>
          </button>
        </div>
      </div>

      {/* Collapsible content */}
      <div style={{
        overflow: "hidden",
        maxHeight: collapsed ? "0px" : "9000px",
        transition: "max-height 0.4s cubic-bezier(0.4,0,0.2,1)",
        opacity: collapsed ? 0 : 1,
      }}>
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary pointer-events-none">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
            </div>
            <input
              id="input-search-driver"
              type="text"
              placeholder="Cari nama supir atau no SIM..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 pl-11 pr-4 rounded-xl text-sm transition-all focus:outline-none"
              style={{ background: "var(--bg-secondary)", border: "1.5px solid var(--border)", color: "var(--text-primary)", fontFamily: "'Inter', sans-serif" }}
              onFocus={(e) => { e.currentTarget.style.border = "1.5px solid rgba(59, 130, 246, 0.5)"; e.currentTarget.style.background = "var(--bg-card-hover)"; }}
              onBlur={(e) => { e.currentTarget.style.border = "1.5px solid var(--border)"; e.currentTarget.style.background = "var(--bg-secondary)"; }}
            />
          </div>
          <button className="btn btn-secondary" onClick={handleReset}>Reset</button>
        </div>

        <div className="glass-card overflow-hidden overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16"><div className="spinner" /></div>
          ) : (
            <table className="data-table">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-6 py-4 text-sm font-semibold text-secondary w-16 text-center">No.</th>
                  <th className="px-6 py-4 text-sm font-semibold text-secondary">Nama Supir</th>
                  <th className="px-6 py-4 text-sm font-semibold text-secondary">No. SIM</th>
                  <th className="px-6 py-4 text-sm font-semibold text-secondary">Jenis SIM</th>
                  <th className="px-6 py-4 text-sm font-semibold text-secondary">Berlaku s/d</th>
                  <th className="px-6 py-4 text-sm font-semibold text-secondary text-center">Status</th>
                  <th className="px-6 py-4 text-sm font-semibold text-secondary text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-muted">Tidak ada data supir ditemukan.</td></tr>
                ) : (
                  data.map((item, idx) => (
                    <tr key={item.id} className="border-b border-white/5 hover:bg-bg-card-hover transition-colors group">
                      <td className="px-6 py-4 text-center text-xs text-secondary font-mono">{idx + 1}</td>
                      <td className="px-6 py-4 font-medium text-text-primary dark:text-white">{item.nama_supir}</td>
                      <td className="px-6 py-4 font-mono text-xs text-secondary">{item.no_sim}</td>
                      <td className="px-6 py-4 text-sm text-secondary">{item.jenis_sim}</td>
                      <td className="px-6 py-4 text-xs text-secondary">{item.tgl_berlaku_sim ? item.tgl_berlaku_sim.split('T')[0] : "-"}</td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => handleToggleActive(item)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-200 focus:outline-none ${item.is_active ? "bg-green-500/20 border border-green-500/30" : "bg-red-500/20 border border-red-500/30"}`} title={item.is_active ? "Klik untuk Nonaktifkan" : "Klik untuk Aktifkan"}>
                          <span className={`inline-block h-3 w-3 transform rounded-full transition-transform duration-200 ${item.is_active ? "translate-x-5 bg-green-400" : "translate-x-1 bg-red-400"}`} />
                        </button>
                        <p className={`text-[9px] mt-0.5 font-bold ${item.is_active ? "text-green-500/60" : "text-red-500/60"}`}>{item.is_active ? "AKTIF" : "NONAKTIF"}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => handleEdit(item)} className="w-9 h-9 flex items-center justify-center text-blue-400 hover:bg-blue-400/10 rounded-xl transition-all" title="Edit">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                          </button>
                          <button onClick={() => handleDeleteClick(item.id)} className="w-9 h-9 flex items-center justify-center text-red-400 hover:bg-red-400/10 rounded-xl transition-all" title="Hapus">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" /></svg>
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
              <h2 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>{editing ? "Edit Supir" : "Tambah Supir"}</h2>
              <button onClick={() => setShowModal(false)} style={{ color: "var(--text-muted)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            {error && (<div className="mb-4 p-3 rounded-lg text-sm" style={{ background: "rgba(239,68,68,0.1)", color: "#fca5a5" }}>⚠️ {error}</div>)}
            <form onSubmit={handleSave}>
              <div className="mb-4">
                <label className="form-label">Nama Supir *</label>
                <input id="input-nama-supir" type="text" className="form-input" required value={form.nama_supir} onChange={(e) => setForm((p) => ({ ...p, nama_supir: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="form-label">No. SIM *</label>
                  <input id="input-no-sim" type="text" className="form-input" required value={form.no_sim} onChange={(e) => setForm((p) => ({ ...p, no_sim: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Jenis SIM</label>
                  <select id="input-jenis-sim" className="form-select" value={form.jenis_sim} onChange={(e) => setForm((p) => ({ ...p, jenis_sim: e.target.value }))}>
                    {SIM_TYPES.map((j) => (<option key={j} value={j}>{j}</option>))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Berlaku s/d</label>
                  <input id="input-tgl-berlaku-sim" type="date" className="form-input" value={form.tgl_berlaku_sim} onChange={(e) => setForm((p) => ({ ...p, tgl_berlaku_sim: e.target.value }))} />
                </div>
              </div>
              <div className="mb-6 flex items-center gap-3">
                <input id="check-active-driver" type="checkbox" checked={form.is_active} onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))} style={{ width: 16, height: 16 }} />
                <label htmlFor="check-active-driver" className="text-sm" style={{ color: "var(--text-secondary)" }}>Aktif</label>
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                <button id="btn-save-driver" type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><span className="spinner" /> Menyimpan...</> : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isPrinting && (
        <PrintMasterTable
          title="Master Data — Supir"
          subtitle="Daftar data supir dan SIM terdaftar"
          headers={["Nama Supir", "No. SIM", "Jenis SIM", "Berlaku s/d", "Status"]}
          data={data.map(d => [d.nama_supir, d.no_sim, d.jenis_sim, d.tgl_berlaku_sim ? d.tgl_berlaku_sim.split('T')[0] : "-", d.is_active ? "Aktif" : "Nonaktif"])}
          onClose={() => setIsPrinting(false)}
        />
      )}

      <ImportConfirmModal
        isOpen={showImportModal}
        onClose={() => { setShowImportModal(false); setImportData([]); setImportErrors([]); }}
        onConfirm={async (selectedData) => {
          setImportLoading(true);
          const result = await importDataBatch(selectedData, (data) => masterApi.createDriver({
            nama_supir: data.nama_supir, no_sim: data.no_sim,
            jenis_sim: data.jenis_sim === "-" ? "BII Umum" : data.jenis_sim,
            tgl_berlaku_sim: data.tgl_berlaku_sim === "-" ? null : data.tgl_berlaku_sim,
            is_active: data.is_active === "Ya"
          }));
          setImportLoading(false); setShowImportModal(false); setImportData([]);
          clearMasterDataCache(); fetchData();
          return result;
        }}
        onResult={(result) => { setImportResult(result); setShowResultModal(true); }}
        data={importData}
        columns={[{ key: "nama_supir", label: "Nama Supir" }, { key: "no_sim", label: "No. SIM" }, { key: "jenis_sim", label: "Jenis SIM" }, { key: "tgl_berlaku_sim", label: "Berlaku s/d" }, { key: "is_active", label: "Status" }]}
        title="Konfirmasi Import Supir"
        loading={importLoading}
      />

      <ImportResultModal isOpen={showResultModal} onClose={() => setShowResultModal(false)} success={importResult.success} failed={importResult.failed} errors={importResult.errors} title="Hasil Import Supir" />

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setDeleteId(null); }}
        onConfirm={handleDeleteConfirm}
        loading={deleting}
        title="Hapus Data Supir"
        message="Apakah Anda yakin ingin menghapus data supir ini secara permanen? Tindakan ini tidak dapat dibatalkan."
      />
    </div>
  );
}
