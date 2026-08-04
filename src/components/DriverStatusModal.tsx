"use client";

import { useCallback, useEffect, useState } from "react";
import { masterApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import ModalPortal from "./ModalPortal";
import SearchInput from "./SearchInput";

export type DriverStatus = "normal" | "warning" | "blacklist";

interface DriverRow {
  id: number;
  nama_supir: string;
  no_sim: string;
  jenis_sim: string;
  tgl_berlaku_sim?: string;
  is_active: boolean;
  status?: DriverStatus;
}

const STATUS_META: Record<DriverStatus, { label: string; caption: string; accent: string; ring: string }> = {
  normal: {
    label: "Supir Status Normal",
    caption: "Supir tanpa catatan pelanggaran aktif",
    accent: "#10b981",
    ring: "rgba(16,185,129,0.3)",
  },
  warning: {
    label: "Supir Status Warning",
    caption: "Supir dengan peringatan pelanggaran",
    accent: "#f59e0b",
    ring: "rgba(245,158,11,0.3)",
  },
  blacklist: {
    label: "Supir Status Blacklist",
    caption: "Supir yang dilarang masuk area",
    accent: "#ef4444",
    ring: "rgba(239,68,68,0.3)",
  },
};

interface DriverStatusModalProps {
  status: DriverStatus;
  /** Jumlah dari kartu statistik — dipakai sebagai label total sebelum data termuat. */
  total?: number;
  onClose: () => void;
}

export default function DriverStatusModal({ status, total, onClose }: DriverStatusModalProps) {
  const meta = STATUS_META[status];

  const [rows, setRows] = useState<DriverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchRows = useCallback(async (signal: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      // Filter dilakukan di server agar modal tidak menyaring seluruh master supir di browser.
      const params: Record<string, string> = { status };
      if (debouncedSearch) params.search = debouncedSearch;
      const res = await masterApi.getDrivers(params, { signal });
      const data = res.data?.data ?? res.data;
      setRows(Array.isArray(data) ? data : []);
    } catch (err: any) {
      if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") return;
      setError(getErrorMessage(err, "Tidak dapat memuat daftar supir."));
      setRows([]);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [status, debouncedSearch]);

  useEffect(() => {
    const controller = new AbortController();
    fetchRows(controller.signal);
    return () => controller.abort();
  }, [fetchRows]);

  // Kunci scroll body + beri tahu shell bahwa ada modal terbuka (pola yang sama
  // dipakai modal lain di aplikasi ini), dan tutup dengan tombol Escape.
  useEffect(() => {
    document.body.style.overflow = "hidden";
    window.dispatchEvent(new CustomEvent("modal-open"));

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "unset";
      window.dispatchEvent(new CustomEvent("modal-close"));
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const shownTotal = loading && !rows.length ? total ?? 0 : rows.length;

  return (
    <ModalPortal>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-content"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={meta.label}
          style={{ maxWidth: 620 }}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-center gap-3 min-w-0">
              <span
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${meta.accent}1a`, border: `1px solid ${meta.ring}` }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={meta.accent} strokeWidth="2.2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <div className="min-w-0">
                <h2 className="font-bold text-base leading-tight truncate" style={{ color: "var(--text-primary)" }}>
                  {meta.label}
                </h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {meta.caption}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              aria-label="Tutup"
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
              style={{ color: "var(--text-muted)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="flex items-center gap-3 mb-4">
            <SearchInput
              h11
              bgSecondary
              autoFocus
              placeholder="Cari nama supir atau no SIM..."
              value={search}
              onChange={setSearch}
            />
            <span
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg whitespace-nowrap flex-shrink-0"
              style={{ background: `${meta.accent}14`, color: meta.accent }}
            >
              {shownTotal} supir
            </span>
          </div>

          {/* List */}
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            {loading ? (
              <div className="flex items-center justify-center py-14">
                <div className="spinner" />
              </div>
            ) : error ? (
              <div className="py-10 px-4 text-center text-sm" style={{ color: "#ef4444" }}>
                {error}
              </div>
            ) : rows.length === 0 ? (
              <div className="py-12 px-4 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                {debouncedSearch
                  ? `Tidak ada supir yang cocok dengan "${debouncedSearch}".`
                  : "Tidak ada supir dengan status ini."}
              </div>
            ) : (
              <div className="max-h-[380px] overflow-y-auto divide-y" style={{ borderColor: "var(--border)" }}>
                {rows.map((d, idx) => (
                  <div
                    key={d.id}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-bg-card-hover"
                    style={{ borderTop: idx === 0 ? "none" : "1px solid var(--border-light)" }}
                  >
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                      style={{ background: "var(--bg-primary)", color: "var(--text-muted)" }}
                    >
                      {idx + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                        {d.nama_supir}
                      </p>
                      <p className="text-[11px] font-mono mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {d.no_sim} · {d.jenis_sim || "-"}
                      </p>
                    </div>

                    <span
                      className={`text-[9px] font-bold uppercase px-2 py-1 rounded-md flex-shrink-0 ${
                        d.is_active
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-red-500/10 text-red-500"
                      }`}
                    >
                      {d.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end mt-5">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Tutup
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
