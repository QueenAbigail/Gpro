# Panduan Sistem Desain Gpro (Pro Maxima Rajawali)

Dokumen ini adalah acuan utama (single source of truth) untuk token desain, identitas visual, dan pola komponen aplikasi mobile Gpro. Seluruh komponen baru atau modifikasi tampilan wajib mengacu pada token dan aturan di bawah ini.

---

## 1. Identitas & Karakter Desain (Soul & Vibe)

* **Vibe Utama:** Andal, Tegas, Presisi, dan Siap Operasional (*Field-ready & Crisp*).
* **Karakter Pengguna:** Petugas lapangan/keamanan (Security) dan manajemen operasional. Tampilan berfokus pada kejelasan informasi (*operational clarity*), kontras yang jelas di berbagai kondisi cahaya, dan target sentuh (*tap target*) yang lega agar responsif saat keadaan darurat.
* **Teknologi Styling:** NativeWind (Tailwind CSS) di atas komponen inti React Native (`View`, `Text`, `TouchableOpacity`, `TextInput`, dll).

---

## 2. Palet Warna Semantik (Semantic Color Tokens)

### A. Brand & Primary (Aksen Utama)
| Token Semantik | Nilai / Kelas Tailwind | Penggunaan |
| :--- | :--- | :--- |
| `primary-default` | `bg-blue-600` (`#2563eb`) | Tombol aksi utama, tombol simpan/masuk, header aksen |
| `primary-active` | `active:bg-blue-700` (`#1d4ed8`) | State saat tombol utama ditekan |
| `primary-disabled` | `bg-blue-400` (`#60a5fa`) | State tombol non-aktif / sedang loading |
| `primary-light` | `bg-blue-50` (`#eff6ff`) | Wadah ikon menu, latar badge info |
| `primary-accent` | `bg-sky-500` (`#0ea5e9`) | Indikator tab aktif, floating button scan QR, spinner |

### B. Backgrounds & Surfaces (Latar Belakang & Bidang)
| Token Semantik | Nilai / Kelas Tailwind | Penggunaan |
| :--- | :--- | :--- |
| `bg-app` | `bg-slate-50` (`#f8fafc`) / `bg-sky-50` (`#f0f9ff`) | Background kanvas seluruh layar |
| `surface-card` | `bg-white` (`#ffffff`) | Kartu konten, modul menu, modal dialog |
| `surface-subdued` | `bg-slate-50` / `bg-gray-50` (`#f9fafb`) | Latar input teks, preview lampiran file |
| `backdrop-modal` | `bg-black/60` s.d. `bg-black/80` | Latar gelap overlay dialog modal pop-up |

### C. Tipografi & Teks (Hierarchy Text)
| Token Semantik | Nilai / Kelas Tailwind | Penggunaan |
| :--- | :--- | :--- |
| `text-primary` | `text-slate-900` / `text-gray-950` | Heading utama, nama user, jam digital presensi |
| `text-secondary` | `text-slate-800` / `text-gray-800` | Subheading, judul kartu, label input form |
| `text-muted` | `text-slate-500` / `text-gray-500` | Deskripsi pelengkap, placeholder tanggal, subtitle |
| `text-faint` | `text-slate-400` / `text-gray-400` | Placeholder input teks, counter kuota foto |
| `text-inverse` | `text-white` | Teks di atas tombol gelap atau kartu aksen |

### D. Status & Kondisi Lapangan (Alerts & Badges)
| Status | Background Ringan | Border / Stroke | Teks / Aksen Ikon |
| :--- | :--- | :--- | :--- |
| **Aman / Sukses** | `bg-emerald-50` / `bg-green-50` | `border-emerald-100` / `border-green-500` | `text-emerald-600` / `#10b981` |
| **Peringatan / Pending** | `bg-amber-50` | `border-amber-100` | `text-amber-600` / `#f59e0b` |
| **Temuan / Bahaya** | `bg-red-50` | `border-red-100` / `border-red-500` | `text-red-600` / `#ef4444` |
| **SOS Emergency** | `bg-red-600` (Solid) | Tanpa border / shadow tebal | `text-white font-black` |

---

## 3. Tipografi & Skala Teks

* **Font Family:** Font native sistem bawaan perangkat (`system-ui` di iOS, `normal/Roboto` di Android).
* **Skala Hirarki:**
  * **Display / Big Metric:** `text-3xl font-extrabold` (30–32px) — Penunjuk waktu presensi masuk/pulang.
  * **Screen Header (H1):** `text-2xl font-extrabold` (24px) — Judul halaman utama.
  * **Section Header (H2):** `text-xl font-bold` (20px) — Subjudul modul/section.
  * **Card / Modal Title (H3):** `text-lg font-bold` (18px) — Judul kartu atau modal konfirmasi.
  * **Body / Form Input:** `text-base font-semibold` / `font-medium` (15–16px) — Label tombol dan isi form input.
  * **Secondary / Caption:** `text-sm font-medium` (14px) — Keterangan tambahan atau catatan list.
  * **Meta / Sub-caption:** `text-xs font-semibold` (12px) — Label kecil, tanggal badge, label menu grid.
  * **Micro-badge:** `text-[10px] font-bold` — Angka counter notifikasi unread.

