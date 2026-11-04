/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BantuanItem, LandingPageConfig, SystemAuditLog, UserAccount, WilayahJatim, VendorItem, JadwalSurveiMonitoringItem, ArtikelItem } from '../types';

export const WILAYAH_JAWA_TIMUR: WilayahJatim[] = [
  { nama: 'Kota Surabaya', tipe: 'Kota', lat: -7.2575, lng: 112.7521, alokasiPagu: 2500000000 },
  { nama: 'Kabupaten Sidoarjo', tipe: 'Kabupaten', lat: -7.4530, lng: 112.7183, alokasiPagu: 1800000000 },
  { nama: 'Kabupaten Gresik', tipe: 'Kabupaten', lat: -7.1566, lng: 112.6555, alokasiPagu: 1600000000 },
  { nama: 'Kota Malang', tipe: 'Kota', lat: -7.9666, lng: 112.6326, alokasiPagu: 1500000000 },
  { nama: 'Kabupaten Malang', tipe: 'Kabupaten', lat: -8.1650, lng: 112.6000, alokasiPagu: 1750000000 },
  { nama: 'Kota Batu', tipe: 'Kota', lat: -7.8710, lng: 112.5270, alokasiPagu: 900000000 },
  { nama: 'Kabupaten Pasuruan', tipe: 'Kabupaten', lat: -7.6453, lng: 112.9075, alokasiPagu: 1400000000 },
  { nama: 'Kota Pasuruan', tipe: 'Kota', lat: -7.6469, lng: 112.9048, alokasiPagu: 800000000 },
  { nama: 'Kabupaten Probolinggo', tipe: 'Kabupaten', lat: -7.7543, lng: 113.2159, alokasiPagu: 1300000000 },
  { nama: 'Kota Probolinggo', tipe: 'Kota', lat: -7.7569, lng: 113.2115, alokasiPagu: 750000000 },
  { nama: 'Kabupaten Mojokerto', tipe: 'Kabupaten', lat: -7.5500, lng: 112.5000, alokasiPagu: 1200000000 },
  { nama: 'Kota Mojokerto', tipe: 'Kota', lat: -7.4722, lng: 112.4385, alokasiPagu: 700000000 },
  { nama: 'Kabupaten Jombang', tipe: 'Kabupaten', lat: -7.5460, lng: 112.2330, alokasiPagu: 1350000000 },
  { nama: 'Kabupaten Lamongan', tipe: 'Kabupaten', lat: -7.1186, lng: 112.4154, alokasiPagu: 1250000000 },
  { nama: 'Kabupaten Bojonegoro', tipe: 'Kabupaten', lat: -7.1500, lng: 111.8817, alokasiPagu: 1300000000 },
  { nama: 'Kabupaten Tuban', tipe: 'Kabupaten', lat: -6.8974, lng: 112.0649, alokasiPagu: 1200000000 },
  { nama: 'Kabupaten Madiun', tipe: 'Kabupaten', lat: -7.6167, lng: 111.5167, alokasiPagu: 1100000000 },
  { nama: 'Kota Madiun', tipe: 'Kota', lat: -7.6298, lng: 111.5239, alokasiPagu: 850000000 },
  { nama: 'Kabupaten Magetan', tipe: 'Kabupaten', lat: -7.6533, lng: 111.3283, alokasiPagu: 950000000 },
  { nama: 'Kabupaten Ngawi', tipe: 'Kabupaten', lat: -7.4042, lng: 111.4461, alokasiPagu: 1000000000 },
  { nama: 'Kabupaten Ponorogo', tipe: 'Kabupaten', lat: -7.8686, lng: 111.4623, alokasiPagu: 1150000000 },
  { nama: 'Kabupaten Pacitan', tipe: 'Kabupaten', lat: -8.1794, lng: 111.1072, alokasiPagu: 980000000 },
  { nama: 'Kabupaten Kediri', tipe: 'Kabupaten', lat: -7.8333, lng: 112.1667, alokasiPagu: 1400000000 },
  { nama: 'Kota Kediri', tipe: 'Kota', lat: -7.8166, lng: 112.0166, alokasiPagu: 950000000 },
  { nama: 'Kabupaten Nganjuk', tipe: 'Kabupaten', lat: -7.6000, lng: 111.9000, alokasiPagu: 1100000000 },
  { nama: 'Kabupaten Blitar', tipe: 'Kabupaten', lat: -8.1333, lng: 112.2500, alokasiPagu: 1150000000 },
  { nama: 'Kota Blitar', tipe: 'Kota', lat: -8.0983, lng: 112.1681, alokasiPagu: 750000000 },
  { nama: 'Kabupaten Tulungagung', tipe: 'Kabupaten', lat: -8.0667, lng: 111.9000, alokasiPagu: 1100000000 },
  { nama: 'Kabupaten Trenggalek', tipe: 'Kabupaten', lat: -8.0500, lng: 111.7167, alokasiPagu: 1000000000 },
  { nama: 'Kabupaten Lumajang', tipe: 'Kabupaten', lat: -8.1333, lng: 113.2167, alokasiPagu: 1150000000 },
  { nama: 'Kabupaten Jember', tipe: 'Kabupaten', lat: -8.1724, lng: 113.7007, alokasiPagu: 1650000000 },
  { nama: 'Kabupaten Bondowoso', tipe: 'Kabupaten', lat: -7.9135, lng: 113.8214, alokasiPagu: 1050000000 },
  { nama: 'Kabupaten Situbondo', tipe: 'Kabupaten', lat: -7.7064, lng: 114.0048, alokasiPagu: 1000000000 },
  { nama: 'Kabupaten Banyuwangi', tipe: 'Kabupaten', lat: -8.2192, lng: 114.3692, alokasiPagu: 1700000000 },
  { nama: 'Kabupaten Bangkalan', tipe: 'Kabupaten', lat: -7.0306, lng: 112.7508, alokasiPagu: 1250000000 },
  { nama: 'Kabupaten Sampang', tipe: 'Kabupaten', lat: -7.1897, lng: 113.2394, alokasiPagu: 1150000000 },
  { nama: 'Kabupaten Pamekasan', tipe: 'Kabupaten', lat: -7.1614, lng: 113.4828, alokasiPagu: 1100000000 },
  { nama: 'Kabupaten Sumenep', tipe: 'Kabupaten', lat: -7.0167, lng: 113.8667, alokasiPagu: 1300000000 }
];

