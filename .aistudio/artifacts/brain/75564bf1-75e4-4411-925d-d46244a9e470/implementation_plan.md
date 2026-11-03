# Sistem Filter Katalog QR, Auto-Generate QR Code & Cetak Lembar Stiker QR A4 (3x6)

Peningkatan modul **QR Code & Tracking Fisik** pada Portal Admin EPML Bank Indonesia Provinsi Jawa Timur untuk menyediakan filter berlapis (Tahun, Lokasi Wilayah, Kategori Lembaga), pembuatan kode QR otomatis secara instan untuk seluruh penerima bantuan (baik data awal maupun data baru), serta fitur cetak lembar stiker QR ukuran A4 Potrait (kapasitas 3 kolom × 6 baris = 18 stiker per halaman) dengan identitas visual resmi kombinasi warna Biru, Putih, dan Hijau bertajuk *"Bantuan EPML dari Bank Indonesia"*.

## User Review & Critical Decisions

> [!IMPORTANT]
> Keputusan desain dan teknis berikut telah dikonfirmasi berdasarkan preferensi Anda dan spesifikasi kebutuhan lapangan:

- **Confirmed Decision 1 (Batas & Garis Stiker A4)**: Lembar cetak stiker A4 menggunakan **border solid minimalis tanpa garis potong putus-putus**, menjaga tampilan stiker tetap bersih dan rapi saat dicetak pada kertas label maupun kertas A4 standar.
- **Confirmed Decision 2 (Format Muatan Data QR Code)**: Gambar QR Code mengkodekan **data teks ringkas terstruktur** yang memuat Kode/ID Bantuan, Nama Lembaga Penerima EPML, Tahun Penyaluran, Wilayah Kabupaten/Kota, Rincian Item & Jumlah, serta Vendor Pengadaan sehingga langsung terbaca saat dipindai oleh perangkat apapun.
- **Desain Visual Stiker QR**: Mengusung kombinasi warna **Biru Navy BI (`#002B66`), Putih bersih (`#FFFFFF`), dan Hijau Emerald (`#059669`)** dengan pita header di bagian atas bertuliskan **"Bantuan EPML dari Bank Indonesia"**, diikuti Kode/ID Bantuan, Nama Lembaga Penerima EPML, Tahun Penyaluran Bantuan, dan gambar QR Code beresolusi tajam.

---

## 1. Overview & Core Concept

- **What It Does**:
  1. **Filter & Pencarian Multi-Kriteria**: Menyediakan bilah filter terpadu pada menu *QR Code & Tracking Fisik* berdasarkan **Tahun Penyaluran**, **Lokasi (13 Wilayah Kerja Kab/Kota)**, **Kategori Lembaga**, serta **Pencarian Kata Kunci (ID/Nama Penerima)**.
  2. **Auto-Generate QR Code Otomatis**: Memastikan setiap entri penerima bantuan yang sudah terdaftar maupun yang baru diinput langsung memiliki gambar QR Code aktif (bukan ikon placeholder), lengkap dengan mekanisme sinkronisasi otomatis saat halaman dimuat dan saat form bantuan baru disimpan.
  3. **Cetak Kumpulan Stiker QR Ukuran A4 Potrait (3×6)**: Menyediakan tombol cetak/unduh PDF kumpulan stiker berdasarkan hasil filter atau pencarian aktif, disusun secara presisi dalam tata letak kertas **A4 Potrait (210mm × 297mm)** yang memuat **3 stiker secara horizontal × 6 stiker secara vertikal (18 stiker per lembar A4)**.
