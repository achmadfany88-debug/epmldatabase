/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { SystemAuditLog } from '../../types';
import {
  Activity,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Coins,
  UserCheck,
  Trash2,
  FileText,
  Clock,
  Globe,
  User,
  ArrowUpRight,
  Database,
  Sparkles,
  Filter,
  FolderOpen,
  CloudUpload
} from 'lucide-react';

interface CriticalAuditTimelineWidgetProps {
  auditLogs: SystemAuditLog[];
  onViewAllAuditLogs?: () => void;
  maxItems?: number;
  compact?: boolean;
}

type TimelineFilterCategory = 'ALL' | 'DATA_MUTATION' | 'QR_MONITORING' | 'SECURITY_ACCESS' | 'ALERT_ONLY';

interface EnrichedAuditEvent {
  log: SystemAuditLog;
  category: TimelineFilterCategory;
  categoryLabel: string;
  actionLabel: string;
  shortLabel: string;
  severityLevel: 'CRITICAL' | 'WARNING' | 'NORMAL';
  changeSummary: string;
  impactScope: string;
}

function formatFallbackAction(rawAksi: string): string {
  if (!rawAksi) return 'Aktivitas Sistem';
  return rawAksi
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase());
}

function classifyAuditLog(log: SystemAuditLog): EnrichedAuditEvent {
  const aksi = (log.aksi || '').toUpperCase().trim();

  let category: TimelineFilterCategory = 'DATA_MUTATION';
  let categoryLabel = 'Perubahan Data & Konfigurasi';
  let actionLabel = formatFallbackAction(aksi);
  let shortLabel = formatFallbackAction(aksi);
  let severityLevel: 'CRITICAL' | 'WARNING' | 'NORMAL' =
    log.status === 'FAILED' ? 'CRITICAL' : log.status === 'WARNING' ? 'WARNING' : 'NORMAL';
  let impactScope = 'Database Master EPML';

  if (aksi.includes('YEAR_ARCHIVE') || aksi.includes('ARCHIVE_FOLDER')) {
    category = 'DATA_MUTATION';
    categoryLabel = 'Otomatisasi Folder Cloud Drive';
    actionLabel = 'Pembuatan Folder Tahun Anggaran';
    shortLabel = 'Folder Tahun Drive';
    impactScope = 'Arsip Foto & Video Google Drive';
  } else if (aksi.includes('DRIVE') || aksi.includes('CLOUD') || aksi.includes('SYNC')) {
    category = 'DATA_MUTATION';
    categoryLabel = 'Sinkronisasi & Backup Cloud';
    actionLabel = 'Sinkronisasi Cadangan Google Drive';
    shortLabel = 'Sinkron Cloud Drive';
    impactScope = 'Konfigurasi & Backup Cloud';
  } else if (aksi.includes('QR') || aksi.includes('FISIK') || aksi.includes('MONITORING') || aksi.includes('STICKER')) {
    category = 'QR_MONITORING';
    categoryLabel = 'Verifikasi QR & Fisik Barang';
    if (aksi === 'SCAN_QR_VERIFIKASI') {
      actionLabel = 'Scan QR & Update Kondisi Fisik';
      shortLabel = 'Scan QR & Fisik';
    } else if (aksi === 'UPDATE_KONDISI_FISIK') {
      actionLabel = 'Pembaruan Kondisi Fisik Barang';
      shortLabel = 'Update Kondisi Fisik';
    } else if (aksi.includes('STICKER') || aksi.includes('PRINT')) {
      actionLabel = 'Cetak Stiker QR Inventaris';
      shortLabel = 'Cetak Stiker QR';
    } else {
      actionLabel = 'Verifikasi QR Penerima';
      shortLabel = 'Verifikasi QR';
    }
    impactScope = 'Tracking & Monitoring Fisik Bantuan';
  } else if (
    aksi.includes('USER') ||
    aksi.includes('LOGIN') ||
    aksi.includes('LOGOUT') ||
    aksi.includes('2FA') ||
    aksi.includes('VERIFY_USER')
  ) {
    category = 'SECURITY_ACCESS';
    categoryLabel = 'Otorisasi & Keamanan Akun';
    if (aksi === 'UPDATE_USER_ACCESS' || aksi === 'UPDATE_USER') {
      actionLabel = 'Perubahan Hak Akses Menu';
      shortLabel = 'Hak Akses Akun';
    } else if (aksi === 'DELETE_USER') {
      actionLabel = 'Penghapusan Akun Pengguna';
      shortLabel = 'Hapus Akun';
    } else if (aksi === 'CREATE_USER_ACCOUNT' || aksi === 'CREATE_USER') {
      actionLabel = 'Pembuatan Akun Pengguna Baru';
      shortLabel = 'Tambah Akun Baru';
    } else if (aksi === 'VERIFY_USER') {
      actionLabel = 'Verifikasi Akun Pengguna';
      shortLabel = 'Verifikasi Akun';
    } else if (aksi === 'LOGIN_FAILED' || aksi === 'LOGIN_BLOCKED') {
      actionLabel = 'Percobaan Login Ditolak';
      shortLabel = 'Login Ditolak';
    } else if (aksi === 'LOGOUT') {
      actionLabel = 'Logout Sesi Pengguna';
      shortLabel = 'Logout Pengguna';
    } else {
      actionLabel = 'Otentikasi Sesi Pengguna';
      shortLabel = 'Login Pengguna';
    }
    impactScope = 'Manajemen Pengguna & Hak Akses';
    if (aksi.includes('DELETE') || aksi.includes('FAILED') || aksi.includes('BLOCKED')) {
      severityLevel = 'CRITICAL';
    }
  } else if (aksi.includes('PAGU')) {
    category = 'DATA_MUTATION';
    categoryLabel = 'Perubahan Pagu Anggaran';
    actionLabel = 'Penyesuaian Pagu Tahunan';
    shortLabel = 'Penyesuaian Pagu';
    impactScope = 'Alokasi Anggaran 13 Wilayah Kerja';
    severityLevel = 'WARNING';
  } else if (aksi.includes('DELETE')) {
    category = 'DATA_MUTATION';
    categoryLabel = 'Penghapusan Entitas Data';
    if (aksi === 'DELETE_BANTUAN') {
      actionLabel = 'Hapus Data Penerima Bantuan';
      shortLabel = 'Hapus Penerima';
    } else if (aksi === 'DELETE_VENDOR') {
      actionLabel = 'Hapus Data Rekanan Vendor';
      shortLabel = 'Hapus Vendor';
    } else if (aksi === 'DELETE_ARTIKEL') {
      actionLabel = 'Hapus Artikel & Berita';
      shortLabel = 'Hapus Artikel';
    } else {
      actionLabel = 'Penghapusan Data Sistem';
      shortLabel = 'Hapus Data';
    }
    impactScope = 'Rekapitulasi & Direktori Utama';
    severityLevel = 'CRITICAL';
  } else if (aksi.includes('ARTIKEL') || aksi.includes('BERITA') || aksi.includes('PUBLIKASI')) {
    category = 'DATA_MUTATION';
    categoryLabel = 'Manajemen Publikasi & Berita';
    if (aksi.includes('CREATE') || aksi.includes('ADD')) {
      actionLabel = 'Publikasi Artikel & Berita Baru';
      shortLabel = 'Tambah Artikel';
    } else {
      actionLabel = 'Pembaruan Artikel & Berita';
      shortLabel = 'Update Artikel';
    }
    impactScope = 'Publikasi & Dokumentasi Kegiatan';
  } else if (aksi.includes('VENDOR')) {
    category = 'DATA_MUTATION';
    categoryLabel = 'Manajemen Rekanan Vendor';
    if (aksi === 'CREATE_VENDOR') {
      actionLabel = 'Registrasi Vendor Baru';
      shortLabel = 'Tambah Vendor';
    } else {
      actionLabel = 'Pembaruan Data & Kontrak Vendor';
      shortLabel = 'Update Vendor';
    }
    impactScope = 'Direktori Vendor & Kontrak SPK';
  } else if (aksi.includes('BANTUAN') || aksi.includes('IMPORT')) {
    category = 'DATA_MUTATION';
    categoryLabel = 'Rekapitulasi Penerima Bantuan';
    if (aksi === 'CREATE_BANTUAN') {
      actionLabel = 'Penambahan Penerima Baru';
      shortLabel = 'Tambah Penerima';
    } else if (aksi === 'BULK_IMPORT_BANTUAN_CSV' || aksi.includes('IMPORT')) {
      actionLabel = 'Impor Massal CSV Penerima';
      shortLabel = 'Impor CSV Massal';
    } else {
      actionLabel = 'Pembaruan Data Penerima';
      shortLabel = 'Update Penerima';
    }
    impactScope = 'Pencatatan & Rekapitulasi Penerima';
  } else if (
    aksi.includes('EXPORT') ||
    aksi.includes('RESTORE') ||
    aksi.includes('BACKUP') ||
    aksi.includes('CONFIG') ||
    aksi.includes('LANDING') ||
    aksi.includes('HERO')
  ) {
    category = 'DATA_MUTATION';
    categoryLabel = 'Sistem, Laporan & Cadangan';
    if (aksi.includes('EXPORT')) {
      actionLabel = 'Ekspor Laporan Resmi';
      shortLabel = 'Ekspor Laporan';
    } else if (aksi.includes('RESTORE')) {
      actionLabel = 'Pemulihan Database Cadangan';
      shortLabel = 'Pulihkan Backup';
    } else if (aksi.includes('BACKUP')) {
      actionLabel = 'Unduh Cadangan Database';
      shortLabel = 'Unduh Backup';
    } else if (aksi.includes('LANDING') || aksi.includes('HERO')) {
      actionLabel = 'Kustomisasi Media Landing Page';
      shortLabel = 'Update Landing Page';
    } else {
      actionLabel = 'Pembaruan Konfigurasi Sistem';
      shortLabel = 'Konfigurasi Sistem';
    }
    impactScope = 'Konfigurasi & Pelaporan Audit';
  }

  return {
    log,
    category,
    categoryLabel,
    actionLabel,
    shortLabel,
    severityLevel,
    changeSummary: log.detail,
    impactScope
  };
}

