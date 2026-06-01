"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

type Step = { text: string; tag?: string };
type Section = {
  id: string;
  title: string;
  badge: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
  steps: Step[];
  note?: string;
};

export default function GuideSection() {
  const [open, setOpen] = useState<string | null>("registrasi");

  const sections: Section[] = [
    {
      id: "registrasi",
      title: "Registrasi Kendaraan Masuk",
      badge: "Tahap 1",
      color: "#3b82f6",
      bgColor: "rgba(59,130,246,0.08)",
      borderColor: "rgba(59,130,246,0.25)",
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
          <line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
        </svg>
      ),
      steps: [
        { text: "Dari halaman Operasional VCF, klik tombol Registrasi Baru di pojok kanan atas.", tag: "Main Gate Masuk" },
        { text: "Isi Informasi Dasar: tanggal, jam masuk kendaraan, pilih Tipe Kegiatan (Loading Lokal, Loading Export, Unloading Lokal, atau Unloading Import), lalu pilih Produk yang relevan." },
        { text: "Isi data Kendaraan & Supir: pilih Transporter, masukkan Nomor Polisi, pilih Jenis Kendaraan dan Supir dari daftar master data." },
        { text: "Centang daftar Pemeriksaan Kelengkapan Supir: SIM, STNK, kondisi fisik, dan kelengkapan lainnya yang telah diperiksa." },
        { text: "Pilih Muatan: untuk Unloading pilih muatan yang dibawa kendaraan, untuk Loading pilih muatan yang akan diisi. Gunakan opsi 'Lainnya' jika muatan tidak ada di daftar." },
        { text: "Tambahkan Keterangan jika diperlukan (opsional), lalu klik Simpan & Daftarkan VCF." },
        { text: "VCF berhasil dibuat. Status otomatis menjadi 'WB Masuk' — kendaraan siap menuju Weighbridge." },
      ],
      note: "Semua field bertanda * wajib diisi. Data transporter, supir, kendaraan, dan produk diambil dari Master Data. Pastikan master data sudah lengkap sebelum registrasi."
    },
    {
      id: "wb-masuk",
      title: "Pemeriksaan Weighbridge Masuk",
      badge: "Tahap 2",
      color: "#f59e0b",
      bgColor: "rgba(245,158,11,0.08)",
      borderColor: "rgba(245,158,11,0.25)",
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M3 12h18M3 6l9-3 9 3M3 18l9 3 9-3"/>
        </svg>
      ),
      steps: [
        { text: "Di halaman Operasional VCF, cari VCF dengan status WB Masuk (label kuning). Klik tombol WB Masuk pada baris VCF tersebut.", tag: "Weighbridge" },
        { text: "Anda akan masuk ke halaman detail VCF, tab Security Weighbridge (Masuk) sudah terbuka." },
        { text: "Isi setiap item checklist pemeriksaan fisik kendaraan — pilih opsi yang sesuai (misal: Baik, Lengkap, Terpasang, dll) untuk setiap poin pemeriksaan." },
        { text: "Jika ada Beban Tambahan, pilih 'Ada' lalu isi jenis beban tambahan yang dibawa kendaraan." },
        { text: "Jika Segel terpasang, pilih 'Terpasang' lalu isi jumlah dan nomor-nomor segel kendaraan." },
        { text: "Tambahkan Keterangan jika diperlukan (opsional), lalu klik Simpan & Lanjutkan." },
        { text: "Status VCF otomatis berubah — kendaraan melanjutkan ke area bongkar/muat. Pencatatan berat kendaraan dilakukan melalui sistem timbangan terpisah." },
      ],
      note: "Form ini hanya mencatat hasil pemeriksaan fisik oleh petugas security. Pencatatan berat (gross weight) dilakukan di aplikasi timbangan yang terpisah dari sistem VCF ini."
    },
    {
      id: "wb-keluar",
      title: "Pemeriksaan Main Gate Keluar",
      badge: "Tahap 3",
      color: "#8b5cf6",
      bgColor: "rgba(139,92,246,0.08)",
      borderColor: "rgba(139,92,246,0.25)",
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="9 11 12 14 22 4"/>
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
        </svg>
      ),
      steps: [
        { text: "Setelah kegiatan bongkar/muat selesai, cari VCF dengan status WB Keluar (label ungu). Klik tombol WB Keluar.", tag: "Main Gate Keluar" },
        { text: "Tab Security Weighbridge (Keluar) terbuka. Isi setiap item checklist pemeriksaan fisik kendaraan saat keluar." },
        { text: "Pilih opsi yang sesuai untuk setiap poin pemeriksaan (misal: kondisi kendaraan, kelengkapan, muatan Kosong/Sisa, dll)." },
        { text: "Jika ada Beban Tambahan yang masih terbawa, pilih 'Ada' dan isi keterangannya." },
        { text: "Jika Segel terpasang kembali saat keluar, pilih 'Terpasang' lalu isi nomor segel keluar." },
        { text: "Tambahkan Keterangan jika perlu, lalu klik Simpan & Lanjutkan. Status VCF berubah ke 'MG Keluar'." },
      ],
      note: "Form ini hanya mencatat hasil pemeriksaan fisik keluar oleh petugas security. Pencatatan berat (tare weight) dilakukan di aplikasi timbangan yang terpisah."
    },
    {
      id: "mg-keluar",
      title: "Finalisasi Main Gate Keluar",
      badge: "Tahap 4",
      color: "#10b981",
      bgColor: "rgba(16,185,129,0.08)",
      borderColor: "rgba(16,185,129,0.25)",
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
      ),
      steps: [
        { text: "Cari VCF dengan status MG Keluar (label hijau). Klik tombol MG Keluar untuk membuka halaman detail.", tag: "Main Gate" },
        { text: "Tab Main Gate Keluar terbuka otomatis. Verifikasi semua data yang sudah diisi di tahap sebelumnya." },
        { text: "Isi data keluar kendaraan: jam keluar, kondisi akhir kendaraan, dan pemeriksaan final." },
        { text: "Pastikan dokumen VCF lengkap dan semua tahapan sudah selesai sebelum finalisasi." },
        { text: "Klik tombol konfirmasi keluar Main Gate. Sistem akan meminta konfirmasi terakhir." },
        { text: "Status VCF berubah menjadi SELESAI (hijau). VCF terkunci dan siap untuk dicetak." },
      ],
      note: "Setelah status SELESAI, data VCF tidak dapat diubah kecuali oleh Admin. Cetak dokumen VCF dari halaman detail menggunakan tombol Cetak di tab Info."
    },
    {
      id: "cetak",
      title: "Mencetak Dokumen VCF",
      badge: "Utilitas",
      color: "#64748b",
      bgColor: "rgba(100,116,139,0.08)",
      borderColor: "rgba(100,116,139,0.2)",
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="6 9 6 2 18 2 18 9"/>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
          <rect x="6" y="14" width="12" height="8"/>
        </svg>
      ),
      steps: [
        { text: "Buka halaman detail VCF yang ingin dicetak. Pastikan VCF sudah berstatus SELESAI." },
        { text: "Klik tab Info, lalu klik tombol Cetak (ikon printer) di sebelah kanan atas." },
        { text: "Preview dokumen VCF lengkap akan tampil, termasuk QR Code dan tanda tangan digital tiap petugas." },
        { text: "Klik tombol PRINT di toolbar preview, atau tekan Ctrl+P untuk membuka dialog cetak browser." },
        { text: "Pilih printer atau 'Simpan sebagai PDF'. Disarankan ukuran kertas A4, orientasi Portrait." },
      ],
      note: "QR Code pada dokumen dapat dipindai untuk verifikasi dan akses cepat ke halaman VCF. Pastikan koneksi jaringan aktif saat memindai."
    },
    {
      id: "tips",
      title: "Tips Penting untuk Petugas",
      badge: "Info",
      color: "#06b6d4",
      bgColor: "rgba(6,182,212,0.08)",
      borderColor: "rgba(6,182,212,0.2)",
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      ),
      steps: [
        { text: "Gunakan filter tab (WB Masuk / WB Keluar / MG Keluar) di halaman Operasional VCF untuk melihat kendaraan yang menunggu di tiap tahap.", tag: "Filter" },
        { text: "Kotak pencarian di halaman Operasional mendukung pencarian berdasarkan nomor polisi, nama supir, nomor VCF, atau nama transporter." },
        { text: "Daftar VCF di halaman Operasional auto-refresh setiap 30 detik. Tidak perlu reload manual." },
        { text: "Untuk melihat semua histori VCF (termasuk yang sudah selesai), gunakan menu Daftar VCF di sidebar.", tag: "Histori" },
        { text: "Jangan tutup atau refresh halaman saat sedang mengisi form — data yang belum disimpan akan hilang." },
        { text: "Setiap aksi (simpan, edit, finalisasi) tercatat dengan nama petugas dan timestamp. Pastikan login dengan akun Anda sendiri." },
        { text: "Jika sistem lambat atau error, coba logout kemudian login kembali. Hubungi Admin jika masalah berlanjut." },
      ],
      note: "Untuk keperluan koreksi data atau pembatalan VCF yang sudah selesai, hanya Admin yang dapat melakukan perubahan."
    },
  ];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isModalOpen]);

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="w-full rounded-2xl p-4 flex items-center justify-between gap-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 group"
        style={{
          background: "linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(139,92,246,0.05) 100%)",
          border: "1px solid rgba(59,130,246,0.2)",
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform"
            style={{ background: "rgba(59,130,246,0.15)", color: "#3b82f6" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
          </div>
          <div className="text-left">
            <p className="font-bold text-sm mb-0.5" style={{ color: "var(--text-primary)" }}>
              Panduan Operasional VCF
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Klik untuk melihat petunjuk lengkap tahapan VCF
            </p>
          </div>
        </div>
        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--bg-secondary)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </div>
      </button>

      {/* Modal Portal */}
      {isModalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[999999] flex justify-center items-center p-4 sm:p-6" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(59,130,246,0.15)", color: "#3b82f6" }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>Panduan Operasional VCF</h2>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Alur 4 tahap proses kendaraan PT. INL</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                style={{ color: "var(--text-muted)" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Modal Body (Scrollable Accordions) */}
            <div className="overflow-y-auto p-5 space-y-2" style={{ backgroundColor: "var(--bg-secondary)" }}>
              {sections.map((section) => {
                const isOpen = open === section.id;
                return (
                  <div
                    key={section.id}
                    className="glass-card overflow-hidden transition-all duration-200 bg-white dark:bg-slate-900 shadow-sm"
                    style={isOpen ? { borderColor: section.borderColor } : {}}
                  >
                    <button
                      className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors"
                      onClick={() => setOpen(isOpen ? null : section.id)}
                      style={{ background: isOpen ? section.bgColor : undefined }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: `${section.color}20`, color: section.color }}
                        >
                          {section.icon}
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          <span
                            className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full flex-shrink-0 w-max"
                            style={{ background: `${section.color}18`, color: section.color }}
                          >
                            {section.badge}
                          </span>
                          <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                            {section.title}
                          </span>
                        </div>
                      </div>
                      <svg
                        width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                        style={{
                          color: isOpen ? section.color : "var(--text-muted)",
                          transform: isOpen ? "rotate(180deg)" : "none",
                          transition: "transform 0.2s ease, color 0.2s ease",
                          flexShrink: 0,
                        }}
                      >
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-5 pt-2 border-t" style={{ borderColor: section.borderColor }}>
                        <ol className="mt-3 space-y-3">
                          {section.steps.map((step, idx) => (
                            <li key={idx} className="flex gap-3 items-start">
                              <span
                                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5"
                                style={{ background: section.color, color: "white" }}
                              >
                                {idx + 1}
                              </span>
                              <div className="flex-1 flex flex-col gap-1.5">
                                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                                  {step.text}
                                </p>
                                {step.tag && (
                                  <span
                                    className="text-[10px] font-bold px-2 py-0.5 rounded w-max"
                                    style={{ background: `${section.color}14`, color: section.color, border: `1px solid ${section.color}30` }}
                                  >
                                    {step.tag}
                                  </span>
                                )}
                              </div>
                            </li>
                          ))}
                        </ol>

                        {section.note && (
                          <div
                            className="mt-4 flex gap-3 p-3.5 rounded-xl text-sm leading-relaxed"
                            style={{ background: `${section.color}0d`, border: `1px solid ${section.color}25`, color: "var(--text-secondary)" }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5" style={{ color: section.color }}>
                              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                            <span>{section.note}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-900/50">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Tutup Panduan
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
