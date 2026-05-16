"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { getUser, clearSession, isAdmin } from "@/lib/auth";
import { authApi } from "@/lib/api";
import { useTheme } from "./ThemeProvider";
import LogoutConfirmModal from "./LogoutConfirmModal";

const ADMIN_NAV = [
  {
    group: "Utama",
    collapsible: false,
    items: [
      {
        href: "/dashboard", label: "Dashboard",
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>,
      },
    ],
  },
  {
    group: "Operasional VCF",
    collapsible: true,
    items: [
      {
        href: "/vcf/list", label: "Daftar VCF",
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 12h6M9 16h4" /></svg>,
      },
      {
        href: "/vcf", label: "Input VCF",
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
      },
    ],
  },
  {
    group: "Master Data",
    collapsible: true,
    items: [
      { href: "/master/transporters", label: "Transporter", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13" rx="1" /><path d="M16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg> },
      { href: "/master/drivers", label: "Supir", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> },
      { href: "/master/produk", label: "Produk", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg> },
      { href: "/master/muatan-dibawa", label: "Muatan Dibawa", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg> },
      { href: "/master/muatan-diisi", label: "Muatan Diisi", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12" /><polyline points="7 10 12 15 17 10" /><path d="M20 21H4" /></svg> },
      { href: "/master/checklist", label: "Checklist Supir", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><polyline points="16 11 18 13 22 9" /></svg> },
      { href: "/master/pemeriksaan-masuk", label: "Checklist Masuk", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg> },
      { href: "/master/pemeriksaan-keluar", label: "Checklist Keluar", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg> },
      { href: "/master/vehicles", label: "Jenis Kendaraan", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-3" /><circle cx="7.5" cy="17.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></svg> },
      { href: "/master/users", label: "Pengguna", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg> },
      { href: "/settings", label: "Pengaturan", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M12 1v6m0 6v6m11-7h-6m-6 0H1" /></svg>, adminOnly: true },
    ],
  },
];

const OFFICER_NAV = [
  {
    group: "Operasional",
    collapsible: false,
    items: [
      { href: "/vcf", label: "VCF", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg> },
      { href: "/vcf/list", label: "Daftar VCF", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 12h6M9 16h4" /></svg> },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  isMobile?: boolean;
  mobileOpen?: boolean;
  setMobileOpen?: (v: boolean) => void;
}

export default function Sidebar({ collapsed, setCollapsed, isMobile, mobileOpen, setMobileOpen }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ nama: string; role: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    if (typeof window !== "undefined") {
      try { return JSON.parse(localStorage.getItem("sidebar-open-groups") || "{}"); } catch { return {}; }
    }
    return {};
  });

  useEffect(() => { setMounted(true); setUser(getUser()); }, []);
  useEffect(() => { setNavigatingTo(null); }, [pathname]);

  const toggleGroup = (g: string) => {
    setOpenGroups(prev => {
      const next = { ...prev, [g]: !prev[g] };
      if (typeof window !== "undefined") localStorage.setItem("sidebar-open-groups", JSON.stringify(next));
      return next;
    });
  };

  const isGroupOpen = (g: string) => openGroups[g] !== false;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try { await authApi.logout(); } catch { } finally {
      clearSession(); setIsLoggingOut(false); setIsLogoutModalOpen(false); router.push("/login");
    }
  };

  const navItems = isAdmin() ? ADMIN_NAV : OFFICER_NAV;
  const initials = user?.nama?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() ?? "??";

  const iconBtn = (onClick: () => void, title: string, children: React.ReactNode, danger = false): React.ReactNode => (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 28, height: 28, borderRadius: 6,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--text-muted)", background: "transparent",
        border: "none", cursor: "pointer", transition: "all 0.15s",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = danger ? "var(--bg-danger, rgba(239,68,68,0.08))" : "var(--bg-secondary)";
        if (danger) e.currentTarget.style.color = "var(--text-danger, #ef4444)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "var(--text-muted)";
      }}
    >
      {children}
    </button>
  );

  return (
    <>
      <aside style={{
        width: isMobile ? 280 : (collapsed ? 56 : 240),
        display: "flex",
        visibility: isMobile && !mobileOpen ? "hidden" : "visible",
        flexDirection: "column",
        height: "100%",
        flexShrink: 0,
        position: isMobile ? "fixed" : "relative",
        left: isMobile ? 0 : "auto",
        top: isMobile ? 0 : "auto",
        zIndex: isMobile ? 50 : "auto",
        transition: isMobile ? "transform 0.3s cubic-bezier(0.4,0,0.2,1)" : "width 0.25s cubic-bezier(0.4,0,0.2,1)",
        transform: isMobile && !mobileOpen ? "translateX(-100%)" : "translateX(0)",
        background: theme === "dark"
          ? "linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(9,18,38,0.98) 100%)"
          : "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(241,245,249,0.95) 100%)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRight: theme === "dark" ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.08)",
        overflow: "hidden",
      }}>

        {/* Shimmer top bar */}
        <div style={{
          height: 2, flexShrink: 0,
          background: "linear-gradient(90deg, transparent, rgba(34,197,94,0.5), rgba(59,130,246,0.5), transparent)",
        }} />

        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "10px 10px",
          borderBottom: theme === "dark" ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.07)",
          flexShrink: 0,
          minHeight: 52,
        }}>
          {/* Logo — only when expanded */}
          {!collapsed && <Image src="/logo.svg" alt="VCF" width={30} height={30} style={{ objectFit: "contain" }} />}

          {/* Title — only when expanded */}
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                VCF System
              </div>
              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>PT. Industri Nabati Lestari</div>
            </div>
          )}


          {/* Action buttons — expanded: theme + logout + collapse */}
          {!collapsed && !isMobile && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
              {iconBtn(toggleTheme, theme === "light" ? "Mode Gelap" : "Mode Terang",
                theme === "light"
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /></svg>
              )}
              {iconBtn(() => setCollapsed(true), "Tutup sidebar",
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
              )}
            </div>
          )}

          {/* Collapsed: only expand button */}
          {collapsed && !isMobile && (
            <div style={{ position: "absolute", left: 0, right: 0, display: "flex", justifyContent: "center" }}>
              {iconBtn(() => setCollapsed(false), "Buka sidebar",
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
              )}
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: "auto", padding: 8, minHeight: 0 }}>
          {mounted && navItems.map((group) => {
            const open = isGroupOpen(group.group);
            const hasActive = group.items.some(item =>
              item.href === "/vcf" ? pathname === "/vcf"
                : item.href === "/dashboard" ? pathname === "/dashboard"
                  : pathname.startsWith(item.href)
            );

            return (
              <div key={group.group} style={{ marginBottom: 4 }}>
                {/* Group header */}
                {!collapsed && (
                  group.collapsible ? (
                    <div
                      onClick={() => toggleGroup(group.group)}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "5px 8px", borderRadius: 6, cursor: "pointer",
                        marginBottom: 2, userSelect: "none", transition: "background 0.1s",
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.7px", display: "flex", alignItems: "center", gap: 5 }}>
                        {group.group}
                        {hasActive && !open && (
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent-primary, #22c55e)", display: "inline-block" }} />
                        )}
                      </span>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                        style={{ color: "var(--text-muted)", transform: open ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s" }}>
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </div>
                  ) : (
                    <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.7px", padding: "8px 8px 4px" }}>
                      {group.group}
                    </div>
                  )
                )}

                {/* Items */}
                <div style={{
                  overflow: "hidden",
                  maxHeight: (collapsed || open) ? "9999px" : "0px",
                  opacity: (collapsed || open) ? 1 : 0,
                  transition: "max-height 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.2s",
                }}>
                  {group.items.map((item) => {
                    const isActive = item.href === "/vcf"
                      ? pathname === "/vcf"
                      : item.href === "/dashboard"
                        ? pathname === "/dashboard"
                        : pathname.startsWith(item.href);
                    const isNav = navigatingTo === item.href;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        id={`nav-${item.href.replace(/\//g, "-").replace(/^-/, "")}`}
                        title={collapsed ? item.label : undefined}
                        onClick={() => { if (!isActive) setNavigatingTo(item.href); if (isMobile) setMobileOpen?.(false); }}
                        className={`nav-item mb-0.5 ${isActive ? "active" : ""} ${isNav ? "opacity-70" : ""}`}
                        style={collapsed ? { justifyContent: "center", padding: "9px" } : {}}
                      >
                        {isNav ? (
                          <svg className="animate-spin flex-shrink-0" width="16" height="16" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : item.icon}
                        {!collapsed && <span>{item.label}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer — user card + logout */}
        <div style={{
          flexShrink: 0,
          padding: "12px",
          borderTop: theme === "dark" ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.07)",
        }}>
          {user && (
            <>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: collapsed ? "8px" : "12px",
                borderRadius: 10,
                background: theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                border: theme === "dark" ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.06)",
                justifyContent: collapsed ? "center" : "flex-start",
                marginBottom: 8,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: theme === "dark" ? "white" : "black",
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                {!collapsed && (
                  <div style={{ overflow: "hidden", minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {user.nama}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "capitalize", letterSpacing: "0.05em", marginTop: 1 }}>
                      {user.role === "admin" ? "Administrator" : "Security Officer"}
                    </div>
                  </div>
                )}
              </div>

              {/* Logout button */}
              <button
                onClick={() => setIsLogoutModalOpen(true)}
                style={{
                  width: "100%",
                  padding: collapsed ? "10px" : "10px 12px",
                  borderRadius: 8,
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  color: "#ef4444",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: collapsed ? "center" : "flex-start",
                  gap: 8,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)";
                  e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.3)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
                  e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.2)";
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                {!collapsed && <span>Keluar</span>}
              </button>
            </>
          )}
        </div>

      </aside>

      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
        loading={isLoggingOut}
      />
    </>
  );
}