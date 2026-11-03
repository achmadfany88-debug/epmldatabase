/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AnomaliDistribusi, BantuanItem } from '../../types';
import { 
  X, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  MapPin, 
  ArrowRight, 
  ShieldAlert 
} from 'lucide-react';

interface AnomaliModalProps {
  isOpen: boolean;
  onClose: () => void;
  anomalies: AnomaliDistribusi[];
  onSelectBantuan: (id: string) => void;
}

export const AnomaliModal: React.FC<AnomaliModalProps> = ({
  isOpen,
  onClose,
  anomalies,
  onSelectBantuan
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Pusat Notifikasi Anomali Distribusi</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400">
                  {anomalies.length}
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Peringatan dini keterlambatan tahap, kerusakan fisik lapangan, dan integritas dokumen
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="space-y-3 overflow-y-auto flex-1 pr-1">
          {anomalies.map(anom => (
            <div
              key={anom.id}
              className="p-4 rounded-xl border border-red-200/80 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20 text-xs space-y-2 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-red-800 dark:text-red-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{anom.tipeAnomali}</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  Terdeteksi: {anom.tanggalTerdeteksi}
                </span>
              </div>

              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {anom.namaPenerima}
                </p>
                <div className="flex items-center gap-1 text-slate-500 text-[11px] mt-0.5">
                  <MapPin className="w-3 h-3 text-red-600" />
                  <span>{anom.kabupatenKota}</span>
                  <span aria-hidden="true">&middot;</span>
                  <span className="font-mono text-blue-900 dark:text-blue-300 font-semibold">{anom.bantuanId}</span>
                </div>
              </div>

              <p className="text-slate-700 dark:text-slate-300 leading-relaxed bg-white/70 dark:bg-slate-900/70 p-2.5 rounded-lg border border-red-100 dark:border-red-900/40">
                {anom.deskripsi}
              </p>

              <div className="flex items-center justify-between pt-1">
                <span className={`text-[11px] font-semibold ${
                  anom.derajatUrgensi === 'Tinggi' ? 'text-red-700 dark:text-red-400 font-bold' : 'text-amber-700 dark:text-amber-400'
                }`}>
                  Tingkat Urgensi: {anom.derajatUrgensi}
                </span>

                <button
                  onClick={() => {
                    onClose();
                    onSelectBantuan(anom.bantuanId);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-red-800 hover:bg-red-700 text-white font-semibold text-xs flex items-center gap-1 transition-colors shadow-xs"
                >
                  <span>Buka & Tindak Lanjut</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {anomalies.length === 0 && (
            <div className="py-12 text-center text-slate-500">
              <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Distribusi Berjalan Normal</h4>
              <p className="text-xs text-slate-400 mt-1">
                Tidak ada kejanggalan atau laporan kerusakan fisik yang terdeteksi pada sistem saat ini.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
