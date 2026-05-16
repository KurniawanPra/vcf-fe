"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { vcfApi } from "@/lib/api";
import { getUser, isAdmin } from "@/lib/auth";
import { getStatusLabel, getStatusColor } from "@/lib/utils";

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
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
        <rect x="9" y="3" width="6" height="4" rx="1"/>
      </svg>
    ),
  },
  {
    key: "aktif" as keyof Stats,
    label: "Aktif",
    sub: "Kendaraan di area",
    color: "#f59e0b",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
  {
    key: "selesai" as keyof Stats,
    label: "Selesai",
    sub: "Kendaraan keluar",
    color: "#10b981",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 6L9 17l-5-5"/>
      </svg>
    ),
  },
  {
    key: "hari_ini" as keyof Stats,
    label: "Hari Ini",
    sub: "Kendaraan masuk",
    color: "#8b5cf6",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
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

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Selamat Pagi" : now.getHours() < 17 ? "Selamat Siang" : "Selamat Sore";

  const fetchData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await vcfApi.getList({ tanggal: today, per_page: 100 });
      const allData: VcfSummary[] = (res.data.data || res.data || []) as VcfSummary[];
      const aktif = allData.filter(v => v.status !== "selesai" && v.status !== "reject" && v.status !== "ditolak").length;
      const selesai = allData.filter(v => v.status === "selesai").length;
      const hari_ini = allData.filter(v => v.tanggal === today).length;
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
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "11px 22px", borderRadius: 12, border: "none", cursor: registerLoading ? "not-allowed" : "pointer",
            background: "linear-gradient(135deg, #16a34a, #22c55e)",
            color: "white", fontWeight: 700, fontSize: 14,
            boxShadow: "0 4px 20px rgba(34,197,94,0.4)",
            opacity: registerLoading ? 0.75 : 1,
            transition: "all 0.2s",
          }}
        >
          {registerLoading
            ? <svg className="animate-spin" width="16" height="16" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/><path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>}
          {registerLoading ? "Memuat..." : "Registrasi VCF Baru"}
        </button>
      </div>

      {/* ── Stat Cards ─────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading ? [1,2,3,4].map(i => <StatCardSkeleton key={i}/>) : STAT_CARDS.map(card => (
          <div key={card.key} style={{
            borderRadius: 12, padding: "16px", position: "relative", overflow: "hidden",
            background: "var(--bg-card)", border: "1px solid var(--border)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, background: `${card.color}15`,
                display: "flex", alignItems: "center", justifyContent: "center", color: card.color,
              }}>
                {card.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1, fontFamily: "'Plus Jakarta Sans',sans-serif", letterSpacing: "-0.5px" }}>
                  {stats[card.key]}
                </p>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginTop: 2 }}>{card.label}</p>
                <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{card.sub}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Quick Actions (Officer only) ─────── */}
      {!isAdmin() && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
          background: "var(--bg-secondary)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#3b82f6,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Kendaraan Aktif</p>
              <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {loading ? "Memuat..." : `${vcfs.length} kendaraan sedang di area`}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ position: "relative" }}>
              <svg width="15" height="15" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input
                type="text" placeholder="Cari no. polisi / supir..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                style={{
                  paddingLeft: 32, paddingRight: 12, height: 34, borderRadius: 10, fontSize: 12,
                  background: "var(--bg-primary)", border: "1px solid var(--border)",
                  color: "var(--text-primary)", outline: "none", width: 200,
                }}
              />
            </div>
            <Link href="/vcf" style={{
              padding: "7px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600,
              background: "var(--bg-primary)", border: "1px solid var(--border)",
              color: "var(--text-secondary)", textDecoration: "none",
            }}>
              Lihat Semua
            </Link>
          </div>
        </div>

        {/* Card body */}
        <div style={{ padding: 20 }}>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} style={{ borderRadius: 14, height: 110, background: "var(--bg-secondary)", animation: "pulse 1.5s infinite" }}/>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.slice(0, 9).map(vcf => {
                const isLoading = vcf.tipe_kegiatan?.includes("loading");
                const statusClr = vcf.status === "selesai" ? "#10b981" : vcf.status === "reject" ? "#ef4444" : "#3b82f6";
                return (
                  <Link key={vcf.id} href={`/vcf/${vcf.id}`} style={{
                    display: "block", borderRadius: 16, padding: "16px 18px",
                    background: "var(--bg-secondary)", border: "1px solid var(--border)",
                    textDecoration: "none", transition: "all 0.2s", position: "relative", overflow: "hidden",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.borderColor = statusClr + "40"; (e.currentTarget as HTMLElement).style.boxShadow = `0 6px 24px ${statusClr}15`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.borderColor = ""; (e.currentTarget as HTMLElement).style.boxShadow = ""; }}>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2.5, background: `linear-gradient(90deg, ${statusClr}, transparent)` }}/>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: `${statusClr}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={statusClr} strokeWidth="2"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                        </div>
                        <div>
                          <p style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13, color: "#a78bfa" }}>{vcf.nomor_urut}</p>
                          <span className={`status-badge ${getStatusColor(vcf.status)}`} style={{ fontSize: 9 }}>{getStatusLabel(vcf.status)}</span>
                        </div>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--text-muted)" }}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{vcf.no_polisi}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
                        background: isLoading ? "rgba(139,92,246,0.12)" : "rgba(16,185,129,0.12)",
                        color: isLoading ? "#a78bfa" : "#34d399",
                      }}>
                        {vcf.tipe_kegiatan?.replace(/_/g, " ").toUpperCase()}
                      </span>
                    </div>
                    <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{vcf.driver?.nama_supir || "—"} · {vcf.transporter?.nama_transporter || "—"}</p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
