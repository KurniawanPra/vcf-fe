# VCF Frontend — Design & Architecture Document

> Dokumen ini adalah panduan arsitektur untuk refactor frontend VCF system.
> Tujuan: **Mobile-first**, **reusable components**, **konsisten UI/UX**, **mudah di-maintain**.

---

## 1. Masalah Saat Ini

### 1.1 Duplikasi Kode Masif
| Pattern | File yang Duplikat | ~LOC duplikat |
|---|---|---|
| Modal dispatch `useEffect` (body overflow + event) | Bagian2Form, Bagian3Form, Bagian4Form, page.tsx, register | **~180 LOC** |
| Segel input (add/remove/sync) | register, Bagian2Form, Bagian3Form | **~120 LOC** |
| Reject modal UI + logic | Bagian2Form, Bagian3Form | **~200 LOC** |
| Pemeriksaan checklist render | Bagian2Form, Bagian3Form | **~150 LOC** |
| Read-only result card | Bagian2Form, Bagian3Form, Bagian4Form | **~180 LOC** |
| Timbangan reference display | Bagian2Form, Bagian3Form, Bagian4Form | **~100 LOC** |
| Error alert banner | Semua form | **~40 LOC** |
| Success overlay | Bagian2Form, Bagian3Form | **~60 LOC** |

**Total duplikasi: ~1,030 LOC** yang bisa direduksi ke ~200 LOC shared components.

### 1.2 File Terlalu Besar
| File | LOC | Concern |
|---|---|---|
| `[id]/page.tsx` | 1,424 | Detail + tabs + progress + all modals |
| `register/page.tsx` | 1,287 | Monolith form + validation |
| `Bagian3Form.tsx` | 1,037 | Form + readonly + reject + edit modal |
| `Bagian2Form.tsx` | 1,051 | Form + readonly + reject + edit modal |
| `Bagian4Form.tsx` | 657 | Form + readonly + confirm + edit modal |
| `Bagian1EditModal.tsx` | ~1,200 | Full edit form as modal |

### 1.3 Inkonsistensi UI
- Spacing, padding, border-radius berbeda antar form
- Beberapa pakai inline style, beberapa pakai Tailwind class
- Modal z-index tidak konsisten (50, 60, 80, 100)
- Button ordering berbeda di mobile vs desktop
- Font size label bervariasi (9px, 10px, 11px, 12px)

### 1.4 Mobile UX Buruk
- Form input terlalu kecil (padding 10px)
- Button terlalu rapat, sulit di-tap
- Horizontal scroll pada tab tanpa indicator
- Checklist item layout cramped di layar kecil
- Modal tidak responsive (max-width fixed)

---

## 2. Design Tokens & Spacing Scale

### 2.1 Spacing (Mobile-First)
```
--space-1: 4px    (micro gaps)
--space-2: 8px    (tight)
--space-3: 12px   (compact)
--space-4: 16px   (default mobile padding)
--space-5: 20px   (section gaps)
--space-6: 24px   (card padding mobile)
--space-8: 32px   (card padding desktop)
--space-10: 40px  (section dividers)
```

### 2.2 Touch Target
- Minimum tap target: **44px × 44px** (Apple HIG)
- Radio/checkbox buttons: min-height **48px**
- Form inputs: min-height **48px** (mobile), 40px (desktop)
- Action buttons: min-height **48px**

### 2.3 Typography Scale
```
--text-xs:   12px  (labels, captions)
--text-sm:   14px  (body, inputs)
--text-base: 16px  (mobile body — prevents iOS zoom)
--text-lg:   18px  (section titles mobile)
--text-xl:   20px  (page titles mobile)
--text-2xl:  24px  (page titles desktop)
```

### 2.4 Border Radius
```
--radius-sm:  8px   (inputs, small buttons)
--radius-md:  12px  (cards)
--radius-lg:  16px  (modals, large cards)
--radius-xl:  24px  (mobile bottom sheets)
--radius-full: 9999px (pills, badges)
```

### 2.5 Z-Index Scale (Normalized)
```
--z-dropdown:  30
--z-sticky:    40
--z-modal:     50
--z-popover:   60
--z-toast:     70
--z-critical:  80  (confirm dialogs)
```

---

## 3. Extracted Components

### 3.1 `useModalState` Hook
Menggantikan 10+ duplikat useEffect untuk modal open/close.

