/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { BantuanItem, StatusAsesmen } from '../../types';
import {
  BarChart3,
  PieChart as PieChartIcon,
  Layers,
  Coins,
  Users,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface BantuanChartsPanelProps {
  bantuanList: BantuanItem[];
  defaultCollapsed?: boolean;
  title?: string;
}

type MetricMode = 'COUNT' | 'NOMINAL';
type JenisDimension = 'SPESIFIK' | 'PILAR' | 'BENTUK' | 'INISIATIF';
type BarDisplayMode = 'TOTAL' | 'STACKED_STATUS';

const STATUS_ASESMEN_CONFIG: {
  status: StatusAsesmen;
  label: string;
  colorName: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
}[] = [
  {
    status: 'Asesmen',
    label: 'Asesmen',
    colorName: 'Biru Navy',
    color: '#002B66',
    badgeBg: 'bg-[#002B66]/10 dark:bg-blue-950/70',
    badgeText: 'text-[#002B66] dark:text-blue-300',
    borderColor: 'border-[#002B66]/20 dark:border-blue-800/60'
  },
  {
    status: 'Disetujui',
    label: 'Disetujui',
    colorName: 'Hijau',
    color: '#059669',
    badgeBg: 'bg-emerald-500/10 dark:bg-emerald-950/60',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    borderColor: 'border-emerald-500/20 dark:border-emerald-800/60'
  },
  {
    status: 'Menunggu Tindak Lanjut',
    label: 'Menunggu Tindak Lanjut',
    colorName: 'Kuning Jeruk',
    color: '#F59E0B',
    badgeBg: 'bg-amber-500/15 dark:bg-amber-950/60',
    badgeText: 'text-amber-800 dark:text-amber-300',
    borderColor: 'border-amber-500/25 dark:border-amber-800/60'
  },
  {
    status: 'Ditolak',
    label: 'Ditolak',
    colorName: 'Merah',
    color: '#DC2626',
    badgeBg: 'bg-red-500/10 dark:bg-red-950/60',
    badgeText: 'text-red-700 dark:text-red-300',
    borderColor: 'border-red-500/20 dark:border-red-800/60'
  }
];

const JENIS_COLORS = [
  '#002B66',
  '#059669',
  '#0284C7',
  '#0D9488',
  '#2563EB',
  '#4F46E5',
  '#D97706',
  '#E11D48',
  '#475569'
];

export const BantuanChartsPanel: React.FC<BantuanChartsPanelProps> = ({
  bantuanList,
  defaultCollapsed = false,
  title = 'Panel Visualisasi Real-Time: Distribusi Jenis Bantuan & Status Asesmen'
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [metricMode, setMetricMode] = useState<MetricMode>('COUNT');
  const [jenisDimension, setJenisDimension] = useState<JenisDimension>('PILAR');
  const [barDisplayMode, setBarDisplayMode] = useState<BarDisplayMode>('STACKED_STATUS');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');

  const availableYears = useMemo(() => {
    const years = Array.from(new Set(bantuanList.map(item => item.tahun))).sort((a, b) => b - a);
    return years;
  }, [bantuanList]);

  const filteredList = useMemo(() => {
    if (selectedYear === 'ALL') return bantuanList;
    return bantuanList.filter(item => String(item.tahun) === selectedYear);
  }, [bantuanList, selectedYear]);

  const totalNominalFiltered = useMemo(
    () => filteredList.reduce((acc, item) => acc + (item.nominalBantuan || 0), 0),
    [filteredList]
  );

  // 1. Data Distribusi Berdasarkan Status Asesmen (Semua 4 Status selalu ditampilkan utuh)
  const statusDistributionData = useMemo(() => {
    const map = new Map<StatusAsesmen, { count: number; nominal: number }>();
    STATUS_ASESMEN_CONFIG.forEach(cfg => {
      map.set(cfg.status, { count: 0, nominal: 0 });
    });

    filteredList.forEach(item => {
      const current = map.get(item.statusAsesmen) || { count: 0, nominal: 0 };
      current.count += 1;
      current.nominal += item.nominalBantuan || 0;
      map.set(item.statusAsesmen, current);
    });

    const totalCount = filteredList.length;
    const totalNominal = totalNominalFiltered;

    return STATUS_ASESMEN_CONFIG.map(cfg => {
      const entry = map.get(cfg.status) || { count: 0, nominal: 0 };
      const nominalJuta = Number((entry.nominal / 1_000_000).toFixed(1));
      const value = metricMode === 'COUNT' ? entry.count : nominalJuta;
      const pctCount = totalCount > 0 ? Math.round((entry.count / totalCount) * 100) : 0;
      const pctNominal = totalNominal > 0 ? Math.round((entry.nominal / totalNominal) * 100) : 0;
      const activePct = metricMode === 'COUNT' ? pctCount : pctNominal;

      return {
        name: cfg.label,
        status: cfg.status,
        colorName: cfg.colorName,
        value,
        count: entry.count,
        nominal: entry.nominal,
        nominalJuta,
        pct: activePct,
        pctCount,
        pctNominal,
        color: cfg.color,
        badgeBg: cfg.badgeBg,
        badgeText: cfg.badgeText,
        borderColor: cfg.borderColor
      };
    });
  }, [filteredList, totalNominalFiltered, metricMode]);

  const activePieSlices = useMemo(
    () => statusDistributionData.filter(d => d.value > 0),
    [statusDistributionData]
  );

  // 2. Data Distribusi Berdasarkan Jenis Bantuan
  const jenisDistributionData = useMemo(() => {
    type RowBucket = {
      name: string;
      shortName: string;
      totalCount: number;
      totalNominal: number;
      Asesmen: number;
      Disetujui: number;
      'Menunggu Tindak Lanjut': number;
      Ditolak: number;
      AsesmenCount: number;
      DisetujuiCount: number;
      MenungguCount: number;
      DitolakCount: number;
    };

    const buckets = new Map<string, RowBucket>();

    if (jenisDimension === 'PILAR') {
      ['Pemberdayaan Masyarakat', 'Edukasi', 'Lingkungan'].forEach(pilar => {
        buckets.set(pilar, {
          name: pilar,
          shortName: pilar === 'Pemberdayaan Masyarakat' ? 'Pemberdayaan' : pilar,
          totalCount: 0,
          totalNominal: 0,
          Asesmen: 0,
          Disetujui: 0,
          'Menunggu Tindak Lanjut': 0,
          Ditolak: 0,
          AsesmenCount: 0,
          DisetujuiCount: 0,
          MenungguCount: 0,
          DitolakCount: 0
        });
      });
    } else if (jenisDimension === 'BENTUK') {
      ['Bantuan Barang Fisik', 'Bantuan Jasa / Program'].forEach(bentuk => {
        buckets.set(bentuk, {
          name: bentuk,
          shortName: bentuk === 'Bantuan Barang Fisik' ? 'Barang Fisik' : 'Jasa / Program',
          totalCount: 0,
          totalNominal: 0,
          Asesmen: 0,
          Disetujui: 0,
          'Menunggu Tindak Lanjut': 0,
          Ditolak: 0,
          AsesmenCount: 0,
          DisetujuiCount: 0,
          MenungguCount: 0,
          DitolakCount: 0
        });
      });
    } else if (jenisDimension === 'INISIATIF') {
      ['BI Driven', 'Eksternal'].forEach(kat => {
        buckets.set(kat, {
          name: kat,
          shortName: kat,
          totalCount: 0,
          totalNominal: 0,
          Asesmen: 0,
          Disetujui: 0,
          'Menunggu Tindak Lanjut': 0,
          Ditolak: 0,
          AsesmenCount: 0,
          DisetujuiCount: 0,
          MenungguCount: 0,
          DitolakCount: 0
        });
      });
    }

    const getJenisKey = (item: BantuanItem): string => {
      if (jenisDimension === 'PILAR') {
        return item.kategoriBantuan || 'Edukasi';
      }
      if (jenisDimension === 'BENTUK') {
        return item.bentukBantuan === 'Jasa' ? 'Bantuan Jasa / Program' : 'Bantuan Barang Fisik';
      }
      if (jenisDimension === 'INISIATIF') {
        return item.kategoriInisiatif || 'BI Driven';
      }
      if (item.bentukBantuan === 'Jasa') {
        return 'Jasa & Pelatihan';
      }
      if (item.daftarJenisBarang && item.daftarJenisBarang.length > 0) {
        return item.daftarJenisBarang[0];
      }
      return item.jenisBarang || 'Barang Lainnya';
    };

    const shortenLabel = (label: string): string => {
      if (label === 'Personal Computer / Laptop') return 'PC / Laptop';
      if (label === 'Pemberdayaan Masyarakat') return 'Pemberdayaan';
      if (label === 'Kendaraan Operasional') return 'Kendaraan';
      if (label === 'Alat Pembelajaran') return 'Alat Belajar';
      if (label === 'Alat Percetakan') return 'Percetakan';
      if (label === 'Peralatan Lainnya') return 'Alat Lainnya';
      if (label === 'Bantuan Barang Fisik') return 'Barang Fisik';
      if (label === 'Bantuan Jasa / Program') return 'Jasa / Program';
      return label;
    };

    filteredList.forEach(item => {
      const key = getJenisKey(item);
      if (!buckets.has(key)) {
        buckets.set(key, {
          name: key,
          shortName: shortenLabel(key),
          totalCount: 0,
          totalNominal: 0,
          Asesmen: 0,
          Disetujui: 0,
          'Menunggu Tindak Lanjut': 0,
          Ditolak: 0,
          AsesmenCount: 0,
          DisetujuiCount: 0,
          MenungguCount: 0,
          DitolakCount: 0
        });
      }

      const row = buckets.get(key)!;
      const nomJuta = Number(((item.nominalBantuan || 0) / 1_000_000).toFixed(2));
      const incrementVal = metricMode === 'COUNT' ? 1 : nomJuta;

      row.totalCount += 1;
      row.totalNominal += item.nominalBantuan || 0;
      row[item.statusAsesmen] = Number((row[item.statusAsesmen] + incrementVal).toFixed(2));

      if (item.statusAsesmen === 'Asesmen') row.AsesmenCount += 1;
      else if (item.statusAsesmen === 'Disetujui') row.DisetujuiCount += 1;
      else if (item.statusAsesmen === 'Menunggu Tindak Lanjut') row.MenungguCount += 1;
      else if (item.statusAsesmen === 'Ditolak') row.DitolakCount += 1;
    });

    const totalCount = filteredList.length;

    return Array.from(buckets.values())
      .map(row => {
        const pctCount = totalCount > 0 ? Math.round((row.totalCount / totalCount) * 100) : 0;
        const pctNominal =
          totalNominalFiltered > 0 ? Math.round((row.totalNominal / totalNominalFiltered) * 100) : 0;
        return {
          ...row,
          pctCount,
          pctNominal,
          activePct: metricMode === 'COUNT' ? pctCount : pctNominal,
          totalValue:
            metricMode === 'COUNT'
              ? row.totalCount
              : Number((row.totalNominal / 1_000_000).toFixed(1))
        };
      })
      .sort((a, b) => b.totalValue - a.totalValue);
  }, [filteredList, jenisDimension, metricMode, totalNominalFiltered]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      {/* Top Panel Header */}
      <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 bg-slate-50/40 dark:bg-slate-900">
        <div className="flex items-start sm:items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[#002B66] text-white flex items-center justify-center shrink-0 shadow-2xs">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                  {title}
                </h3>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 whitespace-nowrap shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live • {filteredList.length} Data
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Sinkronisasi otomatis terhadap penambahan data, perubahan status asesmen, dan impor CSV
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsCollapsed(prev => !prev)}
            className="xl:hidden h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 inline-flex items-center gap-1 cursor-pointer shrink-0"
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>

        {/* Right Controls */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            aria-label="Filter Tahun Grafik"
            className="h-8.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer whitespace-nowrap"
          >
            <option value="ALL">Semua Tahun</option>
            {availableYears.map(yr => (
              <option key={yr} value={String(yr)}>
                Tahun {yr}
              </option>
            ))}
          </select>

          <div className="inline-flex items-center p-0.5 h-8.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setMetricMode('COUNT')}
              className={`h-7 px-2.5 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                metricMode === 'COUNT'
                  ? 'bg-white dark:bg-slate-900 text-[#002B66] dark:text-blue-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Jumlah Bantuan</span>
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('NOMINAL')}
              className={`h-7 px-2.5 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                metricMode === 'NOMINAL'
                  ? 'bg-white dark:bg-slate-900 text-[#002B66] dark:text-blue-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              <span>Nominal (Rp Juta)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsCollapsed(prev => !prev)}
            className="hidden xl:inline-flex h-8.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <span>{isCollapsed ? 'Buka Grafik' : 'Ringkas'}</span>
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Content Area: 2 Proportional Columns with Matched Content Density */}
      {!isCollapsed && (
        <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* ================================================================= */}
          {/* LEFT 7 COLS: GRAFIK + RINCIAN DISTRIBUSI JENIS BANTUAN */}
          {/* ================================================================= */}
          <div className="lg:col-span-7 flex flex-col justify-between bg-slate-50/50 dark:bg-slate-800/30 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800">
            <div className="flex-1 flex flex-col">
              {/* Header & Single-Line Sub-Toolbar */}
              <div className="space-y-2.5 mb-3 pb-3 border-b border-slate-200/70 dark:border-slate-800">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#002B66] dark:text-blue-400 shrink-0" />
                    <span>Distribusi Bantuan Berdasarkan Jenis Bantuan</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Perbandingan {metricMode === 'COUNT' ? 'jumlah penerima (paket bantuan)' : 'nilai alokasi (Rp Juta)'} per klasifikasi
                  </p>
                </div>

                {/* Single-Row Controls (No Wrapping on Desktop) */}
                <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
                  <div className="inline-flex items-center p-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setJenisDimension('PILAR')}
                      className={`h-7 px-2.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                        jenisDimension === 'PILAR'
                          ? 'bg-[#002B66] text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      Pilar EPML
                    </button>
                    <button
                      type="button"
                      onClick={() => setJenisDimension('SPESIFIK')}
                      className={`h-7 px-2.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                        jenisDimension === 'SPESIFIK'
                          ? 'bg-[#002B66] text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      Jenis Barang / Jasa
                    </button>
                    <button
                      type="button"
                      onClick={() => setJenisDimension('BENTUK')}
                      className={`h-7 px-2.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                        jenisDimension === 'BENTUK'
                          ? 'bg-[#002B66] text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      Barang vs Jasa
                    </button>
                    <button
                      type="button"
                      onClick={() => setJenisDimension('INISIATIF')}
                      className={`h-7 px-2.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                        jenisDimension === 'INISIATIF'
                          ? 'bg-[#002B66] text-white shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      BI Driven vs Eksternal
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setBarDisplayMode(prev => (prev === 'STACKED_STATUS' ? 'TOTAL' : 'STACKED_STATUS'))
                    }
                    className={`h-8 px-2.5 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      barDisplayMode === 'STACKED_STATUS'
                        ? 'border-blue-300 bg-blue-50 text-[#002B66] dark:bg-blue-950/60 dark:border-blue-800 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {barDisplayMode === 'STACKED_STATUS' ? 'Mode: Rincian Status' : 'Mode: Total Jenis'}
                  </button>
                </div>
              </div>

              {/* Recharts BarChart Container */}
              <div className="h-[240px] w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-3">
                {jenisDistributionData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    Tidak ada data bantuan untuk filter yang dipilih.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={jenisDistributionData}
                      margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
                      barSize={jenisDistributionData.length <= 3 ? 44 : 28}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis
                        dataKey="shortName"
                        tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                        axisLine={{ stroke: '#CBD5E1' }}
                        tickLine={false}
                        interval={0}
                        angle={jenisDistributionData.length > 5 ? -15 : 0}
                        textAnchor={jenisDistributionData.length > 5 ? 'end' : 'middle'}
                        height={jenisDistributionData.length > 5 ? 42 : 28}
                      />
                      <YAxis
                        allowDecimals={metricMode === 'NOMINAL'}
                        tick={{ fontSize: 11, fill: '#64748B' }}
                        axisLine={false}
                        tickLine={false}
                        width={48}
                        tickFormatter={val => (metricMode === 'COUNT' ? `${val}` : `${val} Jt`)}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }}
                        content={({ active, payload }) => {
                          if (!active || !payload || payload.length === 0) return null;
                          const row = payload[0].payload;
                          return (
                            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg text-xs space-y-1.5 min-w-[220px]">
                              <p className="font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-1">
                                {row.name}
                              </p>
                              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                                <span>Total Paket Bantuan:</span>
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {row.totalCount} Paket
                                </span>
                              </div>
                              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                                <span>Total Nilai Alokasi:</span>
                                <span className="font-bold text-[#002B66] dark:text-blue-400">
                                  Rp {row.totalNominal.toLocaleString('id-ID')}
                                </span>
                              </div>
                              <div className="pt-1 border-t border-slate-100 dark:border-slate-800 space-y-1">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                  Rincian Status Asesmen:
                                </p>
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="inline-flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-[#002B66]" />
                                    Asesmen
                                  </span>
                                  <span className="font-semibold">{row.AsesmenCount} Paket</span>
                                </div>
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="inline-flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-[#059669]" />
                                    Disetujui
                                  </span>
                                  <span className="font-semibold">{row.DisetujuiCount} Paket</span>
                                </div>
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="inline-flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                                    Menunggu Tindak Lanjut
                                  </span>
                                  <span className="font-semibold">{row.MenungguCount} Paket</span>
                                </div>
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="inline-flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-[#DC2626]" />
                                    Ditolak
                                  </span>
                                  <span className="font-semibold">{row.DitolakCount} Paket</span>
                                </div>
                              </div>
                            </div>
                          );
                        }}
                      />
                      {barDisplayMode === 'STACKED_STATUS' ? (
                        <>
                          <Legend
                            wrapperStyle={{ fontSize: '11px', paddingTop: '6px', fontWeight: 600 }}
                            iconType="circle"
                          />
                          {STATUS_ASESMEN_CONFIG.map(cfg => (
                            <Bar
                              key={cfg.status}
                              dataKey={cfg.status}
                              name={cfg.label}
                              stackId="statusStack"
                              fill={cfg.color}
                            />
                          ))}
                        </>
                      ) : (
                        <Bar
                          dataKey="totalValue"
                          name={metricMode === 'COUNT' ? 'Jumlah Penerima' : 'Nominal (Rp Juta)'}
                          radius={[6, 6, 0, 0]}
                        >
                          {jenisDistributionData.map((entry, idx) => (
                            <Cell
                              key={`cell-${entry.name}`}
                              fill={JENIS_COLORS[idx % JENIS_COLORS.length]}
                            />
                          ))}
                        </Bar>
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Rincian Klasifikasi Jenis Bantuan (Mengisi Ruang Bawah Secara Proporsional & Informatif) */}
              <div className="mt-3 flex-1 flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
                  <span>Rincian Realisasi Per Klasifikasi Jenis Bantuan</span>
                  <span>Porsi & Status</span>
                </div>

                <div className="space-y-2 max-h-[225px] overflow-y-auto pr-0.5">
                  {jenisDistributionData.map((row, idx) => (
                    <div
                      key={row.name}
                      className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-sm shrink-0"
                            style={{ backgroundColor: JENIS_COLORS[idx % JENIS_COLORS.length] }}
                          />
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {row.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 text-xs">
                          <span className="font-bold text-[#002B66] dark:text-blue-400 tabular-nums">
                            Rp {row.totalNominal.toLocaleString('id-ID')}
                          </span>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <span className="font-extrabold text-slate-900 dark:text-white tabular-nums">
                            {row.totalCount} Paket ({row.activePct}%)
                          </span>
                        </div>
                      </div>

                      {/* Mini Status Breakdown & Progress Bar */}
                      <div className="mt-1.5 flex items-center justify-between gap-3">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.max(row.activePct, row.totalCount > 0 ? 4 : 0)}%`,
                              backgroundColor: JENIS_COLORS[idx % JENIS_COLORS.length]
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-500 shrink-0">
                          {row.AsesmenCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-[#002B66] dark:text-blue-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#002B66]" />
                              Asesmen: {row.AsesmenCount}
                            </span>
                          )}
                          {row.DisetujuiCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                              Disetujui: {row.DisetujuiCount}
                            </span>
                          )}
                          {row.MenungguCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                              Menunggu: {row.MenungguCount}
                            </span>
                          )}
                          {row.DitolakCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-red-700 dark:text-red-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
                              Ditolak: {row.DitolakCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Summary */}
            <div className="pt-3 mt-3 border-t border-slate-200/70 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
              <span>
                Klasifikasi Terdata:{' '}
                <strong className="text-slate-900 dark:text-slate-100">
                  {jenisDistributionData.length} Jenis Bantuan
                </strong>
              </span>
              <span>
                Total Nilai Bantuan:{' '}
                <strong className="text-[#002B66] dark:text-blue-400 tabular-nums">
                  Rp {totalNominalFiltered.toLocaleString('id-ID')}
                </strong>
              </span>
            </div>
          </div>

          {/* ================================================================= */}
          {/* RIGHT 5 COLS: GRAFIK DISTRIBUSI STATUS ASESMEN (UTUH & SERAGAM) */}
          {/* ================================================================= */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-slate-50/50 dark:bg-slate-800/30 rounded-xl p-4 border border-slate-200/80 dark:border-slate-800">
            <div>
              {/* Card Title */}
              <div className="mb-3 pb-3 border-b border-slate-200/70 dark:border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <PieChartIcon className="w-3.5 h-3.5 text-[#002B66] dark:text-blue-400 shrink-0" />
                  <span>Distribusi Status Asesmen</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rincian lengkap 4 status verifikasi & asesmen penerima bantuan
                </p>
              </div>

              {/* Top Compact Donut Chart + Total Summary Banner */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-3 mb-3 flex items-center gap-3">
                <div className="w-[116px] h-[116px] relative shrink-0">
                  {filteredList.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      0 Data
                    </div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={activePieSlices.length > 0 ? activePieSlices : statusDistributionData}
                            dataKey={activePieSlices.length > 0 ? 'value' : 'count'}
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={35}
                            outerRadius={54}
                            paddingAngle={activePieSlices.length > 1 ? 3 : 0}
                            stroke="none"
                          >
                            {(activePieSlices.length > 0 ? activePieSlices : statusDistributionData).map(
                              entry => (
                                <Cell key={entry.status} fill={entry.color} />
                              )
                            )}
                          </Pie>
                          <Tooltip
                            content={({ active, payload }) => {
                              if (!active || !payload || payload.length === 0) return null;
                              const item = payload[0].payload;
                              return (
                                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg text-xs space-y-1">
                                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                                    <span
                                      className="w-2.5 h-2.5 rounded-full"
                                      style={{ backgroundColor: item.color }}
                                    />
                                    <span>{item.name}</span>
                                  </div>
                                  <p className="text-slate-600 dark:text-slate-300">
                                    Jumlah: <strong>{item.count} Paket</strong> ({item.pctCount}%)
                                  </p>
                                  <p className="text-slate-600 dark:text-slate-300">
                                    Nominal: <strong>Rp {item.nominal.toLocaleString('id-ID')}</strong> ({item.pctNominal}%)
                                  </p>
                                </div>
                              );
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Center Donut Metric */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                        <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-400">
                          {metricMode === 'COUNT' ? 'Total' : 'Alokasi'}
                        </span>
                        <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 tabular-nums leading-tight">
                          {metricMode === 'COUNT'
                            ? `${filteredList.length} Paket`
                            : `${(totalNominalFiltered / 1_000_000_000).toFixed(2)}M`}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Right Summary Details inside Donut Box */}
                <div className="flex-1 min-w-0 space-y-2 text-xs">
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Total Penerima Terdata</span>
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white tabular-nums block">
                      {filteredList.length} Lembaga Penerima
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Total Alokasi Anggaran</span>
                    <span className="text-xs font-extrabold text-[#002B66] dark:text-blue-400 tabular-nums block">
                      Rp {totalNominalFiltered.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>

              {/* All 4 Status Asesmen Rows — Clean & Never Overlapping */}
              <div className="space-y-2">
                {statusDistributionData.map(item => (
                  <div
                    key={item.status}
                    className={`p-2.5 rounded-xl bg-white dark:bg-slate-900 border ${item.borderColor} shadow-2xs`}
                  >
                    {/* Line 1: Status Name on Left, Packet Count + Pct on Right */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-3 h-3 rounded-sm shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                          {item.count} Paket
                        </span>
                        <span className={`text-[11px] font-bold tabular-nums whitespace-nowrap ${item.badgeText}`}>
                          ({item.pct}%)
                        </span>
                      </div>
                    </div>

                    {/* Line 2: Color Indicator Badge + Nominal Alokasi on Left, Exact Rupiah on Right */}
                    <div className="flex items-center justify-between gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.2 rounded whitespace-nowrap ${item.badgeBg} ${item.badgeText}`}
                        >
                          {item.colorName}
                        </span>
                        <span>• Alokasi ({item.pctNominal}%)</span>
                      </div>
                      <span className="font-bold text-slate-700 dark:text-slate-200 tabular-nums whitespace-nowrap">
                        Rp {item.nominal.toLocaleString('id-ID')}
                      </span>
                    </div>

                    {/* Line 3: Visual Progress Bar */}
                    <div className="mt-1.5 w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(item.pct, item.count > 0 ? 4 : 0)}%`,
                          backgroundColor: item.color
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Legend Footnote */}
            <div className="pt-3 mt-3 border-t border-slate-200/70 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
              <span>Standar Warna Status Asesmen</span>
              <strong className="text-slate-900 dark:text-slate-100">
                4 Status Aktif Terpantau
              </strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
