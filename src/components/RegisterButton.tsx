import { useState } from "react";
import { useRouter } from "next/navigation";

interface RegisterButtonProps {
  label?: string;
  href?: string;
}

export default function RegisterButton({ label = "Registrasi Baru", href = "/vcf/register" }: RegisterButtonProps) {
  const router = useRouter();
  const [nav, setNav] = useState(false);
  return (
    <button
      onClick={() => { setNav(true); router.push(href); }}
      disabled={nav}
      className="action-btn action-btn-blue group"
      style={{ padding: "10px 24px", fontSize: "13px", borderRadius: "9999px" }}
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
            className="transition-transform duration-300 group-hover:rotate-180"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v8M8 12h8" />
          </svg>
        )}
        <span className="tracking-wide">{nav ? "Memuat..." : label}</span>
      </span>
    </button>
  );
}