export const WILAYAH_KERJA_KPW_JATIM = [
  'Kota Surabaya',
  'Kabupaten Sidoarjo',
  'Kabupaten Gresik',
  'Kota Mojokerto',
  'Kabupaten Mojokerto',
  'Kabupaten Jombang',
  'Kabupaten Lamongan',
  'Kabupaten Bojonegoro',
  'Kabupaten Tuban',
  'Kabupaten Bangkalan',
  'Kabupaten Sampang',
  'Kabupaten Pamekasan',
  'Kabupaten Sumenep'
] as const;

export type WilayahKerjaKPwJatim = typeof WILAYAH_KERJA_KPW_JATIM[number];

export const isWilayahKerjaKPwJatim = (nama: string): boolean => {
  const clean = nama.toLowerCase().replace('kabupaten ', '').replace('kab. ', '').replace('kota ', '').trim();
  return WILAYAH_KERJA_KPW_JATIM.some(w => {
    const wClean = w.toLowerCase().replace('kabupaten ', '').replace('kota ', '').trim();
    return clean === wClean || w.toLowerCase() === nama.toLowerCase();
  });
};

export const INITIAL_LANDING_CONFIG: LandingPageConfig = {
  heroTitle: 'Sistem Data Terpadu EPML Provinsi Jawa Timur',
  heroSubtitle: 'Platform terintegrasi pelacakan real-time, geo-tagging presisi, dan verifikasi QR Code untuk penyaluran bantuan Edukasi, Pemberdayaan Masyarakat, dan Lingkungan oleh Kantor Perwakilan Bank Indonesia Provinsi Jawa Timur.',
  heroMediaMode: 'slideshow',
  heroSlideIntervalMs: 5000,
  heroSlideshowImages: [
    {
      id: 'slide-1',
      url: '/src/assets/images/bi_jatim_hero_1793505598999.jpg',
      title: 'Kantor Perwakilan Bank Indonesia Provinsi Jawa Timur',
      caption: 'Pusat Koordinasi Kebijakan & Inovasi Penyaluran Bantuan EPML'
    },
    {
      id: 'slide-2',
      url: '/src/assets/images/bi_pahlawan_building_1793505599998.jpg',
      title: 'Gedung Bersejarah Bank Indonesia Surabaya',
      caption: 'Integritas & Akuntabilitas Tata Kelola Program Sosial Bank Indonesia'
    },
    {
      id: 'slide-3',
      url: '/src/assets/images/bantuan_epml_activity_1793505601348.jpg',
      title: 'Pemberdayaan Masyarakat & Komunitas Vokasi Digital',
      caption: 'Penyaluran Tepat Sasaran di 13 Wilayah Kerja Kab/Kota KPw BI Jawa Timur'
    },
    {
      id: 'slide-4',
      url: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=1920&q=80',
      title: 'Klaster Agribisnis & Ketahanan Pangan Berkelanjutan',
      caption: 'Hilirisasi Komoditas Unggulan Menuju Pasar Ekspor Global'
    }
  ],
  heroVideoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-city-traffic-and-buildings-42654-large.mp4',
  heroVideoPoster: '/src/assets/images/bi_jatim_hero_1793505598999.jpg',
  navyOverlayOpacity: 65,
  totalPaguTahunan: 0,
  backgroundType: 'image',
  backgroundUrl: '/src/assets/images/bi_jatim_hero_1793505598999.jpg',
  contactEmail: 'humas_jatim@bi.go.id',
  contactPhone: '(031) 3530351',
  officeAddress: 'Jl. Pahlawan No.105, Alun-alun Contong, Kec. Bubutan / Krembangan, Kota Surabaya, Jawa Timur 60174',
  googleMapsEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3957.9405629166827!2d112.73552087574312!3d-7.247596271190538!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2dd7f9389e74ce91%3A0xe54b9cb7b640db05!2sKantor%20Perwakilan%20Bank%20Indonesia%20Provinsi%20Jawa%20Timur!5e0!3m2!1sid!2sid!4v1700000000000!5m2!1sid!2sid',
  thirdPartyLogisticsEnabled: true,
  logisticsApiEndpoint: 'https://api.logistik-bi-jatim.internal/v1/sync',
  autoWhatsAppNotify: true,
  tampilkanKalenderDiDashboardAtas: false
};

