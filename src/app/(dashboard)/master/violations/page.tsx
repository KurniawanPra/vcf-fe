"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { violationApi, masterApi } from "@/lib/api";
import { isAdmin } from "@/lib/auth";
import { getErrorMessage } from "@/lib/utils";
import { useToast, ToastContainer } from "@/components/Toast";
import { createPortal } from "react-dom";
import Pagination from "@/components/Pagination";

interface Driver {
  id: number;
  nama_supir: string;
  no_sim: string;
  status: "normal" | "warning" | "blacklist";
}

interface Violation {
  id: number;
  driver_id: number | null;
  no_polisi: string | null;
  jenis_pelanggaran: string;
  keterangan: string | null;
  tanggal_pelanggaran: string;
  created_at: string;
  driver?: { id: number; nama_supir: string; no_sim: string; status: string } | null;
  created_by_user?: { nama: string } | null;
}

function fmt(d: string) {
  try { return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }); } catch { return d; }
}

// ─── Collapsible Section ──────────────────────────────────────────────────────
function CollapsibleSection({
  title, count, colorClass, icon, defaultOpen = true, children, loading,
}: {
  title: string; count: number; colorClass: string; icon: React.ReactNode;
  defaultOpen?: boolean; children: React.ReactNode; loading?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="glass-card overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors"
        onClick={() => setOpen(p => !p)}
      >
        <div className="flex items-center gap-3">
          <span className={`w-8 h-8 rounded-xl flex items-center justify-center ${colorClass}`}>{icon}</span>
          <span className="font-bold text-text-primary">{title}</span>
          <span className={`text-xs font-black px-2 py-0.5 rounded-full ${colorClass}`}>{count}</span>
        </div>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          className={`text-text-muted transition-transform duration-200 ${open ? "rotate-0" : "-rotate-90"}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-white/5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-current/20 border-t-current animate-spin text-text-muted" />
              <span className="text-xs text-text-muted">Memuat data...</span>
            </div>
          ) : children}
        </div>
      )}
    </div>
  );
}

// ─── Driver Table (Blacklist / Warning) ───────────────────────────────────────
function DriverTable({
  drivers, status, updatingId, onAction, onUnlock,
}: {
  drivers: Driver[];
  status: "blacklist" | "warning";
  updatingId: number | null;
  onAction: (d: Driver, s: "normal" | "warning" | "blacklist") => void;
  onUnlock: (d: Driver) => void;
}) {
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filtered = drivers.filter(d => {
    if (!search) return true;
    return d.nama_supir.toLowerCase().includes(search.toLowerCase()) ||
      d.no_sim.toLowerCase().includes(search.toLowerCase());
  });

  const isRed = status === "blacklist";

  return (
    <div>
      {/* Filters */}
      <div className="px-5 py-3 flex flex-wrap items-center gap-3 border-b border-white/5 bg-white/2">
        <div className="relative">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text" className="form-input h-8 text-xs pl-7 w-44"
            placeholder="Cari nama / SIM..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-text-muted font-semibold uppercase tracking-wide">Tanggal</span>
          <input type="date" className="form-input h-8 text-xs w-34" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <span className="text-text-muted text-xs font-bold">–</span>
          <input type="date" className="form-input h-8 text-xs w-34" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        <button
          className={`h-8 px-3 rounded-lg text-xs font-semibold border transition-all ${
            search || dateFrom || dateTo
              ? "bg-slate-500/15 border-slate-400/30 text-text-primary hover:bg-slate-500/25"
              : "bg-transparent border-white/5 text-text-muted opacity-40 cursor-not-allowed"
          }`}
          onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); }}
          disabled={!search && !dateFrom && !dateTo}
        >Reset Filter</button>
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-10 text-text-muted text-sm">Tidak ada driver ditemukan.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr className={`border-b ${isRed ? "border-red-500/10 bg-red-500/3" : "border-amber-500/10 bg-amber-500/3"}`}>
                <th className="px-5 py-3 text-xs font-semibold text-secondary text-left">Nama Supir</th>
                <th className="px-5 py-3 text-xs font-semibold text-secondary text-left">No. SIM</th>
                <th className="px-5 py-3 text-xs font-semibold text-secondary text-center">Status</th>
                <th className="px-5 py-3 text-xs font-semibold text-secondary text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id} className={`border-b border-white/5 transition-colors ${isRed ? "bg-red-500/3 hover:bg-red-500/6" : "bg-amber-500/3 hover:bg-amber-500/6"}`}>
                  <td className="px-5 py-3 font-semibold text-text-primary text-sm">{d.nama_supir}</td>
                  <td className="px-5 py-3 font-mono text-xs text-text-muted">{d.no_sim}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${
                      isRed ? "bg-red-500/15 text-red-500" : "bg-amber-500/15 text-amber-600"
                    }`}>{d.status}</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {isRed ? (
                        <button
                          className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/20 transition-all flex items-center gap-1.5"
                          onClick={() => onUnlock(d)} disabled={updatingId === d.id}
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                          Buka Blacklist
                        </button>
                      ) : (
                        <>
                          <button
                            className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-all"
                            onClick={() => onAction(d, "blacklist")} disabled={updatingId === d.id}
                          >Blacklist</button>
                          <button
                            className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/20 transition-all"
                            onClick={() => onAction(d, "normal")} disabled={updatingId === d.id}
                          >Normalkan</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Violation History Table ───────────────────────────────────────────────────
function ViolationTable({
  violations, loading, drivers, updatingId, onEdit, onDelete, onStatusChange,
}: {
  violations: Violation[]; loading: boolean; drivers: Driver[];
  updatingId: number | null;
  onEdit: (v: Violation) => void;
  onDelete: (id: number) => void;
  onStatusChange: (d: Driver, s: "normal" | "warning" | "blacklist") => void;
}) {
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const filtered = violations.filter(v => {
    const q = search.toLowerCase();
    if (q && !(
      v.driver?.nama_supir?.toLowerCase().includes(q) ||
      (v.no_polisi ?? "").toLowerCase().includes(q) ||
      v.jenis_pelanggaran.toLowerCase().includes(q)
    )) return false;
    if (filterStatus && (v.driver?.status ?? "normal") !== filterStatus) return false;
    if (dateFrom && v.tanggal_pelanggaran < dateFrom) return false;
    if (dateTo && v.tanggal_pelanggaran > dateTo + "T23:59:59") return false;
    return true;
  });

  return (
    <div>
      {/* Filters */}
      <div className="px-5 py-3 flex flex-wrap items-center gap-3 border-b border-white/5 bg-white/2">
        <div className="relative">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text" className="form-input h-8 text-xs pl-7 w-44"
            placeholder="Cari driver / BK / jenis..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-text-muted font-semibold uppercase tracking-wide">Tanggal</span>
          <input type="date" className="form-input h-8 text-xs w-34" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <span className="text-text-muted text-xs font-bold">–</span>
          <input type="date" className="form-input h-8 text-xs w-34" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        <select
          className={`form-select h-8 text-xs w-32 font-semibold ${
            filterStatus === "blacklist" ? "text-red-500"
            : filterStatus === "warning" ? "text-amber-600"
            : filterStatus === "normal" ? "text-emerald-600"
            : ""
          }`}
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">Semua Status</option>
          <option value="normal">Normal</option>
          <option value="warning">Warning</option>
          <option value="blacklist">Blacklist</option>
        </select>
        <button
          className={`h-8 px-3 rounded-lg text-xs font-semibold border transition-all ${
            search || dateFrom || dateTo || filterStatus
              ? "bg-slate-500/15 border-slate-400/30 text-text-primary hover:bg-slate-500/25"
              : "bg-transparent border-white/5 text-text-muted opacity-40 cursor-not-allowed"
          }`}
          onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); setFilterStatus(""); setPage(1); }}
          disabled={!search && !dateFrom && !dateTo && !filterStatus}
        >Reset Filter</button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-current/20 border-t-current animate-spin text-text-muted" />
          <span className="text-xs text-text-muted">Memuat data pelanggaran...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-text-muted text-sm">Tidak ada data pelanggaran.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-5 py-3 text-xs font-semibold text-secondary text-left">Driver</th>
                <th className="px-5 py-3 text-xs font-semibold text-secondary text-left">No. Polisi</th>
                <th className="px-5 py-3 text-xs font-semibold text-secondary text-left">Jenis Pelanggaran</th>
                <th className="px-5 py-3 text-xs font-semibold text-secondary text-left">Keterangan</th>
                <th className="px-5 py-3 text-xs font-semibold text-secondary text-left">Tanggal</th>
                <th className="px-5 py-3 text-xs font-semibold text-secondary text-center">Status Driver</th>
                <th className="px-5 py-3 text-xs font-semibold text-secondary text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(v => {
                const dStatus = v.driver?.status ?? "normal";
                const rowCls = dStatus === "blacklist"
                  ? "bg-red-500/3 hover:bg-red-500/5"
                  : dStatus === "warning"
                  ? "bg-amber-500/3 hover:bg-amber-500/5"
                  : "hover:bg-bg-card-hover";
                const badgeCls = dStatus === "blacklist"
                  ? "bg-red-500/15 text-red-500 border border-red-500/20"
                  : dStatus === "warning"
                  ? "bg-amber-500/15 text-amber-600 border border-amber-500/20"
                  : "bg-emerald-500/15 text-emerald-600 border border-emerald-500/20";
                const driverObj = v.driver ? drivers.find(d => d.id === v.driver!.id) ?? (v.driver as Driver) : null;
                return (
                  <tr key={v.id} className={`border-b border-white/5 transition-colors ${rowCls}`}>
                    <td className="px-5 py-3">
                      {v.driver ? (
                        <div>
                          <p className="font-semibold text-text-primary text-sm">{v.driver.nama_supir}</p>
                          <p className="text-xs font-mono text-text-muted">{v.driver.no_sim}</p>
                        </div>
                      ) : <span className="text-text-muted text-xs italic">Tanpa driver</span>}
                    </td>
                    <td className="px-5 py-3">
                      {v.no_polisi
                        ? <span className="font-mono text-xs font-bold text-text-primary uppercase bg-slate-500/10 px-2 py-1 rounded-lg">{v.no_polisi}</span>
                        : <span className="text-text-muted text-xs">—</span>}
                    </td>
                    <td className="px-5 py-3 text-sm font-medium text-text-primary max-w-[200px]">{v.jenis_pelanggaran}</td>
                    <td className="px-5 py-3 text-xs text-text-muted max-w-[180px] truncate" title={v.keterangan ?? ""}>{v.keterangan ?? "—"}</td>
                    <td className="px-5 py-3 text-xs text-text-muted whitespace-nowrap">{fmt(v.tanggal_pelanggaran)}</td>
                    <td className="px-5 py-3 text-center">
                      {driverObj ? (
                        <select
                          value={driverObj.status}
                          onChange={e => onStatusChange(driverObj, e.target.value as any)}
                          disabled={updatingId === driverObj.id}
                          className={`text-xs font-bold uppercase px-3 py-1.5 rounded-xl border-2 cursor-pointer focus:outline-none min-w-[100px] transition-colors ${
                            driverObj.status === "blacklist"
                              ? "bg-red-500/10 border-red-500/30 text-red-500"
                              : driverObj.status === "warning"
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-600"
                              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-600"
                          }`}
                        >
                          <option value="normal">Normal</option>
                          <option value="warning">Warning</option>
                          <option value="blacklist">Blacklist</option>
                        </select>
                      ) : <span className="text-xs text-text-muted">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => onEdit(v)} className="btn-icon btn-icon-edit" title="Edit">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button onClick={() => onDelete(v.id)} className="btn-icon btn-icon-delete" title="Hapus">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-6 pb-4">
            <Pagination currentPage={page} totalItems={filtered.length} itemsPerPage={PAGE_SIZE} onPageChange={(p) => setPage(p)} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ViolationsPage() {
  const router = useRouter();
  const { toasts, removeToast, toast } = useToast();
  const [mounted, setMounted] = useState(false);

  const [violations, setViolations] = useState<Violation[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Modal tambah/edit
  const [showModal, setShowModal] = useState(false);
  const [editingViol, setEditingViol] = useState<Violation | null>(null);
  const [form, setForm] = useState({
    driver_id: "", no_polisi: "", jenis_pelanggaran: "", keterangan: "",
    tanggal_pelanggaran: new Date().toISOString().split("T")[0],
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Confirm unlock modal
  const [confirmUnlockDriver, setConfirmUnlockDriver] = useState<Driver | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  // Confirm delete modal
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [vRes, dRes] = await Promise.all([
        violationApi.getList(),
        masterApi.getDrivers({}),
      ]);
      // Laravel paginator → .data.data, fallback to .data
      const vRaw = vRes.data;
      setViolations(vRaw?.data ?? (Array.isArray(vRaw) ? vRaw : []));
      const dRaw = dRes.data;
      setDrivers(dRaw?.data ?? (Array.isArray(dRaw) ? dRaw : []));
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!isAdmin()) { router.replace("/vcf/list"); return; }
    fetchAll();
  }, [fetchAll, router]);

  const driversWarning   = drivers.filter(d => d.status === "warning");
  const driversBlacklist = drivers.filter(d => d.status === "blacklist");

  const openCreate = () => {
    setEditingViol(null);
    setForm({ driver_id: "", no_polisi: "", jenis_pelanggaran: "", keterangan: "", tanggal_pelanggaran: new Date().toISOString().split("T")[0] });
    setFormError("");
    setShowModal(true);
  };

  const openEdit = (v: Violation) => {
    setEditingViol(v);
    setForm({
      driver_id: v.driver_id ? String(v.driver_id) : "",
      no_polisi: v.no_polisi ?? "",
      jenis_pelanggaran: v.jenis_pelanggaran,
      keterangan: v.keterangan ?? "",
      tanggal_pelanggaran: v.tanggal_pelanggaran?.split("T")[0] ?? "",
    });
    setFormError("");
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.jenis_pelanggaran.trim()) { setFormError("Jenis pelanggaran wajib diisi."); return; }
    if (!form.driver_id && !form.no_polisi.trim()) { setFormError("Harus isi driver atau no polisi."); return; }
    setSaving(true); setFormError("");
    try {
      const payload = {
        driver_id: form.driver_id ? Number(form.driver_id) : null,
        no_polisi: form.no_polisi.toUpperCase() || null,
        jenis_pelanggaran: form.jenis_pelanggaran,
        keterangan: form.keterangan || null,
        tanggal_pelanggaran: form.tanggal_pelanggaran,
      };
      if (editingViol) {
        await violationApi.update(editingViol.id, payload);
        toast.success("Diperbarui", "Data pelanggaran berhasil diperbarui.");
      } else {
        await violationApi.create(payload);
        toast.success("Disimpan", "Pelanggaran berhasil ditambahkan.");
      }
      setShowModal(false);
      fetchAll();
    } catch (err: any) {
      setFormError(getErrorMessage(err, "Gagal menyimpan."));
    } finally { setSaving(false); }
  };

  const handleDelete = (id: number) => {
    setDeleteConfirmId(id);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmId === null) return;
    setDeleting(true);
    try {
      await violationApi.delete(deleteConfirmId);
      toast.success("Dihapus", "Data pelanggaran dihapus.");
      fetchAll();
      setDeleteConfirmId(null);
    } catch (err: any) {
      toast.error("Gagal", getErrorMessage(err, "Gagal menghapus."));
    } finally {
      setDeleting(false);
    }
  };

  const handleUnlockDriver = async () => {
    if (!confirmUnlockDriver) return;
    setUnlocking(true);
    try {
      await violationApi.updateDriverStatus(confirmUnlockDriver.id, "normal");
      toast.success("Dibuka", `Status "${confirmUnlockDriver.nama_supir}" diubah ke Normal.`);
      setConfirmUnlockDriver(null);
      fetchAll();
    } catch (err: any) {
      toast.error("Gagal", getErrorMessage(err, "Gagal mengubah status."));
    } finally { setUnlocking(false); }
  };

  const handleStatusChange = async (d: Driver, s: "normal" | "warning" | "blacklist") => {
    if (s === "normal" && d.status === "blacklist") { setConfirmUnlockDriver(d); return; }
    setUpdatingId(d.id);
    try {
      await violationApi.updateDriverStatus(d.id, s);
      toast.success("Status diperbarui", `${d.nama_supir} → ${s}`);
      fetchAll();
    } catch (err: any) {
      toast.error("Gagal", getErrorMessage(err, "Gagal mengubah status."));
    } finally { setUpdatingId(null); }
  };

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-500">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            Pelanggaran
          </h1>
          <p className="page-subtitle">Kelola riwayat pelanggaran driver dan status blacklist — Admin only</p>
        </div>
        <button className="btn btn-primary flex items-center gap-2" onClick={openCreate}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
          Tambah Pelanggaran
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-600">{loading ? "—" : drivers.filter(d => d.status === "normal").length}</div>
            <div className="text-[10px] text-text-muted font-semibold uppercase tracking-widest">Normal</div>
          </div>
        </div>
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 flex items-center justify-center shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-500"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div>
            <div className="text-2xl font-black text-amber-600">{loading ? "—" : driversWarning.length}</div>
            <div className="text-[10px] text-text-muted font-semibold uppercase tracking-widest">Warning</div>
          </div>
        </div>
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-red-500/10 flex items-center justify-center shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
          </div>
          <div>
            <div className="text-2xl font-black text-red-600">{loading ? "—" : driversBlacklist.length}</div>
            <div className="text-[10px] text-text-muted font-semibold uppercase tracking-widest">Blacklist</div>
          </div>
        </div>
      </div>

      {/* Blacklist section (collapsible) */}
      <CollapsibleSection
        title="Driver Diblokir (Blacklist)"
        count={driversBlacklist.length}
        colorClass="bg-red-500/10 text-red-500"
        defaultOpen={true}
        loading={loading}
        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>}
      >
        <DriverTable
          drivers={driversBlacklist}
          status="blacklist"
          updatingId={updatingId}
          onAction={handleStatusChange}
          onUnlock={setConfirmUnlockDriver}
        />
      </CollapsibleSection>

      {/* Warning section (collapsible) */}
      <CollapsibleSection
        title="Driver dengan Warning"
        count={driversWarning.length}
        colorClass="bg-amber-500/10 text-amber-600"
        defaultOpen={true}
        loading={loading}
        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
      >
        <DriverTable
          drivers={driversWarning}
          status="warning"
          updatingId={updatingId}
          onAction={handleStatusChange}
          onUnlock={setConfirmUnlockDriver}
        />
      </CollapsibleSection>

      {/* Violation history (collapsible) */}
      <CollapsibleSection
        title="Daftar Riwayat Semua Pelanggaran"
        count={violations.length}
        colorClass="bg-slate-500/10 text-text-muted"
        defaultOpen={true}
        loading={false}
        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/></svg>}
      >
        <ViolationTable
          violations={violations}
          loading={loading}
          drivers={drivers}
          updatingId={updatingId}
          onEdit={openEdit}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
        />
      </CollapsibleSection>

      {/* Add/Edit Modal — portal with full vh blur */}
      {mounted && showModal && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-start justify-center pt-10 pb-6 px-4 overflow-y-auto"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", minHeight: "100vh" }}
          onClick={() => { if (!saving) setShowModal(false); }}
        >
          <div
            className="bg-white dark:bg-bg-card w-full max-w-lg rounded-3xl shadow-2xl border border-white/10 overflow-hidden my-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-violet-500" />
            <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-slate-100 dark:border-white/5">
              <h2 className="font-bold text-base text-text-primary">{editingViol ? "Edit Pelanggaran" : "Tambah Pelanggaran"}</h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-xl flex items-center justify-center text-text-muted hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-6">
              {formError && <div className="mb-4 p-3 rounded-xl text-sm bg-red-500/10 border border-red-500/20 text-red-500">⚠ {formError}</div>}
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="form-label">Driver</label>
                  <select className="form-select" value={form.driver_id} onChange={e => setForm(p => ({ ...p, driver_id: e.target.value }))}>
                    <option value="">— Pilih Driver (opsional) —</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.nama_supir} — {d.no_sim}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">No. Polisi (BK)</label>
                  <input type="text" className="form-input uppercase" placeholder="BK 1234 ABC (opsional)" value={form.no_polisi} onChange={e => setForm(p => ({ ...p, no_polisi: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Jenis Pelanggaran *</label>
                  <input type="text" className="form-input" required placeholder="Contoh: Membawa barang terlarang" value={form.jenis_pelanggaran} onChange={e => setForm(p => ({ ...p, jenis_pelanggaran: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Keterangan</label>
                  <textarea className="form-input resize-none" rows={3} placeholder="Detail pelanggaran..." value={form.keterangan} onChange={e => setForm(p => ({ ...p, keterangan: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Tanggal Pelanggaran *</label>
                  <input type="date" className="form-input" required value={form.tanggal_pelanggaran} onChange={e => setForm(p => ({ ...p, tanggal_pelanggaran: e.target.value }))} />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" className="btn btn-secondary flex-1" onClick={() => setShowModal(false)} disabled={saving}>Batal</button>
                  <button type="submit" className="btn btn-primary flex-[2]" disabled={saving}>
                    {saving ? <><span className="spinner" /> Menyimpan...</> : editingViol ? "Perbarui" : "Simpan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Confirm unlock blacklist modal — portal */}
      {mounted && confirmUnlockDriver && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
          onClick={() => { if (!unlocking) setConfirmUnlockDriver(null); }}
        >
          <div className="bg-white dark:bg-bg-card w-full max-w-sm rounded-3xl shadow-2xl border border-white/10 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>
                </svg>
              </div>
              <h3 className="font-bold text-text-primary text-lg mb-1">Buka Blacklist?</h3>
              <p className="text-sm text-text-muted">
                Driver <strong className="text-text-primary">{confirmUnlockDriver.nama_supir}</strong> akan diubah ke <strong className="text-emerald-600">Normal</strong>. Driver dapat mendaftar VCF kembali.
              </p>
              <div className="flex gap-3 mt-5">
                <button className="btn btn-secondary flex-1" onClick={() => setConfirmUnlockDriver(null)} disabled={unlocking}>Batal</button>
                <button className="btn flex-[2] bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500 font-bold" onClick={handleUnlockDriver} disabled={unlocking}>
                  {unlocking ? <><span className="spinner border-white" /> Memproses...</> : "Ya, Buka Blacklist"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Confirm delete violation modal — portal */}
      {mounted && deleteConfirmId !== null && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => { if (!deleting) setDeleteConfirmId(null); }}
        >
          <div className="bg-white dark:bg-bg-card w-full max-w-sm rounded-3xl shadow-2xl border border-white/10 overflow-hidden animate-slideUp" onClick={e => e.stopPropagation()}>
            <div className="h-1 w-full bg-gradient-to-r from-rose-500 to-red-500" />
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-4">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-rose-500">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </div>
              <h3 className="font-bold text-text-primary text-lg mb-2">Hapus Pelanggaran?</h3>
              <p className="text-sm text-text-muted mb-6">
                Data pelanggaran ini akan dihapus secara permanen dari sistem.
              </p>
              <div className="flex gap-3 mt-5">
                <button type="button" className="btn btn-secondary flex-1" onClick={() => setDeleteConfirmId(null)} disabled={deleting}>Batal</button>
                <button type="button" className="btn bg-rose-500 hover:bg-rose-600 text-white flex-[2] font-bold" onClick={handleConfirmDelete} disabled={deleting}>
                  {deleting ? <><span className="spinner border-white" /> Menghapus...</> : "Ya, Hapus"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
