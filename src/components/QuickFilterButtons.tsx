// components/QuickFilterButtons.tsx
"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const QUICK_FILTERS = [
  { label: "Semua Aktif", stage: "aktif", cls: "filter-tab-green" },
  { label: "WB Masuk",    stage: "bagian1_selesai", cls: "filter-tab-amber" },
  { label: "WB Keluar",   stage: "bagian2_selesai", cls: "filter-tab-violet" },
  { label: "MG Keluar",   stage: "bagian3_selesai", cls: "filter-tab-emerald" },
];

export default function QuickFilterButtons() {
  const searchParams = useSearchParams();
  const currentStage = searchParams.get("stage");

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
      {QUICK_FILTERS.map((tab) => {
        const isActive = currentStage === tab.stage || (!currentStage && tab.stage === "aktif");
        return (
          <Link
            key={tab.stage}
            href={`/vcf?stage=${tab.stage}`}
            className={`filter-tab ${tab.cls} flex-shrink-0 ${isActive ? "active" : ""}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}