export const CriticalAuditTimelineWidget: React.FC<CriticalAuditTimelineWidgetProps> = ({
  auditLogs,
  onViewAllAuditLogs,
  maxItems = 10
}) => {
  const [selectedCategory, setSelectedCategory] = useState<TimelineFilterCategory>('ALL');
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const [pinnedEventId, setPinnedEventId] = useState<string | null>(null);

  const enrichedLogs = useMemo(() => {
    return auditLogs.map(classifyAuditLog);
  }, [auditLogs]);

  const filteredEvents = useMemo(() => {
    const filtered = enrichedLogs.filter(item => {
      if (selectedCategory === 'ALL') return true;
      if (selectedCategory === 'ALERT_ONLY') {
        return item.log.status === 'WARNING' || item.log.status === 'FAILED' || item.severityLevel !== 'NORMAL';
      }
      return item.category === selectedCategory;
    });
    return filtered.slice(0, maxItems);
  }, [enrichedLogs, selectedCategory, maxItems]);

  // Active inspected event (hovered takes priority, fallback to pinned, fallback to most recent event)
  const activeEvent = useMemo(() => {
    const targetId = hoveredEventId || pinnedEventId;
    if (targetId) {
      const found = filteredEvents.find(e => e.log.id === targetId);
      if (found) return found;
    }
    return filteredEvents[0] || null;
  }, [filteredEvents, hoveredEventId, pinnedEventId]);

  const stats = useMemo(() => {
    const warningOrFailed = enrichedLogs.filter(
      e => e.log.status === 'WARNING' || e.log.status === 'FAILED' || e.severityLevel !== 'NORMAL'
    ).length;
    const uniqueUsers = new Set(enrichedLogs.map(e => e.log.username)).size;
    const qrVerifications = enrichedLogs.filter(e => e.category === 'QR_MONITORING').length;
    return {
      total: enrichedLogs.length,
      warningOrFailed,
      uniqueUsers,
      qrVerifications
    };
  }, [enrichedLogs]);

  const getEventIcon = (event: EnrichedAuditEvent) => {
    const aksi = event.log.aksi.toUpperCase();
    if (event.log.status === 'FAILED') return <ShieldAlert className="w-4 h-4 shrink-0" />;
    if (aksi.includes('DELETE')) return <Trash2 className="w-4 h-4 shrink-0" />;
    if (aksi.includes('YEAR_ARCHIVE') || aksi.includes('ARCHIVE_FOLDER')) return <FolderOpen className="w-4 h-4 shrink-0" />;
    if (aksi.includes('DRIVE') || aksi.includes('SYNC')) return <CloudUpload className="w-4 h-4 shrink-0" />;
    if (aksi.includes('QR') || aksi.includes('FISIK')) return <QrCode className="w-4 h-4 shrink-0" />;
    if (aksi.includes('PAGU')) return <Coins className="w-4 h-4 shrink-0" />;
    if (aksi.includes('USER') || aksi.includes('LOGIN')) return <UserCheck className="w-4 h-4 shrink-0" />;
    if (aksi.includes('EXPORT') || aksi.includes('ARTIKEL')) return <FileText className="w-4 h-4 shrink-0" />;
    if (event.log.status === 'WARNING') return <AlertTriangle className="w-4 h-4 shrink-0" />;
    return <Database className="w-4 h-4 shrink-0" />;
  };

  const getInitials = (name: string) => {
    const clean = name.replace(/\(@.*?\)/g, '').trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase() || 'AD';
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      {/* Top Header Strip */}
      <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-50/90 via-white to-blue-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/20">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#002B66] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
            <Activity className="w-5 h-5 text-amber-300" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                Timeline Visualisasi Audit Log Kritikal Sistem
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-blue-100/80 dark:bg-blue-950 text-[#002B66] dark:text-blue-300 border border-blue-200/80 dark:border-blue-800">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Hover Inspeksi Perubahan</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              Arahkan kursor (hover) atau klik pada kartu kronologis untuk melihat pengguna spesifik, IP, dan rincian perubahan data.
            </p>
          </div>
        </div>

        {/* Summary KPI Badges & Action */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Total Log:</span>
            <span className="font-mono font-extrabold text-slate-900 dark:text-slate-100">{stats.total}</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/70 text-xs flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="text-amber-800 dark:text-amber-300 font-semibold">Kritikal / Warning:</span>
            <span className="font-mono font-extrabold text-amber-900 dark:text-amber-200">
              {stats.warningOrFailed}
            </span>
          </div>

          {onViewAllAuditLogs && (
            <button
              type="button"
              onClick={onViewAllAuditLogs}
              className="px-3.5 py-1.5 rounded-xl bg-[#002B66] hover:bg-blue-800 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <span>Buka Tabel Audit Penuh</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Bar */}
      <div className="px-5 sm:px-6 py-3 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3" />
            <span>Filter Kejadian:</span>
          </span>
          {(
            [
              { id: 'ALL', label: 'Semua Kejadian' },
              { id: 'DATA_MUTATION', label: 'Perubahan Data & Pagu' },
              { id: 'QR_MONITORING', label: 'Scan QR & Kondisi Fisik' },
              { id: 'SECURITY_ACCESS', label: 'Akses & Keamanan Akun' },
              { id: 'ALERT_ONLY', label: 'Peringatan / Kritikal' }
            ] as { id: TimelineFilterCategory; label: string }[]
          ).map(tab => {
            const isActive = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(tab.id);
                  setHoveredEventId(null);
                  setPinnedEventId(null);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#002B66] text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-blue-400'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 shrink-0">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span>Sukses / Terverifikasi</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <span>Perubahan Sensitif / Warning</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
            <span>Ditolak / Kritikal</span>
          </span>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="p-5 sm:p-6 space-y-5">
        {/* 1. Proportional Timeline Node Cards Grid */}
        {filteredEvents.length > 0 ? (
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-semibold px-0.5">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-800 dark:text-blue-400 shrink-0" />
                <span>Alur Kronologis Kejadian Terbaru (Urutan Terbaru #1 &rarr; Terdahulu)</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Menampilkan {filteredEvents.length} aktivitas terakhir • Hover / Klik kartu untuk detail
              </span>
            </div>

            <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
                {filteredEvents.map((ev, index) => {
                  const isSelected = activeEvent?.log.id === ev.log.id;
                  const isCritical = ev.log.status === 'FAILED' || ev.severityLevel === 'CRITICAL';
                  const isWarning = ev.log.status === 'WARNING' || ev.severityLevel === 'WARNING';

                  const nodeColorClass = isCritical
                    ? 'bg-rose-600 text-white border-rose-200 dark:border-rose-900'
                    : isWarning
                    ? 'bg-amber-500 text-white border-amber-200 dark:border-amber-900'
                    : 'bg-emerald-600 text-white border-emerald-200 dark:border-emerald-900';

                  const badgeColorClass = isCritical
                    ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                    : isWarning
                    ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';

                  const shortTime = ev.log.timestamp.replace(' WIB', '').trim();
                  const cleanActor = ev.log.username.split('(')[0].trim();

                  return (
                    <div
                      key={ev.log.id}
                      onMouseEnter={() => setHoveredEventId(ev.log.id)}
                      onMouseLeave={() => setHoveredEventId(null)}
                      onClick={() =>
                        setPinnedEventId(prev => (prev === ev.log.id ? null : ev.log.id))
                      }
                      className={`group min-w-0 overflow-hidden flex flex-col justify-between p-3 rounded-xl border cursor-pointer transition-all select-none ${
                        isSelected
                          ? 'bg-white dark:bg-slate-900 border-[#002B66] dark:border-blue-500 ring-2 ring-[#002B66]/20 dark:ring-blue-500/30 shadow-xs'
                          : 'bg-white/80 dark:bg-slate-900/70 border-slate-200/90 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900 hover:border-blue-300 dark:hover:border-slate-700'
                      }`}
                    >
                      {/* Top Row: Icon + Sequence Badge */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div
                          className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-transform ${nodeColorClass} ${
                            isSelected ? 'scale-105' : 'group-hover:scale-105'
                          }`}
                        >
                          {getEventIcon(ev)}
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-extrabold border shrink-0 ${
                            index === 0
                              ? 'bg-[#002B66] text-white border-[#002B66]'
                              : badgeColorClass
                          }`}
                        >
                          {index === 0 ? 'TERBARU' : `#${index + 1}`}
                        </span>
                      </div>

                      {/* Middle Row: Action Label & Target */}
                      <div className="min-w-0 space-y-1">
                        <p
                          className="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate"
                          title={ev.actionLabel}
                        >
                          {ev.shortLabel}
                        </p>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="inline-block max-w-full truncate px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700"
                            title={ev.log.target}
                          >
                            {ev.log.target}
                          </span>
                        </div>
                      </div>

                      {/* Bottom Row: Actor & Timestamp */}
                      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 min-w-0 space-y-0.5">
                        <p
                          className="text-[11px] text-[#002B66] dark:text-blue-300 font-bold truncate"
                          title={ev.log.username}
                        >
                          {cleanActor}
                        </p>
                        <p className="text-[10px] font-mono text-slate-400 truncate">
                          {shortTime}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
            Tidak ada catatan log audit untuk kategori filter yang dipilih.
          </div>
        )}

        {/* 2. Split View: Live Hover Inspector Panel (Left 5 cols) + Chronological Event Stream (Right 7 cols) */}
        {activeEvent && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Left Column: Dedicated Hover Inspector Card (Shows Specific User & Exact Changes Made) */}
            <div className="lg:col-span-5 bg-gradient-to-br from-[#002B66] to-slate-900 text-white rounded-2xl p-5 shadow-md border border-blue-900/60 flex flex-col justify-between gap-4 relative overflow-hidden">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3 border-b border-white/15 pb-3.5">
                  <div className="min-w-0">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-amber-300 font-bold">
                      <Sparkles className="w-3 h-3 shrink-0" />
                      <span className="truncate">Detail Inspeksi Log ({activeEvent.log.id})</span>
                    </span>
                    <h4 className="text-base font-extrabold text-white mt-1 leading-snug break-words">
                      {activeEvent.actionLabel}
                    </h4>
                    <span className="text-[11px] text-blue-200 block mt-0.5">
                      Kategori: {activeEvent.categoryLabel}
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider shrink-0 ${
                      activeEvent.log.status === 'SUCCESS'
                        ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
                        : activeEvent.log.status === 'WARNING'
                        ? 'bg-amber-500/25 text-amber-200 border border-amber-400/40'
                        : 'bg-rose-500/30 text-rose-200 border border-rose-400/40'
                    }`}
                  >
                    {activeEvent.log.status}
                  </span>
                </div>

                {/* Specific User Who Performed the Action */}
                <div className="p-3.5 rounded-xl bg-white/10 border border-white/15 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider text-blue-200 font-bold">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-amber-300 shrink-0" />
                      <span>Identitas Pengguna Pelaksana</span>
                    </span>
                    <span className="font-mono shrink-0">{activeEvent.log.role}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs">
                      {getInitials(activeEvent.log.username)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-extrabold text-white truncate">
                        {activeEvent.log.username}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-blue-200 font-mono mt-0.5">
                        <span className="inline-flex items-center gap-1">
                          <Globe className="w-3 h-3 text-blue-300 shrink-0" />
                          <span>{activeEvent.log.ipAddress}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Specific Changes Made & Target Entity */}
                <div className="p-3.5 rounded-xl bg-slate-950/50 border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider text-amber-300 font-bold">
                    <span className="shrink-0">Rincian Perubahan Data</span>
                    <span className="font-mono text-blue-200 truncate" title={activeEvent.log.aksi}>
                      {activeEvent.log.aksi}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-start justify-between gap-3 py-1 border-b border-white/10">
                      <span className="text-blue-200/80 shrink-0">Entitas Target:</span>
                      <span className="font-mono font-bold text-white text-right break-words min-w-0">
                        {activeEvent.log.target}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-3 py-1 border-b border-white/10">
                      <span className="text-blue-200/80 shrink-0">Cakupan Modul:</span>
                      <span className="font-semibold text-emerald-300 text-right">
                        {activeEvent.impactScope}
                      </span>
                    </div>
                    <div className="pt-1">
                      <span className="text-[10px] uppercase tracking-wider text-blue-200/80 block mb-1">
                        Deskripsi Perubahan Spesifik:
                      </span>
                      <p className="text-xs text-white bg-white/5 p-2.5 rounded-lg border border-white/10 leading-relaxed font-medium break-words">
                        {activeEvent.changeSummary}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timestamp Footer */}
              <div className="flex items-center justify-between text-[11px] text-blue-200 pt-2 border-t border-white/10">
                <span className="inline-flex items-center gap-1.5 font-mono">
                  <Clock className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>{activeEvent.log.timestamp}</span>
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300 font-semibold">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span>Tercatat Permanen</span>
                </span>
              </div>
            </div>

            {/* Right Column: Interactive Vertical Timeline Feed */}
            <div className="lg:col-span-7 space-y-2.5 max-h-[450px] overflow-y-auto pr-1">
              {filteredEvents.map((ev, idx) => {
                const isActive = activeEvent?.log.id === ev.log.id;
                const isCritical = ev.log.status === 'FAILED' || ev.severityLevel === 'CRITICAL';
                const isWarning = ev.log.status === 'WARNING' || ev.severityLevel === 'WARNING';

                return (
                  <div
                    key={ev.log.id}
                    onMouseEnter={() => setHoveredEventId(ev.log.id)}
                    onMouseLeave={() => setHoveredEventId(null)}
                    onClick={() =>
                      setPinnedEventId(prev => (prev === ev.log.id ? null : ev.log.id))
                    }
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                      isActive
                        ? 'bg-blue-50/70 dark:bg-blue-950/40 border-[#002B66] dark:border-blue-500 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Left Timeline Status Indicator */}
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          isCritical
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300'
                            : isWarning
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                        }`}
                      >
                        {getEventIcon(ev)}
                      </div>

                      {/* Main Event Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2 min-w-0">
                            <span className="text-[10px] font-mono font-bold text-slate-400">
                              #{idx + 1}
                            </span>
                            <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                              {ev.actionLabel}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-blue-900 dark:text-blue-300 border border-slate-200 dark:border-slate-700 max-w-full truncate">
                              {ev.log.target}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">
                            {ev.log.timestamp}
                          </span>
                        </div>

                        {/* Specific Changes Made */}
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-snug break-words">
                          {ev.changeSummary}
                        </p>

                        {/* User & Role Footer */}
                        <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="inline-flex items-center gap-1 font-bold text-[#002B66] dark:text-blue-300 truncate">
                              <User className="w-3 h-3 shrink-0" />
                              <span className="truncate">{ev.log.username}</span>
                            </span>
                            <span className="text-slate-300 dark:text-slate-700">•</span>
                            <span className="text-slate-500 dark:text-slate-400 font-medium shrink-0">
                              {ev.log.role}
                            </span>
                          </div>
                          <span className="font-mono text-[10px] text-slate-400 shrink-0">
                            IP: {ev.log.ipAddress}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
