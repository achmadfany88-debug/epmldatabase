/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  BantuanItem,
  StatusKondisiFisik,
  KondisiItemBarang,
  KondisiUnitSatuan
} from '../../types';
import { StorageService } from '../../services/storageService';
import {
  X,
  QrCode,
  CheckCircle2,
  Camera,
  Upload,
  AlertTriangle,
  Send,
  MapPin,
  Package,
  Truck,
  Calendar,
  Layers,
  ZoomIn,
  Check,
  RotateCcw,
  SlidersHorizontal,
  Edit3,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { ImageLightboxModal } from '../common/ImageLightboxModal';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  bantuanList: BantuanItem[];
  initialBantuanId?: string;
  onUpdateKondisiFisik: (
    id: string,
    kondisi: StatusKondisiFisik,
    catatan: string,
    fotoUrl?: string,
    kondisiPerItem?: KondisiItemBarang[]
  ) => void;
  onOpenWhatsApp: (item: BantuanItem) => void;
  actorName: string;
}

type QrUpdateScopeMode = 'SAME_ITEM_ALL_UNITS' | 'EDIT_SEKALIGUS_ALL' | 'UPDATE_SATUAN_UNIT';

const KONDISI_OPTIONS: StatusKondisiFisik[] = [
  'Baik & Lengkap',
  'Perlu Perbaikan Ringan',
  'Rusak Ringan',
  'Rusak Berat',
  'Kurang Jumlah',
  'Belum Diterima / Tahap Asesmen'
];

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  bantuanList,
  initialBantuanId,
  onUpdateKondisiFisik,
  onOpenWhatsApp,
  actorName
}) => {
  const [manualQrInput, setManualQrInput] = useState('');
  const [selectedBantuanId, setSelectedBantuanId] = useState('');
  const [scannedItem, setScannedItem] = useState<BantuanItem | null>(null);
  const [activeGlobalUnitIndex, setActiveGlobalUnitIndex] = useState<number>(1);
  const [activeQrDataUrl, setActiveQrDataUrl] = useState<string>('');

  // 3 Integrated Update Modes on the same QR:
  // 1. SAME_ITEM_ALL_UNITS: Cukup scan 1 QR dari jenis item yang sama -> update semua unit untuk nama item tersebut
  // 2. EDIT_SEKALIGUS_ALL: Edit sekaligus semua jenis barang & seluruh unit pada penerima
  // 3. UPDATE_SATUAN_UNIT: Update satuan per unit (Unit #1, #2, dst.) jika ada unit tertentu yang sedikit eror
  const [updateMode, setUpdateMode] = useState<QrUpdateScopeMode>('SAME_ITEM_ALL_UNITS');

  // State for hydrated catalog items & their per-unit rincianUnit
  const [itemConditions, setItemConditions] = useState<KondisiItemBarang[]>([]);

  // Quick form states for SAME_ITEM_ALL_UNITS & EDIT_SEKALIGUS_ALL
  const [sameItemKondisi, setSameItemKondisi] = useState<StatusKondisiFisik>('Baik & Lengkap');
  const [sameItemCatatan, setSameItemCatatan] = useState<string>('');

  const [kondisiFisikGlobal, setKondisiFisikGlobal] =
    useState<StatusKondisiFisik>('Baik & Lengkap');
  const [catatanGlobal, setCatatanGlobal] = useState('');
  const [fotoBukti, setFotoBukti] = useState<string>('');

  const [isSuccessFeedback, setIsSuccessFeedback] = useState(false);
  const [successSummaryText, setSuccessSummaryText] = useState('');
  const [simulatedScanning, setSimulatedScanning] = useState(false);

  // Lightbox for enlarging photo
  const [lightboxState, setLightboxState] = useState<{
    isOpen: boolean;
    url: string;
    caption: string;
  }>({
    isOpen: false,
    url: '',
    caption: ''
  });

  // Resolve scanned QR code or Bantuan ID (supports e.g. "EPML-JTM-2025-004-U02" or "EPML-JTM-2025-004")
  const handleResolveQrInput = (rawCodeOrId: string) => {
    const resolved = StorageService.resolveScannedQrCode(rawCodeOrId, bantuanList);
    if (!resolved) return;

    const { bantuan, catalogItems, globalUnitIndex, matchedItem } = resolved;
    setSelectedBantuanId(bantuan.id);
    setScannedItem(bantuan);
    setActiveGlobalUnitIndex(globalUnitIndex);
    setItemConditions(catalogItems);

    const normalizedItemKondisi: StatusKondisiFisik =
      matchedItem.kondisi === 'Baik'
        ? 'Baik & Lengkap'
        : matchedItem.kondisi === 'Rusak'
        ? 'Rusak Berat'
        : (matchedItem.kondisi as StatusKondisiFisik);

    setSameItemKondisi(normalizedItemKondisi);
    setSameItemCatatan(matchedItem.catatan || bantuan.catatanKondisiFisik || '');
    setKondisiFisikGlobal(bantuan.statusKondisiFisik);
    setCatatanGlobal(bantuan.catatanKondisiFisik || '');
    setFotoBukti(bantuan.buktiSerahTerimaBastUrl || '');

    // Smart default mode: if matched item has > 1 unit, default to SAME_ITEM_ALL_UNITS so scanning 1 QR can update all units of that same item name!
    if ((matchedItem.qty || 1) > 1) {
      setUpdateMode('SAME_ITEM_ALL_UNITS');
    } else if (catalogItems.length > 1) {
      setUpdateMode('EDIT_SEKALIGUS_ALL');
    } else {
      setUpdateMode('SAME_ITEM_ALL_UNITS');
    }
  };

  useEffect(() => {
    if (isOpen && initialBantuanId) {
      handleResolveQrInput(initialBantuanId);
    } else if (!isOpen) {
      setScannedItem(null);
      setSelectedBantuanId('');
      setManualQrInput('');
    }
  }, [isOpen, initialBantuanId, bantuanList]);

  // Total physical units for current recipient
  const totalRecipientUnits = useMemo(() => {
    if (!scannedItem) return 1;
    const sum = itemConditions.reduce(
      (acc, it) => acc + Math.max(1, Number(it.qty) || 1),
      0
    );
    return sum > 0 ? sum : StorageService.getTotalUnitsCount(scannedItem);
  }, [scannedItem, itemConditions]);

  // Determine which catalog item and which unit corresponds to activeGlobalUnitIndex
  const activeUnitContext = useMemo(() => {
    if (!scannedItem || itemConditions.length === 0) return null;

    for (let i = 0; i < itemConditions.length; i++) {
      const catItem = itemConditions[i];
      const units = catItem.rincianUnit || [];
      const foundU = units.find(u => u.globalUnitIndex === activeGlobalUnitIndex);
      if (foundU) {
        return {
          itemIndex: i,
          catalogItem: catItem,
          unitSatuan: foundU
        };
      }
    }

    const fallbackItem = itemConditions[0];
    const fallbackUnit: KondisiUnitSatuan = fallbackItem.rincianUnit?.[0] || {
      unitId: `${scannedItem.id}-ITM-1-U1`,
      unitNumber: 1,
      globalUnitIndex: 1,
      kodeQrUnit: `${scannedItem.id}-U01`,
      namaUnit: `${fallbackItem.namaBarang} — Unit #1`,
      kondisi:
        fallbackItem.kondisi === 'Baik'
          ? 'Baik & Lengkap'
          : fallbackItem.kondisi === 'Rusak'
          ? 'Rusak Berat'
          : (fallbackItem.kondisi as StatusKondisiFisik),
      catatan: fallbackItem.catatan || ''
    };

    return {
      itemIndex: 0,
      catalogItem: fallbackItem,
      unitSatuan: fallbackUnit
    };
  }, [scannedItem, itemConditions, activeGlobalUnitIndex]);

  // Sync sameItemKondisi when switching active unit to another item type
  useEffect(() => {
    if (activeUnitContext) {
      const k = activeUnitContext.catalogItem.kondisi;
      setSameItemKondisi(
        k === 'Baik'
          ? 'Baik & Lengkap'
          : k === 'Rusak'
          ? 'Rusak Berat'
          : (k as StatusKondisiFisik)
      );
      setSameItemCatatan(
        activeUnitContext.catalogItem.catatan || scannedItem?.catatanKondisiFisik || ''
      );
    }
  }, [activeUnitContext?.catalogItem.itemId]);

  // Generate unique QR image for the currently selected unit
  useEffect(() => {
    let active = true;
    if (scannedItem) {
      StorageService.generateUnitQrCodeDataUrl(
        scannedItem,
        activeGlobalUnitIndex,
        totalRecipientUnits
      ).then(url => {
        if (active) setActiveQrDataUrl(url);
      });
    }
    return () => {
      active = false;
    };
  }, [scannedItem, activeGlobalUnitIndex, totalRecipientUnits]);

  if (!isOpen) return null;

  const handleSimulateCameraScan = (codeToScan: string) => {
    setSimulatedScanning(true);
    setTimeout(() => {
      setSimulatedScanning(false);
      handleResolveQrInput(codeToScan);
    }, 500);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setFotoBukti(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Helper: derive parent item condition from its units
  const deriveItemConditionFromUnits = (units: KondisiUnitSatuan[]): StatusKondisiFisik => {
    if (!units || units.length === 0) return 'Baik & Lengkap';
    if (units.every(u => u.kondisi === 'Baik & Lengkap')) return 'Baik & Lengkap';
    if (units.every(u => u.kondisi === 'Belum Diterima / Tahap Asesmen'))
      return 'Belum Diterima / Tahap Asesmen';
    if (units.some(u => u.kondisi === 'Rusak Berat')) return 'Rusak Berat';
    if (units.some(u => u.kondisi === 'Kurang Jumlah')) return 'Kurang Jumlah';
    if (units.some(u => u.kondisi === 'Rusak Ringan')) return 'Rusak Ringan';
    if (units.some(u => u.kondisi === 'Perlu Perbaikan Ringan')) return 'Perlu Perbaikan Ringan';
    return units[0].kondisi;
  };

  // Helper: update a single unit inside an item (Mode 3: Update Satuan)
  const handleSingleUnitChange = (
    itemIndex: number,
    unitNumber: number,
    field: 'kondisi' | 'catatan',
    value: string
  ) => {
    const nowDate = new Date().toISOString().slice(0, 10);
    setItemConditions(prev => {
      const next = [...prev];
      const targetItem = { ...next[itemIndex] };
      const units = (targetItem.rincianUnit || []).map(u =>
        u.unitNumber === unitNumber
          ? {
              ...u,
              [field]: value,
              updatedAt: nowDate,
              updatedBy: actorName
            }
          : u
      );
      targetItem.rincianUnit = units;
      targetItem.kondisi = deriveItemConditionFromUnits(units);

      // Build concise summary note for the item based on unit breakdown
      const counts: Record<string, number> = {};
      units.forEach(u => {
        counts[u.kondisi] = (counts[u.kondisi] || 0) + 1;
      });
      const keys = Object.keys(counts);
      if (keys.length > 1) {
        targetItem.catatan = `Rincian ${units.length} ${targetItem.satuan}: ${keys
          .map(k => `${counts[k]} ${k}`)
          .join(', ')}.`;
      } else if (field === 'catatan') {
        targetItem.catatan = value;
      }

      targetItem.updatedAt = nowDate;
      targetItem.updatedBy = actorName;
      next[itemIndex] = targetItem;
      return next;
    });
  };

  // Helper: update an entire item row in Mode 2 (Edit Sekaligus)
  const handleBulkItemChange = (
    itemIndex: number,
    field: 'kondisi' | 'catatan',
    value: string
  ) => {
    const nowDate = new Date().toISOString().slice(0, 10);
    setItemConditions(prev => {
      const next = [...prev];
      const target = { ...next[itemIndex] };
      if (field === 'kondisi') {
        const k = value as StatusKondisiFisik;
        target.kondisi = k;
        target.rincianUnit = (target.rincianUnit || []).map(u => ({
          ...u,
          kondisi: k,
          updatedAt: nowDate,
          updatedBy: actorName
        }));
      } else {
        target.catatan = value;
        target.rincianUnit = (target.rincianUnit || []).map(u => ({
          ...u,
          catatan: value
        }));
      }
      target.updatedAt = nowDate;
      target.updatedBy = actorName;
      next[itemIndex] = target;
      return next;
    });
  };

  // Helper: Set ALL items and ALL units in recipient to a single condition (Mode 2 Quick Action)
  const handleSetAllRecipientItemsKondisi = (kondisi: StatusKondisiFisik) => {
    const nowDate = new Date().toISOString().slice(0, 10);
    setKondisiFisikGlobal(kondisi);
    setItemConditions(prev =>
      prev.map(it => ({
        ...it,
        kondisi,
        updatedAt: nowDate,
        updatedBy: actorName,
        rincianUnit: (it.rincianUnit || []).map(u => ({
          ...u,
          kondisi,
          updatedAt: nowDate,
          updatedBy: actorName
        }))
      }))
    );
  };

  // Submit handler that processes according to the active mode
  const handleSubmitUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedItem || !activeUnitContext) return;

    const nowDate = new Date().toISOString().slice(0, 10);
    let finalItems: KondisiItemBarang[] = [...itemConditions];
    let summaryToast = '';

    if (updateMode === 'SAME_ITEM_ALL_UNITS') {
      // Cukup scan 1 QR yang nama itemnya sama -> langsung update semua unit untuk nama item yang sama!
      const targetName = activeUnitContext.catalogItem.namaBarang.trim().toLowerCase();
      let updatedUnitCount = 0;

      finalItems = itemConditions.map(it => {
        if (
          it.itemId === activeUnitContext.catalogItem.itemId ||
          it.namaBarang.trim().toLowerCase() === targetName
        ) {
          const units = (it.rincianUnit || []).map(u => ({
            ...u,
            kondisi: sameItemKondisi,
            catatan:
              sameItemCatatan.trim() ||
              u.catatan ||
              `Seluruh ${it.qty} ${it.satuan} ${it.namaBarang} terverifikasi ${sameItemKondisi}.`,
            updatedAt: nowDate,
            updatedBy: actorName
          }));
          updatedUnitCount += units.length || it.qty;
          return {
            ...it,
            kondisi: sameItemKondisi,
            catatan:
              sameItemCatatan.trim() ||
              `Seluruh ${it.qty} ${it.satuan} ${it.namaBarang} terverifikasi ${sameItemKondisi} melalui scan QR ${activeUnitContext.unitSatuan.kodeQrUnit}.`,
            updatedAt: nowDate,
            updatedBy: actorName,
            rincianUnit: units
          };
        }
        return it;
      });

      summaryToast = `Berhasil! Seluruh ${updatedUnitCount} ${activeUnitContext.catalogItem.satuan} "${activeUnitContext.catalogItem.namaBarang}" langsung terupdate (${sameItemKondisi}) cukup dengan scan 1 QR (${activeUnitContext.unitSatuan.kodeQrUnit}).`;
    } else if (updateMode === 'EDIT_SEKALIGUS_ALL') {
      summaryToast = `Berhasil! Edit Sekaligus seluruh ${finalItems.length} jenis barang (${totalRecipientUnits} Unit) pada ${scannedItem.namaPenerima} telah disimpan.`;
    } else {
      summaryToast = `Berhasil! Update Satuan per Unit untuk "${activeUnitContext.catalogItem.namaBarang}" telah disimpan ke Hasil Tracking & Monitoring.`;
    }

    // Derive overall recipient condition from finalItems
    let overallKondisi: StatusKondisiFisik = 'Baik & Lengkap';
    if (finalItems.some(i => i.kondisi === 'Rusak Berat' || i.kondisi === 'Rusak')) {
      overallKondisi = 'Rusak Berat';
    } else if (finalItems.some(i => i.kondisi === 'Kurang Jumlah')) {
      overallKondisi = 'Kurang Jumlah';
    } else if (
      finalItems.some(
        i => i.kondisi === 'Perlu Perbaikan Ringan' || i.kondisi === 'Rusak Ringan'
      )
    ) {
      overallKondisi = 'Perlu Perbaikan Ringan';
    } else if (finalItems.every(i => i.kondisi === 'Belum Diterima / Tahap Asesmen')) {
      overallKondisi = 'Belum Diterima / Tahap Asesmen';
    }

    const autoGlobalNote =
      catatanGlobal.trim() ||
      finalItems
        .map(i => `${i.namaBarang} (${i.qty} ${i.satuan}): ${i.kondisi}`)
        .join(' | ');

    onUpdateKondisiFisik(
      scannedItem.id,
      overallKondisi,
      autoGlobalNote,
      fotoBukti,
      finalItems
    );

    setSuccessSummaryText(summaryToast);
    setIsSuccessFeedback(true);
    setTimeout(() => {
      setIsSuccessFeedback(false);
      onClose();
    }, 1500);
  };

  // Collect documentation photos from scanned item
  const allPhotos: { label: string; url: string }[] = [];
  if (scannedItem) {
    if (scannedItem.fotoPenerimaList && scannedItem.fotoPenerimaList.length > 0) {
      scannedItem.fotoPenerimaList.forEach((url, i) =>
        allPhotos.push({ label: `Foto Penerima #${i + 1}`, url })
      );
    } else if (scannedItem.fotoPenerimaUrl) {
      allPhotos.push({ label: 'Foto Penerima', url: scannedItem.fotoPenerimaUrl });
    }

    if (
      scannedItem.buktiPenyaluranVendorList &&
      scannedItem.buktiPenyaluranVendorList.length > 0
    ) {
      scannedItem.buktiPenyaluranVendorList.forEach((url, i) =>
        allPhotos.push({ label: `Bukti Vendor #${i + 1}`, url })
      );
    } else if (scannedItem.buktiPenyaluranVendorUrl) {
      allPhotos.push({
        label: 'Bukti Penyaluran Vendor',
        url: scannedItem.buktiPenyaluranVendorUrl
      });
    }

    if (
      scannedItem.buktiSerahTerimaBastList &&
      scannedItem.buktiSerahTerimaBastList.length > 0
    ) {
      scannedItem.buktiSerahTerimaBastList.forEach((url, i) =>
        allPhotos.push({ label: `BAST #${i + 1}`, url })
      );
    } else if (scannedItem.buktiSerahTerimaBastUrl) {
      allPhotos.push({
        label: 'BAST Serah Terima',
        url: scannedItem.buktiSerahTerimaBastUrl
      });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-900 text-white flex items-center justify-center shadow-xs">
              <QrCode className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                Scan QR Unit Barang &amp; Sinkronisasi Monitoring Bantuan
              </h3>
              <p className="text-[11px] text-slate-500">
                Terhubung langsung dengan fitur <strong>Update Item Sama</strong>,{' '}
                <strong>Edit Sekaligus</strong>, dan <strong>Update Satuan</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success toast */}
        {isSuccessFeedback && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successSummaryText}</span>
          </div>
        )}

        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {!scannedItem ? (
            <div className="space-y-4">
              {/* Camera Viewport Simulation */}
              <div className="relative h-44 w-full rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex flex-col items-center justify-center text-center p-4">
                <div className="w-28 h-28 border-2 border-dashed border-blue-400 rounded-xl flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-blue-500/10 animate-pulse" />
                  <Camera className="w-8 h-8 text-blue-400" />
                </div>
                <p className="text-xs text-slate-300 mt-2.5 font-medium">
                  {simulatedScanning
                    ? 'Memproses pemindaian Kode QR Unit Barang...'
                    : 'Arahkan kamera ke stiker QR Unit Barang (contoh: EPML-JTM-2025-004-U01)'}
                </p>
              </div>

              {/* Manual QR Code / Unit Code Input */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-8">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Masukkan Kode QR Unit Barang (Spesifik Unit / ID Bantuan):
                  </label>
                  <input
                    type="text"
                    value={manualQrInput}
                    onChange={e => setManualQrInput(e.target.value)}
                    placeholder="Contoh: EPML-JTM-2025-004-U01 atau EPML-JTM-2025-001-U05"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
                <div className="sm:col-span-4 flex items-end">
                  <button
                    type="button"
                    onClick={() => handleResolveQrInput(manualQrInput)}
                    disabled={!manualQrInput.trim()}
                    className="w-full py-2 px-3 rounded-xl bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition-colors"
                  >
                    Buka Kode QR Unit
                  </button>
                </div>
              </div>

              {/* Dropdown Select Recipient */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Atau Pilih dari Daftar Penerima Bantuan:
                </label>
                <select
                  value={selectedBantuanId}
                  onChange={e => handleResolveQrInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                >
                  <option value="">-- Pilih Paket Bantuan --</option>
                  {bantuanList.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.id} - {b.namaPenerima} ({b.kabupatenKota}) [{StorageService.getTotalUnitsCount(b)} Unit QR]
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick click demo chips with Unit QR codes */}
              <div className="pt-1">
                <span className="text-[11px] text-slate-400 block mb-1.5 font-semibold">
                  Simulasi Scan Cepat Stiker QR Unit Barang:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {bantuanList.slice(0, 4).map(b => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleSimulateCameraScan(`${b.id}-U01`)}
                      className="px-2.5 py-1.5 text-[11px] font-mono bg-slate-100 dark:bg-slate-800 hover:bg-blue-100 hover:text-blue-900 dark:hover:bg-blue-950 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                    >
                      Scan {b.id}-U01 ({b.namaPenerima.split(' ').slice(0, 2).join(' ')})
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitUpdate} className="space-y-4">
              {/* ================================================================= */}
              {/* 1. BANNER IDENTITAS QR UNIT SPESIFIK YANG DISCAN & SWITCHER UNIT  */}
              {/* ================================================================= */}
              {activeUnitContext && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-[#002B66] to-[#003B8E] text-white shadow-sm space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-16 h-16 rounded-xl bg-white p-1 shrink-0 flex items-center justify-center shadow-xs">
                        {activeQrDataUrl ? (
                          <img
                            src={activeQrDataUrl}
                            alt="QR Unit"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <QrCode className="w-8 h-8 text-[#002B66]" />
                        )}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-mono text-[11px] font-black">
                            QR UNIT: {activeUnitContext.unitSatuan.kodeQrUnit}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-[10px] font-bold">
                            Unit #{activeUnitContext.unitSatuan.unitNumber} dari{' '}
                            {activeUnitContext.catalogItem.qty}{' '}
                            {activeUnitContext.catalogItem.satuan}
                          </span>
                        </div>
                        <h4 className="text-sm sm:text-base font-extrabold text-white truncate">
                          {activeUnitContext.catalogItem.namaBarang}
                        </h4>
                        <p className="text-[11px] text-blue-100 truncate">
                          Penerima: <strong>{scannedItem.namaPenerima}</strong> (
                          {scannedItem.kabupatenKota})
                        </p>
                      </div>
                    </div>

                    {/* Unit QR Switcher (Simulasi Scan QR Unit Lain pada Penerima Ini) */}
                    {totalRecipientUnits > 1 && (
                      <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5 border border-white/15 shrink-0 flex flex-col items-end gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
                          Pilih / Pindah QR Unit ({activeGlobalUnitIndex}/{totalRecipientUnits}):
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveGlobalUnitIndex(prev => Math.max(1, prev - 1))
                            }
                            disabled={activeGlobalUnitIndex <= 1}
                            className="p-1 rounded-lg bg-white/15 hover:bg-white/25 disabled:opacity-40 text-white cursor-pointer"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <select
                            value={activeGlobalUnitIndex}
                            onChange={e =>
                              setActiveGlobalUnitIndex(parseInt(e.target.value, 10) || 1)
                            }
                            className="px-2 py-1 rounded-lg bg-slate-900 text-white font-mono text-[11px] font-bold border border-white/20 focus:outline-none"
                          >
                            {itemConditions.flatMap(ic =>
                              (ic.rincianUnit || []).map(ru => (
                                <option key={ru.kodeQrUnit} value={ru.globalUnitIndex}>
                                  {ru.kodeQrUnit} — {ic.namaBarang.slice(0, 22)} (Unit #
                                  {ru.unitNumber}/{ic.qty})
                                </option>
                              ))
                            )}
                          </select>
                          <button
                            type="button"
                            onClick={() =>
                              setActiveGlobalUnitIndex(prev =>
                                Math.min(totalRecipientUnits, prev + 1)
                              )
                            }
                            disabled={activeGlobalUnitIndex >= totalRecipientUnits}
                            className="p-1 rounded-lg bg-white/15 hover:bg-white/25 disabled:opacity-40 text-white cursor-pointer"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ================================================================= */}
              {/* 2. PEMILIHAN 3 MODE UPDATE PADA QR YANG SAMA                      */}
              {/* ================================================================= */}
              {activeUnitContext && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-blue-900 dark:text-blue-400" />
                      <span>Pilih Mode Update dari QR Ini (Terhubung ke Monitoring Bantuan):</span>
                    </label>
                  </div>

                  {/* 3 Proportional Mode Selector Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* MODE 1: Update Semua Unit dengan Nama Item yang Sama */}
                    <button
                      type="button"
                      onClick={() => setUpdateMode('SAME_ITEM_ALL_UNITS')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                        updateMode === 'SAME_ITEM_ALL_UNITS'
                          ? 'bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-600 ring-2 ring-emerald-500/25'
                          : 'bg-white dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="px-2 py-0.5 rounded bg-emerald-700 text-white text-[10px] font-bold">
                          1 QR untuk Item Sama
                        </span>
                        <CheckCircle2
                          className={`w-4 h-4 ${
                            updateMode === 'SAME_ITEM_ALL_UNITS'
                              ? 'text-emerald-600'
                              : 'text-slate-300'
                          }`}
                        />
                      </div>
                      <div>
                        <p className="text-xs font-extrabold text-slate-900 dark:text-white leading-snug">
                          Update Sekaligus "{activeUnitContext.catalogItem.namaBarang}"
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                          Cukup scan 1 QR ini untuk update langsung{' '}
                          <strong>
                            semua {activeUnitContext.catalogItem.qty}{' '}
                            {activeUnitContext.catalogItem.satuan}
                          </strong>{' '}
                          pada nama barang yang sama.
                        </p>
                      </div>
                    </button>

                    {/* MODE 2: Edit Sekaligus Semua Barang Penerima */}
                    <button
                      type="button"
                      onClick={() => setUpdateMode('EDIT_SEKALIGUS_ALL')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                        updateMode === 'EDIT_SEKALIGUS_ALL'
                          ? 'bg-blue-50/90 dark:bg-blue-950/50 border-blue-700 ring-2 ring-blue-500/25'
                          : 'bg-white dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="px-2 py-0.5 rounded bg-blue-900 text-white text-[10px] font-bold">
                          Edit Sekaligus
                        </span>
                        <Edit3
                          className={`w-4 h-4 ${
                            updateMode === 'EDIT_SEKALIGUS_ALL'
                              ? 'text-blue-800 dark:text-blue-400'
                              : 'text-slate-300'
                          }`}
                        />
                      </div>
                      <div>
                        <p className="text-xs font-extrabold text-slate-900 dark:text-white leading-snug">
                          Edit Sekaligus Semua Barang Penerima
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                          Jika seluruh barang di lokasi penerima (
                          <strong>
                            {itemConditions.length} Jenis / {totalRecipientUnits} Unit
                          </strong>
                          ) dalam kondisi baik/seragam.
                        </p>
                      </div>
                    </button>

                    {/* MODE 3: Update Satuan (Per Unit 1..N) */}
                    <button
                      type="button"
                      onClick={() => setUpdateMode('UPDATE_SATUAN_UNIT')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                        updateMode === 'UPDATE_SATUAN_UNIT'
                          ? 'bg-amber-50/90 dark:bg-amber-950/50 border-amber-600 ring-2 ring-amber-500/25'
                          : 'bg-white dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="px-2 py-0.5 rounded bg-amber-600 text-white text-[10px] font-bold">
                          Update Satuan
                        </span>
                        <SlidersHorizontal
                          className={`w-4 h-4 ${
                            updateMode === 'UPDATE_SATUAN_UNIT'
                              ? 'text-amber-600'
                              : 'text-slate-300'
                          }`}
                        />
                      </div>
                      <div>
                        <p className="text-xs font-extrabold text-slate-900 dark:text-white leading-snug">
                          Update Satuan per Unit (Unit #1 s.d. #
                          {activeUnitContext.catalogItem.qty})
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                          Jika ada salah satu unit barang yang sedikit eror/rusak agar tercatat spesifik per unit.
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* =============================================================== */}
                  {/* WORKSPACE FOR MODE 1: UPDATE SEKALIGUS ITEM YANG SAMA           */}
                  {/* =============================================================== */}
                  {updateMode === 'SAME_ITEM_ALL_UNITS' && (
                    <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/70 space-y-3 animate-in fade-in duration-150">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-emerald-200/70 dark:border-emerald-800/60">
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                            Mode Cerdas: Cukup Scan 1 QR untuk Nama Barang yang Sama
                          </span>
                          <h5 className="text-sm font-extrabold text-slate-900 dark:text-white">
                            {activeUnitContext.catalogItem.namaBarang} — Total{' '}
                            {activeUnitContext.catalogItem.qty}{' '}
                            {activeUnitContext.catalogItem.satuan} (
                            {activeUnitContext.catalogItem.kodeQrRange ||
                              activeUnitContext.unitSatuan.kodeQrUnit}
                            )
                          </h5>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white text-xs font-bold">
                           Berlaku untuk {activeUnitContext.catalogItem.qty}{' '}
                          {activeUnitContext.catalogItem.satuan} Sekaligus
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        <div className="sm:col-span-5">
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Kondisi untuk Semua {activeUnitContext.catalogItem.qty}{' '}
                            {activeUnitContext.catalogItem.satuan} Barang Ini:
                          </label>
                          <select
                            value={sameItemKondisi}
                            onChange={e =>
                              setSameItemKondisi(e.target.value as StatusKondisiFisik)
                            }
                            className="w-full px-3 py-2 rounded-xl border border-emerald-400 dark:border-emerald-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white"
                          >
                            {KONDISI_OPTIONS.map(opt => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-7">
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Catatan Pemeriksaan untuk Item "{activeUnitContext.catalogItem.namaBarang}":
                          </label>
                          <input
                            type="text"
                            value={sameItemCatatan}
                            onChange={e => setSameItemCatatan(e.target.value)}
                            placeholder={`Contoh: Seluruh ${activeUnitContext.catalogItem.qty} ${activeUnitContext.catalogItem.satuan} berfungsi baik dan lengkap...`}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* =============================================================== */}
                  {/* WORKSPACE FOR MODE 2: EDIT SEKALIGUS SEMUA BARANG PENERIMA      */}
                  {/* =============================================================== */}
                  {updateMode === 'EDIT_SEKALIGUS_ALL' && (
                    <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/70 space-y-3 animate-in fade-in duration-150">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-blue-200/70 dark:border-blue-800/60">
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-900 dark:text-blue-300 block">
                            Mode Edit Sekaligus Seluruh Barang Penerima ({itemConditions.length} Jenis Item • {totalRecipientUnits} Unit)
                          </span>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400">
                            Jika hasil pengecekan semua barang di penerima ini baik-baik saja, klik tombol cepat di kanan atau sesuaikan per jenis barang.
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSetAllRecipientItemsKondisi('Baik & Lengkap')}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Set Semua Baik &amp; Lengkap ({totalRecipientUnits} Unit)</span>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        {itemConditions.map((it, idx) => (
                          <div
                            key={it.itemId}
                            className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                          >
                            <div className="sm:col-span-4 min-w-0">
                              <p className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                                {idx + 1}. {it.namaBarang}
                              </p>
                              <span className="text-[10px] font-bold text-blue-900 dark:text-blue-300">
                                {it.qty} {it.satuan} &bull; {it.kodeQrRange || it.kodeQrUnit}
                              </span>
                            </div>
                            <div className="sm:col-span-4">
                              <select
                                value={
                                  it.kondisi === 'Baik'
                                    ? 'Baik & Lengkap'
                                    : it.kondisi === 'Rusak'
                                    ? 'Rusak Berat'
                                    : it.kondisi
                                }
                                onChange={e =>
                                  handleBulkItemChange(idx, 'kondisi', e.target.value)
                                }
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                              >
                                {KONDISI_OPTIONS.map(opt => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="sm:col-span-4">
                              <input
                                type="text"
                                value={it.catatan || ''}
                                onChange={e =>
                                  handleBulkItemChange(idx, 'catatan', e.target.value)
                                }
                                placeholder="Catatan jenis barang ini..."
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* =============================================================== */}
                  {/* WORKSPACE FOR MODE 3: UPDATE SATUAN PER UNIT (1..N)             */}
                  {/* =============================================================== */}
                  {updateMode === 'UPDATE_SATUAN_UNIT' && (
                    <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/70 space-y-3 animate-in fade-in duration-150">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-amber-200/70 dark:border-amber-800/60">
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300 block">
                            Mode Update Satuan (Detail per Unit Barang)
                          </span>
                          <h5 className="text-sm font-extrabold text-slate-900 dark:text-white">
                            {activeUnitContext.catalogItem.namaBarang} ({activeUnitContext.catalogItem.qty}{' '}
                            {activeUnitContext.catalogItem.satuan})
                          </h5>
                        </div>

                        {/* Item Type Switcher if recipient has multiple item types */}
                        {itemConditions.length > 1 && (
                          <div className="flex flex-wrap items-center gap-1">
                            {itemConditions.map(ic => (
                              <button
                                key={ic.itemId}
                                type="button"
                                onClick={() => {
                                  const firstU = ic.rincianUnit?.[0]?.globalUnitIndex || 1;
                                  setActiveGlobalUnitIndex(firstU);
                                }}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border cursor-pointer transition-colors ${
                                  ic.itemId === activeUnitContext.catalogItem.itemId
                                    ? 'bg-blue-900 text-white border-blue-900'
                                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                {ic.namaBarang.slice(0, 22)} ({ic.qty})
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                        {(activeUnitContext.catalogItem.rincianUnit || []).map(unit => {
                          const isCurrentScannedUnit =
                            unit.globalUnitIndex === activeGlobalUnitIndex;
                          return (
                            <div
                              key={unit.unitId}
                              className={`p-3 rounded-xl border space-y-2 transition-all ${
                                isCurrentScannedUnit
                                  ? 'bg-white dark:bg-slate-900 border-blue-600 ring-2 ring-blue-500/20 shadow-xs'
                                  : 'bg-white/90 dark:bg-slate-900/70 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                      isCurrentScannedUnit
                                        ? 'bg-blue-900 text-white'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                    }`}
                                  >
                                    Unit #{unit.unitNumber}
                                  </span>
                                  {isCurrentScannedUnit && (
                                    <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400">
                                      (QR Aktif)
                                    </span>
                                  )}
                                </div>
                                <span className="font-mono text-[10px] font-bold text-slate-500">
                                  {unit.kodeQrUnit}
                                </span>
                              </div>

                              <select
                                value={unit.kondisi}
                                onChange={e =>
                                  handleSingleUnitChange(
                                    activeUnitContext.itemIndex,
                                    unit.unitNumber,
                                    'kondisi',
                                    e.target.value
                                  )
                                }
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                              >
                                {KONDISI_OPTIONS.map(opt => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>

                              <input
                                type="text"
                                value={unit.catatan}
                                onChange={e =>
                                  handleSingleUnitChange(
                                    activeUnitContext.itemIndex,
                                    unit.unitNumber,
                                    'catatan',
                                    e.target.value
                                  )
                                }
                                placeholder={`Catatan spesifik Unit #${unit.unitNumber}...`}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ================================================================= */}
              {/* 3. DOKUMENTASI FOTO & UNGGAH BUKTI TAMBAHAN                       */}
              {/* ================================================================= */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-3">
                {allPhotos.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                      Dokumentasi Penyaluran Tersimpan:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {allPhotos.slice(0, 4).map((p, idx) => (
                        <div
                          key={idx}
                          onClick={() =>
                            setLightboxState({ isOpen: true, url: p.url, caption: p.label })
                          }
                          className="group relative h-16 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden cursor-pointer"
                        >
                          <img
                            src={p.url}
                            alt={p.label}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                            <ZoomIn className="w-3.5 h-3.5 mr-1" /> Perbesar
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-3">
                    {fotoBukti && (
                      <div className="h-10 w-10 rounded-lg bg-slate-100 border overflow-hidden shrink-0">
                        <img
                          src={fotoBukti}
                          alt="Preview Bukti"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>
                        {fotoBukti ? 'Ganti Foto Bukti' : 'Unggah Foto Pemeriksaan (Opsional)'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoUpload}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setScannedItem(null)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-900 dark:hover:text-blue-400 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Pindai QR Lain</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenWhatsApp(scannedItem)}
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Kirim WA</span>
                  </button>

                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      {updateMode === 'SAME_ITEM_ALL_UNITS'
                        ? `Simpan Semua "${activeUnitContext?.catalogItem.namaBarang.slice(0, 18)}..." (${activeUnitContext?.catalogItem.qty} ${activeUnitContext?.catalogItem.satuan})`
                        : updateMode === 'EDIT_SEKALIGUS_ALL'
                        ? `Simpan Edit Sekaligus (${totalRecipientUnits} Unit)`
                        : 'Simpan Update Satuan per Unit'}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Lightbox Preview for Enlarging Photos */}
      <ImageLightboxModal
        isOpen={lightboxState.isOpen}
        imageUrl={lightboxState.url}
        caption={lightboxState.caption}
        onClose={() => setLightboxState({ isOpen: false, url: '', caption: '' })}
      />
    </div>
  );
};
