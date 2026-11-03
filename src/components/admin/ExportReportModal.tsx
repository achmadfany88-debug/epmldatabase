/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { StorageService } from '../../services/storageService';
import { BantuanItem } from '../../types';
import { WILAYAH_KERJA_KPW_JATIM } from '../../data/initialData';
import { QrStickerDesignCard, PrintQrStickerModal } from './PrintQrStickerModal';
import { 
  X, 
  FileSpreadsheet, 
  Printer, 
  QrCode,
  FileText
} from 'lucide-react';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  bantuanList: BantuanItem[];
}

const getKategoriLembaga = (nama: string): string => {
  const lower = nama.toLowerCase();
  if (lower.includes('smk') || lower.includes('sma') || lower.includes('sekolah') || lower.includes('universitas') || lower.includes('kampus') || lower.includes('inkubasi')) {
    return 'Sekolah / SMK / Vokasi';
  }
  if (lower.includes('pesantren') || lower.includes('pondok') || lower.includes('yayasan') || lower.includes('madrasah')) {
    return 'Pondok Pesantren / Yayasan';
  }
  if (lower.includes('koperasi') || lower.includes('umkm') || lower.includes('sentra') || lower.includes('kelompok tani') || lower.includes('gabungan') || lower.includes('usaha')) {
    return 'UMKM / Koperasi / Kelompok Tani';
  }
  if (lower.includes('komunitas') || lower.includes('pokdarwis') || lower.includes('bank sampah') || lower.includes('konservasi') || lower.includes('desa') || lower.includes('karang taruna')) {
    return 'Komunitas / Pokmas / Bank Sampah';
  }
  return 'Lembaga Lainnya';
};

