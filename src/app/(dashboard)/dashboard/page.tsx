"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { vcfApi } from "@/lib/api";
import { getUser, isAdmin } from "@/lib/auth";
import { getStatusLabel, getStatusColor } from "@/lib/utils";
import Pagination from "@/components/Pagination";

interface VcfSummary {
  id: number;
  nomor_urut: string;
  no_polisi: string;
  status: string;
  tipe_kegiatan: string;
  tanggal: string;
  transporter?: { nama_transporter: string };
  driver?: { nama_supir: string };
}

interface Stats {
  total: number;
  aktif: number;
  selesai: number;
  hari_ini: number;
}

const STAT_CARDS = [
  {
    key: "total" as keyof Stats,
    label: "Total VCF",
    sub: "Semua record hari ini",
    color: "#3b82f6",
  },
  {
    key: "aktif" as keyof Stats,
    label: "Aktif",
    sub: "Kendaraan di area",
    color: "#f59e0b",
  },
  {
    key: "selesai" as keyof Stats,
    label: "Selesai",
    sub: "Kendaraan keluar",
    color: "#10b981",
  },
  {
    key: "hari_ini" as keyof Stats,
    label: "Hari Ini",
    sub: "Kendaraan masuk",
    color: "#8b5cf6",
  },
];

const QUICK_ACTIONS = [
  { href: "/vcf/register", label: "Main Gate Masuk", sub: "Registrasi kendaraan baru", stage: "Bagian 1", color: "#6366f1", colorRgb: "99,102,241" },
  { href: "/vcf?stage=bagian1_selesai", label: "Weighbridge Masuk", sub: "Timbang & periksa masuk", stage: "Bagian 2", color: "#f59e0b", colorRgb: "245,158,11" },
  { href: "/vcf?stage=loading_unloading_selesai", label: "Weighbridge Keluar", sub: "Timbang & periksa keluar", stage: "Bagian 3", color: "#8b5cf6", colorRgb: "139,92,246" },
  { href: "/vcf?stage=bagian3_selesai", label: "Main Gate Keluar", sub: "Penutupan & keluar", stage: "Bagian 4", color: "#10b981", colorRgb: "16,185,129" },
];

