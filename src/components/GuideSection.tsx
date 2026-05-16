"use client";

import { useState } from "react";

export default function GuideSection() {
  const [open, setOpen] = useState<string | null>("vcf-baru");

  const sections = [
    {
      id: "login",
      title: "Login ke Sistem",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>,
      steps: [
        { num: 1, text: "Buka browser dan akses alamat sistem VCF yang diberikan admin." },
        { num: 2, text: "Masukkan Username dan Password yang telah diberikan oleh administrator." },
        { num: 3, text: "Klik tombol Login. Jika berhasil, Anda akan diarahkan ke halaman utama (Dashboard)." },
        { num: 4, text: "Jika lupa password, hubungi administrator sistem untuk reset password." },
      ],
      note: "Petugas hanya dapat mengakses menu VCF dan tidak memiliki akses ke pengaturan sistem."
    },
    {
      id: "vcf-baru",
      title: "Membuat VCF Baru",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>,
      steps: [
        { num: 1, text: "Klik menu VCF di sidebar kiri." },
        { num: 2, text: "Klik tombol + REGISTRASI di pojok kanan atas." },
        { num: 3, text: "Isi SECTION 1: Dokumen & Logistik - tanggal, jam masuk, tipe kegiatan (Loading/Unloading), tipe logistik, dan pilih produk." },
        { num: 4, text: "Isi SECTION 2: Kendaraan & Personel - pilih transporter, no polisi, jenis kendaraan, dan data supir dari master data." },
        { num: 5, text: "Isi SECTION 3: Pemeriksaan Kelengkapan Supir - centang semua kelengkapan yang dimiliki (SIM, STNK, dll)." },
        { num: 6, text: "Isi SECTION 4: Muatan - setelah memilih tipe kegiatan, pilih muatan yang dibawa (unloading) atau akan diisi (loading). Termasuk opsi 'Lainnya' jika perlu." },
        { num: 7, text: "Isi SECTION 5: Keterangan (opsional) - tambahkan catatan jika diperlukan." },
        { num: 8, text: "Klik tombol Simpan & Daftarkan VCF untuk menyimpan VCF baru." },
        { num: 9, text: "VCF yang baru dibuat akan muncul di daftar dengan status Weighbridge Masuk." },
      ],
      note: "Pastikan semua data wajib (ditandai *) sudah diisi dengan benar sebelum menyimpan. Data kendaraan dan supir diambil dari master data."
    },
    {
      id: "vcf-proses",
      title: "Memproses VCF (Gate Masuk & Keluar)",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
      steps: [
        { num: 1, text: "Cari VCF yang akan diproses menggunakan fitur pencarian atau filter di halaman daftar VCF." },
        { num: 2, text: "Klik baris VCF untuk membuka halaman detail, atau klik tombol Edit jika tersedia." },
        { num: 3, text: "Di halaman detail, klik tab yang sesuai dengan tahapan pemeriksaan: Bagian 2 (Weighbridge Masuk), Bagian 3 (Weighbridge Keluar), atau Bagian 4 (Main Gate Keluar)." },
        { num: 4, text: "Isi data pemeriksaan sesuai dengan bagian yang sedang diproses: kondisi kendaraan, segel, beban tambahan, atau data keluar." },
        { num: 5, text: "Centang setiap item pemeriksaan dan isi keterangan jika diperlukan." },
        { num: 6, text: "Klik tombol Simpan untuk menyimpan data pemeriksaan." },
        { num: 7, text: "Status VCF akan otomatis berubah sesuai tahapan yang telah diselesaikan." },
      ],
      note: "Setiap pemeriksaan akan tercatat nama petugas dan timestamp-nya. Pastikan data diisi dengan teliti sebelum menyimpan."
    },
    {
      id: "cetak",
      title: "Mencetak Dokumen VCF",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
      steps: [
        { num: 1, text: "Buka halaman detail VCF yang ingin dicetak dari daftar VCF." },
        { num: 2, text: "Klik tombol Cetak (ikon printer) di pojok kanan atas halaman detail." },
        { num: 3, text: "Halaman preview cetak akan muncul menampilkan formulir VCF lengkap dengan QR Code." },
        { num: 4, text: "Gunakan Ctrl+P (Windows) atau Cmd+P (Mac) untuk membuka dialog cetak browser." },
        { num: 5, text: "Pilih printer yang tersedia dan klik Cetak, atau pilih Simpan sebagai PDF." },
        { num: 6, text: "Dokumen VCF akan berisi tanda tangan digital petugas di setiap bagian yang telah diproses." },
      ],
      note: "Dokumen VCF hanya dapat dicetak setelah semua tahapan pemeriksaan selesai. QR Code di dokumen dapat digunakan untuk verifikasi."
    },
    {
      id: "qrcode",
      title: "Menggunakan QR Code",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="6" y="6" width="1" height="1"/><rect x="17" y="6" width="1" height="1"/><rect x="6" y="17" width="1" height="1"/><path d="M14 14h.01"/><path d="M18 14h.01"/><path d="M14 18h.01"/><path d="M18 18h.01"/></svg>,
      steps: [
        { num: 1, text: "Setiap dokumen VCF yang dicetak memiliki QR Code di bagian pojok kanan bawah." },
        { num: 2, text: "QR Code berisi link langsung ke halaman detail VCF tersebut di sistem." },
        { num: 3, text: "Gunakan kamera smartphone atau aplikasi scanner QR untuk memindai kode." },
        { num: 4, text: "Anda akan diarahkan langsung ke halaman VCF yang bersangkutan untuk melihat detail atau melanjutkan pemeriksaan." },
        { num: 5, text: "QR Code juga digunakan untuk verifikasi keaslian dokumen VCF." },
      ],
      note: "Pastikan perangkat yang digunakan untuk scan terhubung ke internet atau jaringan internal perusahaan untuk mengakses link VCF."
    },
    {
      id: "tips",
      title: "Tips & Trik Penggunaan",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
      steps: [
        { num: 1, text: "Gunakan fitur Filter dan Pencarian di halaman daftar VCF untuk menemukan VCF berdasarkan nomor, nama pengemudi, no polisi, atau tanggal." },
        { num: 2, text: "Status VCF ditandai dengan warna: Abu = Draft, Kuning = Proses, Hijau = Selesai. Perhatikan status untuk mengetahui tahapan VCF." },
        { num: 3, text: "Tekan F5 atau tombol refresh browser untuk memperbarui daftar VCF jika data terbaru tidak muncul." },
        { num: 4, text: "Data formulir akan hilang jika browser/tab ditutup sebelum disimpan — selalu klik tombol Simpan sebelum meninggalkan halaman." },
        { num: 5, text: "Gunakan tombol PANDUAN di halaman VCF untuk melihat panduan penggunaan kapan saja jika lupa langkah-langkahnya." },
        { num: 6, text: "Jika terjadi error atau sistem lambat, coba refresh halaman atau logout dan login kembali." },
        { num: 7, text: "Pastikan koneksi internet stabil saat mengisi data untuk menghindari kehilangan data saat menyimpan." },
      ],
      note: "Untuk masalah teknis yang tidak dapat diselesaikan, hubungi administrator sistem atau IT support perusahaan."
    },
  ];

  return (
    <div className="space-y-4">
      <div className="glass-card p-5" style={{ borderLeft: "4px solid var(--accent-primary)" }}>
        <h2 className="font-bold text-base mb-1" style={{ color: "var(--text-primary)" }}>Panduan Penggunaan untuk Petugas</h2>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Panduan lengkap penggunaan sistem VCF untuk petugas operasional. Klik setiap bagian untuk melihat langkah-langkahnya.</p>
      </div>

      {sections.map(section => (
        <div key={section.id} className="glass-card overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-5 py-4 text-left"
            onClick={() => setOpen(open === section.id ? null : section.id)}
            style={{ background: open === section.id ? "var(--bg-secondary)" : undefined }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent-primary)", color: "white" }}>
                {section.icon}
              </div>
              <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{section.title}</span>
            </div>
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ color: "var(--text-muted)", transform: open === section.id ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {open === section.id && (
            <div className="px-5 pb-5 border-t" style={{ borderColor: "var(--border)" }}>
              <ol className="mt-4 space-y-3">
                {section.steps.map(step => (
                  <li key={step.num} className="flex gap-3">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5" style={{ background: "var(--accent-primary)", color: "white" }}>{step.num}</span>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{step.text}</p>
                  </li>
                ))}
              </ol>
              {section.note && (
                <div className="mt-4 flex gap-2 p-3 rounded-lg text-sm" style={{ background: "rgba(var(--accent-primary-rgb),0.08)", color: "var(--accent-primary)", border: "1px solid rgba(var(--accent-primary-rgb),0.2)" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span>{section.note}</span>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
