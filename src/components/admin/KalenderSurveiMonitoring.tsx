/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  BantuanItem,
  JadwalSurveiMonitoringItem,
  JenisKegiatanKalender,
  KategoriBantuan,
  KategoriSumberBantuan,
  StatusJadwalKalender
} from '../../types';
import { WILAYAH_JAWA_TIMUR, WILAYAH_KERJA_KPW_JATIM } from '../../data/initialData';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  Plus,
  Edit3,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Sparkles,
  LayoutDashboard,
  ArrowLeft,
  Eye,
  EyeOff,
  ClipboardCheck,
  X,
  Building2,
  Layers
} from 'lucide-react';

interface KalenderSurveiMonitoringProps {
  jadwalList: JadwalSurveiMonitoringItem[];
  bantuanList: BantuanItem[];
  mode?: 'embedded' | 'top_widget' | 'full_page';
  canEdit?: boolean;
  actorName?: string;
  showOnTopDashboard?: boolean;
  onToggleShowOnTopDashboard?: (show: boolean) => void;
  onSaveJadwal?: (item: JadwalSurveiMonitoringItem) => void;
  onDeleteJadwal?: (id: string) => void;
  onOpenFullPage?: () => void;
  onBackFromFullPage?: () => void;
  onSelectBantuan?: (item: BantuanItem) => void;
}

const JENIS_KEGIATAN_OPTIONS: JenisKegiatanKalender[] = [
  'Survei Asesmen',
  'Monitoring Lapangan',
  'Verifikasi BAST & Fisik',
  'Evaluasi Dampak'
];

const STATUS_JADWAL_OPTIONS: StatusJadwalKalender[] = [
  'Terjadwal',
  'Sedang Berlangsung',
  'Selesai',
  'Dijadwalkan Ulang'
];

const BULAN_INDO = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember'
];

