/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { StorageService } from '../../services/storageService';
import {
  DRIVE_VIDEO_FOLDER_URL,
  DRIVE_PHOTO_ARCHIVE_ROOT_URL,
  DRIVE_BACKUP_FOLDER_URL,
  uploadBackupJsonToGoogleDrive,
  getActiveBudgetYear,
  setActiveBudgetYear,
  getYearlyFoldersRegistry,
  ensureYearlyArchiveFoldersForYear,
  ensureAllActiveYearlyArchiveFolders,
  subscribeGoogleDriveAuth,
  DriveYearlyFolderEntry
} from '../../services/googleDriveService';
import { GoogleDriveConnectButton } from '../common/GoogleDriveConnectButton';
import { 
  AdminMenuTab,
  AnomaliDistribusi, 
  ArtikelItem,
  BantuanItem, 
  JadwalSurveiMonitoringItem,
  KategoriSumberBantuan,
  LandingPageConfig, 
  SystemAuditLog, 
  UserAccount, 
  UserRole,
  VendorItem
} from '../../types';
import { PetaJawaTimur } from '../map/PetaJawaTimur';
import { VendorManagement } from './VendorManagement';
import { EditDashboardTab } from './EditDashboardTab';
import { ArtikelBeritaManagement } from './ArtikelBeritaManagement';
import { EditPaguModal } from './EditPaguModal';
import { BulkImportBantuanModal } from './BulkImportBantuanModal';
import { BantuanChartsPanel } from './BantuanChartsPanel';
import { HasilTrackingMonitoringTab } from './HasilTrackingMonitoringTab';
import { CriticalAuditTimelineWidget } from './CriticalAuditTimelineWidget';
import { KalenderSurveiMonitoring } from './KalenderSurveiMonitoring';
import { PrintQrStickerModal, QrStickerDesignCard, getTotalBarangUnits } from './PrintQrStickerModal';
import { WILAYAH_JAWA_TIMUR, WILAYAH_KERJA_KPW_JATIM } from '../../data/initialData';
import { 
  BarChart3, 
  MapPin, 
  FileText, 
  QrCode, 
  Shield,
  ShieldCheck, 
  Users, 
  Settings,
  Coins, 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  Eye, 
  EyeOff,
  KeyRound,
  Download, 
  Upload, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Send, 
  Lock, 
  Database, 
  ExternalLink, 
  CloudUpload,
  Calendar,
  Layers,
  Activity,
  UserCheck,
  UserX,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Truck,
  LayoutTemplate,
  Newspaper,
  Moon,
  Sun,
  Bell,
  Printer,
  Filter,
  RotateCcw,
  ClipboardCheck,
  FolderOpen
} from 'lucide-react';

export const ADMIN_NAV_MENUS: {
  id: AdminMenuTab;
  label: string;
  shortLabel: string;
  desc: string;
}[] = [
  {
    id: 'ANALYTICS',
    label: 'Visualisasi & Anggaran Real-Time',
    shortLabel: 'Visualisasi & Anggaran',
    desc: 'Grafik realisasi anggaran, pagu tahunan & distribusi per pilar'
  },
  {
    id: 'KALENDER',
    label: 'Kalender Survei Asesmen & Monitoring',
    shortLabel: 'Kalender Survei & Monitoring',
    desc: 'Jadwal survei asesmen lapangan, monitoring penerima bantuan & evaluasi'
  },
  {
    id: 'MAP',
    label: 'Peta Sebaran & Geo-Tagging Jatim',
    shortLabel: 'Peta Sebaran Jatim',
    desc: 'Peta tematik 13 wilayah kerja, Pen Tool & update peta kewilayahan'
  },
  {
    id: 'REKAP',
    label: 'Pencatatan & Rekapitulasi Penerima',
    shortLabel: 'Pencatatan Penerima',
    desc: 'Tabel data penerima bantuan EPML, tambah/edit data & ekspor laporan'
  },
  {
    id: 'QR',
    label: 'QR Code & Tracking Fisik',
    shortLabel: 'QR Code & Tracking',
    desc: 'Katalog stiker QR unik per unit barang, cetak stiker A4 & update kondisi fisik'
  },
  {
    id: 'MONITORING',
    label: 'Hasil Tracking & Monitoring Bantuan',
    shortLabel: 'Hasil Tracking & Monitoring',
    desc: 'Detail kondisi fisik tiap barang/item di tiap penerima bantuan secara real-time'
  },
  {
    id: 'VENDOR',
    label: 'Data Vendor',
    shortLabel: 'Data Vendor',
    desc: 'Manajemen rekanan vendor PKP/Non-PKP & riwayat pengadaan'
  },
  {
    id: 'EDIT_DASHBOARD',
    label: 'Edit Dashboard',
    shortLabel: 'Edit Dashboard',
    desc: 'Pengaturan tampilan hero beranda, slideshow & media publik'
  },
  {
    id: 'ARTIKEL',
    label: 'Edit Artikel & Berita',
    shortLabel: 'Artikel & Berita',
    desc: 'Publikasi berita & dokumentasi penyaluran bantuan EPML'
  },
  {
    id: 'USERS',
    label: 'Manajemen Pengguna & Verifikasi',
    shortLabel: 'Manajemen Pengguna',
    desc: 'Kelola akun pengguna, password login & ceklist hak akses menu'
  },
  {
    id: 'AUDIT',
    label: 'Audit Log Sistem & Sesi',
    shortLabel: 'Audit Log Sistem',
    desc: 'Rekam jejak aktivitas login, scan QR & perubahan data sistem'
  },
  {
    id: 'CONFIG',
    label: 'Konfigurasi & Backup Cloud',
    shortLabel: 'Konfigurasi & Backup',
    desc: 'Pengaturan pagu tahunan, unduh/impor backup JSON & Google Drive'
  }
];

const ALL_MENU_IDS: AdminMenuTab[] = ADMIN_NAV_MENUS.map(m => m.id);

