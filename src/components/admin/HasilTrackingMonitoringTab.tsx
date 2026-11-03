/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  BantuanItem,
  StatusKondisiFisik,
  KondisiItemBarang,
  KondisiUnitSatuan
} from '../../types';
import { StorageService } from '../../services/storageService';
import { WILAYAH_JAWA_TIMUR } from '../../data/initialData';
import {
  Activity,
  Search,
  Filter,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Package,
  QrCode,
  MapPin,
  Calendar,
  Building2,
  Truck,
  Edit3,
  Save,
  X,
  Eye,
  Clock,
  UserCheck,
  Layers,
  ListChecks,
  LayoutList,
  Table as TableIcon,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Sparkles
} from 'lucide-react';

interface HasilTrackingMonitoringTabProps {
  bantuanList: BantuanItem[];
  currentActorName: string;
  onRefreshData: () => void;
  onOpenDetailBantuan: (item: BantuanItem) => void;
  onOpenQrScanner: (bantuanId?: string) => void;
}

const KONDISI_OPTIONS: StatusKondisiFisik[] = [
  'Baik & Lengkap',
  'Perlu Perbaikan Ringan',
  'Rusak Ringan',
  'Rusak Berat',
  'Kurang Jumlah',
  'Belum Diterima / Tahap Asesmen'
];

