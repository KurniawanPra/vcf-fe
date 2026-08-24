/**
 * VCF Status Constants
 * Single source of truth for VCF status strings across the application.
 */

export const VCF_STATUS = {
  // Phase 1: Registration (Main Gate Masuk)
  BAGIAN1_SELESAI: "bagian1_selesai",
  
  // Phase 2: Weighbridge Masuk
  BAGIAN2_SELESAI: "bagian2_selesai",
  
  // Phase 3: Weighbridge Keluar
  BAGIAN3_SELESAI: "bagian3_selesai",
  
  // Phase 4: Main Gate Keluar (Data filled, waiting for final exit)
  BAGIAN4_PROSES: "weighbridge_keluar",
  
  // Final Stage: Completed (Main Gate Keluar - Finalized)
  SELESAI: "selesai",
  
  // Rejected Stage
  REJECT: "reject",
} as const;

export type VcfStatus = typeof VCF_STATUS[keyof typeof VCF_STATUS];

/**
 * Helper to get status label in Indonesian
 */
export const getVcfStatusLabel = (status: string): string => {
  switch (status) {
    case VCF_STATUS.BAGIAN1_SELESAI:
      return "Pendaftaran";
    case VCF_STATUS.BAGIAN2_SELESAI:
      return "Timbangan Masuk";
    case VCF_STATUS.BAGIAN3_SELESAI:
      return "Timbangan Keluar";
    case VCF_STATUS.BAGIAN4_PROSES:
      return "Siap Keluar";
    case VCF_STATUS.SELESAI:
      return "Selesai";
    case VCF_STATUS.REJECT:
      return "Ditolak";
    default:
      return status || "Unknown";
  }
};

/**
 * Helper to get status color for UI badges
 */
export const getVcfStatusColor = (status: string): string => {
  switch (status) {
    case VCF_STATUS.BAGIAN1_SELESAI:
      return "status-blue";
    case VCF_STATUS.BAGIAN2_SELESAI:
      return "status-indigo";
    case VCF_STATUS.BAGIAN3_SELESAI:
      return "status-purple";
    case VCF_STATUS.BAGIAN4_PROSES:
      return "status-orange";
    case VCF_STATUS.SELESAI:
      return "status-green";
    case VCF_STATUS.REJECT:
      return "status-red";
    default:
      return "status-gray";
  }
};

/**
 * Mapping for step numbers in the progress bar
 */
export const VCF_STEP_MAP: Record<string, number> = {
  [VCF_STATUS.BAGIAN1_SELESAI]: 2,
  [VCF_STATUS.BAGIAN2_SELESAI]: 3,
  [VCF_STATUS.BAGIAN3_SELESAI]: 4,
  [VCF_STATUS.BAGIAN4_PROSES]: 4,
  [VCF_STATUS.SELESAI]: 4,
  [VCF_STATUS.REJECT]: 0,
};
