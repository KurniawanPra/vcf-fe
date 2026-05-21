"use client";

import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { PRINT_STYLES } from "./PrintElements";
import { settingsApi } from "@/lib/api";

interface PrintMasterTableProps {
  title: string;
  subtitle?: string;
  headers: string[];
  data: any[][];
  onClose: () => void;
  docNo?: string;
  revNo?: string;
  effDate?: string;
  orientation?: "portrait" | "landscape";
}

export default function PrintMasterTable({
  title,
  subtitle,
  headers,
  data,
  onClose,
  docNo = "—",
  revNo = "—",
  effDate = "—",
  orientation = "portrait",
}: PrintMasterTableProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [printSettings, setPrintSettings] = useState({
    company_name: "PT. INDUSTRI NABATI LESTARI",
    company_address: "Komp.KEK Sei Mangkei, Kav.2-3, Kec. Bosar Maligas, Kab. Simalungun, Sumatera Utara, 21183",
    font_family: "Arial, sans-serif",
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const resSettings = await settingsApi.getPrint().catch(() => ({ data: { data: {} } }));
        const settings = resSettings.data?.data || {};
        setPrintSettings({
          company_name: settings["print.company_name"] || "PT. INDUSTRI NABATI LESTARI",
          company_address: settings["print.company_address"] || "Komp.KEK Sei Mangkei, Kav.2-3, Kec. Bosar Maligas, Kab. Simalungun, Sumatera Utara, 21183",
          font_family: settings["print.font_family"] || "Arial, sans-serif",
        });
      } catch (err) {
        console.error("Failed to fetch settings for master table printing", err);
      }
    };
    fetchSettings();
  }, []);

  const handlePrint = () => {
    const html = printRef.current?.innerHTML;
    if (!html) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <!DOCTYPE html><html>
        <head>
          <title>${title}</title>
          <style>
            @page { size: A4 ${orientation}; margin: 0; }
            body { font-family: ${printSettings.font_family}; font-size: 9px; color: #000; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            * { box-sizing: border-box; }
            table { border-collapse: collapse; width: 100%; table-layout: fixed; }
            th, td { border: 1px solid #000; padding: 3px 6px; vertical-align: middle; font-size: 9px; word-wrap: break-word; }
            img { max-width: 100%; height: auto; }
            .no-print { display: none !important; }
          </style>
        </head>
        <body><div style="padding:10mm 12mm;">${html}</div></body>
      </html>
    `);
    w.document.close();
    w.onload = () => { setTimeout(() => { w.print(); w.close(); }, 500); };
    setTimeout(() => { if (w.document.readyState !== "complete") { w.print(); w.close(); } }, 2000);
  };

  const now = new Date().toLocaleString("id-ID", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/80 overflow-y-auto py-4 sm:py-10">
      <div 
        ref={containerRef}
        style={{ 
          width: orientation === "landscape" ? "297mm" : "210mm", 
          height: "fit-content", 
          background: "#fff", 
          flexShrink: 0,
          maxWidth: "100%",
        }}
        className="print-preview-container">

        {/* Toolbar */}
        <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", background: "#1e293b", color: "#fff" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{title}</div>
            {subtitle && <div style={{ fontSize: 10, opacity: 0.7 }}>{subtitle}</div>}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handlePrint} className="btn btn-primary btn-sm">PRINT</button>
            <button onClick={onClose} className="btn btn-secondary btn-sm">CLOSE</button>
          </div>
        </div>

        {/* Print Content */}
        <div ref={printRef} style={{ padding: "10mm 12mm", background: "#fff", color: "#000", minHeight: "297mm" }}>

          {/* ── HEADER (sama dengan PrintVCF) ── */}
          <table style={{ width: "100%", marginBottom: 0, borderCollapse: "collapse" }}>
            <colgroup>
              <col style={{ width: "15%" }} />
              <col style={{ width: "47%" }} />
              <col style={{ width: "19%" }} />
              <col style={{ width: "19%" }} />
            </colgroup>
            <tbody>
              <tr>
                <td rowSpan={4} style={{ ...PRINT_STYLES.CELL, padding: 0, position: "relative" }}>
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Image src="/logo.png" width={60} height={60} style={{ display: "block" }} alt="VCF Logo" />
                  </div>
                </td>
                <td rowSpan={3} style={{ ...PRINT_STYLES.CELL, textAlign: "center", verticalAlign: "middle", padding: "4px 6px" }}>
                  <div style={{ fontWeight: "bold", fontSize: 11, letterSpacing: 0.3, textDecoration: "underline" }}>{printSettings.company_name}</div>
                  <div style={{ fontSize: 9, marginTop: 1 }}>PABRIK MINYAK GORENG</div>
                  <div style={{ fontSize: 8, marginTop: 2, lineHeight: 1.4 }}>
                    {printSettings.company_address}
                  </div>
                </td>
                <td style={{ ...PRINT_STYLES.CELL_CENTER, fontSize: 8 }}>No. Dokumen</td>
                <td style={{ ...PRINT_STYLES.CELL_CENTER, fontSize: 8, fontWeight: "bold" }}>{docNo}</td>
              </tr>
              <tr>
                <td style={{ ...PRINT_STYLES.CELL_CENTER, fontSize: 8 }}>Tgl berlaku</td>
                <td style={{ ...PRINT_STYLES.CELL_CENTER, fontSize: 8 }}>{effDate}</td>
              </tr>
              <tr>
                <td style={{ ...PRINT_STYLES.CELL_CENTER, fontSize: 8 }}>No. Revisi</td>
                <td style={{ ...PRINT_STYLES.CELL_CENTER, fontSize: 8 }}>{revNo}</td>
              </tr>
              <tr>
                <td style={{ ...PRINT_STYLES.CELL_CENTER, textAlign: "center", verticalAlign: "middle", fontWeight: "bold", fontSize: 10, padding: "5px 4px", borderTop: "1px solid #000" }}>
                  {title.toUpperCase()}
                </td>
                <td style={{ ...PRINT_STYLES.CELL_CENTER, fontSize: 8 }}>Halaman</td>
                <td style={{ ...PRINT_STYLES.CELL_CENTER, fontSize: 8 }}>1 dari 1</td>
              </tr>
            </tbody>
          </table>

          {/* Subtitle & meta */}
          <div style={{ marginTop: 8, marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              {subtitle && <div style={{ fontSize: 8, color: "#444", fontStyle: "italic" }}>{subtitle}</div>}
              <div style={{ fontSize: 8, color: "#666" }}>Total data: <strong>{data.length}</strong> record</div>
            </div>
            <div style={{ fontSize: 8, color: "#666" }}>Dicetak: {now}</div>
          </div>

          {/* ── DATA TABLE ── */}
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...PRINT_STYLES.CELL, background: "#1a1a1a", color: "#fff", fontWeight: "bold", fontSize: 8, textAlign: "center", width: 28 }}>No.</th>
                {headers.map((h, i) => (
                  <th key={i} style={{ ...PRINT_STYLES.CELL, background: "#1a1a1a", color: "#fff", fontWeight: "bold", fontSize: 8, textAlign: "left" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={headers.length + 1} style={{ ...PRINT_STYLES.CELL, textAlign: "center", padding: "20px", fontStyle: "italic", color: "#999" }}>
                    Tidak ada data.
                  </td>
                </tr>
              ) : (
                data.map((row, rowIndex) => (
                  <tr key={rowIndex} style={{ background: rowIndex % 2 === 0 ? "#fff" : "#f9f9f9" }}>
                    <td style={{ ...PRINT_STYLES.CELL, textAlign: "center", fontSize: 8, color: "#666" }}>{rowIndex + 1}</td>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} style={{ ...PRINT_STYLES.CELL, fontSize: 8, textAlign: typeof cell === "number" ? "center" : "left" }}>
                        {cell === true ? "✓ Aktif" : cell === false ? "✗ Nonaktif" : String(cell ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Footer */}
          <div style={{ marginTop: 8, borderTop: "1px solid #000", paddingTop: 4, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div style={{ fontSize: 7, color: "#555", fontStyle: "italic" }}>
              Dokumen ini dicetak dari sistem VCF — PT. Industri Nabati Lestari. Hanya untuk keperluan internal.
            </div>
            <div style={{ fontWeight: "bold", fontSize: 8, letterSpacing: 0.3, textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
              {printSettings.company_name}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
