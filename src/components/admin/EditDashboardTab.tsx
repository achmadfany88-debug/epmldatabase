/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { LandingPageConfig, HeroSlideItem, UserAccount } from '../../types';
import { StorageService } from '../../services/storageService';
import {
  DRIVE_VIDEO_FOLDER_URL,
  DRIVE_PHOTO_ARCHIVE_ROOT_URL,
  uploadLandingVideoToGoogleDrive,
  getAccessToken,
  getActiveBudgetYear,
  setActiveBudgetYear,
  ensureYearlyArchiveFoldersForYear,
  getYearlyFoldersRegistry,
  DriveYearlyFolderEntry
} from '../../services/googleDriveService';
import { GoogleDriveConnectButton } from '../common/GoogleDriveConnectButton';
import { 
  LayoutTemplate, 
  Image as ImageIcon, 
  Video, 
  Plus, 
  Trash2, 
  MoveUp, 
  MoveDown, 
  Save, 
  RotateCcw, 
  Eye, 
  CheckCircle2, 
  Sparkles, 
  Play, 
  Pause, 
  RefreshCw,
  ExternalLink,
  Film,
  Upload,
  Info,
  Clock,
  Layers,
  Sliders,
  Palette,
  FolderOpen,
  Calendar
} from 'lucide-react';

interface EditDashboardTabProps {
  currentUser: UserAccount;
  landingConfig: LandingPageConfig;
  onUpdateLandingConfig: (newConfig: LandingPageConfig) => void;
  onOpenPublicLanding?: () => void;
}

// Preset photo assets (FHD 1080p standard)
const PRESET_PHOTOS = [
  {
    url: '/src/assets/images/bi_jatim_hero_1793505598999.jpg',
    title: 'Kantor Perwakilan BI Provinsi Jawa Timur',
    caption: 'Pusat Koordinasi Kebijakan & Inovasi Penyaluran Bantuan EPML'
  },
  {
    url: '/src/assets/images/bi_pahlawan_building_1793505599998.jpg',
    title: 'Gedung Bersejarah Bank Indonesia Surabaya',
    caption: 'Integritas & Akuntabilitas Tata Kelola Program Sosial Bank Indonesia'
  },
  {
    url: '/src/assets/images/bantuan_epml_activity_1793505601348.jpg',
    title: 'Pemberdayaan Masyarakat & Komunitas Vokasi Digital',
    caption: 'Penyaluran Tepat Sasaran di 38 Kabupaten dan Kota se-Jawa Timur'
  },
  {
    url: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=1920&q=80',
    title: 'Klaster Agribisnis & Ketahanan Pangan Berkelanjutan',
    caption: 'Hilirisasi Komoditas Unggulan Menuju Pasar Ekspor Global'
  },
  {
    url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1920&q=80',
    title: 'Pendidikan Vokasi & Transformasi Digital',
    caption: 'Modernisasi Laboratorium Komputer dan Akselerasi Keterampilan Generasi Muda'
  }
];

// Preset video assets (FHD 1080p standard looping video)
const PRESET_VIDEOS = [
  {
    label: 'Aerial Lanskap Perkotaan & Gedung Modern (FHD)',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-city-traffic-and-buildings-42654-large.mp4',
    poster: '/src/assets/images/bi_jatim_hero_1793505598999.jpg'
  },
  {
    label: 'Inovasi Agribisnis & Pertanian Berkelanjutan (FHD)',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-hands-holding-soil-with-a-growing-sprout-42988-large.mp4',
    poster: '/src/assets/images/bantuan_epml_activity_1793505601348.jpg'
  },
  {
    label: 'Pusat Riset & Data Analitik Modern (FHD)',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-hands-of-a-person-typing-on-a-laptop-42998-large.mp4',
    poster: '/src/assets/images/bi_pahlawan_building_1793505599998.jpg'
  }
];

