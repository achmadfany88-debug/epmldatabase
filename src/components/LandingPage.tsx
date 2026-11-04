/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { ArtikelItem, BantuanItem, JadwalSurveiMonitoringItem, LandingPageConfig } from '../types';
import { MapVisualization } from './map/MapVisualization';
import { EPML_ARTIKEL } from '../data/initialData';
import { ImageLightboxModal } from './common/ImageLightboxModal';
import { KalenderSurveiMonitoring } from './admin/KalenderSurveiMonitoring';
import { 
  CheckCircle2, 
  MapPin, 
  Package, 
  Users, 
  FileText, 
  ChevronRight, 
  ChevronLeft, 
  ArrowRight, 
  Filter, 
  RotateCcw, 
  X, 
  ExternalLink, 
  Calendar, 
  Layers, 
  Sparkles,
  ZoomIn
} from 'lucide-react';

interface LandingPageProps {
  bantuanList: BantuanItem[];
  landingConfig: LandingPageConfig;
  artikelList?: ArtikelItem[];
  jadwalKalender?: JadwalSurveiMonitoringItem[];
  onOpenLogin: () => void;
  onSelectBantuan: (item: BantuanItem) => void;
  onOpenQrScanner?: () => void;
  onNavigateToTracking?: () => void;
  onOpenKalenderPage?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  bantuanList,
  landingConfig,
  artikelList,
  jadwalKalender = [],
  onOpenLogin,
  onSelectBantuan,
  onOpenKalenderPage
}) => {
  // KPI Filter State (Tahunan & Triwulanan)
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('ALL');
  const [selectedMapKab, setSelectedMapKab] = useState<string>('');

  // Filtered Bantuan based on year & quarter
  const filteredBantuanList = useMemo(() => {
    return bantuanList.filter(item => {
      const matchYear = selectedYear === 'ALL' || String(item.tahun) === selectedYear;
      const matchQuarter = selectedQuarter === 'ALL' || item.triwulan === selectedQuarter;
      return matchYear && matchQuarter;
    });
  }, [bantuanList, selectedYear, selectedQuarter]);

  // KPI Calculations
  const totalRealisasi = useMemo(() => {
    return filteredBantuanList.reduce((acc, curr) => acc + curr.nominalBantuan, 0);
  }, [filteredBantuanList]);

  const totalPenerima = filteredBantuanList.length;
  const uniqueKabupaten = useMemo(() => {
    return new Set(filteredBantuanList.map(b => b.kabupatenKota)).size;
  }, [filteredBantuanList]);

  const selesaiDiterima = useMemo(() => {
    return filteredBantuanList.filter(
      b => b.statusTahap === 'Barang Diterima' || b.statusTahap === 'Penjadwalan Monitoring Bantuan'
    ).length;
  }, [filteredBantuanList]);

  const persentaseSelesai = totalPenerima > 0 ? Math.round((selesaiDiterima / totalPenerima) * 100) : 0;

  // Active articles for dashboard display (do NOT fallback to EPML_ARTIKEL when articles are deleted in Edit Artikel & Berita)
  const articlesSource = useMemo(() => {
    if (artikelList !== undefined) {
      return artikelList.filter(a => a.tampilkanDiBeranda !== false && a.statusPublikasi !== 'Draft');
    }
    return EPML_ARTIKEL;
  }, [artikelList]);

  // News Carousel State (Looping through active articles)
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalArticles = articlesSource.length;
  const [selectedArticleDetail, setSelectedArticleDetail] = useState<ArtikelItem | null>(null);
  const [isAllNewsModalOpen, setIsAllNewsModalOpen] = useState(false);
  const [newsFilterKategori, setNewsFilterKategori] = useState('ALL');

  // Lightbox Zoom Modal State
  const [lightboxData, setLightboxData] = useState<{
    isOpen: boolean;
    imageUrl: string;
    title?: string;
    category?: string;
    date?: string;
    location?: string;
    caption?: string;
  }>({
    isOpen: false,
    imageUrl: ''
  });

  // Next / Prev slide handlers with looping
  const handleNextSlide = () => {
    if (totalArticles <= 0) return;
    setCurrentSlide(prev => (prev + 1) % totalArticles);
  };

  const handlePrevSlide = () => {
    if (totalArticles <= 0) return;
    setCurrentSlide(prev => (prev - 1 + totalArticles) % totalArticles);
  };

  // Determine items to display in the current carousel window
  // Shows up to 3 cards on desktop starting from currentSlide, wrapping around
  const visibleArticles = useMemo(() => {
    if (totalArticles === 0) return [];
    const items: { item: ArtikelItem; index: number }[] = [];
    const countToShow = Math.min(3, totalArticles);
    for (let i = 0; i < countToShow; i++) {
      const index = (currentSlide + i) % totalArticles;
      items.push({ item: articlesSource[index], index });
    }
    return items;
  }, [currentSlide, totalArticles, articlesSource]);

  const resetKpiFilters = () => {
    setSelectedYear('ALL');
    setSelectedQuarter('ALL');
  };

  // Hero Slideshow State & Timer (Auto 5 detik, looping endlessly)
  const heroSlides = useMemo(() => {
    if (landingConfig.heroSlideshowImages && landingConfig.heroSlideshowImages.length > 0) {
      return landingConfig.heroSlideshowImages;
    }
    return [
      {
        id: 'default-hero-1',
        url: landingConfig.backgroundUrl || '/src/assets/images/bi_jatim_hero_1793505598999.jpg',
        title: 'Kantor Perwakilan Bank Indonesia Provinsi Jawa Timur',
        caption: 'Pusat Koordinasi Kebijakan & Inovasi Penyaluran Bantuan EPML'
      }
    ];
  }, [landingConfig.heroSlideshowImages, landingConfig.backgroundUrl]);

  const [heroSlideIndex, setHeroSlideIndex] = useState(0);
  const [isHeroHovered, setIsHeroHovered] = useState(false);

  // Auto transition every 5 seconds, looping indefinitely
  useEffect(() => {
    if (landingConfig.heroMediaMode !== 'slideshow' || heroSlides.length <= 1 || isHeroHovered) {
      return;
    }

    const interval = setInterval(() => {
      setHeroSlideIndex(prev => (prev + 1) % heroSlides.length);
    }, landingConfig.heroSlideIntervalMs || 5000);

    return () => clearInterval(interval);
  }, [landingConfig.heroMediaMode, heroSlides.length, isHeroHovered, landingConfig.heroSlideIntervalMs]);

  const activeHeroSlide = heroSlides[heroSlideIndex % heroSlides.length];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
      {/* SECTION 1: HERO BANNER (Full HD Optimized, 5-Second Slideshow or Looping Video) */}
      <section 
        id="hero" 
        onMouseEnter={() => setIsHeroHovered(true)}
        onMouseLeave={() => setIsHeroHovered(false)}
        className="relative min-h-[460px] sm:min-h-[520px] lg:min-h-[580px] flex items-center overflow-hidden group select-none"
      >
        {/* Dynamic Background Media Layer */}
        <div className="absolute inset-0 z-0 bg-slate-950">
          {landingConfig.heroMediaMode === 'video' && landingConfig.heroVideoUrl ? (
            /* Mode Video Tunggal: 1 video saja, looping otomatis jika durasi habis */
            <video
              key={landingConfig.heroVideoUrl}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover filter brightness-[0.75]"
              src={landingConfig.heroVideoUrl}
              poster={landingConfig.heroVideoPoster || '/src/assets/images/bi_jatim_hero_1793505598999.jpg'}
              onEnded={e => {
                const vid = e.currentTarget;
                vid.currentTime = 0;
                vid.play();
              }}
            />
          ) : (
            /* Mode Slideshow Foto: Efek slide tiap 5 detik otomatis dan looping */
            heroSlides.map((slide, sIdx) => {
              const isActive = sIdx === (heroSlideIndex % heroSlides.length);
              return (
                <div
                  key={slide.id || sIdx}
                  className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                    isActive ? 'opacity-100 z-1 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
                  }`}
                >
                  <img
                    src={slide.url}
                    alt={slide.title || 'Kantor Perwakilan Bank Indonesia Provinsi Jawa Timur'}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover filter brightness-[0.75] scale-102 transition-transform duration-1000"
                    onError={e => {
                      (e.target as HTMLImageElement).src = '/src/assets/images/bi_jatim_hero_1793505598999.jpg';
                    }}
                  />
                </div>
              );
            })
          )}

          {/* Corporate Scrim Gradient with Configurable Navy Transparency */}
          <div 
            className="absolute inset-0 z-2 pointer-events-none transition-opacity duration-300" 
            style={{
              background: 'linear-gradient(to top, rgba(2, 6, 23, 0.95) 0%, rgba(10, 25, 54, 0.85) 50%, rgba(15, 35, 75, 0.65) 100%)',
              opacity: (landingConfig.navyOverlayOpacity ?? 65) / 100
            }}
          />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
          <div className="max-w-3xl space-y-6">
            {/* Kicker */}
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-blue-300">
              <span>Edukasi, Pemberdayaan Masyarakat dan Lingkungan (EPML)</span>
              <span aria-hidden="true">&middot;</span>
              <span>Jawa Timur</span>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-white tracking-tight text-balance leading-tight">
              {landingConfig.heroTitle || 'Sistem Data Terpadu EPML Provinsi Jawa Timur'}
            </h1>

            {/* Sub-title */}
            <p className="text-sm sm:text-base text-slate-200 leading-relaxed text-balance font-normal">
              {landingConfig.heroSubtitle}
            </p>

            {/* Quick Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={onOpenLogin}
                className="px-6 py-3 rounded-xl text-xs font-bold text-slate-950 bg-white hover:bg-slate-100 hover:shadow-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer shadow-md"
              >
                <span>Masuk Petugas & Admin</span>
                <ArrowRight className="w-4 h-4 text-blue-900" />
              </button>
            </div>
          </div>
        </div>

        {/* Slideshow Controls & Dot Indicators (Only active in slideshow mode) */}
        {landingConfig.heroMediaMode !== 'video' && heroSlides.length > 1 && (
          <>
            {/* Dot indicators at bottom right */}
            <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 lg:right-10 z-20 flex items-center gap-1.5 sm:gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-full border border-white/10 shadow-lg">
              {heroSlides.map((slide, dotIdx) => {
                const isSelected = dotIdx === (heroSlideIndex % heroSlides.length);
                return (
                  <button
                    key={slide.id || dotIdx}
                    onClick={() => setHeroSlideIndex(dotIdx)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      isSelected
                        ? 'w-7 bg-white shadow-xs'
                        : 'w-2 bg-white/40 hover:bg-white/70'
                    }`}
                    title={slide.title || `Foto ke-${dotIdx + 1}`}
                  />
                );
              })}
              <span className="text-[10px] text-white/70 font-mono pl-1">
                {(heroSlideIndex % heroSlides.length) + 1}/{heroSlides.length}
              </span>
            </div>

            {/* Caption badge in bottom left */}
            {activeHeroSlide?.title && (
              <div className="absolute bottom-6 left-6 lg:left-10 z-20 hidden md:flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-white max-w-md shadow-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold truncate leading-none">
                    {activeHeroSlide.title}
                  </p>
                  {activeHeroSlide.caption && (
                    <p className="text-[10px] text-slate-300 truncate mt-0.5 leading-none">
                      {activeHeroSlide.caption}
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Single Video Badge (Only in video mode) */}
        {landingConfig.heroMediaMode === 'video' && (
          <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 lg:right-10 z-20 flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 sm:px-3.5 py-1.5 rounded-full border border-white/10 text-[10px] text-emerald-300 font-mono shadow-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>FHD • Looping Video Aktif</span>
          </div>
        )}
      </section>

      {/* SECTION: 4-COLUMN KPI ROW WITH ANNUAL & QUARTERLY FILTER */}
      <section className="relative z-20 mt-8 sm:mt-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* KPI Period Filter Bar */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-md mb-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300">
                <Filter className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Filter Monitoring Data Penyaluran
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Pilih periode tahunan dan triwulanan untuk memperbarui indikator capaian secara instan
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Year Filter */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Tahun:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option value="ALL">Semua Tahun</option>
                  {Array.from(
                    new Set<number>([
                      2024,
                      2025,
                      2026,
                      ...bantuanList.map(b => Number(b.tahun)).filter(Boolean)
                    ])
                  )
                    .sort((a, b) => a - b)
                    .map(yr => (
                      <option key={yr} value={String(yr)}>
                        {yr}
                      </option>
                    ))}
                </select>
              </div>

              {/* Quarter Filter */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Triwulan:</span>
                <select
                  value={selectedQuarter}
                  onChange={(e) => setSelectedQuarter(e.target.value)}
                  className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option value="ALL">Semua Triwulan</option>
                  <option value="Q1">Triwulan I (Q1)</option>
                  <option value="Q2">Triwulan II (Q2)</option>
                  <option value="Q3">Triwulan III (Q3)</option>
                  <option value="Q4">Triwulan IV (Q4)</option>
                </select>
              </div>

              {(selectedYear !== 'ALL' || selectedQuarter !== 'ALL') && (
                <button
                  onClick={resetKpiFilters}
                  className="flex items-center gap-1 text-[11px] font-medium text-blue-700 dark:text-blue-400 hover:text-blue-900 px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 transition-colors"
                  title="Reset Filter"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Realisasi Bantuan */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 flex items-center justify-center shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Realisasi Bantuan</p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                Rp {(totalRealisasi / 1000000000).toFixed(2)} M
              </p>
              <p className="text-[11px] text-slate-400 tabular-nums">
                Total Rp {totalRealisasi.toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          {/* Card 2: Lembaga Penerima */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Lembaga Penerima</p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {totalPenerima} Lembaga / Kelompok
              </p>
              <p className="text-[11px] text-slate-400">Terverifikasi di Jatim</p>
            </div>
          </div>

          {/* Card 3: Cakupan Wilayah Kerja KPwBI Jatim */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 flex items-center justify-center shrink-0">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Cakupan Wilayah</p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                13 Wilayah Kerja
              </p>
              <p className="text-[11px] text-slate-400 tabular-nums">Yurisdiksi KPw BI Prov. Jatim</p>
            </div>
          </div>

          {/* Card 4: Progres Distribusi */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Progres Distribusi</p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                {persentaseSelesai}% Selesai
              </p>
              <p className="text-[11px] text-slate-400 tabular-nums">{selesaiDiterima} Penerima Telah Menerima</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: MAP VISUALIZATION 3D (Interactive Clickable Regency/City & Bantuan Markers) */}
      <section id="map" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <MapVisualization
          bantuanList={bantuanList}
          selectedKabupaten={selectedMapKab}
          onFilterKabupaten={setSelectedMapKab}
          onSelectBantuan={onSelectBantuan}
          heightClass="h-[640px]"
          initialYear={selectedYear}
          initialQuarter={selectedQuarter}
        />
      </section>

      {/* SECTION 3: MAKSUD DAN TUJUAN EPML (Direct institutional reference) */}
      <section id="about" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-200 dark:border-slate-800">
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight">
              About EPML ?
            </h2>
          </div>

          {/* Upper Primary Dark Blue Card - EXACT MATCH to reference */}
          <div className="bg-[#0b3c7c] text-white p-6 sm:p-8 rounded-3xl shadow-md border border-blue-900/60">
            <p className="text-sm sm:text-base font-normal leading-relaxed text-balance">
              <strong className="font-bold">Edukasi serta Pemberdayaan Masyarakat dan Lingkungan di Bank Indonesia yang selanjutnya disebut EPML</strong> adalah program yang dilakukan melalui kegiatan edukasi, pemberdayaan masyarakat serta pemberdayaan lingkungan secara inklusif dalam rangka mendukung pelaksanaan tugas Bank Indonesia.
            </p>
          </div>

          {/* Three Column Cards - EXACT MATCH to reference */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            {/* Card 1: Edukasi */}
            <div className="bg-[#e4effa] dark:bg-slate-900/90 text-slate-900 dark:text-slate-100 p-6 sm:p-7 rounded-3xl border border-blue-200/70 dark:border-slate-800 shadow-xs flex flex-col justify-start">
              <p className="text-sm sm:text-base leading-relaxed text-slate-900 dark:text-slate-100">
                <strong className="font-bold text-slate-950 dark:text-white">Edukasi</strong> adalah kegiatan untuk meningkatkan kapasitas, kemampuan, dan keterampilan masyarakat guna mengembangkan potensi diri.
              </p>
            </div>

            {/* Card 2: Pemberdayaan Masyarakat */}
            <div className="bg-[#e4effa] dark:bg-slate-900/90 text-slate-900 dark:text-slate-100 p-6 sm:p-7 rounded-3xl border border-blue-200/70 dark:border-slate-800 shadow-xs flex flex-col justify-start">
              <p className="text-sm sm:text-base leading-relaxed text-slate-900 dark:text-slate-100">
                <strong className="font-bold text-slate-950 dark:text-white">Pemberdayaan Masyarakat</strong> adalah kegiatan untuk mewujudkan kemandirian dan keterbukaan akses masyarakat terhadap sumber daya guna meningkatkan kualitas hidup.
              </p>
            </div>

            {/* Card 3: Pemberdayaan Lingkungan */}
            <div className="bg-[#e4effa] dark:bg-slate-900/90 text-slate-900 dark:text-slate-100 p-6 sm:p-7 rounded-3xl border border-blue-200/70 dark:border-slate-800 shadow-xs flex flex-col justify-start">
              <p className="text-sm sm:text-base leading-relaxed text-slate-900 dark:text-slate-100">
                <strong className="font-bold text-slate-950 dark:text-white">Pemberdayaan Lingkungan</strong> adalah kegiatan untuk melindungi dan melestarikan lingkungan hidup dalam rangka mendukung kualitas hidup masyarakat secara berkelanjutan.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: ARTIKEL & DOKUMENTASI KEGIATAN DENGAN FITUR SLIDE (MAX 10, AUTO-LOOPING) */}
      <section id="artikel" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-800 dark:text-blue-400">
              <FileText className="w-4 h-4" />
              <span>Publikasi & Dokumentasi</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              Artikel & Berita Distribusi Terkini
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Menampilkan {totalArticles} warta penyaluran dan pemantauan program EPML Provinsi Jawa Timur
            </p>
          </div>

          {totalArticles > 0 && (
            <div className="flex items-center gap-3">
              {/* Carousel navigation controls */}
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl shadow-xs">
                <button
                  onClick={handlePrevSlide}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Berita Sebelumnya"
                  aria-label="Previous News"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 px-2 tabular-nums">
                  {(currentSlide % totalArticles) + 1} / {totalArticles}
                </span>
                <button
                  onClick={handleNextSlide}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Berita Selanjutnya (Loop ke Berita 1)"
                  aria-label="Next News"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Tombol Lihat Berita Lainnya */}
              <button
                onClick={() => setIsAllNewsModalOpen(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-blue-900 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200/60 dark:border-blue-800 transition-colors flex items-center gap-1.5"
              >
                <span>Lihat Berita Lainnya</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Empty State or Carousel Container */}
        {totalArticles === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center space-y-3 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              Belum ada publikasi artikel & berita
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Saat ini belum ada artikel atau berita yang dipublikasikan. Silakan tambahkan publikasi baru melalui menu Edit Artikel & Berita pada Portal Admin.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {visibleArticles.map(({ item: art, index }) => (
                <div
                  key={`${art.id}-${index}`}
                  onClick={() => setSelectedArticleDetail(art)}
                  className={`group bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between cursor-pointer ${
                    index === 1 ? 'hidden sm:flex' : ''
                  } ${index === 2 ? 'hidden lg:flex' : ''}`}
                >
                  <div>
                    <div className="h-44 w-full overflow-hidden bg-slate-200 dark:bg-slate-800 relative group/img">
                      <img
                        src={art.gambar}
                        alt={art.judul}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3 bg-blue-900/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-md backdrop-blur-xs shadow-xs">
                        Berita #{index + 1}
                      </div>
                      {/* Klik Perbesar Foto Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxData({
                            isOpen: true,
                            imageUrl: art.gambar,
                            title: art.judul,
                            category: art.kategori,
                            date: art.tanggal,
                            location: art.kabupaten,
                            caption: art.ringkasan
                          });
                        }}
                        className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-black/75 hover:bg-black text-white text-[10px] font-medium flex items-center gap-1 backdrop-blur-xs transition-opacity opacity-90 hover:opacity-100 cursor-pointer shadow-xs"
                        title="Klik untuk Memperbesar Foto"
                      >
                        <ZoomIn className="w-3 h-3 text-amber-300" />
                        <span>Perbesar Foto</span>
                      </button>
                    </div>
                    <div className="p-5">
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
                        <span className="font-bold text-blue-900 dark:text-blue-400">{art.kategori}</span>
                        <span aria-hidden="true">&middot;</span>
                        <span>{art.tanggal}</span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-2 mb-2 leading-snug group-hover:text-blue-800 dark:group-hover:text-blue-400 transition-colors">
                        {art.judul}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                        {art.ringkasan}
                      </p>
                    </div>
                  </div>

                  <div className="px-5 pb-5 pt-3 flex items-center justify-between text-xs text-blue-900 dark:text-blue-400 font-semibold border-t border-slate-100 dark:border-slate-800/80">
                    <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-blue-800 dark:text-blue-400" />
                      {art.kabupaten}
                    </span>
                    <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Baca Selengkapnya
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Carousel Progress Dots */}
            {articlesSource.length > 1 && (
              <div className="mt-8 flex items-center justify-center gap-1.5 flex-wrap">
                {articlesSource.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      idx === (currentSlide % totalArticles)
                        ? 'w-7 bg-blue-900 dark:bg-blue-400' 
                        : 'w-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300'
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                    title={`Berita ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* MODAL 1: BACA DETAIL ARTIKEL LENGKAP */}
      {selectedArticleDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="relative h-64 sm:h-72 w-full bg-slate-200 dark:bg-slate-800 group/zoom">
              <img
                src={selectedArticleDetail.gambar}
                alt={selectedArticleDetail.judul}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setLightboxData({
                  isOpen: true,
                  imageUrl: selectedArticleDetail.gambar,
                  title: selectedArticleDetail.judul,
                  category: selectedArticleDetail.kategori,
                  date: selectedArticleDetail.tanggal,
                  location: selectedArticleDetail.kabupaten,
                  caption: selectedArticleDetail.ringkasan
                })}
              />

              {/* Enlarge Photo Button on Top Left */}
              <button
                type="button"
                onClick={() => setLightboxData({
                  isOpen: true,
                  imageUrl: selectedArticleDetail.gambar,
                  title: selectedArticleDetail.judul,
                  category: selectedArticleDetail.kategori,
                  date: selectedArticleDetail.tanggal,
                  location: selectedArticleDetail.kabupaten,
                  caption: selectedArticleDetail.ringkasan
                })}
                className="absolute top-4 left-4 px-3 py-1.5 rounded-xl bg-black/70 hover:bg-black/90 text-white text-xs font-semibold flex items-center gap-1.5 backdrop-blur-xs transition-colors cursor-pointer shadow-md"
                title="Klik untuk Memperbesar Foto"
              >
                <ZoomIn className="w-3.5 h-3.5 text-amber-300" />
                <span>Perbesar Foto</span>
              </button>

              <button
                onClick={() => setSelectedArticleDetail(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-950/60 text-white flex items-center justify-center hover:bg-slate-950 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white text-xs font-medium">
                <span className="bg-blue-900/90 backdrop-blur-xs px-3 py-1 rounded-md font-bold">
                  {selectedArticleDetail.kategori}
                </span>
                <span className="bg-slate-900/80 backdrop-blur-xs px-3 py-1 rounded-md">
                  {selectedArticleDetail.tanggal}
                </span>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-800 dark:text-blue-400">
                <MapPin className="w-4 h-4" />
                <span>{selectedArticleDetail.kabupaten}</span>
                {selectedArticleDetail.penulis && (
                  <>
                    <span className="text-slate-400">&bull;</span>
                    <span className="text-slate-500 font-normal">Oleh {selectedArticleDetail.penulis}</span>
                  </>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-slate-950 dark:text-white leading-snug">
                {selectedArticleDetail.judul}
              </h2>

              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 italic border-l-4 border-blue-900 pl-4 py-1">
                {selectedArticleDetail.ringkasan}
              </p>

              <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line pt-2">
                {selectedArticleDetail.isiLengkap || selectedArticleDetail.ringkasan}
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => setSelectedArticleDetail(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Tutup Informasi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: LIHAT SEMUA BERITA & DOKUMENTASI */}
      {isAllNewsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-5xl w-full max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Arsip Berita & Publikasi EPML Jawa Timur
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Daftar {articlesSource.length} dokumentasi kegiatan resmi dan liputan penyaluran bantuan di 38 Kabupaten/Kota
                </p>
              </div>
              <button
                onClick={() => setIsAllNewsModalOpen(false)}
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Filter Tabs */}
            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-2">Kategori:</span>
              {['ALL', 'Edukasi', 'Pemberdayaan Masyarakat', 'Lingkungan', 'Informasi Umum'].map(kat => (
                <button
                  key={kat}
                  onClick={() => setNewsFilterKategori(kat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    newsFilterKategori === kat
                      ? 'bg-blue-900 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {kat === 'ALL' ? `Semua Berita (${articlesSource.length})` : kat}
                </button>
              ))}
            </div>

            {/* Modal Content Grid */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {articlesSource
                .filter(art => newsFilterKategori === 'ALL' || art.kategori.includes(newsFilterKategori) || newsFilterKategori.includes(art.kategori))
                .map((art) => (
                  <div
                    key={art.id}
                    onClick={() => {
                      setSelectedArticleDetail(art);
                    }}
                    className="flex gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="w-28 h-24 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 relative group/thumb">
                      <img
                        src={art.gambar}
                        alt={art.judul}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxData({
                            isOpen: true,
                            imageUrl: art.gambar,
                            title: art.judul,
                            category: art.kategori,
                            date: art.tanggal,
                            location: art.kabupaten,
                            caption: art.ringkasan
                          });
                        }}
                        className="absolute bottom-1 right-1 p-1 rounded bg-black/70 hover:bg-black text-white text-[9px] flex items-center transition-opacity"
                        title="Perbesar Foto"
                      >
                        <ZoomIn className="w-3 h-3 text-amber-300" />
                      </button>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                          <span className="font-bold text-blue-900 dark:text-blue-400">{art.kategori}</span>
                          <span>&middot;</span>
                          <span>{art.kabupaten}</span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug group-hover:text-blue-800 dark:group-hover:text-blue-400">
                          {art.judul}
                        </h4>
                      </div>
                      <span className="text-[11px] font-semibold text-blue-900 dark:text-blue-400 flex items-center gap-1 mt-2">
                        Baca Selengkapnya &rarr;
                      </span>
                    </div>
                  </div>
                ))}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setIsAllNewsModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Tutup Arsip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX MODAL PERBESAR FOTO DASHBOARD DEPAN */}
      <ImageLightboxModal
        isOpen={lightboxData.isOpen}
        imageUrl={lightboxData.imageUrl}
        title={lightboxData.title}
        category={lightboxData.category}
        date={lightboxData.date}
        location={lightboxData.location}
        caption={lightboxData.caption}
        onClose={() => setLightboxData(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

