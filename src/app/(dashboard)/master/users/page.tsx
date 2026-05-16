"use client";

import { useState, useEffect, useCallback } from "react";
import { masterApi } from "@/lib/api";
import { exportToExcel, exportToPDF, exportToDocx } from "@/lib/exportUtils";
import { getErrorMessage } from "@/lib/utils";
import * as XLSX from 'xlsx';
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import { parseExcelPreview, importDataBatch } from "@/lib/importTemplate";
import ImportConfirmModal from "@/components/ImportConfirmModal";
import ImportResultModal from "@/components/ImportResultModal";
import { useToast, ToastContainer } from "@/components/Toast";

interface User {
  id: number;
  nama: string;
  username: string;
  role: string;
  urutan: number;
  is_active: boolean;
}

export default function UsersPage() {
  const { toasts, removeToast, toast } = useToast();
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({
    nama: "",
    username: "",
    password: "",
    password_confirmation: "",
    role: "petugas",
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
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
  const [filterRole, setFilterRole] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (filterRole) params.role = filterRole;
      
      const res = await masterApi.getUsers(params);
      setData(res.data.data || res.data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [search, filterRole]);

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
    setFilterRole("");
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      nama: "",
      username: "",
      password: "",
      password_confirmation: "",
      role: "petugas",
      is_active: true,
    });
    setError("");
    setShowModal(true);
  };

  const handleEdit = (item: User) => {
    setEditing(item);
    setForm({
      nama: item.nama,
      username: item.username,
      password: "",
      password_confirmation: "",
      role: item.role,
      is_active: item.is_active,
    });
    setError("");
    setShowModal(true);
  };

  const handleToggleActive = async (item: User) => {
    try {
      await masterApi.updateUser(item.id, { is_active: !item.is_active });
      fetchData();
      toast.success("Status diperbarui", `Status "${item.nama}" berhasil diubah.`);
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
      await masterApi.deleteUser(deleteId);
      setShowDeleteModal(false); fetchData();
      toast.success("Pengguna dihapus", "Akun pengguna berhasil dihapus.");
    } catch (err: unknown) {
      toast.error("Gagal menghapus", getErrorMessage(err, "Gagal menghapus pengguna."));
    } finally { setDeleting(false); setDeleteId(null); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    // Validation
    if (!editing || form.password) {
      if (form.password.length < 8) {
        setError("Password minimal harus 8 karakter.");
        setSaving(false);
        return;
      }
      if (form.password !== form.password_confirmation) {
        setError("Konfirmasi password tidak cocok.");
        setSaving(false);
        return;
      }
    }

    try {
      if (editing) {
        const payload: any = { ...form };
        if (!payload.password) {
          delete payload.password;
          delete payload.password_confirmation;
        }
        await masterApi.updateUser(editing.id, payload);
      } else {
        await masterApi.createUser(form);
      }
      setShowModal(false); fetchData();
      toast.success(editing ? "Pengguna diperbarui" : "Pengguna ditambahkan", `Akun "${form.nama}" berhasil ${editing ? "diperbarui" : "dibuat"}.`);
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
            <h1 className="page-title">Master Data — Pengguna</h1>
            <p className="page-subtitle">Kelola akun dan hak akses petugas</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Import */}
          <div className="relative">
            <input 
              type="file" 
              id="import-excel" 
              accept=".xlsx, .xls" 
              className="hidden" 
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                e.target.value = "";
                const { data, errors } = await parseExcelPreview(
                  file,
                  (row) => {
                    const nama = String(row["nama *"] ?? row["nama"] ?? "").trim();
                    const username = String(row["username *"] ?? row["username"] ?? "").trim();
                    const password = String(row["password *"] ?? row["password"] ?? "").trim();
                    if (!nama || !username || !password) return null;
                    return {
                      nama,
                      username,
                      password,
                      role: String(row["role"] ?? "petugas").trim(),
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
              }}
            />
            <button
              onClick={() => document.getElementById('import-excel')?.click()}
              className="btn btn-secondary flex items-center gap-2"
              title="Import dari Excel"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Import</span>
            </button>
          </div>

          {/* Export Dropdown */}
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
            <div className="absolute right-0 mt-1 w-40 bg-bg-secondary border border-border rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <button 
                onClick={() => {
                  const headers = ["ID", "Nama", "Username", "Role", "Status"];
                  const dataArr = data.map(u => [u.id, u.nama, u.username, u.role, u.is_active ? 'Aktif' : 'Nonaktif']);
                  exportToExcel("Data_Pengguna", headers, dataArr);
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-bg-card-hover first:rounded-t-xl"
              >
                Excel (.xlsx)
              </button>
              <button 
                onClick={async () => {
                  const headers = ["ID", "Nama", "Username", "Role", "Status"];
                  const dataArr = data.map(u => [u.id, u.nama, u.username, u.role, u.is_active ? 'Aktif' : 'Nonaktif']);
                  await exportToPDF("Data_Pengguna", "Laporan Master Data Pengguna", headers, dataArr);
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-bg-card-hover"
              >
                PDF (.pdf)
              </button>
              <button 
                onClick={async () => {
                  const headers = ["ID", "Nama", "Username", "Role", "Status"];
                  const dataArr = data.map(u => [u.id, u.nama, u.username, u.role, u.is_active ? 'Aktif' : 'Nonaktif']);
                  await exportToDocx("Data_Pengguna", "Laporan Master Data Pengguna", headers, dataArr);
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-bg-card-hover last:rounded-b-xl"
              >
                Word (.docx)
              </button>
            </div>
          </div>

          <button id="btn-add-user" className="btn btn-primary" onClick={openCreate}>
            + Tambah Pengguna
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
              id="input-search-user"
              type="text"
              placeholder="Cari nama atau username..."
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
        <div className="w-[180px]">
          <select
            className="form-select"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <option value="">— Semua Role —</option>
            <option value="admin">Admin</option>
            <option value="petugas">Petugas</option>
          </select>
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
              <tr>
                <th className="w-12 text-center">No.</th>
                <th>Nama</th>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted">
                    Tidak ada data pengguna ditemukan.
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id}>
                    <td className="text-center font-mono text-xs text-muted">{item.urutan}</td>
                    <td className="font-medium">{item.nama}</td>
                    <td className="font-mono text-xs text-secondary">{item.username}</td>
                    <td>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded"
                        style={{
                          background: item.role === "admin" ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.06)",
                          color: item.role === "admin" ? "#60a5fa" : "var(--text-secondary)",
                          border: `1px solid ${item.role === "admin" ? "rgba(59,130,246,0.3)" : "var(--border-light)"}`,
                        }}
                      >
                        {item.role.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggleActive(item)}
                        className={`flex items-center gap-2 px-2 py-1 rounded-full text-[10px] font-bold transition-all ${
                          item.is_active 
                            ? "bg-green-500/20 text-green-400 border border-green-500/30" 
                            : "bg-red-500/20 text-red-400 border border-red-500/30"
                        }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${item.is_active ? "bg-green-400" : "bg-red-400"}`} />
                        {item.is_active ? "AKTIF" : "NONAKTIF"}
                      </button>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          id={`btn-edit-user-${item.id}`}
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleEdit(item)}
                        >
                          Edit
                        </button>
                        <button
                          id={`btn-delete-user-${item.id}`}
                          className="btn btn-sm"
                          onClick={() => handleDeleteClick(item.id)}
                          style={{
                            background: "rgba(239,68,68,0.1)",
                            color: "#f87171",
                            border: "1px solid rgba(239,68,68,0.2)",
                          }}
                        >
                          Hapus
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
                {editing ? "Edit Pengguna" : "Tambah Pengguna"}
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
                <label className="form-label">Nama Lengkap *</label>
                <input
                  id="input-nama-user"
                  type="text"
                  className="form-input"
                  required
                  value={form.nama}
                  onChange={(e) => setForm((p) => ({ ...p, nama: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="form-label">Username *</label>
                  <input
                    id="input-username-user"
                    type="text"
                    className="form-input"
                    required
                    value={form.username}
                    onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="form-label">Role</label>
                  <select
                    id="select-role-user"
                    className="form-select"
                    value={form.role}
                    onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                  >
                    <option value="petugas">Petugas</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="form-label">{editing ? "Password Baru" : "Password *"}</label>
                  <input
                    id="input-password-user"
                    type="password"
                    className="form-input"
                    required={!editing}
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="form-label">Konfirmasi Password</label>
                  <input
                    id="input-password-confirm-user"
                    type="password"
                    className="form-input"
                    required={!editing && !!form.password}
                    value={form.password_confirmation}
                    onChange={(e) => setForm((p) => ({ ...p, password_confirmation: e.target.value }))}
                  />
                </div>
              </div>
              <div className="mb-6 flex items-center gap-3">
                <input
                  id="check-active-user"
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                  style={{ width: 16, height: 16 }}
                />
                <label htmlFor="check-active-user" className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Aktif
                </label>
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Batal
                </button>
                <button id="btn-save-user" type="submit" className="btn btn-primary" disabled={saving}>
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
        onClose={() => { setShowDeleteModal(false); setDeleteId(null); }}
        onConfirm={handleDeleteConfirm}
        loading={deleting}
        title="Hapus Pengguna"
        message="Apakah Anda yakin ingin menghapus akun pengguna ini? Petugas tersebut tidak akan bisa lagi mengakses sistem VCF."
      />
    </div>
  );
}


