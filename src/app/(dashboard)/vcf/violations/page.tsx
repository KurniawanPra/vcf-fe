"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { violationApi, masterApi } from "@/lib/api";
import { isAdmin } from "@/lib/auth";
import { getErrorMessage } from "@/lib/utils";
import { useToast, ToastContainer } from "@/components/Toast";
import Pagination from "@/components/Pagination";
import SearchInput from "@/components/SearchInput";
import SearchableDropdown from "@/components/SearchableDropdown";
import ModalPortal from "@/components/ModalPortal";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";

interface Driver {
  id: number;
  nama_supir: string;
  no_sim: string;
  status: "normal" | "warning" | "blacklist";
}

interface Violation {
  [x: string]: any;
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
  try {
    const date = new Date(d);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return d;
  }
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

// ─── Violation History Table ───────────────────────────────────────────────────
function ViolationTable({
  violations, loading, onEdit, onDelete,
}: {
  violations: Violation[]; loading: boolean;
  onEdit: (v: Violation) => void;
  onDelete: (id: number) => void;
}) {
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    setPage(1);
  }, [search, dateFrom, dateTo]);

  const filtered = violations.filter(v => {
    const q = search.toLowerCase();
    if (q && !(
      v.driver?.nama_supir?.toLowerCase().includes(q) ||
      (v.no_polisi ?? "").toLowerCase().includes(q) ||
      v.jenis_pelanggaran.toLowerCase().includes(q)
    )) return false;
    if (dateFrom && v.tanggal_pelanggaran < dateFrom) return false;
    if (dateTo && v.tanggal_pelanggaran > dateTo + "T23:59:59") return false;
    return true;
  });

  return (
    <div>
      {/* Filters */}
      <div className="px-5 py-3 flex flex-wrap items-center gap-3 border-b border-white/5 bg-white/2">
        {/* Search Input */}
        <SearchInput
          placeholder="Cari No. Polisi atau Supir..."
          value={search}
          onChange={setSearch}
        />
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
                <th className="px-5 py-3 text-xs font-semibold text-secondary text-center">Tipe</th>
                <th className="px-5 py-3 text-xs font-semibold text-secondary text-left">Jenis Pelanggaran</th>
                <th className="px-5 py-3 text-xs font-semibold text-secondary text-left ">Keterangan</th>
                <th className="px-5 py-3 text-xs font-semibold text-secondary text-left">Tanggal</th>
                <th className="px-5 py-3 text-xs font-semibold text-secondary text-left">Dibuat Oleh</th>
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
                  <td className="px-5 py-3 text-center">
                    {dStatus === "blacklist" ? (
                      <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-red-500/15 text-red-500 border border-red-500/20">Blacklist</span>
                    ) : dStatus === "warning" ? (
                      <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/20">Warning</span>
                    ) : (
                      <span className="text-[10px] font-semibold uppercase px-2.5 py-1 rounded-full bg-slate-500/10 text-text-muted">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-sm font-medium text-text-primary max-w-[200px]">{v.jenis_pelanggaran}</td>
                  <td className="px-5 py-3 text-xs text-text-muted max-w-[220px] whitespace-normal break-words" title={v.keterangan ?? ""}>{v.keterangan ?? "—"}</td>
                  <td className="px-5 py-3 text-xs text-text-muted whitespace-nowrap">{fmt(v.tanggal_pelanggaran)}</td>
                  <td className="px-5 py-3 text-xs text-text-muted whitespace-nowrap">{v.created_by?.nama || v.created_by_user?.nama || "—"}</td>
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
  const driverOptions = useMemo(() => [
    { id: "", display_name: "— Pilih Supir (opsional) —" },
    ...drivers.map(d => ({
      id: String(d.id),
      display_name: d.no_sim ? `${d.nama_supir} - ${d.no_sim}` : d.nama_supir
    }))
  ], [drivers]);
  const [loading, setLoading] = useState(true);

  // Modal tambah/edit
  const [showModal, setShowModal] = useState(false);
  const [editingViol, setEditingViol] = useState<Violation | null>(null);
  const [form, setForm] = useState({
    driver_id: "", no_polisi: "", jenis_pelanggaran: "", keterangan: "",
    tanggal_pelanggaran: new Date().toLocaleDateString("sv-SE"),
    tipe_pelanggaran: "" as "" | "warning" | "blacklist",
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => { setMounted(true); }, []);

  // Dispatch modal events for showModal
  useEffect(() => {
    if (showModal) {
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
  }, [showModal]);

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

  const openCreate = () => {
    setEditingViol(null);
    setForm({ driver_id: "", no_polisi: "", jenis_pelanggaran: "", keterangan: "", tanggal_pelanggaran: new Date().toLocaleDateString("sv-SE"), tipe_pelanggaran: "" });
    setFormError("");
    setShowModal(true);
  };

  const openEdit = (v: Violation) => {
    setEditingViol(v);
    const driverStatus = v.driver?.status ?? "";
    setForm({
      driver_id: v.driver_id ? String(v.driver_id) : "",
      no_polisi: v.no_polisi ?? "",
      jenis_pelanggaran: v.jenis_pelanggaran,
      keterangan: v.keterangan ?? "",
      tanggal_pelanggaran: v.tanggal_pelanggaran ? v.tanggal_pelanggaran.split("T")[0].split(" ")[0] : "",
      tipe_pelanggaran: (driverStatus === "warning" || driverStatus === "blacklist") ? driverStatus : "",
    });
    setFormError("");
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.jenis_pelanggaran.trim()) { setFormError("Jenis pelanggaran wajib diisi."); return; }
    if (!form.driver_id && !form.no_polisi.trim()) { setFormError("Harus isi driver atau no polisi."); return; }
    if (form.driver_id && !form.tipe_pelanggaran) { setFormError("Tipe pelanggaran wajib dipilih jika driver dipilih."); return; }
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
      // Auto-update driver status if driver is selected and tipe is chosen
      if (form.driver_id && form.tipe_pelanggaran) {
        try {
          await violationApi.updateDriverStatus(Number(form.driver_id), form.tipe_pelanggaran);
          toast.success("Status Driver Diperbarui", `Status driver diubah ke ${form.tipe_pelanggaran}.`);
        } catch (statusErr: any) {
          toast.error("Peringatan", "Pelanggaran tersimpan, tapi gagal memperbarui status driver.");
        }
      }
      setShowModal(false);
      fetchAll();
    } catch (err: any) {
      setFormError(getErrorMessage(err, "Gagal menyimpan."));
    } finally { setSaving(false); }
  };

  // Confirm delete modal
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

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


  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            Pelanggaran
          </h1>
          <p className="page-subtitle">Kelola riwayat pelanggaran driver — Admin only</p>
        </div>
        <button className="btn btn-primary flex items-center gap-2" onClick={openCreate}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
          Tambah Pelanggaran
        </button>
      </div>

      {/* Violation history table directly */}
      <div className="glass-card">
        <ViolationTable
          violations={violations}
          loading={loading}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      </div>

      {showModal && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>
                  {editingViol ? "Edit Pelanggaran" : "Tambah Pelanggaran"}
                </h2>
                <button onClick={() => setShowModal(false)} style={{ color: "var(--text-muted)" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              </div>
              {formError && (
                <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: "rgba(239,68,68,0.1)", color: "#fca5a5" }}>
                  ⚠️ {formError}
                </div>
              )}
              <form onSubmit={handleSave}>
                <div className="mb-4">
                  <SearchableDropdown
                    label="Nama Supir"
                    options={driverOptions}
                    value={form.driver_id}
                    onChange={val => setForm(p => ({ ...p, driver_id: val }))}
                    placeholder="Pilih Supir"
                    displayField="display_name"
                  />
                </div>
                <div className="mb-4">
                  <label className="form-label">No. Polisi (BK)</label>
                  <input type="text" className="form-input uppercase" placeholder="BK 1234 ABC (opsional)" value={form.no_polisi} onChange={e => setForm(p => ({ ...p, no_polisi: e.target.value }))} />
                </div>
                <div className="mb-4">
                  <label className="form-label">Tipe Pelanggaran *</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setForm(p => ({ ...p, tipe_pelanggaran: "warning" }))}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase border-2 transition-all flex items-center justify-center gap-2 ${
                        form.tipe_pelanggaran === "warning"
                          ? "bg-amber-500/15 border-amber-500/40 text-amber-600 shadow-md shadow-amber-500/10"
                          : "bg-transparent border-white/10 text-text-muted hover:border-amber-500/30 hover:text-amber-600"
                      }`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      Warning
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm(p => ({ ...p, tipe_pelanggaran: "blacklist" }))}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase border-2 transition-all flex items-center justify-center gap-2 ${
                        form.tipe_pelanggaran === "blacklist"
                          ? "bg-red-500/15 border-red-500/40 text-red-500 shadow-md shadow-red-500/10"
                          : "bg-transparent border-white/10 text-text-muted hover:border-red-500/30 hover:text-red-500"
                      }`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                      </svg>
                      Blacklist
                    </button>
                  </div>
                  {form.driver_id && !form.tipe_pelanggaran && (
                    <p className="text-[11px] text-amber-500 mt-1.5">⚠ Pilih tipe pelanggaran agar status driver otomatis terupdate</p>
                  )}
                </div>
                <div className="mb-4">
                  <label className="form-label">Jenis Pelanggaran *</label>
                  <input type="text" className="form-input" required placeholder="Contoh: Membawa barang terlarang" value={form.jenis_pelanggaran} onChange={e => setForm(p => ({ ...p, jenis_pelanggaran: e.target.value }))} />
                </div>
                <div className="mb-4">
                  <label className="form-label">Keterangan</label>
                  <textarea className="form-input resize-none" rows={3} placeholder="Detail pelanggaran..." value={form.keterangan} onChange={e => setForm(p => ({ ...p, keterangan: e.target.value }))} />
                </div>
                <div className="mb-6">
                  <label className="form-label">Tanggal Pelanggaran *</label>
                  <input type="date" className="form-input" required value={form.tanggal_pelanggaran} onChange={e => setForm(p => ({ ...p, tanggal_pelanggaran: e.target.value }))} />
                </div>
                <div className="flex gap-3 justify-end">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <><span className="spinner" /> Menyimpan...</> : editingViol ? "Perbarui" : "Simpan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      <DeleteConfirmModal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
        message="Data pelanggaran ini akan dihapus secara permanen dari sistem."
      />
    </div>
  );
}
