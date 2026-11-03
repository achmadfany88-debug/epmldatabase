/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BantuanItem } from '../../types';
import { X, Send, MessageSquare, CheckCircle2, Copy } from 'lucide-react';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  bantuan: BantuanItem | null;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  bantuan
}) => {
  const [copied, setCopied] = useState(false);
  const [sentNotice, setSentNotice] = useState(false);

  if (!isOpen || !bantuan) return null;

  // Format phone number to international WhatsApp format: 08123... -> 628123...
  const rawPhone = bantuan.noHp.replace(/\D/g, '');
  const waPhone = rawPhone.startsWith('0') ? '62' + rawPhone.slice(1) : rawPhone;

  // Generate official Bank Indonesia message
  const templateMessage = `*KANTOR PERWAKILAN BANK INDONESIA PROVINSI JAWA TIMUR*
_Pemberitahuan Resmi Penyaluran Program Sosial Bank Indonesia (EPML)_

Yth. Pengurus/Pimpinan:
*${bantuan.namaPenerima}*
${bantuan.alamat}, ${bantuan.kabupatenKota}

Kami informasikan pembaruan status penyaluran bantuan EPML:
• *No. Registrasi:* ${bantuan.id}
• *Pilar Program:* ${bantuan.kategoriBantuan}
• *Bentuk & Detail Bantuan:* ${bantuan.bentukBantuan === 'Barang' ? bantuan.jenisBarang : 'Layanan Jasa'} (${bantuan.detailBantuan})
• *Vendor Penyedia:* ${bantuan.vendorPenyedia}
• *Tahap Progres Saat Ini:* *${bantuan.statusTahap.toUpperCase()}*
• *Kondisi Fisik Lapangan:* ${bantuan.statusKondisiFisik}
• *Tanggal Penyaluran:* ${bantuan.tanggalPenyaluran}
${bantuan.tanggalJadwalMonitoring ? `• *Jadwal Monitoring Evaluasi:* ${bantuan.tanggalJadwalMonitoring}` : ''}

Mohon pastikan verifikasi fisik barang dan penandatanganan Berita Acara Serah Terima (BAST) bersama PIC Asesmen Lapangan kami (${bantuan.picAsesmen}).

Salam hormat,
*Tim Pengelolaan Program Sosial EPML*
*Bank Indonesia Kantor Perwakilan Jawa Timur*
Jl. Pahlawan No.105, Surabaya`;

  const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(templateMessage)}`;

  const handleCopyText = () => {
    navigator.clipboard.writeText(templateMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulateDispatch = () => {
    setSentNotice(true);
    setTimeout(() => {
      setSentNotice(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Kirim Notifikasi WhatsApp Resmi Penerima
              </h3>
              <p className="text-[11px] text-slate-500">
                Pemberitahuan otomatis perubahan tahap bantuan EPML
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {sentNotice && (
          <div className="mb-3 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-xs text-emerald-800 dark:text-emerald-300 rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Notifikasi WhatsApp berhasil dikirim ke nomor {bantuan.noHp}!</span>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-slate-500">Nomor WhatsApp Tujuan:</span>
              <p className="font-mono font-bold text-slate-900 dark:text-slate-100">
                {bantuan.noHp} ({bantuan.namaPenerima})
              </p>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
              WhatsApp Aktif
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Pratinjau Pesan Terformat:
              </label>
              <button
                type="button"
                onClick={handleCopyText}
                className="text-[11px] text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                <span>{copied ? 'Tersalin!' : 'Salin Teks'}</span>
              </button>
            </div>
            <textarea
              readOnly
              rows={8}
              value={templateMessage}
              className="w-full p-3 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 leading-relaxed resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              onClick={handleSimulateDispatch}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Simulasikan Terkirim
            </button>
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Buka WhatsApp Sekarang &rarr;</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
