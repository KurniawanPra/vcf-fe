"use client";

import { useState } from "react";

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

  return (
    <div>
      {/* Header Banner */}
      <div
        className="rounded-2xl p-5 mb-4 flex items-start gap-4"
        style={{
          background: "linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(139,92,246,0.08) 100%)",
          border: "1px solid rgba(59,130,246,0.2)",
        }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm mb-0.5" style={{ color: "var(--text-primary)" }}>
            Panduan Operasional VCF — PT. INL
          </p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Ikuti alur 4 tahap berikut untuk memproses setiap kendaraan dari masuk hingga keluar area. Klik bagian yang ingin dipelajari.
          </p>
        </div>
        {/* Flow pills */}
        <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
          {[
            { label: "Registrasi", color: "#3b82f6" },
            { label: "WB Masuk", color: "#f59e0b" },
            { label: "MG Keluar", color: "#8b5cf6" },
            { label: "Selesai", color: "#10b981" },
          ].map((s, i) => (
            <div key={s.label} className="flex items-center gap-1">
              <span
                className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: `${s.color}20`, color: s.color, border: `1px solid ${s.color}40` }}
              >
                {s.label}
              </span>
              {i < 3 && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
                  <path d="m9 18 6-6-6-6"/>
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Accordion Sections */}
      <div className="space-y-2">
        {sections.map((section) => {
          const isOpen = open === section.id;
          return (
            <div
              key={section.id}
              className="glass-card overflow-hidden transition-all duration-200"
              style={isOpen ? { borderColor: section.borderColor } : {}}
            >
              {/* Header */}
              <button
                className="w-full flex items-center justify-between px-5 py-3.5 text-left transition-colors"
                onClick={() => setOpen(isOpen ? null : section.id)}
                style={{ background: isOpen ? section.bgColor : undefined }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${section.color}20`, color: section.color }}
                  >
                    {section.icon}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full flex-shrink-0"
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
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
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

              {/* Content */}
              {isOpen && (
                <div
                  className="px-5 pb-5 pt-1 border-t"
                  style={{ borderColor: section.borderColor }}
                >
                  <ol className="mt-3 space-y-2.5">
                    {section.steps.map((step, idx) => (
                      <li key={idx} className="flex gap-3 items-start">
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5"
                          style={{ background: section.color, color: "white" }}
                        >
                          {idx + 1}
                        </span>
                        <div className="flex-1 flex items-start gap-2 flex-wrap">
                          <p className="text-xs leading-relaxed flex-1" style={{ color: "var(--text-secondary)" }}>
                            {step.text}
                          </p>
                          {step.tag && (
                            <span
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                              style={{
                                background: `${section.color}14`,
                                color: section.color,
                                border: `1px solid ${section.color}30`,
                              }}
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
                      className="mt-4 flex gap-2.5 p-3 rounded-xl text-xs leading-relaxed"
                      style={{
                        background: `${section.color}0d`,
                        border: `1px solid ${section.color}25`,
                        color: "var(--text-secondary)",
                      }}
                    >
                      <svg
                        width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        className="flex-shrink-0 mt-0.5"
                        style={{ color: section.color }}
                      >
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
    </div>
  );
}
