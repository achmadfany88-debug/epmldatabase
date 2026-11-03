/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import { WILAYAH_JAWA_TIMUR } from '../../data/initialData';
import { StorageService } from '../../services/storageService';
import {
  BantuanItem,
  BentukBantuan,
  JenisBarang,
  KategoriBantuan,
  KategoriLembaga,
  StatusAsesmen,
  StatusKondisiFisik,
  StatusTahap
} from '../../types';
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  RefreshCw,
  Check,
  Filter,
  Trash2,
  HelpCircle
} from 'lucide-react';

interface BulkImportBantuanModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingBantuanList: BantuanItem[];
  actorName: string;
  onImportComplete: (summaryMessage: string) => void;
}

export const VALID_STATUS_ASESMEN: StatusAsesmen[] = [
  'Asesmen',
  'Disetujui',
  'Ditolak',
  'Menunggu Tindak Lanjut'
];

export const VALID_STATUS_TAHAP: StatusTahap[] = [
  'Asesmen',
  'Usulan',
  'Pengadaan',
  'Pengiriman',
  'Selesai Dikirim',
  'Barang Diterima',
  'Penjadwalan Monitoring Bantuan'
];

export const VALID_STATUS_KONDISI_FISIK: StatusKondisiFisik[] = [
  'Baik & Lengkap',
  'Perlu Perbaikan Ringan',
  'Rusak Ringan',
  'Rusak Berat',
  'Kurang Jumlah',
  'Belum Diterima / Tahap Asesmen'
];

export const VALID_KATEGORI_LEMBAGA: KategoriLembaga[] = [
  'Sekolah / Pesantren',
  'UMKM / Koperasi',
  'Kelompok Tani / Nelayan',
  'Komunitas Lingkungan',
  'Yayasan Sosial',
  'Lembaga Keagamaan',
  'Lainnya'
];

export const VALID_KATEGORI_BANTUAN: KategoriBantuan[] = [
  'Edukasi',
  'Pemberdayaan Masyarakat',
  'Lingkungan'
];

export const VALID_BENTUK_BANTUAN: BentukBantuan[] = ['Barang', 'Jasa'];

export const VALID_TRIWULAN: ('Q1' | 'Q2' | 'Q3' | 'Q4')[] = ['Q1', 'Q2', 'Q3', 'Q4'];

export const VALID_JENIS_BARANG: JenisBarang[] = [
  'Elektronik',
  'Furniture',
  'Gadget',
  'Personal Computer / Laptop',
  'Inventaris',
  'Alat Percetakan',
  'Alat Pembelajaran',
  'Mesin',
  'Alat Kesehatan',
  'Kendaraan Operasional',
  'Peralatan Lainnya'
];

interface ParsedRowValidation {
  rowNumber: number;
  rawRecord: Record<string, string>;
  item: BantuanItem;
  isValid: boolean;
  isDuplicateInDb: boolean;
  isDuplicateInFile: boolean;
  errors: string[];
  warnings: string[];
}

// Helper to parse a single CSV line respecting double quotes
function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function detectDelimiter(headerLine: string): string {
  const semicolonCount = (headerLine.match(/;/g) || []).length;
  const commaCount = (headerLine.match(/,/g) || []).length;
  return semicolonCount >= commaCount && semicolonCount > 0 ? ';' : ',';
}

