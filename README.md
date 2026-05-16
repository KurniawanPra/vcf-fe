# VCF System - Frontend

Frontend aplikasi untuk sistem Vehicle Control Form (VCF) PT. Industri Nabati Lestari. Aplikasi ini digunakan oleh petugas dan admin untuk mencatat dan memonitor kendaraan yang masuk dan keluar area perusahaan.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **UI Components**: shadcn/ui
- **Icons**: Lucide React
- **State Management**: React Hooks (useState, useEffect)
- **Form Handling**: React Hook Form
- **HTTP Client**: Fetch API
- **QR Code**: qrcode.react
- **Print**: React-to-print

## Prerequisites

Sebelum memulai, pastikan sudah terinstall:

- Node.js 18+ atau 20+
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

Buat file `.env.local` di root project:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
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

Endpoint API dikonfigurasi melalui environment variable `NEXT_PUBLIC_API_URL`. Pastikan ini mengarah ke backend API yang sudah berjalan.

### Authentication

Aplikasi menggunakan token-based authentication via Laravel Sanctum. Token disimpan di localStorage dan dikirim di header setiap request.

## Project Structure

```
fe/
├── app/
│   ├── (dashboard)/
│   │   ├── vcf/
│   │   │   ├── [id]/
│   │   │   │   ├── edit/
│   │   │   │   │   └── page.tsx       - Halaman edit VCF
│   │   │   │   ├── PrintVCF.tsx         - Komponen print VCF
│   │   │   │   ├── Bagian2Form.tsx     - Form Bagian 2
│   │   │   │   ├── Bagian3Form.tsx     - Form Bagian 3
│   │   │   │   ├── Bagian4Form.tsx     - Form Bagian 4
│   │   │   │   └── page.tsx            - Halaman detail VCF
│   │   │   ├── register/
│   │   │   │   └── page.tsx            - Halaman registrasi VCF baru
│   │   │   └── page.tsx                - Halaman list VCF
│   │   ├── master/
│   │   │   ├── driver/page.tsx         - Manajemen driver
│   │   │   ├── transporter/page.tsx    - Manajemen transporter
│   │   │   ├── jenis-kendaraan/page.tsx - Manajemen jenis kendaraan
│   │   │   ├── produk/page.tsx         - Manajemen produk
│   │   │   ├── item-pemeriksaan-masuk/page.tsx
│   │   │   ├── item-pemeriksaan-keluar/page.tsx
│   │   │   ├── item-muatan/page.tsx
│   │   │   ├── item-kelengkapan-supir/page.tsx
│   │   │   └── user/page.tsx           - Manajemen user
│   │   ├── settings/page.tsx           - Pengaturan sistem
│   │   └── layout.tsx                  - Layout dashboard
│   ├── login/page.tsx                  - Halaman login
│   ├── layout.tsx                      - Root layout
│   └── page.tsx                        - Landing page / redirect
├── components/
│   ├── ui/                            - shadcn/ui components
│   ├── print/
│   │   └── PrintElements.tsx          - Komponen print reusable
│   └── ...
├── lib/
│   ├── api.ts                         - API client functions
│   └── utils.ts                       - Utility functions
├── public/
│   └── ...
└── types/
    └── index.ts                       - TypeScript types
```

## Key Features

### VCF Registration (Bagian 1)
- Input data kendaraan dan pengemudi
- Validasi field wajib
- Generate nomor urut otomatis
- Status tracking

### Weighbridge Masuk (Bagian 2)
- Form pemeriksaan kendaraan masuk
- Input beban tambahan
- Input segel dan nomor segel
- Upload foto (jika diperlukan)

### Weighbridge Keluar (Bagian 3)
- Form pemeriksaan kendaraan keluar
- Input beban tambahan
- Input segel keluar
- Validasi data

### Main Gate Keluar (Bagian 4)
- Input jam keluar
- Finalisasi transaksi
- Generate QR code tanda tangan

### Print VCF
- Layout print profesional
- QR code untuk verifikasi
- Support multi-bagian dalam satu dokumen
- Keterangan rata kiri untuk readability

### Master Data Management
- CRUD untuk semua master data
- Search dan filter
- Pagination
- Active/inactive toggle

### Dashboard
- Statistik VCF hari ini
- Status tracking
- Quick actions

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

### Vercel (Recommended)

1. Push code ke GitHub
2. Import project ke Vercel
3. Set environment variables:
   - `NEXT_PUBLIC_API_URL` - URL backend API
4. Deploy

### Other Platforms

Build static export (jika diperlukan):

```bash
npm run build
```

File build akan ada di folder `.next`. Deploy sesuai platform yang digunakan.

## API Integration

Aplikasi frontend menggunakan API functions di `lib/api.ts` untuk berkomunikasi dengan backend. Pastikan backend sudah running dan endpoint sesuai dengan dokumentasi Postman collection.

### Contoh Penggunaan API

```typescript
import { vcfApi } from '@/lib/api';

// Get list VCF
const vcfs = await vcfApi.getAll();

// Create VCF
const newVcf = await vcfApi.create(data);

// Update VCF
const updated = await vcfApi.update(id, data);
```

## Troubleshooting

### Module Not Found Error

Jika ada error module not found:

```bash
rm -rf node_modules package-lock.json
npm install
```

### Port Already in Use

Jika port 3000 sudah digunakan:

```bash
# Gunakan port lain
npm run dev -- -p 3001
```

### API Connection Error

Pastikan:
1. Backend API sudah running
2. `NEXT_PUBLIC_API_URL` di `.env.local` sudah benar
3. Tidak ada CORS issue di backend

### Build Error

Jika build gagal:

```bash
# Clear cache
rm -rf .next
# Rebuild
npm run build
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Edge (latest)
- Safari (latest)

## Development Guidelines

### Component Structure
- Gunakan functional components dengan hooks
- Gunakan TypeScript untuk type safety
- Komponen reusable di folder `components/`
- Komponen page-specific di folder `app/`

### Styling
- Gunakan TailwindCSS utility classes
- Untuk styling kompleks, gunakan shadcn/ui components
- Hindari inline styles

### State Management
- Untuk state lokal, gunakan `useState`
- Untuk side effects, gunakan `useEffect`
- Untuk form, gunakan React Hook Form

### Error Handling
- Selalu handle error di API calls
- Tampilkan error message yang jelas ke user
- Log error untuk debugging

## License

Proprietary - PT. Industri Nabati Lestari
