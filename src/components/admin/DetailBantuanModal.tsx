/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BantuanItem } from '../../types';
import { StorageService } from '../../services/storageService';
import { DRIVE_PHOTO_ARCHIVE_ROOT_URL } from '../../services/googleDriveService';
import { 
  X, 
  MapPin, 
  Navigation, 
  QrCode, 
  Download, 
  ExternalLink, 
  Send, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  Building2, 
  Package, 
  Edit,
  Tag,
  Layers,
  Check,
  ZoomIn,
  Images
} from 'lucide-react';
import { ImageLightboxModal } from '../common/ImageLightboxModal';

interface DetailBantuanModalProps {
  isOpen: boolean;
  onClose: () => void;
  bantuan: BantuanItem | null;
  onEdit?: (bantuan: BantuanItem) => void;
  onOpenWhatsApp: (bantuan: BantuanItem) => void;
  onOpenQrScanner?: (bantuanId?: string) => void;
}

export const DetailBantuanModal: React.FC<DetailBantuanModalProps> = ({
  isOpen,
  onClose,
  bantuan,
  onEdit,
  onOpenWhatsApp,
  onOpenQrScanner
}) => {
  const [lightboxState, setLightboxState] = useState<{
    isOpen: boolean;
    url: string;
    caption: string;
  }>({
    isOpen: false,
    url: '',
    caption: ''
  });

  const [liveQrUrl, setLiveQrUrl] = useState<string>('');

  useEffect(() => {
    if (bantuan) {
      if (bantuan.qrCodeDataUrl) {
        setLiveQrUrl(bantuan.qrCodeDataUrl);
      } else {
        StorageService.generateQrCodeDataUrl(bantuan).then(url => {
          setLiveQrUrl(url);
        });
      }
    }
  }, [bantuan]);

  if (!isOpen || !bantuan) return null;

  const getCategoryPhotos = (list?: string[], singleUrl?: string, defaultFallback = '/src/assets/images/bantuan_epml_activity_1793505601348.jpg') => {
    if (list && list.length > 0) return list;
    if (singleUrl) return [singleUrl];
    return [defaultFallback];
  };

  const fotoPenerimaPhotos = getCategoryPhotos(bantuan.fotoPenerimaList, bantuan.fotoPenerimaUrl, '/src/assets/images/bantuan_epml_activity_1793505601348.jpg');
  const buktiVendorPhotos = getCategoryPhotos(bantuan.buktiPenyaluranVendorList, bantuan.buktiPenyaluranVendorUrl, '/src/assets/images/bantuan_epml_activity_1793505601348.jpg');
  const buktiBastPhotos = getCategoryPhotos(bantuan.buktiSerahTerimaBastList, bantuan.buktiSerahTerimaBastUrl, '/src/assets/images/bantuan_epml_activity_1793505601348.jpg');
  const fotoMonitoringPhotos = getCategoryPhotos(bantuan.fotoMonitoringList, bantuan.fotoMonitoringUrl, '/src/assets/images/bi_pahlawan_building_1793505599998.jpg');

  const TAHAPAN_ORDER = [
    'Asesmen',
    'Usulan',
    'Pengadaan',
    'Pengiriman',
    'Selesai Dikirim',
    'Barang Diterima',
    'Penjadwalan Monitoring Bantuan'
  ];

  const currentStageIndex = TAHAPAN_ORDER.indexOf(bantuan.statusTahap);

  const googleMapsUrl = `https://www.google.com/maps?q=${bantuan.latitude},${bantuan.longitude}`;

  const handleDownloadQr = () => {
    const qrSrc = liveQrUrl || bantuan.qrCodeDataUrl;
    if (!qrSrc) return;
    const link = document.createElement('a');
    link.href = qrSrc;
    link.download = `Stiker_QR_EPML_${bantuan.id}.png`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-white flex items-center justify-center shrink-0 shadow-2xs ring-1 ring-slate-200 dark:ring-slate-700">
              <img
                src="/assets/aistudio/Logo_BI_Bulat_27bc9deb.png"
                alt="Logo Bank Indonesia"
                className="w-full h-full object-cover rounded-full scale-[1.22]"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-blue-900 dark:text-blue-400">
                  {bantuan.id}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {bantuan.tahun} - {bantuan.triwulan}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                {bantuan.namaPenerima}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(bantuan);
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 flex items-center gap-1.5"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit Data</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto text-xs">
          {/* Progress Timeline (7 Stages) */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
                Tahapan Distribusi Penyaluran Bantuan (7 Tahap)
              </span>
              <span className="font-bold text-blue-900 dark:text-blue-400 text-xs">
                Status: {bantuan.statusTahap}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center">
              {TAHAPAN_ORDER.map((stage, idx) => {
                const isPassed = idx < currentStageIndex;
                const isCurrent = idx === currentStageIndex;
                return (
                  <div
                    key={stage}
                    className={`p-2 rounded-lg border text-[11px] font-medium flex flex-col items-center justify-center min-h-[56px] transition-all ${
                      isCurrent
                        ? 'bg-blue-900 text-white border-blue-900 shadow-xs'
                        : isPassed
                        ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-300'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'
                    }`}
                  >
                    <span className="text-[10px] opacity-75">{idx + 1}</span>
                    <span className="leading-tight mt-0.5">{stage}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* QR Code & Geo-Tagging Section */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
            {/* QR Label Preview Card: Desain Baru Biru, Putih & Hijau Bank Indonesia */}
            <div className="md:col-span-4 bg-white dark:bg-slate-800/80 rounded-xl border-2 border-[#002B66]/30 dark:border-slate-700 overflow-hidden flex flex-col justify-between shadow-sm">
              {/* Top Blue Banner (#002B66) + Emerald Accent */}
              <div className="bg-linear-to-r from-[#002B66] via-[#003882] to-[#002B66] text-white px-3 py-2 border-b-2 border-emerald-500 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 text-left">
                  <div className="w-6 h-6 rounded-full overflow-hidden bg-white flex items-center justify-center shrink-0 shadow-2xs ring-1 ring-white/90">
                    <img
                      src="/assets/aistudio/Logo_BI_Bulat_27bc9deb.png"
                      alt="Logo BI"
                      className="w-full h-full object-cover rounded-full scale-[1.22]"
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="font-extrabold text-[10px] uppercase tracking-wider block leading-tight truncate">
                      Bantuan EPML dari Bank Indonesia
                    </span>
                    <span className="text-[8.5px] text-emerald-300 font-semibold block leading-tight truncate">
                      QR Label Preview &bull; Info Penerima
                    </span>
                  </div>
                </div>
                <span className="px-1.5 py-0.5 rounded-xs bg-emerald-500 text-slate-950 font-black text-[9px] shrink-0">
                  {bantuan.tahun}
                </span>
              </div>

              {/* White Body with Framed QR, ID, Lembaga & Item Summary */}
              <div className="p-3.5 bg-white text-slate-900 flex flex-col items-center text-center space-y-2">
                <div className="relative p-2 bg-white rounded-lg border border-[#002B66]/25 shadow-xs">
                  <span className="absolute top-1 left-1 w-2 h-2 border-t-2 border-l-2 border-[#002B66]" />
                  <span className="absolute top-1 right-1 w-2 h-2 border-t-2 border-r-2 border-[#002B66]" />
                  <span className="absolute bottom-6 left-1 w-2 h-2 border-b-2 border-l-2 border-emerald-600" />
                  <span className="absolute bottom-6 right-1 w-2 h-2 border-b-2 border-r-2 border-emerald-600" />

                  {(liveQrUrl || bantuan.qrCodeDataUrl) ? (
                    <img
                      src={liveQrUrl || bantuan.qrCodeDataUrl}
                      alt="QR Informasi Penerima Bantuan"
                      className="w-32 h-32 object-contain mx-auto"
                    />
                  ) : (
                    <div className="w-32 h-32 flex items-center justify-center bg-slate-100">
                      <QrCode className="w-12 h-12 text-slate-400" />
                    </div>
                  )}
                  <span className="mt-1 block w-full py-0.5 px-2 rounded-2xs bg-[#002B66] text-white font-extrabold text-[8px] uppercase tracking-wider">
                    SCAN INFO PENERIMA EPML
                  </span>
                </div>

                <div className="w-full space-y-1">
                  <span className="inline-block font-mono font-extrabold text-[11px] text-[#002B66] bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                    ID: {bantuan.id}
                  </span>
                  <p className="font-extrabold text-xs text-slate-900 line-clamp-2 leading-snug">
                    {bantuan.namaPenerima}
                  </p>
                  <p className="text-[10px] text-emerald-800 font-bold truncate bg-emerald-50/80 border border-emerald-200/70 rounded px-2 py-0.5">
                    Item: {bantuan.detailBantuan} ({bantuan.qty} {bantuan.satuan})
                  </p>
                </div>
              </div>

              {/* Emerald Footer Banner */}
              <div className="bg-[#047857] text-white px-3 py-1.5 flex items-center justify-between text-[9.5px] font-extrabold uppercase tracking-wide">
                <span>Tahun Penyaluran: {bantuan.tahun} ({bantuan.triwulan})</span>
                <span className="bg-white text-[#002B66] px-1.5 py-0.5 rounded-xs text-[8.5px]">
                  QR Resmi
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-700 space-y-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenQrScanner?.(bantuan.id);
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <QrCode className="w-3.5 h-3.5 text-amber-300" />
                  <span>Buka Tampilan Scan QR</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadQr}
                  className="w-full py-1.5 px-3 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Gambar QR</span>
                </button>
              </div>
            </div>

            {/* Geo-tagging & Details */}
            <div className="md:col-span-8 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 block">Pilar Program:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{bantuan.kategoriBantuan}</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 block">Kategori Lembaga:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{bantuan.kategoriLembaga}</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 block">Status Kondisi Fisik:</span>
                  <span className={`font-bold ${
                    bantuan.statusKondisiFisik === 'Baik & Lengkap' ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
                  }`}>
                    {bantuan.statusKondisiFisik}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 block">PIC & Status Asesmen BI:</span>
                  <div className="flex flex-wrap items-center justify-between gap-1.5 mt-0.5">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{bantuan.picAsesmen}</span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide shadow-2xs ${
                        bantuan.statusAsesmen === 'Disetujui'
                          ? 'bg-emerald-600 text-white border border-emerald-700'
                          : bantuan.statusAsesmen === 'Ditolak'
                          ? 'bg-red-600 text-white border border-red-700'
                          : bantuan.statusAsesmen === 'Menunggu Tindak Lanjut'
                          ? 'bg-amber-500 text-white border border-amber-600'
                          : 'bg-[#002B66] text-white border border-blue-950'
                      }`}
                    >
                      {bantuan.statusAsesmen || 'Asesmen'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Geo-tagging Location info */}
              <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-blue-950 dark:text-blue-300">
                    <MapPin className="w-4 h-4 text-blue-700" />
                    <span>Titik Lokasi & Koordinat Geo-Tagging</span>
                  </div>
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded bg-blue-900 text-white font-semibold text-[11px] flex items-center gap-1 hover:bg-blue-800"
                  >
                    <span>Buka Rute Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-slate-700 dark:text-slate-300">{bantuan.alamat}, {bantuan.kabupatenKota}</p>
                <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  <span>Lat: {bantuan.latitude}</span>
                  <span>&middot;</span>
                  <span>Lng: {bantuan.longitude}</span>
                </div>
              </div>

              {/* Quick WhatsApp trigger */}
              <button
                onClick={() => onOpenWhatsApp(bantuan)}
                className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Kirim Notifikasi WhatsApp ke Penerima ({bantuan.noHp})</span>
              </button>
            </div>
          </div>

          {/* Assistance Financial & Item Breakdown */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-900 dark:text-blue-400" />
                <span>Rincian Barang / Jasa & Rekanan Vendor</span>
              </h4>
              <div className="text-right">
                <span className="text-slate-500 text-[10px] block">Total Nilai Bantuan:</span>
                <p className="font-bold text-blue-900 dark:text-blue-300 text-sm tabular-nums">
                  Rp {bantuan.nominalBantuan.toLocaleString('id-ID')}
                </p>
              </div>
            </div>

            {/* Individual Item Specifications List */}
            {bantuan.spesifikasiBarangList && bantuan.spesifikasiBarangList.length > 0 ? (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                  Daftar Jenis Barang & Spesifikasi Teknis:
                </span>
                <div className="grid grid-cols-1 gap-2">
                  {bantuan.spesifikasiBarangList.map((spec, sIdx) => (
                    <div
                      key={sIdx}
                      className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-300 font-bold text-[10px]">
                            {spec.jenisBarang}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                          QTY: <strong>{spec.qty || 1} {spec.satuan || 'Unit'}</strong>
                          {spec.hargaSatuan ? ` &middot; @ Rp ${spec.hargaSatuan.toLocaleString('id-ID')}` : ''}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 text-xs pl-0.5 leading-relaxed">
                        {spec.deskripsi || 'Spesifikasi standar pabrikan.'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                    {bantuan.bentukBantuan === 'Barang' ? (bantuan.jenisBarang || 'Barang Fisik') : 'Layanan Jasa'}
                  </span>
                  <p className="text-slate-600 dark:text-slate-400 mt-0.5">{bantuan.detailBantuan}</p>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-wrap justify-between text-[11px] text-slate-500">
                  <span>QTY: <strong className="text-slate-800 dark:text-slate-200">{bantuan.qty} {bantuan.satuan}</strong></span>
                  <span>Harga Satuan: <strong className="text-slate-800 dark:text-slate-200">Rp {bantuan.hargaSatuan.toLocaleString('id-ID')}</strong></span>
                </div>
              </div>
            )}

            {/* Rekanan Vendor Information */}
            <div className="pt-2">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-2">
                Rekanan Vendor Penyedia Terkait:
              </span>

              {bantuan.daftarVendor && bantuan.daftarVendor.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {bantuan.daftarVendor.map((vnd, vIdx) => (
                    <div
                      key={vIdx}
                      className="p-3 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                          {vnd.namaVendor}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {vnd.kategoriPajak || 'PKP'}
                        </span>
                      </div>

                      {vnd.kontak && (
                        <p className="text-[10px] text-slate-500 font-mono">
                          Kontak: {vnd.kontak}
                        </p>
                      )}

                      {vnd.kategoriPengadaan && vnd.kategoriPengadaan.length > 0 && (
                        <div>
                          <span className="text-[9px] text-slate-400 block mb-1">Kategori Pengadaan:</span>
                          <div className="flex flex-wrap gap-1">
                            {vnd.kategoriPengadaan.map(cat => (
                              <span
                                key={cat}
                                className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-blue-50 dark:bg-blue-950/70 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-900"
                              >
                                {cat}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs flex justify-between items-center">
                  <div>
                    <span className="text-slate-500 text-[11px] block">Vendor Penyedia Utama:</span>
                    <strong className="text-slate-900 dark:text-slate-100">{bantuan.vendorPenyedia}</strong>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-300">
                    Vendor Tunggal
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Photo Documentation Strip (Maksimal 7 Foto per Kategori, Bisa Diganti & Diperbesar) */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Images className="w-3.5 h-3.5 text-blue-900 dark:text-blue-400" />
                  <span>Dokumentasi Foto & Arsip Google Drive</span>
                </h4>
                <p className="text-[10px] text-slate-500">
                  Lokasi Arsip Drive: <strong>EPML {bantuan.tahun} / {bantuan.namaPenerima}</strong> &bull; Klik foto untuk memperbesar
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={bantuan.driveRecipientFolderUrl || DRIVE_PHOTO_ARCHIVE_ROOT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 rounded-md transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>
                    {bantuan.driveRecipientFolderUrl
                      ? `Folder Drive (${bantuan.driveYearFolderName || `EPML ${bantuan.tahun}`})`
                      : 'Buka Google Drive Arsip Foto'}
                  </span>
                </a>

                {onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(bantuan)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-900 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-md transition-colors self-start sm:self-auto"
                  >
                    <Edit className="w-3 h-3" />
                    <span>Ganti / Tambah Foto</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Kategori 1: Foto Lokasi / Penerima */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">
                    Foto Lokasi Penerima
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-300">
                    {fotoPenerimaPhotos.length} / 7
                  </span>
                </div>

                <div 
                  onClick={() => setLightboxState({ isOpen: true, url: fotoPenerimaPhotos[0], caption: 'Foto Lokasi & Penerima Bantuan' })}
                  className="h-28 rounded-lg bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden relative group cursor-pointer"
                >
                  <img
                    src={fotoPenerimaPhotos[0]}
                    alt="Foto Penerima"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-semibold">
                    <ZoomIn className="w-4 h-4" />
                    <span>Perbesar</span>
                  </div>
                </div>

                {/* Sub Thumbnails if > 1 photos */}
                {fotoPenerimaPhotos.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5">
                    {fotoPenerimaPhotos.map((photo, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setLightboxState({ isOpen: true, url: photo, caption: `Foto Penerima #${idx + 1}` })}
                        className="w-8 h-8 rounded border border-slate-300 dark:border-slate-700 overflow-hidden shrink-0 hover:ring-2 hover:ring-blue-500 transition-all"
                      >
                        <img src={photo} alt={`Penerima ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Kategori 2: Bukti Vendor */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">
                    Bukti Penyaluran Vendor
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-300">
                    {buktiVendorPhotos.length} / 7
                  </span>
                </div>

                <div 
                  onClick={() => setLightboxState({ isOpen: true, url: buktiVendorPhotos[0], caption: 'Bukti Penyaluran Logistik Vendor' })}
                  className="h-28 rounded-lg bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden relative group cursor-pointer"
                >
                  <img
                    src={buktiVendorPhotos[0]}
                    alt="Bukti Vendor"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-semibold">
                    <ZoomIn className="w-4 h-4" />
                    <span>Perbesar</span>
                  </div>
                </div>

                {/* Sub Thumbnails if > 1 photos */}
                {buktiVendorPhotos.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5">
                    {buktiVendorPhotos.map((photo, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setLightboxState({ isOpen: true, url: photo, caption: `Bukti Vendor #${idx + 1}` })}
                        className="w-8 h-8 rounded border border-slate-300 dark:border-slate-700 overflow-hidden shrink-0 hover:ring-2 hover:ring-blue-500 transition-all"
                      >
                        <img src={photo} alt={`Vendor ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Kategori 3: BAST Serah Terima */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">
                    BAST Serah Terima
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-300">
                    {buktiBastPhotos.length} / 7
                  </span>
                </div>

                <div 
                  onClick={() => setLightboxState({ isOpen: true, url: buktiBastPhotos[0], caption: 'Bukti Berita Acara Serah Terima (BAST)' })}
                  className="h-28 rounded-lg bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden relative group cursor-pointer"
                >
                  <img
                    src={buktiBastPhotos[0]}
                    alt="BAST"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-semibold">
                    <ZoomIn className="w-4 h-4" />
                    <span>Perbesar</span>
                  </div>
                </div>

                {/* Sub Thumbnails if > 1 photos */}
                {buktiBastPhotos.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5">
                    {buktiBastPhotos.map((photo, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setLightboxState({ isOpen: true, url: photo, caption: `BAST #${idx + 1}` })}
                        className="w-8 h-8 rounded border border-slate-300 dark:border-slate-700 overflow-hidden shrink-0 hover:ring-2 hover:ring-blue-500 transition-all"
                      >
                        <img src={photo} alt={`BAST ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Kategori 4: Monitoring Evaluasi */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">
                    Monitoring Evaluasi
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-300">
                    {fotoMonitoringPhotos.length} / 7
                  </span>
                </div>

                <div 
                  onClick={() => setLightboxState({ isOpen: true, url: fotoMonitoringPhotos[0], caption: 'Foto Evaluasi & Monitoring Pemanfaatan' })}
                  className="h-28 rounded-lg bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden relative group cursor-pointer"
                >
                  <img
                    src={fotoMonitoringPhotos[0]}
                    alt="Monitoring"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-semibold">
                    <ZoomIn className="w-4 h-4" />
                    <span>Perbesar</span>
                  </div>
                </div>

                {/* Sub Thumbnails if > 1 photos */}
                {fotoMonitoringPhotos.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5">
                    {fotoMonitoringPhotos.map((photo, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setLightboxState({ isOpen: true, url: photo, caption: `Monitoring #${idx + 1}` })}
                        className="w-8 h-8 rounded border border-slate-300 dark:border-slate-700 overflow-hidden shrink-0 hover:ring-2 hover:ring-blue-500 transition-all"
                      >
                        <img src={photo} alt={`Monitoring ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Activity Log */}
          {bantuan.riwayatAktivitas && bantuan.riwayatAktivitas.length > 0 && (
            <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-2">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
                Riwayat Jejak Audit Perubahan Data
              </h4>
              <div className="space-y-1.5">
                {bantuan.riwayatAktivitas.map(log => (
                  <div key={log.id} className="p-2 bg-slate-50 dark:bg-slate-800/40 rounded border border-slate-200 dark:border-slate-800 text-[11px]">
                    <div className="flex justify-between text-slate-500 text-[10px]">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{log.aktor} ({log.aksi})</span>
                      <span>{log.timestamp}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">{log.keterangan}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal for Enlarged Photo View */}
      <ImageLightboxModal
        isOpen={lightboxState.isOpen}
        imageUrl={lightboxState.url}
        caption={lightboxState.caption}
        onClose={() => setLightboxState({ isOpen: false, url: '', caption: '' })}
      />
    </div>
  );
};
