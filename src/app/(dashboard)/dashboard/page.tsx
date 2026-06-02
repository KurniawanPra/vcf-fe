"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { activityLogApi, vcfApi } from "@/lib/api";
import { getUser, isAdmin } from "@/lib/auth";
import Pagination from "@/components/Pagination";
import MobileCardSkeleton from "@/components/MobileCardSkeleton";
import TableRowSkeleton from "@/components/TableRowSkeleton";
import RegisterButton from "@/components/RegisterButton";
import ViewVcfButton from "@/components/ViewVcfButton";
import SearchInput from "@/components/SearchInput";

interface ActivityLog {
  id: number;
  user_id: number | null;
  user_name: string | null;
  user_role: string | null;
  event: string;
  module: string;
  action: string;
  subject_type: string | null;
  subject_id: number | null;
  description: string;
  subject_label: string | null;
  properties: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
}

interface AnomalyStatPoint {
  date: string;
  day: string;
  count: number;
  baseline: number;
  lower_bound: number;
  upper_bound: number;
  is_anomaly: boolean;
}

interface VcfDailyStat {
  date: string;
  fullDate: string;
  day: string;
  total: number;
  completed: number;
  activeInArea: number;
  rejected: number;
  isUp: boolean;
}

interface MonthlyChartPoint {
  date: string;
  total: number;
  completed: number;
  rejected: number;
  pending: number;
}

interface MonthlyLineChartProps {
  data: MonthlyChartPoint[];
  loading: boolean;
  year: number;
  month: number;
  isFullscreen: boolean;
}

const INDONESIAN_MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

