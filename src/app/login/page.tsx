"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { setSession } from "@/lib/auth";
import PageTransition from "@/components/PageTransition";

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
    <PageTransition>
      {/* Custom Truck Cursor Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        .login-truck-wrapper {
          cursor: url('/truck.png'), auto !important;
        }
        .login-truck-wrapper button,
        .login-truck-wrapper a,
        .login-truck-wrapper label,
        .login-truck-wrapper .cursor-pointer,
        .login-truck-wrapper button * {
          cursor: url('/truck-pointer.png'), pointer !important;
        }
        .login-truck-wrapper input[type="text"],
        .login-truck-wrapper input[type="password"] {
          cursor: text !important;
        }
      `}} />
      <div className="login-truck-wrapper min-h-screen flex" style={{ background: "var(--bg-primary)" }}>
        {/* ── Left brand panel ── */}
        <div className="hidden lg:flex flex-col relative overflow-hidden" style={{ width: 480 }}>
          {/* Dark green enterprise gradient background (Dashboard theme darkened) */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0d2e19] via-[#164e2a] to-[#10381e]"></div>
          
          {/* Subtle geometric pattern overlay */}
          <div style={{
            position: "absolute", inset: 0, opacity: 0.05,
            backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
            backgroundSize: "40px 40px",
          }} />

          {/* Ambient light flares */}
          <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-500/20 blur-[100px] -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"></div>
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-indigo-500/10 blur-[120px] translate-x-1/3 translate-y-1/3 rounded-full pointer-events-none"></div>

          <div className="relative z-10 p-12 flex flex-col h-full">
            <div className="flex flex-col mb-auto">
              
              {/* ── Plain Left-Aligned Logo with Erratic Liquid Glow ── */}
              <div className="mb-8 flex justify-start relative w-max">
                <style dangerouslySetInnerHTML={{__html: `
                  @keyframes liquid-blob-1 {
                    0%   { border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; transform: translate(0px, 0px) rotate(0deg) scale(1.1); }
                    25%  { border-radius: 70% 30% 50% 50% / 30% 30% 70% 70%; transform: translate(15px, -15px) rotate(90deg) scale(1.15); }
                    50%  { border-radius: 100% 60% 60% 100% / 100% 100% 60% 60%; transform: translate(-10px, 15px) rotate(180deg) scale(1.05); }
                    75%  { border-radius: 30% 70% 40% 60% / 60% 40% 50% 50%; transform: translate(-15px, -10px) rotate(270deg) scale(1.2); }
                    100% { border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; transform: translate(0px, 0px) rotate(360deg) scale(1.1); }
                  }
                  @keyframes liquid-blob-2 {
                    0%   { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; transform: translate(0px, 0px) rotate(360deg) scale(1.1); }
                    25%  { border-radius: 30% 70% 70% 30% / 50% 60% 40% 50%; transform: translate(-20px, 10px) rotate(270deg) scale(1.05); }
                    50%  { border-radius: 50% 50% 30% 70% / 70% 40% 60% 30%; transform: translate(15px, 20px) rotate(180deg) scale(1.2); }
                    75%  { border-radius: 70% 30% 60% 40% / 40% 70% 30% 60%; transform: translate(10px, -20px) rotate(90deg) scale(1.15); }
                    100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; transform: translate(0px, 0px) rotate(0deg) scale(1.1); }
                  }
                  .animate-liquid-1 {
                    animation: liquid-blob-1 12s ease-in-out infinite;
                  }
                  .animate-liquid-2 {
                    animation: liquid-blob-2 15s ease-in-out infinite;
                  }
                `}} />
                
                {/* Kabut putih berbentuk liquid ganda & bergerak acak */}
                <div className="absolute inset-0 bg-white/70 blur-md pointer-events-none animate-liquid-1"></div>
                <div className="absolute inset-0 bg-white/60 blur-lg pointer-events-none animate-liquid-2 mix-blend-overlay"></div>
                <div className="absolute inset-0 bg-white/40 blur-xl pointer-events-none scale-125"></div>
                
                <Image
                  src="/logo_primary.png"
                  alt="VCF Logo"
                  width={140}
                  height={140}
                  className="object-contain relative z-10 drop-shadow-lg"
                  priority
                />
              </div>

              <div className="text-[12px] font-bold tracking-[0.15em] text-white/70 uppercase mb-3">
                PT. Industri Nabati Lestari
              </div>
              <h1 className="text-4xl font-bold text-white leading-[1.1] mb-6">
                Vehicle<br />Control Form<br />System
              </h1>
              <p className="text-sm text-white/70 leading-relaxed max-w-[280px] mb-12">
                Sistem terpadu pencatatan keluar masuk kendaraan di Main Gate dan Weighbridge PT. Industri Nabati Lestari Sei Mangkei.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {[
                {
                  icon: "M3 5a2 2 0 012-2h4v4H5v4H1V5a2 2 0 012-2zm10-2h4a2 2 0 012 2v4h-4V5h-4V1zm6 10v4a2 2 0 01-2 2h-4v-4h4v-4h4zm-10 8H5a2 2 0 01-2-2v-4h4v4h4v4z",
                  text: "Tanda tangan petugas berbasis QR Code"
                },
                {
                  icon: "M12 14c2.761 0 5-2.239 5-5S14.761 4 12 4 7 6.239 7 9s2.239 5 5 5zm0 2c-3.314 0-6 2.686-6 6h12c0-3.314-2.686-6-6-6z",
                  text: "Akses sistem sesuai peran pengguna"
                },
                {
                  icon: "M9 12h6m-6 4h6M7 3h8l4 4v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z",
                  text: "Pencatatan sesuai standar dokumen FM-BSHS-42/01"
                },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="2"
                    >
                      <path
                        d={item.icon}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <span className="text-sm text-white/80">
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right form panel ── */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative">
          <div className="w-full max-w-[400px]">
            {/* Mobile logo */}
            <div className="lg:hidden flex flex-col items-center mb-8">
              <div className="p-3 -mb-10">
                <Image src="/logo_primary.png" alt="VCF Logo" width={160} height={160} className="object-contain" />
              </div>
              <div className="text-center -mt-4">
                <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>PT. Industri Nabati Lestari</h2>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Vehicle Control Form System</p>
              </div>
            </div>

            {/* Form card */}
            <div className="glass-card p-8 md:p-10 w-full relative z-10" style={{ borderColor: "var(--border)" }}>
              <div className="mb-8">
                <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Masuk ke Sistem</h1>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Masukkan kredensial Anda untuk melanjutkan</p>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-6 p-4 rounded-xl flex gap-3 items-start" style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.2)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" className="mt-0.5 shrink-0">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</span>
                </div>
              )}

              <form onSubmit={handleLogin} noValidate className="space-y-5">
                {/* Username */}
                <div>
                  <label className="form-label mb-2 block" htmlFor="username">Username</label>
                  <div className="relative">
                    <input
                      id="username"
                      type="text"
                      className="form-input w-full"
                      placeholder="Masukkan username Anda"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      required
                      autoComplete="username"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                      </svg>
                    </span>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="form-label mb-2 block" htmlFor="password">Password</label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      className="form-input w-full pr-12"
                      placeholder="Masukkan password Anda"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      {showPassword ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <button 
                type="submit" 
                className="btn w-full h-12 text-base font-semibold mt-6 bg-gradient-to-r from-[#0d2e19] via-[#164e2a] to-[#10381e] text-white border-none hover:shadow-lg hover:brightness-110 hover:-translate-y-0.5 transition-all duration-300" 
                disabled={loading}
              >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span>Memproses...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <span>Masuk ke Sistem</span>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </div>
                  )}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
                <span className="text-xs font-medium flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Akses Terbatas
                </span>
                <span className="text-[10px] font-bold tracking-wider" style={{ color: "var(--text-muted)" }}>FM-BSHS-42/01</span>
              </div>
            </div>

            <div className="text-center mt-8">
              <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                © 2026 PT. Industri Nabati Lestari
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}