export const HasilTrackingMonitoringTab: React.FC<HasilTrackingMonitoringTabProps> = ({
  bantuanList,
  currentActorName,
  onRefreshData,
  onOpenDetailBantuan,
  onOpenQrScanner
}) => {
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTahun, setFilterTahun] = useState<string>('ALL');
  const [filterWilayah, setFilterWilayah] = useState<string>('ALL');
  const [filterKondisi, setFilterKondisi] = useState<string>('ALL');
  const [filterStatusAsesmen, setFilterStatusAsesmen] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'BY_RECIPIENT' | 'FLAT_ITEMS'>('BY_RECIPIENT');

  // Per-Item / Per-Unit ("Update Satuan Barang") state
  // Key format: `${bantuanId}::${itemId}`
  const [activeUnitEditorKey, setActiveUnitEditorKey] = useState<string | null>(null);
  const [draftUnitsState, setDraftUnitsState] = useState<KondisiUnitSatuan[]>([]);
  const [draftItemSummaryNote, setDraftItemSummaryNote] = useState<string>('');

  // Read-only expanded unit preview key: `${bantuanId}::${itemId}`
  const [expandedUnitPreviewKey, setExpandedUnitPreviewKey] = useState<string | null>(null);

  // Full recipient inline edit state (optional bulk edit for all items in a recipient)
  const [editingBantuanId, setEditingBantuanId] = useState<string | null>(null);
  const [draftItemsMap, setDraftItemsMap] = useState<Record<string, KondisiItemBarang[]>>({});
  const [draftGlobalNoteMap, setDraftGlobalNoteMap] = useState<Record<string, string>>({});
  const [savedBannerInfo, setSavedBannerInfo] = useState<{
    bantuanId: string;
    message: string;
  } | null>(null);

  // Hydrate each recipient with its itemized goods catalog & per-unit rincianUnit
  const enrichedBantuanList = useMemo(() => {
    return bantuanList.map(bantuan => {
      const items = StorageService.extractItemCatalogForBantuan(bantuan);
      const totalUnits = StorageService.getTotalUnitsCount(bantuan);
      return {
        bantuan,
        items,
        totalUnits
      };
    });
  }, [bantuanList]);

  // Available years
  const availableYears = useMemo(() => {
    return Array.from(new Set(bantuanList.map(b => b.tahun))).sort((a, b) => b - a);
  }, [bantuanList]);

  // Global KPI statistics across all recipients, catalog items, and individual physical units
  const kpiStats = useMemo(() => {
    const totalRecipients = enrichedBantuanList.length;
    let totalCatalogItems = 0;
    let totalPhysicalUnits = 0;
    let baikUnits = 0;
    let ringanUnits = 0;
    let beratUnits = 0;
    let kurangUnits = 0;

    enrichedBantuanList.forEach(({ items }) => {
      totalCatalogItems += items.length;
      items.forEach(item => {
        const units = item.rincianUnit && item.rincianUnit.length > 0 ? item.rincianUnit : [];
        if (units.length > 0) {
          totalPhysicalUnits += units.length;
          units.forEach(u => {
            if (u.kondisi === 'Baik & Lengkap') baikUnits++;
            else if (u.kondisi === 'Perlu Perbaikan Ringan' || u.kondisi === 'Rusak Ringan')
              ringanUnits++;
            else if (u.kondisi === 'Rusak Berat') beratUnits++;
            else kurangUnits++;
          });
        } else {
          const q = Math.max(1, Number(item.qty) || 1);
          totalPhysicalUnits += q;
          if (item.kondisi === 'Baik & Lengkap' || item.kondisi === 'Baik') baikUnits += q;
          else if (
            item.kondisi === 'Perlu Perbaikan Ringan' ||
            item.kondisi === 'Rusak Ringan'
          )
            ringanUnits += q;
          else if (item.kondisi === 'Rusak Berat' || item.kondisi === 'Rusak') beratUnits += q;
          else kurangUnits += q;
        }
      });
    });

    const baikPct =
      totalPhysicalUnits > 0 ? Math.round((baikUnits / totalPhysicalUnits) * 100) : 0;

    return {
      totalRecipients,
      totalCatalogItems,
      totalPhysicalUnits,
      baikUnits,
      ringanUnits,
      beratUnits,
      kurangUnits,
      baikPct
    };
  }, [enrichedBantuanList]);

  // Filtered list
  const filteredEnrichedList = useMemo(() => {
    return enrichedBantuanList
      .map(entry => {
        const { bantuan, items, totalUnits } = entry;

        if (filterTahun !== 'ALL' && bantuan.tahun.toString() !== filterTahun) {
          return null;
        }
        if (filterWilayah !== 'ALL' && bantuan.kabupatenKota !== filterWilayah) {
          return null;
        }
        if (
          filterStatusAsesmen !== 'ALL' &&
          (bantuan.statusAsesmen || 'Disetujui') !== filterStatusAsesmen
        ) {
          return null;
        }

        const q = searchQuery.trim().toLowerCase();
        const recipientMatchesSearch =
          !q ||
          bantuan.namaPenerima.toLowerCase().includes(q) ||
          bantuan.id.toLowerCase().includes(q) ||
          bantuan.kabupatenKota.toLowerCase().includes(q) ||
          (bantuan.alamat || '').toLowerCase().includes(q) ||
          (bantuan.kategoriLembaga || '').toLowerCase().includes(q);

        const matchingItems = items.filter(it => {
          const matchesCond =
            filterKondisi === 'ALL' ||
            it.kondisi === filterKondisi ||
            (it.rincianUnit && it.rincianUnit.some(ru => ru.kondisi === filterKondisi));
          if (!matchesCond) return false;

          if (!q) return true;
          if (recipientMatchesSearch) return true;

          return (
            it.namaBarang.toLowerCase().includes(q) ||
            (it.kodeQrUnit || '').toLowerCase().includes(q) ||
            (it.kodeQrRange || '').toLowerCase().includes(q) ||
            (it.vendorPenyedia || '').toLowerCase().includes(q) ||
            (it.catatan || '').toLowerCase().includes(q) ||
            (it.spesifikasi || '').toLowerCase().includes(q) ||
            (it.rincianUnit &&
              it.rincianUnit.some(
                ru =>
                  ru.kodeQrUnit.toLowerCase().includes(q) ||
                  ru.catatan.toLowerCase().includes(q)
              ))
          );
        });

        if (matchingItems.length === 0) return null;

        return {
          bantuan,
          items: matchingItems,
          allItems: items,
          totalUnits
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [
    enrichedBantuanList,
    searchQuery,
    filterTahun,
    filterWilayah,
    filterKondisi,
    filterStatusAsesmen
  ]);

  // Badge helpers (Proportional rectangular rounded-lg badges, never circular!)
  const getKondisiBadgeStyle = (kondisi: KondisiItemBarang['kondisi']) => {
    if (kondisi === 'Baik & Lengkap' || kondisi === 'Baik') {
      return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    }
    if (kondisi === 'Perlu Perbaikan Ringan' || kondisi === 'Rusak Ringan') {
      return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    }
    if (kondisi === 'Rusak Berat' || kondisi === 'Rusak') {
      return 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
    }
    if (kondisi === 'Kurang Jumlah') {
      return 'bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800';
    }
    return 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
  };

  const getKondisiDotColor = (kondisi: KondisiItemBarang['kondisi']) => {
    if (kondisi === 'Baik & Lengkap' || kondisi === 'Baik') return 'bg-emerald-500';
    if (kondisi === 'Perlu Perbaikan Ringan' || kondisi === 'Rusak Ringan') return 'bg-amber-500';
    if (kondisi === 'Rusak Berat' || kondisi === 'Rusak') return 'bg-rose-500';
    if (kondisi === 'Kurang Jumlah') return 'bg-orange-500';
    return 'bg-purple-500';
  };

  const getAsesmenBadgeStyle = (status?: BantuanItem['statusAsesmen']) => {
    switch (status) {
      case 'Asesmen':
        return 'bg-[#002B66] text-white border-[#001F4D]';
      case 'Disetujui':
        return 'bg-emerald-600 text-white border-emerald-700';
      case 'Ditolak':
        return 'bg-red-600 text-white border-red-700';
      case 'Menunggu Tindak Lanjut':
        return 'bg-amber-500 text-white border-amber-600';
      default:
        return 'bg-emerald-600 text-white border-emerald-700';
    }
  };

  // Compute breakdown of unit conditions for an item
  const getItemUnitBreakdown = (item: KondisiItemBarang) => {
    const units = item.rincianUnit || [];
    const total = units.length || Math.max(1, Number(item.qty) || 1);
    if (units.length === 0) {
      const isBaik = item.kondisi === 'Baik & Lengkap' || item.kondisi === 'Baik';
      return {
        total,
        baik: isBaik ? total : 0,
        perbaikan:
          item.kondisi === 'Perlu Perbaikan Ringan' || item.kondisi === 'Rusak Ringan' ? total : 0,
        rusakBerat: item.kondisi === 'Rusak Berat' || item.kondisi === 'Rusak' ? total : 0,
        lainnya:
          !isBaik &&
          item.kondisi !== 'Perlu Perbaikan Ringan' &&
          item.kondisi !== 'Rusak Ringan' &&
          item.kondisi !== 'Rusak Berat' &&
          item.kondisi !== 'Rusak'
            ? total
            : 0,
        hasMixedConditions: false
      };
    }

    let baik = 0;
    let perbaikan = 0;
    let rusakBerat = 0;
    let lainnya = 0;
    const uniqueConditions = new Set<string>();

    units.forEach(u => {
      uniqueConditions.add(u.kondisi);
      if (u.kondisi === 'Baik & Lengkap') baik++;
      else if (u.kondisi === 'Perlu Perbaikan Ringan' || u.kondisi === 'Rusak Ringan')
        perbaikan++;
      else if (u.kondisi === 'Rusak Berat') rusakBerat++;
      else lainnya++;
    });

    return {
      total,
      baik,
      perbaikan,
      rusakBerat,
      lainnya,
      hasMixedConditions: uniqueConditions.size > 1
    };
  };

  // Derive aggregate condition for an item from its individual units
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

  // Derive concise summary note from units if individual units have different conditions
  const buildUnitBreakdownSummaryNote = (
    units: KondisiUnitSatuan[],
    satuan: string,
    fallbackNote: string
  ): string => {
    const counts: Record<string, number> = {};
    units.forEach(u => {
      counts[u.kondisi] = (counts[u.kondisi] || 0) + 1;
    });
    const keys = Object.keys(counts);
    if (keys.length <= 1) {
      const customUnitNotes = units
        .filter(u => u.catatan && u.catatan.trim() !== fallbackNote.trim())
        .map(u => `Unit #${u.unitNumber}: ${u.catatan}`);
      if (customUnitNotes.length > 0) {
        return customUnitNotes.slice(0, 3).join(' • ');
      }
      return fallbackNote;
    }

    const parts = keys.map(k => `${counts[k]} ${satuan} ${k}`);
    return `Rincian ${units.length} ${satuan}: ${parts.join(', ')}.`;
  };

  // Open the "Update Satuan Barang" panel for a specific item
  const handleOpenUnitEditor = (bantuan: BantuanItem, item: KondisiItemBarang) => {
    const key = `${bantuan.id}::${item.itemId}`;
    if (activeUnitEditorKey === key) {
      setActiveUnitEditorKey(null);
      return;
    }
    setEditingBantuanId(null);
    setExpandedUnitPreviewKey(null);
    const units =
      item.rincianUnit && item.rincianUnit.length > 0
        ? item.rincianUnit.map(u => ({ ...u }))
        : [
            {
              unitId: `${item.itemId}-U1`,
              unitNumber: 1,
              globalUnitIndex: item.unitIndex || 1,
              kodeQrUnit: item.kodeQrUnit || `${bantuan.id}-U01`,
              namaUnit: `${item.namaBarang} — Unit #1`,
              kondisi:
                item.kondisi === 'Baik'
                  ? 'Baik & Lengkap'
                  : item.kondisi === 'Rusak'
                  ? 'Rusak Berat'
                  : (item.kondisi as StatusKondisiFisik),
              catatan: item.catatan || bantuan.catatanKondisiFisik || ''
            }
          ];

    setDraftUnitsState(units);
    setDraftItemSummaryNote(item.catatan || bantuan.catatanKondisiFisik || '');
    setActiveUnitEditorKey(key);
  };

  const handleUpdateSingleDraftUnit = (
    unitNumber: number,
    field: 'kondisi' | 'catatan',
    value: string
  ) => {
    setDraftUnitsState(prev =>
      prev.map(u =>
        u.unitNumber === unitNumber
          ? {
              ...u,
              [field]: value,
              updatedAt: new Date().toISOString().slice(0, 10),
              updatedBy: currentActorName
            }
          : u
      )
    );
  };

  const handleSetAllDraftUnitsCondition = (kondisi: StatusKondisiFisik) => {
    setDraftUnitsState(prev =>
      prev.map(u => ({
        ...u,
        kondisi,
        updatedAt: new Date().toISOString().slice(0, 10),
        updatedBy: currentActorName
      }))
    );
  };

  // Save the per-unit ("Update Satuan") changes for a specific item
  const handleSaveUnitEditor = (
    bantuan: BantuanItem,
    targetItem: KondisiItemBarang,
    allItems: KondisiItemBarang[]
  ) => {
    const nowDate = new Date().toISOString().slice(0, 10);
    const derivedItemKondisi = deriveItemConditionFromUnits(draftUnitsState);
    const autoNote = buildUnitBreakdownSummaryNote(
      draftUnitsState,
      targetItem.satuan,
      draftItemSummaryNote || targetItem.catatan || ''
    );

    const updatedItems: KondisiItemBarang[] = allItems.map(it => {
      if (it.itemId !== targetItem.itemId) return it;
      return {
        ...it,
        kondisi: derivedItemKondisi,
        catatan: autoNote,
        updatedAt: nowDate,
        updatedBy: currentActorName,
        rincianUnit: draftUnitsState.map(u => ({
          ...u,
          updatedAt: nowDate,
          updatedBy: currentActorName
        }))
      };
    });

    // Derive recipient-level aggregate condition
    let recipientKondisi: StatusKondisiFisik = 'Baik & Lengkap';
    if (updatedItems.some(i => i.kondisi === 'Rusak Berat' || i.kondisi === 'Rusak')) {
      recipientKondisi = 'Rusak Berat';
    } else if (updatedItems.some(i => i.kondisi === 'Kurang Jumlah')) {
      recipientKondisi = 'Kurang Jumlah';
    } else if (
      updatedItems.some(
        i => i.kondisi === 'Perlu Perbaikan Ringan' || i.kondisi === 'Rusak Ringan'
      )
    ) {
      recipientKondisi = 'Perlu Perbaikan Ringan';
    } else if (updatedItems.every(i => i.kondisi === 'Belum Diterima / Tahap Asesmen')) {
      recipientKondisi = 'Belum Diterima / Tahap Asesmen';
    }

    const globalSummary = updatedItems
      .map(i => `${i.namaBarang}: ${i.kondisi}${i.catatan ? ` (${i.catatan})` : ''}`)
      .join(' | ');

    StorageService.updateKondisiFisikViaQR(
      bantuan.id,
      recipientKondisi,
      globalSummary,
      bantuan.fotoMonitoringUrl,
      currentActorName,
      updatedItems
    );

    setActiveUnitEditorKey(null);
    setSavedBannerInfo({
      bantuanId: bantuan.id,
      message: `Rincian satuan "${targetItem.namaBarang}" (${draftUnitsState.length} ${targetItem.satuan}) berhasil diperbarui secara detail per unit!`
    });
    onRefreshData();
    setTimeout(() => {
      setSavedBannerInfo(prev => (prev?.bantuanId === bantuan.id ? null : prev));
    }, 4000);
  };

  // Start bulk editing for all items of a recipient
  const handleStartEditRecipient = (bantuan: BantuanItem, allItems: KondisiItemBarang[]) => {
    setActiveUnitEditorKey(null);
    setEditingBantuanId(bantuan.id);
    setDraftItemsMap(prev => ({
      ...prev,
      [bantuan.id]: allItems.map(it => ({
        ...it,
        rincianUnit: it.rincianUnit ? it.rincianUnit.map(u => ({ ...u })) : []
      }))
    }));
    setDraftGlobalNoteMap(prev => ({
      ...prev,
      [bantuan.id]: bantuan.catatanKondisiFisik || ''
    }));
  };

  const handleCancelEditRecipient = () => {
    setEditingBantuanId(null);
  };

  const handleChangeDraftItemCondition = (
    bantuanId: string,
    itemId: string,
    newKondisi: StatusKondisiFisik
  ) => {
    const nowDate = new Date().toISOString().slice(0, 10);
    setDraftItemsMap(prev => {
      const list = prev[bantuanId] || [];
      return {
        ...prev,
        [bantuanId]: list.map(it =>
          it.itemId === itemId
            ? {
                ...it,
                kondisi: newKondisi,
                updatedAt: nowDate,
                updatedBy: currentActorName,
                rincianUnit: (it.rincianUnit || []).map(u => ({
                  ...u,
                  kondisi: newKondisi,
                  updatedAt: nowDate,
                  updatedBy: currentActorName
                }))
              }
            : it
        )
      };
    });
  };

  const handleChangeDraftItemNote = (bantuanId: string, itemId: string, newNote: string) => {
    setDraftItemsMap(prev => {
      const list = prev[bantuanId] || [];
      return {
        ...prev,
        [bantuanId]: list.map(it =>
          it.itemId === itemId
            ? {
                ...it,
                catatan: newNote,
                rincianUnit: (it.rincianUnit || []).map(u => ({
                  ...u,
                  catatan: newNote
                }))
              }
            : it
        )
      };
    });
  };

  const handleSaveRecipientItems = (bantuan: BantuanItem) => {
    const updatedItems = draftItemsMap[bantuan.id];
    if (!updatedItems || updatedItems.length === 0) return;

    let derivedKondisi: StatusKondisiFisik = 'Baik & Lengkap';
    if (updatedItems.some(i => i.kondisi === 'Rusak Berat' || i.kondisi === 'Rusak')) {
      derivedKondisi = 'Rusak Berat';
    } else if (updatedItems.some(i => i.kondisi === 'Kurang Jumlah')) {
      derivedKondisi = 'Kurang Jumlah';
    } else if (
      updatedItems.some(
        i => i.kondisi === 'Perlu Perbaikan Ringan' || i.kondisi === 'Rusak Ringan'
      )
    ) {
      derivedKondisi = 'Perlu Perbaikan Ringan';
    } else if (updatedItems.every(i => i.kondisi === 'Belum Diterima / Tahap Asesmen')) {
      derivedKondisi = 'Belum Diterima / Tahap Asesmen';
    }

    const itemSummaryNote = updatedItems
      .map(i => `${i.namaBarang}: ${i.kondisi}${i.catatan ? ` (${i.catatan})` : ''}`)
      .join(' | ');

    const finalGlobalNote = draftGlobalNoteMap[bantuan.id]?.trim() || itemSummaryNote;

    StorageService.updateKondisiFisikViaQR(
      bantuan.id,
      derivedKondisi,
      finalGlobalNote,
      bantuan.fotoMonitoringUrl,
      currentActorName,
      updatedItems
    );

    setEditingBantuanId(null);
    setSavedBannerInfo({
      bantuanId: bantuan.id,
      message: `Seluruh kondisi barang untuk ${bantuan.namaPenerima} berhasil diperbarui!`
    });
    onRefreshData();
    setTimeout(() => {
      setSavedBannerInfo(prev => (prev?.bantuanId === bantuan.id ? null : prev));
    }, 3500);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Top Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="space-y-1 max-w-3xl">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-blue-900 dark:text-blue-400">
            <Activity className="w-3.5 h-3.5" />
            <span>Integrasi Rekap Penerima & Tracking Fisik per Unit Barang</span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Hasil Tracking & Monitoring Kondisi Satuan Barang Bantuan
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Pantau dan perbarui kondisi fisik <strong>setiap jenis barang maupun per satuan unit (Unit #1, #2, dst.)</strong> pada tiap penerima bantuan secara tepat sasaran, terhubung langsung dengan <strong>Pencatatan Penerima</strong> dan <strong>QR Code & Tracking Fisik</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('BY_RECIPIENT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'BY_RECIPIENT'
                  ? 'bg-blue-900 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>Per Penerima</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('FLAT_ITEMS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'FLAT_ITEMS'
                  ? 'bg-blue-900 text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Tabel Semua Barang</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => onOpenQrScanner()}
            className="px-3.5 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5 text-amber-300" />
            <span>Scan & Update via QR</span>
          </button>
        </div>
      </div>

      {/* 4 Proportional KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Objek Monitoring */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                Total Unit Barang Terdata
              </span>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 tabular-nums">
                {kpiStats.totalPhysicalUnits}{' '}
                <span className="text-xs font-semibold text-slate-500">Unit Fisik</span>
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900 flex items-center justify-center text-blue-900 dark:text-blue-300 shrink-0">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>
              <strong className="text-slate-800 dark:text-slate-200">
                {kpiStats.totalRecipients} Penerima
              </strong>
            </span>
            <span className="font-semibold text-blue-900 dark:text-blue-300">
              {kpiStats.totalCatalogItems} Jenis Barang
            </span>
          </div>
        </div>

        {/* Card 2: Unit Kondisi Baik & Lengkap */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                Unit Kondisi Baik & Lengkap
              </span>
              <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">
                {kpiStats.baikUnits}{' '}
                <span className="text-xs font-semibold text-emerald-600/80">
                  Unit ({kpiStats.baikPct}%)
                </span>
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                style={{ width: `${kpiStats.baikPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Perlu Perbaikan / Rusak Ringan */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/50 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
                Perlu Perbaikan / Ringan
              </span>
              <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
                {kpiStats.ringanUnits}{' '}
                <span className="text-xs font-semibold text-amber-600/80">Unit Barang</span>
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Status Pemeliharaan</span>
            <span className="font-semibold text-amber-700 dark:text-amber-300">
              Tindak Lanjut Servis
            </span>
          </div>
        </div>

        {/* Card 4: Rusak Berat / Kurang / Tahap Asesmen */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-rose-200/80 dark:border-rose-900/50 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 block">
                Rusak Berat / Belum Diterima
              </span>
              <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1 tabular-nums">
                {kpiStats.beratUnits + kpiStats.kurangUnits}{' '}
                <span className="text-xs font-semibold text-rose-600/80">Unit Atensi</span>
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>
              Rusak Berat: <strong>{kpiStats.beratUnits}</strong>
            </span>
            <span>
              Kurang/Asesmen: <strong>{kpiStats.kurangUnits}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
            <Filter className="w-3.5 h-3.5 text-blue-900 dark:text-blue-400" />
            <span>Filter & Pencarian Kondisi Satuan Barang</span>
          </div>

          {(searchQuery ||
            filterTahun !== 'ALL' ||
            filterWilayah !== 'ALL' ||
            filterKondisi !== 'ALL' ||
            filterStatusAsesmen !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setFilterTahun('ALL');
                setFilterWilayah('ALL');
                setFilterKondisi('ALL');
                setFilterStatusAsesmen('ALL');
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Semua Filter</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Search Input */}
          <div className="relative lg:col-span-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari Nama Penerima, Barang, Kode QR Unit (-U01), atau Vendor..."
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
            />
          </div>

          {/* Filter Kondisi Fisik Tiap Barang */}
          <div>
            <select
              value={filterKondisi}
              onChange={e => setFilterKondisi(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-blue-600"
            >
              <option value="ALL">Semua Kondisi Barang</option>
              {KONDISI_OPTIONS.map(k => (
                <option key={k} value={k}>
                  Kondisi: {k}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Wilayah */}
          <div>
            <select
              value={filterWilayah}
              onChange={e => setFilterWilayah(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-blue-600"
            >
              <option value="ALL">Semua Kabupaten / Kota</option>
              {WILAYAH_JAWA_TIMUR.map(w => (
                <option key={w.nama} value={w.nama}>
                  {w.nama}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Tahun */}
          <div>
            <select
              value={filterTahun}
              onChange={e => setFilterTahun(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:border-blue-600"
            >
              <option value="ALL">Semua Tahun Penyaluran</option>
              {availableYears.map(yr => (
                <option key={yr} value={yr.toString()}>
                  Tahun {yr}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results Count Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
          <ListChecks className="w-4 h-4 text-blue-900 dark:text-blue-400" />
          <span>
            Menampilkan{' '}
            <strong className="text-blue-900 dark:text-blue-300">
              {filteredEnrichedList.length} Penerima Bantuan
            </strong>{' '}
            &bull;{' '}
            <strong className="text-emerald-700 dark:text-emerald-400">
              {filteredEnrichedList.reduce((acc, cur) => acc + cur.items.length, 0)} Jenis Barang (
              {filteredEnrichedList.reduce((acc, cur) => acc + cur.totalUnits, 0)} Unit Fisik)
            </strong>
          </span>
        </div>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          Klik tombol <strong>Update Satuan</strong> pada baris barang untuk mengatur kondisi per unit (Unit #1, #2, dst.) satu per satu
        </span>
      </div>

      {/* Empty State */}
      {filteredEnrichedList.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            Data Monitoring Barang Tidak Ditemukan
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Tidak ada penerima atau rincian barang yang sesuai dengan filter pencarian saat ini.
            Silakan atur ulang filter di atas.
          </p>
        </div>
      ) : viewMode === 'BY_RECIPIENT' ? (
        /* =============================================================== */
        /* MODE 1: REKAP PER PENERIMA & UPDATE SATUAN PER BARANG / UNIT    */
        /* =============================================================== */
        <div className="space-y-4">
          {filteredEnrichedList.map(({ bantuan, items, allItems, totalUnits }) => {
            const isEditingAll = editingBantuanId === bantuan.id;
            const activeItems = isEditingAll ? draftItemsMap[bantuan.id] || allItems : items;
            const statusAsesmen = bantuan.statusAsesmen || 'Disetujui';

            // Count how many total physical units are in Baik condition across this recipient
            let recipientBaikUnits = 0;
            let recipientTotalUnits = 0;
            allItems.forEach(it => {
              const b = getItemUnitBreakdown(it);
              recipientBaikUnits += b.baik;
              recipientTotalUnits += b.total;
            });

            return (
              <div
                key={bantuan.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-all"
              >
                {/* Recipient Header Bar — Clean & Proportional */}
                <div className="p-4 sm:px-5 sm:py-4 bg-slate-50/90 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    {/* Top Meta Badges */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-md bg-blue-900 text-white font-mono text-[11px] font-bold">
                        {bantuan.id}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${getAsesmenBadgeStyle(
                          statusAsesmen
                        )}`}
                      >
                        Status Asesmen: {statusAsesmen}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold">
                        Tahap: {bantuan.statusTahap}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 ml-1">
                        <Calendar className="w-3 h-3" />
                        <span>
                          Tahun {bantuan.tahun} ({bantuan.triwulan})
                        </span>
                      </span>
                    </div>

                    {/* Recipient Title & Category */}
                    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug">
                        {bantuan.namaPenerima}
                      </h3>
                      <span className="text-xs font-semibold text-blue-900 dark:text-blue-400">
                        &bull; {bantuan.kategoriLembaga} ({bantuan.kategoriBantuan})
                      </span>
                    </div>

                    {/* Location & Unit Summary */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>
                          <strong className="text-slate-800 dark:text-slate-200">
                            {bantuan.kabupatenKota}
                          </strong>
                          {bantuan.alamat ? ` — ${bantuan.alamat}` : ''}
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <Layers className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>
                          Total: <strong>{allItems.length} Jenis Item</strong> (
                          <strong>{totalUnits} Unit Fisik Ber-QR</strong>)
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Right Actions & Unit Readiness Pill */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center gap-2.5">
                      <div className="text-right">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block leading-none">
                          Kesiapan Unit Fisik
                        </span>
                        <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums mt-0.5 block">
                          {recipientBaikUnits} / {recipientTotalUnits} Unit Baik
                        </span>
                      </div>
                    </div>

                    {!isEditingAll ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleStartEditRecipient(bantuan, allItems)}
                          className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                          title="Edit sekaligus seluruh jenis barang pada penerima ini"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Sekaligus</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenQrScanner(bantuan.id)}
                          className="px-3 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                          title="Buka QR Scanner & Inspeksi Fisik"
                        >
                          <QrCode className="w-3.5 h-3.5 text-amber-300" />
                          <span>Buka QR</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenDetailBantuan(bantuan)}
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                          title="Lihat Detail Rekap Penerima"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSaveRecipientItems(bantuan)}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Simpan Semua</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEditRecipient}
                          className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold inline-flex items-center gap-1 hover:bg-slate-100 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Batal</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Saved Confirmation Toast Banner inside Card */}
                {savedBannerInfo?.bantuanId === bantuan.id && (
                  <div className="px-5 py-2.5 bg-emerald-50 dark:bg-emerald-950/60 border-b border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 animate-in fade-in duration-150">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{savedBannerInfo.message}</span>
                  </div>
                )}

                {/* Proportional Zero-Overflow Itemized List */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {/* Desktop Column Header Bar */}
                  <div className="hidden lg:grid lg:grid-cols-12 gap-3 px-5 py-2.5 bg-slate-100/70 dark:bg-slate-900/70 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <div className="col-span-2">No &amp; Kode QR Unit</div>
                    <div className="col-span-3">Nama Barang &amp; Vendor</div>
                    <div className="col-span-2">Kuantitas &amp; Rincian Unit</div>
                    <div className="col-span-2">Kondisi Fisik Barang</div>
                    <div className="col-span-3 flex items-center justify-between">
                      <span>Catatan Detail &amp; Aksi Satuan</span>
                    </div>
                  </div>

                  {activeItems.map((item, idx) => {
                    const rowNumber = idx + 1;
                    const itemKey = `${bantuan.id}::${item.itemId}`;
                    const isUnitEditorOpen = activeUnitEditorKey === itemKey;
                    const isPreviewOpen = expandedUnitPreviewKey === itemKey;
                    const breakdown = getItemUnitBreakdown(item);
                    const unitCount = Math.max(1, Number(item.qty) || 1);
                    const cleanSatuan = StorageService.normalizeSatuanLabel(item.satuan);
                    const displayQrLabel =
                      item.kodeQrRange ||
                      item.kodeQrUnit ||
                      `${bantuan.id}-U${String(rowNumber).padStart(2, '0')}`;

                    return (
                      <div key={item.itemId} className="transition-colors">
                        {/* Main Item Row — Proportional 12-Col Grid on Desktop, Stacked on Mobile */}
                        <div
                          className={`p-4 sm:px-5 sm:py-3.5 grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-center ${
                            isUnitEditorOpen
                              ? 'bg-blue-50/40 dark:bg-blue-950/25'
                              : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/30'
                          }`}
                        >
                          {/* Col 1-2: No & Kode QR Unit/Range */}
                          <div className="lg:col-span-2 flex items-center gap-2.5 min-w-0">
                            <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-xs font-extrabold flex items-center justify-center shrink-0">
                              {rowNumber}
                            </span>
                            <div className="min-w-0">
                              <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800 text-blue-900 dark:text-blue-300 font-mono text-[11px] font-bold max-w-full">
                                <QrCode className="w-3 h-3 text-blue-700 dark:text-blue-400 shrink-0" />
                                <span className="truncate" title={displayQrLabel}>
                                  {displayQrLabel}
                                </span>
                              </div>
                              {unitCount > 1 && (
                                <span className="block text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
                                  {unitCount} QR Unik Terpisah
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Col 3-5: Nama Barang, Spesifikasi & Vendor Penyedia */}
                          <div className="lg:col-span-3 min-w-0 space-y-1">
                            <p className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-[13px] leading-snug">
                              {item.namaBarang}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                              <span className="inline-flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300">
                                <Truck className="w-3 h-3 text-blue-700 dark:text-blue-400 shrink-0" />
                                <span className="truncate">
                                  {item.vendorPenyedia || bantuan.vendorPenyedia || '-'}
                                </span>
                              </span>
                              {item.jenisBarang && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                                  {item.jenisBarang}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Col 6-7: Kuantitas & Breakdown Satuan Unit */}
                          <div className="lg:col-span-2 min-w-0 space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 font-extrabold text-xs text-slate-900 dark:text-slate-100 tabular-nums">
                                {unitCount} {cleanSatuan}
                              </span>
                              {unitCount > 1 && !isEditingAll && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedUnitPreviewKey(prev =>
                                      prev === itemKey ? null : itemKey
                                    )
                                  }
                                  className="px-2 py-1 rounded-lg text-[10px] font-bold text-blue-900 dark:text-blue-300 bg-blue-50/80 dark:bg-blue-950/50 hover:bg-blue-100 border border-blue-200/70 dark:border-blue-800 inline-flex items-center gap-0.5 cursor-pointer transition-colors"
                                  title="Lihat rincian kondisi tiap unit (Unit #1 s.d. selesai)"
                                >
                                  <span>Rincian</span>
                                  {isPreviewOpen ? (
                                    <ChevronUp className="w-3 h-3" />
                                  ) : (
                                    <ChevronDown className="w-3 h-3" />
                                  )}
                                </button>
                              )}
                            </div>

                            {/* Mini Unit Breakdown Bar */}
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                              {breakdown.baik > 0 && (
                                <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                                  {breakdown.baik} Baik
                                </span>
                              )}
                              {breakdown.perbaikan > 0 && (
                                <span className="text-amber-700 dark:text-amber-400 font-bold">
                                  &bull; {breakdown.perbaikan} Perbaikan
                                </span>
                              )}
                              {breakdown.rusakBerat > 0 && (
                                <span className="text-rose-600 dark:text-rose-400 font-bold">
                                  &bull; {breakdown.rusakBerat} Rusak
                                </span>
                              )}
                              {breakdown.lainnya > 0 && (
                                <span className="text-purple-700 dark:text-purple-300 font-bold">
                                  {breakdown.baik > 0 ||
                                  breakdown.perbaikan > 0 ||
                                  breakdown.rusakBerat > 0
                                    ? '• '
                                    : ''}
                                  {breakdown.lainnya} Proses/Asesmen
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Col 8-9: Status Kondisi Fisik Barang (Clean Rectangular Badge!) */}
                          <div className="lg:col-span-2 min-w-0">
                            {isEditingAll ? (
                              <select
                                value={
                                  item.kondisi === 'Baik'
                                    ? 'Baik & Lengkap'
                                    : item.kondisi === 'Rusak'
                                    ? 'Rusak Berat'
                                    : item.kondisi
                                }
                                onChange={e =>
                                  handleChangeDraftItemCondition(
                                    bantuan.id,
                                    item.itemId,
                                    e.target.value as StatusKondisiFisik
                                  )
                                }
                                className="w-full px-2.5 py-1.5 rounded-lg border border-blue-400 dark:border-blue-600 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                {KONDISI_OPTIONS.map(opt => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div className="space-y-1">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border leading-tight ${getKondisiBadgeStyle(
                                    item.kondisi
                                  )}`}
                                >
                                  <span
                                    className={`w-2 h-2 rounded-full shrink-0 ${getKondisiDotColor(
                                      item.kondisi
                                    )}`}
                                  />
                                  <span>{item.kondisi}</span>
                                </span>
                                {breakdown.hasMixedConditions && (
                                  <span className="block text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                                    Kondisi bervariasi antar unit
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Col 10-12: Catatan Detail & Tombol "Update Satuan" */}
                          <div className="lg:col-span-3 flex flex-col sm:flex-row lg:items-center justify-between gap-2.5 min-w-0">
                            <div className="min-w-0 flex-1">
                              {isEditingAll ? (
                                <input
                                  type="text"
                                  value={item.catatan || ''}
                                  onChange={e =>
                                    handleChangeDraftItemNote(
                                      bantuan.id,
                                      item.itemId,
                                      e.target.value
                                    )
                                  }
                                  placeholder="Tulis catatan kondisi barang..."
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                                />
                              ) : (
                                <>
                                  <p
                                    className="text-xs text-slate-700 dark:text-slate-200 line-clamp-2 leading-snug"
                                    title={item.catatan || bantuan.catatanKondisiFisik}
                                  >
                                    {item.catatan ||
                                      bantuan.catatanKondisiFisik ||
                                      'Barang berfungsi sesuai spesifikasi teknis penyerahan.'}
                                  </p>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                                    <span className="inline-flex items-center gap-1">
                                      <Clock className="w-2.5 h-2.5" />
                                      {item.updatedAt ||
                                        bantuan.updatedAt?.slice(0, 10) ||
                                        bantuan.tanggalPenyaluran}
                                    </span>
                                    <span>&bull;</span>
                                    <span className="truncate">
                                      {item.updatedBy || bantuan.picAsesmen}
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Dedicated "Update Satuan" Action Button per Item Row */}
                            {!isEditingAll && (
                              <button
                                type="button"
                                onClick={() => handleOpenUnitEditor(bantuan, item)}
                                className={`px-3 py-2 rounded-xl text-[11px] font-bold inline-flex items-center justify-center gap-1.5 shrink-0 transition-all cursor-pointer border ${
                                  isUnitEditorOpen
                                    ? 'bg-blue-900 text-white border-blue-900 shadow-xs'
                                    : 'bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-900 hover:text-white text-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                }`}
                                title={
                                  unitCount > 1
                                    ? `Update kondisi satu per satu untuk ${unitCount} ${cleanSatuan} ${item.namaBarang}`
                                    : `Update kondisi satuan ${item.namaBarang}`
                                }
                              >
                                <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                                <span>
                                  {isUnitEditorOpen
                                    ? 'Tutup Panel'
                                    : unitCount > 1
                                    ? `Update Satuan (${unitCount})`
                                    : 'Update Satuan'}
                                </span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* ========================================================= */}
                        {/* READ-ONLY QUICK PREVIEW OF INDIVIDUAL UNITS (IF EXPANDED) */}
                        {/* ========================================================= */}
                        {isPreviewOpen && !isUnitEditorOpen && item.rincianUnit && (
                          <div className="px-4 sm:px-5 py-3.5 bg-slate-50/90 dark:bg-slate-800/40 border-t border-slate-200/70 dark:border-slate-800 animate-in fade-in duration-150">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                                <Layers className="w-3.5 h-3.5 text-blue-900 dark:text-blue-400" />
                                <span>
                                  Rincian Kondisi Tiap Satuan: {item.namaBarang} ({unitCount}{' '}
                                  {cleanSatuan})
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleOpenUnitEditor(bantuan, item)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Edit Kondisi Satu per Satu</span>
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                              {item.rincianUnit.map(u => (
                                <div
                                  key={u.unitId}
                                  className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700/80 flex flex-col justify-between gap-1.5 shadow-2xs"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                                      Unit #{u.unitNumber}{' '}
                                      <span className="text-[10px] font-normal text-slate-400">
                                        dari {unitCount}
                                      </span>
                                    </span>
                                    <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/70 text-blue-900 dark:text-blue-300 font-mono text-[10px] font-bold border border-blue-200/60 dark:border-blue-800">
                                      {u.kodeQrUnit}
                                    </span>
                                  </div>
                                  <div>
                                    <span
                                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold border ${getKondisiBadgeStyle(
                                        u.kondisi
                                      )}`}
                                    >
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full ${getKondisiDotColor(
                                          u.kondisi
                                        )}`}
                                      />
                                      <span>{u.kondisi}</span>
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">
                                    {u.catatan || 'Kondisi unit sesuai spesifikasi.'}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* ========================================================= */}
                        {/* INTERACTIVE "UPDATE SATUAN BARANG (PER UNIT 1..N)" PANEL  */}
                        {/* ========================================================= */}
                        {isUnitEditorOpen && (
                          <div className="p-4 sm:p-5 bg-gradient-to-b from-blue-50/70 to-slate-50/90 dark:from-blue-950/30 dark:to-slate-900/80 border-t border-blue-200 dark:border-blue-900/60 space-y-4 animate-in fade-in duration-150">
                            {/* Panel Header & Quick Preset Bar */}
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-blue-200/70 dark:border-blue-800/60">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2 text-xs font-extrabold text-blue-950 dark:text-blue-200">
                                  <SlidersHorizontal className="w-4 h-4 text-blue-800 dark:text-blue-400" />
                                  <span>
                                    Update Kondisi Satuan per Unit: {item.namaBarang} ({unitCount}{' '}
                                    {cleanSatuan})
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                                  Perbarui kondisi fisik dan catatan detail untuk masing-masing unit (Unit #1 s.d. Unit #{unitCount}) agar informasi monitoring tepat sasaran.
                                </p>
                              </div>

                              {/* Quick Batch Helper for Multi-Unit Items */}
                              {draftUnitsState.length > 1 && (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-amber-500" />
                                    Set Semua Unit:
                                  </span>
                                  {(
                                    [
                                      'Baik & Lengkap',
                                      'Perlu Perbaikan Ringan',
                                      'Rusak Ringan',
                                      'Rusak Berat'
                                    ] as StatusKondisiFisik[]
                                  ).map(preset => (
                                    <button
                                      key={preset}
                                      type="button"
                                      onClick={() => handleSetAllDraftUnitsCondition(preset)}
                                      className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-blue-900 hover:text-white text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-[10px] font-bold transition-colors cursor-pointer"
                                    >
                                      {preset}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Proportional Per-Unit Cards Grid (1 col on mobile, 2 cols on desktop) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
                              {draftUnitsState.map(unit => (
                                <div
                                  key={unit.unitId}
                                  className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-2.5"
                                >
                                  {/* Unit Card Top Row: Unit Number & Unique QR Code */}
                                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2">
                                      <span className="px-2 py-0.5 rounded-md bg-blue-900 text-white text-[11px] font-extrabold">
                                        Unit #{unit.unitNumber}
                                      </span>
                                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                        {item.namaBarang}
                                      </span>
                                    </div>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-blue-900 dark:text-blue-300 font-mono text-[10px] font-bold shrink-0">
                                      <QrCode className="w-3 h-3" />
                                      <span>{unit.kodeQrUnit}</span>
                                    </span>
                                  </div>

                                  {/* Unit Condition Selector & Specific Unit Note */}
                                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-start">
                                    <div className="sm:col-span-5">
                                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                        Kondisi Unit #{unit.unitNumber}
                                      </label>
                                      <select
                                        value={unit.kondisi}
                                        onChange={e =>
                                          handleUpdateSingleDraftUnit(
                                            unit.unitNumber,
                                            'kondisi',
                                            e.target.value
                                          )
                                        }
                                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
                                      >
                                        {KONDISI_OPTIONS.map(opt => (
                                          <option key={opt} value={opt}>
                                            {opt}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    <div className="sm:col-span-7">
                                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                        Catatan Spesifik Unit #{unit.unitNumber}
                                      </label>
                                      <input
                                        type="text"
                                        value={unit.catatan}
                                        onChange={e =>
                                          handleUpdateSingleDraftUnit(
                                            unit.unitNumber,
                                            'catatan',
                                            e.target.value
                                          )
                                        }
                                        placeholder={`Detail kondisi unit #${unit.unitNumber} (lokasi/kelengkapan/kendala)...`}
                                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Bottom Save Bar for Per-Unit Editor */}
                            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-blue-200/70 dark:border-blue-800/60">
                              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                                <span className="font-bold">Ringkasan Hasil Input:</span>
                                <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-bold text-[11px]">
                                  {
                                    draftUnitsState.filter(u => u.kondisi === 'Baik & Lengkap')
                                      .length
                                  }{' '}
                                  Unit Baik
                                </span>
                                {draftUnitsState.some(u => u.kondisi !== 'Baik & Lengkap') && (
                                  <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 font-bold text-[11px]">
                                    {
                                      draftUnitsState.filter(u => u.kondisi !== 'Baik & Lengkap')
                                        .length
                                    }{' '}
                                    Unit Perlu Atensi / Proses
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setActiveUnitEditorKey(null)}
                                  className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 cursor-pointer"
                                >
                                  Batal
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveUnitEditor(bantuan, item, allItems)}
                                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  <span>
                                    Simpan Kondisi ({draftUnitsState.length} {cleanSatuan})
                                  </span>
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Global Evaluation Footer */}
                <div className="px-4 sm:px-5 py-2.5 bg-slate-50/70 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-bold text-slate-700 dark:text-slate-300 shrink-0">
                      Ringkasan Evaluasi Lapangan:
                    </span>
                    {isEditingAll ? (
                      <input
                        type="text"
                        value={draftGlobalNoteMap[bantuan.id] || ''}
                        onChange={e =>
                          setDraftGlobalNoteMap(prev => ({
                            ...prev,
                            [bantuan.id]: e.target.value
                          }))
                        }
                        placeholder="Catatan kesimpulan pemeriksaan fisik penerima..."
                        className="w-full max-w-md px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
                      />
                    ) : (
                      <span className="italic text-slate-600 dark:text-slate-300 truncate">
                        "
                        {bantuan.catatanKondisiFisik ||
                          'Seluruh unit bantuan terverifikasi sesuai BAST.'}
                        "
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-[10px] text-slate-400 shrink-0">
                    Penyaluran: {bantuan.tanggalPenyaluran || '-'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* =============================================================== */
        /* MODE 2: TABEL SEMUA BARANG (FLAT ITEMIZED TABLE VIEW)           */
        /* =============================================================== */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-800/80 text-[10px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  <th className="py-3 px-4">Kode QR Barang</th>
                  <th className="py-3 px-4">Nama Penerima &amp; Wilayah</th>
                  <th className="py-3 px-4">Nama Barang &amp; Vendor</th>
                  <th className="py-3 px-4">Kuantitas</th>
                  <th className="py-3 px-4">Kondisi Fisik Barang</th>
                  <th className="py-3 px-4">Detail Kondisi / Catatan</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredEnrichedList.flatMap(({ bantuan, items }) =>
                  items.map((item, idx) => {
                    const displayQrLabel =
                      item.kodeQrRange ||
                      item.kodeQrUnit ||
                      `${bantuan.id}-U${String(idx + 1).padStart(2, '0')}`;
                    const cleanSatuan = StorageService.normalizeSatuanLabel(item.satuan);
                    const breakdown = getItemUnitBreakdown(item);

                    return (
                      <tr
                        key={`${bantuan.id}-${item.itemId}`}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-300 font-mono text-[11px] font-bold">
                            <QrCode className="w-3 h-3" />
                            <span>{displayQrLabel}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900 dark:text-white">
                            {bantuan.namaPenerima}
                          </p>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            <span>
                              {bantuan.kabupatenKota} &bull; {bantuan.tahun}
                            </span>
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-800 dark:text-slate-100">
                            {item.namaBarang}
                          </p>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Truck className="w-3 h-3 text-slate-400" />
                            <span>{item.vendorPenyedia || bantuan.vendorPenyedia || '-'}</span>
                          </p>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                            {item.qty} {cleanSatuan}
                          </span>
                          <span className="block text-[10px] text-emerald-700 dark:text-emerald-400 font-bold mt-1">
                            {breakdown.baik}/{breakdown.total} Unit Baik
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border ${getKondisiBadgeStyle(
                              item.kondisi
                            )}`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${getKondisiDotColor(
                                item.kondisi
                              )}`}
                            />
                            <span>{item.kondisi}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                            {item.catatan ||
                              bantuan.catatanKondisiFisik ||
                              'Kondisi fisik lengkap dan berfungsi baik.'}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setViewMode('BY_RECIPIENT');
                                handleOpenUnitEditor(bantuan, item);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-900 hover:text-white text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <SlidersHorizontal className="w-3 h-3" />
                              <span>Update Satuan</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenQrScanner(bantuan.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <QrCode className="w-3 h-3 text-amber-300" />
                              <span>QR</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