```tsx
// hooks/useModalState.ts
function useModalState(isOpen: boolean) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.dispatchEvent(new CustomEvent("modal-open"));
    } else {
      document.body.style.overflow = "unset";
      window.dispatchEvent(new CustomEvent("modal-close"));
    }
    return () => {
      document.body.style.overflow = "unset";
      window.dispatchEvent(new CustomEvent("modal-close"));
    };
  }, [isOpen]);
}
```

### 3.2 `<ModalShell>` Component
Base modal wrapper — handles overlay, close, animations, mobile bottom-sheet.

```
Props:
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  icon?: ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'danger' | 'success'
  footer?: ReactNode
  children: ReactNode
```

### 3.3 `<FormSection>` Component
Consistent card wrapper for form sections.

```
Props:
  title: string
  subtitle?: string
  icon?: ReactNode
  iconColor?: string (tailwind color class)
  children: ReactNode
  actions?: ReactNode (top-right slot for Edit button etc)
```

### 3.4 `<SegelInput>` Component
Reusable segel number input (used in register, Bagian2).

```
Props:
  nomorSegel: string[]
  onChange: (segel: string[]) => void
  readOnly?: boolean
  variant?: 'emerald' | 'amber'
```

### 3.5 `<SegelReference>` Component
Read-only segel display (used in Bagian2 unloading, Bagian3).

```
Props:
  segelData: { jumlah_segel: number; nomor_segel: any[] } | null
  source: string (e.g. "dari Registrasi", "dari WB Masuk")
  variant?: 'emerald' | 'amber'
```

### 3.6 `<PemeriksaanChecklist>` Component
Shared inspection checklist (pemeriksaan masuk/keluar).

```
Props:
  items: CheckItem[]
  values: Record<number, string>
  onChange: (id: number, value: string) => void
  fieldErrors: Record<number, boolean>
  readOnly?: boolean
  children?: (item: CheckItem, value: string) => ReactNode  // for contextual fields (BTM, SGM)
```

### 3.7 `<TimbanganDisplay>` Component
Weight display card — reused across Bagian2/3/4 read-only views.

```
Props:
  timbangan: TimbanganData
  tipeKegiatan: string
  showNetto?: boolean
  showReference?: boolean
```

### 3.8 `<TimbanganInput>` Component
Weight input with reference — used in Bagian2/3 forms.

```
Props:
  label: string
  tipeKegiatan: string
  value: string
  onChange: (val: string) => void
  referenceWeight?: number
  timbangan?: TimbanganData
```

### 3.9 `<RejectModal>` Component
Shared reject flow with violation recording (used in Bagian2, Bagian3).

```
Props:
  isOpen: boolean
  onClose: () => void
  onReject: (reason: string, type: 'warning' | 'blacklist' | 'reject_only') => Promise<void>
  loading: boolean
  stageName: string
```

### 3.10 `<ReadOnlyResultCard>` Component
Generic display for saved form data with optional Edit button.

```
Props:
  title: string
  canEdit: boolean
  onEdit: () => void
  rejectedMessage?: string
  children: ReactNode
```

### 3.11 `<ErrorAlert>` Component
Consistent error display.

### 3.12 `<ProgressSteps>` Component
Extract the 4-step progress from page.tsx — used for both detail and potentially list.

```
Props:
  currentStep: number
  isDone: boolean
  isRejected: boolean
  rejectingPetugas?: string
```

---

## 4. File Structure (After Refactor)

