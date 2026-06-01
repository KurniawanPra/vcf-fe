"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import PageTransition from "@/components/PageTransition";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Listen for modal open/close events
  useEffect(() => {
    const handleModalOpen = () => setIsModalOpen(true);
    const handleModalClose = () => setIsModalOpen(false);
    
    window.addEventListener("modal-open", handleModalOpen);
    window.addEventListener("modal-close", handleModalClose);
    
    return () => {
      window.removeEventListener("modal-open", handleModalOpen);
      window.removeEventListener("modal-close", handleModalClose);
    };
  }, []);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar 
        collapsed={collapsed} 
        setCollapsed={setCollapsed}
        isMobile={isMobile}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      
      {/* Mobile overlay */}
      {isMobile && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.35)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            zIndex: 40,
            opacity: mobileOpen ? 1 : 0,
            pointerEvents: mobileOpen ? "auto" : "none",
            transition: "opacity 0.2s ease",
          }}
        />
      )}
      
      <main style={{
        flex: 1,
        overflow: "auto",
        background: "var(--bg-primary)",
        padding: isMobile ? "72px 16px 24px" : "24px",
        position: "relative",
      }}>
        {/* Mobile toggle button — simple design */}
        {isMobile && !isModalOpen && (
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{
              position: "fixed",
              top: 14,
              right: 14,
              zIndex: 100,
              width: 42,
              height: 42,
              borderRadius: 10,
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              color: mobileOpen ? "#dc2626" : "var(--text-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              transition: "all 0.15s ease",
            }}
          >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="4" y1={mobileOpen ? "4" : "7"} x2="20" y2={mobileOpen ? "20" : "7"} style={{ transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", transformOrigin: "center" }} />
                <line x1="4" y1="12" x2="20" y2="12" style={{ transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)", opacity: mobileOpen ? 0 : 1, transform: mobileOpen ? "scaleX(0)" : "scaleX(1)", transformOrigin: "center" }} />
                <line x1="4" y1={mobileOpen ? "20" : "17"} x2="20" y2={mobileOpen ? "4" : "17"} style={{ transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", transformOrigin: "center" }} />
              </svg>
          </button>
        )}
        <PageTransition>
          {children}
        </PageTransition>
      </main>
    </div>
  );
}