interface AdminDashboardProps {
  currentUser: UserAccount;
  bantuanList: BantuanItem[];
  landingConfig: LandingPageConfig;
  auditLogs: SystemAuditLog[];
  userAccounts: UserAccount[];
  vendorList?: VendorItem[];
  artikelList?: ArtikelItem[];
  jadwalKalender?: JadwalSurveiMonitoringItem[];
  anomalies: AnomaliDistribusi[];
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
  anomalyCount?: number;
  onOpenAnomalyModal?: () => void;
  onUpdateBantuanList: (newList: BantuanItem[]) => void;
  onUpdateLandingConfig: (newConfig: LandingPageConfig) => void;
  onUpdateUserAccounts: (newUsers: UserAccount[]) => void;
  onUpdateVendorList?: (newVendors: VendorItem[]) => void;
  onUpdateArtikelList?: (newArtikels: ArtikelItem[]) => void;
  onUpdateJadwalKalender?: (newJadwal: JadwalSurveiMonitoringItem[]) => void;
  onOpenKalenderFullPage?: () => void;
  onRefreshData: () => void;
  onOpenCreateBantuan: () => void;
  onOpenEditBantuan: (item: BantuanItem) => void;
  onOpenDetailBantuan: (item: BantuanItem) => void;
  onOpenQrScanner: (bantuanId?: string) => void;
  onOpenExportReport: () => void;
  onOpenWhatsApp: (item: BantuanItem) => void;
  onCloseAdmin: () => void;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  bantuanList,
  landingConfig,
  auditLogs,
  userAccounts,
  vendorList,
  artikelList,
  jadwalKalender,
  anomalies,
  darkMode,
  onToggleDarkMode,
  anomalyCount,
  onOpenAnomalyModal,
  onUpdateBantuanList,
  onUpdateLandingConfig,
  onUpdateUserAccounts,
  onUpdateVendorList,
  onUpdateArtikelList,
  onUpdateJadwalKalender,
  onOpenKalenderFullPage,
  onRefreshData,
  onOpenCreateBantuan,
  onOpenEditBantuan,
  onOpenDetailBantuan,
  onOpenQrScanner,
  onOpenExportReport,
  onOpenWhatsApp,
  onCloseAdmin,
  onLogout
}) => {
  // Determine which navigation menus the current logged-in user is allowed to access
  const userAllowedMenus = useMemo<AdminMenuTab[]>(() => {
    if (currentUser.username === 'Admin') {
      return ALL_MENU_IDS;
    }
    if (Array.isArray(currentUser.allowedMenus) && currentUser.allowedMenus.length > 0) {
      const list = [...currentUser.allowedMenus];
      if (
        !list.includes('KALENDER') &&
        (list.includes('ANALYTICS') || list.includes('REKAP') || list.includes('MONITORING'))
      ) {
        list.push('KALENDER');
      }
      return list;
    }
    return ALL_MENU_IDS;
  }, [currentUser]);

  const [activeTab, setActiveTab] = useState<AdminMenuTab>(() => {
    if (currentUser.username === 'Admin') return 'ANALYTICS';
    if (Array.isArray(currentUser.allowedMenus) && currentUser.allowedMenus.length > 0) {
      return currentUser.allowedMenus[0];
    }
    return 'ANALYTICS';
  });

  // Ensure activeTab stays within userAllowedMenus if currentUser changes
  useEffect(() => {
    if (!userAllowedMenus.includes(activeTab) && userAllowedMenus.length > 0) {
      setActiveTab(userAllowedMenus[0]);
    }
  }, [userAllowedMenus, activeTab]);

  // Vendor Data State
  const [vendors, setVendors] = useState<VendorItem[]>(() => vendorList || StorageService.getVendors());

  useEffect(() => {
    if (vendorList) {
      setVendors(vendorList);
    }
  }, [vendorList]);

  const handleSaveVendor = (vendor: VendorItem) => {
    StorageService.saveVendor(vendor, currentUser.namaLengkap);
    const updated = StorageService.getVendors();
    setVendors(updated);
    if (onUpdateVendorList) {
      onUpdateVendorList(updated);
    }
    onRefreshData();
  };

  const handleDeleteVendor = (vendorId: string) => {
    StorageService.deleteVendor(vendorId, currentUser.namaLengkap);
    const updated = StorageService.getVendors();
    setVendors(updated);
    if (onUpdateVendorList) {
      onUpdateVendorList(updated);
    }
    onRefreshData();
  };

  // Artikel & Berita State
  const [artikels, setArtikels] = useState<ArtikelItem[]>(() => artikelList || StorageService.getArtikelList());

  useEffect(() => {
    if (artikelList) {
      setArtikels(artikelList);
    }
  }, [artikelList]);

  const handleSaveArtikel = (item: ArtikelItem) => {
    StorageService.saveArtikel(item, currentUser.namaLengkap);
    const updated = StorageService.getArtikelList();
    setArtikels(updated);
    if (onUpdateArtikelList) {
      onUpdateArtikelList(updated);
    }
    onRefreshData();
  };

  const handleDeleteArtikel = (id: string) => {
    StorageService.deleteArtikel(id, currentUser.namaLengkap);
    const updated = StorageService.getArtikelList();
    setArtikels(updated);
    if (onUpdateArtikelList) {
      onUpdateArtikelList(updated);
    }
    onRefreshData();
  };

  // Jadwal Kalender Survei Asesmen & Monitoring State
  const [jadwals, setJadwals] = useState<JadwalSurveiMonitoringItem[]>(
    () => jadwalKalender || StorageService.getJadwalKalender()
  );

  useEffect(() => {
    if (jadwalKalender) {
      setJadwals(jadwalKalender);
    }
  }, [jadwalKalender]);

  const handleSaveJadwal = (item: JadwalSurveiMonitoringItem) => {
    StorageService.saveJadwalKalender(item, currentUser.namaLengkap);
    const updated = StorageService.getJadwalKalender();
    setJadwals(updated);
    if (onUpdateJadwalKalender) {
      onUpdateJadwalKalender(updated);
    }
    onUpdateBantuanList(StorageService.getBantuanList());
    onRefreshData();
  };

  const handleDeleteJadwal = (id: string) => {
    StorageService.deleteJadwalKalender(id, currentUser.namaLengkap);
    const updated = StorageService.getJadwalKalender();
    setJadwals(updated);
    if (onUpdateJadwalKalender) {
      onUpdateJadwalKalender(updated);
    }
    onRefreshData();
  };

  const handleToggleShowKalenderOnTopDashboard = (show: boolean) => {
    const updatedConfig: LandingPageConfig = {
      ...landingConfig,
      tampilkanKalenderDiDashboardAtas: show
    };
    setLocalConfig(updatedConfig);
    StorageService.saveLandingConfig(updatedConfig, currentUser.namaLengkap);
    onUpdateLandingConfig(updatedConfig);
    onRefreshData();
  };

  const handleQuickChangeKategoriInisiatif = (item: BantuanItem, newInisiatif: KategoriSumberBantuan) => {
    const updatedItem: BantuanItem = {
      ...item,
      kategoriInisiatif: newInisiatif
    };
    StorageService.saveBantuan(updatedItem, currentUser.namaLengkap);
    onUpdateBantuanList(StorageService.getBantuanList());
    onRefreshData();
  };

  // Search & Filter in Table
  const [tableSearch, setTableSearch] = useState('');
  const [filterKabupaten, setFilterKabupaten] = useState('');
  const [filterKategoriLembaga, setFilterKategoriLembaga] = useState<string>('ALL');
  const [filterKategori, setFilterKategori] = useState('ALL');
  const [filterKategoriInisiatif, setFilterKategoriInisiatif] = useState<string>('ALL');
  const [filterTahap, setFilterTahap] = useState('ALL');
  const [filterTahun, setFilterTahun] = useState<string>('ALL');

  // Pagination for Rekapitulasi Table (Maksimal 10 penerima per halaman)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Reset pagination to page 1 when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [tableSearch, filterKabupaten, filterKategoriLembaga, filterKategori, filterKategoriInisiatif, filterTahap, filterTahun]);

  // Logistics Sync Status
  const [syncingLogistics, setSyncingLogistics] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  // Landing Config Local Edit State
  const [localConfig, setLocalConfig] = useState<LandingPageConfig>({ ...landingConfig });
  const [configSavedToast, setConfigSavedToast] = useState(false);

  useEffect(() => {
    setLocalConfig({ ...landingConfig });
  }, [landingConfig]);

  // New / Edit User Form State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newNamaLengkap, setNewNamaLengkap] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('PIC Asesmen & Lapangan');
  const [newAllowedMenus, setNewAllowedMenus] = useState<AdminMenuTab[]>([
    'ANALYTICS',
    'MAP',
    'REKAP',
    'QR',
    'MONITORING'
  ]);
  const [newIsAccountActive, setNewIsAccountActive] = useState(true);
  const [userFormError, setUserFormError] = useState('');
  const [visiblePasswordsMap, setVisiblePasswordsMap] = useState<Record<string, boolean>>({});
  const [detailAccessUser, setDetailAccessUser] = useState<UserAccount | null>(null);

  // Backup & Restore State
  const [restoreMessage, setRestoreMessage] = useState('');
  const [gdriveSyncSuccess, setGdriveSyncSuccess] = useState(false);
  const [gdriveSyncMessage, setGdriveSyncMessage] = useState('');
  const [gdriveBackupFileUrl, setGdriveBackupFileUrl] = useState<string>(
    landingConfig.driveLastBackupWebViewLink || ''
  );
  const [isSyncingBackupDrive, setIsSyncingBackupDrive] = useState(false);
  const [isBackupConfirmModalOpen, setIsBackupConfirmModalOpen] = useState(false);

  // Automatic Yearly Folder State for Arsip Foto & Arsip Video
  const [activeBudgetYear, setActiveBudgetYearState] = useState<number>(() => getActiveBudgetYear());
  const [yearlyFoldersRegistry, setYearlyFoldersRegistry] = useState<DriveYearlyFolderEntry[]>(() =>
    getYearlyFoldersRegistry()
  );
  const [isSyncingYearlyFolders, setIsSyncingYearlyFolders] = useState(false);
  const [yearlyFolderNotice, setYearlyFolderNotice] = useState('');

  // Annual Pagu Allocation State (editable)
  const [annualPagu, setAnnualPagu] = useState<number>(() => StorageService.getAnnualPagu());
  const [isEditPaguModalOpen, setIsEditPaguModalOpen] = useState(false);

  const handleSaveAnnualPagu = (newPagu: number, catatan?: string) => {
    StorageService.saveAnnualPagu(newPagu, currentUser.namaLengkap);
    setAnnualPagu(newPagu);
    onRefreshData();
  };

  // Calculations for Financial Dashboard
  const totalRealisasi = useMemo(() => 
    bantuanList.reduce((acc, curr) => acc + curr.nominalBantuan, 0), 
    [bantuanList]
  );
  const totalPaguJatim = annualPagu;
  const sisaPaguJatim = Math.max(0, totalPaguJatim - totalRealisasi);
  const persentaseSerapan = totalPaguJatim > 0 ? ((totalRealisasi / totalPaguJatim) * 100).toFixed(1) : '0';

  // Quarterly breakdown
  const perTriwulan = useMemo(() => {
    const res = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
    bantuanList.forEach(b => {
      if (res[b.triwulan] !== undefined) {
        res[b.triwulan] += b.nominalBantuan;
      }
    });
    return res;
  }, [bantuanList]);

  // Pillar breakdown
  const perPilar = useMemo(() => {
    const res = { Edukasi: 0, 'Pemberdayaan Masyarakat': 0, Lingkungan: 0 };
    bantuanList.forEach(b => {
      if (res[b.kategoriBantuan] !== undefined) {
        res[b.kategoriBantuan] += b.nominalBantuan;
      }
    });
    return res;
  }, [bantuanList]);

  // Kategori Bantuan (BI Driven vs Eksternal) breakdown
  const perKategoriInisiatif = useMemo(() => {
    const res = {
      'BI Driven': {
        count: 0,
        nominal: 0,
        pilar: { Edukasi: 0, 'Pemberdayaan Masyarakat': 0, Lingkungan: 0 }
      },
      Eksternal: {
        count: 0,
        nominal: 0,
        pilar: { Edukasi: 0, 'Pemberdayaan Masyarakat': 0, Lingkungan: 0 }
      }
    };
    bantuanList.forEach(b => {
      const kat: KategoriSumberBantuan = b.kategoriInisiatif === 'Eksternal' ? 'Eksternal' : 'BI Driven';
      res[kat].count += 1;
      res[kat].nominal += b.nominalBantuan;
      if (res[kat].pilar[b.kategoriBantuan] !== undefined) {
        res[kat].pilar[b.kategoriBantuan] += 1;
      }
    });
    return res;
  }, [bantuanList]);

  // Stage breakdown
  const perTahap = useMemo(() => {
    const map = new Map<string, number>();
    bantuanList.forEach(b => {
      map.set(b.statusTahap, (map.get(b.statusTahap) || 0) + 1);
    });
    return map;
  }, [bantuanList]);

  // Available years extracted from bantuan data + active budget year + provisioned Google Drive year folders
  const availableYears = useMemo(() => {
    const set = new Set<number>([2024, 2025, 2026, activeBudgetYear]);
    bantuanList.forEach(b => {
      if (b.tahun) set.add(b.tahun);
    });
    yearlyFoldersRegistry.forEach(y => {
      if (y.tahun) set.add(y.tahun);
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [bantuanList, activeBudgetYear, yearlyFoldersRegistry]);

  // Automatically ensure "EPML {tahun}" folders exist in BOTH Arsip Foto & Arsip Video
  // whenever Google Drive connects or when the budget year / data years advance
  useEffect(() => {
    const unsub = subscribeGoogleDriveAuth(state => {
      if (state.isConnected && state.accessToken) {
        const dataYears = Array.from(
          new Set([
            activeBudgetYear,
            landingConfig.heroVideoTahunAnggaran || activeBudgetYear,
            ...bantuanList.map(b => b.tahun).filter(Boolean)
          ])
        );
        ensureAllActiveYearlyArchiveFolders(dataYears, false)
          .then(res => {
            if (res.synced) {
              setYearlyFoldersRegistry(res.entries);
            }
          })
          .catch(() => {});
      }
    });
    return () => unsub();
  }, [activeBudgetYear, bantuanList, landingConfig.heroVideoTahunAnggaran]);

  // Handler to switch or rollover to a new Budget Year & automatically create folders in Arsip Foto & Arsip Video
  const handleRolloverOrPrepareBudgetYear = async (targetYear: number) => {
    const validYear = setActiveBudgetYear(targetYear);
    setActiveBudgetYearState(validYear);
    setIsSyncingYearlyFolders(true);
    setYearlyFolderNotice('');
    try {
      const entry = await ensureYearlyArchiveFoldersForYear(validYear);
      setYearlyFoldersRegistry(getYearlyFoldersRegistry());

      const latestSavedLanding = StorageService.getLandingConfig();
      const updatedLanding: LandingPageConfig = {
        ...latestSavedLanding,
        ...landingConfig,
        heroVideoTahunAnggaran: validYear,
        driveVideoYearFolderId: entry.videoYearFolderId,
        driveVideoYearFolderName: entry.folderName,
        driveVideoYearFolderUrl: entry.videoYearFolderUrl
      };
      setLocalConfig(updatedLanding);
      StorageService.saveLandingConfig(updatedLanding, currentUser.namaLengkap);
      onUpdateLandingConfig(updatedLanding);

      StorageService.logAudit({
        username: currentUser.namaLengkap,
        role: currentUser.role,
        aksi: 'AUTO_CREATE_YEAR_ARCHIVE_FOLDER',
        target: entry.folderName,
        detail: `Otomatis membuat & menyiapkan folder Tahun Anggaran "${entry.folderName}" di Arsip Foto Penerima dan Arsip Video Google Drive.`,
        status: 'SUCCESS'
      });

      setYearlyFolderNotice(
        `Folder Tahun Anggaran "${entry.folderName}" berhasil dibuat otomatis pada Arsip Foto Penerima & Arsip Video Google Drive!`
      );
      onRefreshData();
      setTimeout(() => setYearlyFolderNotice(''), 7000);
    } catch (err: any) {
      setYearlyFolderNotice(
        `Tahun Anggaran aktif diubah ke EPML ${validYear}. Hubungkan Google Drive untuk langsung membuat folder "EPML ${validYear}" di Arsip Foto & Arsip Video.`
      );
      setTimeout(() => setYearlyFolderNotice(''), 6500);
    } finally {
      setIsSyncingYearlyFolders(false);
    }
  };

  // Filtered Table List
  const filteredTableList = useMemo(() => {
    return bantuanList.filter(b => {
      const katInisiatif = b.kategoriInisiatif || 'BI Driven';
      const matchSearch =
        b.id.toLowerCase().includes(tableSearch.toLowerCase()) ||
        b.namaPenerima.toLowerCase().includes(tableSearch.toLowerCase()) ||
        b.kabupatenKota.toLowerCase().includes(tableSearch.toLowerCase()) ||
        (b.alamat || '').toLowerCase().includes(tableSearch.toLowerCase()) ||
        (b.statusAsesmen || '').toLowerCase().includes(tableSearch.toLowerCase()) ||
        katInisiatif.toLowerCase().includes(tableSearch.toLowerCase()) ||
        b.kategoriLembaga.toLowerCase().includes(tableSearch.toLowerCase()) ||
        b.vendorPenyedia.toLowerCase().includes(tableSearch.toLowerCase()) ||
        b.picAsesmen.toLowerCase().includes(tableSearch.toLowerCase());

      const matchKab = !filterKabupaten || b.kabupatenKota === filterKabupaten;
      const matchKatLembaga = filterKategoriLembaga === 'ALL' || b.kategoriLembaga === filterKategoriLembaga;
      const matchKat = filterKategori === 'ALL' || b.kategoriBantuan === filterKategori;
      const matchKatInisiatif = filterKategoriInisiatif === 'ALL' || katInisiatif === filterKategoriInisiatif;
      const matchThp = filterTahap === 'ALL' || b.statusTahap === filterTahap;
      const matchThn = filterTahun === 'ALL' || b.tahun.toString() === filterTahun;

      return matchSearch && matchKab && matchKatLembaga && matchKat && matchKatInisiatif && matchThp && matchThn;
    });
  }, [bantuanList, tableSearch, filterKabupaten, filterKategoriLembaga, filterKategori, filterKategoriInisiatif, filterTahap, filterTahun]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredTableList.length / itemsPerPage));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (validCurrentPage - 1) * itemsPerPage;
  const paginatedTableList = useMemo(() => {
    return filteredTableList.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTableList, startIndex, itemsPerPage]);

  // --- QR CODE CATALOG FILTER & PRINT STATE ---
  const [qrSearchQuery, setQrSearchQuery] = useState('');
  const [qrFilterTahun, setQrFilterTahun] = useState<string>('ALL');
  const [qrFilterLokasi, setQrFilterLokasi] = useState<string>('ALL');
  const [qrFilterKategoriLembaga, setQrFilterKategoriLembaga] = useState<string>('ALL');
  const [isPrintQrModalOpen, setIsPrintQrModalOpen] = useState(false);
  const [customPrintItems, setCustomPrintItems] = useState<BantuanItem[] | null>(null);
  const [printInitialCopiesMap, setPrintInitialCopiesMap] = useState<Record<string, number>>({});
  const [qrCardCopyCounts, setQrCardCopyCounts] = useState<Record<string, number>>({});
  const [selectedQrIds, setSelectedQrIds] = useState<string[]>([]);
  const [isBulkImportCsvOpen, setIsBulkImportCsvOpen] = useState(false);
  const [bulkImportSuccessMessage, setBulkImportSuccessMessage] = useState<string>('');

  const getCardCopyCount = (item: BantuanItem): number => {
    const custom = qrCardCopyCounts[item.id];
    if (typeof custom === 'number' && custom >= 1) {
      return Math.min(500, Math.floor(custom));
    }
    return getTotalBarangUnits(item);
  };

  const [qrPreviewUnitMap, setQrPreviewUnitMap] = useState<Record<string, number>>({});

  const setCardCopyCount = (itemId: string, count: number) => {
    const clamped = Math.max(1, Math.min(500, Math.floor(count || 1)));
    setQrCardCopyCounts(prev => ({
      ...prev,
      [itemId]: clamped
    }));
    setQrPreviewUnitMap(prev => ({
      ...prev,
      [itemId]: 1
    }));
  };

  const toggleSelectQrItem = (id: string) => {
    setSelectedQrIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const toggleSelectAllFromList = (list: BantuanItem[]) => {
    const listIds = list.map(i => i.id);
    const allSelected = listIds.length > 0 && listIds.every(id => selectedQrIds.includes(id));
    if (allSelected) {
      setSelectedQrIds(prev => prev.filter(id => !listIds.includes(id)));
    } else {
      setSelectedQrIds(prev => Array.from(new Set([...prev, ...listIds])));
    }
  };

  const KATEGORI_LEMBAGA_OPTIONS = [
    'Sekolah / Pesantren',
    'UMKM / Koperasi',
    'Kelompok Tani / Nelayan',
    'Komunitas Lingkungan',
    'Yayasan Sosial',
    'Lembaga Keagamaan',
    'Lainnya'
  ];

  // Ensure every Bantuan item has a generated QR code immediately upon listing or creation
  useEffect(() => {
    if (bantuanList.some(b => !b.qrCodeDataUrl)) {
      StorageService.ensureAllQrCodesGenerated().then(hydrated => {
        onUpdateBantuanList(hydrated);
      });
    }
  }, [bantuanList, onUpdateBantuanList]);

  const filteredQrList = useMemo(() => {
    const q = qrSearchQuery.trim().toLowerCase();
    return bantuanList.filter(item => {
      const matchSearch =
        !q ||
        item.id.toLowerCase().includes(q) ||
        item.namaPenerima.toLowerCase().includes(q) ||
        item.kabupatenKota.toLowerCase().includes(q) ||
        item.kategoriLembaga.toLowerCase().includes(q) ||
        item.detailBantuan.toLowerCase().includes(q) ||
        item.vendorPenyedia.toLowerCase().includes(q);

      const matchTahun = qrFilterTahun === 'ALL' || item.tahun.toString() === qrFilterTahun;
      const matchLokasi = qrFilterLokasi === 'ALL' || item.kabupatenKota === qrFilterLokasi;
      const matchKategoriLembaga =
        qrFilterKategoriLembaga === 'ALL' || item.kategoriLembaga === qrFilterKategoriLembaga;

      return matchSearch && matchTahun && matchLokasi && matchKategoriLembaga;
    });
  }, [bantuanList, qrSearchQuery, qrFilterTahun, qrFilterLokasi, qrFilterKategoriLembaga]);

  const selectedQrCatalogItems = useMemo(
    () => filteredQrList.filter(item => selectedQrIds.includes(item.id)),
    [filteredQrList, selectedQrIds]
  );

  const qrFilterSummaryText = useMemo(() => {
    const parts: string[] = [];
    if (qrFilterTahun !== 'ALL') parts.push(`Tahun ${qrFilterTahun}`);
    if (qrFilterLokasi !== 'ALL') parts.push(qrFilterLokasi);
    if (qrFilterKategoriLembaga !== 'ALL') parts.push(qrFilterKategoriLembaga);
    if (qrSearchQuery.trim()) parts.push(`Pencarian "${qrSearchQuery.trim()}"`);
    return parts.length > 0 ? `Filter Aktif: ${parts.join(' • ')}` : 'Semua Data Penerima EPML';
  }, [qrFilterTahun, qrFilterLokasi, qrFilterKategoriLembaga, qrSearchQuery]);

  // Handle Third Party Logistics API Sync
  const handleSyncLogistics = async () => {
    setSyncingLogistics(true);
    setSyncMessage('');
    try {
      const result = await StorageService.syncThirdPartyLogistics();
      setSyncMessage(result.message);
      onRefreshData();
    } finally {
      setSyncingLogistics(false);
      setTimeout(() => setSyncMessage(''), 5000);
    }
  };

  // Confirmation Popup State for Delete Actions (Bantuan & User Account)
  const [deleteConfirmState, setDeleteConfirmState] = useState<{
    type: 'BANTUAN' | 'USER';
    id: string;
    title: string;
    subtitle?: string;
    detailInfo?: string;
  } | null>(null);

  // Handle Delete Bantuan with Custom Confirmation Popup
  const handleDeleteBantuan = (item: BantuanItem) => {
    setDeleteConfirmState({
      type: 'BANTUAN',
      id: item.id,
      title: item.namaPenerima,
      subtitle: `ID Bantuan: ${item.id} • ${item.kabupatenKota}`,
      detailInfo: `Pilar ${item.kategoriBantuan} (${item.detailBantuan}) — Rp ${item.nominalBantuan.toLocaleString('id-ID')}`
    });
  };

  // Handle Save Landing Configuration
  const handleSaveLandingConfig = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.saveLandingConfig(localConfig, currentUser.namaLengkap);
    onUpdateLandingConfig(localConfig);
    setConfigSavedToast(true);
    setTimeout(() => setConfigSavedToast(false), 3000);
  };

  // Open modal for creating a new user
  const handleOpenCreateUserModal = () => {
    setEditingUserId(null);
    setNewUsername('');
    setNewPassword('');
    setShowNewPassword(false);
    setNewNamaLengkap('');
    setNewEmail('');
    setNewRole('PIC Asesmen & Lapangan');
    setNewAllowedMenus(['ANALYTICS', 'MAP', 'REKAP', 'QR', 'MONITORING']);
    setNewIsAccountActive(true);
    setUserFormError('');
    setShowAddUserModal(true);
  };

  // Open modal for editing an existing user's password & menu access
  const handleOpenEditUserModal = (user: UserAccount) => {
    setEditingUserId(user.id);
    setNewUsername(user.username);
    setNewPassword(user.password || (user.username === 'Admin' ? 'Admin' : 'Admin123'));
    setShowNewPassword(false);
    setNewNamaLengkap(user.namaLengkap);
    setNewEmail(user.email);
    setNewRole(user.role);
    setNewAllowedMenus(
      Array.isArray(user.allowedMenus) && user.allowedMenus.length > 0
        ? [...user.allowedMenus]
        : [...ALL_MENU_IDS]
    );
    setNewIsAccountActive(user.isEmailVerified);
    setUserFormError('');
    setShowAddUserModal(true);
  };

  const toggleAllowedMenuSelection = (menuId: AdminMenuTab) => {
    setNewAllowedMenus(prev =>
      prev.includes(menuId) ? prev.filter(id => id !== menuId) : [...prev, menuId]
    );
    setUserFormError('');
  };

  // Handle Create or Update User Account
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setUserFormError('');

    const cleanUsername = newUsername.trim();
    const cleanPassword = newPassword.trim();
    const cleanNama = newNamaLengkap.trim();
    const cleanEmail = newEmail.trim() || `${cleanUsername.toLowerCase()}@gmail.com`;

    if (!cleanUsername || !cleanNama) {
      setUserFormError('Username dan Nama Lengkap wajib diisi.');
      return;
    }

    if (!cleanPassword) {
      setUserFormError('Password wajib diisi agar akun langsung jadi dan siap digunakan login.');
      return;
    }

    if (newAllowedMenus.length === 0) {
      setUserFormError('Pilih minimal 1 menu navigasi pada ceklist Hak Akses Sistem.');
      return;
    }

    // Check duplicate username when creating a new user
    const duplicate = userAccounts.find(
      u => u.username.toLowerCase() === cleanUsername.toLowerCase() && u.id !== editingUserId
    );
    if (duplicate) {
      setUserFormError(`Username "${cleanUsername}" sudah digunakan. Silakan pilih username lain.`);
      return;
    }

    const existingUser = editingUserId ? userAccounts.find(u => u.id === editingUserId) : null;

    const savedUser: UserAccount = {
      id: existingUser ? existingUser.id : `USR-${Math.floor(100 + Math.random() * 900)}`,
      username: cleanUsername,
      password: cleanPassword,
      namaLengkap: cleanNama,
      email: cleanEmail,
      role: newAllowedMenus.length === ALL_MENU_IDS.length ? 'Super Admin' : newRole,
      allowedMenus: [...newAllowedMenus],
      isEmailVerified: newIsAccountActive,
      twoFactorEnabled: false,
      lastLogin: existingUser ? existingUser.lastLogin : '-',
      createdAt: existingUser ? existingUser.createdAt : new Date().toISOString().slice(0, 10)
    };

    StorageService.saveUser(savedUser, currentUser.namaLengkap);
    onUpdateUserAccounts(StorageService.getUsers());
    setShowAddUserModal(false);
    setEditingUserId(null);
  };

  // Toggle Email Verification
  const handleToggleVerification = (userId: string) => {
    StorageService.toggleEmailVerification(userId, currentUser.namaLengkap);
    onUpdateUserAccounts(StorageService.getUsers());
  };

  // Delete User Account with Custom Confirmation Popup
  const handleDeleteUser = (userId: string) => {
    const targetUser = userAccounts.find(u => u.id === userId);
    if (!targetUser || targetUser.username === 'Admin') return;
    setDeleteConfirmState({
      type: 'USER',
      id: userId,
      title: targetUser.namaLengkap,
      subtitle: `@${targetUser.username} • ${targetUser.email}`,
      detailInfo: `Peran: ${targetUser.role} (${(targetUser.allowedMenus || []).length} Menu Navigasi)`
    });
  };

  // Execute confirmed deletion for Bantuan or User Account
  const handleConfirmDeleteAction = () => {
    if (!deleteConfirmState) return;

    if (deleteConfirmState.type === 'BANTUAN') {
      StorageService.deleteBantuan(deleteConfirmState.id, currentUser.namaLengkap);
      const updatedBantuan = StorageService.getBantuanList();
      onUpdateBantuanList(updatedBantuan);
      setSelectedQrIds(prev => prev.filter(id => id !== deleteConfirmState.id));
      onRefreshData();
    } else if (deleteConfirmState.type === 'USER') {
      StorageService.deleteUser(deleteConfirmState.id, currentUser.namaLengkap);
      const updatedUsers = StorageService.getUsers();
      onUpdateUserAccounts(updatedUsers);
      onRefreshData();
    }

    setDeleteConfirmState(null);
  };

  // Backup Database JSON
  const handleDownloadBackup = () => {
    const payload = StorageService.generateFullBackupPayload();
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BACKUP_EPML_BI_JATIM_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Restore Database from JSON
  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const res = StorageService.restoreFromBackupPayload(reader.result, currentUser.namaLengkap);
        setRestoreMessage(res.message);
        if (res.success) {
          onRefreshData();
        }
      }
    };
    reader.readAsText(file);
  };

  // Open confirmation modal before uploading Backup JSON to Google Drive
  const handleSyncGoogleDrive = () => {
    setIsBackupConfirmModalOpen(true);
  };

  // Execute real Google Drive Backup upload to folder 13QMsleueA1Mp4kMWLa2q36bIuWwXXvDT
  const handleExecuteBackupSyncToDrive = async () => {
    setIsBackupConfirmModalOpen(false);
    setIsSyncingBackupDrive(true);
    setGdriveSyncMessage('');
    try {
      const payload = StorageService.generateFullBackupPayload();
      const uploaded = await uploadBackupJsonToGoogleDrive(payload);

      const latestSavedLanding = StorageService.getLandingConfig();
      const updatedConfig: LandingPageConfig = {
        ...latestSavedLanding,
        ...landingConfig,
        driveBackupFolderUrl: DRIVE_BACKUP_FOLDER_URL,
        driveLastBackupFileId: uploaded.fileId,
        driveLastBackupWebViewLink: uploaded.webViewLink,
        driveLastBackupAt: uploaded.syncedAt
      };
      setLocalConfig(updatedConfig);
      StorageService.saveLandingConfig(updatedConfig, currentUser.namaLengkap);
      onUpdateLandingConfig(updatedConfig);

      setGdriveBackupFileUrl(uploaded.webViewLink);
      setGdriveSyncMessage(
        `File cadangan "${uploaded.fileName}" berhasil diunggah ke Folder Google Drive Cadangan Data!`
      );
      setGdriveSyncSuccess(true);

      StorageService.logAudit({
        username: currentUser.namaLengkap,
        role: currentUser.role,
        aksi: 'GOOGLE_DRIVE_BACKUP_SYNC',
        target: uploaded.fileName,
        detail: `Sinkronisasi cadangan data JSON ke Folder Google Drive Backup (${DRIVE_BACKUP_FOLDER_URL}) berhasil.`,
        status: 'SUCCESS'
      });
      onRefreshData();
      setTimeout(() => setGdriveSyncSuccess(false), 7000);
    } catch (err: any) {
      setGdriveSyncMessage(
        err?.message || 'Gagal menyinkronkan cadangan ke Google Drive. Pastikan akun Google telah terhubung.'
      );
    } finally {
      setIsSyncingBackupDrive(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors flex flex-col">
      {/* Top Admin Workspace Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Left: Institutional Identity */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-white flex items-center justify-center shrink-0 shadow-2xs ring-1 ring-slate-200/80 dark:ring-slate-700">
              <img
                src="/assets/aistudio/Logo_BI_Bulat_27bc9deb.png"
                alt="Logo Bank Indonesia"
                className="w-full h-full object-cover rounded-full scale-[1.22]"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Sistem Informasi EPML
                </span>
                <span className="text-xs text-slate-300 dark:text-slate-600">&bull;</span>
                <span className="text-[11px] font-semibold text-blue-900 dark:text-blue-400">
                  Panel Administrator
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 leading-tight truncate">
                Kantor Perwakilan Bank Indonesia Provinsi Jawa Timur
              </h1>
            </div>
          </div>

          {/* Right: Proportional Utility & Session Controls */}
          <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2 sm:gap-2.5">
            <div className="flex items-center gap-2">
              {/* Sync Logistics Button */}
              <button
                onClick={handleSyncLogistics}
                disabled={syncingLogistics}
                title="Sinkronisasi status resi dengan API Logistik Pihak Ketiga"
                className="h-9 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold inline-flex items-center gap-2 transition-colors shadow-2xs cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-500 dark:text-slate-400 ${syncingLogistics ? 'animate-spin text-blue-600' : ''}`} />
                <span>{syncingLogistics ? 'Sinkronisasi...' : 'Sinkronisasi Logistik'}</span>
              </button>

              {/* Back to Public Landing */}
              <button
                onClick={onCloseAdmin}
                className="h-9 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Lihat Tampilan Publik</span>
              </button>

              {/* Icon Controls Group (Dark Mode & Notification Bell) */}
              <div className="flex items-center gap-1 pl-1 border-l border-slate-200 dark:border-slate-700">
                {onToggleDarkMode && (
                  <button
                    onClick={onToggleDarkMode}
                    title={darkMode ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
                    className="w-9 h-9 inline-flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  >
                    {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
                  </button>
                )}

                {onOpenAnomalyModal && (
                  <button
                    onClick={onOpenAnomalyModal}
                    title={(anomalyCount ?? anomalies.length) > 0 ? `${anomalyCount ?? anomalies.length} Anomali Logistik Terdeteksi` : 'Pusat Notifikasi Logistik'}
                    className="relative w-9 h-9 inline-flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  >
                    <Bell className="w-4 h-4" />
                    {(anomalyCount ?? anomalies.length) > 0 && (
                      <>
                        <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-600 rounded-full animate-ping" />
                        <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-600 rounded-full" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* User Session Profile & Role */}
            <div className="pl-3 border-l border-slate-200 dark:border-slate-700 flex items-center gap-3">
              <div className="text-right hidden sm:block leading-tight">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{currentUser.namaLengkap}</p>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mt-0.5">{currentUser.role}</p>
              </div>
              <button
                onClick={onLogout}
                title="Keluar Sesi Aman"
                className="h-9 px-3 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 text-xs font-bold inline-flex items-center justify-center transition-colors cursor-pointer"
              >
                Keluar
              </button>
            </div>
          </div>
        </div>

        {/* Sync message alert banner */}
        {syncMessage && (
          <div className="mt-2 max-w-7xl mx-auto p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-xs text-emerald-800 dark:text-emerald-300 rounded flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncMessage}</span>
          </div>
        )}
      </header>

      {/* Workspace Body: Left Sidebar Menu + Right Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full flex flex-col md:flex-row gap-6 items-start">
        {/* Left Navigation Sidebar */}
        <aside className="w-full md:w-64 lg:w-72 shrink-0 md:sticky md:top-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 shadow-xs">
            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-2">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Navigasi Menu
              </span>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Dashboard EPML
              </p>
            </div>

            <nav className="flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-visible pb-2 md:pb-0 scroll-smooth">
              {userAllowedMenus.includes('ANALYTICS') && (
                <button
                  onClick={() => setActiveTab('ANALYTICS')}
                  className={`w-auto md:w-full whitespace-nowrap md:whitespace-normal shrink-0 text-left px-3.5 py-2.5 rounded-xl font-medium transition-all text-xs flex items-center gap-2.5 ${
                    activeTab === 'ANALYTICS'
                      ? 'bg-blue-900 text-white font-bold shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 bg-slate-50 md:bg-transparent'
                  }`}
                >
                  <BarChart3 className={`w-4 h-4 shrink-0 ${activeTab === 'ANALYTICS' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span className="truncate">Visualisasi & Anggaran Real-Time</span>
                </button>
              )}

              {userAllowedMenus.includes('KALENDER') && (
                <button
                  onClick={() => setActiveTab('KALENDER')}
                  className={`w-auto md:w-full whitespace-nowrap md:whitespace-normal shrink-0 text-left px-3.5 py-2.5 rounded-xl font-medium transition-all text-xs flex items-center justify-between gap-2.5 ${
                    activeTab === 'KALENDER'
                      ? 'bg-blue-900 text-white font-bold shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 bg-slate-50 md:bg-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Calendar className={`w-4 h-4 shrink-0 ${activeTab === 'KALENDER' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                    <span className="truncate">Kalender Survei & Monitoring</span>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    activeTab === 'KALENDER' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}>
                    {jadwals.length}
                  </span>
                </button>
              )}

              {userAllowedMenus.includes('MAP') && (
                <button
                  onClick={() => setActiveTab('MAP')}
                  className={`w-auto md:w-full whitespace-nowrap md:whitespace-normal shrink-0 text-left px-3.5 py-2.5 rounded-xl font-medium transition-all text-xs flex items-center gap-2.5 ${
                    activeTab === 'MAP'
                      ? 'bg-blue-900 text-white font-bold shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 bg-slate-50 md:bg-transparent'
                  }`}
                >
                  <MapPin className={`w-4 h-4 shrink-0 ${activeTab === 'MAP' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span className="truncate">Peta Sebaran & Geo-Tagging Jatim</span>
                </button>
              )}

              {userAllowedMenus.includes('REKAP') && (
                <button
                  onClick={() => setActiveTab('REKAP')}
                  className={`w-auto md:w-full whitespace-nowrap md:whitespace-normal shrink-0 text-left px-3.5 py-2.5 rounded-xl font-medium transition-all text-xs flex items-center gap-2.5 ${
                    activeTab === 'REKAP'
                      ? 'bg-blue-900 text-white font-bold shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 bg-slate-50 md:bg-transparent'
                  }`}
                >
                  <FileText className={`w-4 h-4 shrink-0 ${activeTab === 'REKAP' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span className="truncate">Pencatatan & Rekapitulasi Penerima</span>
                </button>
              )}

              {userAllowedMenus.includes('QR') && (
                <button
                  onClick={() => setActiveTab('QR')}
                  className={`w-auto md:w-full whitespace-nowrap md:whitespace-normal shrink-0 text-left px-3.5 py-2.5 rounded-xl font-medium transition-all text-xs flex items-center gap-2.5 ${
                    activeTab === 'QR'
                      ? 'bg-blue-900 text-white font-bold shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 bg-slate-50 md:bg-transparent'
                  }`}
                >
                  <QrCode className={`w-4 h-4 shrink-0 ${activeTab === 'QR' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span className="truncate">QR Code & Tracking Fisik</span>
                </button>
              )}

              {userAllowedMenus.includes('MONITORING') && (
                <button
                  onClick={() => setActiveTab('MONITORING')}
                  className={`w-auto md:w-full whitespace-nowrap md:whitespace-normal shrink-0 text-left px-3.5 py-2.5 rounded-xl font-medium transition-all text-xs flex items-center gap-2.5 ${
                    activeTab === 'MONITORING'
                      ? 'bg-blue-900 text-white font-bold shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 bg-slate-50 md:bg-transparent'
                  }`}
                >
                  <ClipboardCheck className={`w-4 h-4 shrink-0 ${activeTab === 'MONITORING' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span className="truncate">Hasil Tracking & Monitoring Bantuan</span>
                </button>
              )}

              {userAllowedMenus.includes('VENDOR') && (
                <button
                  onClick={() => setActiveTab('VENDOR')}
                  className={`w-auto md:w-full whitespace-nowrap md:whitespace-normal shrink-0 text-left px-3.5 py-2.5 rounded-xl font-medium transition-all text-xs flex items-center justify-between gap-2.5 ${
                    activeTab === 'VENDOR'
                      ? 'bg-blue-900 text-white font-bold shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 bg-slate-50 md:bg-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Truck className={`w-4 h-4 shrink-0 ${activeTab === 'VENDOR' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                    <span className="truncate">Data Vendor</span>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    activeTab === 'VENDOR' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}>
                    {vendors.length}
                  </span>
                </button>
              )}

              {userAllowedMenus.includes('EDIT_DASHBOARD') && (
                <button
                  onClick={() => setActiveTab('EDIT_DASHBOARD')}
                  className={`w-auto md:w-full whitespace-nowrap md:whitespace-normal shrink-0 text-left px-3.5 py-2.5 rounded-xl font-medium transition-all text-xs flex items-center gap-2.5 ${
                    activeTab === 'EDIT_DASHBOARD'
                      ? 'bg-blue-900 text-white font-bold shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 bg-slate-50 md:bg-transparent'
                  }`}
                >
                  <LayoutTemplate className={`w-4 h-4 shrink-0 ${activeTab === 'EDIT_DASHBOARD' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span className="truncate">Edit Dashboard</span>
                </button>
              )}

              {userAllowedMenus.includes('ARTIKEL') && (
                <button
                  onClick={() => setActiveTab('ARTIKEL')}
                  className={`w-auto md:w-full whitespace-nowrap md:whitespace-normal shrink-0 text-left px-3.5 py-2.5 rounded-xl font-medium transition-all text-xs flex items-center justify-between gap-2.5 ${
                    activeTab === 'ARTIKEL'
                      ? 'bg-blue-900 text-white font-bold shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 bg-slate-50 md:bg-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Newspaper className={`w-4 h-4 shrink-0 ${activeTab === 'ARTIKEL' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                    <span className="truncate">Edit Artikel & Berita</span>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    activeTab === 'ARTIKEL' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}>
                    {artikels.length}
                  </span>
                </button>
              )}

              {userAllowedMenus.includes('USERS') && (
                <button
                  onClick={() => setActiveTab('USERS')}
                  className={`w-auto md:w-full whitespace-nowrap md:whitespace-normal shrink-0 text-left px-3.5 py-2.5 rounded-xl font-medium transition-all text-xs flex items-center gap-2.5 ${
                    activeTab === 'USERS'
                      ? 'bg-blue-900 text-white font-bold shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 bg-slate-50 md:bg-transparent'
                  }`}
                >
                  <Users className={`w-4 h-4 shrink-0 ${activeTab === 'USERS' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span className="truncate">Manajemen Pengguna & Verifikasi</span>
                </button>
              )}

              {userAllowedMenus.includes('AUDIT') && (
                <button
                  onClick={() => setActiveTab('AUDIT')}
                  className={`w-auto md:w-full whitespace-nowrap md:whitespace-normal shrink-0 text-left px-3.5 py-2.5 rounded-xl font-medium transition-all text-xs flex items-center gap-2.5 ${
                    activeTab === 'AUDIT'
                      ? 'bg-blue-900 text-white font-bold shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 bg-slate-50 md:bg-transparent'
                  }`}
                >
                  <Activity className={`w-4 h-4 shrink-0 ${activeTab === 'AUDIT' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span className="truncate">Audit Log Sistem & Sesi</span>
                </button>
              )}

              {userAllowedMenus.includes('CONFIG') && (
                <button
                  onClick={() => setActiveTab('CONFIG')}
                  className={`w-auto md:w-full whitespace-nowrap md:whitespace-normal shrink-0 text-left px-3.5 py-2.5 rounded-xl font-medium transition-all text-xs flex items-center gap-2.5 ${
                    activeTab === 'CONFIG'
                      ? 'bg-blue-900 text-white font-bold shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 bg-slate-50 md:bg-transparent'
                  }`}
                >
                  <Settings className={`w-4 h-4 shrink-0 ${activeTab === 'CONFIG' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span className="truncate">Konfigurasi & Backup Cloud</span>
                </button>
              )}
            </nav>

            {/* Quick summary in sidebar on desktop */}
            <div className="hidden md:block pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 px-3 text-[11px] text-slate-500 space-y-1.5">
              <div className="flex items-center justify-between">
                <span>Total Penerima</span>
                <span className="font-bold text-slate-900 dark:text-slate-200">{bantuanList.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Wilayah Aktif</span>
                <span className="font-bold text-blue-900 dark:text-blue-400">13 Kab/Kota</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Rekanan Vendor</span>
                <span className="font-bold text-slate-900 dark:text-slate-200">{vendors.length} Usaha</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Artikel & Berita</span>
                <span className="font-bold text-slate-900 dark:text-slate-200">{artikels.length} Warta</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Total Pagu</span>
                <span className="font-bold text-slate-900 dark:text-slate-200">Rp {(totalPaguJatim / 1e9).toFixed(1)} M</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Right Main Admin Tab Viewport */}
        <main className="flex-1 min-w-0 w-full space-y-6">
        {/* ========================================================= */}
        {/* TAB 1: VISUALISASI ANGGARAN & REAL-TIME ANALYTICS */}
        {/* ========================================================= */}
        {activeTab === 'ANALYTICS' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Top Real-time Budget KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs relative group">
                <div className="flex items-start justify-between">
                  <p className="text-xs text-slate-500 font-medium">Total Pagu Alokasi EPML Jatim</p>
                  <button
                    onClick={() => setIsEditPaguModalOpen(true)}
                    title="Sesuaikan / Edit Batas Maksimal Pagu Tahunan"
                    className="text-xs text-blue-900 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-2 py-0.5 rounded-md border border-blue-200/60 dark:border-blue-800/60 transition-colors flex items-center gap-1 cursor-pointer font-semibold"
                  >
                    <Edit className="w-3 h-3" />
                    <span>Edit Pagu</span>
                  </button>
                </div>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums mt-1">
                  Rp {(totalPaguJatim / 1000000000).toFixed(2)} Milyar
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Ditetapkan untuk 13 Wilayah Kerja Kab/Kota</p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <p className="text-xs text-slate-500 font-medium">Realisasi Penyaluran Bantuan</p>
                <p className="text-xl font-bold text-blue-950 dark:text-blue-400 tabular-nums mt-1">
                  Rp {(totalRealisasi / 1000000000).toFixed(2)} Milyar
                </p>
                <p className="text-[11px] text-blue-800 dark:text-blue-300 font-medium mt-1">
                  Serapan: {persentaseSerapan}% dari total pagu
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <p className="text-xs text-slate-500 font-medium">Sisa Anggaran Tersedia</p>
                <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums mt-1">
                  Rp {(sisaPaguJatim / 1000000000).toFixed(2)} Milyar
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Siap dialokasikan pada usulan berikutnya</p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <p className="text-xs text-slate-500 font-medium">Total Penerima Terverifikasi</p>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums mt-1">
                  {bantuanList.length} Lembaga / Kelompok
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  BI Driven: {perKategoriInisiatif['BI Driven'].count} &bull; Eksternal: {perKategoriInisiatif.Eksternal.count}
                </p>
              </div>
            </div>

            {/* Real-Time Recharts Visualization Panel: Jenis Bantuan, Status Asesmen & Kategori Bantuan (BI Driven vs Eksternal) */}
            <BantuanChartsPanel
              bantuanList={bantuanList}
              title="Panel Visualisasi Real-Time: Jenis Bantuan, Status Asesmen & Kategori Bantuan (BI Driven vs Eksternal)"
            />

            {/* Dedicated Real-Time Visualization Panel: Kategori Bantuan (BI Driven vs Eksternal) */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-900 dark:text-blue-400" />
                    <span>Visualisasi Real-Time Kategori Bantuan: BI Driven vs Eksternal</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Perbandingan komposisi penyaluran dan serapan anggaran berdasarkan inisiatif Kategori Bantuan
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold">
                    Total Penerima: {bantuanList.length} Lembaga
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(['BI Driven', 'Eksternal'] as const).map(katKey => {
                  const data = perKategoriInisiatif[katKey];
                  const pctCount = bantuanList.length > 0 ? Math.round((data.count / bantuanList.length) * 100) : 0;
                  const pctNominal = totalRealisasi > 0 ? Math.round((data.nominal / totalRealisasi) * 100) : 0;
                  const isBiDriven = katKey === 'BI Driven';

                  return (
                    <div
                      key={katKey}
                      className={`p-4 rounded-xl border ${
                        isBiDriven
                          ? 'bg-blue-50/40 dark:bg-blue-950/30 border-blue-200/80 dark:border-blue-800/60'
                          : 'bg-teal-50/40 dark:bg-teal-950/30 border-teal-200/80 dark:border-teal-800/60'
                      } space-y-3`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                              isBiDriven
                                ? 'bg-blue-900 text-white'
                                : 'bg-teal-700 text-white'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                            Kategori: {katKey}
                          </span>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            {isBiDriven
                              ? 'Program strategis inisiatif langsung KPw Bank Indonesia Provinsi Jawa Timur'
                              : 'Program usulan kemitraan / pemangku kepentingan eksternal daerah'}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums block">
                            {data.count} Penerima
                          </span>
                          <span className="text-[11px] font-bold text-blue-900 dark:text-blue-400 tabular-nums">
                            {pctCount}% dari total lembaga
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-600 dark:text-slate-300 font-medium">Realisasi Anggaran {katKey}</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                            Rp {data.nominal.toLocaleString('id-ID')} ({pctNominal}%)
                          </span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isBiDriven ? 'bg-blue-900 dark:bg-blue-500' : 'bg-teal-600 dark:bg-teal-400'
                            }`}
                            style={{ width: `${pctNominal}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-800 text-[11px]">
                        <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800">
                          <span className="text-slate-400 block text-[10px]">Pilar Edukasi</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                            {data.pilar.Edukasi} Lembaga
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800">
                          <span className="text-slate-400 block text-[10px]">Pemberdayaan</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                            {data.pilar['Pemberdayaan Masyarakat']} Lembaga
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800">
                          <span className="text-slate-400 block text-[10px]">Lingkungan</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                            {data.pilar.Lingkungan} Lembaga
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quarterly & Annual Visualization Strip */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Triwulanan Q1 - Q4 */}
              <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Realisasi Anggaran Per Triwulan (Q1 - Q4)
                  </h3>
                  <span className="text-[11px] text-slate-400">Tahun Berjalan</span>
                </div>

                <div className="space-y-3.5">
                  {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map(q => {
                    const nominal = perTriwulan[q];
                    const pct = totalRealisasi > 0 ? Math.round((nominal / totalRealisasi) * 100) : 0;
                    return (
                      <div key={q} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-slate-700 dark:text-slate-300">Triwulan {q}</span>
                          <span className="font-bold tabular-nums text-slate-900 dark:text-slate-100">
                            Rp {nominal.toLocaleString('id-ID')} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-900 dark:bg-blue-600 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pillars Distribution Breakdown */}
              <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-4">
                  Sebaran Anggaran Berdasarkan Pilar EPML
                </h3>
                <div className="space-y-4">
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-blue-950 dark:text-blue-300">1. EPML Edukasi</span>
                      <span className="tabular-nums">Rp {perPilar.Edukasi.toLocaleString('id-ID')}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Lab Vokasi Komputer, Smart Board, Literasi</p>
                  </div>

                  <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-emerald-950 dark:text-emerald-300">2. Pemberdayaan Masyarakat</span>
                      <span className="tabular-nums">Rp {perPilar['Pemberdayaan Masyarakat'].toLocaleString('id-ID')}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Mesin Kopi, Alat Kulit & Batik, Fasilitasi UMKM</p>
                  </div>

                  <div className="p-3 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/40">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-teal-950 dark:text-teal-300">3. EPML Lingkungan</span>
                      <span className="tabular-nums">Rp {perPilar.Lingkungan.toLocaleString('id-ID')}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Perahu Listrik, Biogas, Mesin Olah Sampah Plastik</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 7-Stage Funnel Status Bar */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-3">
                Pemantauan 7 Tahapan Distribusi Bantuan
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {[
                  'Asesmen',
                  'Usulan',
                  'Pengadaan',
                  'Pengiriman',
                  'Selesai Dikirim',
                  'Barang Diterima',
                  'Penjadwalan Monitoring Bantuan'
                ].map((thp, idx) => {
                  const count = perTahap.get(thp) || 0;
                  return (
                    <div
                      key={thp}
                      className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800 text-center"
                    >
                      <span className="text-[10px] text-slate-400 block font-mono">0{idx + 1}</span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block line-clamp-1 mt-0.5">
                        {thp}
                      </span>
                      <span className="text-lg font-bold text-blue-900 dark:text-blue-400 tabular-nums block mt-1">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 1B: KALENDER SURVEI ASESMEN & JADWAL MONITORING */}
        {/* ========================================================= */}
        {activeTab === 'KALENDER' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <KalenderSurveiMonitoring
              jadwalList={jadwals}
              bantuanList={bantuanList}
              mode="embedded"
              canEdit={true}
              actorName={currentUser.namaLengkap}
              showOnTopDashboard={landingConfig.tampilkanKalenderDiDashboardAtas !== false}
              onToggleShowOnTopDashboard={handleToggleShowKalenderOnTopDashboard}
              onSaveJadwal={handleSaveJadwal}
              onDeleteJadwal={handleDeleteJadwal}
              onOpenFullPage={onOpenKalenderFullPage}
              onSelectBantuan={item => onOpenDetailBantuan(item)}
            />
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: PETA SEBARAN JAWA TIMUR & GEO-TAGGING */}
        {/* ========================================================= */}
        {activeTab === 'MAP' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <PetaJawaTimur
              bantuanList={bantuanList}
              selectedKabupaten={filterKabupaten}
              onFilterKabupaten={kab => setFilterKabupaten(kab)}
              onSelectBantuan={item => onOpenDetailBantuan(item)}
              heightClass="h-[640px]"
              enableAdminTools={true}
            />
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: PENCATATAN & REKAPITULASI PENERIMA BANTUAN (CRUD) */}
        {/* ========================================================= */}
        {activeTab === 'REKAP' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Proportional Search, Filter & Action Bar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              {/* Row 1: Search Input + Primary Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari ID Bantuan, Nama Lembaga Penerima, Kabupaten/Kota, Kategori (BI Driven/Eksternal), Vendor, atau PIC..."
                    value={tableSearch}
                    onChange={e => setTableSearch(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 transition-colors"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {(tableSearch || filterTahun !== 'ALL' || filterKabupaten !== '' || filterKategoriLembaga !== 'ALL' || filterKategori !== 'ALL' || filterKategoriInisiatif !== 'ALL') && (
                    <button
                      type="button"
                      onClick={() => {
                        setTableSearch('');
                        setFilterTahun('ALL');
                        setFilterKabupaten('');
                        setFilterKategoriLembaga('ALL');
                        setFilterKategori('ALL');
                        setFilterKategoriInisiatif('ALL');
                      }}
                      className="h-9 px-3 rounded-lg border border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Filter</span>
                    </button>
                  )}

                  {/* Export Button */}
                  <button
                    onClick={onOpenExportReport}
                    className="h-9 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span>Ekspor PDF / Excel</span>
                  </button>

                  {/* Bulk Import CSV Button */}
                  <button
                    type="button"
                    onClick={() => setIsBulkImportCsvOpen(true)}
                    className="h-9 px-3.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                    <span>Impor CSV Massal</span>
                  </button>

                  {/* Create Bantuan */}
                  <button
                    onClick={onOpenCreateBantuan}
                    className="h-9 px-4 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Penerima</span>
                  </button>
                </div>
              </div>

              {bulkImportSuccessMessage && (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-2 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold">{bulkImportSuccessMessage}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBulkImportSuccessMessage('')}
                    className="text-emerald-700 dark:text-emerald-300 hover:underline text-[11px] font-bold cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              )}

              {/* Row 2: Proportional 5-Column Filter Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                {/* Filter Tahun (Year) */}
                <select
                  value={filterTahun}
                  onChange={e => setFilterTahun(e.target.value)}
                  title="Filter Tahun Penyaluran"
                  className={`w-full h-9 px-3 rounded-lg border transition-colors cursor-pointer text-xs font-medium ${
                    filterTahun !== 'ALL'
                      ? 'border-blue-600 bg-blue-50 text-blue-900 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700 font-bold'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <option value="ALL">Semua Tahun Penyaluran</option>
                  {availableYears.map(yr => (
                    <option key={yr} value={String(yr)}>Tahun {yr}</option>
                  ))}
                </select>

                {/* Wilayah / Lokasi Filter: 13 Wilayah Kerja KPwBI Jatim */}
                <select
                  value={filterKabupaten}
                  onChange={e => setFilterKabupaten(e.target.value)}
                  title="Filter Lokasi Wilayah Kabupaten/Kota"
                  className={`w-full h-9 px-3 rounded-lg border transition-colors cursor-pointer text-xs font-medium ${
                    filterKabupaten
                      ? 'border-blue-600 bg-blue-50 text-blue-900 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700 font-bold'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <option value="">Semua Lokasi (13 Kab/Kota)</option>
                  <optgroup label="13 Wilayah Kerja KPw BI Prov. Jatim">
                    {WILAYAH_KERJA_KPW_JATIM.map(w => (
                      <option key={w} value={w}>{w.replace('Kabupaten ', 'Kab. ')}</option>
                    ))}
                  </optgroup>
                </select>

                {/* Kategori Lembaga (Institution Category) Filter */}
                <select
                  value={filterKategoriLembaga}
                  onChange={e => setFilterKategoriLembaga(e.target.value)}
                  title="Filter Kategori Lembaga Penerima"
                  className={`w-full h-9 px-3 rounded-lg border transition-colors cursor-pointer text-xs font-medium ${
                    filterKategoriLembaga !== 'ALL'
                      ? 'border-blue-600 bg-blue-50 text-blue-900 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700 font-bold'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <option value="ALL">Semua Kategori Lembaga</option>
                  {KATEGORI_LEMBAGA_OPTIONS.map(kat => (
                    <option key={kat} value={kat}>{kat}</option>
                  ))}
                </select>

                {/* Pilar Filter */}
                <select
                  value={filterKategori}
                  onChange={e => setFilterKategori(e.target.value)}
                  title="Filter Pilar Program EPML"
                  className={`w-full h-9 px-3 rounded-lg border transition-colors cursor-pointer text-xs font-medium ${
                    filterKategori !== 'ALL'
                      ? 'border-blue-600 bg-blue-50 text-blue-900 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700 font-bold'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <option value="ALL">Semua Pilar EPML</option>
                  <option value="Edukasi">Edukasi</option>
                  <option value="Pemberdayaan Masyarakat">Pemberdayaan Masyarakat</option>
                  <option value="Lingkungan">Lingkungan</option>
                </select>

                {/* Kategori Bantuan (BI Driven / Eksternal) Filter */}
                <select
                  value={filterKategoriInisiatif}
                  onChange={e => setFilterKategoriInisiatif(e.target.value)}
                  title="Filter Kategori Bantuan (BI Driven / Eksternal)"
                  className={`w-full h-9 px-3 rounded-lg border transition-colors cursor-pointer text-xs font-medium ${
                    filterKategoriInisiatif !== 'ALL'
                      ? 'border-blue-600 bg-blue-50 text-blue-900 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700 font-bold'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <option value="ALL">Semua Kategori Bantuan</option>
                  <option value="BI Driven">BI Driven</option>
                  <option value="Eksternal">Eksternal</option>
                </select>
              </div>
            </div>

            {/* Data Table with Scroll Feature & Sticky Header */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col">
              {/* Scrollable Table Viewport */}
              <div className="overflow-x-auto overflow-y-auto max-h-[580px] scroll-smooth">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-750 shadow-xs">
                    <tr className="text-slate-600 dark:text-slate-300 font-semibold">
                      <th className="p-3 w-10 text-center">No</th>
                      <th className="p-3">ID & Penerima</th>
                      <th className="p-3">PIC Asesmen</th>
                      <th className="p-3 whitespace-nowrap">Kategori Bantuan</th>
                      <th className="p-3 text-center whitespace-nowrap">Status Asesmen</th>
                      <th className="p-3 min-w-[200px]">Alamat Lengkap Penerima</th>
                      <th className="p-3">Kabupaten/Kota</th>
                      <th className="p-3">Pilar & Bentuk</th>
                      <th className="p-3">Rincian Barang / Jasa</th>
                      <th className="p-3 text-right">Nominal (Rp)</th>
                      <th className="p-3 text-center">Tahap Penyaluran</th>
                      <th className="p-3 text-center">Kondisi Fisik</th>
                      <th className="p-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {paginatedTableList.map((item, idx) => {
                      const rowNum = startIndex + idx + 1;
                      const currentInisiatif: KategoriSumberBantuan =
                        item.kategoriInisiatif === 'Eksternal' ? 'Eksternal' : 'BI Driven';
                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="p-3 text-center tabular-nums text-slate-400 font-medium">{rowNum}</td>
                          <td className="p-3">
                            <span className="font-mono text-[10px] text-blue-900 dark:text-blue-400 font-bold block">
                              {item.id}
                            </span>
                            <span className="font-bold text-slate-900 dark:text-slate-100 block">
                              {item.namaPenerima}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">{item.noHp}</span>
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {item.picAsesmen}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <select
                              value={currentInisiatif}
                              onChange={e =>
                                handleQuickChangeKategoriInisiatif(
                                  item,
                                  e.target.value as KategoriSumberBantuan
                                )
                              }
                              title="Ubah Kategori Bantuan (BI Driven / Eksternal)"
                              className={`h-7 px-2.5 rounded-md text-[11px] font-bold border transition-colors cursor-pointer ${
                                currentInisiatif === 'BI Driven'
                                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                  : 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800'
                              }`}
                            >
                              <option value="BI Driven">BI Driven</option>
                              <option value="Eksternal">Eksternal</option>
                            </select>
                          </td>
                          <td className="p-3 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide shadow-2xs ${
                                item.statusAsesmen === 'Disetujui'
                                  ? 'bg-emerald-600 text-white border border-emerald-700'
                                  : item.statusAsesmen === 'Ditolak'
                                  ? 'bg-red-600 text-white border border-red-700'
                                  : item.statusAsesmen === 'Menunggu Tindak Lanjut'
                                  ? 'bg-amber-500 text-white border border-amber-600'
                                  : 'bg-[#002B66] text-white border border-blue-950'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  item.statusAsesmen === 'Disetujui'
                                    ? 'bg-emerald-200'
                                    : item.statusAsesmen === 'Ditolak'
                                    ? 'bg-red-200'
                                    : item.statusAsesmen === 'Menunggu Tindak Lanjut'
                                    ? 'bg-amber-100'
                                    : 'bg-blue-300'
                                }`}
                              />
                              {item.statusAsesmen || 'Asesmen'}
                            </span>
                          </td>
                          <td className="p-3 min-w-[200px] max-w-[260px]">
                            <p
                              className="text-[11px] text-slate-700 dark:text-slate-300 leading-snug line-clamp-2"
                              title={item.alamat}
                            >
                              {item.alamat || '-'}
                            </p>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className="font-medium text-slate-800 dark:text-slate-200 block">
                              {item.kabupatenKota.replace('Kabupaten ', 'Kab. ')}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                              {item.kategoriBantuan}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {item.bentukBantuan} {
                                item.daftarJenisBarang && item.daftarJenisBarang.length > 0
                                  ? `(${item.daftarJenisBarang.join(', ')})`
                                  : (item.jenisBarang ? `(${item.jenisBarang})` : '')
                              }
                            </span>
                          </td>
                          <td className="p-3 max-w-xs">
                            <p className="line-clamp-2 text-slate-600 dark:text-slate-400 text-[11px]">
                              {item.detailBantuan}
                            </p>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              Vendor: <strong className="text-slate-600 dark:text-slate-300 font-medium">{item.vendorPenyedia}</strong>
                              {item.daftarVendor && item.daftarVendor.length > 1 && (
                                <span className="ml-1 text-[9px] px-1 py-0.2 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-900 dark:text-blue-300 font-bold">
                                  {item.daftarVendor.length} Vendor
                                </span>
                              )}
                              {' '}&middot; QTY: {item.qty} {item.satuan}
                            </span>
                          </td>
                          <td className="p-3 text-right font-bold tabular-nums text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            Rp {item.nominalBantuan.toLocaleString('id-ID')}
                          </td>
                          <td className="p-3 text-center whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300">
                              {item.statusTahap}
                            </span>
                          </td>
                          <td className="p-3 text-center whitespace-nowrap">
                            <span className={`text-[11px] font-semibold ${
                              item.statusKondisiFisik === 'Baik & Lengkap'
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : 'text-amber-700 dark:text-amber-400'
                            }`}>
                              {item.statusKondisiFisik}
                            </span>
                          </td>
                          <td className="p-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => onOpenDetailBantuan(item)}
                                title="Lihat Detail & QR Informasi Penerima"
                                className="p-1.5 text-blue-700 hover:bg-blue-50 dark:hover:bg-slate-800 rounded"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => onOpenWhatsApp(item)}
                                title="Kirim Notifikasi WhatsApp"
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => onOpenEditBantuan(item)}
                                title="Edit Data Bantuan"
                                className="p-1.5 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteBantuan(item)}
                                title="Hapus Entri Data"
                                className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredTableList.length === 0 && (
                      <tr>
                        <td colSpan={13} className="p-8 text-center text-slate-500">
                          Tidak ditemukan data bantuan yang sesuai filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="p-3.5 bg-slate-50/90 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="text-slate-600 dark:text-slate-400">
                  Menampilkan{' '}
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {filteredTableList.length === 0 ? 0 : startIndex + 1}
                  </span>{' '}
                  -{' '}
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {Math.min(startIndex + itemsPerPage, filteredTableList.length)}
                  </span>{' '}
                  dari{' '}
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {filteredTableList.length}
                  </span>{' '}
                  penerima{' '}
                  <span className="text-slate-400 text-[11px]">(Maks. 10 per halaman)</span>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    {/* First Page */}
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={validCurrentPage === 1}
                      title="Halaman Pertama"
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </button>

                    {/* Previous Page */}
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={validCurrentPage === 1}
                      title="Halaman Sebelumnya"
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1 font-medium"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Sebelumnya</span>
                    </button>

                    {/* Page Numbers */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(pageNum => {
                          if (totalPages <= 7) return true;
                          return (
                            pageNum === 1 ||
                            pageNum === totalPages ||
                            Math.abs(pageNum - validCurrentPage) <= 1
                          );
                        })
                        .map((pageNum, idx, arr) => {
                          const prevNum = arr[idx - 1];
                          const showEllipsis = prevNum && pageNum - prevNum > 1;
                          return (
                            <React.Fragment key={pageNum}>
                              {showEllipsis && (
                                <span className="px-1 text-slate-400 select-none">&hellip;</span>
                              )}
                              <button
                                onClick={() => setCurrentPage(pageNum)}
                                className={`min-w-8 h-8 px-2 rounded-lg font-semibold transition-colors text-xs ${
                                  validCurrentPage === pageNum
                                    ? 'bg-blue-900 text-white shadow-xs'
                                    : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                              >
                                {pageNum}
                              </button>
                            </React.Fragment>
                          );
                        })}
                    </div>

                    {/* Next Page */}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={validCurrentPage === totalPages}
                      title="Halaman Selanjutnya"
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1 font-medium"
                    >
                      <span className="hidden sm:inline">Selanjutnya</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    {/* Last Page */}
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={validCurrentPage === totalPages}
                      title="Halaman Terakhir"
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: QR CODE & TRACKING LAPANGAN */}
        {/* ========================================================= */}
        {activeTab === 'QR' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Top Banner & Primary Actions */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-400">
                  <QrCode className="w-4 h-4" />
                  <span>Sistem Verifikasi & Cetak Stiker QR Code Lapangan</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Pindai & Cetak Stiker QR Informasi Penerima Bantuan EPML
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Setiap data penerima bantuan yang diinput otomatis men-generate QR Code berisi informasi penerima, tahun penyaluran, rincian barang, dan vendor. Gunakan filter di bawah untuk mencetak kumpulan stiker ukuran A4 Potrait (3×6 stiker per halaman).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const targetItems =
                      selectedQrCatalogItems.length > 0 ? selectedQrCatalogItems : filteredQrList;
                    setCustomPrintItems(targetItems);
                    setIsPrintQrModalOpen(true);
                  }}
                  disabled={filteredQrList.length === 0}
                  className="px-4 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-emerald-200" />
                  <span>
                    Cetak Stiker QR A4 ({selectedQrCatalogItems.length > 0 ? `${selectedQrCatalogItems.length} Dipilih` : `${filteredQrList.length} Stiker`})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenQrScanner()}
                  className="px-4 py-3 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <QrCode className="w-4 h-4 text-amber-300" />
                  <span>Buka Scanner Kamera Lapangan</span>
                </button>
              </div>
            </div>

            {/* Filter Bar: Pencarian, Tahun, Lokasi Wilayah, Kategori Lembaga */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Filter className="w-3.5 h-3.5 text-blue-900 dark:text-blue-400" />
                  <span>Filter & Pencarian Label Stiker QR Bantuan</span>
                </div>

                {(qrSearchQuery || qrFilterTahun !== 'ALL' || qrFilterLokasi !== 'ALL' || qrFilterKategoriLembaga !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setQrSearchQuery('');
                      setQrFilterTahun('ALL');
                      setQrFilterLokasi('ALL');
                      setQrFilterKategoriLembaga('ALL');
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Filter</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Pencarian Kata Kunci */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={qrSearchQuery}
                    onChange={e => setQrSearchQuery(e.target.value)}
                    placeholder="Cari ID / Nama Lembaga / Barang..."
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                  />
                </div>

                {/* 2. Filter Tahun */}
                <div>
                  <select
                    value={qrFilterTahun}
                    onChange={e => setQrFilterTahun(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-blue-600"
                  >
                    <option value="ALL">Semua Tahun Penyaluran</option>
                    {availableYears.map(yr => (
                      <option key={yr} value={yr.toString()}>
                        Tahun {yr}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Filter Lokasi (13 Wilayah Kerja Kab/Kota) */}
                <div>
                  <select
                    value={qrFilterLokasi}
                    onChange={e => setQrFilterLokasi(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-blue-600"
                  >
                    <option value="ALL">Semua Lokasi (13 Wilayah Kerja)</option>
                    {WILAYAH_KERJA_KPW_JATIM.map(kab => (
                      <option key={kab} value={kab}>
                        {kab}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Filter Kategori Lembaga */}
                <div>
                  <select
                    value={qrFilterKategoriLembaga}
                    onChange={e => setQrFilterKategoriLembaga(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-blue-600"
                  >
                    <option value="ALL">Semua Kategori Lembaga</option>
                    {KATEGORI_LEMBAGA_OPTIONS.map(kat => (
                      <option key={kat} value={kat}>
                        {kat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* QR Sticker Catalog Grid */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-blue-900 dark:text-blue-400" />
                    <span>Daftar Stiker QR Informasi Penerima Bantuan (Siap Cetak A4 3×6)</span>
                  </h4>

                  <button
                    type="button"
                    onClick={() => toggleSelectAllFromList(filteredQrList)}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer"
                  >
                    {filteredQrList.length > 0 && filteredQrList.every(i => selectedQrIds.includes(i.id))
                      ? 'Batalkan Pilih Semua'
                      : `Pilih Semua Hasil Filter (${filteredQrList.length})`}
                  </button>

                  {selectedQrCatalogItems.length > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">
                      {selectedQrCatalogItems.length} Stiker Dipilih
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    Menampilkan <strong className="text-slate-900 dark:text-white tabular-nums">{filteredQrList.length}</strong> dari {bantuanList.length} Label
                  </span>
                  <span>&bull;</span>
                  <span>
                    Estimasi Cetak:{' '}
                    <strong className="text-emerald-700 dark:text-emerald-400 tabular-nums">
                      {Math.max(1, Math.ceil((selectedQrCatalogItems.length > 0 ? selectedQrCatalogItems.length : filteredQrList.length) / 18))} Lembar A4
                    </strong>{' '}
                    (18 Stiker/Lembar)
                  </span>
                </div>
              </div>

              {filteredQrList.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 p-10 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
                  <QrCode className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    Tidak ada label QR yang sesuai dengan kriteria filter
                  </p>
                  <p className="text-xs text-slate-500">
                    Silakan ubah pilihan Tahun, Lokasi Wilayah, atau Kategori Lembaga untuk menampilkan stiker QR.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredQrList.map(item => {
                    const isCardSelected = selectedQrIds.includes(item.id);
                    const totalUnits = getTotalBarangUnits(item);
                    const cardCopies = getCardCopyCount(item);
                    const activeUnitIdx = Math.min(cardCopies, qrPreviewUnitMap[item.id] || 1);
                    const activeUnitQrCode =
                      cardCopies > 1
                        ? `${item.id}-U${String(activeUnitIdx).padStart(2, '0')}`
                        : item.id;
                    const activeUnitInfo = StorageService.getSpecificUnitLabel(
                      item,
                      activeUnitIdx,
                      cardCopies
                    );
                    return (
                    <div
                      key={item.id}
                      className={`bg-white dark:bg-slate-900 p-3.5 rounded-xl border shadow-xs flex flex-col justify-between space-y-2.5 transition-colors ${
                        isCardSelected
                          ? 'border-emerald-600 ring-2 ring-emerald-500/25'
                          : 'border-slate-200 dark:border-slate-800 hover:border-blue-500'
                      }`}
                    >
                      {/* Selection Checkbox Header */}
                      <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-100 dark:border-slate-800">
                        <label className="inline-flex items-center gap-2 cursor-pointer select-none font-semibold text-slate-700 dark:text-slate-200">
                          <input
                            type="checkbox"
                            checked={isCardSelected}
                            onChange={() => toggleSelectQrItem(item.id)}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600 cursor-pointer"
                          />
                          <span>{isCardSelected ? 'Dipilih untuk Cetak A4' : 'Pilih Stiker QR'}</span>
                        </label>
                        <span className="font-mono text-[10px] font-bold text-[#002B66] dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200/70 dark:border-blue-800">
                          {activeUnitQrCode}
                        </span>
                      </div>

                      {/* Official Blue-White-Green Sticker Preview (Unique QR per Unit) */}
                      <div className="space-y-2">
                        <QrStickerDesignCard
                          item={item}
                          copyIndex={activeUnitIdx}
                          totalCopies={cardCopies}
                        />
                        {cardCopies > 1 ? (
                          <div className="px-2.5 py-2 rounded-lg bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/80 space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <span className="block text-[10px] font-extrabold text-[#002B66] dark:text-blue-300 truncate">
                                  QR Unit {activeUnitIdx}/{cardCopies} • {activeUnitInfo.namaBarang}
                                </span>
                                <span className="block text-[9.5px] text-slate-500 dark:text-slate-400 truncate">
                                  Unit ke-{activeUnitInfo.unitNumber} dari {activeUnitInfo.unitTotalInItem} ({activeUnitInfo.satuan}) • Link Monitoring Aktif
                                </span>
                              </div>
                              <div className="inline-flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setQrPreviewUnitMap(prev => ({
                                      ...prev,
                                      [item.id]: Math.max(1, (prev[item.id] || 1) - 1)
                                    }))
                                  }
                                  disabled={activeUnitIdx <= 1}
                                  className="px-2 py-1 rounded-md bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 text-[10px] font-bold text-[#002B66] dark:text-blue-200 hover:bg-blue-100/60 disabled:opacity-40 cursor-pointer whitespace-nowrap"
                                >
                                  &lsaquo; Prev
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setQrPreviewUnitMap(prev => ({
                                      ...prev,
                                      [item.id]: Math.min(cardCopies, (prev[item.id] || 1) + 1)
                                    }))
                                  }
                                  disabled={activeUnitIdx >= cardCopies}
                                  className="px-2 py-1 rounded-md bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 text-[10px] font-bold text-[#002B66] dark:text-blue-200 hover:bg-blue-100/60 disabled:opacity-40 cursor-pointer whitespace-nowrap"
                                >
                                  Next &rsaquo;
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400">
                            <span className="font-semibold truncate">{activeUnitInfo.namaBarang} (1 Unit)</span>
                            <span className="font-bold text-emerald-700 dark:text-emerald-400 shrink-0">Link Monitoring Aktif</span>
                          </div>
                        )}
                      </div>

                      {/* Multi-Copy Selector per QR Card (Jumlah Stiker untuk Setiap Barang) */}
                      <div className="px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-2 text-[11px]">
                        <div className="min-w-0">
                          <span className="font-bold text-slate-700 dark:text-slate-200 block leading-tight">
                            Jumlah Unit / Stiker QR:
                          </span>
                          <div className="flex items-center gap-1 mt-1">
                            <button
                              type="button"
                              onClick={() => setCardCopyCount(item.id, 1)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                cardCopies === 1
                                  ? 'bg-[#002B66] text-white border-[#002B66]'
                                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                              }`}
                              title="Cetak 1 stiker saja"
                            >
                              1x
                            </button>
                            <button
                              type="button"
                              onClick={() => setCardCopyCount(item.id, totalUnits)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                cardCopies === totalUnits && totalUnits > 1
                                  ? 'bg-emerald-700 text-white border-emerald-700'
                                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                              }`}
                              title={`Sesuaikan dengan jumlah barang bantuan (${totalUnits} Unit)`}
                            >
                              QTY ({totalUnits})
                            </button>
                            <button
                              type="button"
                              onClick={() => setCardCopyCount(item.id, 18)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                cardCopies === 18
                                  ? 'bg-[#002B66] text-white border-[#002B66]'
                                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                              }`}
                              title="Isi penuh 1 lembar A4 (18 stiker)"
                            >
                              18x (1 A4)
                            </button>
                          </div>
                        </div>

                        {/* Stepper - / Number Input / + */}
                        <div className="inline-flex items-center rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 overflow-hidden shrink-0 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => setCardCopyCount(item.id, cardCopies - 1)}
                            disabled={cardCopies <= 1}
                            className="px-2 py-1 text-xs font-extrabold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                            title="Kurangi jumlah cetak stiker"
                          >
                            &minus;
                          </button>
                          <input
                            type="number"
                            min={1}
                            max={500}
                            value={cardCopies}
                            onChange={e =>
                              setCardCopyCount(item.id, parseInt(e.target.value, 10) || 1)
                            }
                            className="w-11 text-center py-1 text-xs font-extrabold text-[#002B66] dark:text-emerald-300 bg-transparent focus:outline-none tabular-nums"
                            title="Jumlah stiker yang akan dicetak untuk ditempel pada setiap barang"
                          />
                          <button
                            type="button"
                            onClick={() => setCardCopyCount(item.id, cardCopies + 1)}
                            className="px-2 py-1 text-xs font-extrabold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            title="Tambah jumlah cetak stiker"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Quick Action Footer */}
                      <div className="pt-0.5 flex items-center gap-1.5 w-full">
                        <button
                          type="button"
                          onClick={() => setActiveTab('MONITORING')}
                          className="py-1.5 px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                          title="Buka Hasil Tracking & Monitoring Bantuan (Edit Sekaligus / Update Satuan)"
                        >
                          Monitoring
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenQrScanner(activeUnitQrCode)}
                          className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#002B66] hover:bg-blue-900 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          title={`Scan / Buka QR ${activeUnitQrCode} (Tersedia Edit Sekaligus, 1 QR Item Sama & Update Satuan)`}
                        >
                          <QrCode className="w-3.5 h-3.5 text-amber-300" />
                          <span>Scan / Update QR</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomPrintItems([item]);
                            setPrintInitialCopiesMap({ [item.id]: cardCopies });
                            setIsPrintQrModalOpen(true);
                          }}
                          className="py-1.5 px-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          title={`Cetak ${cardCopies} Stiker QR untuk ${item.namaPenerima} (A4)`}
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Cetak ({cardCopies}x)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenWhatsApp(item)}
                          className="py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                          title="Kirim Notifikasi WA"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB: HASIL TRACKING & MONITORING BANTUAN (PER ITEM/BARANG)*/}
        {/* ========================================================= */}
        {activeTab === 'MONITORING' && (
          <HasilTrackingMonitoringTab
            bantuanList={bantuanList}
            currentActorName={currentUser.namaLengkap}
            onRefreshData={onRefreshData}
            onOpenDetailBantuan={onOpenDetailBantuan}
            onOpenQrScanner={onOpenQrScanner}
          />
        )}

        {/* ========================================================= */}
        {/* TAB: DATA REKANAN & VENDOR PENGADAAN EPML */}
        {/* ========================================================= */}
        {activeTab === 'VENDOR' && (
          <VendorManagement
            vendorList={vendors}
            bantuanList={bantuanList}
            currentActorName={currentUser.namaLengkap}
            onSaveVendor={handleSaveVendor}
            onDeleteVendor={handleDeleteVendor}
          />
        )}

        {/* ========================================================= */}
        {/* TAB: EDIT DASHBOARD & LANDING PAGE */}
        {/* ========================================================= */}
        {activeTab === 'EDIT_DASHBOARD' && (
          <EditDashboardTab
            currentUser={currentUser}
            landingConfig={landingConfig}
            onUpdateLandingConfig={onUpdateLandingConfig}
            onOpenPublicLanding={onCloseAdmin}
          />
        )}

        {/* ========================================================= */}
        {/* TAB: EDIT ARTIKEL & BERITA EPML */}
        {/* ========================================================= */}
        {activeTab === 'ARTIKEL' && (
          <ArtikelBeritaManagement
            currentUser={currentUser}
            artikelList={artikels}
            onSaveArtikel={handleSaveArtikel}
            onDeleteArtikel={handleDeleteArtikel}
            onRefreshData={onRefreshData}
          />
        )}

        {/* ========================================================= */}
        {/* TAB 5: MANAJEMEN PENGGUNA & HAK AKSES */}
        {/* ========================================================= */}
        {activeTab === 'USERS' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Kelola Akun Pengguna & Hak Akses Menu Navigasi
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Buat akun baru beserta Username & Password agar langsung aktif. Pemilik akun hanya dapat mengakses menu navigasi yang dicentang oleh Admin.
                </p>
              </div>

              <button
                onClick={handleOpenCreateUserModal}
                className="px-4 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer shrink-0 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Akun Baru</span>
              </button>
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4 whitespace-nowrap">Pengguna & Username</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Email & Password Login</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Hak Akses Menu Navigasi</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">Status Akun</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Login Terakhir</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {userAccounts.map(user => {
                    const userMenus =
                      user.username === 'Admin'
                        ? ALL_MENU_IDS
                        : Array.isArray(user.allowedMenus) && user.allowedMenus.length > 0
                        ? user.allowedMenus
                        : ALL_MENU_IDS;
                    const isAllMenus = userMenus.length === ALL_MENU_IDS.length;
                    const isPassVisible = !!visiblePasswordsMap[user.id];
                    const actualPassword =
                      user.password || (user.username === 'Admin' ? 'Admin' : 'Admin123');
                    const initials = user.namaLengkap
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map(w => w[0]?.toUpperCase() || '')
                      .join('');

                    return (
                      <tr
                        key={user.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 align-middle transition-colors"
                      >
                        {/* Kolom 1: Pengguna & Username */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3 min-w-[230px]">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 shadow-2xs ${
                                isAllMenus
                                  ? 'bg-[#002B66] text-white'
                                  : 'bg-blue-50 dark:bg-blue-950/70 text-[#002B66] dark:text-blue-300 border border-blue-200/80 dark:border-blue-800'
                              }`}
                            >
                              {initials || 'BI'}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 dark:text-slate-100 block text-xs truncate">
                                {user.namaLengkap}
                              </span>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <span className="text-[11px] font-mono text-blue-900 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md font-bold border border-blue-100 dark:border-blue-900/60 whitespace-nowrap">
                                  @{user.username}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md whitespace-nowrap">
                                  {user.role}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Kolom 2: Email & Password Login */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="space-y-1.5">
                            <div className="font-mono text-slate-700 dark:text-slate-300 text-[11px] font-medium">
                              {user.email}
                            </div>
                            <div className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                              <KeyRound className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200 tracking-wider">
                                {isPassVisible ? actualPassword : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setVisiblePasswordsMap(prev => ({
                                    ...prev,
                                    [user.id]: !prev[user.id]
                                  }))
                                }
                                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer ml-1"
                                title={isPassVisible ? 'Sembunyikan Password' : 'Lihat Password'}
                              >
                                {isPassVisible ? (
                                  <EyeOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Kolom 3: Hak Akses Menu Navigasi (Rapi dengan Tombol Pop-up Detail Akses) */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 min-w-[260px] max-w-xs">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold whitespace-nowrap ${
                                    isAllMenus
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-[#002B66] text-white'
                                  }`}
                                >
                                  {userMenus.length} / {ALL_MENU_IDS.length} Menu
                                </span>
                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate">
                                  {isAllMenus ? 'Akses Penuh' : 'Akses Terbatas'}
                                </span>
                              </div>
                              {/* Progress Bar Indikator Cakupan Menu */}
                              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-1.5">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    isAllMenus ? 'bg-emerald-500' : 'bg-blue-700'
                                  }`}
                                  style={{
                                    width: `${Math.round(
                                      (userMenus.length / ALL_MENU_IDS.length) * 100
                                    )}%`
                                  }}
                                />
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setDetailAccessUser(user)}
                              className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-[#002B66] dark:text-blue-300 border border-slate-200 dark:border-slate-700 hover:border-blue-300 text-[11px] font-bold inline-flex items-center gap-1.5 shadow-2xs cursor-pointer shrink-0 transition-all"
                              title="Lihat rincian menu navigasi yang diizinkan untuk akun ini"
                            >
                              <Shield className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                              <span>Detail Akses</span>
                            </button>
                          </div>
                        </td>

                        {/* Kolom 4: Status Akun */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => handleToggleVerification(user.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
                              user.isEmailVerified
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/70'
                                : 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800/70'
                            }`}
                            title="Klik untuk mengaktifkan / menonaktifkan status login akun"
                          >
                            {user.isEmailVerified ? (
                              <>
                                <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>Aktif (Siap Login)</span>
                              </>
                            ) : (
                              <>
                                <UserX className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>Non-aktif</span>
                              </>
                            )}
                          </button>
                        </td>

                        {/* Kolom 5: Login Terakhir */}
                        <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                          {user.lastLogin || '-'}
                        </td>

                        {/* Kolom 6: Aksi */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditUserModal(user)}
                              className="px-3 py-1.5 text-[11px] font-bold text-[#002B66] dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 border border-blue-200/70 dark:border-blue-800/70 rounded-lg inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
                              title="Edit Password & Ceklist Hak Akses Menu Navigasi"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>Edit Akses</span>
                            </button>

                            {user.username !== 'Admin' && (
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(user.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 border border-transparent hover:border-red-200 rounded-lg cursor-pointer transition-colors"
                                title="Hapus Akun"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pop-up Modal Detail Hak Akses Menu Navigasi */}
            {detailAccessUser && (() => {
              const detailMenus =
                detailAccessUser.username === 'Admin'
                  ? ALL_MENU_IDS
                  : Array.isArray(detailAccessUser.allowedMenus) &&
                    detailAccessUser.allowedMenus.length > 0
                  ? detailAccessUser.allowedMenus
                  : ALL_MENU_IDS;
              const isFullAccess = detailMenus.length === ALL_MENU_IDS.length;

              return (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
                  onClick={() => setDetailAccessUser(null)}
                >
                  <div
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-xl w-full shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150"
                    onClick={e => e.stopPropagation()}
                  >
                    {/* Header Pop-up Detail Akses */}
                    <div className="bg-gradient-to-r from-[#002B66] to-blue-900 px-6 py-4 text-white flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
                          <Shield className="w-5 h-5 text-amber-300" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm sm:text-base font-extrabold tracking-tight">
                              Detail Hak Akses Menu Navigasi
                            </h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                              {detailMenus.length} / {ALL_MENU_IDS.length} Menu Aktif
                            </span>
                          </div>
                          <p className="text-xs text-blue-100 mt-0.5">
                            Daftar otorisasi modul sistem yang dapat diakses oleh akun pengguna
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDetailAccessUser(null)}
                        className="text-blue-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer text-lg leading-none"
                      >
                        &times;
                      </button>
                    </div>

                    {/* Ringkasan Profil Akun */}
                    <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="font-extrabold text-slate-900 dark:text-slate-100 block">
                          {detailAccessUser.namaLengkap}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          <span className="text-[#002B66] dark:text-blue-300 font-bold">
                            @{detailAccessUser.username}
                          </span>
                          <span>•</span>
                          <span>{detailAccessUser.email}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 dark:bg-blue-950 text-[#002B66] dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {detailAccessUser.role}
                        </span>
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                             isFullAccess
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                        >
                          {isFullAccess ? 'Akses Penuh Semua Menu' : `${detailMenus.length} Menu Terceklist`}
                        </span>
                      </div>
                    </div>

                    {/* Daftar 11 Menu Navigasi beserta Status Diizinkan / Terkunci */}
                    <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        <span>Daftar Menu Navigasi Sistem ({ADMIN_NAV_MENUS.length} Modul)</span>
                        <span>Status Hak Akses</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {ADMIN_NAV_MENUS.map((menu, idx) => {
                          const isAllowed = detailMenus.includes(menu.id);
                          return (
                            <div
                              key={menu.id}
                              className={`p-3 rounded-xl border flex items-start justify-between gap-2.5 transition-all ${
                                isAllowed
                                  ? 'bg-emerald-50/50 dark:bg-emerald-950/25 border-emerald-200 dark:border-emerald-800/70'
                                  : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800 opacity-65'
                              }`}
                            >
                              <div className="flex items-start gap-2.5 min-w-0">
                                <div
                                  className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-extrabold shrink-0 mt-0.5 ${
                                    isAllowed
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                                  }`}
                                >
                                  {isAllowed ? '✓' : idx + 1}
                                </div>
                                <div className="min-w-0">
                                  <span
                                    className={`font-bold text-xs block leading-snug ${
                                      isAllowed
                                        ? 'text-slate-900 dark:text-slate-100'
                                        : 'text-slate-500 dark:text-slate-400 line-through'
                                    }`}
                                  >
                                    {menu.label}
                                  </span>
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5 leading-tight">
                                    {menu.desc}
                                  </span>
                                </div>
                              </div>

                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold shrink-0 whitespace-nowrap ${
                                  isAllowed
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'bg-slate-200/80 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                }`}
                              >
                                {isAllowed ? 'Diizinkan' : 'Terkunci'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Footer Pop-up */}
                    <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                      <span className="text-[11px] text-slate-500">
                        Hanya menu berstatus <strong className="text-emerald-700 dark:text-emerald-400">Diizinkan</strong> yang tampil saat akun ini login.
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setDetailAccessUser(null)}
                          className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer transition-colors"
                        >
                          Tutup
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const targetUser = detailAccessUser;
                            setDetailAccessUser(null);
                            handleOpenEditUserModal(targetUser);
                          }}
                          className="px-4 py-2 rounded-xl bg-[#002B66] hover:bg-blue-800 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Ubah Hak Akses</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Modal Tambah / Edit Akun Pengguna & Ceklist Hak Akses Menu Navigasi */}
            {showAddUserModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-xl w-full shadow-2xl space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <h4 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                        {editingUserId
                          ? 'Edit Akun, Password & Hak Akses Menu Navigasi'
                          : 'Tambah Akun Pengguna Baru'}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Atur Username & Password sekaligus serta pilih ceklist menu navigasi yang boleh diakses oleh akun ini.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddUserModal(false);
                        setEditingUserId(null);
                      }}
                      className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
                    >
                      &times;
                    </button>
                  </div>

                  {userFormError && (
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{userFormError}</span>
                    </div>
                  )}

                  <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
                    {/* Row 1: Username & Password Sekaligus */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                          Username Login <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          disabled={editingUserId !== null && newUsername === 'Admin'}
                          value={newUsername}
                          onChange={e => setNewUsername(e.target.value)}
                          placeholder="contoh: pic_banyuwangi"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-800 disabled:opacity-60"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                          Password Login <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            required
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            placeholder="Masukkan password login"
                            className="w-full pl-3 pr-9 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-800"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(prev => !prev)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                            title={showNewPassword ? 'Sembunyikan Password' : 'Tampilkan Password'}
                          >
                            {showNewPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Nama Lengkap & Email Umum (Tidak perlu bi.go.id) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                          Nama Lengkap & Gelar <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={newNamaLengkap}
                          onChange={e => setNewNamaLengkap(e.target.value)}
                          placeholder="contoh: Ahmad Pratama, S.E."
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-800"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                          Alamat Email
                        </label>
                        <input
                          type="email"
                          value={newEmail}
                          onChange={e => setNewEmail(e.target.value)}
                          placeholder="contoh: ahmad.pratama@gmail.com"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-800"
                        />
                      </div>
                    </div>

                    {/* Row 3: Hak Akses Sistem Berupa Ceklist Data Menu Navigasi */}
                    <div className="space-y-2.5 pt-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <label className="block font-extrabold text-slate-900 dark:text-slate-100 text-xs">
                            Hak Akses Sistem (Ceklist Menu Navigasi) <span className="text-red-500">*</span>
                          </label>
                          <p className="text-[11px] text-slate-500">
                            Pemilik akun hanya dapat melihat dan mengakses menu navigasi yang terceklist di bawah ini:
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {newAllowedMenus.length} dari {ALL_MENU_IDS.length} Menu Dipilih
                        </span>
                      </div>

                      {/* Quick Select / Preset Toolbar */}
                      <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-200/80 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => setNewAllowedMenus([...ALL_MENU_IDS])}
                          className="px-2.5 py-1 rounded-lg bg-blue-900 text-white font-bold text-[11px] hover:bg-blue-800 cursor-pointer transition-colors"
                        >
                          Pilih Semua Menu ({ALL_MENU_IDS.length})
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setNewAllowedMenus(['ANALYTICS', 'MAP', 'REKAP', 'QR', 'MONITORING'])
                          }
                          className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-[11px] hover:bg-slate-100 cursor-pointer transition-colors"
                        >
                          Preset PIC Lapangan
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setNewAllowedMenus(['ANALYTICS', 'MAP', 'REKAP', 'AUDIT'])
                          }
                          className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-[11px] hover:bg-slate-100 cursor-pointer transition-colors"
                        >
                          Preset Auditor
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewAllowedMenus([])}
                          className="ml-auto px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-semibold text-[11px] cursor-pointer transition-colors"
                        >
                          Reset Pilihan
                        </button>
                      </div>

                      {/* 10 Navigation Menus Checklist Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                        {ADMIN_NAV_MENUS.map(menu => {
                          const isChecked = newAllowedMenus.includes(menu.id);
                          return (
                            <label
                              key={menu.id}
                              onClick={() => toggleAllowedMenuSelection(menu.id)}
                              className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all select-none ${
                                isChecked
                                  ? 'bg-blue-50/80 dark:bg-blue-950/50 border-blue-600 dark:border-blue-500 ring-1 ring-blue-500/30'
                                  : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-slate-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="mt-0.5 w-4 h-4 accent-blue-900 rounded cursor-pointer shrink-0"
                              />
                              <div className="min-w-0">
                                <span
                                  className={`font-bold text-xs block leading-snug ${
                                    isChecked
                                      ? 'text-blue-950 dark:text-blue-200'
                                      : 'text-slate-800 dark:text-slate-200'
                                  }`}
                                >
                                  {menu.label}
                                </span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5 leading-tight">
                                  {menu.desc}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Status Aktif Langsung Jadi */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          id="activeAccountCheck"
                          checked={newIsAccountActive}
                          onChange={e => setNewIsAccountActive(e.target.checked)}
                          className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                        />
                        <label
                          htmlFor="activeAccountCheck"
                          className="text-xs font-bold text-emerald-950 dark:text-emerald-200 cursor-pointer"
                        >
                          Aktifkan akun langsung (Akun langsung jadi & siap login sekarang)
                        </label>
                      </div>
                    </div>

                    <div className="pt-3 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddUserModal(false);
                          setEditingUserId(null);
                        }}
                        className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold shadow-xs cursor-pointer transition-colors"
                      >
                        {editingUserId ? 'Simpan Perubahan Akun' : 'Buat & Aktifkan Akun'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: AUDIT LOG SISTEM & LOG MASUK */}
        {/* ========================================================= */}
        {activeTab === 'AUDIT' && (
          <div className="space-y-5 animate-in fade-in duration-150">
            {/* Interactive Timeline Visualization of Critical System Audit Logs */}
            <CriticalAuditTimelineWidget auditLogs={auditLogs} maxItems={10} />

            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Tabel Lengkap Rekam Jejak Audit Sistem & Log Masuk Sesi
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mencatat aktivitas login, perubahan data penerima, scan QR fisik lapangan, dan ekspor dokumen secara kronologis.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-blue-900 dark:text-blue-400">
                {auditLogs.length} Catatan Log
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                    <th className="p-3">Waktu</th>
                    <th className="p-3">Pengguna</th>
                    <th className="p-3">IP Address</th>
                    <th className="p-3">Aksi Sistem</th>
                    <th className="p-3">Target Entitas</th>
                    <th className="p-3">Rincian Perubahan</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                  {auditLogs.slice(0, 50).map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="p-3 whitespace-nowrap text-slate-500">{log.timestamp}</td>
                      <td className="p-3 whitespace-nowrap font-bold text-slate-900 dark:text-slate-100">
                        {log.username} ({log.role})
                      </td>
                      <td className="p-3 whitespace-nowrap text-slate-500">{log.ipAddress}</td>
                      <td className="p-3 whitespace-nowrap font-semibold text-blue-900 dark:text-blue-300">
                        {log.aksi}
                      </td>
                      <td className="p-3 whitespace-nowrap text-slate-700 dark:text-slate-300">{log.target}</td>
                      <td className="p-3 font-sans text-xs text-slate-600 dark:text-slate-400 max-w-sm">
                        {log.detail}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.status === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.status === 'WARNING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 7: KONFIGURASI LANDING, INTEGRASI LOGISTIK & BACKUP */}
        {/* ========================================================= */}
        {activeTab === 'CONFIG' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Annual Pagu Configuration Card */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 flex items-center justify-center shrink-0">
                    <Coins className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Total Pagu Alokasi Anggaran EPML Tahunan
                    </h3>
                    <p className="text-xs text-slate-500">
                      Batas pagu maksimal alokasi bantuan sosial untuk 13 Wilayah Kerja Bank Indonesia Provinsi Jawa Timur.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditPaguModalOpen(true)}
                  className="px-3.5 py-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Sesuaikan Pagu Anggaran</span>
                </button>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] text-slate-500 font-medium block">Pagu Tahunan Aktif</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">
                    Rp {annualPagu.toLocaleString('id-ID')}
                  </span>
                  <span className="text-xs text-blue-900 dark:text-blue-400 font-semibold block mt-0.5">
                    (Rp {(annualPagu / 1e9).toFixed(2)} Milyar)
                  </span>
                </div>
                <div className="sm:text-right text-xs">
                  <span className="text-slate-500 block">Cakupan Wilayah</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    13 Wilayah Kerja Kab/Kota KPw BI Jatim
                  </span>
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium mt-0.5">
                    Sisa Anggaran: Rp {(sisaPaguJatim / 1e9).toFixed(2)} M ({persentaseSerapan}% terserap)
                  </p>
                </div>
              </div>
            </div>

            {/* Backup & Restore Google Drive Card */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Database className="w-5 h-5 text-blue-900 dark:text-blue-400 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Cadangan Data (Backup) & Sinkronisasi Google Drive
                    </h3>
                    <p className="text-xs text-slate-500">
                      Unduh file cadangan utuh database penerima, foto, dan konfigurasi atau sinkronkan langsung ke folder Google Drive.
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  <GoogleDriveConnectButton
                    folderUrl={DRIVE_BACKUP_FOLDER_URL}
                    folderLabel="Buka Folder Drive Cadangan"
                  />
                </div>
              </div>

              {restoreMessage && (
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 text-xs text-blue-900 dark:text-blue-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-600" />
                  <span>{restoreMessage}</span>
                </div>
              )}

              {(gdriveSyncSuccess || gdriveSyncMessage) && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                    gdriveSyncSuccess
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-900 dark:text-emerald-200'
                      : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 text-amber-900 dark:text-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span className="font-semibold">
                      {gdriveSyncMessage ||
                        'Cadangan database berhasil disinkronisasi ke Google Drive Cloud Storage Bank Indonesia!'}
                    </span>
                  </div>
                  {gdriveBackupFileUrl && (
                    <a
                      href={gdriveBackupFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-bold text-blue-900 dark:text-blue-300 hover:underline shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Lihat File Backup di Drive</span>
                    </a>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {/* 1. Download Backup JSON */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                      1. Unduh Cadangan JSON
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Menyimpan seluruh data bantuan, vendor, foto, dan audit log ke file cadangan lokal.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadBackup}
                    className="w-full py-2 px-3 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-100 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh File Cadangan</span>
                  </button>
                </div>

                {/* 2. Restore JSON */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                      2. Impor / Pulihkan Cadangan
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Memulihkan seluruh data secara utuh saat terjadi kerusakan sistem atau kehilangan data.
                    </p>
                  </div>
                  <label className="w-full cursor-pointer py-2 px-3 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-100 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Pilih File Backup JSON</span>
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={handleRestoreFile}
                    />
                  </label>
                </div>

                {/* 3. Google Drive Cloud Sync (Linked to 13QMsleueA1Mp4kMWLa2q36bIuWwXXvDT) */}
                <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-900/60 space-y-2.5 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">
                        3. Sinkronisasi Google Drive
                      </span>
                      <a
                        href={DRIVE_BACKUP_FOLDER_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-900 dark:text-blue-300 hover:underline"
                        title="Buka Folder Google Drive Cadangan Data"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Buka Folder</span>
                      </a>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Unggah otomatis cadangan database JSON ke folder khusus Cadangan Data Google Drive BI Jatim.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={handleSyncGoogleDrive}
                      disabled={isSyncingBackupDrive}
                      className="w-full py-2 px-3 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {isSyncingBackupDrive ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Mengunggah ke Google Drive...</span>
                        </>
                      ) : (
                        <>
                          <CloudUpload className="w-3.5 h-3.5" />
                          <span>Sinkron ke Google Drive</span>
                        </>
                      )}
                    </button>
                    <a
                      href={DRIVE_BACKUP_FOLDER_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-1.5 px-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-blue-900 dark:text-blue-300 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Lihat Folder Google Drive Backup</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Daftar 3 Folder Utama Google Drive yang Terhubung */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <a
                  href={DRIVE_VIDEO_FOLDER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 bg-slate-50/70 dark:bg-slate-800/40 flex items-start justify-between gap-2 transition-colors"
                >
                  <div>
                    <span className="font-bold text-slate-900 dark:text-slate-100 block">
                      Folder Drive Video Landing Page
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Otomatis per tahun: EPML [Tahun] (2026, 2027, dst.)
                    </span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-blue-900 dark:text-blue-400 shrink-0 mt-0.5" />
                </a>

                <a
                  href={DRIVE_PHOTO_ARCHIVE_ROOT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 bg-slate-50/70 dark:bg-slate-800/40 flex items-start justify-between gap-2 transition-colors"
                >
                  <div>
                    <span className="font-bold text-slate-900 dark:text-slate-100 block">
                      Folder Drive Arsip Foto Penerima
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Otomatis per tahun: EPML [Tahun] / [Nama Penerima]
                    </span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-blue-900 dark:text-blue-400 shrink-0 mt-0.5" />
                </a>

                <a
                  href={DRIVE_BACKUP_FOLDER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 bg-slate-50/70 dark:bg-slate-800/40 flex items-start justify-between gap-2 transition-colors"
                >
                  <div>
                    <span className="font-bold text-slate-900 dark:text-slate-100 block">
                      Folder Drive Cadangan Data (Backup)
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Sinkronisasi file JSON cadangan sistem
                    </span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-blue-900 dark:text-blue-400 shrink-0 mt-0.5" />
                </a>
              </div>

              {/* Panel Terpusat Integrasi & Otomatisasi Folder Tahun Anggaran (Arsip Foto & Arsip Video Google Drive) */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#002B66] text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Calendar className="w-4 h-4 text-amber-300" />
                    </div>
                    <div className="text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-slate-900 dark:text-slate-100">
                          Integrasi Terpusat Arsip Foto & Video Google Drive (Tahun Aktif: EPML {activeBudgetYear})
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          Otomatis Buat Folder Saat Tahun Berganti: EPML [Tahun] / [Nama Penerima]
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        Setiap input penerima baru otomatis membuat folder tahun (contoh: <strong>EPML {activeBudgetYear}</strong>, <strong>EPML {activeBudgetYear + 1}</strong>, dst.) beserta subfolder <strong>Nama Penerima</strong> di <strong>Arsip Foto Penerima</strong> maupun <strong>Arsip Video Landing Page</strong>. Saat data penerima dihapus dari tabel rekapitulasi, foto dokumentasi di Google Drive tetap tersimpan aman dan tidak dihapus.
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
                        activeBudgetYear,
                        ...yearlyFoldersRegistry.map(y => y.tahun)
                      ])
                    )
                      .sort((a, b) => a - b)
                      .map(yr => {
                        const isCurrent = yr === activeBudgetYear;
                        const isReady = yearlyFoldersRegistry.some(
                          y => y.tahun === yr && y.photoYearFolderId && y.videoYearFolderId
                        );
                        return (
                          <button
                            key={yr}
                            type="button"
                            disabled={isSyncingYearlyFolders}
                            onClick={() => handleRolloverOrPrepareBudgetYear(yr)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer border ${
                              isCurrent
                                ? 'bg-[#002B66] text-white border-[#002B66] shadow-2xs'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-500'
                            }`}
                            title={`Siapkan otomatis folder EPML ${yr} di Arsip Foto & Arsip Video`}
                          >
                            <FolderOpen className="w-3.5 h-3.5 shrink-0" />
                            <span>EPML {yr}</span>
                            {isReady && (
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isCurrent ? 'bg-emerald-300' : 'bg-emerald-500'
                                }`}
                              />
                            )}
                          </button>
                        );
                      })}

                    <button
                      type="button"
                      disabled={isSyncingYearlyFolders}
                      onClick={() => {
                        const nextYr =
                          Math.max(
                            2026,
                            activeBudgetYear,
                            ...yearlyFoldersRegistry.map(y => y.tahun)
                          ) + 1;
                        handleRolloverOrPrepareBudgetYear(nextYr);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1 transition-colors cursor-pointer"
                      title="Tambahkan otomatis folder untuk Tahun Anggaran berikutnya di Arsip Foto & Arsip Video"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>
                        + Tahun{' '}
                        {Math.max(
                          2026,
                          activeBudgetYear,
                          ...yearlyFoldersRegistry.map(y => y.tahun)
                        ) + 1}
                      </span>
                    </button>
                  </div>
                </div>

                {yearlyFolderNotice && (
                  <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{yearlyFolderNotice}</span>
                  </div>
                )}

                {yearlyFoldersRegistry.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                    {yearlyFoldersRegistry.map(entry => (
                      <div
                        key={entry.tahun}
                        className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <FolderOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="font-extrabold text-slate-900 dark:text-slate-100">
                              {entry.folderName}
                            </span>
                            {entry.tahun === activeBudgetYear && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                Aktif
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Disinkronkan: {entry.lastVerifiedAt}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {entry.photoYearFolderUrl && (
                            <a
                              href={entry.photoYearFolderUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-900 dark:text-blue-300 font-bold text-[10px] inline-flex items-center gap-1"
                              title={`Buka Folder Arsip Foto ${entry.folderName}`}
                            >
                              <span>Arsip Foto</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                          {entry.videoYearFolderUrl && (
                            <a
                              href={entry.videoYearFolderUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 font-bold text-[10px] inline-flex items-center gap-1"
                              title={`Buka Folder Arsip Video ${entry.folderName}`}
                            >
                              <span>Arsip Video</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Landing Page Customizer Form */}
            <form onSubmit={handleSaveLandingConfig} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Kustomisasi Landing Page & Latar Belakang (Foto/Video)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ubah judul, deskripsi hero, dan tautan latar belakang foto/video publik
                  </p>
                </div>
                {configSavedToast && (
                  <span className="text-xs text-emerald-700 font-semibold">Tersimpan!</span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="md:col-span-2">
                  <label className="block font-semibold mb-1">Judul Utama Hero (Title)</label>
                  <input
                    type="text"
                    required
                    value={localConfig.heroTitle}
                    onChange={e => setLocalConfig({ ...localConfig, heroTitle: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-semibold mb-1">Deskripsi Hero</label>
                  <textarea
                    rows={2}
                    required
                    value={localConfig.heroSubtitle}
                    onChange={e => setLocalConfig({ ...localConfig, heroSubtitle: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Tipe Media Latar Belakang</label>
                  <select
                    value={localConfig.heroMediaMode === 'video' ? 'video' : localConfig.backgroundType}
                    onChange={e => {
                      const nextType = e.target.value as 'image' | 'video';
                      setLocalConfig({
                        ...localConfig,
                        backgroundType: nextType,
                        heroMediaMode: nextType === 'video' ? 'video' : 'slideshow'
                      });
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="image">Foto (Slideshow / Image)</option>
                    <option value="video">Video Tunggal (MP4 / Web Stream / Upload)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">URL Media Latar Belakang</label>
                  <input
                    type="text"
                    value={localConfig.backgroundUrl}
                    onChange={e => setLocalConfig({ ...localConfig, backgroundUrl: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  {localConfig.heroVideoSourceType === 'upload' && localConfig.uploadedVideoFileName && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-1">
                      ✓ Video Terupload Aktif: {localConfig.uploadedVideoFileName} (Tersimpan Permanen)
                    </span>
                  )}
                </div>

                {/* Preset image quick selectors */}
                <div className="md:col-span-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] text-slate-500 block mb-2 font-medium">Pilihan Cepat Gambar Gedung Bank Indonesia Jatim:</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setLocalConfig({ ...localConfig, backgroundUrl: '/src/assets/images/bi_jatim_hero_1793505598999.jpg' })}
                      className="px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100"
                    >
                      Gedung Heritage & Modern Annex
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocalConfig({ ...localConfig, backgroundUrl: '/src/assets/images/bi_pahlawan_building_1793505599998.jpg' })}
                      className="px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100"
                    >
                      Fasad Megah Jl. Pahlawan
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocalConfig({ ...localConfig, backgroundUrl: '/src/assets/images/bantuan_epml_activity_1793505601348.jpg' })}
                      className="px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100"
                    >
                      Dokumentasi Penyerahan EPML
                    </button>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block font-semibold mb-1">Integrasi Endpoint API Logistik Pihak Ketiga</label>
                  <input
                    type="text"
                    value={localConfig.logisticsApiEndpoint}
                    onChange={e => setLocalConfig({ ...localConfig, logisticsApiEndpoint: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs shadow-xs"
                >
                  Simpan Konfigurasi Sistem
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
      </div>

      {/* Edit Pagu Modal */}
      <EditPaguModal
        isOpen={isEditPaguModalOpen}
        onClose={() => setIsEditPaguModalOpen(false)}
        currentPagu={annualPagu}
        totalRealisasi={totalRealisasi}
        onSavePagu={handleSaveAnnualPagu}
      />

      {/* Print QR Sticker A4 (3x6) Modal */}
      <PrintQrStickerModal
        isOpen={isPrintQrModalOpen}
        onClose={() => {
          setIsPrintQrModalOpen(false);
          setCustomPrintItems(null);
          setPrintInitialCopiesMap({});
        }}
        items={customPrintItems || filteredQrList}
        filterSummaryText={
          customPrintItems && customPrintItems.length === 1
            ? `Cetak Stiker Penerima: ${customPrintItems[0].id}`
            : qrFilterSummaryText
        }
        initialCopiesMap={printInitialCopiesMap}
      />

      {/* Bulk CSV Import Modal */}
      <BulkImportBantuanModal
        isOpen={isBulkImportCsvOpen}
        onClose={() => setIsBulkImportCsvOpen(false)}
        existingBantuanList={bantuanList}
        actorName={currentUser.namaLengkap}
        onImportComplete={summaryMsg => {
          setBulkImportSuccessMessage(summaryMsg);
          onRefreshData();
        }}
      />

      {/* Pop-up Peringatan Konfirmasi Hapus Data (Penerima Bantuan / Akun Pengguna) */}
      {deleteConfirmState && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setDeleteConfirmState(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center space-y-2.5">
              <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/80 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 flex items-center justify-center shadow-xs">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60">
                {deleteConfirmState.type === 'USER'
                  ? 'Peringatan Hapus Akun Pengguna'
                  : 'Peringatan Hapus Data Penerima'}
              </span>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
                Apakah benar data ini dihapus ?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {deleteConfirmState.type === 'USER'
                  ? 'Akun pengguna yang dihapus tidak dapat lagi digunakan untuk login ke Portal Admin maupun Scan QR Bantuan.'
                  : 'Data penerima bantuan yang dihapus akan dihilangkan dari daftar rekapitulasi, peta sebaran, dan katalog QR.'}
              </p>
            </div>

            {/* Rincian Data yang Akan Dihapus */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-left space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                {deleteConfirmState.type === 'USER' ? 'Detail Akun Pengguna:' : 'Detail Penerima Bantuan:'}
              </span>
              <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100">
                {deleteConfirmState.title}
              </p>
              {deleteConfirmState.subtitle && (
                <p className="text-[11px] font-mono font-semibold text-blue-900 dark:text-blue-300">
                  {deleteConfirmState.subtitle}
                </p>
              )}
              {deleteConfirmState.detailInfo && (
                <p className="text-[11px] text-slate-600 dark:text-slate-400 pt-0.5">
                  {deleteConfirmState.detailInfo}
                </p>
              )}
            </div>

            {deleteConfirmState.type === 'BANTUAN' && (
              <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-900 dark:text-emerald-200 leading-relaxed">
                <strong>Arsip Foto Google Drive Aman:</strong> Saat data penerima dihapus dari menu Pencatatan, folder penerima dan seluruh foto dokumentasi (Lokasi, Penyerahan, BAST, Monitoring) yang telah tersimpan di Google Drive <strong>tidak ikut dihapus</strong>.
              </div>
            )}

            {/* Tombol Aksi Batal / Ya, Hapus */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteConfirmState(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAction}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Unggah Cadangan Data ke Google Drive */}
      {isBackupConfirmModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsBackupConfirmModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-blue-100 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-300 flex items-center justify-center shrink-0">
                <CloudUpload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100">
                  Konfirmasi Sinkronisasi Cadangan ke Google Drive
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Sistem akan membuat dan mengunggah file cadangan JSON baru berisi seluruh data penerima bantuan ({bantuanList.length} entri), data vendor ({vendors.length} rekanan), dan log audit ke Folder Google Drive Cadangan Data.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Folder Tujuan Google Drive:
              </span>
              <a
                href={DRIVE_BACKUP_FOLDER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[11px] font-bold text-blue-900 dark:text-blue-300 hover:underline break-all inline-flex items-center gap-1"
              >
                <span>Folder Cadangan Data (13QMsleueA1Mp4kMWLa2q36bIuWwXXvDT)</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsBackupConfirmModalOpen(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteBackupSyncToDrive}
                className="flex-1 py-2.5 px-4 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <CloudUpload className="w-4 h-4" />
                <span>Ya, Unggah ke Drive</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
