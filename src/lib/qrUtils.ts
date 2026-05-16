import QRCode from "qrcode";
import { getUser } from "./auth";

export interface QRSignatureData {
  petugas: string;
  timestamp: string;
  vcfId?: number;
  stage: string;
  hash?: string;
}

/**
 * Generate QR code data URL for signature
 */
export async function generateQRSignature(
  stage: string,
  vcfId?: number
): Promise<string> {
  const user = getUser();
  if (!user) throw new Error("User not authenticated");

  const timestamp = new Date().toISOString();
  const data: QRSignatureData = {
    petugas: user.nama || user.username || "Unknown",
    timestamp,
    vcfId,
    stage,
    // Simple hash for verification (can be enhanced with crypto)
    hash: btoa(`${user.id}-${timestamp}-${stage}-${vcfId || 0}`).slice(0, 16),
  };

  const qrData = JSON.stringify(data);
  return QRCode.toDataURL(qrData, {
    width: 200,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });
}

/**
 * Generate QR code as SVG string for print
 */
export async function generateQRSignatureSVG(
  stage: string,
  vcfId?: number
): Promise<string> {
  const user = getUser();
  if (!user) throw new Error("User not authenticated");

  const timestamp = new Date().toISOString();
  const data: QRSignatureData = {
    petugas: user.nama || user.username || "Unknown",
    timestamp,
    vcfId,
    stage,
    hash: btoa(`${user.id}-${timestamp}-${stage}-${vcfId || 0}`).slice(0, 16),
  };

  const qrData = JSON.stringify(data);
  return QRCode.toString(qrData, {
    type: "svg",
    width: 150,
    margin: 1,
  });
}

/**
 * Parse QR signature data
 */
export function parseQRSignature(qrData: string): QRSignatureData | null {
  try {
    return JSON.parse(qrData) as QRSignatureData;
  } catch {
    return null;
  }
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Get stage label
 */
export function getStageLabel(stage: string): string {
  const labels: Record<string, string> = {
    bagian1: "Main Gate Masuk",
    bagian2: "Weighbridge Masuk",
    bagian3: "Weighbridge Keluar",
    bagian4: "Main Gate Keluar",
  };
  return labels[stage] || stage;
}
