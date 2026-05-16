"use client";

import React from "react";
import QRCode from "react-qr-code";

/* ─────────────────────────────────────────────
   STYLES
   Reusable style tokens for table-based printing
───────────────────────────────────────────── */
export const PRINT_STYLES = {
  CELL: { border: "1px solid #000", padding: "2px 5px", fontSize: "8.5px", verticalAlign: "top" } as React.CSSProperties,
  CELL_CENTER: {
    border: "1px solid #000",
    padding: "2px 5px",
    fontSize: "8.5px",
    verticalAlign: "middle",
    textAlign: "center",
  } as React.CSSProperties,
  HDR: { border: "1px solid #000", padding: "3px 8px", fontSize: "9px", fontWeight: "bold", background: "#dcdcdc", textTransform: "uppercase" } as React.CSSProperties,
  SUB_HDR: { border: "1px solid #000", padding: "2px 8px", fontSize: "8.5px", fontWeight: "bold", background: "#f0f0f0" } as React.CSSProperties,
};

/* ─────────────────────────────────────────────
   COMPONENTS
───────────────────────────────────────────── */

/** Checkbox that shows X when checked. Highlight mode makes the label bold and bigger when checked. */
export const CK = ({ checked, label, highlight = false }: { checked?: boolean; label: string; highlight?: boolean }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 3, marginRight: 10, whiteSpace: "nowrap" }}>
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 10, height: 10, border: "1px solid #000", background: checked ? "#000" : "#fff",
      flexShrink: 0, fontSize: 8, fontWeight: "bold", color: checked ? "#fff" : "#000",
      lineHeight: 1,
    }}>
      {checked ? "✓" : ""}
    </span>
    <span style={{
      fontSize: highlight && checked ? 11 : 9,
      fontWeight: highlight && checked ? "bold" : "normal",
      color: highlight && checked ? "#000" : "inherit",
    }}>{label}</span>
  </span>
);

/** Underline field with fixed or dynamic width */
export const UL = ({ w, val, textAlign = "center" }: { w?: number | string; val?: string | number; textAlign?: "left" | "center" | "right" }) => (
  <span style={{
    display: "inline-block",
    borderBottom: "1px solid #000",
    minWidth: w || 40,
    fontSize: 9,
    paddingBottom: 0,
    textAlign: textAlign,
    verticalAlign: "bottom",
    marginLeft: 2,
    marginRight: 2,
  }}>
    {val || "-"}
  </span>
);

/** QR Code electronic signature — TTD form layout */
export const QRCodeSign = ({ nama, timestamp, label }: { nama?: string; timestamp?: string; label: string }) => {
  const WRAP: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
    padding: "2px 2px 2px",
    gap: 0,
  };

  if (!nama) {
    return (
      <div style={WRAP}>
        <div style={{ fontSize: 7, color: "#666", marginBottom: 2, alignSelf: "flex-start" }}>{label}:</div>
        {/* blank QR placeholder */}
        <div style={{
          width: 40, height: 40,
          border: "1px dashed #bbb",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 3,
        }}>
          <span style={{ fontSize: 6, color: "#ccc" }}>QR</span>
        </div>
        {/* signature line */}
        <div style={{
          width: "90%",
          borderBottom: "1px solid #000",
          marginBottom: 2,
          minHeight: 10,
        }} />
        <div style={{ fontSize: 6, color: "#aaa", fontStyle: "italic" }}>— belum diisi —</div>
      </div>
    );
  }

  const formattedTime = timestamp
    ? new Date(timestamp).toLocaleString("id-ID", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    })
    : null;

  const qrValue = `Verified: ${nama}${formattedTime ? " | " + formattedTime : ""}`;

  return (
    <div style={WRAP}>
      {/* label / jabatan */}
      <div style={{ fontSize: 7, color: "#555", marginBottom: 2, alignSelf: "flex-start" }}>{label}:</div>

      {/* QR code */}
      <div style={{
        background: "#fff",
        border: "1px solid #ddd",
        padding: 1,
        marginBottom: 3,
        lineHeight: 0,
      }}>
        <QRCode
          value={qrValue}
          size={40}
          level="L"
          style={{ display: "block", width: 40, height: 40 }}
        />
      </div>

      {/* signature line + name */}
      <div style={{
        width: "90%",
        borderBottom: "1px solid #000",
        textAlign: "center",
        paddingBottom: 1,
        marginBottom: 2,
      }}>
        <span style={{ fontSize: 8, fontWeight: "bold" }}>{nama}</span>
      </div>

      {/* timestamp */}
      {formattedTime && (
        <div style={{ fontSize: 7, color: "#555" }}>{formattedTime}</div>
      )}
    </div>
  );
};
