# VCF System - Frontend

Frontend aplikasi untuk sistem Vehicle Control Form (VCF) PT. Industri Nabati Lestari. Digunakan oleh petugas dan admin untuk mencatat dan mentracking kendaraan yang masuk dan keluar area industri.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS + CSS Variables (dark mode)
- **State Management**: React Hooks (useState, useEffect, useCallback)
- **HTTP Client**: Axios
- **QR Code**: qrcode (canvas-based)
- **Export**: docx, jspdf, xlsx
- **Print**: Custom print components (react-to-print)
- **Toast Notifications**: Custom toast system

## Prerequisites

Sebelum memulai, pastikan sudah terinstall:

- Node.js 18+ ( v18.20.8 )
- npm, yarn, atau pnpm
- Git
- Backend API sudah running (lihat README backend)

## Installation

### 1. Clone Repository

```bash
git clone <repository-url>
cd vcf/fe
```

### 2. Install Dependencies

```bash
npm install
# atau
yarn install
# atau
pnpm install
```

### 3. Setup Environment

Buat file `.env.local` atau cp `.env.local.example` menjadi `.env.local`  di root project:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

Jika backend di server lain, sesuaikan URL-nya:

```env
NEXT_PUBLIC_API_URL=https://your-backend-domain.com/api
```

### 4. Run Development Server

```bash
npm run dev
# atau
yarn dev
# atau
pnpm dev
```

Aplikasi akan tersedia di `http://localhost:3000`

## Configuration

### API Endpoint

Endpoint API dikonfigurasi melalui .env variable `NEXT_PUBLIC_API_URL`. Pastikan mengarah ke backend API yang sudah berjalan.

### Authentication

Aplikasi menggunakan token-based authentication via Laravel Sanctum. Token disimpan di `localStorage` dan dikirim di header setiap request.

## Project Structure

```
fe/src/
├── app/
│   ├── (dashboard)/
│   │   ├── vcf/
│   │   │   ├── [id]/
│   │   │   │   ├── Bagian1EditModal.tsx  - Modal edit registrasi VCF
│   │   │   │   ├── Bagian2Form.tsx       - Form pemeriksaan masuk
│   │   │   │   ├── Bagian3Form.tsx       - Form pemeriksaan keluar
│   │   │   │   ├── Bagian4Form.tsx       - Form main gate keluar
│   │   │   │   ├── PrintVCF.tsx          - Komponen print VCF
│   │   │   │   └── page.tsx              - Halaman detail VCF
│   │   │   ├── detail/[id]/page.tsx      - Halaman detail VCF (view only)
│   │   │   ├── list/page.tsx             - Daftar VCF dengan filter & approve
│   │   │   ├── violations/page.tsx       - Monitoring pelanggaran driver
│   │   │   ├── register/page.tsx         - Registrasi VCF baru (Bagian 1)
│   │   │   └── page.tsx                  - Dashboard VCF aktif
│   │   ├── master/
│   │   │   ├── checklist/page.tsx        - Manajemen item kelengkapan supir
│   │   │   ├── drivers/page.tsx          - Manajemen data driver
│   │   │   ├── logistik/page.tsx         - Manajemen data logistik
│   │   │   ├── muatan-dibawa/page.tsx    - Manajemen item muatan dibawa
│   │   │   ├── muatan-diisi/page.tsx     - Manajemen item muatan diisi
│   │   │   ├── pemeriksaan-keluar/page.tsx - Item pemeriksaan keluar
│   │   │   ├── pemeriksaan-masuk/page.tsx  - Item pemeriksaan masuk
│   │   │   ├── produk/page.tsx           - Manajemen produk
│   │   │   ├── transporters/page.tsx     - Manajemen transporter
│   │   │   ├── users/page.tsx            - Manajemen user & role
│   │   │   ├── vehicles/page.tsx         - Manajemen jenis kendaraan
│   │   │   └── violations/page.tsx       - Manajemen data pelanggaran
│   │   ├── dashboard/page.tsx            - Halaman dashboard utama
│   │   ├── settings/page.tsx             - Pengaturan sistem (print, dll)
│   │   └── layout.tsx                    - Layout dashboard + hamburger mobile
│   ├── login/page.tsx                    - Halaman login
│   ├── layout.tsx                        - Root layout
│   └── page.tsx                          - Landing page / redirect
├── components/
│   ├── print/
│   │   ├── PrintElements.tsx             - Komponen print reusable
│   │   ├── PrintMasterTable.tsx          - Print tabel master data
│   │   └── PrintTemplate.tsx             - Template print umum
│   ├── DeleteConfirmModal.tsx            - Modal konfirmasi hapus
│   ├── GuideSection.tsx                  - Komponen panduan penggunaan
│   ├── ImportConfirmModal.tsx            - Modal konfirmasi import Excel
│   ├── ImportResultModal.tsx             - Modal hasil import
│   ├── LogoutConfirmModal.tsx            - Modal konfirmasi logout
│   ├── SearchableDropdown.tsx            - Dropdown dengan search
│   ├── Sidebar.tsx                       - Sidebar navigasi
│   ├── ThemeProvider.tsx                 - Provider dark/light mode
│   ├── Toast.tsx                         - Custom toast notifications
│   └── ViolationWarningCard.tsx          - Card peringatan pelanggaran
├── lib/
│   ├── api.ts                            - API client (Axios-based)
│   ├── auth.ts                           - Auth helpers (token, role)
│   ├── exportUtils.ts                    - Export ke PDF, DOCX, Excel
│   ├── importTemplate.ts                 - Template import Excel
│   ├── masterDataCache.ts                - Cache master data di memori
│   ├── qrUtils.ts                        - Generate QR code tanda tangan
│   └── utils.ts                          - Utility functions umum
└── constants/
    └── vcfStatus.ts                      - Konstanta status VCF
```

