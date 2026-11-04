/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UserAccount } from '../types';
import { 
  ShieldCheck, 
  Moon, 
  Sun, 
  Bell, 
  User, 
  QrCode, 
  Calendar, 
  Truck, 
  MapPin, 
  Info, 
  Newspaper,
  Menu,
  X
} from 'lucide-react';

interface NavbarProps {
  currentUser: UserAccount | null;
  onOpenLogin: () => void;
  onOpenAdmin: () => void;
  onLogout: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  anomalyCount: number;
  onOpenAnomalyModal: () => void;
  activeSection: string;
  onNavigateSection: (sectionId: string) => void;
  onNavigateToTracking: () => void;
  onNavigateToScanQr: () => void;
  onNavigateToKalender?: () => void;
  currentView: 'home' | 'tracking' | 'scan_qr' | 'kalender_monitoring' | 'admin';
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onOpenLogin,
  onOpenAdmin,
  onLogout,
  darkMode,
  onToggleDarkMode,
  anomalyCount,
  onOpenAnomalyModal,
  activeSection,
  onNavigateSection,
  onNavigateToTracking,
  onNavigateToScanQr,
  onNavigateToKalender,
  currentView
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Bar 3-Zone Contract: Zone 1 (Wordmark) - Zone 2 (Nav Links) - Zone 3 (Action) */}
        <div className="flex items-center justify-between gap-3 sm:gap-6 h-16">
          {/* Zone 1: Wordmark updated to 'Master Data EPML' and 'KPw Bank Indonesia Provinsi Jawa Timur' */}
          <button 
            onClick={() => onNavigateSection('hero')}
            className="flex items-center gap-2.5 text-left shrink-0 group focus:outline-none cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden bg-white flex items-center justify-center shrink-0 shadow-2xs ring-1 ring-slate-200/80 dark:ring-slate-700 group-hover:scale-105 transition-transform">
              <img
                src="/assets/aistudio/Logo_BI_Bulat_27bc9deb.png"
                alt="Logo Bank Indonesia"
                className="w-full h-full object-cover rounded-full scale-[1.22]"
              />
            </div>
            <div>
              <span className="text-sm sm:text-base font-extrabold text-blue-950 dark:text-blue-100 tracking-tight whitespace-nowrap block leading-none">
                MASTER DATA EPML
              </span>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap block mt-0.5 tracking-wide uppercase">
                KPw Bank Indonesia Provinsi Jawa Timur
              </span>
            </div>
          </button>

          {/* Zone 2: Concise & Proportional Navigation Links */}
          {currentView !== 'admin' && (
            <nav className="hidden lg:flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <button
                onClick={onNavigateToTracking}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                  currentView === 'tracking'
                    ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-900 dark:text-blue-300 font-bold border border-blue-200/70 dark:border-blue-800/70 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-blue-900 dark:hover:text-blue-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/80'
                }`}
              >
                <Truck className="w-3.5 h-3.5 text-blue-800 dark:text-blue-400 shrink-0" />
                <span>Update Tracking</span>
              </button>

              {onNavigateToKalender && (
                <button
                  onClick={onNavigateToKalender}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                    currentView === 'kalender_monitoring'
                      ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-900 dark:text-blue-300 font-bold border border-blue-200/70 dark:border-blue-800/70 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-blue-900 dark:hover:text-blue-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/80'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-blue-800 dark:text-blue-400 shrink-0" />
                  <span>Kalender Survei & Monitoring</span>
                </button>
              )}

              <button
                onClick={onNavigateToScanQr}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                  currentView === 'scan_qr'
                    ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-900 dark:text-blue-300 font-bold border border-blue-200/70 dark:border-blue-800/70 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-blue-900 dark:hover:text-blue-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/80'
                }`}
              >
                <QrCode className="w-3.5 h-3.5 text-blue-800 dark:text-blue-400 shrink-0" />
                <span>Scan QR Bantuan</span>
              </button>

              <button
                onClick={() => onNavigateSection('map')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                  currentView === 'home' && activeSection === 'map'
                    ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-900 dark:text-blue-300 font-bold border border-blue-200/70 dark:border-blue-800/70 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-blue-900 dark:hover:text-blue-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/80'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-blue-800 dark:text-blue-400 shrink-0" />
                <span>Peta 3D Jatim</span>
              </button>

              <button
                onClick={() => onNavigateSection('about')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                  currentView === 'home' && activeSection === 'about'
                    ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-900 dark:text-blue-300 font-bold border border-blue-200/70 dark:border-blue-800/70 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-blue-900 dark:hover:text-blue-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/80'
                }`}
              >
                <Info className="w-3.5 h-3.5 text-blue-800 dark:text-blue-400 shrink-0" />
                <span>Tentang EPML</span>
              </button>

              <button
                onClick={() => onNavigateSection('artikel')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                  currentView === 'home' && activeSection === 'artikel'
                    ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-900 dark:text-blue-300 font-bold border border-blue-200/70 dark:border-blue-800/70 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-blue-900 dark:hover:text-blue-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/80'
                }`}
              >
                <Newspaper className="w-3.5 h-3.5 text-blue-800 dark:text-blue-400 shrink-0" />
                <span>Artikel & Berita</span>
              </button>
            </nav>
          )}

          {/* Zone 3: Primary Action & Utilities */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Dark Mode Switcher */}
            <button
              onClick={onToggleDarkMode}
              title={darkMode ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Anomaly Notification Bell */}
            <button
              onClick={onOpenAnomalyModal}
              title={anomalyCount > 0 ? `${anomalyCount} Anomali Distribusi Perlu Tindak Lanjut` : 'Pusat Notifikasi Logistik'}
              className="relative p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {anomalyCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-600 rounded-full animate-ping" />
              )}
              {anomalyCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-600 rounded-full" />
              )}
            </button>

            {/* Admin Access Button - Only displayed on public dashboard, deleted in Admin view */}
            {currentView !== 'admin' && (
              currentUser ? (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    onClick={onOpenAdmin}
                    className="px-3 sm:px-3.5 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 dark:bg-blue-800 dark:hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Portal Admin</span>
                    <span className="sm:hidden">Admin</span>
                  </button>
                  <button
                    onClick={onLogout}
                    title="Keluar Sesi"
                    className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                  >
                    <User className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={onOpenLogin}
                  className="px-3 sm:px-3.5 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 dark:bg-blue-800 dark:hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Akses Masuk Admin</span>
                  <span className="sm:hidden">Masuk</span>
                </button>
              )
            )}

            {/* Mobile / Tablet Hamburger Menu Button (screens < lg) */}
            {currentView !== 'admin' && (
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(prev => !prev)}
                aria-label={isMobileMenuOpen ? 'Tutup Menu' : 'Buka Menu'}
                className="lg:hidden p-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5 text-blue-900 dark:text-blue-400" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Mobile / Smartphone Horizontal Quick-Nav Strip (< lg) */}
        {currentView !== 'admin' && (
          <div className="lg:hidden border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 -mx-4 sm:-mx-6 px-4 sm:px-6">
            <div className="flex items-center gap-2 overflow-x-auto py-2.5 no-scrollbar scroll-smooth">
              <button
                onClick={onNavigateToTracking}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                  currentView === 'tracking'
                    ? 'bg-blue-900 text-white shadow-xs font-bold'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                <Truck className={`w-3.5 h-3.5 shrink-0 ${currentView === 'tracking' ? 'text-white' : 'text-blue-700 dark:text-blue-400'}`} />
                <span>Update Tracking</span>
              </button>

              {onNavigateToKalender && (
                <button
                  onClick={onNavigateToKalender}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                    currentView === 'kalender_monitoring'
                      ? 'bg-blue-900 text-white shadow-xs font-bold'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Calendar className={`w-3.5 h-3.5 shrink-0 ${currentView === 'kalender_monitoring' ? 'text-white' : 'text-blue-700 dark:text-blue-400'}`} />
                  <span>Kalender Survei & Monitoring</span>
                </button>
              )}

              <button
                onClick={onNavigateToScanQr}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                  currentView === 'scan_qr'
                    ? 'bg-blue-900 text-white shadow-xs font-bold'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                <QrCode className={`w-3.5 h-3.5 shrink-0 ${currentView === 'scan_qr' ? 'text-white' : 'text-blue-700 dark:text-blue-400'}`} />
                <span>Scan QR Bantuan</span>
              </button>

              <button
                onClick={() => onNavigateSection('map')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                  currentView === 'home' && activeSection === 'map'
                    ? 'bg-blue-900 text-white shadow-xs font-bold'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                <MapPin className={`w-3.5 h-3.5 shrink-0 ${currentView === 'home' && activeSection === 'map' ? 'text-white' : 'text-blue-700 dark:text-blue-400'}`} />
                <span>Peta 3D Jatim</span>
              </button>

              <button
                onClick={() => onNavigateSection('about')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                  currentView === 'home' && activeSection === 'about'
                    ? 'bg-blue-900 text-white shadow-xs font-bold'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                <Info className={`w-3.5 h-3.5 shrink-0 ${currentView === 'home' && activeSection === 'about' ? 'text-white' : 'text-blue-700 dark:text-blue-400'}`} />
                <span>Tentang EPML</span>
              </button>

              <button
                onClick={() => onNavigateSection('artikel')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                  currentView === 'home' && activeSection === 'artikel'
                    ? 'bg-blue-900 text-white shadow-xs font-bold'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                <Newspaper className={`w-3.5 h-3.5 shrink-0 ${currentView === 'home' && activeSection === 'artikel' ? 'text-white' : 'text-blue-700 dark:text-blue-400'}`} />
                <span>Artikel & Berita</span>
              </button>
            </div>
          </div>
        )}

        {/* Collapsible Navigation Menu Drawer for Phone & Tablet (< lg) */}
        {isMobileMenuOpen && currentView !== 'admin' && (
          <div className="lg:hidden py-3 border-t border-slate-200 dark:border-slate-800 space-y-1 animate-in slide-in-from-top-2 duration-150">
            <button
              onClick={() => {
                onNavigateToTracking();
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'tracking'
                  ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-900 dark:text-blue-300 font-bold border border-blue-200/70 dark:border-blue-800/70'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Truck className="w-4 h-4 text-blue-800 dark:text-blue-400 shrink-0" />
              <span>Update Tracking</span>
            </button>

            {onNavigateToKalender && (
              <button
                onClick={() => {
                  onNavigateToKalender();
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  currentView === 'kalender_monitoring'
                    ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-900 dark:text-blue-300 font-bold border border-blue-200/70 dark:border-blue-800/70'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Calendar className="w-4 h-4 text-blue-800 dark:text-blue-400 shrink-0" />
                <span>Kalender Survei & Monitoring</span>
              </button>
            )}

            <button
              onClick={() => {
                onNavigateToScanQr();
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'scan_qr'
                  ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-900 dark:text-blue-300 font-bold border border-blue-200/70 dark:border-blue-800/70'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <QrCode className="w-4 h-4 text-blue-800 dark:text-blue-400 shrink-0" />
              <span>Scan QR Bantuan</span>
            </button>

            <button
              onClick={() => {
                onNavigateSection('map');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'home' && activeSection === 'map'
                  ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-900 dark:text-blue-300 font-bold border border-blue-200/70 dark:border-blue-800/70'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <MapPin className="w-4 h-4 text-blue-800 dark:text-blue-400 shrink-0" />
              <span>Peta 3D Jatim</span>
            </button>

            <button
              onClick={() => {
                onNavigateSection('about');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'home' && activeSection === 'about'
                  ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-900 dark:text-blue-300 font-bold border border-blue-200/70 dark:border-blue-800/70'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Info className="w-4 h-4 text-blue-800 dark:text-blue-400 shrink-0" />
              <span>Tentang EPML</span>
            </button>

            <button
              onClick={() => {
                onNavigateSection('artikel');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'home' && activeSection === 'artikel'
                  ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-900 dark:text-blue-300 font-bold border border-blue-200/70 dark:border-blue-800/70'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Newspaper className="w-4 h-4 text-blue-800 dark:text-blue-400 shrink-0" />
              <span>Artikel & Berita</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
