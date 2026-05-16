import * as XLSX from "xlsx";

/**
 * Parses an Excel file and returns preview data without importing.
 * Returns { data: T[], errors: string[] }.
 */
export async function parseExcelPreview<T extends object>(
  file: File,
  mapRow: (row: Record<string, any>) => T | null
): Promise<{ data: T[]; errors: string[] }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws) as Record<string, any>[];

        const data: T[] = [];
        const errors: string[] = [];

        for (let i = 0; i < rows.length; i++) {
          const mapped = mapRow(rows[i]);
          if (!mapped) {
            errors.push(`Baris ${i + 2}: Data tidak valid, dilewati.`);
            continue;
          }
          data.push(mapped);
        }

        resolve({ data, errors });
      } catch {
        resolve({ data: [], errors: ["Gagal membaca file Excel. Pastikan format file benar."] });
      }
    };
    reader.readAsBinaryString(file);
  });
}

/**
 * Imports an array of data by calling createFn for each item.
 * Returns { success, failed, errors }.
 */
export async function importDataBatch<T extends object>(
  data: T[],
  createFn: (data: T) => Promise<any>,
  onProgress?: (done: number, total: number) => void
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < data.length; i++) {
    try {
      await createFn(data[i]);
      success++;
    } catch (err: any) {
      failed++;
      const rawMsg = err?.response?.data?.message || err?.message || "Error tidak diketahui";
      const status = err?.response?.status;

      // Detect duplicate/unique constraint errors
      const errorText = JSON.stringify(err?.response?.data || err?.message || "").toLowerCase();
      const isDuplicate =
        errorText.includes("duplicate") ||
        errorText.includes("unique constraint") ||
        errorText.includes("already exists") ||
        errorText.includes("sudah ada") ||
        errorText.includes("duplikat") ||
        (errorText.includes("1062") && errorText.includes("sql")); // MySQL duplicate entry

      let msg: string;
      if (isDuplicate) {
        msg = "Data duplikat: nilai ini sudah ada di database (kode/nama kemungkinan sama)";
      } else if (status === 422 && err?.response?.data?.errors) {
        // Validation errors with field details
        const validationErrors = err.response.data.errors;
        const fieldErrors = Object.entries(validationErrors)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(", ") : msgs}`)
          .join("; ");
        msg = `Validasi gagal: ${fieldErrors}`;
      } else if (rawMsg === "The given data was invalid.") {
        msg = "Data tidak valid: periksa format dan nilai yang dimasukkan";
      } else {
        msg = rawMsg;
      }

      errors.push(`Baris ${i + 1}: ${msg}`);
    }
    onProgress?.(i + 1, data.length);
  }

  return { success, failed, errors };
}

/**
 * Parses an Excel file, maps each row using `mapRow`, then calls `createFn` per row.
 * Shows a toast-style result via alert. Returns { success, failed, errors }.
 * @deprecated Use parseExcelPreview + importDataBatch for better UX with confirmation
 */
export async function parseAndImportExcel<T extends object>(
  file: File,
  mapRow: (row: Record<string, any>) => T | null,
  createFn: (data: T) => Promise<any>,
  onProgress?: (done: number, total: number) => void
): Promise<{ success: number; failed: number; errors: string[] }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws) as Record<string, any>[];

        let success = 0;
        let failed = 0;
        const errors: string[] = [];

        for (let i = 0; i < rows.length; i++) {
          const mapped = mapRow(rows[i]);
          if (!mapped) {
            failed++;
            errors.push(`Baris ${i + 2}: Data tidak valid, dilewati.`);
            continue;
          }
          try {
            await createFn(mapped);
            success++;
          } catch (err: any) {
            failed++;
            const rawMsg = err?.response?.data?.message || err?.message || "Error tidak diketahui";
            const status = err?.response?.status;

            // Detect duplicate/unique constraint errors
            const errorText = JSON.stringify(err?.response?.data || err?.message || "").toLowerCase();
            const isDuplicate =
              errorText.includes("duplicate") ||
              errorText.includes("unique constraint") ||
              errorText.includes("already exists") ||
              errorText.includes("sudah ada") ||
              errorText.includes("duplikat") ||
              (errorText.includes("1062") && errorText.includes("sql"));

            let msg: string;
            if (isDuplicate) {
              msg = "Data duplikat: nilai ini sudah ada di database (kode/nama kemungkinan sama)";
            } else if (status === 422 && err?.response?.data?.errors) {
              const validationErrors = err.response.data.errors;
              const fieldErrors = Object.entries(validationErrors)
                .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(", ") : msgs}`)
                .join("; ");
              msg = `Validasi gagal: ${fieldErrors}`;
            } else if (rawMsg === "The given data was invalid.") {
              msg = "Data tidak valid: periksa format dan nilai yang dimasukkan";
            } else {
              msg = rawMsg;
            }

            errors.push(`Baris ${i + 2}: ${msg}`);
          }
          onProgress?.(i + 1, rows.length);
        }

        resolve({ success, failed, errors });
      } catch {
        resolve({ success: 0, failed: 0, errors: ["Gagal membaca file Excel. Pastikan format file benar."] });
      }
    };
    reader.readAsBinaryString(file);
  });
}

export function downloadImportTemplate(
  filename: string,
  headers: string[],
  sampleRows: (string | number | boolean)[][]
) {
  const wsData = [headers, ...sampleRows.map(row => row.map(v => (v === true ? "Ya" : v === false ? "Tidak" : v)))];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Bold header row style
  const headerRange = XLSX.utils.decode_range(ws["!ref"] || "A1");
  for (let c = headerRange.s.c; c <= headerRange.e.c; c++) {
    const cellAddr = XLSX.utils.encode_cell({ r: 0, c });
    if (!ws[cellAddr]) continue;
    ws[cellAddr].s = { font: { bold: true }, fill: { fgColor: { rgb: "1A1A1A" } } };
  }

  // Auto column widths
  ws["!cols"] = headers.map((h, i) => ({
    wch: Math.max(h.length + 4, ...sampleRows.map(r => String(r[i] ?? "").length + 2)),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template");

  // Add info sheet
  const infoData = [
    ["PETUNJUK IMPORT DATA"],
    [""],
    ["1. Isi data mulai dari baris ke-2 (baris pertama adalah header, jangan diubah)"],
    ["2. Kolom bertanda * wajib diisi"],
    ["3. Kolom Status: isi dengan 'Ya' (aktif) atau 'Tidak' (nonaktif)"],
    ["4. Hapus baris contoh sebelum mengimport"],
    ["5. Simpan file dalam format .xlsx sebelum diimport"],
  ];
  const wsInfo = XLSX.utils.aoa_to_sheet(infoData);
  wsInfo["!cols"] = [{ wch: 70 }];
  XLSX.utils.book_append_sheet(wb, wsInfo, "Petunjuk");

  XLSX.writeFile(wb, `${filename}_template.xlsx`);
}