- **Target Audience / Persona**: Petugas Operasional, Tim PIC Asesmen Lapangan, dan Admin KPw Bank Indonesia Provinsi Jawa Timur yang bertugas mencetak stiker label bantuan fisik serta memverifikasi penyaluran di lokasi penerima.
- **Key Value**: Menghilangkan proses pembuatan QR manual satu per satu dan mempercepat pencetakan label stiker fisik bantuan EPML secara massal sesuai filter tahun, wilayah, atau kategori lembaga.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Menyaring Daftar QR Penerima**: Admin membuka menu *QR Code & Tracking Fisik*, lalu memilih filter *Tahun* (misal: 2025), *Lokasi Wilayah* (misal: Kabupaten Banyuwangi), atau *Kategori Lembaga* (misal: Kelompok Tani / Nelayan). Katalog kartu QR di bawahnya langsung diperbarui secara instan menampilkan jumlah label yang cocok.
  2. **Input Penerima Baru & Auto-Generate QR**: Saat Admin menginput penerima bantuan baru dan menekan simpan, sistem seketika menghasilkan gambar QR Code dengan muatan informasi ringkas penerima dan menampilkannya langsung di katalog QR maupun modal detail tanpa perlu langkah tambahan.
  3. **Pratinjau & Cetak Stiker QR A4 (3×6)**: Admin menekan tombol **"Cetak Kumpulan QR (A4)"** pada bilah kontrol. Modal pratinjau cetak A4 terbuka menampilkan tata letak 3 kolom × 6 baris per halaman A4 untuk seluruh item hasil filter, lengkap dengan tombol cetak/simpan PDF siap tempel.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Utilitarian-Institusional yang bersih dan presisi, memadukan tata letak grid kepadatan tinggi khas dashboard korporat dengan desain stiker beridentitas resmi Bank Indonesia.
  - *Color Palette & Mood*:
    - **Kanvas & Permukaan Dashboard**: Putih bersih (`#FFFFFF`) dan Slate terang (`#F8FAFC`) pada mode terang; Slate gelap (`#0F172A`) pada mode gelap.
    - **Identitas Stiker QR (Biru, Putih, Hijau)**:
      - Header Stiker: Gradasi/Solid Biru Navy Bank Indonesia (`#002B66` ke `#1E3A8A`) dengan teks putih tegas **"Bantuan EPML dari Bank Indonesia"**.
      - Badan Stiker: Latar Putih bersih (`#FFFFFF`) dengan bingkai border solid minimalis berwarna Biru/Hijau lembut, menampilkan QR Code di sisi tengah/kiri dan informasi terstruktur.
      - Aksen & Footer Tahun/Status: Hijau Emerald (`#059669` / `#ECFDF5`) untuk menonjolkan **Tahun Penyaluran Bantuan** dan badge verifikasi resmi EPML.
  - *Typography & Hierarchy*:
    - Menggunakan `Plus Jakarta Sans` untuk judul lembaga dan label header stiker agar tetap tajam pada ukuran cetak kecil, dipadukan dengan `JetBrains Mono` (`tabular-nums`) untuk Kode/ID Bantuan (`EPML-JTM-...`) dan angka tahun penyaluran.
  - *Component Styling & Layout*:
    - Setiap lembar cetak diformat khusus untuk ukuran kertas **A4 Potrait (`210mm × 297mm`)** menggunakan aturan `@media print` dan generator dokumen cetak presisi:
      - Margin halaman: `8mm`
      - Grid per halaman: `grid-template-columns: repeat(3, 1fr)` dan `grid-template-rows: repeat(6, 1fr)` (total 18 sel stiker per lembar A4, otomatis berpindah ke halaman A4 berikutnya jika jumlah data > 18).

- **Interactive Feedback & Motion**:
  - Indikator jumlah stiker aktif dan jumlah lembar halaman A4 yang akan dicetak (contoh: *"Menampilkan 12 Label QR (1 Lembar A4)"*).
  - Transisi halus saat menyaring katalog dan pratinjau langsung desain stiker di layar sebelum memicu dialog cetak/simpan PDF.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Auto-Hydration QR Code untuk Data Lama & Baru**
  - *Chosen Approach*: Menjalankan generator QR otomatis baik pada saat form penerima baru disimpan maupun saat daftar bantuan dimuat apabila ditemukan item yang belum memiliki `qrCodeDataUrl`.
  - *Why*: Menjamin seluruh 12+ data penerima awal maupun data baru yang diinput langsung menampilkan gambar QR Code nyata di menu katalog tanpa ada kartu yang kosong/placeholder.
  - *Alternatives Considered*: Menghasilkan QR hanya saat tombol detail diklik (ditolak karena membuat tampilan katalog awal terlihat belum memiliki QR).

- **Decision 2: Tata Letak Cetak A4 Potrait 3×6 Berbasis Print-Ready Sheet & Jendela Cetak PDF Presisi**
  - *Chosen Approach*: Menyediakan modal pratinjau lembar A4 (3 kolom × 6 baris) yang dilengkapi fitur cetak langsung ke PDF ukuran A4 Potrait dengan dimensi milimeter (`mm`) dan aturan CSS `@page { size: A4 portrait; margin: 8mm; }`.
  - *Why*: Menjamin ketajaman vektor teks dan resolusi QR Code saat dicetak ke printer stiker maupun disimpan sebagai PDF, serta memastikan tepat 18 stiker muat dalam 1 halaman A4 tanpa terpotong di tengah baris.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:
```
┌──────────────────────────────────────────────────────────────────────────┐
│                     Storage & QR Hydration Engine                        │
│  • Auto-generates QR Data URLs on Bantuan creation & initial list load   │
│  • Encodes compact text: ID Bantuan, Nama Lembaga, Tahun & Rincian Item  │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                Tab 4: QR Code & Tracking Fisik (Admin)                   │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ Filter & Action Bar                                                │  │
│  │ [Cari ID/Nama] [Filter Tahun] [Filter Lokasi] [Kategori Lembaga]   │  │
│  │                                    [Cetak Kumpulan QR A4 (3x6)]    │  │
│  └─────────────────────────────────┬──────────────────────────────────┘  │
│                                    │                                     │
│         ┌──────────────────────────┴──────────────────────────┐          │
│         ▼                                                     ▼          │
│  ┌───────────────────────────────────┐   ┌────────────────────────────┐  │
│  │ Live QR Sticker Catalog Grid      │   │ A4 Sticker Print Modal     │  │
│  │ • Displays live generated QR      │   │ • Paginates by 18 items    │  │
│  │ • Blue-White-Green sticker preview│   │ • 3 cols × 6 rows per A4   │  │
│  │ • Quick actions: Detail, Buka QR  │   │ • Solid minimal border     │  │
│  └───────────────────────────────────┘   └────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

- **Desain Komponen Stiker QR (Ukuran Per Sel dalam Grid 3×6 A4)**:
```
┌───────────────────────────────────────────┐
│      BANTUAN EPML DARI BANK INDONESIA     │  <-- Header Biru Navy (#002B66), Teks Putih
├───────────────────────────────────────────┤
│               ┌───────────┐               │
│               │  QR CODE  │               │  <-- Latar Putih (#FFFFFF), QR Navy Tajam
│               │  [IMAGE]  │               │
│               └───────────┘               │
│              EPML-JTM-2025-001            │  <-- Kode / ID Bantuan (Monospace Bold)
│    SMK Budi Utomo & Komunitas Vokasi      │  <-- Nama Lembaga Penerima EPML
├───────────────────────────────────────────┤
│  TAHUN PENYALURAN: 2025  •  KAB. PASURUAN │  <-- Pita Bawah Hijau Emerald (#059669)
└───────────────────────────────────────────┘
```

- **Data Model & State**:
  - State filter di menu QR: `qrSearchQuery` (teks), `qrFilterTahun` (`ALL` atau angka tahun), `qrFilterWilayah` (13 Kab/Kota kerja atau semua), dan `qrFilterKategoriLembaga` (`ALL` atau salah satu dari 7 kategori lembaga).
  - Muatan teks QR Code (`qrTextPayload`):
    `BANTUAN EPML BANK INDONESIA | ID: <id> | Penerima: <namaPenerima> | Tahun: <tahun> | Wilayah: <kabupatenKota> | Kategori: <kategoriLembaga> | Item: <detailBantuan> (<qty> <satuan>) | Vendor: <vendorPenyedia>`
- **Interactive Component & State Mapping**:
  - **Hydration Effect**: Saat aplikasi atau dasbor admin berjalan, sistem memeriksa apakah ada item `BantuanItem` yang belum memiliki `qrCodeDataUrl` atau perlu disegarkan; jika ada, sistem langsung men-generate QR Code secara otomatis dan menyimpannya ke penyimpanan lokal sehingga seluruh kartu QR selalu tampil lengkap.
  - **Filter Controls**: Mengubah dropdown Tahun, Lokasi, atau Kategori Lembaga akan menyaring daftar `filteredQrBantuanList` secara reaktif dan memperbarui jumlah stiker yang siap dicetak pada tombol cetak A4.
  - **A4 Batch Print Action**: Membagi `filteredQrBantuanList` ke dalam halaman-halaman berisi maksimal 18 item (`chunks of 18`), merender setiap halaman dalam rasio A4 Potrait dengan grid `3×6`, dan membuka jendela cetak PDF yang bersih tanpa elemen navigasi halaman web.
