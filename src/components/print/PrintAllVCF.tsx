"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { masterApi, settingsApi } from "@/lib/api";
import { PRINT_STYLES } from "./PrintElements";
import VCFFormBody, { VcfDetail, VcfPrintMasters } from "./VCFFormBody";

interface Props {
  vcfs: VcfDetail[];
  onClose: () => void;
  docNo?: string;
  revNo?: string;
  effDate?: string;
  title?: string;
  subtitle?: string;
}

interface PrintSettings {
  company_name: string;
  company_address: string;
  show_qr_signature: boolean;
  footer_text: string;
  font_family: string;
}

/* ─────────────────────────────────────────────
  Single Page (one VCF) — duplicates PrintTemplate
  header + footer so each VCF renders on its own
  A4 page with proper "Halaman X dari Y" numbering.
───────────────────────────────────────────── */
function VCFPage({
  vcf,
  masters,
  settings,
  pageNumber,
  totalPages,
  docNo,
  revNo,
  effDate,
  title,
  isLast,
}: {
  vcf: VcfDetail;
  masters: VcfPrintMasters;
  settings: PrintSettings;
  pageNumber: number;
  totalPages: number;
  docNo: string;
  revNo: string;
  effDate: string;
  title: string;
  isLast: boolean;
}) {
  return (
    <div
      className="vcf-print-page"
      style={{
        padding: "8mm 10mm",
        background: "#fff",
        color: "#000",
        pageBreakAfter: isLast ? "auto" : "always",
        breakAfter: isLast ? "auto" : "page",
      }}
    >
      {/* SHARED HEADER */}
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
              <div style={{ fontWeight: "bold", fontSize: 11, letterSpacing: 0.3, textDecoration: "underline" }}>
                {settings.company_name}
              </div>
              <div style={{ fontSize: 9, marginTop: 1 }}>PABRIK MINYAK GORENG</div>
              <div style={{ fontSize: 8, marginTop: 2, lineHeight: 1.4 }}>{settings.company_address}</div>
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
            <td
              style={{
                ...PRINT_STYLES.CELL_CENTER,
                textAlign: "center",
                verticalAlign: "middle",
                fontWeight: "bold",
                fontSize: 10,
                padding: "5px 4px",
                borderTop: "1px solid #000",
              }}
            >
              {title.toUpperCase()}
            </td>
            <td style={{ ...PRINT_STYLES.CELL_CENTER, fontSize: 8 }}>Halaman</td>
            <td style={{ ...PRINT_STYLES.CELL_CENTER, fontSize: 8 }}>
              {pageNumber} dari {totalPages}
            </td>
          </tr>
        </tbody>
      </table>

      {/* BODY */}
      <VCFFormBody vcf={vcf} masters={masters} />

      {/* SHARED FOOTER */}
      <div style={{ marginTop: 8, borderTop: "1px solid #000", paddingTop: 4, textAlign: "center" }}>
        <div style={{ fontSize: 7, fontStyle: "italic", lineHeight: 1.5 }}>{settings.footer_text}</div>
        <div style={{ fontWeight: "bold", fontSize: 8, marginTop: 2, letterSpacing: 0.3 }}>
          {settings.company_name}
        </div>
      </div>
    </div>
  );
}

