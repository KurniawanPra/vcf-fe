import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(date: Date = new Date()): string {
  // Force WIB (Asia/Jakarta) so times are consistent regardless of client OS timezone.
  // `en-GB` reliably returns 24h `HH:mm`.
  const value = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

  // Some environments may include special directionality marks; strip non-digits/colon.
  const cleaned = value.replace(/[^\d:]/g, "");
  return cleaned;
}

export function isValidTime24h(value: string): boolean {
  // Matches `HH:mm` with 00-23 for HH.
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function formatDate(date: Date = new Date()): string {
  return date.toISOString().split("T")[0];
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    bagian1_selesai: "Weighbridge Masuk",
    bagian2_selesai: "Loading/Unloading",
    loading_unloading_proses: "Loading/Unloading",
    loading_unloading_selesai: "Main Gate Keluar",
    bagian3_selesai: "Main Gate Keluar",
    weighbridge_keluar: "Main Gate Keluar",
    selesai: "Selesai",
    ditolak: "Ditolak",
    reject: "Ditolak",
  };
  return labels[status] ?? status.replace(/_/g, " ");
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    bagian1_selesai: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
    bagian2_selesai: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
    loading_unloading_proses: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20",
    loading_unloading_selesai: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    bagian3_selesai: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    weighbridge_keluar: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    selesai: "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20",
    ditolak: "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20",
    reject: "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20",
  };
  return colors[status] ?? "bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20";
}

export function getNextStage(status: string): string | null {
  const stages: Record<string, string | null> = {
    bagian1_selesai: "Weighbridge Masuk",
    bagian2_selesai: "Loading/Unloading",
    loading_unloading_proses: "Loading/Unloading",
    loading_unloading_selesai: "Weighbridge Keluar",
    bagian3_selesai: "Main Gate Keluar",
    selesai: null,
    ditolak: null,
    reject: null,
  };
  return stages[status] ?? null;
}

/**
 * Extract error message from API error response.
 * Shows specific field validation errors instead of generic "The given data was invalid."
 */
export function getErrorMessage(err: any, defaultMsg: string = "Terjadi kesalahan."): string {
  const data = err?.response?.data;

  // If there are validation errors, show them
  if (data?.errors && typeof data.errors === "object") {
    const fieldErrors = Object.entries(data.errors)
      .map(([field, msgs]) => {
        const fieldName = field.charAt(0).toUpperCase() + field.slice(1);
        const messages = Array.isArray(msgs) ? msgs.join(", ") : String(msgs);
        return `${fieldName}: ${messages}`;
      })
      .join("; ");
    return fieldErrors || defaultMsg;
  }

  // Fallback to message or error field
  return data?.message || data?.error || defaultMsg;
}

export function getActionButtonStyle (status: string) {
  switch (status) {
    case "bagian1_selesai": return "action-btn action-btn-amber";
    case "bagian2_selesai": return "action-btn action-btn-indigo";
    case "loading_unloading_proses":
    case "loading_unloading_selesai": return "action-btn action-btn-violet";
    case "bagian3_selesai": return "action-btn action-btn-emerald";
    case "selesai":
    case "reject": return "action-btn action-btn-slate";
    default: return "action-btn action-btn-blue";
  }
};

export function getActionLabel (status: string) {
  const map: Record<string, string> = {
    bagian1_selesai: "Isi WB Masuk",
    bagian2_selesai: "Isi WB Keluar",
    loading_unloading_proses: "Lihat Operasional",
    loading_unloading_selesai: "Isi WB Keluar",
    bagian3_selesai: "Isi MG Keluar",
    weighbridge_keluar: "Isi MG Keluar",
    selesai: "Lihat Detail",
    reject: "Lihat Detail",
  };
  return map[status] ?? "Detail";
};
