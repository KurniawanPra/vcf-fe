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
  });
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    bagian1_selesai: "Weighbridge Masuk",
    bagian2_selesai: "Loading/Unloading",
    loading_unloading_proses: "Loading/Unloading",
    loading_unloading_selesai: "Weighbridge Keluar",
    bagian3_selesai: "Weighbridge Keluar",
    weighbridge_keluar: "Main Gate Keluar",
    selesai: "Selesai",
    ditolak: "Ditolak",
    reject: "Ditolak",
  };
  return labels[status] ?? status.replace(/_/g, " ");
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    bagian1_selesai: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    bagian2_selesai: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    loading_unloading_proses: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    loading_unloading_selesai: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    bagian3_selesai: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    weighbridge_keluar: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    selesai: "bg-green-500/20 text-green-300 border-green-500/30",
    ditolak: "bg-red-500/20 text-red-400 border-red-500/30",
    reject: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return colors[status] ?? "bg-gray-500/20 text-gray-300 border-gray-500/30";
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
