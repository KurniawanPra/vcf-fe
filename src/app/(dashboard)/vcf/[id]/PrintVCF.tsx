  "use client";

  import { useState, useEffect } from "react";
  import { masterApi, settingsApi } from "@/lib/api";
  import PrintTemplate from "@/components/print/PrintTemplate";
  import VCFFormBody from "@/components/print/VCFFormBody";

  /* Skeleton for print loading state */
  const PrintSkeleton = () => (
    <div style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1, height: 20, background: "#e5e7eb", borderRadius: 4, animation: "pulse 1.5s infinite" }} />
        <div style={{ flex: 1, height: 20, background: "#e5e7eb", borderRadius: 4, animation: "pulse 1.5s infinite 0.1s" }} />
      </div>
      <div style={{ height: 120, background: "#e5e7eb", borderRadius: 4, marginBottom: 16, animation: "pulse 1.5s infinite 0.2s" }} />
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 2, height: 16, background: "#e5e7eb", borderRadius: 4, animation: "pulse 1.5s infinite 0.3s" }} />
        <div style={{ flex: 1, height: 16, background: "#e5e7eb", borderRadius: 4, animation: "pulse 1.5s infinite 0.4s" }} />
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1, height: 16, background: "#e5e7eb", borderRadius: 4, animation: "pulse 1.5s infinite 0.5s" }} />
        <div style={{ flex: 2, height: 16, background: "#e5e7eb", borderRadius: 4, animation: "pulse 1.5s infinite 0.6s" }} />
      </div>
      <div style={{ height: 80, background: "#e5e7eb", borderRadius: 4, marginTop: 16, animation: "pulse 1.5s infinite 0.7s" }} />
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    TYPES
  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  interface VcfDetail {
    id: number;
    nomor_urut: string;
    tanggal: string;
    created_at?: string;
    status: string;
    tipe_kegiatan: string;
    asal_tujuan: string;
    no_polisi: string;
    jam_masuk: string;
    produk?: string;
    tipe_kendaraan?: string;
    tahun_kendaraan?: number;
    transporter?: { nama_transporter: string };
    driver?: { nama_supir: string; no_sim: string; jenis_sim?: string; tgl_berlaku_sim?: string };
    kelengkapan_supir?: { id: number; item_id: number; nilai: any; keterangan?: string; item: { nama_item: string } }[];
    pemeriksaan_masuk?: { id: number; item_id: number; nilai: string; keterangan?: string; item: { nama_item: string }; petugas?: { nama: string }; waktu_input?: string; created_at?: string }[];
    pemeriksaan_keluar?: { id: number; item_id: number; nilai: string; keterangan?: string; item: { nama_item: string }; petugas?: { nama: string }; waktu_input?: string; created_at?: string }[];
    beban_tambahan_masuk?: { jenis_beban: string; ada: boolean };
    beban_tambahan_keluar?: { jenis_beban: string; ada: boolean };
    segel_masuk?: { jumlah_segel: number; kondisi?: string; nomor_segel: { nomor_segel: string }[]; petugas?: { nama: string }; waktu_input?: string; created_at?: string; keterangan?: string };
    segel_keluar?: { jumlah_segel: number; kondisi?: string; nomor_segel: { nomor_segel: string }[]; petugas?: { nama: string }; waktu_input?: string; created_at?: string; keterangan?: string };
    vcf_keluar?: { jam_keluar: string; emergency_respon_kontak: string; keterangan?: string; petugas?: { nama: string }; waktu_input?: string; created_at?: string };
    vcf_bagian2?: { keterangan?: string };
    vcf_bagian3?: { keterangan?: string };
    catatan?: string;
    keterangan?: string;
    jenis_kendaraan_id?: number;
    jenis_kendaraan?: { id: number; nama: string };
    muatan_dibawa?: { item_muatan_id?: number; item_muatan?: { id: number; nama_item?: string }; nama_item?: string; nilai?: string }[];
    muatan_diisi?: { item_muatan_id?: number; item_muatan?: { id: number; nama_item?: string }; nama_item?: string; nilai?: string }[];
    created_by?: { id: number; nama: string };
    nama_petugas_main_gate_masuk?: string;
    nama_petugas_wb_masuk?: string;
    nama_petugas_wb_keluar?: string;
    nama_petugas_main_gate_keluar?: string;
    timbangan?: {
      id: number;
      vcf_id: number;
      bruto_from?: number | null;
      tara_from?: number | null;
      netto_from?: number | null;
      bruto?: number | null;
      tara?: number | null;
      netto?: number | null;
    };
  }

  interface Props {
    vcf: VcfDetail;
    onClose: () => void;
  }

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    MAIN COMPONENT
  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  export default function PrintVCF({ vcf, onClose }: Props) {
    // Master Data State
    const [masterJenis, setMasterJenis] = useState<{ id: number; nama: string }[]>([]);
    const [masterProduk, setMasterProduk] = useState<{ id: number; nama: string; kode: string }[]>([]);
    const [masterKS, setMasterKS] = useState<{ id: number; nama_item: string }[]>([]);
    const [masterMuatan, setMasterMuatan] = useState<{ id: number; nama_item: string }[]>([]);
    const [masterPM, setMasterPM] = useState<{ id: number; nama_item: string; kode?: string; tipe_jawaban?: string }[]>([]);
    const [masterPK, setMasterPK] = useState<{ id: number; nama_item: string; kode?: string; tipe_jawaban?: string }[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Settings State
    const [printSettings, setPrintSettings] = useState({
      company_name: "PT. Industri Nabati Lestari",
      company_address: "Komp. KEK Sei Mangkei, Kav. 2-3,Kec. Bosar Maligas, Kab. Simalungun, Sumatera Utara, 21183",
      show_qr_signature: true,
      footer_text: "Dokumen ini dihasilkan secara otomatis oleh sistem VCF",
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
          setMasterJenis(resJ.data.data || resJ.data);
          setMasterProduk(resP.data.data || resP.data);
          setMasterKS(resKS.data.data || resKS.data);
          setMasterMuatan(resM.data.data || resM.data);
          setMasterPM(resPM.data.data || resPM.data);
          setMasterPK(resPK.data.data || resPK.data);
          
          const settings = resSettings.data.data || {};
          setPrintSettings({
            company_name: settings["print.company_name"] || "PT. Industri Nabati Lestari",
            company_address: settings["print.company_address"] || "Jl. Industri No. 123, Indonesia",
            show_qr_signature: true,
            footer_text: settings["print.footer_text"] || "Dokumen ini dihasilkan secara otomatis oleh sistem VCF",
            font_family: settings["print.font_family"] || "Arial, sans-serif",
          });
        } catch (err) {
          console.error("Failed to fetch master data for printing", err);
        } finally {
          setLoading(false);
        }
      };
      fetchMaster();
    }, []);

    if (loading) {
      return (
        <PrintTemplate title="Vehicle Control Form ( VCF )" subtitle={`No. ${vcf.nomor_urut}`} onClose={onClose} isLoading={true} settings={printSettings}>
          <PrintSkeleton />
        </PrintTemplate>
      );
    }

    return (
      <PrintTemplate
        title="Vehicle Control Form ( VCF )"
        subtitle={`No. ${vcf.nomor_urut}`}
        onClose={onClose}
        isLoading={false}
        settings={printSettings}
      >
        <VCFFormBody vcf={vcf} masters={{ masterJenis, masterProduk, masterKS, masterMuatan, masterPM, masterPK }} />
      </PrintTemplate>
    );
  }