export const EditDashboardTab: React.FC<EditDashboardTabProps> = ({
  currentUser,
  landingConfig,
  onUpdateLandingConfig,
  onOpenPublicLanding
}) => {
  // Local form state
  const [config, setConfig] = useState<LandingPageConfig>(landingConfig);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Slideshow preview state in admin
  const [previewSlideIndex, setPreviewSlideIndex] = useState(0);
  const [isPreviewAutoPlaying, setIsPreviewAutoPlaying] = useState(true);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(5);

  // New slide addition inline modal/form
  const [isAddingSlide, setIsAddingSlide] = useState(false);
  const [newSlideUrl, setNewSlideUrl] = useState('');
  const [newSlideTitle, setNewSlideTitle] = useState('');
  const [newSlideCaption, setNewSlideCaption] = useState('');
  const [slideToDeleteId, setSlideToDeleteId] = useState<string | null>(null);
  const [slideWarningMsg, setSlideWarningMsg] = useState('');
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [videoSavedNotice, setVideoSavedNotice] = useState('');
  const [selectedVideoYear, setSelectedVideoYear] = useState<number>(
    () => landingConfig.heroVideoTahunAnggaran || getActiveBudgetYear()
  );
  const [yearlyFolders, setYearlyFolders] = useState<DriveYearlyFolderEntry[]>(() =>
    getYearlyFoldersRegistry()
  );
  const [isCreatingYearFolder, setIsCreatingYearFolder] = useState(false);

  // Video preview ref
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  // Sync state when prop updates & hydrate persisted uploaded video from IndexedDB
  useEffect(() => {
    setConfig(landingConfig);
    if (landingConfig.heroVideoTahunAnggaran) {
      setSelectedVideoYear(landingConfig.heroVideoTahunAnggaran);
    }
  }, [landingConfig]);

  useEffect(() => {
    StorageService.hydratePersistedHeroVideo().then(hydrated => {
      if (hydrated) {
        setConfig(hydrated);
        onUpdateLandingConfig(hydrated);
      }
    });
  }, []);

  // Automatically ensure the active budget year folder ("EPML {tahun}") exists in both Arsip Video & Arsip Foto
  // whenever Google Drive is connected or the budget year changes
  useEffect(() => {
    let cancelled = false;
    getAccessToken().then(token => {
      if (token && !cancelled) {
        ensureYearlyArchiveFoldersForYear(selectedVideoYear, token)
          .then(() => {
            if (!cancelled) {
              setYearlyFolders(getYearlyFoldersRegistry());
            }
          })
          .catch(() => {
            // Silent if offline or token expired
          });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedVideoYear]);

  const handleSelectOrRolloverBudgetYear = async (targetYear: number, createInDriveNow = true) => {
    const validYear = setActiveBudgetYear(targetYear);
    setSelectedVideoYear(validYear);

    const existingEntry = getYearlyFoldersRegistry().find(e => e.tahun === validYear);
    const nextConfig: LandingPageConfig = {
      ...config,
      heroVideoTahunAnggaran: validYear,
      driveVideoYearFolderName: `EPML ${validYear}`,
      driveVideoYearFolderId: existingEntry?.videoYearFolderId || config.driveVideoYearFolderId,
      driveVideoYearFolderUrl: existingEntry?.videoYearFolderUrl || config.driveVideoYearFolderUrl
    };
    setConfig(nextConfig);
    StorageService.saveLandingConfig(nextConfig, currentUser.namaLengkap);
    onUpdateLandingConfig(nextConfig);

    if (!createInDriveNow) return;

    const token = await getAccessToken();
    if (!token) {
      setVideoSavedNotice(
        `Tahun Anggaran diatur ke EPML ${validYear}. Saat Google Drive terhubung atau video/foto diunggah, folder "EPML ${validYear}" otomatis dibuat di Arsip Foto & Arsip Video.`
      );
      setTimeout(() => setVideoSavedNotice(''), 6000);
      return;
    }

    setIsCreatingYearFolder(true);
    try {
      const entry = await ensureYearlyArchiveFoldersForYear(validYear, token);
      setYearlyFolders(getYearlyFoldersRegistry());
      const syncedConfig: LandingPageConfig = {
        ...nextConfig,
        driveVideoYearFolderId: entry.videoYearFolderId,
        driveVideoYearFolderName: entry.folderName,
        driveVideoYearFolderUrl: entry.videoYearFolderUrl
      };
      setConfig(syncedConfig);
      StorageService.saveLandingConfig(syncedConfig, currentUser.namaLengkap);
      onUpdateLandingConfig(syncedConfig);
      setVideoSavedNotice(
        `Folder Tahun Anggaran "${entry.folderName}" otomatis dibuat & disiapkan di Arsip Video dan Arsip Foto Google Drive!`
      );
      setTimeout(() => setVideoSavedNotice(''), 6500);
    } catch (err: any) {
      setVideoSavedNotice(
        err?.message || `Gagal membuat folder otomatis EPML ${validYear} di Google Drive.`
      );
      setTimeout(() => setVideoSavedNotice(''), 5500);
    } finally {
      setIsCreatingYearFolder(false);
    }
  };

  // Slideshow preview interval (every 5 seconds)
  useEffect(() => {
    if (!isPreviewAutoPlaying || config.heroMediaMode !== 'slideshow') return;
    const slidesCount = config.heroSlideshowImages?.length || 0;
    if (slidesCount <= 1) return;

    setTimerSecondsLeft(5);

    const countdown = setInterval(() => {
      setTimerSecondsLeft(prev => (prev <= 1 ? 5 : prev - 1));
    }, 1000);

    const slideTimer = setInterval(() => {
      setPreviewSlideIndex(prev => (prev + 1) % slidesCount);
      setTimerSecondsLeft(5);
    }, 5000);

    return () => {
      clearInterval(countdown);
      clearInterval(slideTimer);
    };
  }, [isPreviewAutoPlaying, config.heroMediaMode, config.heroSlideshowImages?.length]);

  // Handle Save
  const handleSave = () => {
    StorageService.saveLandingConfig(config, currentUser.namaLengkap);
    onUpdateLandingConfig(config);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Handle Reset to Default BI (while preserving uploaded video if present so it is never lost)
  const handleReset = () => {
    const hasUploadedVideo =
      config.heroVideoSourceType === 'upload' && Boolean(config.heroVideoUrl);
    const defaultConfig: LandingPageConfig = {
      ...config,
      heroTitle: 'Transparansi Penyaluran Bantuan & Program Sosial Bank Indonesia',
      heroSubtitle:
        'Sistem Monitoring dan Pelacakan Real-Time Program Edukasi, Pemberdayaan Masyarakat, dan Lingkungan (EPML) di Wilayah Kerja KPwBI Provinsi Jawa Timur.',
      navyOverlayOpacity: 50,
      heroMediaMode: hasUploadedVideo ? config.heroMediaMode : 'slideshow',
      backgroundType: hasUploadedVideo && config.heroMediaMode === 'video' ? 'video' : 'image',
      backgroundUrl: '/src/assets/images/bi_jatim_hero_1793505598999.jpg'
    };
    setConfig(defaultConfig);
    StorageService.saveLandingConfig(defaultConfig, currentUser.namaLengkap);
    onUpdateLandingConfig(defaultConfig);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Slide management handlers
  const handleAddSlide = () => {
    if (!newSlideUrl.trim()) return;
    const newSlide: HeroSlideItem = {
      id: `slide-${Date.now()}`,
      url: newSlideUrl.trim(),
      title: newSlideTitle.trim() || 'Dokumentasi Program EPML BI Jatim',
      caption: newSlideCaption.trim() || 'Penyaluran Bantuan Sosial & Pemberdayaan Ekonomi'
    };

    const updatedSlides = [...(config.heroSlideshowImages || []), newSlide];
    setConfig(prev => ({
      ...prev,
      heroSlideshowImages: updatedSlides,
      backgroundUrl: updatedSlides[0]?.url || prev.backgroundUrl
    }));

    setNewSlideUrl('');
    setNewSlideTitle('');
    setNewSlideCaption('');
    setIsAddingSlide(false);
  };

  const handleDeleteSlide = (id: string) => {
    if ((config.heroSlideshowImages?.length || 0) <= 1) {
      setSlideWarningMsg('Slideshow harus memiliki minimal 1 foto.');
      setTimeout(() => setSlideWarningMsg(''), 3500);
      return;
    }
    setSlideToDeleteId(id);
  };

  const handleConfirmDeleteSlide = () => {
    if (!slideToDeleteId) return;
    const updated = (config.heroSlideshowImages || []).filter(s => s.id !== slideToDeleteId);
    setConfig(prev => ({
      ...prev,
      heroSlideshowImages: updated,
      backgroundUrl: updated[0]?.url || prev.backgroundUrl
    }));
    setPreviewSlideIndex(0);
    setSlideToDeleteId(null);
  };

  const handleMoveSlide = (index: number, direction: 'UP' | 'DOWN') => {
    const list = [...(config.heroSlideshowImages || [])];
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    setConfig(prev => ({
      ...prev,
      heroSlideshowImages: list,
      backgroundUrl: list[0]?.url || prev.backgroundUrl
    }));
  };

  const handleUpdateSlideField = (id: string, field: 'title' | 'caption' | 'url', value: string) => {
    const list = (config.heroSlideshowImages || []).map(s => {
      if (s.id === id) {
        return { ...s, [field]: value };
      }
      return s;
    });
    setConfig(prev => ({ ...prev, heroSlideshowImages: list }));
  };

  // Add from Preset Photos
  const handleAddPresetPhoto = (preset: typeof PRESET_PHOTOS[0]) => {
    const newSlide: HeroSlideItem = {
      id: `slide-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      url: preset.url,
      title: preset.title,
      caption: preset.caption
    };
    const updated = [...(config.heroSlideshowImages || []), newSlide];
    setConfig(prev => ({ ...prev, heroSlideshowImages: updated }));
  };

  // Handle local image file upload (converts to base64)
  const handleUploadLocalImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setNewSlideUrl(reader.result);
        setNewSlideTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle local video file upload (permanently saved in IndexedDB & uploaded to Google Drive folder 1pYT5b3qMuKRPjywVky15fA-5MCTWvslW / EPML {tahun})
  const handleUploadLocalVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const targetYear = selectedVideoYear || getActiveBudgetYear();
    setIsUploadingVideo(true);
    try {
      let savedConfig = await StorageService.saveUploadedHeroVideo(
        file,
        {
          ...config,
          heroVideoTahunAnggaran: targetYear,
          driveVideoYearFolderName: `EPML ${targetYear}`
        },
        currentUser.namaLengkap
      );
      setConfig(savedConfig);
      onUpdateLandingConfig(savedConfig);

      // Upload to designated Google Drive folder inside subfolder "EPML {tahun}"
      // (https://drive.google.com/drive/folders/1pYT5b3qMuKRPjywVky15fA-5MCTWvslW?usp=sharing -> EPML {tahun})
      try {
        const token = await getAccessToken();
        if (token) {
          setVideoSavedNotice(
            `Menyiapkan folder "EPML ${targetYear}" & mengunggah video "${file.name}" ke Arsip Video Google Drive...`
          );
        }
        const driveUploaded = await uploadLandingVideoToGoogleDrive(file, targetYear);
        setYearlyFolders(getYearlyFoldersRegistry());
        savedConfig = {
          ...savedConfig,
          heroVideoTahunAnggaran: driveUploaded.tahun,
          driveVideoFolderUrl: DRIVE_VIDEO_FOLDER_URL,
          driveVideoYearFolderId: driveUploaded.yearFolderId,
          driveVideoYearFolderName: driveUploaded.yearFolderName,
          driveVideoYearFolderUrl: driveUploaded.yearFolderUrl,
          driveVideoFileId: driveUploaded.fileId,
          driveVideoWebViewLink: driveUploaded.webViewLink
        };
        StorageService.saveLandingConfig(savedConfig, currentUser.namaLengkap);
        setConfig(savedConfig);
        onUpdateLandingConfig(savedConfig);
        setVideoSavedNotice(
          `Video "${file.name}" berhasil disimpan permanen dan diarsipkan ke Google Drive dalam folder "${driveUploaded.yearFolderName}" (${driveUploaded.fileName})!`
        );
      } catch (driveErr: any) {
        setVideoSavedNotice(
          `Video "${file.name}" berhasil disimpan permanen di sistem (Tahun Anggaran: EPML ${targetYear}). Hubungkan Google Drive di bawah untuk mengunggah ke folder Arsip Video / EPML ${targetYear}.`
        );
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
      setTimeout(() => {
        setVideoSavedNotice('');
      }, 7500);
    } finally {
      setIsUploadingVideo(false);
      e.target.value = '';
    }
  };

  // Test loop video button (seeks to near end)
  const handleTestVideoLoop = () => {
    if (videoPreviewRef.current) {
      const dur = videoPreviewRef.current.duration;
      if (dur && !isNaN(dur) && dur > 2) {
        videoPreviewRef.current.currentTime = dur - 1.5;
        videoPreviewRef.current.play();
      }
    }
  };

  const currentSlides = config.heroSlideshowImages || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-900 text-white shadow-xs">
            <LayoutTemplate className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                Edit Dashboard & Landing Page
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-300">
                FHD Quality
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Atur teks hero utama, rotasi otomatis slideshow foto tiap 5 detik (looping), atau alihkan ke video tunggal looping tanpa jeda.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {onOpenPublicLanding && (
            <button
              onClick={onOpenPublicLanding}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Lihat Hasil Landing</span>
            </button>
          )}

          <button
            onClick={handleReset}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Reset ke pengaturan default"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-900 hover:bg-blue-800 text-white flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            {saveSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Tersimpan!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* SECTION 1: EDIT TITLE & SUBTITLE */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>1. Teks Judul & Sub-Judul Landing Page</span>
            </h3>
            <p className="text-xs text-slate-500">
              Ubah teks sambutan utama yang tampil di bagian atas banner publik Bank Indonesia.
            </p>
          </div>
          <span className="text-[11px] font-medium text-slate-400">
            Responsif Semua Ukuran Layar
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Judul Utama Hero (Title)
            </label>
            <input
              type="text"
              value={config.heroTitle}
              onChange={e => setConfig(prev => ({ ...prev, heroTitle: e.target.value }))}
              placeholder="Contoh: Sistem Data Terpadu EPML Provinsi Jawa Timur"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Sub-Judul / Penjelasan Hero (Sub-title)
            </label>
            <textarea
              rows={3}
              value={config.heroSubtitle}
              onChange={e => setConfig(prev => ({ ...prev, heroSubtitle: e.target.value }))}
              placeholder="Jelaskan maksud dan sistem keterpaduan pemantauan bantuan..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-blue-900"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Disarankan 1-3 kalimat ringkas agar teks tetap nyaman dibaca di atas foto atau video hero.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 2: MEDIA MODE SELECTION (SLIDESHOW 5 DETIK VS 1 VIDEO LOOPING) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>2. Mode Media Hero Landing Page</span>
            </h3>
            <p className="text-xs text-slate-500">
              Pilih apakah Landing Page menampilkan galeri foto berganti otomatis 5 detik (looping) atau 1 video berputar terus menerus.
            </p>
          </div>
          <span className="text-[11px] font-semibold text-blue-900 dark:text-blue-400">
            Maksimal Resolusi FHD (1080p)
          </span>
        </div>

        {/* Tab Selector Mode */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              const nextConfig: LandingPageConfig = {
                ...config,
                heroMediaMode: 'slideshow',
                backgroundType: 'image',
                backgroundUrl:
                  config.heroSlideshowImages?.[0]?.url ||
                  '/src/assets/images/bi_jatim_hero_1793505598999.jpg'
              };
              setConfig(nextConfig);
              StorageService.saveLandingConfig(nextConfig, currentUser.namaLengkap);
              onUpdateLandingConfig(nextConfig);
            }}
            className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer relative ${
              config.heroMediaMode === 'slideshow'
                ? 'border-blue-900 bg-blue-50/50 dark:bg-blue-950/30'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-950'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg ${config.heroMediaMode === 'slideshow' ? 'bg-blue-900 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}>
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Mode Slideshow Foto
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Efek slide tiap 5 detik otomatis & looping terus-menerus
                  </p>
                </div>
              </div>
              {config.heroMediaMode === 'slideshow' && (
                <span className="w-2.5 h-2.5 rounded-full bg-blue-900 ring-4 ring-blue-100 dark:ring-blue-900/50" />
              )}
            </div>
            <div className="mt-3 flex items-center gap-2 text-[10px] font-semibold text-blue-900 dark:text-blue-300 bg-blue-100/60 dark:bg-blue-900/40 px-2 py-1 rounded-md w-fit">
              <Clock className="w-3 h-3" />
              <span>Rotasi Interval: 5 Detik • Looping Aktif</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              const nextConfig: LandingPageConfig = {
                ...config,
                heroMediaMode: 'video',
                backgroundType: 'video',
                backgroundUrl: config.heroVideoUrl || PRESET_VIDEOS[0].url
              };
              setConfig(nextConfig);
              StorageService.saveLandingConfig(nextConfig, currentUser.namaLengkap);
              onUpdateLandingConfig(nextConfig);
            }}
            className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer relative ${
              config.heroMediaMode === 'video'
                ? 'border-blue-900 bg-blue-50/50 dark:bg-blue-950/30'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-950'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg ${config.heroMediaMode === 'video' ? 'bg-blue-900 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}>
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Mode Video Tunggal
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    1 Video langsung tanpa slide & otomatis looping jika habis
                  </p>
                </div>
              </div>
              {config.heroMediaMode === 'video' && (
                <span className="w-2.5 h-2.5 rounded-full bg-blue-900 ring-4 ring-blue-100 dark:ring-blue-900/50" />
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-100/60 dark:bg-emerald-950/40 px-2 py-1 rounded-md w-fit">
                <Film className="w-3 h-3" />
                <span>Hanya 1 Video • Auto Replay Looping</span>
              </div>
              {config.heroVideoSourceType === 'upload' && config.uploadedVideoFileName && (
                <span className="text-[10px] font-bold text-blue-900 dark:text-blue-300 bg-blue-100/70 dark:bg-blue-950/60 px-2 py-1 rounded-md truncate max-w-[180px]">
                  Tersimpan: {config.uploadedVideoFileName}
                </span>
              )}
            </div>
          </button>
        </div>

        {/* SUB-SECTION A: SLIDESHOW CONFIGURATION */}
        {config.heroMediaMode === 'slideshow' && (
          <div className="space-y-4 pt-2">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <Info className="w-4 h-4 text-blue-900 dark:text-blue-400 shrink-0" />
                <span>
                  Total <strong>{currentSlides.length} foto</strong> terdaftar dalam slideshow hero. Foto berputar bergantian tiap 5 detik dan berulang terus.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingSlide(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-900 text-white hover:bg-blue-800 flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Foto Baru</span>
              </button>
            </div>

            {/* Quick Presets Recommendation */}
            <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/50 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 dark:text-blue-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Rekomendasi Foto FHD Resmi Bank Indonesia Jawa Timur:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {PRESET_PHOTOS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAddPresetPhoto(preset)}
                    className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3 h-3 text-blue-900 dark:text-blue-400" />
                    <span>{preset.title.split(' ')[0]} {preset.title.split(' ')[1]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Inline Add Slide Form */}
            {isAddingSlide && (
              <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-blue-900 dark:text-blue-300">
                    Input Foto FHD Baru untuk Slideshow
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsAddingSlide(false)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Batal
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      URL Foto (Direct Link / FHD 1920x1080)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={newSlideUrl}
                        onChange={e => setNewSlideUrl(e.target.value)}
                        placeholder="https://... atau path lokal"
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                      <label className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-50 cursor-pointer flex items-center gap-1 text-slate-700 dark:text-slate-300">
                        <Upload className="w-3 h-3" />
                        <span>Upload File</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUploadLocalImage}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Judul / Label Foto
                    </label>
                    <input
                      type="text"
                      value={newSlideTitle}
                      onChange={e => setNewSlideTitle(e.target.value)}
                      placeholder="Contoh: Pemberdayaan UMKM Kopi Ijen"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Keterangan Singkat (Caption)
                    </label>
                    <input
                      type="text"
                      value={newSlideCaption}
                      onChange={e => setNewSlideCaption(e.target.value)}
                      placeholder="Contoh: Bantuan Mesin Huller & Roaster Industri"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>

                {newSlideUrl && (
                  <div className="w-32 h-20 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 relative">
                    <img
                      src={newSlideUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={e => {
                        (e.target as HTMLImageElement).src = '/src/assets/images/bi_jatim_hero_1793505598999.jpg';
                      }}
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingSlide(false)}
                    className="px-3 py-1 text-xs text-slate-600 hover:text-slate-800"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleAddSlide}
                    disabled={!newSlideUrl.trim()}
                    className="px-4 py-1.5 text-xs font-bold rounded-lg bg-blue-900 hover:bg-blue-800 text-white disabled:opacity-50 cursor-pointer"
                  >
                    Tambahkan ke Slideshow
                  </button>
                </div>
              </div>
            )}

            {/* List of Current Slides */}
            <div className="space-y-3">
              {currentSlides.map((slide, index) => (
                <div
                  key={slide.id}
                  className="p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all hover:border-slate-300"
                >
                  {/* Thumbnail & Order indicator */}
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center shrink-0">
                      {index + 1}
                    </div>

                    <div className="w-24 h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 shrink-0 relative group">
                      <img
                        src={slide.url}
                        alt={slide.title || `Slide ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={e => {
                          (e.target as HTMLImageElement).src = '/src/assets/images/bi_jatim_hero_1793505598999.jpg';
                        }}
                      />
                      <span className="absolute bottom-0 right-0 bg-slate-950/70 text-[9px] text-white px-1 font-mono">
                        FHD
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={slide.title || ''}
                        onChange={e => handleUpdateSlideField(slide.id, 'title', e.target.value)}
                        placeholder="Judul foto..."
                        className="w-full text-xs font-bold text-slate-900 dark:text-slate-100 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-900 focus:outline-hidden py-0.5"
                      />
                      <input
                        type="text"
                        value={slide.caption || ''}
                        onChange={e => handleUpdateSlideField(slide.id, 'caption', e.target.value)}
                        placeholder="Keterangan singkat..."
                        className="w-full text-[11px] text-slate-500 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-900 focus:outline-hidden py-0.5 mt-0.5"
                      />
                      <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5 max-w-xs">
                        {slide.url}
                      </p>
                    </div>
                  </div>

                  {/* Actions & Reordering */}
                  <div className="flex items-center gap-1.5 self-end md:self-center shrink-0">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveSlide(index, 'UP')}
                      title="Geser ke Atas / Lebih Awal"
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer"
                    >
                      <MoveUp className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      disabled={index === currentSlides.length - 1}
                      onClick={() => handleMoveSlide(index, 'DOWN')}
                      title="Geser ke Bawah / Lebih Akhir"
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer"
                    >
                      <MoveDown className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteSlide(slide.id)}
                      title="Hapus Foto"
                      className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/60 hover:bg-red-50 text-red-600 dark:text-red-400 cursor-pointer ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUB-SECTION B: SINGLE VIDEO CONFIGURATION */}
        {config.heroMediaMode === 'video' && (
          <div className="space-y-4 pt-2">
            <div className="p-4 bg-emerald-50/80 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/50 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Film className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-900 dark:text-emerald-200">
                  <p className="font-bold">
                    Ketentuan Mode Video Tunggal & Otomatisasi Folder Tahun Anggaran Google Drive:
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed">
                    Menampilkan <strong>1 video tunggal</strong> tanpa fitur slide. Video yang diunggah otomatis <strong>disimpan permanen</strong> selama belum diganti serta ditempatkan ke <strong>Folder Arsip Video / EPML {selectedVideoYear}</strong>. Jika tahun anggaran berganti (misal ke <strong>EPML {selectedVideoYear + 1}</strong> dan seterusnya), sistem otomatis membuat folder tahun baru di <strong>Arsip Video</strong> maupun <strong>Arsip Foto</strong>.
                  </p>
                </div>
              </div>

              <div className="shrink-0">
                <GoogleDriveConnectButton
                  folderUrl={config.driveVideoYearFolderUrl || DRIVE_VIDEO_FOLDER_URL}
                  folderLabel={`Folder Drive Video (EPML ${selectedVideoYear})`}
                  compact={false}
                  onConnected={async token => {
                    try {
                      const entry = await ensureYearlyArchiveFoldersForYear(selectedVideoYear, token);
                      setYearlyFolders(getYearlyFoldersRegistry());
                      const nextCfg: LandingPageConfig = {
                        ...config,
                        heroVideoTahunAnggaran: selectedVideoYear,
                        driveVideoYearFolderId: entry.videoYearFolderId,
                        driveVideoYearFolderName: entry.folderName,
                        driveVideoYearFolderUrl: entry.videoYearFolderUrl
                      };
                      setConfig(nextCfg);
                      StorageService.saveLandingConfig(nextCfg, currentUser.namaLengkap);
                      onUpdateLandingConfig(nextCfg);
                      setVideoSavedNotice(
                        `Google Drive terhubung! Folder "${entry.folderName}" telah disiapkan otomatis di Arsip Video & Arsip Foto.`
                      );
                      setTimeout(() => setVideoSavedNotice(''), 6000);
                    } catch {
                      // Ignore error
                    }
                  }}
                />
              </div>
            </div>

            {/* Panel Otomatisasi Folder Tahun Anggaran (Arsip Video & Arsip Foto) */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 rounded-lg bg-blue-900 text-white shrink-0 mt-0.5">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                        Folder Tahun Anggaran Aktif: EPML {selectedVideoYear}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        Otomatis Buat Folder Saat Tahun Berganti
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Pilih atau tambahkan Tahun Anggaran baru untuk langsung menyiapkan subfolder <strong>EPML [Tahun]</strong> secara otomatis pada <strong>Arsip Video</strong> dan <strong>Arsip Foto Penerima</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  {Array.from(
                    new Set([
                      2025,
                      2026,
                      2027,
                      2028,
                      selectedVideoYear,
                      ...yearlyFolders.map(y => y.tahun)
                    ])
                  )
                    .sort((a, b) => a - b)
                    .map(yr => {
                      const isCurrent = yr === selectedVideoYear;
                      const isProvisioned = yearlyFolders.some(
                        y => y.tahun === yr && y.videoYearFolderId && y.photoYearFolderId
                      );
                      return (
                        <button
                          key={yr}
                          type="button"
                          disabled={isCreatingYearFolder}
                          onClick={() => handleSelectOrRolloverBudgetYear(yr, true)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer border ${
                            isCurrent
                              ? 'bg-[#002B66] text-white border-[#002B66] shadow-2xs'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-500'
                          }`}
                          title={`Gunakan & siapkan otomatis folder EPML ${yr} di Arsip Video dan Arsip Foto`}
                        >
                          <FolderOpen className="w-3.5 h-3.5 shrink-0" />
                          <span>EPML {yr}</span>
                          {isProvisioned && (
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isCurrent ? 'bg-emerald-300' : 'bg-emerald-500'
                              }`}
                              title="Folder EPML tahun ini sudah siap di Google Drive"
                            />
                          )}
                        </button>
                      );
                    })}

                  <button
                    type="button"
                    disabled={isCreatingYearFolder}
                    onClick={() => {
                      const maxYr = Math.max(
                        2026,
                        selectedVideoYear,
                        ...yearlyFolders.map(y => y.tahun)
                      );
                      handleSelectOrRolloverBudgetYear(maxYr + 1, true);
                    }}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 inline-flex items-center gap-1 transition-colors cursor-pointer"
                    title="Simulasikan pergantian tahun anggaran berikutnya & buat folder otomatis"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>
                      + Tahun{' '}
                      {Math.max(2026, selectedVideoYear, ...yearlyFolders.map(y => y.tahun)) + 1}
                    </span>
                  </button>
                </div>
              </div>

              {/* Daftar Folder Tahun yang Telah Disiapkan di Arsip Video & Arsip Foto */}
              {yearlyFolders.length > 0 && (
                <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="font-bold text-slate-500 dark:text-slate-400">
                    Subfolder Tahun di Google Drive:
                  </span>
                  {yearlyFolders.map(entry => (
                    <div
                      key={entry.tahun}
                      className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                    >
                      <span className="font-extrabold text-[#002B66] dark:text-blue-300">
                        {entry.folderName}
                      </span>
                      {entry.videoYearFolderUrl && (
                        <a
                          href={entry.videoYearFolderUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-700 dark:text-emerald-400 font-semibold hover:underline inline-flex items-center gap-0.5"
                          title={`Buka Folder Arsip Video ${entry.folderName}`}
                        >
                          <span>Arsip Video</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                      {entry.photoYearFolderUrl && (
                        <a
                          href={entry.photoYearFolderUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-700 dark:text-blue-400 font-semibold hover:underline inline-flex items-center gap-0.5"
                          title={`Buka Folder Arsip Foto ${entry.folderName}`}
                        >
                          <span>Arsip Foto</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {videoSavedNotice && (
              <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 font-bold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{videoSavedNotice}</span>
              </div>
            )}

            {/* Active Uploaded Video Persistent Card */}
            {config.heroVideoSourceType === 'upload' && config.uploadedVideoFileName && (
              <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border-2 border-blue-900/30 dark:border-blue-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#002B66] text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Video className="w-5 h-5 text-amber-300" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                        {config.uploadedVideoFileName}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        ✓ Tersimpan Permanen & Aktif
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                        Folder: {config.driveVideoYearFolderName || `EPML ${selectedVideoYear}`}
                      </span>
                      {config.driveVideoFileId && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                          ☁ Tersimpan di Google Drive
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {config.uploadedVideoSize
                        ? `Ukuran File: ${(config.uploadedVideoSize / (1024 * 1024)).toFixed(2)} MB • `
                        : ''}
                      {config.uploadedVideoUpdatedAt
                        ? `Diunggah: ${config.uploadedVideoUpdatedAt}`
                        : 'Tersimpan di database media'}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-1">
                      <p className="text-[10px] text-blue-900 dark:text-blue-300 font-semibold">
                        Video ini terkunci sebagai video utama dan tidak akan hilang selama belum diganti.
                      </p>
                      {config.driveVideoYearFolderUrl && (
                        <a
                          href={config.driveVideoYearFolderUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-900 dark:text-blue-300 hover:underline"
                        >
                          <FolderOpen className="w-3 h-3" />
                          <span>
                            Buka Folder {config.driveVideoYearFolderName || `EPML ${selectedVideoYear}`}
                          </span>
                        </a>
                      )}
                      {config.driveVideoWebViewLink && (
                        <a
                          href={config.driveVideoWebViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Lihat File Video di Google Drive</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <label className="px-3.5 py-2 rounded-xl bg-[#002B66] hover:bg-blue-800 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-xs transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploadingVideo ? 'Mengunggah ke Drive...' : 'Ganti Video Baru'}</span>
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/*"
                    onChange={handleUploadLocalVideo}
                    disabled={isUploadingVideo}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {/* Upload Local Video & Custom Video URL Input */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    Upload File Video Lokal (.mp4 / .webm) atau Masukkan URL Video
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Saat Anda mengunggah video, sistem langsung menyimpannya secara permanen agar tidak hilang.
                  </p>
                </div>

                <label className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer flex items-center justify-center gap-2 shrink-0 shadow-xs transition-colors">
                  <Upload className="w-4 h-4" />
                  <span>
                    {isUploadingVideo
                      ? 'Menyimpan Video...'
                      : config.heroVideoSourceType === 'upload'
                      ? 'Upload & Ganti Video'
                      : 'Upload Video Lokal'}
                  </span>
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/*"
                    onChange={handleUploadLocalVideo}
                    disabled={isUploadingVideo}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <input
                  type="url"
                  value={
                    config.heroVideoSourceType === 'upload'
                      ? ''
                      : config.heroVideoUrl || ''
                  }
                  onChange={e => {
                    const val = e.target.value;
                    const nextConfig: LandingPageConfig = {
                      ...config,
                      heroVideoUrl: val,
                      backgroundUrl: val,
                      heroVideoSourceType: 'url',
                      uploadedVideoFileName: undefined,
                      uploadedVideoSize: undefined
                    };
                    setConfig(nextConfig);
                  }}
                  placeholder={
                    config.heroVideoSourceType === 'upload' && config.uploadedVideoFileName
                      ? `Menggunakan video upload tersimpan: ${config.uploadedVideoFileName} (Ketik URL di sini jika ingin ganti ke link eksternal)`
                      : 'https://.../video.mp4'
                  }
                  className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-900"
                />
              </div>
            </div>

            {/* Quick Video Presets */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Atau Pilih Preset Video FHD Bank Indonesia:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {PRESET_VIDEOS.map((pv, idx) => {
                  const isSelected =
                    config.heroVideoSourceType !== 'upload' && config.heroVideoUrl === pv.url;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        const nextConfig: LandingPageConfig = {
                          ...config,
                          heroMediaMode: 'video',
                          backgroundType: 'video',
                          heroVideoUrl: pv.url,
                          heroVideoPoster: pv.poster,
                          backgroundUrl: pv.url,
                          heroVideoSourceType: 'preset',
                          uploadedVideoFileName: pv.label,
                          uploadedVideoSize: undefined
                        };
                        setConfig(nextConfig);
                        StorageService.saveLandingConfig(nextConfig, currentUser.namaLengkap);
                        onUpdateLandingConfig(nextConfig);
                        setVideoSavedNotice(`Preset video "${pv.label}" dipilih & disimpan.`);
                        setTimeout(() => setVideoSavedNotice(''), 4000);
                      }}
                      className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                        isSelected
                          ? 'border-blue-900 bg-blue-50/60 dark:bg-blue-950/40 font-bold text-blue-900 dark:text-blue-300 ring-1 ring-blue-900/30'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <p className="truncate font-semibold">{pv.label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">MP4 • FHD 1080p Loop</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Video Test & Controls */}
            {config.heroVideoUrl && (
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Live Video Player (Looping Test)
                    </span>
                    {config.uploadedVideoFileName && (
                      <span className="text-[11px] font-semibold text-blue-900 dark:text-blue-300">
                        — {config.uploadedVideoFileName}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleTestVideoLoop}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Lompat ke akhir video untuk memverifikasi looping otomatis"
                  >
                    <RefreshCw className="w-3 h-3 text-blue-900 dark:text-blue-400" />
                    <span>Uji Ulang Looping</span>
                  </button>
                </div>

                <div className="aspect-video w-full max-w-xl mx-auto rounded-xl overflow-hidden bg-slate-900 relative shadow-md">
                  <video
                    ref={videoPreviewRef}
                    key={config.heroVideoUrl}
                    src={config.heroVideoUrl}
                    autoPlay
                    muted
                    loop
                    playsInline
                    controls
                    className="w-full h-full object-cover"
                    onEnded={() => {
                      if (videoPreviewRef.current) {
                        videoPreviewRef.current.currentTime = 0;
                        videoPreviewRef.current.play();
                      }
                    }}
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[10px] text-white font-mono flex items-center gap-1.5 pointer-events-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>FHD 1080p • Tersimpan & Looping Otomatis</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 3: PENGATURAN TINGKAT TRANSPARANSI WARNA BIRU NAVY (OVERLAY BACKGROUND) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-900 dark:text-blue-400" />
              <span>3. Pengaturan Transparansi Warna Biru Navy (Background Hero)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Atur seberapa transparan atau pekat lapisan warna biru navy korporat Bank Indonesia di atas foto / video background landing page.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
              Opasitas: {config.navyOverlayOpacity ?? 65}%
            </span>
          </div>
        </div>

        {/* Interactive Slider & Status */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Tingkat Kepekatan Warna Biru Navy (0% - 100%)
              </p>
              <p className="text-[11px] text-slate-500">
                Geser ke kiri untuk membuat foto/video lebih transparan dan jernih, atau geser ke kanan agar teks lebih kontras dan dominan navy.
              </p>
            </div>
            
            {/* Visual indicator badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
              <span 
                className="w-3.5 h-3.5 rounded-full border border-slate-400/50 shadow-inner"
                style={{
                  backgroundColor: '#071630',
                  opacity: (config.navyOverlayOpacity ?? 65) / 100
                }}
              />
              <span className="font-semibold">
                {(config.navyOverlayOpacity ?? 65) <= 20 && 'Transparan Tinggi (Foto Sangat Jernih)'}
                {(config.navyOverlayOpacity ?? 65) > 20 && (config.navyOverlayOpacity ?? 65) <= 45 && 'Transparan Lembut (Biru Ringan)'}
                {(config.navyOverlayOpacity ?? 65) > 45 && (config.navyOverlayOpacity ?? 65) <= 75 && 'Standar Rekomendasi BI (Ideal Kontras Teks)'}
                {(config.navyOverlayOpacity ?? 65) > 75 && 'Pekat Gelap (Maksimal Kontras)'}
              </span>
            </div>
          </div>

          {/* Range Slider with Gradient Track */}
          <div className="space-y-2">
            <div className="relative pt-1">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={config.navyOverlayOpacity ?? 65}
                onChange={e => setConfig(prev => ({ ...prev, navyOverlayOpacity: Number(e.target.value) }))}
                className="w-full h-3 bg-gradient-to-r from-blue-200/40 via-blue-900/60 to-slate-950 rounded-lg appearance-none cursor-pointer accent-blue-900 focus:outline-hidden"
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>0% (Bening Penuh)</span>
              <span>25%</span>
              <span className="font-bold text-blue-900 dark:text-blue-400">65% (Standar Ideal)</span>
              <span>85%</span>
              <span>100% (Solid Navy)</span>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="pt-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Preset Pilihan Cepat:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { label: 'Jernih Bersih', value: 20, desc: 'Foto Terang 20%' },
                { label: 'Transparan Lembut', value: 40, desc: 'Biru Halus 40%' },
                { label: 'Standar Ideal BI', value: 65, desc: 'Rekomendasi 65%' },
                { label: 'Pekat Berimbang', value: 80, desc: 'Teks Kontras 80%' },
                { label: 'Solid Korporat', value: 95, desc: 'Navy Pekat 95%' },
              ].map(preset => {
                const isSelected = (config.navyOverlayOpacity ?? 65) === preset.value;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setConfig(prev => ({ ...prev, navyOverlayOpacity: preset.value }))}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-900 bg-blue-50/70 dark:bg-blue-950/50 ring-2 ring-blue-900/30'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-950'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {preset.value}%
                      </span>
                      <span 
                        className="w-2.5 h-2.5 rounded-full border border-slate-300"
                        style={{
                          backgroundColor: '#071630',
                          opacity: preset.value / 100
                        }}
                      />
                    </div>
                    <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300 mt-1 leading-tight">
                      {preset.label}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {preset.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: LIVE HERO BANNER INTERACTIVE PREVIEW */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>4. Simulasi Tampilan Banner Hero Publik (Resolusi FHD)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Berikut adalah pratinjau persis bagaimana pengunjung melihat banner landing page dengan pengaturan Anda saat ini (termasuk tingkat transparansi biru navy).
            </p>
          </div>

          {/* Controls for slideshow preview */}
          {config.heroMediaMode === 'slideshow' && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                <Clock className="w-3 h-3 text-blue-900 dark:text-blue-400" />
                <span>Next in: {timerSecondsLeft}s</span>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewAutoPlaying(prev => !prev)}
                className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-100"
                title={isPreviewAutoPlaying ? 'Jeda Auto-Slide' : 'Mulai Auto-Slide'}
              >
                {isPreviewAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>

        {/* Hero Preview Container */}
        <div className="relative min-h-[380px] sm:min-h-[440px] rounded-2xl overflow-hidden border border-slate-800 shadow-xl flex items-center">
          {/* Background Layer */}
          <div className="absolute inset-0 z-0 bg-slate-950">
            {config.heroMediaMode === 'video' && config.heroVideoUrl ? (
              <video
                key={config.heroVideoUrl}
                src={config.heroVideoUrl}
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover filter brightness-[0.75]"
                onEnded={() => {
                  if (videoPreviewRef.current) {
                    videoPreviewRef.current.currentTime = 0;
                    videoPreviewRef.current.play();
                  }
                }}
              />
            ) : currentSlides.length > 0 ? (
              currentSlides.map((slide, idx) => (
                <div
                  key={slide.id}
                  className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                    idx === (previewSlideIndex % currentSlides.length) ? 'opacity-100 z-1' : 'opacity-0 z-0'
                  }`}
                >
                  <img
                    src={slide.url}
                    alt={slide.title || 'Slide'}
                    className="w-full h-full object-cover filter brightness-[0.75] scale-102 transition-transform duration-1000"
                    onError={e => {
                      (e.target as HTMLImageElement).src = '/src/assets/images/bi_jatim_hero_1793505598999.jpg';
                    }}
                  />
                </div>
              ))
            ) : (
              <img
                src="/src/assets/images/bi_jatim_hero_1793505598999.jpg"
                alt="BI Hero"
                className="w-full h-full object-cover filter brightness-[0.75]"
              />
            )}

            {/* Configurable Navy Gradient Scrim with real-time reactive opacity */}
            <div 
              className="absolute inset-0 z-2 pointer-events-none transition-opacity duration-200"
              style={{
                background: 'linear-gradient(to top, rgba(2, 6, 23, 0.95) 0%, rgba(10, 25, 54, 0.85) 50%, rgba(15, 35, 75, 0.65) 100%)',
                opacity: (config.navyOverlayOpacity ?? 65) / 100
              }}
            />
          </div>

          {/* Hero Content Overlay */}
          <div className="relative z-10 p-6 sm:p-10 max-w-2xl text-white space-y-4">
            <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider uppercase text-blue-300">
              <span>Edukasi, Pemberdayaan Masyarakat dan Lingkungan (EPML)</span>
              <span>&middot;</span>
              <span>Jawa Timur</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {config.heroTitle || 'Sistem Data Terpadu EPML Provinsi Jawa Timur'}
            </h1>

            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal">
              {config.heroSubtitle || 'Platform terintegrasi pelacakan real-time, geo-tagging presisi, dan verifikasi QR Code...'}
            </p>

            <div className="pt-2 flex items-center gap-3">
              <span className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-white shadow-md inline-block">
                Masuk Petugas & Admin
              </span>
            </div>
          </div>

          {/* Slideshow Dot Indicators (Only in slideshow mode) */}
          {config.heroMediaMode === 'slideshow' && currentSlides.length > 1 && (
            <div className="absolute bottom-4 right-6 z-20 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
              {currentSlides.map((_, dotIdx) => (
                <button
                  key={dotIdx}
                  type="button"
                  onClick={() => {
                    setPreviewSlideIndex(dotIdx);
                    setTimerSecondsLeft(5);
                  }}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    dotIdx === (previewSlideIndex % currentSlides.length)
                      ? 'w-6 bg-white'
                      : 'w-2 bg-white/40 hover:bg-white/70'
                  }`}
                  title={`Ke Slide ${dotIdx + 1}`}
                />
              ))}
              <span className="text-[10px] text-white/80 font-mono ml-1">
                {(previewSlideIndex % currentSlides.length) + 1}/{currentSlides.length}
              </span>
            </div>
          )}

          {/* Slide Caption in corner */}
          {config.heroMediaMode === 'slideshow' && currentSlides[previewSlideIndex % currentSlides.length]?.caption && (
            <div className="absolute top-4 right-4 z-20 hidden sm:flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10 text-[10px] text-slate-200 max-w-xs">
              <Info className="w-3 h-3 text-blue-400 shrink-0" />
              <span className="truncate">
                {currentSlides[previewSlideIndex % currentSlides.length]?.title || currentSlides[previewSlideIndex % currentSlides.length]?.caption}
              </span>
            </div>
          )}

          {/* Video indicator in corner */}
          {config.heroMediaMode === 'video' && (
            <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-emerald-950/70 backdrop-blur-md px-3 py-1 rounded-lg border border-emerald-500/30 text-[10px] text-emerald-300 font-semibold">
              <Film className="w-3 h-3 text-emerald-400" />
              <span>Mode 1 Video FHD • Looping Terus</span>
            </div>
          )}
        </div>
      </div>

      {/* Floating Save & Action Footer */}
      <div className="sticky bottom-4 z-30 p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Mode aktif: <strong>{config.heroMediaMode === 'slideshow' ? 'Slideshow Foto (5 Detik Loop)' : 'Video Tunggal (Looping Otomatis)'}</strong>. Perubahan langsung tersimpan ke sistem.
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {onOpenPublicLanding && (
            <button
              onClick={onOpenPublicLanding}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition-colors"
            >
              Lihat Tampilan Publik
            </button>
          )}

          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-900 hover:bg-blue-800 text-white flex items-center gap-2 shadow-md transition-all cursor-pointer"
          >
            {saveSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Berhasil Disimpan!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan Landing Page</span>
              </>
            )}
          </button>
        </div>
      </div>

      {slideWarningMsg && (
        <div className="fixed bottom-20 right-6 z-50 px-4 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-bold shadow-xl">
          {slideWarningMsg}
        </div>
      )}

      {/* Modal Konfirmasi Hapus Foto Slide */}
      {slideToDeleteId && (() => {
        const targetSlide = currentSlides.find(s => s.id === slideToDeleteId);
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={() => setSlideToDeleteId(null)}
          >
            <div
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex flex-col items-center text-center space-y-2.5">
                <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/80 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 flex items-center justify-center shadow-xs">
                  <Trash2 className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60">
                  Peringatan Hapus Slide Foto
                </span>
                <h4 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
                  Apakah benar data ini dihapus ?
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Foto ini akan dihapus dari daftar slideshow banner Hero Landing Page.
                </p>
              </div>

              {targetSlide && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center gap-3 text-left">
                  <img
                    src={targetSlide.url}
                    alt={targetSlide.title}
                    className="w-14 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate">
                      {targetSlide.title || 'Slide Foto Hero'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {targetSlide.caption}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSlideToDeleteId(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteSlide}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Ya, Hapus Data</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