function MonthlyLineChart({ data, loading, year, month, isFullscreen }: MonthlyLineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const daysInMonth = useMemo(() => {
    return new Date(year, month, 0).getDate();
  }, [year, month]);

  const chartPoints = useMemo(() => {
    const points = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const found = data.find((item) => item.date === dateStr);
      points.push({
        day: d,
        dateStr,
        total: found ? Number(found.total) : 0,
        completed: found ? Number(found.completed) : 0,
        rejected: found ? Number(found.rejected) : 0,
        pending: found ? Number(found.pending) : 0,
      });
    }
    return points;
  }, [data, year, month, daysInMonth]);

  const width = 800;
  const height = 300;
  const yAxisWidth = 45;
  const xAxisHeight = 25;
  const paddingRight = 15;
  const paddingTop = 20;
  const plotWidth = width - yAxisWidth - paddingRight;
  const plotHeight = height - xAxisHeight - paddingTop;

  // Calculate Y scale
  const maxDataVal = Math.max(...chartPoints.map(p => Math.max(p.total, p.completed, p.rejected, p.pending)), 0);
  const range = maxDataVal;
  const padding = range > 0 ? Math.ceil(range * 0.1) : 1;
  const yMax = Math.max(5, maxDataVal + padding);

  const mapX = (day: number) => {
    if (daysInMonth <= 1) return yAxisWidth + plotWidth / 2;
    return yAxisWidth + ((day - 1) / (daysInMonth - 1)) * plotWidth;
  };
  const mapY = (val: number) => {
    return paddingTop + plotHeight - (val / yMax) * plotHeight;
  };

  // Generate grid values
  const yDivisions = 5;
  const yGridLines = useMemo(() => {
    const lines = [];
    for (let i = 0; i <= yDivisions; i++) {
      const val = (yMax / yDivisions) * i;
      lines.push({
        val: Math.round(val),
        y: mapY(val),
      });
    }
    return lines;
  }, [yMax]);

  const xLabelDays = useMemo(() => {
    const labelDays = [1, 5, 10, 15, 20, 25, daysInMonth];
    return Array.from(new Set(labelDays)).filter(d => d <= daysInMonth);
  }, [daysInMonth]);

  // Generate path coordinates
  const totalPathD = useMemo(() => {
    if (chartPoints.length === 0) return "";
    return chartPoints.map((p, idx) => `${idx === 0 ? "M" : "L"} ${mapX(p.day)} ${mapY(p.total)}`).join(" ");
  }, [chartPoints, daysInMonth, yMax]);

  const totalFillD = useMemo(() => {
    if (chartPoints.length === 0) return "";
    const linePath = chartPoints.map((p, idx) => `${idx === 0 ? "M" : "L"} ${mapX(p.day)} ${mapY(p.total)}`).join(" ");
    return `${linePath} L ${mapX(chartPoints[chartPoints.length - 1].day)} ${mapY(0)} L ${mapX(chartPoints[0].day)} ${mapY(0)} Z`;
  }, [chartPoints, daysInMonth, yMax]);

  const completedPathD = useMemo(() => {
    if (chartPoints.length === 0) return "";
    return chartPoints.map((p, idx) => `${idx === 0 ? "M" : "L"} ${mapX(p.day)} ${mapY(p.completed)}`).join(" ");
  }, [chartPoints, daysInMonth, yMax]);

  const completedFillD = useMemo(() => {
    if (chartPoints.length === 0) return "";
    const linePath = chartPoints.map((p, idx) => `${idx === 0 ? "M" : "L"} ${mapX(p.day)} ${mapY(p.completed)}`).join(" ");
    return `${linePath} L ${mapX(chartPoints[chartPoints.length - 1].day)} ${mapY(0)} L ${mapX(chartPoints[0].day)} ${mapY(0)} Z`;
  }, [chartPoints, daysInMonth, yMax]);

  const rejectedPathD = useMemo(() => {
    if (chartPoints.length === 0) return "";
    return chartPoints.map((p, idx) => `${idx === 0 ? "M" : "L"} ${mapX(p.day)} ${mapY(p.rejected)}`).join(" ");
  }, [chartPoints, daysInMonth, yMax]);

  const pendingPathD = useMemo(() => {
    if (chartPoints.length === 0) return "";
    return chartPoints.map((p, idx) => `${idx === 0 ? "M" : "L"} ${mapX(p.day)} ${mapY(p.pending)}`).join(" ");
  }, [chartPoints, daysInMonth, yMax]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (loading || chartPoints.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const svgX = (mouseX / rect.width) * width;
    
    if (svgX >= yAxisWidth && svgX <= width - paddingRight) {
      const pctX = (svgX - yAxisWidth) / plotWidth;
      const day = Math.max(1, Math.min(daysInMonth, Math.round(1 + pctX * (daysInMonth - 1))));
      setHoveredDay(day);
      setTooltipPos({ x: mouseX, y: mouseY });
    } else {
      setHoveredDay(null);
      setTooltipPos(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredDay(null);
    setTooltipPos(null);
  };

  const hoveredPoint = hoveredDay !== null ? chartPoints[hoveredDay - 1] : null;

  return (
    <div ref={containerRef} className="relative w-full h-full flex flex-col select-none">
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-xs font-medium text-slate-400 dark:text-slate-500">
          Memuat data grafik...
        </div>
      ) : chartPoints.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-xs font-medium text-slate-400 dark:text-slate-500">
          Tidak ada data log aktivitas VCF
        </div>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-full"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <defs>
              <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Y Axis Grid Lines & Labels */}
            {yGridLines.map((line, idx) => (
              <g key={idx}>
                <line
                  x1={yAxisWidth}
                  y1={line.y}
                  x2={width - paddingRight}
                  y2={line.y}
                  className="stroke-slate-200 dark:stroke-slate-800/40"
                  strokeWidth="1"
                />
                <text
                  x={yAxisWidth - 8}
                  y={line.y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="fill-slate-400 dark:fill-slate-500 font-mono text-[9px]"
                >
                  {line.val}
                </text>
              </g>
            ))}

            {/* X Axis Grid Lines & Labels */}
            {xLabelDays.map((d, idx) => {
              const x = mapX(d);
              return (
                <g key={idx}>
                  <line
                    x1={x}
                    y1={paddingTop}
                    x2={x}
                    y2={paddingTop + plotHeight}
                    className="stroke-slate-200 dark:stroke-slate-800/40"
                    strokeWidth="1"
                  />
                  <text
                    x={x}
                    y={paddingTop + plotHeight + 6}
                    textAnchor="middle"
                    dominantBaseline="hanging"
                    className="fill-slate-400 dark:fill-slate-500 font-sans text-[9px] font-semibold"
                  >
                    Tgl {d}
                  </text>
                </g>
              );
            })}

            {/* Axis borders */}
            <line
              x1={yAxisWidth}
              y1={paddingTop}
              x2={yAxisWidth}
              y2={paddingTop + plotHeight}
              className="stroke-slate-300 dark:stroke-slate-700"
              strokeWidth="1.5"
            />
            <line
              x1={yAxisWidth}
              y1={paddingTop + plotHeight}
              x2={width - paddingRight}
              y2={paddingTop + plotHeight}
              className="stroke-slate-300 dark:stroke-slate-700"
              strokeWidth="1.5"
            />

            {/* Paths and Area Fills */}
            <path d={totalFillD} fill="url(#gradTotal)" />
            <path d={completedFillD} fill="url(#gradCompleted)" />

            <path
              d={totalPathD}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={completedPathD}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={pendingPathD}
              fill="none"
              stroke="#eab308"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={rejectedPathD}
              fill="none"
              stroke="#f43f5e"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Hover Crosshair and Highlights */}
            {hoveredDay !== null && chartPoints[hoveredDay - 1] && (
              <g>
                <line
                  x1={mapX(hoveredDay)}
                  y1={paddingTop}
                  x2={mapX(hoveredDay)}
                  y2={paddingTop + plotHeight}
                  className="stroke-slate-400 dark:stroke-slate-500/80"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />

                <circle
                  cx={mapX(hoveredDay)}
                  cy={mapY(chartPoints[hoveredDay - 1].total)}
                  r="4.5"
                  className="fill-white dark:fill-slate-900 stroke-blue-500"
                  strokeWidth="2"
                />
                <circle
                  cx={mapX(hoveredDay)}
                  cy={mapY(chartPoints[hoveredDay - 1].completed)}
                  r="4.5"
                  className="fill-white dark:fill-slate-900 stroke-emerald-500"
                  strokeWidth="2"
                />
                <circle
                  cx={mapX(hoveredDay)}
                  cy={mapY(chartPoints[hoveredDay - 1].pending)}
                  r="4.5"
                  className="fill-white dark:fill-slate-900 stroke-yellow-500"
                  strokeWidth="2"
                />
                <circle
                  cx={mapX(hoveredDay)}
                  cy={mapY(chartPoints[hoveredDay - 1].rejected)}
                  r="4.5"
                  className="fill-white dark:fill-slate-900 stroke-rose-500"
                  strokeWidth="2"
                />
              </g>
            )}
          </svg>

          {/* HTML Tooltip overlay */}
          {hoveredPoint && tooltipPos && (
            <div
              className="absolute z-35 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs text-xs pointer-events-none flex flex-col gap-1 transition-all duration-75 select-none"
              style={{
                left: `${tooltipPos.x + 15 + 150 > containerRef.current?.clientWidth! ? tooltipPos.x - 165 : tooltipPos.x + 15}px`,
                top: `${Math.max(10, Math.min(containerRef.current?.clientHeight! - 95, tooltipPos.y - 45))}px`,
                width: "150px",
              }}
            >
              <div className="font-extrabold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-1 mb-1 font-display">
                {hoveredDay} {INDONESIAN_MONTHS[month - 1]} {year}
              </div>
              <div className="text-blue-600 dark:text-blue-400 font-bold flex justify-between font-mono">
                <span>Total:</span>
                <span>{hoveredPoint.total}</span>
              </div>
              <div className="text-emerald-600 dark:text-emerald-400 font-bold flex justify-between font-mono">
                <span>Selesai:</span>
                <span>{hoveredPoint.completed}</span>
              </div>
              <div className="text-yellow-600 dark:text-yellow-500 font-bold flex justify-between font-mono">
                <span>Tertunda:</span>
                <span>{hoveredPoint.pending}</span>
              </div>
              <div className="text-rose-600 dark:text-rose-450 font-bold flex justify-between font-mono">
                <span>Reject:</span>
                <span>{hoveredPoint.rejected}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface VcfStats {
  total_overall: number;
  total_today: number;
  total_month: number;
  completed_overall: number;
  completed_today: number;
  completed_month: number;
  reject_overall: number;
  reject_today: number;
  reject_month: number;
  active_in_area: number;
  pending: number;
  blacklist_drivers: number;
  system_speed: number;
  weekly_anomaly_stats?: AnomalyStatPoint[];
}

const MODULE_OPTIONS = [
  { value: "", label: "Semua Modul" },
  { value: "vcf", label: "VCF (Transaksi)" },
  { value: "master", label: "Master Data" },
  { value: "auth", label: "Autentikasi" },
  { value: "settings", label: "Pengaturan" },
  { value: "timbangan", label: "Timbangan" },
  { value: "violation", label: "Pelanggaran" },
];

const ACTION_OPTIONS = [
  { value: "", label: "Semua Aksi" },
  { value: "created", label: "Created (Tambah)" },
  { value: "updated", label: "Updated (Ubah)" },
  { value: "deleted", label: "Deleted (Hapus)" },
  { value: "rejected", label: "Rejected (Tolak)" },
  { value: "finalized", label: "Finalized (Selesai)" },
  { value: "stage_completed", label: "Stage Done" },
  { value: "login", label: "Login" },
  { value: "logout", label: "Logout" },
];

const QUICK_ACTIONS = [
  { href: "/vcf/register", label: "Main Gate Masuk", sub: "Registrasi kendaraan baru", stage: "Bagian 1", colorClass: "border-blue-500/20 hover:border-blue-500", barBg: "bg-blue-500", iconBg: "bg-blue-50 dark:bg-blue-900/20", iconText: "text-blue-600 dark:text-blue-400" },
  { href: "/vcf?stage=bagian1_selesai", label: "Weighbridge Masuk", sub: "Timbang & periksa masuk", stage: "Bagian 2", colorClass: "border-amber-500/20 hover:border-amber-500", barBg: "bg-amber-500", iconBg: "bg-amber-50 dark:bg-amber-900/20", iconText: "text-amber-600 dark:text-amber-400" },
  { href: "/vcf?stage=loading_unloading_selesai", label: "Weighbridge Keluar", sub: "Timbang & periksa keluar", stage: "Bagian 3", colorClass: "border-purple-500/20 hover:border-purple-500", barBg: "bg-purple-500", iconBg: "bg-purple-50 dark:bg-purple-900/20", iconText: "text-purple-600 dark:text-purple-400" },
  { href: "/vcf?stage=bagian3_selesai", label: "Main Gate Keluar", sub: "Penutupan & keluar", stage: "Bagian 4", colorClass: "border-emerald-500/20 hover:border-emerald-500", barBg: "bg-emerald-500", iconBg: "bg-emerald-50 dark:bg-emerald-900/20", iconText: "text-emerald-600 dark:text-emerald-400" },
];

function StatCardSkeleton() {
  return <div className="h-24 w-full rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse border border-slate-200 dark:border-slate-700" />;
}

function parseUserAgent(ua: string | null) {
  if (!ua) return { os: "Sistem / Tidak diketahui", browser: "Sistem / Tidak diketahui" };
  let os = "Lainnya";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Macintosh") || ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  let browser = "Lainnya";
  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Chrome") && !ua.includes("Chromium") && !ua.includes("Edg")) browser = "Chrome";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";

  return { os, browser };
}

export default function DashboardPage() {
  const router = useRouter();
  const user = getUser();

  // States
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<VcfStats>({
    total_overall: 0,
    total_today: 0,
    total_month: 0,
    completed_overall: 0,
    completed_today: 0,
    completed_month: 0,
    reject_overall: 0,
    reject_today: 0,
    reject_month: 0,
    active_in_area: 0,
    pending: 0,
    blacklist_drivers: 0,
    system_speed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"card" | "table">("table");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // States for Monthly Line Chart
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [monthlyChartData, setMonthlyChartData] = useState<MonthlyChartPoint[]>([]);
  const [monthlyChartLoading, setMonthlyChartLoading] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState("");
  const [selectedAction, setSelectedAction] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  // Modal Detail Log
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const now = new Date();

  // Fetch VCF Stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await vcfApi.getStats();
      if (res.data) {
        setStats(res.data);
        setStatsLoading(false);
      }
    } catch {
      // silent fail
    }
  }, []);

  // Fetch Logs Data
  const fetchLogs = useCallback(async (page: number) => {
    try {
      setLoading(true);
      const params: any = {
        page,
        per_page: 15,
        search: searchQuery,
        module: selectedModule,
        action: selectedAction,
      };

      if (selectedDate) {
        params.date = selectedDate;
      }

      const res = await activityLogApi.getList(params);
      if (res.data) {
        setLogs(res.data.data || []);
        setTotalItems(res.data.total || 0);
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedModule, selectedAction, selectedDate]);

  // Fetch Monthly Chart Data
  const fetchMonthlyChartData = useCallback(async () => {
    try {
      setMonthlyChartLoading(true);
      const res = await vcfApi.getMonthlyChart(selectedYear, selectedMonth);
      if (res.data) {
        setMonthlyChartData(res.data);
      }
    } catch {
      // silent fail
    } finally {
      setMonthlyChartLoading(false);
    }
  }, [selectedYear, selectedMonth]);

  // Fetch monthly chart on month or year change
  useEffect(() => {
    fetchMonthlyChartData();
    const chartInterval = setInterval(fetchMonthlyChartData, 30000);
    return () => {
      clearInterval(chartInterval);
    };
  }, [fetchMonthlyChartData]);

  // Initial fetch and polling
  useEffect(() => {
    fetchStats();
    fetchLogs(currentPage);

    const statsInterval = setInterval(fetchStats, 2000);
    const logsInterval = setInterval(() => fetchLogs(currentPage), 30000);

    return () => {
      clearInterval(statsInterval);
      clearInterval(logsInterval);
    };
  }, [fetchStats, fetchLogs, currentPage]);

  // Lock body scroll when chart fullscreen modal is open
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isFullscreen]);

  // Exit fullscreen on Escape key press
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullscreen]);

  // Dispatch modal events for layout
  useEffect(() => {
    if (selectedLog) {
      window.dispatchEvent(new CustomEvent("modal-open"));
    } else {
      window.dispatchEvent(new CustomEvent("modal-close"));
    }
    return () => {
      window.dispatchEvent(new CustomEvent("modal-close"));
    };
  }, [selectedLog]);

  // Reset page to 1 when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  useEffect(() => {
    handleFilterChange();
  }, [searchQuery, selectedModule, selectedAction, selectedDate]);

  // Get module badge styles
  const getModuleBadge = (module: string) => {
    switch (module.toLowerCase()) {
      case "vcf":
        return "bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/50";
      case "master":
        return "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50";
      case "auth":
        return "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50";
      case "settings":
        return "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700/50";
      case "timbangan":
        return "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50";
      case "violation":
        return "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50";
      default:
        return "bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-800";
    }
  };

  // Get action badge styles
  const getActionBadge = (action: string) => {
    switch (action.toLowerCase()) {
      case "created":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20";
      case "updated":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20";
      case "deleted":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20";
      case "rejected":
        return "bg-red-600/10 text-red-600 dark:text-red-400 border border-red-600/20";
      case "finalized":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20";
      case "stage_completed":
        return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20";
      case "login":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20";
      case "logout":
        return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20";
      default:
        return "bg-slate-500/10 text-slate-500 border border-slate-500/20";
    }
  };

  // Human-readable date time
  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Clean JSON Properties renderer
  const renderLogProperties = (props: any) => {
    if (!props) return <span className="text-slate-400 dark:text-slate-600 text-xs italic">Tidak ada rincian data aktivitas.</span>;

    // Format 1.5: Multiple changes map
    if (typeof props === "object" && props.changes && typeof props.changes === "object") {
      const changesMap = props.changes;
      return (
        <div className="space-y-4 text-xs text-slate-700 dark:text-slate-350">
          <span className="font-bold text-slate-500 dark:text-slate-400 block mb-2 uppercase tracking-wider text-[10px]">Rincian Perubahan Data:</span>
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
                  <th className="p-3 pl-4">Kolom</th>
                  <th className="p-3">Nilai Lama</th>
                  <th className="p-3 pr-4">Nilai Baru</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {Object.keys(changesMap).map((fieldName) => {
                  const change = changesMap[fieldName];
                  return (
                    <tr key={fieldName} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                      <td className="p-3 pl-4 font-mono font-bold text-indigo-600 dark:text-indigo-400 uppercase text-[10px] tracking-wide">
                        {fieldName.replace(/_/g, " ")}
                      </td>
                      <td className="p-3 text-rose-600 dark:text-rose-400 font-mono whitespace-pre-wrap break-all text-[11px]">
                        {change.old !== null && change.old !== undefined ? String(change.old) : <span className="italic text-slate-350 font-sans">kosong</span>}
                      </td>
                      <td className="p-3 pr-4 text-emerald-600 dark:text-emerald-400 font-mono whitespace-pre-wrap break-all text-[11px]">
                        {change.new !== null && change.new !== undefined ? String(change.new) : <span className="italic text-slate-355 font-sans">kosong</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // Format 1: field, old, new
    if (typeof props === "object" && "old" in props && "new" in props) {
      return (
        <div className="space-y-3 text-xs text-slate-700 dark:text-slate-350">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-500 dark:text-slate-400">Kolom/Key:</span>
            <code className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-indigo-500 dark:text-indigo-400 font-bold">{props.key || props.field || "Value"}</code>
          </div>
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
                  <th className="p-3 pl-4">Nilai Lama</th>
                  <th className="p-3 pr-4">Nilai Baru</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-3 pl-4 text-rose-600 dark:text-rose-400 font-mono whitespace-pre-wrap break-all text-[11px]">
                    {props.old !== null && props.old !== undefined ? String(props.old) : <span className="italic text-slate-350 font-sans">kosong</span>}
                  </td>
                  <td className="p-3 pr-4 text-emerald-600 dark:text-emerald-400 font-mono whitespace-pre-wrap break-all text-[11px]">
                    {props.new !== null && props.new !== undefined ? String(props.new) : <span className="italic text-slate-350 font-sans">kosong</span>}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // Format 2: changed_fields
    if (typeof props === "object" && Array.isArray(props.changed_fields)) {
      return (
        <div className="text-xs text-slate-700 dark:text-slate-300">
          <span className="font-semibold text-slate-500 dark:text-slate-400 font-display uppercase tracking-wider text-[10px]">Kolom yang Diperbarui:</span>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {props.changed_fields.map((f: string, i: number) => (
              <span key={i} className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium font-mono text-[10px]">
                {f}
              </span>
            ))}
          </div>
        </div>
      );
    }

    // Format 3: Catatan Penolakan (Reject)
    if (typeof props === "object" && "catatan_reject" in props) {
      return (
        <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-500 dark:text-slate-400">Tahap Penolakan:</span>
            <span className="font-bold text-slate-800 dark:text-white">{props.stage || "N/A"}</span>
          </div>
          <div>
            <span className="block font-semibold text-red-500">Alasan Penolakan:</span>
            <div className="mt-1 p-3 rounded-lg bg-red-500/5 border border-red-500/10 text-red-650 dark:text-red-400 italic">
              &quot;{props.catatan_reject}&quot;
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
        <span className="font-semibold text-slate-500 dark:text-slate-400">Data Tambahan (JSON Payload):</span>
        <pre className="mt-1 p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300 font-mono text-[11px] overflow-x-auto max-h-60 overflow-y-auto whitespace-pre-wrap">
          {JSON.stringify(props, null, 2)}
        </pre>
      </div>
    );
  };

  const getTooltipTranslate = (idx: number, len: number) => {
    if (idx < 5) return "translateX(12px)";
    if (idx > len - 5) return "translateX(-112%)";
    return "translateX(-50%)";
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-8 antialiased text-slate-800 dark:text-slate-100">

      {/* ── HEADER SECTION ──────────────────────── */}
      <div className="morph-in flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-sans">
            Dasbor Pemantauan VCF
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
            <span className="font-medium">
              {mounted ? (
                `${user?.nama || "Pengguna"} · ${isAdmin() ? "Administrator" : "Petugas Main Gate"}`
              ) : (
                "Pengguna"
              )}
            </span>
            <span className="hidden sm:inline opacity-40">•</span>
            <span className="text-slate-400 dark:text-slate-500">
              {mounted ? now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : ""}
            </span>
          </p>
        </div>

        <RegisterButton label="Registrasi VCF Baru" />
      </div>

      {/* ── QUICK ACTIONS (Officer Only) ────────── */}
      {mounted && !isAdmin() && (
        <div className="morph-in grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK_ACTIONS.map(a => (
            <Link
              key={a.href}
              href={a.href}
              className={`group relative block rounded-xl p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 ${a.colorClass}`}
            >
              <div className={`absolute top-0 left-0 right-0 h-[3px] rounded-t-xl ${a.barBg}`} />
              <div className="flex items-center justify-between mb-4">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm ${a.iconBg} ${a.iconText}`}>
                  {a.stage.split(" ")[1]}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${a.iconText}`}>
                  {a.stage}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {a.label}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {a.sub}
              </p>
            </Link>
          ))}
        </div>
      )}

      {/* ── Quick Shortcut VCF ───────────────── */}
      <div style={{ marginTop: "12px", marginBottom: "20px" }}>
        <ViewVcfButton label="Lihat Monitoring VCF Aktif" />
      </div>

      {/* ── Real-Time Dynamic Dashboard Section ─────────────────────────── */}
      <div className="morph-in grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT COLUMN: Weekly Anomaly Detection Chart (3/5 Width) */}
        {isFullscreen ? (
          // Grid Placeholder when fullscreen is active
          <div className="lg:col-span-3 flex flex-col justify-center items-center h-[450px] bg-slate-50/50 dark:bg-slate-950/20 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center select-none text-slate-450 dark:text-slate-500 font-medium text-xs">
            <svg className="w-8 h-8 text-slate-400 dark:text-slate-600 mb-2 animate-pulse" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14v7m-3-3 3 3 3-3m-3-10V3M9 6l3-3 3 3" />
            </svg>
            Grafik volume transaksi diperbesar di layar penuh
          </div>
        ) : (
          // Normal Chart Card (Not Fullscreen)
          <div className="lg:col-span-3 flex flex-col justify-between p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-md relative overflow-hidden">
            {/* Subtle grid background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-100 pointer-events-none" />

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-950 dark:text-white tracking-tight flex items-center gap-2 font-display">
                  Volume Transaksi VCF Harian
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-sans">
                  Volume harian total, selesai, dan reject dalam sebulan
                </p>
              </div>

              <div className="flex gap-2 items-center flex-wrap">
                {/* Legends */}
                <div className="flex items-center gap-2 text-[9px] font-bold font-display mr-1 flex-wrap">
                  <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20 px-2 py-0.5 rounded border border-blue-100/20 dark:border-blue-900/20">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-xs" />
                    Total
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-100/20 dark:border-emerald-900/20">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-xs" />
                    Selesai
                  </div>
                  <div className="flex items-center gap-1.5 text-yellow-600 dark:text-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20 px-2 py-0.5 rounded border border-yellow-100/20 dark:border-yellow-900/20">
                    <span className="w-1.5 h-1.5 bg-yellow-500 rounded-xs" />
                    Tertunda
                  </div>
                  <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20 px-2 py-0.5 rounded border border-rose-100/20 dark:border-rose-900/20">
                    <span className="w-1.5 h-1.5 bg-rose-500 rounded-xs" />
                    Reject
                  </div>
                </div>

                {/* Month Selector Bar */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                  <button
                    onClick={() => {
                      if (selectedMonth > 1) setSelectedMonth(prev => prev - 1);
                    }}
                    disabled={selectedMonth <= 1}
                    className="p-1 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent rounded transition-colors text-slate-700 dark:text-slate-300"
                    title="Bulan Sebelumnya"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                  </button>

                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="bg-transparent text-[11px] font-extrabold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer px-1 py-0.5"
                  >
                    {INDONESIAN_MONTHS.map((m, idx) => (
                      <option key={idx} value={idx + 1} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white font-sans text-xs">
                        {m} 2026
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => {
                      if (selectedMonth < 12) setSelectedMonth(prev => prev + 1);
                    }}
                    disabled={selectedMonth >= 12}
                    className="p-1 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent rounded transition-colors text-slate-700 dark:text-slate-300"
                    title="Bulan Selanjutnya"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </button>
                </div>

                <button 
                  onClick={() => setIsFullscreen(true)}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                  title="Fullscreen"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                </button>
              </div>
            </div>

            {/* Monthly Line Chart */}
            <div className="relative z-10 w-full rounded-xl border border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm overflow-hidden p-2 flex flex-col h-[276px] min-h-[276px]">
              <MonthlyLineChart data={monthlyChartData} loading={monthlyChartLoading} year={selectedYear} month={selectedMonth} isFullscreen={false} />
            </div>

            {/* Time scale tags */}
            <div className="flex justify-between px-2 text-[9px] text-slate-400 dark:text-slate-500 font-bold font-mono tracking-widest mt-2.5 relative z-10">
              <span>DIAGRAM GARIS VOLUME VCF BULANAN (ARAHKAN KURSOR UNTUK DETAIL HARIAN)</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                PEMANTAUAN AKTIF
              </span>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-850 mt-4 pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-display mb-1.5">Ringkasan Hari Ini</span>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Total: <span className="font-bold text-slate-700 dark:text-slate-200">{stats.total_today}</span></span>
                  <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">·</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Selesai: <span className="font-bold text-emerald-600 dark:text-emerald-400">{stats.completed_today}</span></span>
                  <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">·</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Tertunda: <span className="font-bold text-yellow-600 dark:text-yellow-500">{stats.total_today - stats.completed_today - stats.reject_today}</span></span>
                  <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">·</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Ditolak: <span className="font-bold text-rose-500 dark:text-rose-400">{stats.reject_today}</span></span>
                  <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">·</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Total Di Area (Semua Hari): <span className="font-bold text-slate-700 dark:text-slate-200">{stats.active_in_area}</span></span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RIGHT COLUMN: Grouped Breakdown, Blacklist & KPI (2/5 Width) */}
        <div className="lg:col-span-2 space-y-6">

          {/* KPI Statistics & Stacked Comparison */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-md space-y-6">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight font-display">Distribusi Status VCF</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Perbandingan volume transaksi selesai, ditolak, dan total</p>
            </div>

            {/* Comparative Breakdown */}
            <div className="space-y-5">

              {/* Hari Ini */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-extrabold text-slate-700 dark:text-slate-300 font-display">Hari Ini</span>
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1 bg-emerald-50/50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-lg border border-emerald-100/40 dark:border-emerald-900/20">
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Selesai:</span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-display">{stats.completed_today}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-rose-50/50 dark:bg-rose-950/20 px-2 py-0.5 rounded-lg border border-rose-100/40 dark:border-rose-900/20">
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Reject:</span>
                      <span className="text-xs font-bold text-rose-600 dark:text-rose-400 font-display">{stats.reject_today}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-blue-50/50 dark:bg-blue-950/20 px-2 py-0.5 rounded-lg border border-blue-100/40 dark:border-blue-900/20">
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Total:</span>
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 font-display">{stats.total_today}</span>
                    </div>
                  </div>
                </div>
                <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex p-0.5 border border-slate-200/40 dark:border-slate-700/20">
                  {stats.total_today > 0 ? (
                    <>
                      <div
                        style={{ width: `${(stats.completed_today / stats.total_today) * 100}%` }}
                        className="bg-emerald-500 rounded-full transition-all duration-500"
                      />
                      <div
                        style={{ width: `${(stats.reject_today / stats.total_today) * 100}%` }}
                        className="bg-rose-500 rounded-full transition-all duration-500 ml-0.5"
                      />
                      <div
                        style={{ width: `${((stats.total_today - stats.completed_today - stats.reject_today) / stats.total_today) * 100}%` }}
                        className="bg-blue-500 rounded-full transition-all duration-500 ml-0.5 opacity-80"
                      />
                    </>
                  ) : (
                    <div className="w-full text-[9px] text-slate-400 dark:text-slate-500 text-center flex items-center justify-center font-bold uppercase tracking-widest">Belum Ada Transaksi</div>
                  )}
                </div>
              </div>

              {/* Bulan Ini */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-extrabold text-slate-700 dark:text-slate-300 font-display">Bulan Ini</span>
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1 bg-emerald-50/50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-lg border border-emerald-100/40 dark:border-emerald-900/20">
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Selesai:</span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-display">{stats.completed_month}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-rose-50/50 dark:bg-rose-950/20 px-2 py-0.5 rounded-lg border border-rose-100/40 dark:border-rose-900/20">
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Reject:</span>
                      <span className="text-xs font-bold text-rose-600 dark:text-rose-400 font-display">{stats.reject_month}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-blue-50/50 dark:bg-blue-950/20 px-2 py-0.5 rounded-lg border border-blue-100/40 dark:border-blue-900/20">
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Total:</span>
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 font-display">{stats.total_month}</span>
                    </div>
                  </div>
                </div>
                <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex p-0.5 border border-slate-200/40 dark:border-slate-700/20">
                  {stats.total_month > 0 ? (
                    <>
                      <div
                        style={{ width: `${(stats.completed_month / stats.total_month) * 100}%` }}
                        className="bg-emerald-500 rounded-full transition-all duration-500"
                      />
                      <div
                        style={{ width: `${(stats.reject_month / stats.total_month) * 100}%` }}
                        className="bg-rose-500 rounded-full transition-all duration-500 ml-0.5"
                      />
                      <div
                        style={{ width: `${((stats.total_month - stats.completed_month - stats.reject_month) / stats.total_month) * 100}%` }}
                        className="bg-blue-500 rounded-full transition-all duration-500 ml-0.5 opacity-80"
                      />
                    </>
                  ) : (
                    <div className="w-full text-[9px] text-slate-400 dark:text-slate-500 text-center flex items-center justify-center font-bold uppercase tracking-widest">Belum Ada Transaksi</div>
                  )}
                </div>
              </div>

              {/* Keseluruhan */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-extrabold text-slate-700 dark:text-slate-300 font-display">Keseluruhan</span>
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1 bg-emerald-50/50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-lg border border-emerald-100/40 dark:border-emerald-900/20">
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Selesai:</span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-display">{stats.completed_overall}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-rose-50/50 dark:bg-rose-950/20 px-2 py-0.5 rounded-lg border border-rose-100/40 dark:border-rose-900/20">
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Reject:</span>
                      <span className="text-xs font-bold text-rose-600 dark:text-rose-400 font-display">{stats.reject_overall}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-blue-50/50 dark:bg-blue-950/20 px-2 py-0.5 rounded-lg border border-blue-100/40 dark:border-blue-900/20">
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Total:</span>
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 font-display">{stats.total_overall}</span>
                    </div>
                  </div>
                </div>
                <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex p-0.5 border border-slate-200/40 dark:border-slate-700/20">
                  {stats.total_overall > 0 ? (
                    <>
                      <div
                        style={{ width: `${(stats.completed_overall / stats.total_overall) * 100}%` }}
                        className="bg-emerald-500 rounded-full transition-all duration-500"
                      />
                      <div
                        style={{ width: `${(stats.reject_overall / stats.total_overall) * 100}%` }}
                        className="bg-rose-500 rounded-full transition-all duration-500 ml-0.5"
                      />
                      <div
                        style={{ width: `${((stats.total_overall - stats.completed_overall - stats.reject_overall) / stats.total_overall) * 100}%` }}
                        className="bg-blue-500 rounded-full transition-all duration-500 ml-0.5 opacity-80"
                      />
                    </>
                  ) : (
                    <div className="w-full text-[9px] text-slate-400 dark:text-slate-500 text-center flex items-center justify-center font-bold uppercase tracking-widest">Belum Ada Transaksi</div>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Active Vehicles in Area Panel */}
          {/* Active Vehicles in Area Panel */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-md relative overflow-hidden group transition-all duration-300 hover:shadow-lg">
            {/* Soft accent background glow */}
            <div className="absolute right-0 top-0 w-32 h-32 bg-blue-500/[0.03] dark:bg-blue-500/[0.02] rounded-full blur-2xl transition-all duration-500 group-hover:scale-125 pointer-events-none" />
            <div className="flex items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-4">
                <div className="pl-1">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
                    Kendaraan Di Area
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Kendaraan aktif di dalam area pabrik saat ini</p>
                </div>
              </div>
              <div className="text-center">
                <span className="text-4xl font-black text-blue-600 dark:text-blue-400 font-display tracking-tight leading-none">
                  {stats.active_in_area}
                </span>
                <span className="text-[9px] block font-bold text-blue-500 dark:text-blue-400 uppercase tracking-widest mt-1 font-display">Unit</span>
              </div>
            </div>
          </div>

          {/* Blacklisted Drivers Panel */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-md relative overflow-hidden group transition-all duration-300 hover:shadow-lg">
            {/* Soft accent background glow */}
            <div className="absolute right-0 top-0 w-32 h-32 bg-rose-500/[0.03] dark:bg-rose-500/[0.02] rounded-full blur-2xl transition-all duration-500 group-hover:scale-125 pointer-events-none" />
            <div className="flex items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-4">
                <div className="pl-1">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
                    Pengemudi Cekal
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Daftar personel dalam pemblokiran aktif</p>
                </div>
              </div>
              <div className="text-center">
                <span className="text-4xl font-black text-rose-600 dark:text-rose-400 font-display tracking-tight leading-none">
                  {stats.blacklist_drivers}
                </span>
                <span className="text-[9px] block font-bold text-rose-500 dark:text-rose-400 uppercase tracking-widest mt-1 font-display">Personel</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── ACTIVITY LOGS PANEL ───────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">

        {/* Controls Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-base text-slate-900 dark:text-white">Log Aktivitas Sistem</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Seluruh kegiatan operasional, perubahan, dan penolakan VCF tercatat di sini</p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="px-5 py-4 bg-slate-50/50 dark:bg-slate-900/20 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SearchInput
              small
              placeholder="Cari deskripsi, nama user, target..."
              value={searchQuery}
              onChange={(val) => { setSearchQuery(val); setCurrentPage(1); }}
              className="w-full sm:w-80"
              style={{ width: "100%" }}
            />

            {/* View Mode Toggle */}
            <div className="flex items-center border border-slate-200 dark:border-slate-700 p-0.5 rounded-lg bg-white dark:bg-slate-800">
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-md transition-all ${viewMode === "table" ? "bg-slate-100 dark:bg-slate-700 text-blue-600 dark:text-blue-400" : "text-slate-400 hover:text-slate-600"}`}
                title="Tampilan Tabel"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("card")}
                className={`p-1.5 rounded-md transition-all ${viewMode === "card" ? "bg-slate-100 dark:bg-slate-700 text-blue-600 dark:text-blue-400" : "text-slate-400 hover:text-slate-600"}`}
                title="Tampilan Kartu"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Module Filter */}
            <div>
              <select
                value={selectedModule}
                onChange={(e) => { setSelectedModule(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
              >
                {MODULE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Action Filter */}
            <div>
              <select
                value={selectedAction}
                onChange={(e) => { setSelectedAction(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
              >
                {ACTION_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Date Filter */}
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => { setSelectedDate(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
              />
              {selectedDate && (
                <button
                  onClick={() => { setSelectedDate(""); setCurrentPage(1); }}
                  className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── CARD VIEW PANEL ── */}
        {viewMode === "card" && (
          <div className="p-5">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map(i => <MobileCardSkeleton key={i} />)}
              </div>
            ) : logs.length === 0 ? (
              <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-sm">Tidak ada catatan log aktivitas yang cocok.</div>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="block p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/40 hover:border-blue-500/30 hover:shadow-sm transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold font-mono">
                          {formatDateTime(log.created_at)}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${getActionBadge(log.action)}`}>
                          {log.action}
                        </span>
                      </div>

                      <div className="mb-4">
                        <span className={`inline-block px-1.5 py-0.5 rounded border text-[9px] font-extrabold uppercase tracking-wide mb-2 ${getModuleBadge(log.module)}`}>
                          {log.module}
                        </span>
                        <p className="font-bold text-slate-900 dark:text-white text-xs leading-relaxed group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {log.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-850">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                            {log.user_name || "Sistem"}
                          </span>
                          <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">
                            {log.user_role || "System Process"}
                          </span>
                          {log.ip_address && (
                            <span className="text-[8px] text-blue-500 dark:text-blue-400 font-mono mt-0.5" title="IP Address">
                              IP: {log.ip_address}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline">
                          Lihat Detail →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Pagination currentPage={currentPage} totalItems={totalItems} itemsPerPage={15} onPageChange={(p) => setCurrentPage(p)} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TABLE VIEW PANEL ── */}
        {viewMode === "table" && (
          <div className="overflow-x-auto JSON-table-container">
            {loading ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-wider font-bold border-b border-slate-100 dark:border-slate-800">
                    <th className="p-4 pl-6">Waktu</th>
                    <th className="p-4">Modul</th>
                    <th className="p-4">Aktor</th>
                    <th className="p-4">Deskripsi Aktivitas</th>
                    <th className="p-4">Target / Label</th>
                    <th className="p-4 pr-6 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>{[1, 2, 3, 4, 5].map(i => <TableRowSkeleton key={i} />)}</tbody>
              </table>
            ) : logs.length === 0 ? (
              <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-sm font-medium">Tidak ada catatan log aktivitas.</div>
            ) : (
              <div className="w-full">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/60 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-100 dark:border-slate-800/80">
                      <th className="p-4 pl-6 font-bold text-slate-400 dark:text-slate-500 w-[160px]">Waktu</th>
                      <th className="p-4 font-bold text-slate-700 dark:text-slate-300 w-[120px]">Modul & Aksi</th>
                      <th className="p-4 font-bold text-slate-700 dark:text-slate-300 w-[180px]">Aktor</th>
                      <th className="p-4 font-bold text-slate-700 dark:text-slate-300">Deskripsi Aktivitas</th>
                      <th className="p-4 font-bold text-slate-700 dark:text-slate-300 w-[180px]">Target Label</th>
                      <th className="p-4 text-start pr-6 font-bold text-slate-700 dark:text-slate-300 text-right w-[110px]">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-sm">
                    {logs.map((log) => (
                      <tr
                        key={log.id}
                        className="even:bg-slate-50/[0.2] dark:even:bg-slate-950/[0.1] hover:bg-blue-50/20 dark:hover:bg-slate-800/20 transition-colors duration-150 group/row"
                      >
                        <td className="p-4 pl-6 font-medium">
                          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            {formatDateTime(log.created_at)}
                          </span>
                        </td>

                        <td className="p-4">
                          <div className="flex flex-col gap-1 items-start">
                            <span className={`inline-block px-2 py-0.5 rounded border text-[9px] font-extrabold uppercase tracking-wide ${getModuleBadge(log.module)}`}>
                              {log.module}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${getActionBadge(log.action)}`}>
                              {log.action}
                            </span>
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {log.user_name || <span className="text-slate-400 dark:text-slate-600 font-normal italic">System</span>}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
                              {log.user_role || "Process"}
                            </span>
                            {log.ip_address && (
                              <span className="text-[9px] text-blue-500 dark:text-blue-400 font-mono mt-1 select-all" title="IP Address">
                                IP: {log.ip_address}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="p-4 font-semibold text-slate-800 dark:text-slate-100 max-w-[400px]">
                          <p className="text-xs leading-relaxed">{log.description}</p>
                        </td>

                        <td className="p-4">
                          {log.subject_label ? (
                            <span className="inline-flex items-center text-[10px] font-extrabold px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono tracking-tight border border-slate-200/40 dark:border-slate-700/50 shadow-2xs">
                              {log.subject_label}
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-700 font-mono text-xs">—</span>
                          )}
                        </td>

                        <td className="p-4 pr-6 text-right">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="inline-flex items-center justify-center text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 dark:text-blue-400 transition-all duration-200 group-hover/row:scale-[1.03]"
                          >
                            <span>Detail</span>
                            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" className="ml-1">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="p-5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/[0.1] dark:bg-slate-950/[0.05]">
                  <Pagination currentPage={currentPage} totalItems={totalItems} itemsPerPage={15} onPageChange={(p) => setCurrentPage(p)} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── MODAL DETAIL LOG ─────────────────────────── */}
      {mounted && selectedLog && createPortal(
        <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Detail Log Aktivitas</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">ID Log: #{selectedLog.id} · {formatDateTime(selectedLog.created_at)}</p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="py-6 space-y-6">
              {/* ── SECTION 1: METADATA & AKTOR ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Aktor / User Card */}
                <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/80 space-y-2">
                  <div className="flex items-center gap-2 border-b border-slate-200/50 dark:border-slate-800 pb-2 mb-2">
                    <svg className="text-slate-400 w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                    <span className="font-extrabold text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-display">AKTOR / PENGGUNA</span>
                  </div>
                  <div className="grid grid-cols-3 gap-y-1 text-xs">
                    <span className="text-slate-400 dark:text-slate-500">Nama:</span>
                    <span className="col-span-2 font-bold text-slate-800 dark:text-slate-200">{selectedLog.user_name || "Sistem / Automasi"}</span>

                    <span className="text-slate-400 dark:text-slate-500">Peran:</span>
                    <span className="col-span-2 font-medium text-slate-700 dark:text-slate-300">{selectedLog.user_role || "Internal Process"}</span>

                    <span className="text-slate-400 dark:text-slate-500">ID User:</span>
                    <span className="col-span-2 font-mono text-slate-700 dark:text-slate-300">
                      {selectedLog.user_id ? `#${selectedLog.user_id}` : "—"}
                    </span>
                  </div>
                </div>

                {/* Koneksi & Sesi Card */}
                <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/80 space-y-2">
                  <div className="flex items-center gap-2 border-b border-slate-200/50 dark:border-slate-800 pb-2 mb-2">
                    <svg className="text-slate-400 w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-.778.099-1.533.284-2.253" />
                    </svg>
                    <span className="font-extrabold text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-display">KONEKSI & SESI</span>
                  </div>
                  <div className="grid grid-cols-3 gap-y-1 text-xs">
                    <span className="text-slate-400 dark:text-slate-500">IP Address:</span>
                    <span className="col-span-2 font-mono font-bold text-slate-700 dark:text-slate-300">{selectedLog.ip_address || "—"}</span>

                    {(() => {
                      const uaInfo = parseUserAgent(selectedLog.user_agent);
                      return (
                        <>
                          <span className="text-slate-400 dark:text-slate-500">Browser:</span>
                          <span className="col-span-2 text-slate-700 dark:text-slate-300 font-medium">{uaInfo.browser}</span>
                          <span className="text-slate-400 dark:text-slate-500">OS Platform:</span>
                          <span className="col-span-2 text-slate-700 dark:text-slate-300 font-medium">{uaInfo.os}</span>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* ── SECTION 2: SUBJECT & TARGET ── */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/80 space-y-2">
                <div className="flex items-center gap-2 border-b border-slate-200/50 dark:border-slate-800 pb-2 mb-2">
                  <svg className="text-slate-400 w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <span className="font-extrabold text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-display">TARGET AUDIT / SUBJEK</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-1 gap-x-4 text-xs">
                  <div className="flex justify-between sm:col-span-1">
                    <span className="text-slate-400 dark:text-slate-500">Tipe Model:</span>
                  </div>
                  <div className="sm:col-span-2 font-mono text-indigo-600 dark:text-indigo-400 break-all mb-1 sm:mb-0">
                    {selectedLog.subject_type || "—"}
                  </div>

                  <div className="flex justify-between sm:col-span-1">
                    <span className="text-slate-400 dark:text-slate-500">ID Subjek / Record:</span>
                  </div>
                  <div className="sm:col-span-2 font-mono text-slate-700 dark:text-slate-300 font-bold mb-1 sm:mb-0">
                    {selectedLog.subject_id ? `#${selectedLog.subject_id}` : "—"}
                  </div>

                  <div className="flex justify-between sm:col-span-1">
                    <span className="text-slate-400 dark:text-slate-500">Identitas / Label:</span>
                  </div>
                  <div className="sm:col-span-2 mb-1 sm:mb-0">
                    {selectedLog.subject_label ? (
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-[10px] font-bold border border-slate-300/50 dark:border-slate-700/50">
                        {selectedLog.subject_label}
                      </span>
                    ) : (
                      <span className="text-slate-450 dark:text-slate-600">—</span>
                    )}
                  </div>
                </div>
              </div>

              {/* ── SECTION 3: AKTIVITAS & DESKRIPSI ── */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">Modul:</span>
                    <span className={`px-2 py-0.5 rounded border text-[10px] font-extrabold uppercase tracking-wide ${getModuleBadge(selectedLog.module)}`}>
                      {selectedLog.module}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">Aksi:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide ${getActionBadge(selectedLog.action)}`}>
                      {selectedLog.action}
                    </span>
                  </div>
                  {selectedLog.event && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">Event:</span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-300 font-mono text-[10px] border border-slate-200 dark:border-slate-700/50">
                        {selectedLog.event}
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-blue-500/[0.03] dark:bg-blue-500/10 border border-blue-500/10 dark:border-blue-500/20 rounded-xl">
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-1">Deskripsi Audit</span>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white leading-relaxed">{selectedLog.description}</p>
                </div>
              </div>

              {/* ── SECTION 4: PERUBAHAN DATA ── */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                {renderLogProperties(selectedLog.properties)}
              </div>

              {/* ── SECTION 5: USER AGENT DETIL (COLLAPSED) ── */}
              {selectedLog.user_agent && (
                <div className="pt-2">
                  <details className="group border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/20 dark:bg-slate-950/5">
                    <summary className="flex items-center justify-between p-3 cursor-pointer select-none font-bold text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                      <span>User Agent Lengkap</span>
                      <span className="transition-transform duration-200 group-open:rotate-180">
                        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </span>
                    </summary>
                    <div className="p-3 border-t border-slate-200 dark:border-slate-800 font-mono text-[10px] text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-950/20 break-all select-all leading-normal">
                      {selectedLog.user_agent}
                    </div>
                  </details>
                </div>
              )}

              {/* ── SECTION 6: RAW PAYLOAD (COLLAPSED) ── */}
              <div className="pt-2">
                <details className="group border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/20 dark:bg-slate-950/5">
                  <summary className="flex items-center justify-between p-3 cursor-pointer select-none font-bold text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                    <span>Payload JSON Mentah (Developer Audit)</span>
                    <span className="transition-transform duration-200 group-open:rotate-180">
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </span>
                  </summary>
                  <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-300 font-mono text-[10px] leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap select-all">
                    {JSON.stringify(selectedLog, null, 2)}
                  </div>
                </details>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-850 dark:text-slate-200 text-xs font-bold transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL FULLSCREEN CHART ────────────────────── */}
      {mounted && isFullscreen && createPortal(
        <div className="fixed inset-0 z-[9999] w-screen h-screen bg-white dark:bg-slate-950 flex flex-col overflow-hidden select-none">
          {/* Subtle grid background for the entire screen */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-100 pointer-events-none" />

          {/* Top Bar Header */}
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 bg-indigo-600 dark:bg-indigo-500 rounded-full animate-pulse" />
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight font-display flex items-center gap-2">
                  Volume Transaksi VCF Harian (Layar Penuh)
                </h2>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-sans">
                  Volume harian total, selesai, dan reject dalam sebulan
                </p>
              </div>
            </div>

            {/* Controls & Legends & Exit Button */}
            <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold font-display">
              <div className="flex items-center gap-3 border-r border-slate-200 dark:border-slate-800 pr-4">
                <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20 px-2.5 py-0.5 rounded border border-blue-100/20 dark:border-blue-900/20">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-xs" />
                  Total
                </div>
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 px-2.5 py-0.5 rounded border border-emerald-100/20 dark:border-emerald-900/20">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-xs" />
                  Selesai
                </div>
                <div className="flex items-center gap-1.5 text-yellow-600 dark:text-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20 px-2.5 py-0.5 rounded border border-yellow-100/20 dark:border-yellow-900/20">
                  <span className="w-1.5 h-1.5 bg-yellow-500 rounded-xs" />
                  Tertunda
                </div>
                <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20 px-2.5 py-0.5 rounded border border-rose-100/20 dark:border-rose-900/20">
                  <span className="w-1.5 h-1.5 bg-rose-500 rounded-xs" />
                  Reject
                </div>
              </div>

              {/* Month Selector Bar in Fullscreen */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                <button
                  onClick={() => {
                    if (selectedMonth > 1) setSelectedMonth(prev => prev - 1);
                  }}
                  disabled={selectedMonth <= 1}
                  className="p-1 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent rounded transition-colors text-slate-700 dark:text-slate-300"
                  title="Bulan Sebelumnya"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                </button>

                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="bg-transparent text-[11px] font-extrabold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer px-1 py-0.5"
                >
                  {INDONESIAN_MONTHS.map((m, idx) => (
                    <option key={idx} value={idx + 1} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white font-sans text-xs">
                      {m} 2026
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => {
                    if (selectedMonth < 12) setSelectedMonth(prev => prev + 1);
                  }}
                  disabled={selectedMonth >= 12}
                  className="p-1 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent rounded transition-colors text-slate-700 dark:text-slate-300"
                  title="Bulan Selanjutnya"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              </div>

              <button 
                onClick={() => setIsFullscreen(false)}
                className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-lg transition-colors border border-rose-200/40 dark:border-rose-900/30 text-xs font-extrabold"
                title="Keluar Layar Penuh"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                <span>Keluar</span>
              </button>
            </div>
          </div>

          {/* Main Chart Area - Edge to Edge except thin border */}
          <div className="relative z-10 flex-1 w-full bg-transparent overflow-hidden flex flex-col p-1">
            <MonthlyLineChart data={monthlyChartData} loading={monthlyChartLoading} year={selectedYear} month={selectedMonth} isFullscreen={true} />
          </div>

          {/* Bottom Bar Footer */}
          <div className="relative z-10 px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px]">
            <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400 font-sans">
              <span className="flex items-center gap-1.5 font-bold font-mono tracking-widest text-[9px]">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                PEMANTAUAN AKTIF
              </span>
              <span className="hidden sm:inline opacity-30">|</span>
              <span>Total Hari Ini: <span className="font-extrabold text-slate-800 dark:text-slate-200">{stats.total_today}</span></span>
              <span>Selesai: <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{stats.completed_today}</span></span>
              <span>Tertunda: <span className="font-extrabold text-yellow-600 dark:text-yellow-500">{stats.total_today - stats.completed_today - stats.reject_today}</span></span>
              <span>Ditolak: <span className="font-extrabold text-rose-500 dark:text-rose-450">{stats.reject_today}</span></span>
              <span className="hidden sm:inline opacity-30">|</span>
              <span>Total Di Area (Semua Hari): <span className="font-extrabold text-slate-800 dark:text-slate-200">{stats.active_in_area}</span></span>
            </div>

            <div className="text-slate-400 dark:text-slate-500 font-mono text-[9px] tracking-wider uppercase font-bold">
              DIAGRAM GARIS VOLUME VCF BULANAN • TEKAN ESC ATAU KLIK KELUAR UNTUK KEMBALI
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}