```
fe/src/
├── app/
│   └── (dashboard)/
│       └── vcf/
│           ├── page.tsx                    # VCF list (existing, keep)
│           ├── register/
│           │   └── page.tsx                # Registration form (refactored, uses shared components)
│           ├── [id]/
│           │   ├── page.tsx                # Detail view (refactored, ~400 LOC from 1424)
│           │   ├── Bagian2Form.tsx          # WB Masuk form (refactored, ~300 LOC from 1051)
│           │   ├── Bagian3Form.tsx          # WB Keluar form (refactored, ~300 LOC from 1037)
│           │   ├── Bagian4Form.tsx          # MG Keluar form (refactored, ~250 LOC from 657)
│           │   ├── Bagian1EditModal.tsx     # Registration edit (refactored, uses shared)
│           │   ├── AdminTimbanganModal.tsx  # Admin weight edit (keep)
│           │   └── PrintVCF.tsx            # Print view (keep)
├── components/
│   ├── ui/                    # NEW — Shared UI primitives
│   │   ├── ModalShell.tsx
│   │   ├── FormSection.tsx
│   │   ├── ErrorAlert.tsx
│   │   ├── ReadOnlyResultCard.tsx
│   │   └── ConfirmDialog.tsx
│   ├── vcf/                   # NEW — VCF domain components
│   │   ├── ProgressSteps.tsx
│   │   ├── SegelInput.tsx
│   │   ├── SegelReference.tsx
│   │   ├── PemeriksaanChecklist.tsx
│   │   ├── TimbanganDisplay.tsx
│   │   ├── TimbanganInput.tsx
│   │   └── RejectModal.tsx
│   ├── Sidebar.tsx            # (existing)
│   ├── Toast.tsx              # (existing)
│   └── ...other existing
├── hooks/                     # NEW
│   └── useModalState.ts
├── constants/
│   └── vcfStatus.ts           # (existing)
├── lib/
│   ├── api.ts                 # (existing)
│   ├── auth.ts                # (existing)
│   └── utils.ts               # (existing)
└── types/                     # NEW — Shared TypeScript interfaces
    └── vcf.ts                 # VcfDetail, TimbanganData, CheckItem, etc.
```

---

## 5. Mobile-First Form Redesign

### 5.1 Prinsip
1. **Stack everything vertically** on mobile, side-by-side on desktop
2. **Large touch targets** — 48px minimum height for interactive elements
3. **Full-width inputs** on mobile, no max-width constraints
4. **Bottom-anchored actions** — primary button always reachable by thumb
5. **Sectioned forms** — clear visual separation between form groups
6. **Progressive disclosure** — hide optional fields behind expandable sections

### 5.2 Layout Grid
```
Mobile (<768px):    1 column, 16px padding, 12px gap
Tablet (768-1024):  2 columns, 24px padding, 16px gap
Desktop (>1024):    2-3 columns, 32px padding, 24px gap
```

### 5.3 Form Section Pattern (Mobile)
```
┌─────────────────────────────┐
│ 🔵 Section Title            │  ← 48px height header
│    Subtitle text            │
├─────────────────────────────┤
│                             │
│ Label                       │
│ ┌─────────────────────────┐ │
│ │ Input (48px height)     │ │  ← 16px base font (prevents iOS zoom)
│ └─────────────────────────┘ │
│                             │
│ Label                       │
│ ┌─────────────────────────┐ │
│ │ Input                   │ │
│ └─────────────────────────┘ │
│                             │
└─────────────────────────────┘
```

### 5.4 Checklist Item Pattern (Mobile)
```
Current (cramped):
┌──────────────────────────────────────┐
│ Label              [Baik] [Rusak]    │  ← Too tight
└──────────────────────────────────────┘

Redesigned (stacked, touch-friendly):
┌──────────────────────────────────────┐
│ Label                                │
│                                      │
│  ┌──────────┐  ┌──────────┐         │
│  │   Baik   │  │   Rusak  │         │  ← 48px height buttons
│  │   ✓      │  │          │         │
│  └──────────┘  └──────────┘         │
└──────────────────────────────────────┘
```

### 5.5 Action Bar Pattern (Mobile)
```
Floating bottom bar, always visible:
┌─────────────────────────────────────┐
│                                     │
│  Form content scrolls above...     │
│                                     │
├─────────────────────────────────────┤
│  ┌────────┐  ┌───────────────────┐  │  ← Fixed bottom, safe area padding
│  │ TOLAK  │  │  SIMPAN & LANJUT  │  │     48px height buttons
│  └────────┘  └───────────────────┘  │
└─────────────────────────────────────┘
```

### 5.6 Modal Pattern (Mobile)
```
Bottom sheet instead of centered modal:
┌─────────────────────────────────────┐
│                                     │
│         (overlay)                   │
│                                     │
├─────────────────────────────────────┤
│  ─── (drag handle)                  │
│                                     │
│  Modal Title                        │
│  Modal content...                   │
│                                     │
│  ┌───────────────────────────────┐  │
│  │      Action Button            │  │
│  └───────────────────────────────┘  │
│                                     │
│  (safe area bottom padding)         │
└─────────────────────────────────────┘
```

---

## 6. CSS Additions for Mobile-First

