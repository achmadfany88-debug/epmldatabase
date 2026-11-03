/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { UserAccount } from '../types';
import { ShieldCheck, Moon, Sun, Bell, User, QrCode } from 'lucide-react';

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
  currentView: 'home' | 'tracking' | 'scan_qr' | 'admin';
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
  currentView
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Bar 3-Zone Contract: Zone 1 (Wordmark) - Zone 2 (5 Nav Links) - Zone 3 (Action) */}
        <div className="flex items-center justify-between gap-6 h-16">
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

          {/* Zone 2: Concise Navigation Links - Only displayed on public landing / tracking / scan_qr sub-page */}
          {currentView !== 'admin' && (
            <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <button
                onClick={onNavigateToTracking}
                className={`hover:text-blue-900 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0 py-1 cursor-pointer ${
                  currentView === 'tracking'
                    ? 'text-blue-900 dark:text-blue-400 font-bold border-b-2 border-blue-900 dark:border-blue-400'
                    : ''
                }`}
              >
                Update Tracking (Sub Laman)
              </button>
              <button
                onClick={onNavigateToScanQr}
                className={`inline-flex items-center gap-1.5 hover:text-blue-900 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0 py-1 cursor-pointer ${
                  currentView === 'scan_qr'
                    ? 'text-blue-900 dark:text-blue-400 font-bold border-b-2 border-blue-900 dark:border-blue-400'
                    : ''
                }`}
              >
                <QrCode className="w-3.5 h-3.5 text-blue-900 dark:text-blue-400" />
                <span>Scan QR Bantuan</span>
              </button>
              <button
                onClick={() => onNavigateSection('map')}
                className={`hover:text-blue-900 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0 py-1 cursor-pointer ${
                  currentView === 'home' && activeSection === 'map'
                    ? 'text-blue-900 dark:text-blue-400 font-bold border-b-2 border-blue-900 dark:border-blue-400'
                    : ''
                }`}
              >
                Peta 3D Jatim
              </button>
              <button
                onClick={() => onNavigateSection('about')}
                className={`hover:text-blue-900 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0 py-1 cursor-pointer ${
                  currentView === 'home' && activeSection === 'about'
                    ? 'text-blue-900 dark:text-blue-400 font-bold border-b-2 border-blue-900 dark:border-blue-400'
                    : ''
                }`}
              >
                About EPML ?
              </button>
              <button
                onClick={() => onNavigateSection('artikel')}
                className={`hover:text-blue-900 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0 py-1 cursor-pointer ${
                  currentView === 'home' && activeSection === 'artikel'
                    ? 'text-blue-900 dark:text-blue-400 font-bold border-b-2 border-blue-900 dark:border-blue-400'
                    : ''
                }`}
              >
                Artikel & Berita
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={onOpenAdmin}
                    className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 dark:bg-blue-800 dark:hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Portal Admin</span>
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
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 dark:bg-blue-800 dark:hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Akses Masuk Admin</span>
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
