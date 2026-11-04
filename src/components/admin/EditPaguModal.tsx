/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Coins, X, Check, ArrowUpRight, RotateCcw, AlertCircle, Building2, TrendingUp } from 'lucide-react';

interface EditPaguModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPagu: number;
  totalRealisasi: number;
  onSavePagu: (newPagu: number, catatan?: string) => void;
}

export const EditPaguModal: React.FC<EditPaguModalProps> = ({
  isOpen,
  onClose,
  currentPagu,
  totalRealisasi,
  onSavePagu
}) => {
  const [paguInput, setPaguInput] = useState<string>(String(currentPagu));
  const [catatan, setCatatan] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const numericPagu = Math.max(0, parseInt(paguInput.replace(/\D/g, ''), 10) || 0);
  const sisaAnggaran = Math.max(0, numericPagu - totalRealisasi);
  const persentaseSerapan = numericPagu > 0 ? ((totalRealisasi / numericPagu) * 100).toFixed(1) : '0';
  const isPaguDeficit = numericPagu < totalRealisasi;

  const handleQuickAdd = (amount: number) => {
    const next = numericPagu + amount;
    setPaguInput(String(next));
    setErrorMsg('');
  };

  const handleResetDefault = () => {
    setPaguInput('0');
    setErrorMsg('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    setPaguInput(raw);
    setErrorMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (numericPagu < 0) {
      setErrorMsg('Nominal pagu alokasi tahunan tidak boleh bernilai negatif.');
      return;
    }
    if (numericPagu < totalRealisasi) {
      setErrorMsg(
        `Nominal pagu (Rp ${numericPagu.toLocaleString('id-ID')}) tidak boleh lebih kecil dari realisasi yang sudah berjalan (Rp ${totalRealisasi.toLocaleString('id-ID')}).`
      );
      return;
    }

    onSavePagu(numericPagu, catatan.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center shadow-xs">
              <Coins className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Sesuaikan Total Pagu Alokasi EPML Jatim
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Batas maksimal anggaran tahunan 13 Wilayah Kerja KPw Bank Indonesia Prov. Jatim
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Main Input Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Total Pagu Alokasi Tahunan (Rp) *
              </label>
              <span className="text-[11px] font-semibold text-blue-900 dark:text-blue-400">
                Pagu Saat Ini: Rp {(currentPagu / 1e9).toFixed(2)} Milyar
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                Rp
              </span>
              <input
                type="text"
                required
                value={numericPagu > 0 ? numericPagu.toLocaleString('id-ID') : ''}
                onChange={handleInputChange}
                placeholder="0"
                className="w-full pl-12 pr-4 py-2.5 text-base font-bold font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600 tabular-nums shadow-xs"
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
              Terbaca:{' '}
              <strong className="text-slate-800 dark:text-slate-200 font-semibold">
                Rp {(numericPagu / 1e9).toFixed(2)} Milyar
              </strong>{' '}
              ({numericPagu.toLocaleString('id-ID')} Rupiah)
            </p>
          </div>

          {/* Quick Increment Preset Pills */}
          <div>
            <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Penambahan Anggaran Instan (+ Pagu)
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleQuickAdd(500000000)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-700 dark:text-slate-300 hover:text-blue-900 dark:hover:text-blue-300 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                <span>+500 Juta</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickAdd(1000000000)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-700 dark:text-slate-300 hover:text-blue-900 dark:hover:text-blue-300 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                <span>+1 Milyar</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickAdd(2500000000)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-700 dark:text-slate-300 hover:text-blue-900 dark:hover:text-blue-300 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                <span>+2.5 Milyar</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickAdd(5000000000)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-700 dark:text-slate-300 hover:text-blue-900 dark:hover:text-blue-300 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                <span>+5 Milyar</span>
              </button>
              <button
                type="button"
                onClick={handleResetDefault}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 ml-auto cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Pagu (Rp 0)</span>
              </button>
            </div>
          </div>

          {/* Impact Simulation Box */}
          <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 space-y-2.5">
            <span className="text-[11px] font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider block">
              Simulasi Penyerapan Anggaran Terkini
            </span>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/40">
                <span className="text-[10px] text-slate-500 block">Realisasi Berjalan</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                  Rp {(totalRealisasi / 1e9).toFixed(2)} M
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/40">
                <span className="text-[10px] text-slate-500 block">Sisa Anggaran Baru</span>
                <span className={`font-bold font-mono ${isPaguDeficit ? 'text-red-600' : 'text-emerald-700 dark:text-emerald-400'}`}>
                  Rp {(sisaAnggaran / 1e9).toFixed(2)} M
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/40">
                <span className="text-[10px] text-slate-500 block">Tingkat Serapan</span>
                <span className="font-bold text-blue-900 dark:text-blue-400 font-mono">
                  {persentaseSerapan}%
                </span>
              </div>
            </div>
          </div>

          {/* Alasan / Catatan Penambahan Anggaran */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              Dasar Perubahan / Catatan Penambahan Anggaran (Opsional)
            </label>
            <input
              type="text"
              value={catatan}
              onChange={e => setCatatan(e.target.value)}
              placeholder="Contoh: Penyesuaian Anggaran Perubahan Semester II Program EPML BI Jatim 2026"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-900 hover:bg-blue-800 text-white flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Simpan & Terapkan Perubahan Pagu</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
