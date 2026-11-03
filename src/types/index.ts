/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type StatusAsesmen = 'Asesmen' | 'Disetujui' | 'Ditolak' | 'Menunggu Tindak Lanjut';

export type KategoriLembaga = 
  | 'Sekolah / Pesantren'
  | 'UMKM / Koperasi'
  | 'Kelompok Tani / Nelayan'
  | 'Komunitas Lingkungan'
  | 'Yayasan Sosial'
  | 'Lembaga Keagamaan'
  | 'Lainnya';

export type KategoriBantuan = 'Edukasi' | 'Pemberdayaan Masyarakat' | 'Lingkungan';

export type BentukBantuan = 'Barang' | 'Jasa';

export type JenisBarang = 
  | 'Elektronik'
  | 'Furniture'
  | 'Gadget'
  | 'Personal Computer / Laptop'
  | 'Inventaris'
  | 'Alat Percetakan'
  | 'Alat Pembelajaran'
  | 'Mesin'
  | 'Alat Kesehatan'
  | 'Kendaraan Operasional'
  | 'Peralatan Lainnya';

export type StatusTahap = 
  | 'Asesmen'
  | 'Usulan'
  | 'Pengadaan'
  | 'Pengiriman'
  | 'Selesai Dikirim'
  | 'Barang Diterima'
  | 'Penjadwalan Monitoring Bantuan';

export type StatusKondisiFisik = 
  | 'Baik & Lengkap'
  | 'Perlu Perbaikan Ringan'
  | 'Rusak Ringan'
  | 'Rusak Berat'
  | 'Kurang Jumlah'
  | 'Belum Diterima / Tahap Asesmen';

export interface ItemBarangVendor {
  id?: string;
  namaBarang: string;
  spesifikasi: string;
  qty: number;
  satuan?: string;
  hargaSatuan: number;
  subtotal?: number;
}

export interface SpesifikasiItemBarang {
  jenisBarang: JenisBarang;
  deskripsi: string;
  qty?: number;
  satuan?: string;
  hargaSatuan?: number;
}

export interface RekananVendorBantuan {
  id?: string;
  namaVendor: string;
  kategoriPengadaan: (JenisBarang | string)[]; // Kategori barang/jasa yang disediakan vendor ini
  kontak?: string;
  pic?: string;
  kategoriPajak?: 'PKP' | 'Non-PKP';
  nominalAlokasi?: number;
  items?: ItemBarangVendor[]; // Rincian item barang yang disediakan oleh vendor ini
  catatan?: string;
}

export interface ActivityLogItem {
  id: string;
  timestamp: string;
  aktor: string;
  aksi: string;
  keterangan: string;
}

