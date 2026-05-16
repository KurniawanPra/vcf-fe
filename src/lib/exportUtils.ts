import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, BorderStyle, ImageRun } from 'docx';

export type ExportFormat = 'pdf' | 'excel' | 'docx';

export const exportToExcel = (filename: string, headers: string[], data: any[][]) => {
  // Create header rows mimicking the image
  const headerInfo = [
    ["PT. INDUSTRI NABATI LESTARI", "", "", "", "No. Dokumen", "FM-BSHS-42/01"],
    ["PABRIK MINYAK GORENG", "", "", "", "Tgl berlaku", "13-Mar-25"],
    ["Komp. KEK Sei Mangkei, Kav. 2-3, Kec. Bosar Maligas, Kab. Simalungun", "", "", "", "No. Revisi", "01"],
    ["VEHICLE CONTROL FORM (VCF)", "", "", "", "Halaman", "1 dari 1"],
    [],
    headers
  ];

  const worksheet = XLSX.utils.aoa_to_sheet([...headerInfo, ...data]);
  
  // Basic styling (merges for header)
  worksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 3 } },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
  saveAs(blob, `${filename}.xlsx`);
};

const getLogoBase64 = async () => {
  try {
    const response = await fetch('/logo.svg');
    const blob = await response.blob();
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return null;
  }
};

const drawINLHeader = (doc: jsPDF, logoBase64: string | null, title: string) => {
  const startX = 10;
  const startY = 10;
  const width = 190;
  const height = 30;

  // Outer border
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.rect(startX, startY, width, height);

  // Vertical dividers
  doc.line(startX + 30, startY, startX + 30, startY + height); // Logo area
  doc.line(startX + 140, startY, startX + 140, startY + height); // Middle area
  doc.line(startX + 165, startY, startX + 165, startY + height); // Label/Value divider

  // Right side horizontal lines
  doc.line(startX + 140, startY + 7.5, startX + width, startY + 7.5);
  doc.line(startX + 140, startY + 15, startX + width, startY + 15);
  doc.line(startX + 140, startY + 22.5, startX + width, startY + 22.5);

  // Logo
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", startX + 2, startY + 5, 26, 20);
    } catch (e) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(59, 130, 246);
      doc.text("INL", startX + 15, startY + 18, { align: "center" });
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(59, 130, 246);
    doc.text("INL", startX + 15, startY + 18, { align: "center" });
  }

  // Center Content
  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.text("PT. INDUSTRI NABATI LESTARI", startX + 85, startY + 6, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("PABRIK MINYAK GORENG", startX + 85, startY + 11, { align: "center" });
  doc.setFontSize(6);
  doc.text("Komp. KEK Sei Mangkei, Kav. 2-3, Kec. Bosar Maligas, Kab. Simalungun, Sumatera Utara", startX + 85, startY + 16, { align: "center" });
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(title.toUpperCase(), startX + 85, startY + 25, { align: "center" });

  // Right Side Content
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  const labels = ["No. Dokumen", "Tgl berlaku", "No. Revisi", "Halaman"];
  const values = ["FM-BSHS-42/01", "13-Mar-25", "01", "1 dari 1"];
  
  labels.forEach((label, i) => {
    doc.text(label, startX + 142, startY + 5 + (i * 7.5));
    doc.text(values[i], startX + 167, startY + 5 + (i * 7.5));
  });
};

export const exportToPDF = async (filename: string, title: string, headers: string[], data: any[][]) => {
  const doc = new jsPDF();
  const logoBase64 = await getLogoBase64();
  drawINLHeader(doc, logoBase64, title);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 56);

  autoTable(doc, {
    head: [headers],
    body: data,
    startY: 62,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [59, 130, 246] },
  });

  doc.save(`${filename}.pdf`);
};

export const exportToDocx = async (filename: string, title: string, headers: string[], data: any[][]) => {
  const logoBase64 = await getLogoBase64();
  let logoImageRun: ImageRun | null = null;

  if (logoBase64) {
    try {
      const base64Data = logoBase64.split(',')[1];
      logoImageRun = new ImageRun({
        data: Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)),
        transformation: { width: 80, height: 60 },
        type: 'png',
      });
    } catch (e) {
      console.error("Failed to load logo for docx", e);
    }
  }

  // Create header table mimicking the image
  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({ 
            children: [logoImageRun ? new Paragraph({ children: [logoImageRun] }) : new Paragraph({ text: "INL", heading: "Heading1" })], 
            width: { size: 20, type: WidthType.PERCENTAGE },
            verticalAlign: "center"
          }),
          new TableCell({ 
            children: [
               new Paragraph({ text: "PT. INDUSTRI NABATI LESTARI", alignment: "center" }),
               new Paragraph({ text: "PABRIK MINYAK GORENG", alignment: "center" }),
               new Paragraph({ text: title.toUpperCase(), alignment: "center" }),
            ],
            width: { size: 50, type: WidthType.PERCENTAGE }
          }),
          new TableCell({ 
            children: [
              new Paragraph({ text: "No. Dokumen: FM-BSHS-42/01" }),
              new Paragraph({ text: "Tgl berlaku: 13-Mar-25" }),
              new Paragraph({ text: "No. Revisi: 01" }),
            ],
            width: { size: 30, type: WidthType.PERCENTAGE }
          }),
        ],
      }),
    ],
  });

  const mainTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: headers.map(h => new TableCell({
          children: [new Paragraph({ text: h })],
          shading: { fill: "3b82f6" },
        })),
      }),
      ...data.map(row => new TableRow({
        children: row.map(cell => new TableCell({
          children: [new Paragraph({ text: String(cell || '') })],
        })),
      })),
    ],
  });

  const doc = new Document({
    sections: [{
      children: [
        headerTable,
        new Paragraph({ text: "" }),
        new Paragraph({ text: title, heading: 'Heading2' }),
        new Paragraph({ text: `Dicetak pada: ${new Date().toLocaleString('id-ID')}`, spacing: { after: 200 } }),
        mainTable,
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${filename}.docx`);
};
