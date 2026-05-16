import { masterApi, settingsApi } from "./api";

export interface MasterDataCache {
  transporters: any[];
  drivers: any[];
  jenisKendaraan: any[];
  checklistItems: any[];
  muatanItems: any[];
  produkOptions: { kode: string; label: string }[];
  showProdukLainnya: boolean;
  fetchedAt: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

let cache: MasterDataCache | null = null;
let fetchPromise: Promise<MasterDataCache> | null = null;

export function getCachedMasterData(): MasterDataCache | null {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) return cache;
  return null;
}

export function clearMasterDataCache(): void {
  cache = null;
  fetchPromise = null;
}

export async function fetchAndCacheMasterData(
  onProgress?: (pct: number) => void
): Promise<MasterDataCache> {
  // Return existing valid cache immediately
  const existing = getCachedMasterData();
  if (existing) return existing;

  // Deduplicate concurrent calls — return the same in-flight promise
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    onProgress?.(0);

    const [tRes, dRes, sRes, pRes] = await Promise.all([
      masterApi.getTransporters(),
      masterApi.getDrivers(),
      settingsApi.getVcf().catch(() => ({ data: { data: {} } })),
      masterApi.getProduk({ is_active: 1 }),
    ]);

    onProgress?.(50);

    const tData = (tRes.data.data || tRes.data).filter((t: any) => t.is_active === true || t.is_active === 1 || t.is_active === "1");
    const dData = (dRes.data.data || dRes.data).filter((d: any) => d.is_active === true || d.is_active === 1 || d.is_active === "1");
    const settings = sRes.data.data || {};
    const showProdukLainnya = settings["vcf.show_produk_lainnya"] !== false;
    const produkRaw = (pRes.data.data || pRes.data || []).filter((p: any) => p.is_active === true || p.is_active === 1 || p.is_active === "1");
    const produkOptions = produkRaw.map((p: any) => ({ kode: p.kode || p.nama, label: p.nama }));

    const [jRes, cRes, mRes] = await Promise.all([
      masterApi.getJenisKendaraan(),
      masterApi.getItemKelengkapanSupir(),
      masterApi.getItemMuatan(),
    ]);

    onProgress?.(90);

    const jenisKendaraan = (jRes.data.data || jRes.data).filter((j: any) => j.is_active === true || j.is_active === 1 || j.is_active === "1");
    const cRaw = (cRes.data.data || cRes.data).filter((c: any) => c.is_active === true || c.is_active === 1 || c.is_active === "1");
    const checklistItems = [...cRaw].sort((a: any, b: any) => a.urutan - b.urutan);
    const mRaw = (mRes.data.data || mRes.data).filter((m: any) => m.is_active === true || m.is_active === 1 || m.is_active === "1");
    const muatanItems = [...mRaw].sort((a: any, b: any) => a.urutan - b.urutan);

    cache = {
      transporters: tData,
      drivers: dData,
      jenisKendaraan,
      checklistItems,
      muatanItems,
      produkOptions,
      showProdukLainnya,
      fetchedAt: Date.now(),
    };

    onProgress?.(100);
    fetchPromise = null;
    return cache;
  })();

  return fetchPromise;
}

/** Fire-and-forget prefetch — safe to call without awaiting */
export function prefetchMasterData(): void {
  fetchAndCacheMasterData().catch(() => {});
}
