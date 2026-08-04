import { vcfApi } from "./api";

/** Server caps per_page at 500 (see VcfBagian1Controller::index). */
const PAGE_SIZE = 500;

/** Hard ceiling so a mis-set filter can never spin forever. */
const MAX_PAGES = 60;

type Params = Record<string, string | number | undefined>;

function rowsOf(payload: any): any[] {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
}

/**
 * Fetch every VCF matching `params`, following Laravel's pagination.
 *
 * Used by Excel export and "Print Semua VCF", which need the heavy relations
 * (segel + nomor segel, beban tambahan, timbangan, keterangan per bagian) that
 * the plain listing endpoint intentionally omits for speed.
 */
export async function fetchAllVcfDetailed(
  params: Params,
  onProgress?: (loaded: number, total: number) => void
): Promise<any[]> {
  const all: any[] = [];
  let page = 1;
  let total = 0;

  while (page <= MAX_PAGES) {
    const res = await vcfApi.getListDetailed({ ...params, per_page: PAGE_SIZE, page });
    const payload = res.data;
    const rows = rowsOf(payload);

    all.push(...rows);
    total = Number(payload?.total ?? all.length);
    onProgress?.(all.length, total);

    const lastPage = Number(payload?.last_page ?? 1);
    if (!rows.length || page >= lastPage) break;
    page += 1;
  }

  return all;
}

/**
 * Map over items with a bounded number of in-flight requests.
 *
 * "Print Semua VCF" previously fired one detail request per VCF simultaneously
 * via Promise.all — with a full month of data that is hundreds of parallel
 * requests, which stalls the browser's connection pool and can overwhelm the API.
 * Results keep their original order; failures resolve to null.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  limit = 6,
  onProgress?: (done: number, total: number) => void
): Promise<(R | null)[]> {
  const results: (R | null)[] = new Array(items.length).fill(null);
  let cursor = 0;
  let done = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      try {
        results[index] = await fn(items[index], index);
      } catch {
        results[index] = null;
      } finally {
        done += 1;
        onProgress?.(done, items.length);
      }
    }
  });

  await Promise.all(workers);
  return results;
}
