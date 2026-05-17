"use client";

export interface ViolationEntry {
  id: number;
  jenis_pelanggaran: string;
  keterangan?: string | null;
  tanggal_pelanggaran: string;
}

export interface ViolationCheckResult {
  driver?: {
    id: number;
    nama_supir: string;
    no_sim: string;
    status: "normal" | "warning" | "blacklist";
    violations: ViolationEntry[];
  } | null;
  vehicle?: {
    no_polisi: string;
    violations: ViolationEntry[];
  } | null;
}

interface Props {
  data: ViolationCheckResult;
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return d;
  }
}

function ViolationList({ violations, color }: { violations: ViolationEntry[]; color: "amber" | "red" }) {
  if (!violations || violations.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1.5">
      {violations.map((v) => (
        <li
          key={v.id}
          className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 ${
            color === "red"
              ? "bg-red-500/10 border border-red-500/20"
              : "bg-amber-500/10 border border-amber-500/20"
          }`}
        >
          <span className="mt-0.5 shrink-0">
            {color === "red" ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-red-500">
                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-amber-500">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            )}
          </span>
          <div>
            <span className={`font-semibold ${color === "red" ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400"}`}>
              {v.jenis_pelanggaran}
            </span>
            {v.keterangan && (
              <span className="text-text-muted"> — {v.keterangan}</span>
            )}
            <div className="text-text-muted mt-0.5 text-[10px]">{formatDate(v.tanggal_pelanggaran)}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function ViolationWarningCard({ data }: Props) {
  const { driver, vehicle } = data;

  const driverStatus = driver?.status ?? "normal";
  const hasDriverViolation = (driver?.violations?.length ?? 0) > 0;
  const hasVehicleViolation = (vehicle?.violations?.length ?? 0) > 0;

  const isDriverBlacklisted = driverStatus === "blacklist";
  const isDriverWarning = driverStatus === "warning" || (driverStatus === "normal" && hasDriverViolation);

  if (!isDriverBlacklisted && !isDriverWarning && !hasVehicleViolation) return null;

  return (
    <div className="space-y-3 mb-6">
      {/* Driver blacklist notice */}
      {isDriverBlacklisted && (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-red-500">
                <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-red-600 dark:text-red-400 text-sm">
                ⛔ Driver Masuk Blacklist
              </p>
              <p className="text-xs text-red-500/80">
                {driver?.nama_supir} tidak dapat membuat VCF baru. Hubungi admin untuk informasi lebih lanjut.
              </p>
            </div>
          </div>
          <ViolationList violations={driver?.violations ?? []} color="red" />
        </div>
      )}

      {/* Driver warning */}
      {!isDriverBlacklisted && isDriverWarning && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-amber-500">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-amber-600 dark:text-amber-400 text-sm">
                ⚠ Riwayat Pelanggaran Driver
              </p>
              <p className="text-xs text-amber-600/80">
                {driver?.nama_supir} pernah tercatat melakukan pelanggaran. Registrasi tetap dapat dilanjutkan.
              </p>
            </div>
          </div>
          <ViolationList violations={driver?.violations ?? []} color="amber" />
        </div>
      )}

      {/* Vehicle violation */}
      {hasVehicleViolation && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-amber-500">
                <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-3" />
                <circle cx="7.5" cy="17.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-amber-600 dark:text-amber-400 text-sm">
                ⚠ Riwayat Pelanggaran Kendaraan
              </p>
              <p className="text-xs text-amber-600/80">
                Kendaraan <strong>{vehicle?.no_polisi}</strong> pernah tercatat memiliki pelanggaran.
              </p>
            </div>
          </div>
          <ViolationList violations={vehicle?.violations ?? []} color="amber" />
        </div>
      )}
    </div>
  );
}
