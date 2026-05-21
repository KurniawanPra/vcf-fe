"use client";

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage?: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalItems,
  itemsPerPage = 10,
  onPageChange,
  className = "",
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (totalPages <= 1) return null;

  // Build page number array with ellipsis logic
  const getPages = (): (number | "...")[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | "...")[] = [1];
    if (currentPage > 3) pages.push("...");
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  };

  const pages = getPages();
  const from = (currentPage - 1) * itemsPerPage + 1;
  const to = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 ${className}`}
      style={{ borderTop: "1px solid var(--border)" }}
    >
      {/* Info */}
      <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
        Menampilkan <span style={{ fontWeight: 700, color: "var(--text-secondary)" }}>{from}–{to}</span> dari{" "}
        <span style={{ fontWeight: 700, color: "var(--text-secondary)" }}>{totalItems}</span> data
      </p>

      {/* Controls */}
      <div className="flex items-center gap-1">
        {/* Prev */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{
            width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)",
            background: "var(--bg-secondary)", color: "var(--text-secondary)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: currentPage === 1 ? "not-allowed" : "pointer",
            opacity: currentPage === 1 ? 0.4 : 1,
            transition: "all 0.15s",
          }}
          title="Halaman sebelumnya"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        {/* Page numbers */}
        {pages.map((p, i) =>
          p === "..." ? (
            <span
              key={`ellipsis-${i}`}
              style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "var(--text-muted)" }}
            >
              ···
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              style={{
                width: 32, height: 32, borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: p === currentPage ? "1px solid rgba(99,102,241,0.5)" : "1px solid var(--border)",
                background: p === currentPage ? "rgba(99,102,241,0.15)" : "var(--bg-secondary)",
                color: p === currentPage ? "#818cf8" : "var(--text-secondary)",
                cursor: "pointer", transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                if (p !== currentPage) {
                  (e.currentTarget as HTMLElement).style.background = "var(--bg-card-hover)";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(99,102,241,0.3)";
                }
              }}
              onMouseLeave={(e) => {
                if (p !== currentPage) {
                  (e.currentTarget as HTMLElement).style.background = "var(--bg-secondary)";
                  (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                }
              }}
            >
              {p}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{
            width: 32, height: 32, borderRadius: 8, border: "1px solid var(--border)",
            background: "var(--bg-secondary)", color: "var(--text-secondary)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: currentPage === totalPages ? "not-allowed" : "pointer",
            opacity: currentPage === totalPages ? 0.4 : 1,
            transition: "all 0.15s",
          }}
          title="Halaman berikutnya"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