function normalizeHeaderKey(header: string): string {
  return header
    .toLowerCase()
    .replace(/[\uFEFF"]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function matchEnumCaseInsensitive<T extends string>(input: string, validList: readonly T[]): T | null {
  const clean = input.trim().toLowerCase();
  if (!clean) return null;
  const exact = validList.find(v => v.toLowerCase() === clean);
  if (exact) return exact;

  // Allow common shorthand codes for convenience
  const normalizedInput = clean.replace(/\s+/g, ' ');
  for (const valid of validList) {
    if (valid.toLowerCase().replace(/\s+/g, ' ') === normalizedInput) {
      return valid;
    }
  }
  return null;
}

function resolveWilayahJatim(rawKabupaten: string): { matchedName: string; lat: number; lng: number } | null {
  const clean = rawKabupaten
    .trim()
    .toLowerCase()
    .replace(/^kab\.\s*/i, 'kabupaten ')
    .replace(/^kota\s+/i, 'kota ');

  if (!clean) return null;

  for (const w of WILAYAH_JAWA_TIMUR) {
    const wLower = w.nama.toLowerCase();
    const wShort = wLower.replace(/^kabupaten\s+/, '').replace(/^kota\s+/, '');
    if (wLower === clean || wShort === clean.replace(/^kabupaten\s+/, '').replace(/^kota\s+/, '')) {
      return { matchedName: w.nama, lat: w.lat, lng: w.lng };
    }
  }
  return null;
}

function parseNumericValue(raw: string): number {
  if (!raw) return NaN;
  // Strip currency symbols, dots used as thousand separators if appropriate, spaces
  const cleaned = raw
    .replace(/rp/gi, '')
    .replace(/\s+/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(/,/g, '.');
  return Number(cleaned);
}

export const BulkImportBantuanModal: React.FC<BulkImportBantuanModalProps> = ({
  isOpen,
  onClose,
  existingBantuanList,
  actorName,
  onImportComplete
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedRowValidation[]>([]);
  const [duplicateMode, setDuplicateMode] = useState<'upsert' | 'skip'>('upsert');
  const [previewFilter, setPreviewFilter] = useState<'ALL' | 'VALID' | 'INVALID'>('ALL');
  const [showSchemaGuide, setShowSchemaGuide] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string>('');

  const existingIdsSet = useMemo(() => {
    return new Set(existingBantuanList.map(b => b.id.toLowerCase()));
  }, [existingBantuanList]);

  const validateAndBuildRows = (csvContent: string, sourceFileName: string) => {
    setParseError('');
    const lines = csvContent
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .filter(l => l.trim().length > 0 && !l.trim().startsWith('#'));

    if (lines.length < 2) {
      setParseError('File CSV kosong atau tidak memiliki baris data di bawah baris judul (header).');
      setParsedRows([]);
      return;
    }

    const delimiter = detectDelimiter(lines[0]);
    const rawHeaders = parseCsvLine(lines[0], delimiter);
    const normalizedHeaders = rawHeaders.map(normalizeHeaderKey);

    const seenIdsInFile = new Set<string>();
    const results: ParsedRowValidation[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCsvLine(lines[i], delimiter);
      if (values.every(v => !v.trim())) continue;

      const rowMap: Record<string, string> = {};
      normalizedHeaders.forEach((hKey, colIdx) => {
        rowMap[hKey] = (values[colIdx] ?? '').replace(/^"|"$/g, '').trim();
      });

      const getField = (...keys: string[]): string => {
        for (const k of keys) {
          const norm = normalizeHeaderKey(k);
          if (rowMap[norm] !== undefined && rowMap[norm] !== '') {
            return rowMap[norm];
          }
        }
        return '';
      };

      const errors: string[] = [];
      const warnings: string[] = [];

      // 1. ID Bantuan (Optional in CSV -> auto-generated if empty, or validated if provided)
      const rawId = getField('idbantuan', 'id', 'kodebantuan', 'kode');
      const currentYear = new Date().getFullYear();
      const generatedId = `EPML-JTM-${currentYear}-${String(existingBantuanList.length + i).padStart(3, '0')}`;
      const id = rawId || generatedId;
      if (!rawId) {
        warnings.push(`ID Bantuan kosong, otomatis dibuat: ${generatedId}`);
      }

      const idLower = id.toLowerCase();
      const isDuplicateInFile = seenIdsInFile.has(idLower);
      if (isDuplicateInFile) {
        errors.push(`Duplikasi ID "${id}" ditemukan lebih dari satu kali di dalam file CSV yang sama.`);
      }
      seenIdsInFile.add(idLower);

      const isDuplicateInDb = existingIdsSet.has(idLower);
      if (isDuplicateInDb) {
        warnings.push(`ID "${id}" sudah terdaftar di sistem (${duplicateMode === 'upsert' ? 'akan diperbarui' : 'akan dilewati'}).`);
      }

      // 2. Mandatory Field: Nama Penerima
      const namaPenerima = getField('namapenerima', 'penerima', 'namalembaga', 'lembagapenerima');
      if (!namaPenerima) {
        errors.push('Kolom wajib "Nama Penerima" tidak boleh kosong.');
      }

      // 3. Mandatory Field: Kabupaten / Kota
      const rawKabupaten = getField('kabupatenkota', 'kabupaten', 'kota', 'wilayah', 'lokasi');
      const resolvedWilayah = resolveWilayahJatim(rawKabupaten);
      if (!rawKabupaten) {
        errors.push('Kolom wajib "Kabupaten / Kota" tidak boleh kosong.');
      } else if (!resolvedWilayah) {
        errors.push(`Wilayah "${rawKabupaten}" tidak terdaftar dalam 38 Kabupaten/Kota Jawa Timur.`);
      }

      // 4. Mandatory Field & Status Code: Status Asesmen
      const rawStatusAsesmen = getField('statusasesmen', 'kodeasesmen', 'asesmen');
      const matchedStatusAsesmen = matchEnumCaseInsensitive(rawStatusAsesmen, VALID_STATUS_ASESMEN);
      if (!rawStatusAsesmen) {
        errors.push('Kolom wajib "Status Asesmen" tidak boleh kosong.');
      } else if (!matchedStatusAsesmen) {
        errors.push(
          `Kode Status Asesmen "${rawStatusAsesmen}" tidak valid. Gunakan: ${VALID_STATUS_ASESMEN.join(', ')}.`
        );
      }

      // 5. Mandatory Field & Status Code: Status Penyaluran (Tahap)
      const rawStatusTahap = getField('statustahap', 'statuspenyalurantahap', 'statuspenyaluran', 'tahappenyaluran', 'tahap');
      const matchedStatusTahap = matchEnumCaseInsensitive(rawStatusTahap, VALID_STATUS_TAHAP);
      if (!rawStatusTahap) {
        errors.push('Kolom wajib "Status Penyaluran (Tahap)" tidak boleh kosong.');
      } else if (!matchedStatusTahap) {
        errors.push(
          `Kode Status Tahap "${rawStatusTahap}" tidak valid. Gunakan: ${VALID_STATUS_TAHAP.join(', ')}.`
        );
      }

      // 6. Mandatory Field & Status Code: Status Kondisi Fisik
      const rawKondisiFisik = getField('statuskondisifisik', 'kondisifisik', 'kondisi');
      const matchedKondisiFisik = matchEnumCaseInsensitive(rawKondisiFisik, VALID_STATUS_KONDISI_FISIK);
      if (!rawKondisiFisik) {
        errors.push('Kolom wajib "Status Kondisi Fisik" tidak boleh kosong.');
      } else if (!matchedKondisiFisik) {
        errors.push(
          `Kode Status Kondisi Fisik "${rawKondisiFisik}" tidak valid. Gunakan: ${VALID_STATUS_KONDISI_FISIK.join(', ')}.`
        );
      }

      // 7. Mandatory Field: Kategori Lembaga
      const rawKategoriLembaga = getField('kategorilembaga', 'jenislembaga');
      const matchedKategoriLembaga = matchEnumCaseInsensitive(rawKategoriLembaga, VALID_KATEGORI_LEMBAGA);
      if (!rawKategoriLembaga) {
        errors.push('Kolom wajib "Kategori Lembaga" tidak boleh kosong.');
      } else if (!matchedKategoriLembaga) {
        errors.push(
          `Kategori Lembaga "${rawKategoriLembaga}" tidak valid. Gunakan: ${VALID_KATEGORI_LEMBAGA.join(', ')}.`
        );
      }

      // 8. Mandatory Field: Kategori Bantuan (Pilar EPML)
      const rawKategoriBantuan = getField('kategoribantuanepml', 'kategoribantuan', 'pilarepml', 'pilar');
      const matchedKategoriBantuan = matchEnumCaseInsensitive(rawKategoriBantuan, VALID_KATEGORI_BANTUAN);
      if (!rawKategoriBantuan) {
        errors.push('Kolom wajib "Kategori Bantuan (EPML)" tidak boleh kosong.');
      } else if (!matchedKategoriBantuan) {
        errors.push(
          `Kategori Bantuan "${rawKategoriBantuan}" tidak valid. Gunakan: ${VALID_KATEGORI_BANTUAN.join(', ')}.`
        );
      }

      // 9. Mandatory Field: Bentuk Bantuan
      const rawBentukBantuan = getField('bentukbantuan', 'bentuk') || 'Barang';
      const matchedBentukBantuan = matchEnumCaseInsensitive(rawBentukBantuan, VALID_BENTUK_BANTUAN);
      if (!matchedBentukBantuan) {
        errors.push(`Bentuk Bantuan "${rawBentukBantuan}" tidak valid. Gunakan: Barang atau Jasa.`);
      }

      // 10. Mandatory Field: Detail Bantuan / Rincian Barang atau Jasa
      const detailBantuan = getField(
        'detailbantuan',
        'rincianbantuan',
        'jenisbarangdeskripsijasa',
        'deskripsi',
        'namabarang'
      );
      if (!detailBantuan) {
        errors.push('Kolom wajib "Detail Bantuan / Rincian Barang" tidak boleh kosong.');
      }

      // 11. Mandatory Numeric Fields: QTY & Nominal / Harga Satuan
      const rawQty = getField('qty', 'jumlah', 'kuantitas');
      const qtyNum = parseNumericValue(rawQty);
      if (!rawQty || isNaN(qtyNum) || qtyNum <= 0) {
        errors.push(`Kolom wajib "QTY" harus berupa angka lebih dari 0 (ditemukan: "${rawQty || '-'}").`);
      }

      const satuan = getField('satuan', 'unit') || 'Unit';
      const rawHargaSatuan = getField('hargasatuanrp', 'hargasatuan', 'harga');
      const rawNominalTotal = getField('nominaltotalbantuanrp', 'nominalbantuan', 'nominaltotal', 'nominal', 'totalbantuan');

      let hargaSatuan = parseNumericValue(rawHargaSatuan);
      let nominalBantuan = parseNumericValue(rawNominalTotal);

      if ((isNaN(nominalBantuan) || nominalBantuan <= 0) && !isNaN(hargaSatuan) && hargaSatuan > 0 && !isNaN(qtyNum) && qtyNum > 0) {
        nominalBantuan = hargaSatuan * qtyNum;
      } else if ((isNaN(hargaSatuan) || hargaSatuan <= 0) && !isNaN(nominalBantuan) && nominalBantuan > 0 && !isNaN(qtyNum) && qtyNum > 0) {
        hargaSatuan = Math.round(nominalBantuan / qtyNum);
      }

      if (isNaN(nominalBantuan) || nominalBantuan <= 0) {
        errors.push('Kolom wajib "Nominal Total Bantuan (Rp)" atau "Harga Satuan (Rp)" harus berupa angka positif.');
      }

      // 12. Triwulan & Tahun Validation
      const rawTriwulan = (getField('triwulan', 'kuartal') || 'Q2').toUpperCase();
      const matchedTriwulan = matchEnumCaseInsensitive(rawTriwulan, VALID_TRIWULAN);
      if (!matchedTriwulan) {
        errors.push(`Kode Triwulan "${rawTriwulan}" tidak valid. Gunakan: Q1, Q2, Q3, atau Q4.`);
      }

      const rawTahun = getField('tahun', 'tahunpenyaluran') || String(currentYear);
      const tahunNum = Number(rawTahun);
      if (isNaN(tahunNum) || tahunNum < 2015 || tahunNum > 2035) {
        errors.push(`Kolom "Tahun" (${rawTahun}) tidak valid (gunakan tahun 4 digit antara 2015 - 2035).`);
      }

      // Optional / Additional fields with sensible defaults
      const picAsesmen = getField('picasesmenbantuan', 'picasesmen', 'pic') || actorName || 'Tim PIC EPML Jatim';
      const alamat = getField('alamat', 'alamatlengkap') || (resolvedWilayah ? `Wilayah ${resolvedWilayah.matchedName}, Jawa Timur` : '-');
      const noHp = getField('nohp', 'telepon', 'kontak') || '081200000000';
      const vendorPenyedia = getField('vendorpenyedia', 'vendor', 'namavendor') || 'PT Mitra Pengadaan Jatim';
      const tanggalPenyaluran = getField('tanggalpenyaluran', 'tanggal') || new Date().toISOString().slice(0, 10);
      const tanggalJadwalMonitoring = getField('tanggaljadwalmonitoring', 'jadwalmonitoring') || '';

      const rawLat = getField('latitude', 'lat');
      const rawLng = getField('longitude', 'lng', 'long');
      const parsedLat = rawLat ? Number(rawLat) : NaN;
      const parsedLng = rawLng ? Number(rawLng) : NaN;

      const latitude = !isNaN(parsedLat) && parsedLat !== 0 ? parsedLat : (resolvedWilayah?.lat ?? -7.2575);
      const longitude = !isNaN(parsedLng) && parsedLng !== 0 ? parsedLng : (resolvedWilayah?.lng ?? 112.7521);

      const rawJenisBarang = getField('jenisbarang', 'kategoribarang');
      const matchedJenisBarang = matchEnumCaseInsensitive(rawJenisBarang, VALID_JENIS_BARANG) || 'Peralatan Lainnya';

      const nowIso = new Date().toISOString();

      const item: BantuanItem = {
        id,
        namaPenerima: namaPenerima || 'Tanpa Nama',
        picAsesmen,
        statusAsesmen: matchedStatusAsesmen || 'Asesmen',
        alamat,
        kabupatenKota: resolvedWilayah?.matchedName || rawKabupaten || 'Kota Surabaya',
        latitude,
        longitude,
        noHp,
        kategoriLembaga: matchedKategoriLembaga || 'Lainnya',
        kategoriBantuan: matchedKategoriBantuan || 'Pemberdayaan Masyarakat',
        bentukBantuan: matchedBentukBantuan || 'Barang',
        jenisBarang: (matchedBentukBantuan || 'Barang') === 'Barang' ? matchedJenisBarang : undefined,
        daftarJenisBarang: (matchedBentukBantuan || 'Barang') === 'Barang' ? [matchedJenisBarang] : undefined,
        detailBantuan: detailBantuan || '-',
        qty: !isNaN(qtyNum) && qtyNum > 0 ? qtyNum : 1,
        satuan,
        vendorPenyedia,
        hargaSatuan: !isNaN(hargaSatuan) && hargaSatuan > 0 ? hargaSatuan : 0,
        nominalBantuan: !isNaN(nominalBantuan) && nominalBantuan > 0 ? nominalBantuan : 0,
        statusTahap: matchedStatusTahap || 'Asesmen',
        statusKondisiFisik: matchedKondisiFisik || 'Belum Diterima / Tahap Asesmen',
        tanggalPenyaluran,
        tanggalJadwalMonitoring: tanggalJadwalMonitoring !== '-' ? tanggalJadwalMonitoring : undefined,
        triwulan: matchedTriwulan || 'Q2',
        tahun: !isNaN(tahunNum) ? tahunNum : currentYear,
        riwayatAktivitas: [],
        createdAt: nowIso,
        updatedAt: nowIso
      };

      results.push({
        rowNumber: i + 1,
        rawRecord: rowMap,
        item,
        isValid: errors.length === 0,
        isDuplicateInDb,
        isDuplicateInFile,
        errors,
        warnings
      });
    }

    setFileName(sourceFileName);
    setParsedRows(results);
    setPreviewFilter('ALL');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        validateAndBuildRows(reader.result, file.name);
      }
    };
    reader.onerror = () => {
      setParseError('Gagal membaca file CSV. Pastikan file berformat teks CSV UTF-8.');
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  const handleDownloadTemplate = () => {
    const headers = [
      'ID Bantuan',
      'Nama Penerima',
      'PIC Asesmen Bantuan',
      'Status Asesmen',
      'Alamat',
      'Kabupaten / Kota',
      'No. HP',
      'Kategori Lembaga',
      'Kategori Bantuan (EPML)',
      'Bentuk Bantuan',
      'Jenis Barang',
      'Detail Bantuan',
      'QTY',
      'Satuan',
      'Harga Satuan (Rp)',
      'Nominal Total Bantuan (Rp)',
      'Status Penyaluran (Tahap)',
      'Status Kondisi Fisik',
      'Tanggal Penyaluran',
      'Vendor Penyedia',
      'Triwulan',
      'Tahun'
    ];

    const sampleRows = [
      [
        'EPML-JTM-2025-801',
        'Koperasi Tani Makmur Sejahtera',
        'Dimas Wicaksono, S.E.',
        'Disetujui',
        'Jl. Raya Mojoagung No. 45, Jombang',
        'Kabupaten Jombang',
        '081234567801',
        'Kelompok Tani / Nelayan',
        'Pemberdayaan Masyarakat',
        'Barang',
        'Mesin',
        'Mesin Pengering Padi Kapasitas 2 Ton & Alat Ukur Kadar Air',
        '2',
        'Paket',
        '42500000',
        '85000000',
        'Barang Diterima',
        'Baik & Lengkap',
        '2025-05-12',
        'CV Agro Teknik Mandiri',
        'Q2',
        '2025'
      ],
      [
        'EPML-JTM-2025-802',
        'Ponpes Al-Hikmah Literasi Digital',
        'Dimas Wicaksono, S.E.',
        'Disetujui',
        'Jl. Ahmad Yani No. 88, Sidoarjo',
        'Kabupaten Sidoarjo',
        '081355667788',
        'Sekolah / Pesantren',
        'Edukasi',
        'Barang',
        'Personal Computer / Laptop',
        'Perangkat Komputer All-in-One Core i7 untuk Laboratorium Vokasi Santri',
        '10',
        'Unit',
        '11500000',
        '115000000',
        'Pengiriman',
        'Belum Diterima / Tahap Asesmen',
        '2025-06-01',
        'PT Nusantara Teknologi Edukasi',
        'Q2',
        '2025'
      ],
      [
        'EPML-JTM-2025-803',
        'Komunitas Bank Sampah Hijau Lestari',
        'Dra. Endang Sri Astuti, Ak.',
        'Asesmen',
        'Jl. Pahlawan No. 19, Gresik',
        'Kabupaten Gresik',
        '085711223344',
        'Komunitas Lingkungan',
        'Lingkungan',
        'Barang',
        'Mesin',
        'Mesin Pencacah Plastik Organik & Timbangan Digital',
        '3',
        'Unit',
        '18000000',
        '54000000',
        'Pengadaan',
        'Belum Diterima / Tahap Asesmen',
        '2025-07-15',
        'CV Karya Logam Jatim',
        'Q3',
        '2025'
      ]
    ];

    const csvString =
      '\uFEFF' +
      [
        headers.join(';'),
        ...sampleRows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(';'))
      ].join('\r\n');

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Template_Impor_Bantuan_EPML_BI_Jatim.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleLoadSampleWithErrorsForTest = () => {
    const sampleCsv = [
      'ID Bantuan;Nama Penerima;PIC Asesmen Bantuan;Status Asesmen;Alamat;Kabupaten / Kota;No. HP;Kategori Lembaga;Kategori Bantuan (EPML);Bentuk Bantuan;Jenis Barang;Detail Bantuan;QTY;Satuan;Harga Satuan (Rp);Nominal Total Bantuan (Rp);Status Penyaluran (Tahap);Status Kondisi Fisik;Tanggal Penyaluran;Vendor Penyedia;Triwulan;Tahun',
      '"EPML-JTM-2025-901";"UMKM Batik Tulis Madura Berkah";"Dimas Wicaksono, S.E.";"Disetujui";"Jl. Trunojoyo No. 12, Pamekasan";"Kabupaten Pamekasan";"081299887711";"UMKM / Koperasi";"Pemberdayaan Masyarakat";"Barang";"Peralatan Lainnya";"Kompor Batik Listrik & Etalase Galeri UMKM";"15";"Paket";"4500000";"67500000";"Barang Diterima";"Baik & Lengkap";"2025-05-20";"CV Kriya Nusantara";"Q2";"2025"',
      '"EPML-JTM-2025-902";"SMK Negeri Maritim Lamongan";"Dimas Wicaksono, S.E.";"Disetujui";"Jl. Kusuma Bangsa No. 10, Lamongan";"Kabupaten Lamongan";"081344556677";"Sekolah / Pesantren";"Edukasi";"Barang";"Alat Pembelajaran";"Simulator Navigasi Kapal & Peralatan Bengkel Las";"4";"Set";"28000000";"112000000";"Pengiriman";"Belum Diterima / Tahap Asesmen";"2025-06-10";"PT Global Edukasi Mandiri";"Q2";"2025"',
      '"EPML-JTM-2025-903";"";"Dimas Wicaksono, S.E.";"STATUS_SALAH";"Jl. Raya Kenjeran";"Kota Tidak Terdaftar";"08120000";"Kategori Salah";"Pilar Salah";"Barang";"Mesin";"";"0";"Unit";"0";"0";"TAHAP_TIDAK_VALID";"KONDISI_SALAH";"2025-06-15";"CV Vendor";"Q9";"2025"'
    ].join('\n');

    validateAndBuildRows(sampleCsv, 'Simulasi_Data_CSV_EPML.csv');
  };

  const validRows = useMemo(() => parsedRows.filter(r => r.isValid), [parsedRows]);
  const invalidRows = useMemo(() => parsedRows.filter(r => !r.isValid), [parsedRows]);
  const duplicateRowsCount = useMemo(
    () => parsedRows.filter(r => r.isDuplicateInDb || r.isDuplicateInFile).length,
    [parsedRows]
  );

  const filteredPreviewRows = useMemo(() => {
    if (previewFilter === 'VALID') return validRows;
    if (previewFilter === 'INVALID') return invalidRows;
    return parsedRows;
  }, [parsedRows, validRows, invalidRows, previewFilter]);

  const actionableValidItems = useMemo(() => {
    return validRows
      .filter(r => !(duplicateMode === 'skip' && r.isDuplicateInDb))
      .map(r => r.item);
  }, [validRows, duplicateMode]);

  const handleConfirmImport = async () => {
    if (actionableValidItems.length === 0) return;
    setIsImporting(true);
    try {
      const result = await StorageService.bulkImportBantuan(
        actionableValidItems,
        duplicateMode,
        actorName
      );
      const summary = `Impor CSV selesai: ${result.createdCount} data baru ditambahkan, ${result.updatedCount} diperbarui${
        result.skippedCount > 0 ? `, ${result.skippedCount} duplikat dilewati` : ''
      }.`;
      onImportComplete(summary);
      setParsedRows([]);
      setFileName('');
      onClose();
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-6xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-800/80 border border-blue-600/50 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold leading-tight truncate">
                Impor Massal Data Bantuan EPML via CSV
              </h2>
              <p className="text-xs text-slate-300 truncate">
                Validasi otomatis kolom wajib, kode status asesmen, tahap penyaluran, kondisi fisik & wilayah Jawa Timur
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowSchemaGuide(prev => !prev)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-300" />
              <span>{showSchemaGuide ? 'Tutup Panduan Kode' : 'Panduan Kolom & Kode Status'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Top Action Bar: Upload Dropzone + Template Download + Duplicate Rule */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* File Dropzone */}
            <div className="lg:col-span-7 bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-600 dark:hover:border-blue-500 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors">
              <div className="flex items-center gap-3.5 text-center sm:text-left">
                <div className="w-11 h-11 rounded-xl bg-blue-900/10 dark:bg-blue-900/40 text-blue-900 dark:text-blue-300 flex items-center justify-center shrink-0 mx-auto sm:mx-0">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {fileName ? `File Terpilih: ${fileName}` : 'Pilih atau Unggah File CSV Rekapitulasi Bantuan'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Mendukung pemisah titik koma (<code className="font-mono">;</code>) maupun koma (<code className="font-mono">,</code>) standar Microsoft Excel.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Pilih File CSV</span>
                </button>
                {parsedRows.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setParsedRows([]);
                      setFileName('');
                      setParseError('');
                    }}
                    title="Bersihkan tabel pratinjau"
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Template & Duplicate Strategy Controls */}
            <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Format Template & Simulasi
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleLoadSampleWithErrorsForTest}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Uji Data Contoh
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh Template CSV</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-2 text-xs">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Perlakuan ID Duplikat:
                </label>
                <select
                  value={duplicateMode}
                  onChange={e => setDuplicateMode(e.target.value as 'upsert' | 'skip')}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[11px] font-semibold"
                >
                  <option value="upsert">Perbarui Data Eksisting (Upsert)</option>
                  <option value="skip">Lewati ID yang Sudah Terdaftar</option>
                </select>
              </div>
            </div>
          </div>

          {/* Collapsible Schema & Status Codes Reference */}
          {showSchemaGuide && (
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3 text-xs animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-800 dark:text-blue-400" />
                  <span>Spesifikasi Kolom Wajib & Kode Status Resmi Sistem EPML</span>
                </h3>
                <span className="text-[11px] text-slate-500">
                  Validasi tidak peka huruf besar/kecil (case-insensitive)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <p className="font-bold text-slate-800 dark:text-slate-200">1. Kolom Wajib (Mandatory)</p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    <code className="font-mono text-blue-900 dark:text-blue-300">Nama Penerima</code>,{' '}
                    <code className="font-mono text-blue-900 dark:text-blue-300">Kabupaten / Kota</code> (38 Kab/Kota Jatim),{' '}
                    <code className="font-mono text-blue-900 dark:text-blue-300">Kategori Lembaga</code>,{' '}
                    <code className="font-mono text-blue-900 dark:text-blue-300">Kategori Bantuan (EPML)</code>,{' '}
                    <code className="font-mono text-blue-900 dark:text-blue-300">Detail Bantuan</code>,{' '}
                    <code className="font-mono text-blue-900 dark:text-blue-300">QTY</code> (&gt; 0),{' '}
                    <code className="font-mono text-blue-900 dark:text-blue-300">Nominal Total Bantuan (Rp)</code> (&gt; 0),{' '}
                    <code className="font-mono text-blue-900 dark:text-blue-300">Tahun</code>.
                  </p>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <p className="font-bold text-slate-800 dark:text-slate-200">2. Kode Status Asesmen & Tahap</p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    <strong>Status Asesmen:</strong> {VALID_STATUS_ASESMEN.join(' · ')}
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    <strong>Status Tahap:</strong> {VALID_STATUS_TAHAP.join(' · ')}
                  </p>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <p className="font-bold text-slate-800 dark:text-slate-200">3. Kode Kondisi Fisik & Pilar</p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    <strong>Kondisi Fisik:</strong> {VALID_STATUS_KONDISI_FISIK.join(' · ')}
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    <strong>Pilar EPML:</strong> {VALID_KATEGORI_BANTUAN.join(' · ')} | <strong>Triwulan:</strong> Q1, Q2, Q3, Q4
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Parse Error Alert */}
          {parseError && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-3">
              <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Validation Summary & Preview Table */}
          {parsedRows.length > 0 ? (
            <div className="space-y-4">
              {/* Summary Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Total Baris CSV</span>
                  <span className="text-lg font-extrabold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                    {parsedRows.length} Baris
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60">
                  <span className="text-[11px] text-emerald-800 dark:text-emerald-300 block">Lolos Validasi (Siap Impor)</span>
                  <span className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 font-mono tabular-nums">
                    {validRows.length} Valid
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60">
                  <span className="text-[11px] text-rose-800 dark:text-rose-300 block">Gagal Validasi (Error)</span>
                  <span className="text-lg font-extrabold text-rose-700 dark:text-rose-400 font-mono tabular-nums">
                    {invalidRows.length} Error
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60">
                  <span className="text-[11px] text-amber-800 dark:text-amber-300 block">ID Terdeteksi di Database</span>
                  <span className="text-lg font-extrabold text-amber-700 dark:text-amber-400 font-mono tabular-nums">
                    {duplicateRowsCount} Baris
                  </span>
                </div>
              </div>

              {/* Filter Segmented Control */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('ALL')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      previewFilter === 'ALL'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Semua Baris ({parsedRows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('VALID')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      previewFilter === 'VALID'
                        ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Lolos Validasi ({validRows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('INVALID')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      previewFilter === 'INVALID'
                        ? 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Perlu Perbaikan ({invalidRows.length})
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Baris dengan status Error tidak akan diimpor ke database</span>
                </div>
              </div>

              {/* Preview Table */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                <div className="overflow-x-auto max-h-[340px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                      <tr>
                        <th className="p-2.5 text-center w-14">Baris</th>
                        <th className="p-2.5">Status Validasi</th>
                        <th className="p-2.5">ID & Penerima</th>
                        <th className="p-2.5">Kabupaten/Kota & Lembaga</th>
                        <th className="p-2.5">Pilar & Rincian Bantuan</th>
                        <th className="p-2.5 text-right">QTY & Nominal (Rp)</th>
                        <th className="p-2.5">Kode Status (Asesmen / Tahap / Fisik)</th>
                        <th className="p-2.5">Catatan Validasi / Error</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredPreviewRows.map(row => (
                        <tr
                          key={`${row.rowNumber}-${row.item.id}`}
                          className={
                            row.isValid
                              ? 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                              : 'bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50/70'
                          }
                        >
                          <td className="p-2.5 text-center font-mono tabular-nums text-slate-500">
                            #{row.rowNumber}
                          </td>
                          <td className="p-2.5 whitespace-nowrap">
                            {row.isValid ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                <span>Valid</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-400 font-bold text-[11px]">
                                <XCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>Error ({row.errors.length})</span>
                              </span>
                            )}
                          </td>
                          <td className="p-2.5">
                            <span className="font-mono text-[10px] font-bold text-blue-900 dark:text-blue-400 block">
                              {row.item.id}
                            </span>
                            <span className="font-bold text-slate-900 dark:text-slate-100 block">
                              {row.rawRecord['namapenerima'] || row.item.namaPenerima || '(Kosong)'}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Tahun {row.item.tahun} · {row.item.triwulan}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <span className="font-medium text-slate-800 dark:text-slate-200 block">
                              {row.item.kabupatenKota}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              {row.item.kategoriLembaga}
                            </span>
                          </td>
                          <td className="p-2.5 max-w-[200px]">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                              {row.item.kategoriBantuan} ({row.item.bentukBantuan})
                            </span>
                            <span className="text-[11px] text-slate-500 line-clamp-1">
                              {row.item.detailBantuan}
                            </span>
                          </td>
                          <td className="p-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                            <span className="font-bold text-slate-900 dark:text-slate-100 block">
                              Rp {row.item.nominalBantuan.toLocaleString('id-ID')}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {row.item.qty} {row.item.satuan}
                            </span>
                          </td>
                          <td className="p-2.5 text-[11px] space-y-0.5">
                            <div className="text-slate-700 dark:text-slate-300">
                              Asesmen: <strong className="font-semibold">{row.item.statusAsesmen}</strong>
                            </div>
                            <div className="text-slate-700 dark:text-slate-300">
                              Tahap: <strong className="font-semibold">{row.item.statusTahap}</strong>
                            </div>
                            <div className="text-slate-700 dark:text-slate-300">
                              Fisik: <strong className="font-semibold">{row.item.statusKondisiFisik}</strong>
                            </div>
                          </td>
                          <td className="p-2.5 max-w-xs">
                            {row.errors.length > 0 ? (
                              <ul className="space-y-1 text-[11px] text-rose-700 dark:text-rose-300 font-medium">
                                {row.errors.map((err, i) => (
                                  <li key={i} className="flex items-start gap-1">
                                    <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5 text-rose-600" />
                                    <span>{err}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : row.warnings.length > 0 ? (
                              <ul className="space-y-1 text-[11px] text-amber-700 dark:text-amber-300">
                                {row.warnings.map((w, i) => (
                                  <li key={i}>{w}</li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                                Seluruh kolom wajib & kode status sesuai standar.
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* Empty State before uploading CSV */
            <div className="py-10 px-6 text-center bg-slate-50/60 dark:bg-slate-800/30 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3">
              <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto" />
              <div className="max-w-lg mx-auto space-y-1">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Belum Ada File CSV yang Diunggah
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Unduh <strong>Template CSV</strong> resmi terlebih dahulu, isi data penerima bantuan sesuai kode status EPML, lalu klik <strong>Pilih File CSV</strong> untuk memeriksa hasil validasi baris demi baris sebelum disimpan ke sistem.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Template CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handleLoadSampleWithErrorsForTest}
                  className="px-3.5 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 hover:bg-blue-100 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Muat Simulasi Validasi CSV</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600 dark:text-slate-400">
            {parsedRows.length > 0 ? (
              <span>
                Siap mengimpor{' '}
                <strong className="text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                  {actionableValidItems.length}
                </strong>{' '}
                baris valid (Otomatis membuat QR Code & mencatat Audit Log).
              </span>
            ) : (
              <span>Pilih file CSV untuk memulai pemeriksaan validasi data.</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={actionableValidItems.length === 0 || isImporting}
              onClick={handleConfirmImport}
              className="px-5 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 disabled:opacity-45 disabled:cursor-not-allowed text-white text-xs font-bold inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Memproses Impor & QR...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Impor {actionableValidItems.length} Data Valid ke Sistem</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