export default function PrintAllVCF({
  vcfs,
  onClose,
  docNo = "FM-BSHS-42/01",
  revNo = "01",
  effDate = "13-Mar-25",
  title = "Vehicle Control Form ( VCF )",
  subtitle,
}: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [masters, setMasters] = useState<VcfPrintMasters>({
    masterJenis: [],
    masterProduk: [],
    masterKS: [],
    masterMuatan: [],
    masterPM: [],
    masterPK: [],
  });
  const [settings, setSettings] = useState<PrintSettings>({
    company_name: "PT. INDUSTRI NABATI LESTARI",
    company_address:
      "Komp.KEK Sei Mangkei, Kav.2-3, Kec. Bosar Maligas, Kab. Simalungun, Sumatera Utara, 21183",
    show_qr_signature: true,
    footer_text:
      "Dilarang memberikan uang / barang kepada petugas. Apabila terbukti melakukan hal tersebut maka akan dikenakan sanksi keras dan tidak diperbolehkan memasuki area",
    font_family: "Arial, sans-serif",
  });

  useEffect(() => {
    const fetchMaster = async () => {
      try {
        const [resJ, resP, resKS, resM, resPM, resPK, resSettings] = await Promise.all([
          masterApi.getJenisKendaraan({ is_active: 1 }),
          masterApi.getProduk({ is_active: 1 }),
          masterApi.getItemKelengkapanSupir({ is_active: 1 }),
          masterApi.getItemMuatan({ is_active: 1 }),
          masterApi.getItemPemeriksaanMasuk({ is_active: 1 }),
          masterApi.getItemPemeriksaanKeluar({ is_active: 1 }),
          settingsApi.getPrint().catch(() => ({ data: { data: {} } })),
        ]);
        setMasters({
          masterJenis: resJ.data.data || resJ.data,
          masterProduk: resP.data.data || resP.data,
          masterKS: resKS.data.data || resKS.data,
          masterMuatan: resM.data.data || resM.data,
          masterPM: resPM.data.data || resPM.data,
          masterPK: resPK.data.data || resPK.data,
        });
        const s = resSettings.data.data || {};
        setSettings((prev) => ({
          ...prev,
          company_name: s["print.company_name"] || prev.company_name,
          company_address: s["print.company_address"] || prev.company_address,
          footer_text: s["print.footer_text"] || prev.footer_text,
          font_family: s["print.font_family"] || prev.font_family,
        }));
      } catch (err) {
        console.error("Failed to fetch master data for printing", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMaster();
  }, []);

  const handlePrint = () => {
    const html = printRef.current?.innerHTML;
    if (!html) return;
    const w = window.open("", "_blank");
    if (!w) return;

    w.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} — Bulk Print (${vcfs.length})</title>
          <style>
            @page { size: A4 portrait; margin: 0; }
            body {
              font-family: ${settings.font_family};
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
            .vcf-print-page { padding: 6mm 8mm !important; }
            span { font-size: 7.5px !important; }
            div { line-height: 1.2; }
            svg { max-width: 40px !important; max-height: 40px !important; width: 40px !important; height: 40px !important; }
          </style>
        </head>
        <body>
          ${html}
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

    setTimeout(() => {
      if (w.document.readyState !== "complete") {
        w.print();
        w.close();
      }
    }, 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center bg-black/80 overflow-auto py-4 sm:py-10"
      style={{ overflowX: "auto" }}
    >
      <div
        style={{
          width: "210mm",
          minWidth: "210mm",
          height: "fit-content",
          background: "#fff",
          flexShrink: 0,
        }}
        className="print-preview-container"
      >
        {/* Toolbar (Hidden in Print) */}
        <div
          className="no-print"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 24px",
            background: "#1e293b",
            color: "#fff",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>
              {title} — Cetak Semua ({vcfs.length} VCF)
            </div>
            {subtitle && <div style={{ fontSize: 10, opacity: 0.7 }}>{subtitle}</div>}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handlePrint} disabled={loading} className="btn btn-primary btn-sm">
              {loading ? "Memuat..." : "PRINT"}
            </button>
            <button onClick={onClose} className="btn btn-secondary btn-sm">
              CLOSE
            </button>
          </div>
        </div>

        {/* Print Content Area */}
        <div ref={printRef} style={{ background: "#fff", color: "#000" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#000" }}>
              Memuat data master untuk pencetakan...
            </div>
          ) : vcfs.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "#000" }}>
              Tidak ada VCF untuk dicetak.
            </div>
          ) : (
            vcfs.map((vcf, idx) => (
              <VCFPage
                key={vcf.id}
                vcf={vcf}
                masters={masters}
                settings={settings}
                pageNumber={idx + 1}
                totalPages={vcfs.length}
                docNo={docNo}
                revNo={revNo}
                effDate={effDate}
                title={title}
                isLast={idx === vcfs.length - 1}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