const HARI_SINGKAT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export const KalenderSurveiMonitoring: React.FC<KalenderSurveiMonitoringProps> = ({
  jadwalList,
  bantuanList,
  mode = 'embedded',
  canEdit = true,
  actorName = 'Admin Operasional',
  showOnTopDashboard = true,
  onToggleShowOnTopDashboard,
  onSaveJadwal,
  onDeleteJadwal,
  onOpenFullPage,
  onBackFromFullPage,
  onSelectBantuan
}) => {
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Calendar Month/Year State
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterJenis, setFilterJenis] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterInisiatif, setFilterInisiatif] = useState<string>('ALL');
  const [isCollapsedInRekap, setIsCollapsedInRekap] = useState(false);

  // CRUD Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingJadwal, setEditingJadwal] = useState<JadwalSurveiMonitoringItem | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<JadwalSurveiMonitoringItem | null>(null);

  const [formData, setFormData] = useState<{
    id: string;
    bantuanId: string;
    namaPenerima: string;
    kabupatenKota: string;
    alamat: string;
    jenisKegiatan: JenisKegiatanKalender;
    kategoriInisiatif: KategoriSumberBantuan;
    kategoriBantuan: KategoriBantuan;
    tanggal: string;
    waktuMulai: string;
    waktuSelesai: string;
    picPelaksana: string;
    timPendamping: string;
    statusJadwal: StatusJadwalKalender;
    catatanAgenda: string;
    hasilTemuan: string;
    tampilkanDiDashboardAtas: boolean;
  }>({
    id: '',
    bantuanId: '',
    namaPenerima: '',
    kabupatenKota: 'Kota Surabaya',
    alamat: '',
    jenisKegiatan: 'Survei Asesmen',
    kategoriInisiatif: 'BI Driven',
    kategoriBantuan: 'Edukasi',
    tanggal: todayStr,
    waktuMulai: '09:00',
    waktuSelesai: '12:00',
    picPelaksana: actorName,
    timPendamping: 'Tim EPML KPw BI Prov. Jatim',
    statusJadwal: 'Terjadwal',
    catatanAgenda: '',
    hasilTemuan: '',
    tampilkanDiDashboardAtas: true
  });

  // Filtered schedules
  const filteredJadwal = useMemo(() => {
    return jadwalList
      .filter(item => {
        const q = searchQuery.trim().toLowerCase();
        const matchSearch =
          !q ||
          item.namaPenerima.toLowerCase().includes(q) ||
          item.kabupatenKota.toLowerCase().includes(q) ||
          item.picPelaksana.toLowerCase().includes(q) ||
          item.catatanAgenda.toLowerCase().includes(q) ||
          (item.bantuanId && item.bantuanId.toLowerCase().includes(q));

        const matchJenis = filterJenis === 'ALL' || item.jenisKegiatan === filterJenis;
        const matchStatus = filterStatus === 'ALL' || item.statusJadwal === filterStatus;
        const matchInisiatif =
          filterInisiatif === 'ALL' || (item.kategoriInisiatif || 'BI Driven') === filterInisiatif;

        return matchSearch && matchJenis && matchStatus && matchInisiatif;
      })
      .sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  }, [jadwalList, searchQuery, filterJenis, filterStatus, filterInisiatif]);

  // Calendar grid generation for currentMonthDate
  const calendarDays = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: {
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      events: JadwalSurveiMonitoringItem[];
    }[] = [];

    // Leading days from previous month
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevDate = new Date(year, month - 1, d);
      const yStr = prevDate.getFullYear();
      const mStr = String(prevDate.getMonth() + 1).padStart(2, '0');
      const dStr = String(prevDate.getDate()).padStart(2, '0');
      const fullStr = `${yStr}-${mStr}-${dStr}`;
      cells.push({
        dateStr: fullStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: fullStr === todayStr,
        events: filteredJadwal.filter(j => j.tanggal === fullStr)
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const mStr = String(month + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const fullStr = `${year}-${mStr}-${dStr}`;
      cells.push({
        dateStr: fullStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: fullStr === todayStr,
        events: filteredJadwal.filter(j => j.tanggal === fullStr)
      });
    }

    // Trailing days to complete 35 or 42 grid
    const totalCells = cells.length <= 35 ? 35 : 42;
    const remaining = totalCells - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(year, month + 1, d);
      const yStr = nextDate.getFullYear();
      const mStr = String(nextDate.getMonth() + 1).padStart(2, '0');
      const dStr = String(nextDate.getDate()).padStart(2, '0');
      const fullStr = `${yStr}-${mStr}-${dStr}`;
      cells.push({
        dateStr: fullStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: fullStr === todayStr,
        events: filteredJadwal.filter(j => j.tanggal === fullStr)
      });
    }

    return cells;
  }, [currentMonthDate, filteredJadwal, todayStr]);

  // Displayed events on the right agenda list
  const displayedAgendaList = useMemo(() => {
    if (selectedDateStr) {
      return filteredJadwal.filter(j => j.tanggal === selectedDateStr);
    }
    return filteredJadwal;
  }, [filteredJadwal, selectedDateStr]);

  // Summary counts
  const stats = useMemo(() => {
    const surveiCount = jadwalList.filter(j => j.jenisKegiatan === 'Survei Asesmen').length;
    const monitoringCount = jadwalList.filter(j => j.jenisKegiatan === 'Monitoring Lapangan').length;
    const selesaiCount = jadwalList.filter(j => j.statusJadwal === 'Selesai').length;
    const biDrivenCount = jadwalList.filter(j => (j.kategoriInisiatif || 'BI Driven') === 'BI Driven').length;
    const eksternalCount = jadwalList.filter(j => j.kategoriInisiatif === 'Eksternal').length;
    return {
      total: jadwalList.length,
      surveiCount,
      monitoringCount,
      selesaiCount,
      biDrivenCount,
      eksternalCount
    };
  }, [jadwalList]);

  const handlePrevMonth = () => {
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setSelectedDateStr(null);
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setSelectedDateStr(null);
  };

  const handleOpenCreateModal = (presetDate?: string) => {
    setEditingJadwal(null);
    setFormData({
      id: `JDW-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      bantuanId: '',
      namaPenerima: '',
      kabupatenKota: 'Kota Surabaya',
      alamat: '',
      jenisKegiatan: 'Survei Asesmen',
      kategoriInisiatif: 'BI Driven',
      kategoriBantuan: 'Edukasi',
      tanggal: presetDate || selectedDateStr || todayStr,
      waktuMulai: '09:00',
      waktuSelesai: '12:00',
      picPelaksana: actorName || 'Dimas Wicaksono, S.E.',
      timPendamping: 'Tim EPML KPw BI Prov. Jatim',
      statusJadwal: 'Terjadwal',
      catatanAgenda: '',
      hasilTemuan: '',
      tampilkanDiDashboardAtas: true
    });
    setIsFormOpen(true);
  };

  const handleOpenEditModal = (item: JadwalSurveiMonitoringItem) => {
    setEditingJadwal(item);
    setFormData({
      id: item.id,
      bantuanId: item.bantuanId || '',
      namaPenerima: item.namaPenerima,
      kabupatenKota: item.kabupatenKota,
      alamat: item.alamat || '',
      jenisKegiatan: item.jenisKegiatan,
      kategoriInisiatif: item.kategoriInisiatif || 'BI Driven',
      kategoriBantuan: item.kategoriBantuan || 'Edukasi',
      tanggal: item.tanggal,
      waktuMulai: item.waktuMulai || '09:00',
      waktuSelesai: item.waktuSelesai || '12:00',
      picPelaksana: item.picPelaksana,
      timPendamping: item.timPendamping || '',
      statusJadwal: item.statusJadwal,
      catatanAgenda: item.catatanAgenda,
      hasilTemuan: item.hasilTemuan || '',
      tampilkanDiDashboardAtas: item.tampilkanDiDashboardAtas !== false
    });
    setIsFormOpen(true);
  };

  const handleSelectRecipientInForm = (bantuanId: string) => {
    const found = bantuanList.find(b => b.id === bantuanId);
    if (found) {
      setFormData(prev => ({
        ...prev,
        bantuanId: found.id,
        namaPenerima: found.namaPenerima,
        kabupatenKota: found.kabupatenKota,
        alamat: found.alamat,
        kategoriInisiatif: found.kategoriInisiatif || 'BI Driven',
        kategoriBantuan: found.kategoriBantuan,
        picPelaksana: found.picAsesmen || prev.picPelaksana,
        tanggal: found.tanggalJadwalMonitoring || prev.tanggal,
        catatanAgenda:
          prev.catatanAgenda ||
          `Pelaksanaan survei asesmen & monitoring lapangan untuk ${found.namaPenerima} (${found.detailBantuan}).`
      }));
    } else {
      setFormData(prev => ({ ...prev, bantuanId: '' }));
    }
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.namaPenerima.trim() || !formData.tanggal) return;

    const payload: JadwalSurveiMonitoringItem = {
      id: formData.id || `JDW-${Date.now().toString().slice(-4)}`,
      bantuanId: formData.bantuanId || undefined,
      namaPenerima: formData.namaPenerima.trim(),
      kabupatenKota: formData.kabupatenKota,
      alamat: formData.alamat.trim(),
      jenisKegiatan: formData.jenisKegiatan,
      kategoriInisiatif: formData.kategoriInisiatif,
      kategoriBantuan: formData.kategoriBantuan,
      tanggal: formData.tanggal,
      waktuMulai: formData.waktuMulai,
      waktuSelesai: formData.waktuSelesai,
      picPelaksana: formData.picPelaksana.trim(),
      timPendamping: formData.timPendamping.trim(),
      statusJadwal: formData.statusJadwal,
      catatanAgenda: formData.catatanAgenda.trim(),
      hasilTemuan: formData.hasilTemuan.trim() || undefined,
      tampilkanDiDashboardAtas: formData.tampilkanDiDashboardAtas,
      createdAt: editingJadwal?.createdAt || todayStr,
      updatedAt: todayStr
    };

    if (onSaveJadwal) {
      onSaveJadwal(payload);
    }
    setIsFormOpen(false);
    setEditingJadwal(null);
  };

  const getJenisBadgeStyle = (jenis: JenisKegiatanKalender) => {
    switch (jenis) {
      case 'Survei Asesmen':
        return 'bg-blue-100 text-blue-900 border-blue-200 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800';
      case 'Monitoring Lapangan':
        return 'bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800';
      case 'Verifikasi BAST & Fisik':
        return 'bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800';
      case 'Evaluasi Dampak':
        return 'bg-purple-100 text-purple-900 border-purple-200 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800';
    }
  };

  const getStatusBadgeStyle = (status: StatusJadwalKalender) => {
    switch (status) {
      case 'Selesai':
        return 'bg-emerald-600 text-white';
      case 'Sedang Berlangsung':
        return 'bg-blue-700 text-white';
      case 'Dijadwalkan Ulang':
        return 'bg-amber-500 text-white';
      default:
        return 'bg-slate-800 text-white dark:bg-slate-700';
    }
  };

  // ============================================================================
  // MODE 1: TOP DASHBOARD WIDGET ("dapat ditampilkan ke dashboard atas")
  // ============================================================================
  if (mode === 'top_widget') {
    const highlightedEvents = jadwalList
      .filter(j => j.tampilkanDiDashboardAtas !== false)
      .sort((a, b) => a.tanggal.localeCompare(b.tanggal))
      .slice(0, 4);

    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-blue-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 bg-gradient-to-r from-[#002B66] via-blue-900 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/20">
              <CalendarIcon className="w-4 h-4 text-amber-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-300/30">
                  Jadwal Aktif
                </span>
                <h3 className="text-xs sm:text-sm font-extrabold text-white truncate">
                  Kalender Survei Asesmen & Jadwal Monitoring EPML
                </h3>
              </div>
              <p className="text-[11px] text-blue-100/90 truncate mt-0.5">
                Total {stats.total} Agenda Terjadwal ({stats.surveiCount} Survei Asesmen • {stats.monitoringCount} Monitoring Lapangan • {stats.biDrivenCount} BI Driven • {stats.eksternalCount} Eksternal)
              </p>
            </div>
          </div>

          {onToggleShowOnTopDashboard && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onToggleShowOnTopDashboard(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-xs transition-colors cursor-pointer"
                title="Sembunyikan dari Dashboard"
              >
                <EyeOff className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Horizontal Schedule Cards Strip */}
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50/60 dark:bg-slate-900/50">
          {highlightedEvents.length === 0 ? (
            <div className="col-span-full py-4 text-center text-xs text-slate-500">
              Belum ada jadwal survei asesmen atau monitoring yang ditampilkan di dashboard atas.
            </div>
          ) : (
            highlightedEvents.map(ev => (
              <div
                key={ev.id}
                onClick={() => {
                  if (ev.bantuanId && onSelectBantuan) {
                    const b = bantuanList.find(x => x.id === ev.bantuanId);
                    if (b) onSelectBantuan(b);
                  } else if (onOpenFullPage) {
                    onOpenFullPage();
                  }
                }}
                className="p-3 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 hover:border-blue-500 transition-all shadow-2xs flex flex-col justify-between gap-2 cursor-pointer group"
              >
                <div>
                  <div className="flex items-center justify-between gap-1.5 mb-1.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getJenisBadgeStyle(
                        ev.jenisKegiatan
                      )}`}
                    >
                      {ev.jenisKegiatan}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                        (ev.kategoriInisiatif || 'BI Driven') === 'BI Driven'
                          ? 'bg-blue-900 text-white'
                          : 'bg-teal-700 text-white'
                      }`}
                    >
                      {ev.kategoriInisiatif || 'BI Driven'}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1 group-hover:text-blue-900 dark:group-hover:text-blue-400">
                    {ev.namaPenerima}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                    {ev.catatanAgenda}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-300 font-medium">
                  <span className="inline-flex items-center gap-1 font-mono font-bold text-blue-900 dark:text-blue-300">
                    <CalendarIcon className="w-3 h-3" />
                    {ev.tanggal} ({ev.waktuMulai})
                  </span>
                  <span className="inline-flex items-center gap-1 truncate max-w-[110px]">
                    <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                    {ev.kabupatenKota.replace('Kabupaten ', 'Kab. ')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // MODE 2 & 3: EMBEDDED (IN MENU REKAP) OR FULL STANDALONE PAGE
  // ============================================================================
  return (
    <div
      className={
        mode === 'full_page'
          ? 'min-h-screen bg-slate-100 dark:bg-slate-950 py-6 px-4 sm:px-6 lg:px-8 space-y-6'
          : 'space-y-4'
      }
    >
      <div className={mode === 'full_page' ? 'max-w-7xl mx-auto space-y-5' : 'space-y-4'}>
        {/* Full Page Top Navigation Header */}
        {mode === 'full_page' && (
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {onBackFromFullPage && (
                <button
                  type="button"
                  onClick={onBackFromFullPage}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                  title="Kembali ke Dashboard"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-blue-900 text-white text-[10px] font-extrabold uppercase tracking-wider">
                    Halaman Khusus Kalender EPML
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs font-semibold text-blue-900 dark:text-blue-400">
                    KPw Bank Indonesia Provinsi Jawa Timur
                  </span>
                </div>
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                  Kalender Survei Asesmen & Jadwal Monitoring Penerima Bantuan
                </h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {onBackFromFullPage && (
                <button
                  type="button"
                  onClick={onBackFromFullPage}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Kembali ke Dashboard Utama</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Main Card Container */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          {/* Header Bar */}
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CalendarIcon className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100">
                    Kalender Survei Asesmen & Jadwal Monitoring Lapangan
                  </h3>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold">
                    {stats.total} Jadwal Terdaftar
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Terintegrasi dengan Pencatatan Penerima Bantuan EPML • Dapat ditampilkan di Dashboard
                </p>
              </div>
            </div>

            {/* Action Buttons: Tambah Jadwal (khusus menu navigasi Admin) & Tampil di Dashboard */}
            <div className="flex flex-wrap items-center gap-2">
              {canEdit && onSaveJadwal && (
                <button
                  type="button"
                  onClick={() => handleOpenCreateModal()}
                  className="h-9 px-3.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  title="Tambah Jadwal Survei Asesmen atau Monitoring Baru"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-300" />
                  <span>Tambah Jadwal</span>
                </button>
              )}

              {canEdit && onToggleShowOnTopDashboard && (
                <button
                  type="button"
                  onClick={() => onToggleShowOnTopDashboard(!showOnTopDashboard)}
                  className={`h-9 px-3.5 rounded-lg border text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                    showOnTopDashboard
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                  title="Tampilkan atau sembunyikan kalender pada Dashboard"
                >
                  {showOnTopDashboard ? (
                    <>
                      <Eye className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Tampil di Dashboard: Aktif</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                      <span>Tampil di Dashboard</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {!isCollapsedInRekap && (
            <div className="p-4 sm:p-5 space-y-5">
              {/* Summary KPI Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 font-medium block">Total Agenda</span>
                  <span className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">
                    {stats.total} Jadwal
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/50">
                  <span className="text-[11px] text-blue-800 dark:text-blue-300 font-medium block">
                    Survei Asesmen
                  </span>
                  <span className="text-lg font-extrabold text-blue-950 dark:text-blue-200 tabular-nums">
                    {stats.surveiCount} Kegiatan
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-900/50">
                  <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium block">
                    Monitoring Lapangan
                  </span>
                  <span className="text-lg font-extrabold text-emerald-950 dark:text-emerald-200 tabular-nums">
                    {stats.monitoringCount} Kegiatan
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-900/50">
                  <span className="text-[11px] text-indigo-800 dark:text-indigo-300 font-medium block">
                    Kategori BI Driven
                  </span>
                  <span className="text-lg font-extrabold text-indigo-950 dark:text-indigo-200 tabular-nums">
                    {stats.biDrivenCount} Agenda
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200/70 dark:border-teal-900/50">
                  <span className="text-[11px] text-teal-800 dark:text-teal-300 font-medium block">
                    Kategori Eksternal
                  </span>
                  <span className="text-lg font-extrabold text-teal-950 dark:text-teal-200 tabular-nums">
                    {stats.eksternalCount} Agenda
                  </span>
                </div>
              </div>

              {/* Filter & Search Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari penerima, wilayah, atau PIC..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>

                <select
                  value={filterJenis}
                  onChange={e => setFilterJenis(e.target.value)}
                  className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200"
                >
                  <option value="ALL">Semua Jenis Kegiatan</option>
                  {JENIS_KEGIATAN_OPTIONS.map(j => (
                    <option key={j} value={j}>
                      {j}
                    </option>
                  ))}
                </select>

                <select
                  value={filterInisiatif}
                  onChange={e => setFilterInisiatif(e.target.value)}
                  className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200"
                >
                  <option value="ALL">Semua Kategori Bantuan (BI Driven & Eksternal)</option>
                  <option value="BI Driven">BI Driven</option>
                  <option value="Eksternal">Eksternal</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200"
                >
                  <option value="ALL">Semua Status Jadwal</option>
                  {STATUS_JADWAL_OPTIONS.map(s => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2-Column Layout: Left Monthly Calendar Grid (7 Cols) + Right Agenda List (5 Cols) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Left 7 Cols: Interactive Monthly Calendar */}
                <div className="lg:col-span-7 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                  {/* Month Navigation */}
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {BULAN_INDO[currentMonthDate.getMonth()]} {currentMonthDate.getFullYear()}
                      </h4>
                      {selectedDateStr && (
                        <button
                          type="button"
                          onClick={() => setSelectedDateStr(null)}
                          className="text-[11px] px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-300 font-bold cursor-pointer"
                        >
                          Filter Tanggal: {selectedDateStr} &times;
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handlePrevMonth}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 cursor-pointer"
                        title="Bulan Sebelumnya"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const now = new Date();
                          setCurrentMonthDate(new Date(now.getFullYear(), now.getMonth(), 1));
                          setSelectedDateStr(null);
                        }}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-[11px] font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                      >
                        Bulan Ini
                      </button>
                      <button
                        type="button"
                        onClick={handleNextMonth}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 cursor-pointer"
                        title="Bulan Berikutnya"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Weekday Headers */}
                  <div className="grid grid-cols-7 gap-1.5 text-center mb-1.5">
                    {HARI_SINGKAT.map(hari => (
                      <div
                        key={hari}
                        className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 py-1"
                      >
                        {hari}
                      </div>
                    ))}
                  </div>

                  {/* Days Matrix */}
                  <div className="grid grid-cols-7 gap-1.5">
                    {calendarDays.map(cell => {
                      const isSelected = selectedDateStr === cell.dateStr;
                      const hasEvents = cell.events.length > 0;
                      return (
                        <div
                          key={cell.dateStr}
                          onClick={() =>
                            setSelectedDateStr(prev => (prev === cell.dateStr ? null : cell.dateStr))
                          }
                          className={`min-h-[68px] p-1.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'border-blue-700 bg-blue-50/90 dark:bg-blue-950/70 ring-2 ring-blue-600/30'
                              : cell.isCurrentMonth
                              ? 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-400'
                              : 'border-slate-100 dark:border-slate-900 bg-slate-100/50 dark:bg-slate-900/30 opacity-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                                cell.isToday
                                  ? 'bg-blue-900 text-white'
                                  : 'text-slate-700 dark:text-slate-200'
                              }`}
                            >
                              {cell.dayNumber}
                            </span>
                            {hasEvents && (
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                                {cell.events.length}
                              </span>
                            )}
                          </div>

                          <div className="space-y-1 mt-1">
                            {cell.events.slice(0, 2).map(ev => (
                              <div
                                key={ev.id}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold truncate ${
                                  ev.jenisKegiatan === 'Survei Asesmen'
                                    ? 'bg-blue-900 text-white'
                                    : ev.jenisKegiatan === 'Monitoring Lapangan'
                                    ? 'bg-emerald-700 text-white'
                                    : 'bg-amber-600 text-white'
                                }`}
                                title={`${ev.jenisKegiatan}: ${ev.namaPenerima}`}
                              >
                                {ev.namaPenerima}
                              </div>
                            ))}
                            {cell.events.length > 2 && (
                              <div className="text-[9px] font-bold text-slate-500 pl-1">
                                +{cell.events.length - 2} lagi
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right 5 Cols: Schedule & Assessment Details List */}
                <div className="lg:col-span-5 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col">
                  <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-200/80 dark:border-slate-800">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        {selectedDateStr
                          ? `Daftar Agenda Tanggal ${selectedDateStr}`
                          : 'Daftar Jadwal Survei Asesmen & Monitoring'}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Menampilkan {displayedAgendaList.length} agenda kegiatan lapangan
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                    {displayedAgendaList.length === 0 ? (
                      <div className="py-12 text-center space-y-2">
                        <CalendarIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                          Tidak ada jadwal survei asesmen atau monitoring pada filter ini.
                        </p>
                      </div>
                    ) : (
                      displayedAgendaList.map(item => (
                        <div
                          key={item.id}
                          className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-2 hover:border-blue-400 transition-all"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getJenisBadgeStyle(
                                  item.jenisKegiatan
                                )}`}
                              >
                                {item.jenisKegiatan}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                  (item.kategoriInisiatif || 'BI Driven') === 'BI Driven'
                                    ? 'bg-blue-900 text-white'
                                    : 'bg-teal-700 text-white'
                                }`}
                              >
                                {item.kategoriInisiatif || 'BI Driven'}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusBadgeStyle(
                                  item.statusJadwal
                                )}`}
                              >
                                {item.statusJadwal}
                              </span>
                            </div>

                            {canEdit && (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(item)}
                                  className="p-1.5 rounded-lg text-blue-800 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                  title="Edit Jadwal"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmTarget(item)}
                                  className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                  title="Hapus Jadwal"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>

                          <div>
                            <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                              {item.namaPenerima}
                            </h5>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                              {item.catatanAgenda}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                            <div className="flex items-center gap-1.5 font-mono font-bold text-blue-900 dark:text-blue-300">
                              <Clock className="w-3.5 h-3.5 shrink-0" />
                              <span>
                                {item.tanggal} • {item.waktuMulai}-{item.waktuSelesai}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 truncate">
                              <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                              <span className="truncate">{item.kabupatenKota}</span>
                            </div>
                            <div className="flex items-center gap-1.5 col-span-2 text-slate-500">
                              <User className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                              <span>PIC Asesmen/Monitoring: </span>
                              <strong className="text-slate-800 dark:text-slate-200">
                                {item.picPelaksana}
                              </strong>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================================ */}
      {/* MODAL INPUT / EDIT JADWAL SURVEI ASESMEN & MONITORING */}
      {/* ============================================================================ */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full shadow-2xl overflow-hidden my-6 animate-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-900 text-white flex items-center justify-center">
                  <CalendarIcon className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                    {editingJadwal
                      ? 'Edit Jadwal Survei Asesmen & Monitoring'
                      : 'Tambah Jadwal Survei Asesmen & Monitoring Baru'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Hubungkan dengan data penerima bantuan atau input calon penerima baru
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-5 space-y-4 max-h-[78vh] overflow-y-auto text-xs">
              {/* Link to existing recipient optional */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Pilih dari Daftar Penerima Bantuan Terdaftar (Opsional)
                </label>
                <select
                  value={formData.bantuanId}
                  onChange={e => handleSelectRecipientInForm(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="">-- Input Manual Calon Penerima / Pilih Penerima Terdaftar --</option>
                  {bantuanList.map(b => (
                    <option key={b.id} value={b.id}>
                      [{b.id}] {b.namaPenerima} ({b.kabupatenKota}) — {b.kategoriInisiatif || 'BI Driven'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Lembaga / Penerima Bantuan *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Kelompok Tani Mandiri"
                    value={formData.namaPenerima}
                    onChange={e => setFormData({ ...formData, namaPenerima: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kabupaten / Kota *
                  </label>
                  <select
                    value={formData.kabupatenKota}
                    onChange={e => setFormData({ ...formData, kabupatenKota: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <optgroup label="13 Wilayah Kerja KPw BI Prov. Jatim">
                      {WILAYAH_KERJA_KPW_JATIM.map(w => (
                        <option key={w} value={w}>
                          {w}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Wilayah Jawa Timur Lainnya">
                      {WILAYAH_JAWA_TIMUR.filter(
                        w => !WILAYAH_KERJA_KPW_JATIM.includes(w.nama as any)
                      ).map(w => (
                        <option key={w.nama} value={w.nama}>
                          {w.nama}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Jenis Kegiatan *
                  </label>
                  <select
                    value={formData.jenisKegiatan}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        jenisKegiatan: e.target.value as JenisKegiatanKalender
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                  >
                    {JENIS_KEGIATAN_OPTIONS.map(j => (
                      <option key={j} value={j}>
                        {j}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    PIC Asesmen & Monitoring *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.picPelaksana}
                    onChange={e => setFormData({ ...formData, picPelaksana: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kategori Bantuan *
                  </label>
                  <select
                    value={formData.kategoriInisiatif}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        kategoriInisiatif: e.target.value as KategoriSumberBantuan
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                  >
                    <option value="BI Driven">BI Driven</option>
                    <option value="Eksternal">Eksternal</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Pelaksanaan *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.tanggal}
                    onChange={e => setFormData({ ...formData, tanggal: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Waktu Mulai
                  </label>
                  <input
                    type="time"
                    value={formData.waktuMulai}
                    onChange={e => setFormData({ ...formData, waktuMulai: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status Jadwal
                  </label>
                  <select
                    value={formData.statusJadwal}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        statusJadwal: e.target.value as StatusJadwalKalender
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    {STATUS_JADWAL_OPTIONS.map(s => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Rincian Agenda Survei Asesmen / Monitoring *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Tuliskan agenda pengecekan lapangan, kelayakan lokasi, atau verifikasi fisik bantuan..."
                  value={formData.catatanAgenda}
                  onChange={e => setFormData({ ...formData, catatanAgenda: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.tampilkanDiDashboardAtas}
                  onChange={e =>
                    setFormData({ ...formData, tampilkanDiDashboardAtas: e.target.checked })
                  }
                  className="rounded text-blue-900"
                />
                <span className="font-bold text-blue-950 dark:text-blue-200">
                  Tampilkan agenda ini pada Widget Kalender di Dashboard Atas
                </span>
              </label>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold shadow-xs cursor-pointer"
                >
                  Simpan Jadwal Kalender
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* MODAL KONFIRMASI HAPUS JADWAL */}
      {/* ============================================================================ */}
      {deleteConfirmTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setDeleteConfirmTarget(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/80 text-red-600 flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                apakah benar data ini dihapus ?
              </h4>
              <p className="text-xs text-slate-500">
                Jadwal <strong>{deleteConfirmTarget.jenisKegiatan}</strong> untuk{' '}
                <strong>{deleteConfirmTarget.namaPenerima}</strong> ({deleteConfirmTarget.tanggal}) akan dihapus dari kalender.
              </p>
            </div>
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteJadwal) onDeleteJadwal(deleteConfirmTarget.id);
                  setDeleteConfirmTarget(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer"
              >
                Ya, Hapus Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
