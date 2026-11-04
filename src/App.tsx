/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { StorageService } from './services/storageService';
import { syncRecipientPhotosToGoogleDrive } from './services/googleDriveService';
import { 
  AnomaliDistribusi, 
  ArtikelItem,
  BantuanItem, 
  JadwalSurveiMonitoringItem,
  LandingPageConfig, 
  SystemAuditLog, 
  UserAccount,
  VendorItem,
  KondisiItemBarang 
} from './types';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { LandingPage } from './components/LandingPage';
import { TrackingSubPage } from './components/tracking/TrackingSubPage';
import { ScanQrSubPage } from './components/tracking/ScanQrSubPage';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { KalenderSurveiMonitoring } from './components/admin/KalenderSurveiMonitoring';
import { LoginModal } from './components/admin/LoginModal';
import { BantuanFormModal } from './components/admin/BantuanFormModal';
import { DetailBantuanModal } from './components/admin/DetailBantuanModal';
import { QrScannerModal } from './components/admin/QrScannerModal';
import { ExportReportModal } from './components/admin/ExportReportModal';
import { WhatsAppModal } from './components/admin/WhatsAppModal';
import { AnomaliModal } from './components/admin/AnomaliModal';
import { Bell } from 'lucide-react';

export default function App() {
  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('bi_epml_theme_mode_v1') === 'dark';
  });

  // Current session user
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    return StorageService.getSessionUser();
  });

  // Current View: 'home' (Landing Page) | 'tracking' (Sub Laman Update Tracking) | 'scan_qr' (Halaman Scan QR Bantuan Terpisah) | 'kalender_monitoring' (Halaman Baru Kalender Survei & Monitoring) | 'admin' (Portal Admin)
  const [currentView, setCurrentView] = useState<'home' | 'tracking' | 'scan_qr' | 'kalender_monitoring' | 'admin'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('page') === 'kalender-monitoring') {
        return 'kalender_monitoring';
      }
    }
    return 'home';
  });

  // Database states
  const [bantuanList, setBantuanList] = useState<BantuanItem[]>(() => {
    return StorageService.getBantuanList();
  });

  const [landingConfig, setLandingConfig] = useState<LandingPageConfig>(() => {
    return StorageService.getLandingConfig();
  });

  const [auditLogs, setAuditLogs] = useState<SystemAuditLog[]>(() => {
    return StorageService.getAuditLogs();
  });

  const [userAccounts, setUserAccounts] = useState<UserAccount[]>(() => {
    return StorageService.getUsers();
  });

  const [vendorList, setVendorList] = useState<VendorItem[]>(() => {
    return StorageService.getVendors();
  });

  const [artikelList, setArtikelList] = useState<ArtikelItem[]>(() => {
    return StorageService.getArtikelList();
  });

  const [jadwalKalender, setJadwalKalender] = useState<JadwalSurveiMonitoringItem[]>(() => {
    return StorageService.getJadwalKalender();
  });

  const [anomalies, setAnomalies] = useState<AnomaliDistribusi[]>(() => {
    return StorageService.detectAnomalies();
  });

  // Modals state
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isBantuanFormOpen, setIsBantuanFormOpen] = useState(false);
  const [editingBantuan, setEditingBantuan] = useState<BantuanItem | null>(null);
  const [selectedDetailBantuan, setSelectedDetailBantuan] = useState<BantuanItem | null>(null);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [qrScannerBantuanId, setQrScannerBantuanId] = useState<string | undefined>(undefined);
  const [isExportReportOpen, setIsExportReportOpen] = useState(false);
  const [whatsAppBantuan, setWhatsAppBantuan] = useState<BantuanItem | null>(null);
  const [isAnomalyModalOpen, setIsAnomalyModalOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');

  // Real-time Push Notification Toast
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  // Sync theme to HTML document element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('bi_epml_theme_mode_v1', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('bi_epml_theme_mode_v1', 'light');
    }
  }, [darkMode]);

  // Auto-generate QR codes for all initial/existing items & hydrate uploaded hero video on load
  useEffect(() => {
    StorageService.ensureAllQrCodesGenerated().then(hydratedList => {
      setBantuanList(hydratedList);
    });
    StorageService.hydratePersistedHeroVideo().then(hydratedConfig => {
      if (hydratedConfig) {
        setLandingConfig(hydratedConfig);
      }
    });
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  const showPushToast = (message: string) => {
    setToastNotification(message);
    setTimeout(() => {
      setToastNotification(null);
    }, 4500);
  };

  const handleRefreshData = () => {
    const latestBantuan = StorageService.getBantuanList();
    setBantuanList(latestBantuan);
    setSelectedDetailBantuan(prev =>
      prev ? latestBantuan.find(b => b.id === prev.id) || null : null
    );
    StorageService.ensureAllQrCodesGenerated().then(hydratedList => {
      setBantuanList(hydratedList);
      setSelectedDetailBantuan(prev =>
        prev ? hydratedList.find(b => b.id === prev.id) || null : null
      );
    });
    setVendorList(StorageService.getVendors());
    setArtikelList(StorageService.getArtikelList());
    setJadwalKalender(StorageService.getJadwalKalender());
    const latestLanding = StorageService.getLandingConfig();
    setLandingConfig(latestLanding);
    StorageService.hydratePersistedHeroVideo().then(hydratedConfig => {
      if (hydratedConfig) {
        setLandingConfig(hydratedConfig);
      }
    });
    setAuditLogs(StorageService.getAuditLogs());
    const updatedUsers = StorageService.getUsers();
    setUserAccounts(updatedUsers);
    setCurrentUser(prev => {
      if (!prev) return null;
      const synced = updatedUsers.find(u => u.id === prev.id || u.username.toLowerCase() === prev.username.toLowerCase());
      return synced || prev;
    });
    setAnomalies(StorageService.detectAnomalies());
  };

  // Login handler
  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    setCurrentView('admin');
    handleRefreshData();
    showPushToast(`Selamat datang, ${user.namaLengkap}! Akses Administrator EPML aktif.`);
  };

  // Logout handler
  const handleLogout = () => {
    StorageService.logout();
    setCurrentUser(null);
    setCurrentView('home');
    showPushToast('Anda telah keluar dari sesi administrator.');
  };

  // Save Bantuan item
  const handleSaveBantuan = async (item: BantuanItem) => {
    const isNew = !bantuanList.some(b => b.id === item.id);
    await StorageService.saveBantuan(item, currentUser?.namaLengkap || 'Admin');
    handleRefreshData();
    showPushToast(
      isNew
        ? `Entri baru bantuan ${item.id} berhasil ditambahkan!`
        : `Data bantuan ${item.id} (${item.namaPenerima}) berhasil diperbarui.`
    );
  };

  // Update physical condition via QR scanner
  const handleUpdateKondisiViaQr = (
    id: string,
    kondisi: BantuanItem['statusKondisiFisik'],
    catatan: string,
    fotoUrl?: string,
    kondisiPerItem?: KondisiItemBarang[],
    actorOverride?: string
  ) => {
    const updated = StorageService.updateKondisiFisikViaQR(
      id,
      kondisi,
      catatan,
      fotoUrl,
      actorOverride || currentUser?.namaLengkap || 'PIC Lapangan',
      kondisiPerItem
    );
    if (updated) {
      handleRefreshData();
      showPushToast(`Pembaruan kondisi fisik ${id} (${kondisi}) via QR Informasi berhasil disimpan & diaudit.`);

      // If a new monitoring photo was uploaded and Google Drive is connected, sync it into EPML {tahun}/{namaPenerima}
      if (fotoUrl) {
        syncRecipientPhotosToGoogleDrive(updated, undefined, false)
          .then(async (driveRes) => {
            if (driveRes.synced) {
              await StorageService.saveBantuan(
                {
                  ...updated,
                  driveYearFolderId: driveRes.yearFolderId,
                  driveYearFolderName: driveRes.yearFolderName,
                  driveRecipientFolderId: driveRes.recipientFolderId,
                  driveRecipientFolderName: driveRes.recipientFolderName,
                  driveRecipientFolderUrl: driveRes.recipientFolderUrl,
                  driveUploadedPhotoMap: driveRes.uploadedPhotoMap,
                  driveLastSyncedAt: new Date().toLocaleString('id-ID'),
                },
                actorOverride || currentUser?.namaLengkap || 'PIC Lapangan'
              );
              handleRefreshData();
            }
          })
          .catch(() => {
            // Silent fallback if token not active
          });
      }
    }
  };

  const handleNavigateSection = (sectionId: string) => {
    setCurrentView('home');
    setActiveSection(sectionId);
    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 50);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
      {/* Toast Notification for Real-Time Status & Audit Updates */}
      {toastNotification && (
        <div className="fixed top-20 right-4 z-50 max-w-sm bg-blue-900 text-white text-xs px-4 py-3 rounded-xl shadow-2xl border border-blue-700 flex items-center gap-3 animate-in slide-in-from-top-4 duration-200">
          <Bell className="w-4 h-4 text-amber-300 shrink-0" />
          <p className="flex-1 leading-snug">{toastNotification}</p>
          <button
            onClick={() => setToastNotification(null)}
            className="text-blue-300 hover:text-white"
          >
            &times;
          </button>
        </div>
      )}

      {/* Top Navbar: only on public landing ('home'), tracking ('tracking'), and scan_qr ('scan_qr') */}
      {currentView !== 'admin' && (
        <Navbar
          currentUser={currentUser}
          onOpenLogin={() => setIsLoginModalOpen(true)}
          onOpenAdmin={() => setCurrentView('admin')}
          onLogout={handleLogout}
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
          anomalyCount={anomalies.length}
          onOpenAnomalyModal={() => setIsAnomalyModalOpen(true)}
          activeSection={activeSection}
          onNavigateSection={handleNavigateSection}
          onNavigateToTracking={() => {
            setCurrentView('tracking');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onNavigateToScanQr={() => {
            setCurrentView('scan_qr');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onNavigateToKalender={() => {
            setCurrentView('kalender_monitoring');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          currentView={currentView}
        />
      )}

      {/* Main Content View Switcher */}
      <div className="flex-1">
        {currentView === 'admin' && currentUser ? (
          <AdminDashboard
            currentUser={currentUser}
            bantuanList={bantuanList}
            landingConfig={landingConfig}
            auditLogs={auditLogs}
            userAccounts={userAccounts}
            vendorList={vendorList}
            artikelList={artikelList}
            jadwalKalender={jadwalKalender}
            anomalies={anomalies}
            darkMode={darkMode}
            onToggleDarkMode={toggleDarkMode}
            anomalyCount={anomalies.length}
            onOpenAnomalyModal={() => setIsAnomalyModalOpen(true)}
            onUpdateBantuanList={setBantuanList}
            onUpdateLandingConfig={setLandingConfig}
            onUpdateUserAccounts={setUserAccounts}
            onUpdateVendorList={setVendorList}
            onUpdateArtikelList={setArtikelList}
            onUpdateJadwalKalender={setJadwalKalender}
            onOpenKalenderFullPage={() => {
              setCurrentView('kalender_monitoring');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onRefreshData={handleRefreshData}
            onOpenCreateBantuan={() => {
              setEditingBantuan(null);
              setIsBantuanFormOpen(true);
            }}
            onOpenEditBantuan={item => {
              setEditingBantuan(item);
              setIsBantuanFormOpen(true);
            }}
            onOpenDetailBantuan={item => setSelectedDetailBantuan(item)}
            onOpenQrScanner={bantuanId => {
              setQrScannerBantuanId(bantuanId);
              setIsQrScannerOpen(true);
            }}
            onOpenExportReport={() => setIsExportReportOpen(true)}
            onOpenWhatsApp={item => setWhatsAppBantuan(item)}
            onCloseAdmin={() => setCurrentView('home')}
            onLogout={handleLogout}
          />
        ) : currentView === 'kalender_monitoring' ? (
          <KalenderSurveiMonitoring
            jadwalList={jadwalKalender}
            bantuanList={bantuanList}
            mode="full_page"
            canEdit={false}
            showOnTopDashboard={landingConfig.tampilkanKalenderDiDashboardAtas !== false}
            onToggleShowOnTopDashboard={currentUser ? show => {
              const updatedConfig: LandingPageConfig = {
                ...landingConfig,
                tampilkanKalenderDiDashboardAtas: show
              };
              StorageService.saveLandingConfig(updatedConfig, currentUser?.namaLengkap || 'Admin');
              setLandingConfig(updatedConfig);
            } : undefined}
            onSaveJadwal={item => {
              StorageService.saveJadwalKalender(
                item,
                currentUser?.namaLengkap || 'PIC Lapangan'
              );
              const updated = StorageService.getJadwalKalender();
              setJadwalKalender(updated);
              handleRefreshData();
              showPushToast(`Jadwal kalender "${item.jenisKegiatan} - ${item.namaPenerima}" berhasil disimpan.`);
            }}
            onDeleteJadwal={id => {
              StorageService.deleteJadwalKalender(
                id,
                currentUser?.namaLengkap || 'Admin'
              );
              const updated = StorageService.getJadwalKalender();
              setJadwalKalender(updated);
              handleRefreshData();
              showPushToast('Jadwal kalender berhasil dihapus.');
            }}
            onBackFromFullPage={() => {
              if (typeof window !== 'undefined' && window.location.search.includes('page=kalender-monitoring')) {
                window.history.replaceState({}, '', window.location.pathname);
              }
              setCurrentView(currentUser ? 'admin' : 'home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSelectBantuan={item => setSelectedDetailBantuan(item)}
          />
        ) : currentView === 'scan_qr' ? (
          <ScanQrSubPage
            bantuanList={bantuanList}
            onBackToHome={() => {
              setCurrentView('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onUpdateKondisiViaQr={handleUpdateKondisiViaQr}
          />
        ) : currentView === 'tracking' ? (
          <TrackingSubPage
            bantuanList={bantuanList}
            onBackToHome={() => {
              setCurrentView('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSelectBantuan={item => setSelectedDetailBantuan(item)}
            onOpenQrScanner={() => setIsQrScannerOpen(true)}
            onOpenWhatsApp={item => setWhatsAppBantuan(item)}
          />
        ) : (
          <LandingPage
            bantuanList={bantuanList}
            landingConfig={landingConfig}
            artikelList={artikelList}
            jadwalKalender={jadwalKalender}
            onOpenLogin={() => setIsLoginModalOpen(true)}
            onSelectBantuan={item => setSelectedDetailBantuan(item)}
            onOpenQrScanner={() => setIsQrScannerOpen(true)}
            onNavigateToTracking={() => {
              setCurrentView('tracking');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenKalenderPage={() => {
              setCurrentView('kalender_monitoring');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
      </div>

      {/* Institutional Footer */}
      <Footer
        officeAddress={landingConfig.officeAddress}
        contactEmail={landingConfig.contactEmail}
        contactPhone={landingConfig.contactPhone}
        googleMapsEmbedUrl={landingConfig.googleMapsEmbedUrl}
      />

      {/* MODAL 1: LOGIN ADMINISTRATOR & 2FA */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* MODAL 2: INPUT / EDIT BANTUAN */}
      <BantuanFormModal
        isOpen={isBantuanFormOpen}
        onClose={() => {
          setIsBantuanFormOpen(false);
          setEditingBantuan(null);
        }}
        onSave={handleSaveBantuan}
        initialItem={editingBantuan}
        actorName={currentUser?.namaLengkap || 'Admin Pusat EPML'}
      />

      {/* MODAL 3: DETAIL BANTUAN & QR CODE */}
      <DetailBantuanModal
        isOpen={!!selectedDetailBantuan}
        onClose={() => setSelectedDetailBantuan(null)}
        bantuan={selectedDetailBantuan}
        onEdit={item => {
          setSelectedDetailBantuan(null);
          setEditingBantuan(item);
          setIsBantuanFormOpen(true);
        }}
        onOpenWhatsApp={item => setWhatsAppBantuan(item)}
        onOpenQrScanner={bantuanId => {
          setQrScannerBantuanId(bantuanId || selectedDetailBantuan?.id);
          setIsQrScannerOpen(true);
        }}
      />

      {/* MODAL 4: QR CODE SCANNER & LAPANGAN INSPECTION */}
      <QrScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => {
          setIsQrScannerOpen(false);
          setQrScannerBantuanId(undefined);
        }}
        bantuanList={bantuanList}
        initialBantuanId={qrScannerBantuanId}
        onUpdateKondisiFisik={handleUpdateKondisiViaQr}
        onOpenWhatsApp={item => setWhatsAppBantuan(item)}
        actorName={currentUser?.namaLengkap || 'PIC Lapangan'}
      />

      {/* MODAL 5: EXPORT LAPORAN AUDIT & PDF */}
      <ExportReportModal
        isOpen={isExportReportOpen}
        onClose={() => setIsExportReportOpen(false)}
        bantuanList={bantuanList}
      />

      {/* MODAL 6: WHATSAPP NOTIFICATION DISPATCHER */}
      <WhatsAppModal
        isOpen={!!whatsAppBantuan}
        onClose={() => setWhatsAppBantuan(null)}
        bantuan={whatsAppBantuan}
      />

      {/* MODAL 7: ANOMALI DISTRIBUSI ALERTS */}
      <AnomaliModal
        isOpen={isAnomalyModalOpen}
        onClose={() => setIsAnomalyModalOpen(false)}
        anomalies={anomalies}
        onSelectBantuan={id => {
          const item = bantuanList.find(b => b.id === id);
          if (item) {
            setSelectedDetailBantuan(item);
          }
        }}
      />
    </div>
  );
}