function StatCardSkeleton() {
  return (
    <div style={{ borderRadius: 12, height: 90, background: "var(--bg-card)", border: "1px solid var(--border)", animation: "pulse 1.5s infinite" }} />
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const user = getUser();
  const [vcfs, setVcfs] = useState<VcfSummary[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, aktif: 0, selesai: 0, hari_ini: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);
  const [dashPage, setDashPage] = useState(1);

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Selamat Pagi" : now.getHours() < 17 ? "Selamat Siang" : "Selamat Sore";

  const fetchData = useCallback(async () => {
    try {
      const res = await vcfApi.getList({ per_page: 100 });
      const allData: VcfSummary[] = (res.data.data || res.data || []) as VcfSummary[];
      const aktif = allData.filter(v => v.status !== "selesai" && v.status !== "reject" && v.status !== "ditolak").length;
      const selesai = allData.filter(v => v.status === "selesai").length;
      const hari_ini = allData.filter(v => v.tanggal === new Date().toISOString().split("T")[0]).length;
      const activeData = allData.filter(v => v.status !== "selesai" && v.status !== "reject" && v.status !== "ditolak");
      setStats({ total: allData.length, aktif, selesai, hari_ini });
      setVcfs(activeData);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const filtered = searchQuery.trim()
    ? vcfs.filter(v =>
        v.no_polisi?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.driver?.nama_supir?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.nomor_urut?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : vcfs;

  return (
    <div style={{ maxWidth: 1400 }}>
      {/* ── Header ─────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <h1 style={{
            fontSize: 26, fontWeight: 800, fontFamily: "'Plus Jakarta Sans',sans-serif",
            color: "var(--text-primary)", letterSpacing: "-0.5px", lineHeight: 1.2,
          }}>
            {greeting}, {user?.nama?.split(" ")[0] || "Pengguna"}
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            {isAdmin() ? "Admin Dashboard · PT. Industri Nabati Lestari" : "Security Officer · Main Gate"}
            <span style={{ marginLeft: 8, opacity: 0.6 }}>·</span>
            <span style={{ marginLeft: 8 }}>{now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
          </p>
        </div>

        <button
          onClick={() => { setRegisterLoading(true); setTimeout(() => router.push("/vcf/register"), 600); }}
          disabled={registerLoading}
          className="action-btn action-btn-blue group"
          style={{ padding: "10px 22px", fontSize: "14px", borderRadius: "9999px" }}
        >
          <span className="relative flex items-center gap-2">
            {registerLoading
              ? <div className="w-4 h-4 rounded-full border-2 border-current/30 border-t-current animate-spin" />
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                  className="transition-transform duration-300 group-hover:rotate-180">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 8v8M8 12h8"/>
                </svg>}
            {registerLoading ? "Memuat..." : "Registrasi VCF Baru"}
          </span>
        </button>
      </div>

      {/* ── Quick Actions (Officer only, shown first on mobile) ─────── */}
      {!isAdmin() && (
        <div className="order-1 lg:order-2 grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 lg:mb-8">
          {QUICK_ACTIONS.map(a => (
            <Link key={a.href} href={a.href} style={{
              display: "block", borderRadius: 16, padding: "18px 20px",
              background: "var(--bg-card)", border: `1px solid rgba(${a.colorRgb},0.2)`,
              boxShadow: `0 4px 20px rgba(${a.colorRgb},0.1)`,
              textDecoration: "none", transition: "all 0.25s",
              position: "relative", overflow: "hidden",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 30px rgba(${a.colorRgb},0.25)`; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px rgba(${a.colorRgb},0.1)`; }}>
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: 3,
                background: `linear-gradient(90deg, ${a.color}, transparent)`,
              }}/>
              <div style={{
                width: 36, height: 36, borderRadius: 10, marginBottom: 12,
                background: `rgba(${a.colorRgb},0.12)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 900, fontSize: 14, color: a.color,
              }}>
                {a.stage.split(" ")[1]}
              </div>
              <p style={{ fontSize: 10, fontWeight: 700, color: a.color, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 4 }}>{a.stage}</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>{a.label}</p>
              <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{a.sub}</p>
            </Link>
          ))}
        </div>
      )}

{/* ── Stat Cards ─────────────────────────── */}
<div
  data-stat-grid
  className="order-2 lg:order-1 mb-8"
  style={{ display: "grid", gridTemplateColumns: "repeat(1, 1fr)", gap: "12px" }}
>
  <style>{`
    @media (min-width: 480px) {
      [data-stat-grid] {
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 12px !important;
      }
    }
    @media (min-width: 1024px) {
      [data-stat-grid] {
        grid-template-columns: repeat(4, 1fr) !important;
        gap: 16px !important;
      }
    }
  `}</style>
  {loading ? [1,2,3,4].map(i => <StatCardSkeleton key={i}/>) : STAT_CARDS.map(card => (
    <div key={card.key} style={{
      borderRadius: 12, padding: "16px 12px", position: "relative", overflow: "hidden",
      background: "var(--bg-card)", border: `2px solid ${card.color}`,
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
      minWidth: 0,
    }}>
      <p style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1, fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: "-0.5px" }}>
        {stats[card.key]}
      </p>
      <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginTop: 2 }}>{card.label}</p>
      <p style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 1 }}>{card.sub}</p>
    </div>
  ))}
</div>

      {/* ── Activity Feed ────────────────────── */}
      <div style={{
        borderRadius: 20, overflow: "hidden",
        background: "var(--bg-card)", border: "1px solid var(--border)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
      }}>
        {/* Card header */}
        <div style={{
          padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid var(--border)",
          background: "linear-gradient(135deg, rgba(99,102,241,0.04) 0%, var(--bg-secondary) 100%)",
          flexWrap: "wrap",
          gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              background: "rgba(99,102,241,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2">
                <rect x="1" y="3" width="15" height="13" rx="1"/>
                <path d="M16 8h4l3 3v5h-7V8z"/>
                <circle cx="5.5" cy="18.5" r="2.5"/>
                <circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Kendaraan Aktif di Area</p>
              <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {loading ? "Memuat..." : `${vcfs.length} kendaraan sedang di dalam area pabrik`}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ position: "relative" }}>
              <svg width="15" height="15" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input
                type="text" placeholder="Cari no. polisi / supir..."
                value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setDashPage(1); }}
                style={{
                  paddingLeft: 32, paddingRight: 12, height: 34, borderRadius: 10, fontSize: 12,
                  background: "var(--bg-primary)", border: "1px solid var(--border)",
                  color: "var(--text-primary)", outline: "none", width: 220,
                }}
              />
            </div>
            <Link href="/vcf" style={{
              padding: "7px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600,
              background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)",
              color: "#818cf8", textDecoration: "none", transition: "all 0.2s",
            }}>
              Lihat Semua
            </Link>
          </div>
        </div>

        {/* Card body — premium table */}
        <div style={{ overflowX: "auto" }}>
          {loading ? (
            <div style={{ padding: 24 }}>
              {[1,2,3,4,5].map(i => (
                <div key={i} style={{ height: 48, marginBottom: 8, borderRadius: 10, background: "var(--bg-secondary)", animation: "pulse 1.5s infinite" }}/>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0", color: "var(--text-muted)" }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: "var(--bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>
                {searchQuery ? "Tidak ada hasil pencarian" : "Belum ada kendaraan aktif"}
              </p>
              <p style={{ fontSize: 12, marginTop: 4 }}>
                {searchQuery ? "Coba kata kunci lain" : "Mulai dengan registrasi kendaraan baru"}
              </p>
            </div>
          ) : (
            <>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px", whiteSpace: "nowrap" }}>No. VCF</th>
                  <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px" }}>No. Polisi</th>
                  <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px" }}>Supir</th>
                  <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px" }}>Transporter</th>
                  <th style={{ padding: "10px 16px", textAlign: "center", fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px" }}>Tipe</th>
                  <th style={{ padding: "10px 16px", textAlign: "center", fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px" }}>Status</th>
                  <th style={{ padding: "10px 16px", textAlign: "right", fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice((dashPage - 1) * 10, dashPage * 10).map((vcf, idx) => {
                  const isLoading = vcf.tipe_kegiatan?.includes("loading");
                  const statusClr = vcf.status === "selesai" ? "#10b981" : vcf.status === "reject" ? "#ef4444" : "#6366f1";
                  const isEven = idx % 2 === 0;
                  return (
                    <tr key={vcf.id} style={{
                      borderBottom: "1px solid var(--border)",
                      background: isEven ? "transparent" : "rgba(255,255,255,0.01)",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-card-hover)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = isEven ? "transparent" : "rgba(255,255,255,0.01)"}
                    >
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: statusClr, boxShadow: `0 0 6px ${statusClr}80`, flexShrink: 0 }} />
                          <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 12, color: "#a78bfa" }}>{vcf.nomor_urut}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>{vcf.no_polisi}</span>
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--text-secondary)", fontSize: 12 }}>
                        {vcf.driver?.nama_supir || "—"}
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--text-secondary)", fontSize: 12, maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {vcf.transporter?.nama_transporter || "—"}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, textTransform: "uppercase",
                          background: isLoading ? "rgba(139,92,246,0.12)" : "rgba(16,185,129,0.12)",
                          color: isLoading ? "#a78bfa" : "#34d399",
                          border: `1px solid ${isLoading ? "rgba(139,92,246,0.25)" : "rgba(16,185,129,0.25)"}`,
                        }}>
                          {vcf.tipe_kegiatan?.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <span className={`status-badge ${getStatusColor(vcf.status)}`} style={{ fontSize: 9 }}>{getStatusLabel(vcf.status)}</span>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <Link
                          href={`/vcf/${vcf.id}`}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                            background: `rgba(${vcf.status === "selesai" ? "16,185,129" : "99,102,241"},0.1)`,
                            color: vcf.status === "selesai" ? "#34d399" : "#818cf8",
                            border: `1px solid rgba(${vcf.status === "selesai" ? "16,185,129" : "99,102,241"},0.25)`,
                            textDecoration: "none", transition: "all 0.15s",
                          }}
                        >
                          Detail
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ padding: "8px 24px 16px" }}>
              <Pagination currentPage={dashPage} totalItems={filtered.length} itemsPerPage={10} onPageChange={(p) => setDashPage(p)} />
            </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