---

## 4. Skala Spacing & Border Radius

### A. Spacing & Padding
* **Gutter Layar (Screen Margin):** `px-5` (20px) atau `px-6` (24px).
* **Jarak Atas (Safe Header):** `pt-12` s.d. `pt-16` (menyesuaikan notch dan status bar perangkat).
* **Jarak Bawah ScrollView:** `contentContainerStyle={{ paddingBottom: 100 }}` atau `120` (wajib disediakan agar konten terbawah tidak tertutup bar navigasi bawah).
* **Inner Card Padding:** `p-5` (20px) atau `p-6` (24px).
* **Gap Antar Bagian (Vertical Rhythm):** `mb-4` (16px), `mb-6` (24px), atau `mb-8` (32px).
* **Target Sentuh Minimum:** Tinggi minimum 44px untuk elemen interaktif.

### B. Border Radius (Corner Smoothing)
* `rounded-full` : Tombol lingkaran, foto profil, badge counter, pill navigasi.
* `rounded-3xl` (24px) : Kartu utama dashboard, kotak form login, kartu modal popup.
* `rounded-2xl` (16px) : Kartu riwayat, tombol aksi utama, toast notifikasi, wrapper baris input.
* `rounded-xl` (12px) : Input tanggal, pill status opsi (Aman vs Temuan), textarea.

---

## 5. Pola Komponen Utama (Core Component Patterns)

### A. Tombol Aksi (Buttons)
1. **Primary Button (Aksi Penuh):**
   ```tsx
   <TouchableOpacity className="w-full bg-blue-600 py-4 rounded-2xl items-center justify-center flex-row shadow-sm active:bg-blue-700">
     <Text className="text-white font-bold text-base">Masuk Sekarang</Text>
   </TouchableOpacity>
   ```
2. **Emergency Button (SOS Lapangan):**
   ```tsx
   <TouchableOpacity className="w-full bg-red-600 py-4 rounded-2xl flex-row items-center justify-center shadow-lg active:bg-red-700">
     <Ionicons name="warning" size={24} color="#ffffff" />
     <Text className="text-white font-black text-lg tracking-wider ml-2">SOS EMERGENCY</Text>
   </TouchableOpacity>
   ```
3. **Pill Toggle Opsi (Dual Switch):**
   * *Aktif:* `bg-green-50 border-green-500 text-green-600` atau `bg-red-50 border-red-500 text-red-600`
   * *Inaktif:* `bg-white border-slate-200 text-slate-500`

### B. Kartu Konten (Cards)
* **Standard White Card:**
  `bg-white rounded-3xl p-6 shadow-md border border-gray-100 mb-6`
* **Highlight / Informational Card:**
  `bg-blue-500 rounded-2xl p-5 shadow-sm` atau `bg-blue-50 border border-blue-100 rounded-xl p-4`

### C. Input Form
* **Single-line Field:**
  Wadah: `flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3`
  Input: `flex-1 text-gray-800 font-medium ml-2` dengan `placeholderTextColor="#9ca3af"`
* **Multi-line Textarea:**
  Wadah: `border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 h-32`
  Input: `textAlignVertical="top"`

### D. Modal & Dialog Pop-up
* Menggunakan backdrop `bg-black/60` (atau `bg-black/70`).
* Card modal di tengah: `bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl items-center`.
* Bubble icon lingkaran di atas judul modal: `w-16 h-16 rounded-full items-center justify-center mb-4` dengan latar warna semantik (merah untuk eror/peringatan, hijau untuk sukses, biru untuk pembaruan).

---

## 6. Aturan Khusus Mobile & UX Lapangan
1. **Always Native:** Selalu gunakan komponen React Native (`View`, `Text`, `Pressable`, `TouchableOpacity`). Dilarang memakai tag HTML atau CSS web murni.
2. **Safe Area & Bottom Tab Clearance:** Karena ada bar navigasi bawah yang melayang (*floating scan tab*), seluruh layar yang bisa di-scroll wajib menambahkan `paddingBottom: 100` atau lebih pada `contentContainerStyle`.
3. **Umpan Balik Tindakan Kritis:** Setiap aksi pengiriman data (absen presensi, SOS, submit laporan patroli) wajib menyertakan umpan balik visual yang jelas (sukses/gagal) dan status loading / dinonaktifkan (`disabled`) saat proses berlangsung.