export interface KondisiUnitSatuan {
  unitId: string;
  unitNumber: number; // 1..qty within this item
  globalUnitIndex: number; // 1..totalUnits across the recipient
  kodeQrUnit: string; // e.g. EPML-JTM-2025-004-U01
  namaUnit: string; // e.g. "Mesin Jahit Kulit Heavy Duty Industri — Unit #1"
  kondisi: StatusKondisiFisik;
  catatan: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface KondisiItemBarang {
  itemId: string;
  kodeQrUnit?: string;
  kodeQrRange?: string;
  unitIndex?: number;
  totalUnits?: number;
  namaBarang: string;
  jenisBarang?: string;
  spesifikasi?: string;
  qty: number;
  satuan: string;
  vendorPenyedia: string;
  kondisi: 'Baik' | 'Rusak' | StatusKondisiFisik;
  catatan?: string;
  fotoItemUrl?: string;
  updatedAt?: string;
  updatedBy?: string;
  rincianUnit?: KondisiUnitSatuan[];
}

export interface BantuanItem {
  id: string;
  namaPenerima: string;
  picAsesmen: string;
  statusAsesmen: StatusAsesmen;
  alamat: string;
  kabupatenKota: string;
  latitude: number;
  longitude: number;
  noHp: string;
  kategoriLembaga: KategoriLembaga;
  kategoriBantuan: KategoriBantuan;
  bentukBantuan: BentukBantuan;
  jenisBarang?: JenisBarang;
  daftarJenisBarang?: JenisBarang[];
  spesifikasiBarangList?: SpesifikasiItemBarang[];
  detailBantuan: string;
  qty: number;
  satuan: string;
  vendorPenyedia: string;
  daftarVendor?: RekananVendorBantuan[];
  daftarBarangVendor?: ItemBarangVendor[];
  hargaSatuan: number;
  nominalBantuan: number;
  statusTahap: StatusTahap;
  statusKondisiFisik: StatusKondisiFisik;
  kondisiPerItem?: KondisiItemBarang[];
  catatanKondisiFisik?: string;
  tanggalPenyaluran: string; // YYYY-MM-DD
  tanggalJadwalMonitoring?: string;
  triwulan: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  tahun: number;
  fotoPenerimaUrl?: string;
  fotoPenerimaList?: string[]; // Maksimal 7 foto lokasi / penerima
  buktiPenyaluranVendorUrl?: string;
  buktiPenyaluranVendorList?: string[]; // Maksimal 7 foto bukti penyaluran vendor
  buktiSerahTerimaBastUrl?: string;
  buktiSerahTerimaBastList?: string[]; // Maksimal 7 foto BAST serah terima
  fotoMonitoringUrl?: string;
  fotoMonitoringList?: string[]; // Maksimal 7 foto monitoring evaluasi lapangan
  driveYearFolderId?: string;
  driveYearFolderName?: string;
  driveRecipientFolderId?: string;
  driveRecipientFolderName?: string;
  driveRecipientFolderUrl?: string;
  driveUploadedPhotoMap?: Record<string, string>;
  driveLastSyncedAt?: string;
  qrCodeDataUrl?: string;
  riwayatAktivitas: ActivityLogItem[];
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'Super Admin' | 'Admin Operasional' | 'PIC Asesmen & Lapangan' | 'Auditor';

export type AdminMenuTab =
  | 'ANALYTICS'
  | 'MAP'
  | 'REKAP'
  | 'QR'
  | 'MONITORING'
  | 'VENDOR'
  | 'EDIT_DASHBOARD'
  | 'ARTIKEL'
  | 'USERS'
  | 'AUDIT'
  | 'CONFIG';

export interface UserAccount {
  id: string;
  username: string;
  password?: string;
  namaLengkap: string;
  email: string;
  role: UserRole;
  allowedMenus?: AdminMenuTab[];
  isEmailVerified: boolean;
  twoFactorEnabled: boolean;
  secret2FA?: string;
  lastLogin?: string;
  createdAt: string;
}

export interface SystemAuditLog {
  id: string;
  timestamp: string;
  username: string;
  role: string;
  ipAddress: string;
  aksi: string;
  target: string;
  detail: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
}

export interface AnomaliDistribusi {
  id: string;
  bantuanId: string;
  namaPenerima: string;
  kabupatenKota: string;
  tipeAnomali: 'Keterlambatan Tahap' | 'Kondisi Fisik Bermasalah' | 'Dokumentasi BAST Kosong' | 'Penyimpangan Alokasi';
  deskripsi: string;
  derajatUrgensi: 'Tinggi' | 'Sedang' | 'Rendah';
  tanggalTerdeteksi: string;
  statusPenyelesaian: 'Menunggu Tindak Lanjut' | 'Sedang Ditangani' | 'Selesai';
}

export interface HeroSlideItem {
  id: string;
  url: string;
  title?: string;
  caption?: string;
}

export interface LandingPageConfig {
  heroTitle: string;
  heroSubtitle: string;
  heroMediaMode: 'slideshow' | 'video';
  heroSlideshowImages: HeroSlideItem[];
  heroVideoUrl: string;
  heroVideoPoster?: string;
  heroVideoSourceType?: 'upload' | 'preset' | 'url';
  uploadedVideoFileName?: string;
  uploadedVideoSize?: number;
  uploadedVideoUpdatedAt?: string;
  heroVideoTahunAnggaran?: number;
  driveVideoFolderUrl?: string;
  driveVideoYearFolderId?: string;
  driveVideoYearFolderName?: string;
  driveVideoYearFolderUrl?: string;
  driveVideoFileId?: string;
  driveVideoWebViewLink?: string;
  driveBackupFolderUrl?: string;
  driveLastBackupFileId?: string;
  driveLastBackupWebViewLink?: string;
  driveLastBackupAt?: string;
  heroSlideIntervalMs?: number;
  navyOverlayOpacity?: number; // 0 - 100 percentage for navy background overlay
  totalPaguTahunan?: number; // Total pagu alokasi EPML tahunan yang dapat disesuaikan/diedit
  backgroundType: 'image' | 'video';
  backgroundUrl: string;
  contactEmail: string;
  contactPhone: string;
  officeAddress: string;
  googleMapsEmbedUrl: string;
  thirdPartyLogisticsEnabled: boolean;
  logisticsApiEndpoint: string;
  autoWhatsAppNotify: boolean;
}

export interface WilayahJatim {
  nama: string;
  tipe: 'Kabupaten' | 'Kota';
  lat: number;
  lng: number;
  alokasiPagu: number;
}

export type KategoriPajakVendor = 'PKP' | 'Non-PKP';

export interface RiwayatTransaksiVendor {
  id: string;
  tahun: number;
  noSpkKontrak: string;
  namaPaket: string;
  nominal: number;
  status: 'Selesai' | 'Berjalan' | 'Asesmen';
}

export interface VendorItem {
  id: string;
  namaVendor: string;
  kategoriVendor: KategoriPajakVendor; // 'PKP' | 'Non-PKP'
  barangJasa: string;
  lokasi: string;
  namaPic: string;
  noKontak: string;
  email: string;
  npwp?: string;
  riwayatTransaksi: RiwayatTransaksiVendor[];
  catatan?: string;
  createdAt: string;
  updatedAt: string;
}

export type KategoriArtikel = 'Edukasi' | 'Pemberdayaan Masyarakat' | 'Lingkungan' | 'Informasi Umum';

export interface ArtikelItem {
  id: string;
  judul: string;
  kategori: string;
  tanggal: string;
  kabupaten: string;
  ringkasan: string;
  isiLengkap?: string;
  gambar: string;
  penulis?: string;
  statusPublikasi?: 'Published' | 'Draft';
  tampilkanDiBeranda?: boolean;
  createdAt?: string;
  updatedAt?: string;
}