export const INITIAL_USERS: UserAccount[] = [
  {
    id: 'USR-001',
    username: 'Admin',
    password: 'Admin',
    namaLengkap: 'Administrator Pusat EPML Jatim',
    email: 'admin.epml@gmail.com',
    role: 'Super Admin',
    allowedMenus: [
      'ANALYTICS',
      'KALENDER',
      'MAP',
      'REKAP',
      'QR',
      'MONITORING',
      'VENDOR',
      'EDIT_DASHBOARD',
      'ARTIKEL',
      'USERS',
      'AUDIT',
      'CONFIG'
    ],
    isEmailVerified: true,
    twoFactorEnabled: false,
    secret2FA: 'BIJATIM-EPML-2FA',
    lastLogin: '2026-10-31 08:30 WIB',
    createdAt: '2025-01-01'
  }
];

export const INITIAL_BANTUAN: BantuanItem[] = [];

export const INITIAL_AUDIT_LOGS: SystemAuditLog[] = [
  {
    id: 'AUD-998',
    timestamp: '2026-11-03 14:22:10 WIB',
    username: 'Administrator Pusat EPML Jatim (@Admin)',
    role: 'Super Admin',
    ipAddress: '103.247.19.45 (Surabaya, ID)',
    aksi: 'UPDATE_PAGU_TAHUNAN',
    target: 'Total Pagu Alokasi EPML Jatim',
    detail: 'Penyesuaian batas pagu tahunan EPML menjadi Rp 46.130.000.000 untuk 13 Wilayah Kerja KPw BI Jatim.',
    status: 'SUCCESS'
  },
  {
    id: 'AUD-997',
    timestamp: '2026-11-03 13:05:48 WIB',
    username: 'Dimas Wicaksono, S.E. (@pic_surabaya)',
    role: 'PIC Asesmen & Lapangan',
    ipAddress: '180.252.17.88 (Sidoarjo, ID)',
    aksi: 'SCAN_QR_VERIFIKASI',
    target: 'EPML-JTM-2025-004-U02',
    detail: 'Pindai QR Unit #2 (Alat Embossing Logo Otomatis) pada Sentra UMKM Kulit Tanggulangin — Kondisi diubah menjadi: Baik & Lengkap.',
    status: 'SUCCESS'
  },
  {
    id: 'AUD-996',
    timestamp: '2026-11-02 16:40:19 WIB',
    username: 'Administrator Pusat EPML Jatim (@Admin)',
    role: 'Super Admin',
    ipAddress: '103.247.19.45 (Surabaya, ID)',
    aksi: 'UPDATE_USER_ACCESS',
    target: 'pic_malang (Bagus Prasetyo)',
    detail: 'Memperbarui hak akses modul navigasi akun Bagus Prasetyo: Menambahkan akses menu Hasil Tracking & Monitoring Bantuan.',
    status: 'WARNING'
  },
  {
    id: 'AUD-995',
    timestamp: '2026-11-01 11:15:33 WIB',
    username: 'Administrator Pusat EPML Jatim (@Admin)',
    role: 'Super Admin',
    ipAddress: '103.247.19.45 (Surabaya, ID)',
    aksi: 'UPDATE_VENDOR',
    target: 'CV Karya Teknik Baja Mandiri (VND-008)',
    detail: 'Memperbarui kontrak SPK pengadaan Mesin Press Hidrolik Paving Plastik (Rp 120.000.000) untuk Bank Sampah Gresik.',
    status: 'SUCCESS'
  },
  {
    id: 'AUD-994',
    timestamp: '2026-10-31 15:10:05 WIB',
    username: 'unknown_operator',
    role: 'Unknown',
    ipAddress: '114.125.92.104 (Malang, ID)',
    aksi: 'LOGIN_FAILED',
    target: 'Portal Verifikasi Scan QR',
    detail: 'Percobaan otentikasi ditolak: Kredensial password tidak sesuai pada halaman akses Scan QR Bantuan.',
    status: 'FAILED'
  },
  {
    id: 'AUD-993',
    timestamp: '2026-10-30 16:45:00 WIB',
    username: 'Dimas Wicaksono, S.E. (@pic_surabaya)',
    role: 'PIC Asesmen & Lapangan',
    ipAddress: '180.252.17.88 (Gresik, ID)',
    aksi: 'UPDATE_KONDISI_FISIK',
    target: 'EPML-JTM-2025-008',
    detail: 'Mencatat kondisi fisik: Rusak Ringan pada panel kontrol Mesin Pencacah Plastik di Komunitas Bank Sampah Gresik.',
    status: 'WARNING'
  },
  {
    id: 'AUD-992',
    timestamp: '2026-10-30 09:12:44 WIB',
    username: 'Administrator Pusat EPML Jatim (@Admin)',
    role: 'Super Admin',
    ipAddress: '103.247.19.45 (Surabaya, ID)',
    aksi: 'DATA_VERIFY_QR',
    target: 'EPML-JTM-2025-001',
    detail: 'Verifikasi pemindaian QR Code 25 Unit PC All-in-One penerima SMK Budi Utomo Kabupaten Pasuruan.',
    status: 'SUCCESS'
  },
  {
    id: 'AUD-991',
    timestamp: '2026-10-29 11:20:15 WIB',
    username: 'Dra. Endang Sri Astuti, Ak. (@auditor_jatim)',
    role: 'Auditor',
    ipAddress: '114.122.40.12 (Surabaya, ID)',
    aksi: 'EXPORT_REPORT',
    target: 'Laporan Rekapitulasi Tahunan 2025',
    detail: 'Ekspor data rekapitulasi bantuan format Excel & PDF untuk pemeriksaan kepatuhan audit internal BI.',
    status: 'SUCCESS'
  }
];

export const EPML_ARTIKEL: ArtikelItem[] = [];

export const INITIAL_VENDORS: VendorItem[] = [];

export const INITIAL_JADWAL_KALENDER: JadwalSurveiMonitoringItem[] = [];