```css
/* Mobile-first form input override */
@media (max-width: 768px) {
  .form-input {
    font-size: 16px;       /* Prevents iOS auto-zoom */
    min-height: 48px;
    padding: 12px 16px;
    border-radius: 12px;
  }

  .form-label {
    font-size: 11px;
    margin-bottom: 8px;
  }

  .btn {
    min-height: 48px;
    padding: 12px 20px;
    font-size: 14px;
    border-radius: 12px;
  }

  .glass-card {
    border-radius: 16px;
    padding: 16px;
  }
}

/* Sticky action bar for forms */
.form-actions-sticky {
  position: sticky;
  bottom: 0;
  padding: 16px;
  background: var(--bg-card);
  border-top: 1px solid var(--border);
  backdrop-filter: blur(12px);
  z-index: var(--z-sticky);
}

@media (min-width: 769px) {
  .form-actions-sticky {
    position: static;
    border-top: none;
    background: transparent;
    backdrop-filter: none;
    padding: 0;
  }
}
```

---

## 7. Implementation Priority

### Phase 1: Foundation (Hooks + UI Primitives)
1. `hooks/useModalState.ts`
2. `types/vcf.ts`
3. `components/ui/ModalShell.tsx`
4. `components/ui/FormSection.tsx`
5. `components/ui/ErrorAlert.tsx`
6. `components/ui/ReadOnlyResultCard.tsx`
7. `components/ui/ConfirmDialog.tsx`
8. Mobile-first CSS additions to `globals.css`

### Phase 2: VCF Domain Components
1. `components/vcf/ProgressSteps.tsx`
2. `components/vcf/SegelInput.tsx`
3. `components/vcf/SegelReference.tsx`
4. `components/vcf/PemeriksaanChecklist.tsx`
5. `components/vcf/TimbanganDisplay.tsx`
6. `components/vcf/TimbanganInput.tsx`
7. `components/vcf/RejectModal.tsx`

### Phase 3: Refactor Forms (one at a time)
1. `Bagian4Form.tsx` (simplest, least dependencies)
2. `Bagian2Form.tsx`
3. `Bagian3Form.tsx`
4. `[id]/page.tsx` (detail page — extract ProgressSteps)
5. `register/page.tsx`
6. `Bagian1EditModal.tsx`

### Phase 4: Polish
1. Smoke test all flows (loading + unloading × 4 stages)
2. Mobile responsiveness audit
3. Dark mode consistency check

---

## 8. Expected Results

| Metric | Before | After |
|---|---|---|
| Total form LOC | ~5,500 | ~2,500 |
| Duplicated code | ~1,030 LOC | ~0 |
| Shared components | 0 VCF-specific | 7 VCF + 5 UI |
| Min touch target | 32px | 48px |
| Mobile input font | 14px (zoom) | 16px (no zoom) |
| Modal z-index layers | 5 different | 1 normalized scale |
| useEffect for modals | 12 separate | 1 hook |

---

## 9. Definition of Done — Per Phase

### Phase 1: Foundation ✅ when:
- [ ] `useModalState` hook created and exported
- [ ] `types/vcf.ts` created with all shared interfaces (see §10)
- [ ] All 5 UI primitives (`ModalShell`, `FormSection`, `ErrorAlert`, `ReadOnlyResultCard`, `ConfirmDialog`) render correctly in isolation
- [ ] Mobile-first CSS additions merged into `globals.css`
- [ ] `npm run build` passes with zero errors
- [ ] Existing pages still render — **no regressions** in: registration, detail view, list view

### Phase 2: VCF Domain Components ✅ when:
- [ ] All 7 VCF components created and exported
- [ ] Each component accepts props matching the interfaces in §10
- [ ] `npm run build` passes with zero errors
- [ ] **No existing form is modified yet** — these are new files only

### Phase 3: Refactor Forms ✅ when:
- [ ] Each form file reduced by ≥40% LOC
- [ ] Zero duplicated modal useEffect hooks remain
- [ ] Zero duplicated segel input/reference code remains
- [ ] All 4 flows work end-to-end (manual browser test):
  - Loading Lokal: Register → WB Masuk → WB Keluar → MG Keluar → Selesai
  - Unloading Import: Register → WB Masuk → WB Keluar → MG Keluar → Selesai
  - Reject at WB Masuk → status reject confirmed
  - Admin edit on completed VCF → changes saved
- [ ] `npm run build` passes with zero errors

