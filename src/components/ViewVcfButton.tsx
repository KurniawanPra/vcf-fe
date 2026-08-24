import { useState } from "react";
import Link from "next/link";

interface ViewVcfButtonProps {
  label?: string;
  href?: string;
}

export default function ViewVcfButton({ label = "Lihat VCF Hari Ini", href = "/vcf" }: ViewVcfButtonProps) {
  const [nav, setNav] = useState(false);
  return (
    <Link
      href={href}
      onClick={() => setNav(true)}
      className="action-btn action-btn-blue group"
      style={{ padding: "8px 16px", fontSize: "13px", borderRadius: "8px" }}
    >
      <span className="relative flex items-center gap-2">
        {nav ? (
          <div className="w-4 h-4 rounded-full border-2 border-current/30 border-t-current animate-spin" />
        ) : (
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5"
            strokeLinecap="round"
            className="transition-transform duration-300 group-hover:rotate-90"
          >
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        )}
        <span className="tracking-wide">{nav ? "Memuat..." : label}</span>
      </span>
    </Link>
  );
}
