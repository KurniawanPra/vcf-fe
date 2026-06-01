"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { violationApi, masterApi } from "@/lib/api";
import { isAdmin } from "@/lib/auth";
import { getErrorMessage } from "@/lib/utils";
import { useToast, ToastContainer } from "@/components/Toast";
import { createPortal } from "react-dom";
import SearchInput from "@/components/SearchInput";

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
                <th className="px-5 py-3 text-xs font-semibold text-secondary text-left">Jenis Pelanggaran</th>
                <th className="px-5 py-3 text-xs font-semibold text-secondary text-left ">Keterangan</th>
                <th className="px-5 py-3 text-xs font-semibold text-secondary text-left">Tanggal</th>
                <th className="px-5 py-3 text-xs font-semibold text-secondary text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(v => (
                <tr key={v.id} className="border-b border-white/5 transition-colors hover:bg-bg-card-hover">
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
                  <td className="px-5 py-3 text-xs text-text-muted max-w-[220px] whitespace-normal break-words" title={v.keterangan ?? ""}>{v.keterangan ?? "—"}</td>
                  <td className="px-5 py-3 text-xs text-text-muted whitespace-nowrap">{fmt(v.tanggal_pelanggaran)}</td>
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
              ))}
            </tbody>
          </table>
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

  // Modal tambah/edit
  const [showModal, setShowModal] = useState(false);
  const [editingViol, setEditingViol] = useState<Violation | null>(null);
  const [form, setForm] = useState({
    driver_id: "", no_polisi: "", jenis_pelanggaran: "", keterangan: "",
    tanggal_pelanggaran: new Date().toISOString().split("T")[0],
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

  const handleDelete = async (id: number) => {
    if (!confirm("Hapus data pelanggaran ini?")) return;
    try {
      await violationApi.delete(id);
      toast.success("Dihapus", "Data pelanggaran dihapus.");
      fetchAll();
    } catch (err: any) {
      toast.error("Gagal", getErrorMessage(err, "Gagal menghapus."));
    }
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
          <p className="page-subtitle">Kelola riwayat pelanggaran driver — Admin only</p>
        </div>
        <button className="btn btn-primary flex items-center gap-2" onClick={openCreate}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
          Tambah Pelanggaran
        </button>
      </div>

      {/* Violation history */}
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
          onEdit={openEdit}
          onDelete={handleDelete}
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

    </div>
  );
}
