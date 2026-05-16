"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { setSession } from "@/lib/auth";
import { Column } from "jspdf-autotable";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await authApi.login(username, password);
      const { token, user } = response.data;
      setSession(token, user);
      router.push(user.role === "admin" ? "/dashboard" : "/vcf");
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.errors) {
        const firstKey = Object.keys(data.errors)[0];
        setError(data.errors[firstKey][0]);
      } else {
        setError(data?.message || "Username atau password salah.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", fontFamily: "'Plus Jakarta Sans', sans-serif", background: "#f0efeb" }}>
      <style>{`
        @keyframes lspin { to { transform: rotate(360deg); } }
        .l-spin { animation: lspin 0.75s linear infinite; display: block; }

        .l-input {
          width: 100%; height: 44px;
          border: 1px solid #dddbd5;
          border-radius: 8px;
          background: #faf9f7;
          color: #111;
          font-size: 14px;
          font-family: inherit;
          padding: 0 40px 0 13px;
          transition: border-color .15s, box-shadow .15s, background .15s;
          box-sizing: border-box;
          -webkit-appearance: none;
        }
        .l-input::placeholder { color: #bbb; }
        .l-input:focus {
          outline: none;
          border-color: #111;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(0,0,0,0.07);
        }
        .l-btn {
          width: 100%; height: 44px;
          background: #111; color: #fff;
          border: none; border-radius: 8px;
          font-size: 14px; font-weight: 600;
          font-family: inherit; letter-spacing: 0.01em;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 7px;
          transition: background .15s, transform .1s;
        }
        .l-btn:hover:not(:disabled) { background: #222; }
        .l-btn:active:not(:disabled) { transform: scale(0.99); }
        .l-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .l-brand { display: none; }
        .l-mobile-logo { display: flex; }
        @media (min-width: 1024px) {
          .l-brand { display: flex; }
          .l-mobile-logo { display: none; }
        }
      `}</style>

      {/* ── Left brand panel ── */}
      <div className="l-brand" style={{
        width: 420, flexShrink: 0,
        background: "#111",
        flexDirection: "column",
        padding: "48px 44px",
        position: "relative", overflow: "hidden",
      }}>
        {/* subtle grid texture */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.04,
          backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
          backgroundSize: "32px 32px",
        }} />

        {/* Logo */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <img src="/logo.svg" alt="VCF Logo" style={{ width: 64, height: "auto", marginBottom: 20 }} />
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginBottom: 6 }}>
            PT. Industri Nabati Lestari
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", lineHeight: 1.3, marginBottom: 6 }}>
            Vehicle Control<br />Form System
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, maxWidth: 260, marginTop: 10 }}>
            Pencatatan keluar masuk kendaraan di Main Gate dan Weighbridge PT. INL Sei Mangkei.
          </div>
        </div>

        {/* Bottom badges */}
        <div style={{ marginTop: "auto", position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", text: "QR Code di setiap formulir VCF" },
            { icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z", text: "Login sesuai jabatan petugas" },
            { icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", text: "No. Dokumen FM-BSHS-42/01" },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.75">
                <path d={item.icon} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "40px 24px",
      }}>
        {/* Mobile logo */}
        <div className="l-mobile-logo" style={{ alignItems: "center", gap: 12, marginBottom: -16, flexDirection: "column" }}>
          <img src="/logo.svg" alt="VCF Logo" style={{ width: 90, height: "auto" }} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#111" }}>PT. Industri Nabati Lestari</div>
            <div style={{ fontSize: 11, color: "#999", textAlign: "center" }}>Vehicle Control Form System</div>
          </div>
        </div>

        {/* Form card */}
        <div style={{
          width: "100%", maxWidth: 380,
          background: "#fff",
          border: "1px solid #e5e3de",
          borderRadius: 14,
          marginTop: "3rem",
          padding: "36px 32px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.03), 0 12px 40px rgba(0,0,0,0.07)",
        }}>
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#bbb", marginBottom: 8 }}>
              VCF System
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111", margin: 0, lineHeight: 1.25 }}>
              Masuk ke Sistem VCF
            </h1>
            <p style={{ fontSize: 13, color: "#999", marginTop: 6, marginBottom: 0 }}>
              Gunakan kredensial yang diberikan admin
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8,
              padding: "10px 12px", display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 20,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span style={{ fontSize: 13, color: "#dc2626", lineHeight: 1.5 }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} noValidate>
            {/* Username */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 6 }} htmlFor="username">
                Username
              </label>
              <div style={{ position: "relative" }}>
                <input id="username" type="text" className="l-input"
                  placeholder="Masukkan username"
                  value={username} onChange={e => setUsername(e.target.value)}
                  required autoComplete="username"
                />
                <span style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", color: "#ccc", display: "flex", pointerEvents: "none" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 22 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 6 }} htmlFor="password">
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input id="password" type={showPassword ? "text" : "password"} className="l-input"
                  placeholder="Masukkan password"
                  value={password} onChange={e => setPassword(e.target.value)}
                  required autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? "Sembunyikan" : "Tampilkan"}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#bbb", display: "flex", alignItems: "center", padding: 4, borderRadius: 4, transition: "color .15s" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#666")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#bbb")}
                >
                  {showPassword ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="l-btn" disabled={loading}>
              {loading ? (
                <>
                  <svg className="l-spin" width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                    <path d="M4 12a8 8 0 018-8" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Memproses...
                </>
              ) : (
                <>
                  Masuk
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <div style={{ borderTop: "1px solid #f0ede8", marginTop: 24, paddingTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, color: "#c0bdb7", display: "flex", alignItems: "center", gap: 5 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Akses Khusus
            </span>
            <span style={{ fontSize: 11, color: "#c0bdb7", letterSpacing: "0.03em" }}>FM-BSHS-42/01</span>
          </div>

        </div>
      <p style={{ fontSize: 11, color: "#bbb", marginTop: 20, letterSpacing: "0.04em" }}>
        © 2026 PT. Industri Nabati Lestari
      </p>
      </div>
    </div>
  );
}