### Phase 4: Polish ✅ when:
- [ ] All forms pass mobile audit (Chrome DevTools, iPhone SE viewport 375px)
- [ ] Dark mode: no broken colors or invisible text
- [ ] No console errors/warnings in dev mode
- [ ] DESIGN.md updated with final component inventory

---

## 10. Shared TypeScript Interfaces (`types/vcf.ts`)

```typescript
// ── Core ──────────────────────────────────────────────────────

export interface TimbanganData {
  id: number;
  vcf_id: number;
  bruto_from?: number | null;
  tara_from?: number | null;
  netto_from?: number | null;
  bruto?: number | null;
  tara?: number | null;
  netto?: number | null;
}

export interface SegelData {
  jumlah_segel: number;
  kondisi?: string;
  keterangan?: string;
  nomor_segel: Array<{ nomor_segel: string } | string>;
  petugas?: { nama: string };
  waktu_input?: string;
  created_at?: string;
}

export interface PemeriksaanRecord {
  id: number;
  item_id: number;
  nilai: string;
  keterangan?: string;
  item: { nama_item: string; kode?: string };
  petugas?: { nama: string };
  waktu_input?: string;
  created_at?: string;
}

export interface BebanTambahanData {
  jenis_beban: string;
  ada: boolean;
}

export interface VcfKeluar {
  jam_keluar: string;
  emergency_respon_kontak: string;
  keterangan?: string;
  petugas?: { nama: string };
  waktu_input?: string;
  created_at?: string;
}

// ── Check Items (Master Data) ─────────────────────────────────

export interface CheckItem {
  id: number;
  nama_item: string;
  tipe_jawaban: string;
  pilihan_jawaban?: string;
  kode?: string;
  is_active?: boolean;
}

export interface MuatanItem {
  id: number;
  nama_item: string;
  jenis: "both" | "dibawa" | "diisi";
  urutan: number;
  is_active?: boolean;
}

// ── VCF Detail (API Response) ─────────────────────────────────

export interface VcfDetail {
  id: number;
  nomor_urut: string;
  tanggal: string;
  created_at?: string;
  status: string;
  tipe_kegiatan: string;
  produk?: string;
  asal_tujuan: string;
  no_polisi: string;
  jam_masuk: string;
  tipe_kendaraan?: string;
  tahun_kendaraan?: number;
  keterangan?: string;
  no_kontrak?: string;
  catatan?: string;

  // Relations
  transporter?: { id: number; nama_transporter: string };
  driver?: { id: number; nama_supir: string; no_sim: string; jenis_sim?: string; tgl_berlaku_sim?: string };
  driver_id?: number;
  jenis_kendaraan_id?: number;
  jenis_kendaraan?: { id: number; nama: string };
  created_by?: { id: number; nama: string };

  // Inspection data
  kelengkapan_supir?: Array<{ id: number; item_id: number; nilai: any; keterangan?: string; item: { nama_item: string } }>;
  pemeriksaan_masuk?: PemeriksaanRecord[];
  pemeriksaan_keluar?: PemeriksaanRecord[];

  // Weight & seal
  timbangan?: TimbanganData;
  segel_masuk?: SegelData;
  segel_keluar?: SegelData;
  beban_tambahan_masuk?: BebanTambahanData;
  beban_tambahan_keluar?: BebanTambahanData;

  // Muatan
  muatan_dibawa?: Array<{ item_muatan_id?: number; item_muatan?: { id: number; nama_item?: string }; nilai?: string }>;
  muatan_diisi?: Array<{ item_muatan_id?: number; item_muatan?: { id: number; nama_item?: string }; nilai?: string }>;

  // Stage data
  vcf_bagian2?: { keterangan?: string };
  vcf_bagian3?: { keterangan?: string };
  vcf_keluar?: VcfKeluar;

  // Petugas tracking
  nama_petugas_main_gate_masuk?: string;
  nama_petugas_wb_masuk?: string;
  nama_petugas_wb_keluar?: string;
  nama_petugas_main_gate_keluar?: string;
}

// ── Component Props ───────────────────────────────────────────

export type TipeKegiatan = "loading_lokal" | "loading_export" | "unloading_lokal" | "unloading_import" | "";
export type TipeKendaraan = "bak_terbuka" | "tangki" | "umum" | "box" | "container" | "";
export type RejectType = "warning" | "blacklist" | "reject_only";
```
