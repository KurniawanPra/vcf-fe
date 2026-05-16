"use client";

import React, { useRef } from "react";
import Image from "next/image";
import { PRINT_STYLES } from "./PrintElements";

interface PrintTemplateProps {
  title: string;
  subtitle?: string;
  docNo?: string;
  revNo?: string;
  effDate?: string;
  onClose: () => void;
  children: React.ReactNode;
  settings?: {
    company_name?: string;
    company_address?: string;
    show_qr_signature?: boolean;
    footer_text?: string;
    font_family?: string;
  };
}

export default function PrintTemplate({
  title,
  subtitle,
  docNo = "FM-BSHS-42/01",
  revNo = "01",
  effDate = "13-Mar-25",
  onClose,
  children,
  settings = {},
}: PrintTemplateProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const {
    company_name = "PT. INDUSTRI NABATI LESTARI",
    company_address = "Komp.KEK Sei Mangkei, Kav.2-3, Kec. Bosar Maligas, Kab. Simalungun, Sumatera Utara, 21183",
    show_qr_signature = true,
    footer_text = "Dilarang memberikan uang / barang kepada petugas. Apabila terbukti melakukan hal tersebut maka akan dikenakan sanksi keras dan tidak diperbolehkan memasuki area",
    font_family = "Arial, sans-serif",
  } = settings;

  const handlePrint = () => {
    const html = printRef.current?.innerHTML;
    if (!html) return;
    const w = window.open("", "_blank");
    if (!w) return;

    w.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            @page { size: A4 portrait; margin: 0; }
            body { 
              font-family: ${font_family}; 
              font-size: 7.5px; 
              color: #000; 
              margin: 0; 
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              line-height: 1.2;
            }
            * { box-sizing: border-box; }
            table { border-collapse: collapse; width: 100%; table-layout: fixed; margin-bottom: 0 !important; }
            th, td { border: 1px solid #000; padding: 1.5px 4px; vertical-align: middle; font-size: 7.5px; word-wrap: break-word; line-height: 1.2; }
            img { max-width: 100%; height: auto; }
            .no-print { display: none !important; }
            .print-wrap { padding: 5mm 7mm !important; }
            span { font-size: 7.5px !important; }
            div { line-height: 1.2; }
            svg { max-width: 40px !important; max-height: 40px !important; width: 40px !important; height: 40px !important; }
          </style>
        </head>
        <body>
          <div class="print-wrap" style="padding: 6mm 8mm;">
            ${html}
          </div>
        </body>
      </html>
    `);

    w.document.close();

    w.onload = () => {
      setTimeout(() => {
        w.print();
        w.close();
      }, 500);
    };

    // Fallback
    setTimeout(() => {
      if (w.document.readyState !== 'complete') {
        w.print();
        w.close();
      }
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/80 overflow-y-auto py-10">
      <div style={{ width: "210mm", height: "fit-content", background: "#fff", flexShrink: 0 }}>
        
        {/* Toolbar (Hidden in Print) */}
        <div className="no-print" style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between", 
          padding: "12px 24px", 
          background: "#1e293b", 
          color: "#fff" 
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{title}</div>
            {subtitle && <div style={{ fontSize: 10, opacity: 0.7 }}>{subtitle}</div>}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button 
              onClick={handlePrint} 
              style={{ padding: "8px 24px", background: "#8b5cf6", color: "#fff", border: "none", borderRadius: 6, fontWeight: 700, cursor: "pointer" }}
            >
              PRINT
            </button>
            <button 
              onClick={onClose} 
              style={{ padding: "8px 16px", background: "#475569", color: "#fff", border: "none", borderRadius: 6, fontWeight: 700, cursor: "pointer" }}
            >
              CLOSE
            </button>
          </div>
        </div>

        {/* Print Content Area */}
        <div ref={printRef} style={{ padding: "8mm 10mm", background: "#fff", color: "#000" }}>
          
          {/* ── SHARED HEADER ── */}
          <table style={{ width: "100%", marginBottom: 0, borderCollapse: "collapse" }}>
            <colgroup>
              <col style={{ width: "10%" }} />
              <col style={{ width: "50%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "10%" }} />
            </colgroup>
            <tbody>
              {/* Row 1–4: Logo + Company Info + Doc metadata */}
              <tr>
                <td rowSpan={4} style={{ ...PRINT_STYLES.CELL, padding: 0, position: "relative" }}>
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Image src="/logo.png" width={60} height={60} style={{ display: "block" }} alt="VCF Logo" />
                  </div>
                </td>
                <td rowSpan={3} style={{ ...PRINT_STYLES.CELL, textAlign: "center", verticalAlign: "middle", padding: "4px 6px" }}>
                  <div style={{ fontWeight: "bold", fontSize: 11, letterSpacing: 0.3 , textDecoration: "underline"}}>{company_name}</div>
                  <div style={{ fontSize: 9, marginTop: 1 }}>PABRIK MINYAK GORENG</div>
                  <div style={{ fontSize: 8, marginTop: 2, lineHeight: 1.4 }}>
                    {company_address}
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

          {/* Dynamic Content */}
          {children}

          {/* Shared Footer */}
          <div style={{ marginTop: 8, borderTop: "1px solid #000", paddingTop: 4, textAlign: "center" }}>
            <div style={{ fontSize: 7, fontStyle: "italic", lineHeight: 1.5 }}>
              {footer_text}
            </div>
            <div style={{ fontWeight: "bold", fontSize: 8, marginTop: 2, letterSpacing: 0.3 }}>
              {company_name}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