export const ExportReportModal: React.FC<ExportReportModalProps> = ({
  isOpen,
  onClose,
  bantuanList
}) => {
  const [filterKab, setFilterKab] = useState('');
  const [filterTahun, setFilterTahun] = useState<string>('ALL');
  const [filterKategoriLembaga, setFilterKategoriLembaga] = useState<string>('ALL');
  const [filterTriwulan, setFilterTriwulan] = useState<string>('ALL');
  const [filterKategori, setFilterKategori] = useState<string>('ALL');
  const [filterBentuk] = useState<string>('ALL');
  const [filterTahap] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [previewMode, setPreviewMode] = useState<'OFFICIAL_PDF' | 'QR_STICKER_BATCH'>('OFFICIAL_PDF');
  const [isPrintStickerModalOpen, setIsPrintStickerModalOpen] = useState(false);

  if (!isOpen) return null;

  const availableYears = Array.from(new Set([2024, 2025, 2026, ...bantuanList.map(b => b.tahun)])).sort((a, b) => b - a);

  // Filter evaluation
  const filteredList = bantuanList.filter(item => {
    if (filterKab && item.kabupatenKota !== filterKab) return false;
    if (filterTahun !== 'ALL' && item.tahun.toString() !== filterTahun) return false;
    if (filterKategoriLembaga !== 'ALL' && getKategoriLembaga(item.namaPenerima) !== filterKategoriLembaga) return false;
    if (filterTriwulan !== 'ALL' && item.triwulan !== filterTriwulan) return false;
    if (filterKategori !== 'ALL' && item.kategoriBantuan !== filterKategori) return false;
    if (filterBentuk !== 'ALL' && item.bentukBantuan !== filterBentuk) return false;
    if (filterTahap !== 'ALL' && item.statusTahap !== filterTahap) return false;
    if (startDate && item.tanggalPenyaluran < startDate) return false;
    if (endDate && item.tanggalPenyaluran > endDate) return false;
    return true;
  });

  const totalNominal = filteredList.reduce((acc, curr) => acc + curr.nominalBantuan, 0);

  const handleDownloadExcel = () => {
    const csvData = StorageService.exportToCSV(filteredList);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Laporan_Rekapitulasi_EPML_BI_Jatim_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-4 max-h-[92vh] flex flex-col">
        {/* Header - No print */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between shrink-0 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-900 text-white flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Pusat Pelaporan, Ekspor Audit & Batch Stiker QR EPML
              </h3>
              <p className="text-xs text-slate-500">
                Unduh rekapitulasi Excel (.CSV), Dokumen Resmi PDF ber-Kop Bank Indonesia, atau Cetak Batch Stiker QR A4 (3×6)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls Bar - No print */}
        <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs shrink-0 no-print space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Tahun Anggaran:
              </label>
              <select
                value={filterTahun}
                onChange={e => setFilterTahun(e.target.value)}
                className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs"
              >
                <option value="ALL">Semua Tahun</option>
                {availableYears.map(yr => (
                  <option key={yr} value={yr.toString()}>{yr}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Lokasi (Kab/Kota):
              </label>
              <select
                value={filterKab}
                onChange={e => setFilterKab(e.target.value)}
                className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs"
              >
                <option value="">Semua 13 Wilayah Kerja</option>
                {WILAYAH_KERJA_KPW_JATIM.map(nama => (
                  <option key={nama} value={nama}>{nama.replace('Kabupaten ', 'Kab. ')}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Kategori Lembaga:
              </label>
              <select
                value={filterKategoriLembaga}
                onChange={e => setFilterKategoriLembaga(e.target.value)}
                className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs"
              >
                <option value="ALL">Semua Kategori Lembaga</option>
                <option value="Sekolah / SMK / Vokasi">Sekolah / SMK / Vokasi</option>
                <option value="Pondok Pesantren / Yayasan">Pondok Pesantren / Yayasan</option>
                <option value="UMKM / Koperasi / Kelompok Tani">UMKM / Koperasi / Kelompok Tani</option>
                <option value="Komunitas / Pokmas / Bank Sampah">Komunitas / Pokmas / Bank Sampah</option>
                <option value="Lembaga Lainnya">Lembaga Lainnya</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Triwulan:
              </label>
              <select
                value={filterTriwulan}
                onChange={e => setFilterTriwulan(e.target.value)}
                className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs"
              >
                <option value="ALL">Semua Triwulan</option>
                <option value="Q1">Triwulan I (Q1)</option>
                <option value="Q2">Triwulan II (Q2)</option>
                <option value="Q3">Triwulan III (Q3)</option>
                <option value="Q4">Triwulan IV (Q4)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Pilar EPML:
              </label>
              <select
                value={filterKategori}
                onChange={e => setFilterKategori(e.target.value)}
                className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs"
              >
                <option value="ALL">Semua Pilar</option>
                <option value="Edukasi">Edukasi</option>
                <option value="Pemberdayaan Masyarakat">Pemberdayaan Masyarakat</option>
                <option value="Lingkungan">Lingkungan</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Dari Tanggal:
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Sampai Tanggal:
              </label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">
                Hasil Filter: <strong>{filteredList.length}</strong> entri penerima &middot; Total Realisasi:{' '}
                <strong className="text-blue-900 dark:text-blue-400 tabular-nums">
                  Rp {totalNominal.toLocaleString('id-ID')}
                </strong>
              </span>

              <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setPreviewMode('OFFICIAL_PDF')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-all ${
                    previewMode === 'OFFICIAL_PDF'
                      ? 'bg-white dark:bg-slate-900 text-blue-900 dark:text-blue-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <FileText className="w-3 h-3" />
                  <span>Preview Laporan PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('QR_STICKER_BATCH')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-all ${
                    previewMode === 'QR_STICKER_BATCH'
                      ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <QrCode className="w-3 h-3" />
                  <span>Batch Stiker QR A4 (3×6)</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleDownloadExcel}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Unduh Excel (.CSV)</span>
              </button>

              <button
                onClick={() => setIsPrintStickerModalOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-linear-to-r from-[#002B66] to-emerald-700 hover:from-blue-900 hover:to-emerald-600 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Cetak Batch Stiker QR A4 ({filteredList.length})</span>
              </button>

              <button
                onClick={handlePrintPdf}
                className="px-3.5 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Laporan PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Printable Official Document or QR Sticker Batch Preview */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-100 dark:bg-slate-950">
          {previewMode === 'QR_STICKER_BATCH' ? (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Pratinjau Lembar Cetak Stiker QR A4 (Potrait &middot; 3 Horizontal × 6 Vertikal)
                  </h4>
                  <p className="text-xs text-slate-500">
                    Menampilkan {Math.min(filteredList.length, 18)} dari {filteredList.length} stiker hasil filter &middot; Tanpa garis potong (border solid minimalis)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPrintStickerModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-4 h-4 text-amber-300" />
                  <span>Buka Cetak PDF / Unduh Lembar A4 (3×6)</span>
                </button>
              </div>

              <div
                className="mx-auto bg-white shadow-xl border border-slate-300 p-4 sm:p-5"
                style={{ width: '100%', maxWidth: '794px', minHeight: '980px' }}
              >
                <div className="grid grid-cols-3 grid-rows-6 gap-2.5 h-full">
                  {Array.from({ length: 18 }).map((_, slotIdx) => {
                    const item = filteredList[slotIdx];
                    if (!item) {
                      return (
                        <div
                          key={`empty-batch-${slotIdx}`}
                          className="rounded-lg border border-slate-100 bg-slate-50/40 flex items-center justify-center min-h-[145px]"
                        >
                          <span className="text-[10px] text-slate-300 font-medium">
                            Slot #{slotIdx + 1} Kosong
                          </span>
                        </div>
                      );
                    }
                    return (
                      <div key={item.id} className="min-h-[145px]">
                        <QrStickerDesignCard item={item} compact />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
          <div className="bg-white text-slate-900 p-8 sm:p-12 rounded-xl shadow-lg border border-slate-200 max-w-4xl mx-auto print:shadow-none print:border-none print:p-0">
            {/* Bank Indonesia Official Letterhead (KOP SURAT) */}
            <div className="border-b-2 border-slate-900 pb-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-white flex items-center justify-center shrink-0">
                  <img
                    src="/assets/aistudio/Logo_BI_Bulat_27bc9deb.png"
                    alt="Logo Bank Indonesia"
                    className="w-full h-full object-cover rounded-full scale-[1.22]"
                  />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-black tracking-wider uppercase text-blue-950">
                    BANK INDONESIA
                  </h2>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                    KANTOR PERWAKILAN PROVINSI JAWA TIMUR
                  </h3>
                  <p className="text-[11px] text-slate-600 leading-tight">
                    Jl. Pahlawan No. 105, Krembangan, Kota Surabaya 60174 &middot; Telepon: (031) 3530351 &middot; Faksimili: (031) 3530350
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Situs Resmi: www.bi.go.id &middot; Surel: humas_jatim@bi.go.id
                  </p>
                </div>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center mb-6">
              <h4 className="text-base font-bold underline uppercase tracking-wide">
                LAPORAN REKAPITULASI PENYALURAN BANTUAN EPML
              </h4>
              <p className="text-xs text-slate-600 mt-1">
                Program Edukasi, Pemberdayaan Masyarakat, dan Lingkungan Provinsi Jawa Timur
              </p>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                Nomor: REK-EPML/JTM/{new Date().getFullYear()}/{Math.floor(1000 + Math.random() * 9000)} &middot; Tanggal Cetak: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>

            {/* Summary KPI Strip */}
            <div className="grid grid-cols-3 gap-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs mb-6">
              <div>
                <span className="text-slate-500">Total Lembaga Penerima:</span>
                <p className="font-bold text-slate-900 text-sm tabular-nums">{filteredList.length} Penerima</p>
              </div>
              <div>
                <span className="text-slate-500">Cakupan Wilayah:</span>
                <p className="font-bold text-slate-900 text-sm">
                  {new Set(filteredList.map(b => b.kabupatenKota)).size} Kabupaten/Kota
                </p>
              </div>
              <div>
                <span className="text-slate-500">Total Anggaran Terealisasi:</span>
                <p className="font-bold text-blue-900 text-sm tabular-nums">
                  Rp {totalNominal.toLocaleString('id-ID')}
                </p>
              </div>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto mb-8">
              <table className="w-full text-[11px] border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold">
                    <th className="border border-slate-300 p-2 text-center w-8">No</th>
                    <th className="border border-slate-300 p-2 text-left">Nama Penerima & Alamat</th>
                    <th className="border border-slate-300 p-2 text-left">Wilayah</th>
                    <th className="border border-slate-300 p-2 text-left">Pilar EPML</th>
                    <th className="border border-slate-300 p-2 text-left">Detail Bantuan</th>
                    <th className="border border-slate-300 p-2 text-center">QTY</th>
                    <th className="border border-slate-300 p-2 text-right">Nominal (Rp)</th>
                    <th className="border border-slate-300 p-2 text-center">Tahap Penyaluran</th>
                    <th className="border border-slate-300 p-2 text-center">Kondisi Fisik</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="border border-slate-300 p-2 text-center tabular-nums">{idx + 1}</td>
                      <td className="border border-slate-300 p-2">
                        <strong className="block text-slate-900">{item.namaPenerima}</strong>
                        <span className="text-[10px] text-slate-500 font-mono">{item.id}</span>
                        <p className="text-[10px] text-slate-600 line-clamp-1">{item.alamat}</p>
                      </td>
                      <td className="border border-slate-300 p-2 whitespace-nowrap">
                        {item.kabupatenKota.replace('Kabupaten ', 'Kab. ')}
                      </td>
                      <td className="border border-slate-300 p-2">{item.kategoriBantuan}</td>
                      <td className="border border-slate-300 p-2">
                        <span className="font-semibold block">{item.bentukBantuan === 'Barang' ? item.jenisBarang : 'Jasa'}</span>
                        <span className="text-[10px] text-slate-600 line-clamp-1">{item.detailBantuan}</span>
                        <span className="text-[9px] text-slate-400 block">Vendor: {item.vendorPenyedia}</span>
                      </td>
                      <td className="border border-slate-300 p-2 text-center tabular-nums whitespace-nowrap">
                        {item.qty} {item.satuan}
                      </td>
                      <td className="border border-slate-300 p-2 text-right font-semibold tabular-nums whitespace-nowrap">
                        Rp {item.nominalBantuan.toLocaleString('id-ID')}
                      </td>
                      <td className="border border-slate-300 p-2 text-center font-medium whitespace-nowrap">
                        {item.statusTahap}
                      </td>
                      <td className="border border-slate-300 p-2 text-center font-medium whitespace-nowrap">
                        <span className={item.statusKondisiFisik === 'Baik & Lengkap' ? 'text-emerald-700' : 'text-amber-700'}>
                          {item.statusKondisiFisik}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredList.length === 0 && (
                    <tr>
                      <td colSpan={9} className="border border-slate-300 p-6 text-center text-slate-500">
                        Tidak ada data yang memenuhi kriteria filter.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold">
                    <td colSpan={6} className="border border-slate-300 p-2 text-right uppercase">
                      Total Akumulasi Realisasi Bantuan:
                    </td>
                    <td className="border border-slate-300 p-2 text-right tabular-nums text-blue-950">
                      Rp {totalNominal.toLocaleString('id-ID')}
                    </td>
                    <td colSpan={2} className="border border-slate-300 p-2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Official Signature Blocks */}
            <div className="grid grid-cols-2 gap-8 text-xs text-center mt-12 pt-6 border-t border-slate-200">
              <div>
                <p className="text-slate-500">Mengetahui,</p>
                <p className="font-bold text-slate-900 mt-0.5">
                  Kepala Perwakilan Bank Indonesia<br />Provinsi Jawa Timur
                </p>
                <div className="h-20" />
                <p className="font-bold underline text-slate-900 uppercase">
                  Erwin Gunawan Hutapea
                </p>
                <p className="text-[10px] text-slate-500">NIP. 19710825 199703 1 001</p>
              </div>

              <div>
                <p className="text-slate-500">Surabaya, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <p className="font-bold text-slate-900 mt-0.5">
                  Pejabat Penanggung Jawab Program EPML<br />Fungsi Pelaksanaan KPSBI Jatim
                </p>
                <div className="h-20" />
                <p className="font-bold underline text-slate-900 uppercase">
                  Dimas Wicaksono, S.E.
                </p>
                <p className="text-[10px] text-slate-500">PIC Asesmen & Lapangan EPML</p>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>

      <PrintQrStickerModal
        isOpen={isPrintStickerModalOpen}
        onClose={() => setIsPrintStickerModalOpen(false)}
        items={filteredList}
        filterSummaryText={`Tahun: ${filterTahun === 'ALL' ? 'Semua' : filterTahun} | Lokasi: ${filterKab ? filterKab.replace('Kabupaten ', 'Kab. ') : 'Semua 13 Wilayah'} | Kategori: ${filterKategoriLembaga === 'ALL' ? 'Semua Lembaga' : filterKategoriLembaga}`}
      />
    </div>
  );
};
