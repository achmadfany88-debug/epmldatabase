/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { BantuanItem, StatusAsesmen } from '../../types';
import {
  Search,
  Truck,
  CheckCircle2,
  ArrowLeft,
  ExternalLink,
  Clock,
  AlertCircle,
  PackageSearch,
  FileCheck2,
  XCircle,
  AlertTriangle,
  MapPin,
  RotateCcw,
  Package
} from 'lucide-react';

interface TrackingSubPageProps {
  bantuanList: BantuanItem[];
  onBackToHome: () => void;
  onSelectBantuan?: (item: BantuanItem) => void;
  onOpenQrScanner?: () => void;
  onOpenWhatsApp?: (item: BantuanItem) => void;
}

const TAHAPAN_ORDER = [
  'Asesmen',
  'Usulan',
  'Pengadaan',
  'Pengiriman',
  'Selesai Dikirim',
  'Barang Diterima',
  'Penjadwalan Monitoring Bantuan'
];

export const TrackingSubPage: React.FC<TrackingSubPageProps> = ({
  bantuanList,
  onBackToHome
}) => {
  const [inputKeyword, setInputKeyword] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');

  // Hasil pencarian HANYA muncul setelah tombol "Lacak" diklik (berdasarkan submittedKeyword)
  const activeKeyword = submittedKeyword.trim();
  const isSearching = activeKeyword.length > 0;

  const matchedResults = useMemo(() => {
    if (!isSearching) return [];
    const q = activeKeyword.toLowerCase();
    return bantuanList.filter(
      item =>
        item.namaPenerima.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q)
    );
  }, [bantuanList, activeKeyword, isSearching]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedKeyword(inputKeyword.trim());
  };

  const handleResetSearch = () => {
    setInputKeyword('');
    setSubmittedKeyword('');
  };

  const getStatusAsesmenStyle = (status: StatusAsesmen) => {
    switch (status) {
      case 'Disetujui':
        return {
          badgeBg: 'bg-[#059669] text-white',
          softBg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/70',
          textColor: 'text-emerald-800 dark:text-emerald-300',
          accentColor: '#059669',
          title: 'Permohonan Bantuan Disetujui — Proses Pengadaan & Distribusi Aktif',
          desc: 'Usulan bantuan telah disetujui secara resmi. Silakan pantau tahapan pengadaan dan pengiriman logistik di bawah ini.'
        };
      case 'Asesmen':
        return {
          badgeBg: 'bg-[#002B66] text-white',
          softBg: 'bg-blue-50/80 dark:bg-blue-950/50 border-[#002B66]/25 dark:border-blue-800/70',
          textColor: 'text-[#002B66] dark:text-blue-300',
          accentColor: '#002B66',
          title: 'Sedang Dalam Tahap Asesmen & Verifikasi Kelayakan',
          desc: 'Permohonan bantuan saat ini sedang dalam proses verifikasi dan asesmen kelayakan sebelum masuk ke tahap persetujuan dan pengadaan.'
        };
      case 'Menunggu Tindak Lanjut':
        return {
          badgeBg: 'bg-[#F59E0B] text-white',
          softBg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/70',
          textColor: 'text-amber-900 dark:text-amber-300',
          accentColor: '#F59E0B',
          title: 'Menunggu Tindak Lanjut Verifikasi / Kelengkapan Dokumen',
          desc: 'Terdapat kelengkapan administrasi atau verifikasi lanjutan yang perlu ditindaklanjuti sebelum pengajuan dapat disetujui ke tahap pengadaan barang/jasa.'
        };
      case 'Ditolak':
        return {
          badgeBg: 'bg-[#DC2626] text-white',
          softBg: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/70',
          textColor: 'text-red-800 dark:text-red-300',
          accentColor: '#DC2626',
          title: 'Permohonan Bantuan Ditolak / Belum Dapat Dipenuhi',
          desc: 'Berdasarkan hasil evaluasi dan asesmen kelayakan, permohonan bantuan ini belum dapat dilanjutkan ke tahap pengadaan.'
        };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Navigation Breadcrumb & Back Button */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToHome}
              className="px-3.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-[#002B66] dark:text-blue-400" />
              <span>Kembali ke Beranda Utama</span>
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
              <span>Beranda</span>
              <span>/</span>
              <span className="font-semibold text-[#002B66] dark:text-blue-400">
                Update Tracking & Lacak Status Bantuan
              </span>
            </div>
          </div>
        </div>

        {/* Hero Resi / Logistics Search Box */}
        <div className="bg-gradient-to-br from-[#002B66] via-blue-900 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-md">
          <div className="max-w-3xl mx-auto text-center space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
              <Truck className="w-4 h-4" />
              <span>Layanan Pelacakan Status & Progres Bantuan EPML</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Cek Progres & Status Penyaluran Bantuan
            </h1>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              Masukkan <strong>Nama Penerima (Lembaga / Kelompok / Komunitas)</strong> atau Nomor Registrasi Bantuan, lalu klik tombol <strong>Lacak</strong> untuk melihat status asesmen serta progres penyaluran secara umum.
            </p>

            {/* Resi-Style Search Input Bar (Hanya mengeksekusi pencarian saat klik tombol Lacak) */}
            <form onSubmit={handleSearchSubmit} className="pt-3">
              <div className="bg-white dark:bg-slate-900 p-2 rounded-xl shadow-lg border border-white/20 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1 flex items-center">
                  <Search className="w-5 h-5 text-slate-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={inputKeyword}
                    onChange={e => setInputKeyword(e.target.value)}
                    placeholder="Ketik Nama Penerima Bantuan (contoh: SMK Budi Utomo, Koperasi Tani Kopi, Komunitas...)"
                    className="w-full h-11 pl-11 pr-4 text-sm font-medium rounded-lg bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {(inputKeyword.trim().length > 0 || isSearching) && (
                    <button
                      type="button"
                      onClick={handleResetSearch}
                      className="h-11 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Bersihkan</span>
                    </button>
                  )}
                  <button
                    type="submit"
                    className="h-11 px-7 rounded-lg bg-[#002B66] hover:bg-blue-800 text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                  >
                    <PackageSearch className="w-4 h-4 text-amber-300" />
                    <span>Lacak</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* STATE 1: BELUM MELAKUKAN PENCARIAN (DATA TIDAK DIMUNCULKAN SEMUA) */}
        {!isSearching && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="max-w-xl mx-auto text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900 text-[#002B66] dark:text-blue-400 flex items-center justify-center mx-auto">
                <PackageSearch className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Ketik Nama Penerima Lalu Klik "Lacak"
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Sistem akan menampilkan informasi umum pelacakan yang memuat <strong>Status Asesmen</strong> (Asesmen, Disetujui, Menunggu Tindak Lanjut, atau Ditolak) beserta tahapan progres pengadaan dan pengiriman bantuan.
              </p>
            </div>

            {/* 4 Status Asesmen Guide Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-[#002B66] shrink-0" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Status: Asesmen</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Permohonan sedang dalam tahap verifikasi dan asesmen kelayakan.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-[#059669] shrink-0" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Status: Disetujui</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Permohonan disetujui dan menampilkan progres tahapan pengadaan hingga pengiriman barang.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-[#F59E0B] shrink-0" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Menunggu Tindak Lanjut</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Memerlukan kelengkapan dokumen atau tindak lanjut evaluasi sebelum dapat disetujui.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-[#DC2626] shrink-0" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Status: Ditolak</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Permohonan belum dapat dipenuhi berdasarkan hasil evaluasi kelayakan asesmen.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STATE 2: HASIL PENCARIAN TRACKING RESI BANTUAN (SETELAH KLIK TOMBOL LACAK) */}
        {isSearching && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <div className="text-xs text-slate-600 dark:text-slate-300">
                Hasil pelacakan untuk kata kunci{' '}
                <strong className="text-slate-900 dark:text-white">"{activeKeyword}"</strong>:{' '}
                <span className="font-bold text-[#002B66] dark:text-blue-400">
                  {matchedResults.length} Data Penerima Ditemukan
                </span>
              </div>
              <button
                type="button"
                onClick={handleResetSearch}
                className="text-xs font-semibold text-blue-900 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Tutup Hasil Pencarian
              </button>
            </div>

            {matchedResults.length === 0 ? (
              <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <AlertCircle className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Nama Penerima Tidak Ditemukan
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Tidak ditemukan data bantuan dengan Nama Penerima atau ID <strong>"{activeKeyword}"</strong>. Pastikan ejaan nama lembaga/kelompok penerima sudah sesuai lalu klik tombol <strong>Lacak</strong>.
                </p>
              </div>
            ) : (
              matchedResults.map(item => {
                const statusInfo = getStatusAsesmenStyle(item.statusAsesmen);
                const currentStageIndex = TAHAPAN_ORDER.indexOf(item.statusTahap);
                const googleMapsUrl = `https://www.google.com/maps?q=${item.latitude},${item.longitude}`;

                return (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden"
                  >
                    {/* Top Resi Header Bar (Tanpa Tombol WA, Tanpa Rincian Dokumen, Tanpa Info Pilar) */}
                    <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                            No. Bantuan: {item.id}
                          </span>
                          <span
                            className={`text-xs font-bold px-3 py-1 rounded-md inline-flex items-center gap-1.5 shadow-2xs ${statusInfo.badgeBg}`}
                          >
                            <span className="w-2 h-2 rounded-full bg-white" />
                            <span>Status Asesmen: {item.statusAsesmen}</span>
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            Tahun {item.tahun} ({item.triwulan})
                          </span>
                        </div>
                        <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                          {item.namaPenerima}
                        </h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            {item.alamat}, <strong>{item.kabupatenKota}</strong>
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Body Content */}
                    <div className="p-5 sm:p-6 space-y-5">
                      {/* Status Asesmen Highlight Banner (Tanpa Informasi Nama PIC Asesmen) */}
                      <div className={`p-4 rounded-xl border ${statusInfo.softBg} flex items-start gap-3.5`}>
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 mt-0.5"
                          style={{ backgroundColor: statusInfo.accentColor }}
                        >
                          {item.statusAsesmen === 'Disetujui' && <FileCheck2 className="w-5 h-5" />}
                          {item.statusAsesmen === 'Asesmen' && <Clock className="w-5 h-5" />}
                          {item.statusAsesmen === 'Menunggu Tindak Lanjut' && (
                            <AlertTriangle className="w-5 h-5" />
                          )}
                          {item.statusAsesmen === 'Ditolak' && <XCircle className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <h4 className={`text-xs sm:text-sm font-extrabold ${statusInfo.textColor}`}>
                            {statusInfo.title}
                          </h4>
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            {statusInfo.desc}
                          </p>
                          {item.catatanKondisiFisik && (
                            <div className="pt-1.5 mt-1.5 border-t border-slate-200/70 dark:border-slate-700/70 text-xs">
                              <span className="font-bold text-slate-700 dark:text-slate-200">
                                Catatan Evaluasi / Tindak Lanjut:{' '}
                              </span>
                              <span className="text-slate-600 dark:text-slate-300">
                                {item.catatanKondisiFisik}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* CONDITIONAL TRACKING SECTION BASED ON STATUS ASESMEN */}
                      {item.statusAsesmen === 'Disetujui' ? (
                        <div className="space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                <Package className="w-4 h-4 text-[#059669]" />
                                <span>Progres Tahapan Pengadaan & Penyaluran Logistik</span>
                              </h4>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Status saat ini berada pada Tahap {currentStageIndex + 1} dari 7 tahapan penyaluran
                              </p>
                            </div>
                            <span className="px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-extrabold text-emerald-800 dark:text-emerald-300">
                              Tahap Aktif: {item.statusTahap}
                            </span>
                          </div>

                          {/* 7-Stage Visual Stepper */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                            {TAHAPAN_ORDER.map((stage, idx) => {
                              const isCompleted = idx < currentStageIndex;
                              const isCurrent = idx === currentStageIndex;

                              return (
                                <div
                                  key={stage}
                                  className={`p-3 rounded-xl border text-xs flex flex-col justify-between transition-all ${
                                    isCurrent
                                      ? 'bg-[#059669] text-white border-[#059669] shadow-sm ring-2 ring-emerald-500/20'
                                      : isCompleted
                                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/70 text-emerald-950 dark:text-emerald-300 font-semibold'
                                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[10px] font-mono font-bold opacity-80">
                                      TAHAP 0{idx + 1}
                                    </span>
                                    {isCompleted ? (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                    ) : isCurrent ? (
                                      <Clock className="w-4 h-4 text-white animate-pulse" />
                                    ) : null}
                                  </div>
                                  <span className="text-[11px] font-bold leading-snug">{stage}</span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Riwayat Logistik (Tanpa Menampilkan Nama Aktor/PIC) */}
                          {item.riwayatAktivitas && item.riwayatAktivitas.length > 0 && (
                            <div className="bg-slate-50 dark:bg-slate-800/30 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-3">
                              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                Riwayat Pembaruan Status & Logistik
                              </h5>
                              <div className="space-y-2.5">
                                {item.riwayatAktivitas
                                  .slice()
                                  .reverse()
                                  .map((log, index) => (
                                    <div
                                      key={log.id || `${log.aksi}-${index}`}
                                      className="flex items-start gap-3 text-xs"
                                    >
                                      <div className="flex flex-col items-center mt-1">
                                        <span
                                          className={`w-2.5 h-2.5 rounded-full ${
                                            index === 0 ? 'bg-[#059669] ring-4 ring-emerald-500/20' : 'bg-slate-300 dark:bg-slate-600'
                                          }`}
                                        />
                                      </div>
                                      <div className="flex-1 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                        <div>
                                          <span className="font-bold text-slate-900 dark:text-white">
                                            {log.aksi}
                                          </span>
                                          <span className="text-slate-400 mx-1.5">&bull;</span>
                                          <span className="text-slate-600 dark:text-slate-300">
                                            {log.keterangan}
                                          </span>
                                        </div>
                                        <div className="text-[11px] text-slate-400 shrink-0 tabular-nums">
                                          {log.timestamp}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* JIKA STATUS ASESMEN = ASESMEN / MENUNGGU TINDAK LANJUT / DITOLAK */
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                              Status Tahapan Pengadaan Barang / Jasa
                            </span>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              {item.statusAsesmen === 'Asesmen' &&
                                'Menunggu Penyelesaian Tahap Asesmen & Persetujuan Resmi'}
                              {item.statusAsesmen === 'Menunggu Tindak Lanjut' &&
                                'Tahap Pengadaan Ditangguhkan Sementara — Menunggu Tindak Lanjut Evaluasi'}
                              {item.statusAsesmen === 'Ditolak' &&
                                'Tahap Pengadaan Tidak Dilanjutkan (Permohonan Ditolak)'}
                            </p>
                            <p className="text-xs text-slate-500">
                              Tahap Pengadaan, Pengiriman, hingga Serah Terima Barang hanya aktif bagi permohonan dengan Status Asesmen <strong>Disetujui</strong>.
                            </p>
                          </div>
                          <div className="shrink-0">
                            <span
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 ${statusInfo.badgeBg}`}
                            >
                              <span>Posisi Saat Ini: {item.statusAsesmen}</span>
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Bottom Metadata Summary Grid (Informasi Umum) */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 text-xs bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="space-y-1">
                          <span className="text-slate-500 text-[11px] block">Rincian Paket Bantuan:</span>
                          <p className="font-bold text-slate-900 dark:text-slate-100">
                            {item.bentukBantuan === 'Barang' ? item.jenisBarang : 'Jasa'}: {item.detailBantuan}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Volume: <strong>{item.qty} {item.satuan}</strong>
                          </p>
                        </div>

                        <div className="space-y-1">
                          <span className="text-slate-500 text-[11px] block">Kondisi Fisik Bantuan:</span>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">
                            Status Fisik:{' '}
                            <strong
                              className={
                                item.statusKondisiFisik === 'Baik & Lengkap'
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : 'text-amber-700 dark:text-amber-400'
                              }
                            >
                              {item.statusKondisiFisik}
                            </strong>
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Tahun Penyaluran: <strong>{item.tahun} ({item.triwulan})</strong>
                          </p>
                        </div>

                        <div className="space-y-1">
                          <span className="text-slate-500 text-[11px] block">Lokasi Penerima:</span>
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-slate-800 dark:text-slate-200">
                              {item.alamat}, {item.kabupatenKota}
                            </p>
                            <a
                              href={googleMapsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#002B66] dark:text-blue-400 hover:bg-blue-50 shrink-0"
                              title="Buka Koordinat di Google Maps"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