## Key Features

### VCF Registration (Bagian 1)
- Input data kendaraan, pengemudi, transporter, dan produk
- Validasi field wajib & pengecekan pelanggaran driver otomatis
- Generate nomor urut VCF otomatis
- Checklist kelengkapan supir & muatan

### Pemeriksaan Masuk (Bagian 2)
- Form pemeriksaan item masuk (dinamis dari master data)
- Input segel dan nomor segel
- Mode edit untuk data yang sudah terisi
- Approve / reject dengan alasan & tipe tindakan

### Pemeriksaan Keluar (Bagian 3)
- Form pemeriksaan item keluar (dinamis dari master data)
- Input segel keluar
- Approve / reject dengan catatan blacklist/warning

### Main Gate Keluar (Bagian 4)
- Input jam keluar & emergency kontak
- Konfirmasi finalisasi transaksi
- Generate QR code tanda tangan digital

### Print VCF
- Layout print profesional multi-bagian
- QR code untuk verifikasi keaslian dokumen
- Konfigurasi nama perusahaan & footer dari settings
- Export ke PDF dan DOCX

### Master Data Management
- CRUD lengkap untuk semua master data
- Import data massal dari Excel
- Export ke Excel, PDF, DOCX
- Search, filter, dan active/inactive toggle

### Pelanggaran Driver
- Pencatatan riwayat pelanggaran per driver
- Status warning dan blacklist
- Pengecekan otomatis saat registrasi VCF baru

### Dashboard
- Statistik VCF aktif hari ini
- Status tracking per tahap
- Quick actions untuk admin

## Build for Production

```bash
npm run build
# atau
yarn build
# atau
pnpm build
```

Start production server:

```bash
npm start
# atau
yarn start
# atau
pnpm start
```

## Deployment

### Render / Vercel (Recommended)

1. Push code ke GitHub
2. Import project ke platform deployment
3. Set environment variables:
   - `NEXT_PUBLIC_API_URL` — URL backend API
4. Deploy

### Self-hosted

Build lalu serve folder `.next` menggunakan Node.js:

```bash
npm run build
npm start
```

## API Integration

Semua fungsi API ada di `src/lib/api.ts` menggunakan Axios. Pastikan backend sudah running dan `NEXT_PUBLIC_API_URL` sudah dikonfigurasi.

### Contoh Penggunaan API

```typescript
import { vcfApi, masterApi } from '@/lib/api';

// Get list VCF
const res = await vcfApi.getList({ status: 'aktif' });

// Create VCF
const newVcf = await vcfApi.create(data);

// Get master drivers
const drivers = await masterApi.getDrivers({ is_active: 1 });
```

## Troubleshooting

### Module Not Found Error

```bash
rm -rf node_modules package-lock.json
npm install
```

### Port Already in Use

```bash
npm run dev -- -p 3001
```

### API Connection Error

Pastikan:
1. Backend API sudah running
2. `NEXT_PUBLIC_API_URL` di `.env.local` sudah benar
3. Tidak ada CORS issue di backend

### Build Error

```bash
rm -rf .next
npm run build
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Edge (latest)
- Safari (latest)

## Development Guidelines

### Component Structure
- Functional components dengan hooks
- TypeScript untuk type safety
- Komponen reusable di `src/components/`
- Komponen page-specific di `src/app/`

### Styling
- TailwindCSS utility classes
- CSS Variables untuk theming dark/light mode
- Hindari inline styles (kecuali dynamic values)

### State Management
- State lokal: `useState`
- Side effects: `useEffect`
- Fungsi async: `useCallback` untuk stabilitas dependency

### Error Handling
- Selalu handle error di API calls dengan `getErrorMessage()`
- Tampilkan feedback via Toast notifications
- Log error untuk debugging

## License

Proprietary - PT. Industri Nabati Lestari
