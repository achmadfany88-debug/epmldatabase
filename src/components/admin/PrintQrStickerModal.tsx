/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { BantuanItem } from '../../types';
import { StorageService } from '../../services/storageService';
import { WILAYAH_KERJA_KPW_JATIM } from '../../data/initialData';
import {
  X,
  Printer,
  Download,
  QrCode,
  ChevronLeft,
  ChevronRight,
  Layers,
  ZoomIn,
  CheckCircle2,
  Filter,
  Settings2,
  RotateCcw,
  Sparkles,
  Ruler,
  Eye,
  Search
} from 'lucide-react';

export type StickerBorderStyle =
  | 'SOLID_MINIMAL'
  | 'SOLID_BOLD_BI'
  | 'DASHED_CUTLINE'
  | 'BORDERLESS';

export type StickerFooterMetaMode =
  | 'DEFAULT'
  | 'VENDOR'
  | 'PILAR_TAHAP'
  | 'PIC_ASESMEN'
  | 'KONDISI_FISIK'
  | 'CUSTOM_TEXT';

export type StickerVisualTemplate =
  | 'MODERN_BI_SPLIT'
  | 'GRADIENT_RIBBON'
  | 'FORMAL_GRID';

export interface QrStickerPrintConfig {
  visualTemplate: StickerVisualTemplate;
  borderStyle: StickerBorderStyle;
  footerMetaMode: StickerFooterMetaMode;
  customFooterText: string;
  showVendorInBody: boolean;
  headerSubtitle: string;
}

export const DEFAULT_STICKER_CONFIG: QrStickerPrintConfig = {
  visualTemplate: 'MODERN_BI_SPLIT',
  borderStyle: 'SOLID_MINIMAL',
  footerMetaMode: 'DEFAULT',
  customFooterText: 'Inventaris Bantuan EPML - BI Jatim',
  showVendorInBody: false,
  headerSubtitle: 'KPw Bank Indonesia Provinsi Jawa Timur'
};

export const getTotalBarangUnits = (item: BantuanItem): number => {
  if (item.daftarBarangVendor && item.daftarBarangVendor.length > 0) {
    const sum = item.daftarBarangVendor.reduce(
      (acc, b) => acc + (Number(b.qty) || 0),
      0
    );
    if (sum > 0) return sum;
  }
  return Math.max(1, Number(item.qty) || 1);
};

export interface StickerItemOverride {
  unitCode: string;
  itemId: string;
  namaBarang: string;
  jenisBarang: string;
  satuan: string;
  unitNumber: number;
  unitTotalInItem: number;
  globalUnitIndex: number;
  itemLabel: string;
  vendorLabel?: string;
}

interface QrStickerDesignProps {
  item: BantuanItem;
  compact?: boolean;
  config?: QrStickerPrintConfig;
  copyIndex?: number;
  totalCopies?: number;
  showUnitSequence?: boolean;
  customUnitMeta?: StickerItemOverride;
}

const inferKategoriLembaga = (item: BantuanItem): string => {
  if (item.kategoriLembaga && item.kategoriLembaga.trim() !== '') {
    return item.kategoriLembaga;
  }
  const lower = item.namaPenerima.toLowerCase();
  if (
    lower.includes('smk') ||
    lower.includes('sma') ||
    lower.includes('sekolah') ||
    lower.includes('universitas') ||
    lower.includes('kampus') ||
    lower.includes('inkubasi')
  ) {
    return 'Sekolah / SMK / Vokasi';
  }
  if (
    lower.includes('pesantren') ||
    lower.includes('pondok') ||
    lower.includes('yayasan') ||
    lower.includes('madrasah')
  ) {
    return 'Pondok Pesantren / Yayasan';
  }
  if (
    lower.includes('koperasi') ||
    lower.includes('umkm') ||
    lower.includes('sentra') ||
    lower.includes('kelompok tani') ||
    lower.includes('gabungan') ||
    lower.includes('usaha')
  ) {
    return 'UMKM / Koperasi / Kelompok Tani';
  }
  if (
    lower.includes('komunitas') ||
    lower.includes('pokdarwis') ||
    lower.includes('bank sampah') ||
    lower.includes('konservasi') ||
    lower.includes('desa') ||
    lower.includes('karang taruna')
  ) {
    return 'Komunitas / Pokmas / Bank Sampah';
  }
  return 'Lembaga Penerima EPML';
};

const resolveFooterBadgeText = (
  item: BantuanItem,
  cfg: QrStickerPrintConfig
): string => {
  switch (cfg.footerMetaMode) {
    case 'VENDOR':
      return `Vendor: ${item.vendorPenyedia}`;
    case 'PILAR_TAHAP':
      return `${item.kategoriBantuan} • ${item.statusTahap}`;
    case 'PIC_ASESMEN':
      return `PIC: ${item.picAsesmen}`;
    case 'KONDISI_FISIK':
      return `Fisik: ${item.statusKondisiFisik}`;
    case 'CUSTOM_TEXT':
      return cfg.customFooterText.trim() || 'QR Penerima';
    case 'DEFAULT':
    default:
      return 'QR Informasi Penerima';
  }
};

const getBorderClass = (borderStyle: StickerBorderStyle): string => {
  switch (borderStyle) {
    case 'SOLID_BOLD_BI':
      return 'border-2 border-[#002B66] rounded-md';
    case 'DASHED_CUTLINE':
      return 'border border-dashed border-slate-500 rounded-none';
    case 'BORDERLESS':
      return 'border border-transparent rounded-md shadow-none';
    case 'SOLID_MINIMAL':
    default:
      return 'border border-slate-300 rounded-md';
  }
};

/**
 * Reusable Official Sticker Card (New Enhanced QR Label Preview Design):
 * Color scheme: Blue (#002B66), White (#FFFFFF), and Green (#047857 / #10B981)
 * Top Label: "Bantuan EPML dari Bank Indonesia"
 * Contents:
 * - Kode/ID Bantuan
 * - Nama Lembaga Penerima EPML
 * - Tahun Penyaluran Bantuan
 * - Informasi QR (Gambar QR + Rincian Item & Wilayah)
 */
export const QrStickerDesignCard: React.FC<QrStickerDesignProps> = ({
  item,
  compact = false,
  config = DEFAULT_STICKER_CONFIG,
  copyIndex,
  totalCopies,
  showUnitSequence = true,
  customUnitMeta
}) => {
  const safeCopy = Math.max(1, copyIndex || 1);
  const safeTotal = Math.max(1, totalCopies || 1);
  const effectiveQrUnitIdx = customUnitMeta?.globalUnitIndex || safeCopy;
  const effectiveQrTotal = Math.max(safeTotal, effectiveQrUnitIdx);
  const [resolvedQrUrl, setResolvedQrUrl] = useState<string>('');

  React.useEffect(() => {
    let active = true;
    StorageService.generateUnitQrCodeDataUrl(
      item,
      effectiveQrUnitIdx,
      effectiveQrTotal
    ).then(url => {
      if (active) setResolvedQrUrl(url);
    });
    return () => {
      active = false;
    };
  }, [item, effectiveQrUnitIdx, effectiveQrTotal]);

  const fallbackMeta = StorageService.getSpecificUnitLabel(item, safeCopy, safeTotal);
  const rincianSingkat = customUnitMeta ? customUnitMeta.itemLabel : fallbackMeta.itemLabel;
  const displayUnitId = customUnitMeta
    ? customUnitMeta.unitCode
    : safeTotal > 1
    ? fallbackMeta.unitCode
    : item.id;

  const kategoriLembagaLabel = inferKategoriLembaga(item);
  const footerRightText = resolveFooterBadgeText(item, config);
  const borderClasses = getBorderClass(config.borderStyle);
  const template = config.visualTemplate || 'MODERN_BI_SPLIT';

  const headerBgClass =
    template === 'GRADIENT_RIBBON'
      ? 'bg-linear-to-r from-[#002B66] via-[#003B8E] to-[#047857]'
      : 'bg-[#002B66]';

  return (
    <div
      className={`bg-white text-slate-900 overflow-hidden flex flex-col justify-between shadow-2xs select-none w-full ${
        compact ? 'h-full' : ''
      } ${borderClasses}`}
    >
      {/* Top Header Banner: Biru Bank Indonesia (#002B66) + Aksen Hijau (#10B981) */}
      <div
        className={`${headerBgClass} text-white ${
          compact ? 'px-2 py-1' : 'px-3 py-1.5'
        } border-b-2 border-emerald-500 shrink-0 flex items-center justify-between gap-1.5`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <div
            className={`${
              compact ? 'w-5 h-5' : 'w-7 h-7'
            } rounded-full overflow-hidden bg-white flex items-center justify-center shrink-0 shadow-2xs ring-1 ring-white/90`}
          >
            <img
              src="/assets/aistudio/Logo_BI_Bulat_27bc9deb.png"
              alt="Logo Bank Indonesia"
              className="w-full h-full object-cover rounded-full scale-[1.22]"
            />
          </div>
          <div className="min-w-0 text-left">
            <p
              className={`${
                compact ? 'text-[7.2px]' : 'text-[10px]'
              } font-extrabold uppercase tracking-wider leading-tight text-white truncate`}
            >
              Bantuan EPML dari Bank Indonesia
            </p>
            <p
              className={`${
                compact ? 'text-[6px]' : 'text-[8px]'
              } text-emerald-300 font-semibold leading-tight truncate`}
            >
              {config.headerSubtitle || 'KPw Bank Indonesia Provinsi Jawa Timur'}
            </p>
          </div>
        </div>

        {/* Year Badge Pill in Header */}
        <span
          className={`${
            compact ? 'text-[6.5px] px-1 py-0.2' : 'text-[8.5px] px-1.5 py-0.5'
          } rounded-xs bg-emerald-500 text-slate-950 font-black uppercase tracking-tight shrink-0 leading-none`}
        >
          {item.tahun}
        </span>
      </div>

      {/* Main White Body: QR Code with Corner Frame + Structured Metadata */}
      <div
        className={`${
          compact ? 'p-1.5 gap-2' : 'p-3 gap-3'
        } bg-white flex items-center flex-1 min-h-0 relative`}
      >
        {/* Left: Framed QR Code Box */}
        <div className="shrink-0 bg-white p-1 rounded border border-[#002B66]/25 flex flex-col items-center justify-center relative shadow-2xs">
          {/* Corner Accent Marks */}
          <span className="absolute top-0.5 left-0.5 w-1.5 h-1.5 border-t-2 border-l-2 border-[#002B66]" />
          <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 border-t-2 border-r-2 border-[#002B66]" />
          <span className="absolute bottom-3 left-0.5 w-1.5 h-1.5 border-b-2 border-l-2 border-emerald-600" />
          <span className="absolute bottom-3 right-0.5 w-1.5 h-1.5 border-b-2 border-r-2 border-emerald-600" />

          {resolvedQrUrl ? (
            <img
              src={resolvedQrUrl}
              alt={`QR ${item.id}`}
              className={`${
                compact ? 'w-14 h-14' : 'w-22 h-22'
              } object-contain block`}
            />
          ) : (
            <div
              className={`${
                compact ? 'w-14 h-14' : 'w-22 h-22'
              } flex items-center justify-center bg-slate-50`}
            >
              <QrCode className="w-6 h-6 text-[#002B66]" />
            </div>
          )}
          <span className="w-full text-center bg-[#002B66] text-white text-[5.5px] font-extrabold uppercase tracking-wider py-0.2 rounded-2xs mt-0.5 leading-none">
            SCAN INFO QR
          </span>
        </div>

        {/* Right: Structured Sticker Fields */}
        <div className="min-w-0 flex-1 text-left flex flex-col justify-between h-full py-0.5">
          {/* 1. Kode / ID Bantuan (Khusus per Unit) & Unit Sequence Badge */}
          <div className="flex items-center justify-between gap-1">
            <span
              className={`font-mono font-extrabold text-[#002B66] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-xs ${
                compact ? 'text-[7px]' : 'text-[9.5px]'
              } tracking-tight leading-none truncate`}
              title={`Kode QR Unit: ${displayUnitId}`}
            >
              ID: {displayUnitId}
            </span>
            {showUnitSequence &&
              typeof copyIndex === 'number' &&
              typeof totalCopies === 'number' &&
              totalCopies > 1 && (
                <span
                  className={`font-mono font-extrabold text-emerald-900 bg-emerald-100 border border-emerald-300 px-1 py-0.5 rounded-xs ${
                    compact ? 'text-[6.5px]' : 'text-[8.5px]'
                  } leading-none shrink-0`}
                >
                  Unit {copyIndex}/{totalCopies}
                </span>
              )}
          </div>

          {/* 2. Nama Lembaga Penerima EPML */}
          <div className="my-0.5">
            <span
              className={`block ${
                compact ? 'text-[5.8px]' : 'text-[7.5px]'
              } font-extrabold uppercase tracking-wider text-emerald-700 leading-none mb-0.5`}
            >
              Nama Lembaga Penerima EPML:
            </span>
            <h5
              className={`font-extrabold text-slate-950 ${
                compact ? 'text-[8.5px] line-clamp-2' : 'text-[12px] line-clamp-2'
              } leading-tight`}
              title={item.namaPenerima}
            >
              {item.namaPenerima}
            </h5>
          </div>

          {/* 3. Informasi QR (Kategori, Wilayah & Item Bantuan) */}
          <div
            className={`${
              template === 'FORMAL_GRID'
                ? 'border-t border-slate-200 pt-0.5'
                : 'bg-slate-50/90 border border-slate-200/80 rounded-xs px-1.5 py-0.5'
            } space-y-0.5`}
          >
            <p
              className={`${
                compact ? 'text-[6.5px]' : 'text-[8.5px]'
              } text-slate-600 font-semibold truncate leading-tight`}
            >
              {kategoriLembagaLabel} &bull;{' '}
              {item.kabupatenKota.replace('Kabupaten ', 'Kab. ')}
            </p>
            <p
              className={`${
                compact ? 'text-[6.8px]' : 'text-[9px]'
              } text-emerald-800 font-extrabold truncate leading-tight`}
              title={rincianSingkat}
            >
              Item: {rincianSingkat}
            </p>
            {config.showVendorInBody && (
              <p
                className={`${
                  compact ? 'text-[6px]' : 'text-[8px]'
                } text-[#002B66] font-bold truncate leading-tight`}
                title={item.vendorPenyedia}
              >
                Vendor: {item.vendorPenyedia}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Footer Bar: Hijau (#047857) + Tahun Penyaluran Bantuan + Custom Metadata */}
      <div
        className={`bg-[#047857] text-white ${
          compact ? 'px-2 py-1' : 'px-3 py-1.5'
        } border-t border-emerald-400/30 flex items-center justify-between gap-1.5 shrink-0`}
      >
        <span
          className={`${
            compact ? 'text-[6.8px]' : 'text-[9px]'
          } font-extrabold uppercase tracking-wide leading-none whitespace-nowrap`}
        >
          Tahun Penyaluran: {item.tahun} ({item.triwulan})
        </span>
        <span
          className={`${
            compact ? 'text-[6.2px]' : 'text-[8px]'
          } font-extrabold bg-white text-[#002B66] px-1.5 py-0.5 rounded-xs leading-none truncate max-w-[52%]`}
          title={footerRightText}
        >
          {footerRightText}
        </span>
      </div>
    </div>
  );
};

interface StickerPrintInstance {
  item: BantuanItem;
  copyIndex: number;
  totalCopies: number;
  customUnitMeta?: StickerItemOverride;
}

interface PrintQrStickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: BantuanItem[];
  filterSummaryText?: string;
  initialCopiesMap?: Record<string, number>;
}

export const PrintQrStickerModal: React.FC<PrintQrStickerModalProps> = ({
  isOpen,
  onClose,
  items,
  filterSummaryText,
  initialCopiesMap
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [isGeneratingCanvas, setIsGeneratingCanvas] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfSavedMessage, setPdfSavedMessage] = useState<string>('');
  const [selectedPreviewId, setSelectedPreviewId] = useState<string>('ALL');
  const [inspectedItemId, setInspectedItemId] = useState<string>('');
  const [recipientSearchQuery, setRecipientSearchQuery] = useState<string>('');
  const [isSearchListOpen, setIsSearchListOpen] = useState<boolean>(false);
  const [copiesMap, setCopiesMap] = useState<Record<string, number>>({});
  const [showUnitSequence, setShowUnitSequence] = useState<boolean>(true);

  // Per-Recipient Catalog Item Filter ('ALL_ITEMS' or specific cat.itemId) & Per-Item Print Quantity
  const [selectedCatalogItemFilter, setSelectedCatalogItemFilter] = useState<
    Record<string, string>
  >({});
  const [catalogItemPrintQtyMap, setCatalogItemPrintQtyMap] = useState<
    Record<string, number>
  >({});
  const [bulkOverrideCopiesMap, setBulkOverrideCopiesMap] = useState<
    Record<string, number>
  >({});

  // Top-level Jenis Barang & Quantity Filter (syncs with top recipient dropdown)
  const [topJenisBarangFilter, setTopJenisBarangFilter] = useState<string>('ALL');
  const [topQtyFilter, setTopQtyFilter] = useState<string>('ALL');

  // Sync initialCopiesMap & default selection whenever modal opens
  React.useEffect(() => {
    if (isOpen) {
      setCurrentPage(1);
      setRecipientSearchQuery('');
      setIsSearchListOpen(false);
      setTopJenisBarangFilter('ALL');
      setTopQtyFilter('ALL');
      setSelectedCatalogItemFilter({});

      // Hydrate default per-item quantities from each recipient's actual catalog items
      const defaultItemQty: Record<string, number> = {};
      items.forEach(b => {
        const catList = StorageService.extractItemCatalogForBantuan(b);
        catList.forEach(c => {
          defaultItemQty[c.itemId] = Math.max(1, Number(c.qty) || 1);
        });
      });
      setCatalogItemPrintQtyMap(defaultItemQty);

      if (initialCopiesMap && Object.keys(initialCopiesMap).length > 0) {
        setCopiesMap({ ...initialCopiesMap });
        const overrides: Record<string, number> = {};
        items.forEach(b => {
          const initVal = initialCopiesMap[b.id];
          const naturalTotal = getTotalBarangUnits(b);
          if (typeof initVal === 'number' && initVal >= 1 && initVal !== naturalTotal) {
            overrides[b.id] = initVal;
          }
        });
        setBulkOverrideCopiesMap(overrides);
      } else {
        setCopiesMap({});
        setBulkOverrideCopiesMap({});
      }

      if (items.length === 1) {
        setSelectedPreviewId(items[0].id);
        setInspectedItemId(items[0].id);
      } else {
        setSelectedPreviewId('ALL');
        setInspectedItemId(items[0]?.id || '');
      }
    }
  }, [isOpen, items, initialCopiesMap]);

  const getCatalogItemPrintQty = (
    itemId: string,
    defaultQty: number
  ): number => {
    const val = catalogItemPrintQtyMap[itemId];
    if (typeof val === 'number' && val >= 1) {
      return Math.min(500, Math.floor(val));
    }
    return Math.max(1, Math.min(500, Math.floor(defaultQty || 1)));
  };

  const setCatalogItemPrintQty = (
    bantuanId: string,
    itemId: string,
    count: number
  ) => {
    const clamped = Math.max(1, Math.min(500, Math.floor(count || 1)));
    setCatalogItemPrintQtyMap(prev => ({
      ...prev,
      [itemId]: clamped
    }));
    // Clear bulk override for this recipient so per-item quantities drive the A4 preview
    setBulkOverrideCopiesMap(prev => {
      const next = { ...prev };
      delete next[bantuanId];
      return next;
    });
    setCurrentPage(1);
  };

  const getCopiesForItem = (item: BantuanItem): number => {
    const selectedMode = selectedCatalogItemFilter[item.id] || 'ALL_ITEMS';
    const catalog = StorageService.extractItemCatalogForBantuan(item);

    if (selectedMode !== 'ALL_ITEMS') {
      const targetCat = catalog.find(c => c.itemId === selectedMode) || catalog[0];
      if (targetCat) {
        return getCatalogItemPrintQty(targetCat.itemId, targetCat.qty);
      }
    }

    const bulkOverride = bulkOverrideCopiesMap[item.id];
    if (typeof bulkOverride === 'number' && bulkOverride >= 1) {
      return Math.min(500, Math.floor(bulkOverride));
    }

    if (catalog.length > 0) {
      return catalog.reduce(
        (sum, c) => sum + getCatalogItemPrintQty(c.itemId, c.qty),
        0
      );
    }

    const val = copiesMap[item.id];
    if (typeof val === 'number' && val >= 1) {
      return Math.min(500, Math.floor(val));
    }
    return getTotalBarangUnits(item);
  };

  const setCopiesForItem = (itemId: string, count: number) => {
    const clamped = Math.max(1, Math.min(500, Math.floor(count || 1)));
    const targetBantuan = items.find(i => i.id === itemId);
    const selectedMode = selectedCatalogItemFilter[itemId] || 'ALL_ITEMS';

    if (targetBantuan && selectedMode !== 'ALL_ITEMS') {
      setCatalogItemPrintQty(itemId, selectedMode, clamped);
      setCopiesMap(prev => ({
        ...prev,
        [itemId]: clamped
      }));
      return;
    }

    if (targetBantuan && clamped === getTotalBarangUnits(targetBantuan)) {
      const catList = StorageService.extractItemCatalogForBantuan(targetBantuan);
      setCatalogItemPrintQtyMap(prev => {
        const next = { ...prev };
        catList.forEach(c => {
          next[c.itemId] = Math.max(1, Number(c.qty) || 1);
        });
        return next;
      });
      setBulkOverrideCopiesMap(prev => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
    } else {
      setBulkOverrideCopiesMap(prev => ({
        ...prev,
        [itemId]: clamped
      }));
    }

    setCopiesMap(prev => ({
      ...prev,
      [itemId]: clamped
    }));
    setCurrentPage(1);
  };

  // Sticker Configuration State (Template, Border Style & Custom Footer Metadata)
  const [stickerConfig, setStickerConfig] = useState<QrStickerPrintConfig>(
    DEFAULT_STICKER_CONFIG
  );

  // Optional in-modal quick filter refinement
  const [modalYearFilter, setModalYearFilter] = useState<string>('ALL');
  const [modalKabFilter, setModalKabFilter] = useState<string>('ALL');
  const [modalKategoriFilter, setModalKategoriFilter] = useState<string>('ALL');

  const availableYears = useMemo(
    () =>
      Array.from(new Set([2024, 2025, 2026, ...items.map(i => i.tahun)])).sort(
        (a, b) => b - a
      ),
    [items]
  );

  const availableJenisBarangOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach(b => {
      if (b.jenisBarang) set.add(String(b.jenisBarang));
      const catList = StorageService.extractItemCatalogForBantuan(b);
      catList.forEach(c => {
        if (c.jenisBarang) set.add(c.jenisBarang);
      });
    });
    return Array.from(set);
  }, [items]);

  const filteredStickerItems = useMemo(() => {
    return items.filter(item => {
      if (modalYearFilter !== 'ALL' && item.tahun.toString() !== modalYearFilter)
        return false;
      if (modalKabFilter !== 'ALL' && item.kabupatenKota !== modalKabFilter)
        return false;
      if (
        modalKategoriFilter !== 'ALL' &&
        inferKategoriLembaga(item) !== modalKategoriFilter
      )
        return false;
      if (topJenisBarangFilter !== 'ALL') {
        const catList = StorageService.extractItemCatalogForBantuan(item);
        const matchJenis =
          String(item.jenisBarang || '') === topJenisBarangFilter ||
          catList.some(
            c =>
              c.jenisBarang === topJenisBarangFilter ||
              c.namaBarang === topJenisBarangFilter
          );
        if (!matchJenis) return false;
      }
      if (topQtyFilter !== 'ALL') {
        const totalU = getTotalBarangUnits(item);
        if (topQtyFilter === 'SINGLE' && totalU !== 1) return false;
        if (topQtyFilter === 'MULTI' && totalU <= 1) return false;
        if (topQtyFilter === 'QTY_2_5' && (totalU < 2 || totalU > 5)) return false;
        if (topQtyFilter === 'QTY_GT_5' && totalU <= 5) return false;
      }
      return true;
    });
  }, [
    items,
    modalYearFilter,
    modalKabFilter,
    modalKategoriFilter,
    topJenisBarangFilter,
    topQtyFilter
  ]);

  // Search engine filtering for dropdown options & batch view
  const dropdownOptionsItems = useMemo(() => {
    const q = recipientSearchQuery.trim().toLowerCase();
    if (!q) return filteredStickerItems;
    return filteredStickerItems.filter(item => {
      const kat = inferKategoriLembaga(item).toLowerCase();
      return (
        item.id.toLowerCase().includes(q) ||
        item.namaPenerima.toLowerCase().includes(q) ||
        item.kabupatenKota.toLowerCase().includes(q) ||
        item.detailBantuan.toLowerCase().includes(q) ||
        item.vendorPenyedia.toLowerCase().includes(q) ||
        kat.includes(q) ||
        item.tahun.toString().includes(q)
      );
    });
  }, [filteredStickerItems, recipientSearchQuery]);

  // Items actively rendered on the A4 Sheet Preview and PDF/PNG Export:
  // - If selectedPreviewId === 'ALL' ("(Cetak Semua)"), shows all dropdownOptionsItems
  // - If a specific recipient is chosen in the dropdown, shows ONLY that recipient on the A4 sheet
  const activeSheetItems = useMemo(() => {
    if (selectedPreviewId && selectedPreviewId !== 'ALL') {
      const exact = filteredStickerItems.find(i => i.id === selectedPreviewId);
      if (exact) return [exact];
    }
    return dropdownOptionsItems;
  }, [selectedPreviewId, filteredStickerItems, dropdownOptionsItems]);

  const expandedStickerInstances = useMemo<StickerPrintInstance[]>(() => {
    const list: StickerPrintInstance[] = [];
    for (const item of activeSheetItems) {
      const catalog = StorageService.extractItemCatalogForBantuan(item);
      const selectedMode = selectedCatalogItemFilter[item.id] || 'ALL_ITEMS';

      // Case 1: Specific item selected for this recipient
      if (selectedMode !== 'ALL_ITEMS' && catalog.length > 0) {
        const targetCat =
          catalog.find(c => c.itemId === selectedMode) || catalog[0];
        const count = getCatalogItemPrintQty(targetCat.itemId, targetCat.qty);
        const baseGlobalIdx = targetCat.rincianUnit?.[0]?.globalUnitIndex || 1;
        const cleanSatuan =
          targetCat.satuan || StorageService.normalizeSatuanLabel(item.satuan);

        for (let u = 1; u <= count; u++) {
          const gIdx = baseGlobalIdx + u - 1;
          const unitCode = `${item.id}-U${String(gIdx).padStart(2, '0')}`;
          const itemLabel =
            count > 1
              ? `${targetCat.namaBarang} (1 ${cleanSatuan} • Unit #${u}/${count})`
              : `${targetCat.namaBarang} (1 ${cleanSatuan})`;

          list.push({
            item,
            copyIndex: u,
            totalCopies: count,
            customUnitMeta: {
              unitCode,
              itemId: targetCat.itemId,
              namaBarang: targetCat.namaBarang,
              jenisBarang: targetCat.jenisBarang || 'Barang Bantuan',
              satuan: cleanSatuan,
              unitNumber: u,
              unitTotalInItem: count,
              globalUnitIndex: gIdx,
              itemLabel,
              vendorLabel: targetCat.vendorPenyedia || item.vendorPenyedia
            }
          });
        }
        continue;
      }

      // Case 2: All items of this recipient, using per-item quantities (unless bulk override is active)
      const bulkOverride = bulkOverrideCopiesMap[item.id];
      if (typeof bulkOverride === 'number' && bulkOverride >= 1) {
        const count = Math.min(500, Math.floor(bulkOverride));
        for (let c = 1; c <= count; c++) {
          list.push({
            item,
            copyIndex: c,
            totalCopies: count
          });
        }
        continue;
      }

      if (catalog.length > 0) {
        const totalForRecipient = catalog.reduce(
          (sum, c) => sum + getCatalogItemPrintQty(c.itemId, c.qty),
          0
        );
        let runningCopyIdx = 1;
        for (const cat of catalog) {
          const catCount = getCatalogItemPrintQty(cat.itemId, cat.qty);
          const baseGlobalIdx =
            cat.rincianUnit?.[0]?.globalUnitIndex || runningCopyIdx;
          const cleanSatuan =
            cat.satuan || StorageService.normalizeSatuanLabel(item.satuan);

          for (let u = 1; u <= catCount; u++) {
            const gIdx = baseGlobalIdx + u - 1;
            const unitCode = `${item.id}-U${String(gIdx).padStart(2, '0')}`;
            const itemLabel =
              catCount > 1
                ? `${cat.namaBarang} (1 ${cleanSatuan} • Unit #${u}/${catCount})`
                : `${cat.namaBarang} (1 ${cleanSatuan})`;

            list.push({
              item,
              copyIndex: runningCopyIdx,
              totalCopies: totalForRecipient,
              customUnitMeta: {
                unitCode,
                itemId: cat.itemId,
                namaBarang: cat.namaBarang,
                jenisBarang: cat.jenisBarang || 'Barang Bantuan',
                satuan: cleanSatuan,
                unitNumber: u,
                unitTotalInItem: catCount,
                globalUnitIndex: gIdx,
                itemLabel,
                vendorLabel: cat.vendorPenyedia || item.vendorPenyedia
              }
            });
            runningCopyIdx++;
          }
        }
      } else {
        const count = getCopiesForItem(item);
        for (let c = 1; c <= count; c++) {
          list.push({
            item,
            copyIndex: c,
            totalCopies: count
          });
        }
      }
    }
    return list;
  }, [
    activeSheetItems,
    selectedCatalogItemFilter,
    catalogItemPrintQtyMap,
    bulkOverrideCopiesMap,
    copiesMap
  ]);

  if (!isOpen) return null;

  // 3 horizontal × 6 vertical = 18 stickers per A4 Portrait page
  const STICKERS_PER_PAGE = 18;
  const totalPages = Math.max(
    1,
    Math.ceil(expandedStickerInstances.length / STICKERS_PER_PAGE)
  );
  const safePage = Math.min(currentPage, totalPages);

  const pages: StickerPrintInstance[][] = [];
  for (let i = 0; i < expandedStickerInstances.length; i += STICKERS_PER_PAGE) {
    pages.push(expandedStickerInstances.slice(i, i + STICKERS_PER_PAGE));
  }
  if (pages.length === 0) {
    pages.push([]);
  }

  const currentPageInstances = pages[safePage - 1] || [];
  const previewItem =
    (selectedPreviewId !== 'ALL'
      ? filteredStickerItems.find(i => i.id === selectedPreviewId)
      : filteredStickerItems.find(i => i.id === inspectedItemId)) ||
    currentPageInstances[0]?.item ||
    dropdownOptionsItems[0] ||
    filteredStickerItems[0];
  const activeTargetItem = previewItem || filteredStickerItems[0];
  const activeTargetCatalog = activeTargetItem
    ? StorageService.extractItemCatalogForBantuan(activeTargetItem)
    : [];
  const activeSelectedCatalogItemId = activeTargetItem
    ? selectedCatalogItemFilter[activeTargetItem.id] || 'ALL_ITEMS'
    : 'ALL_ITEMS';
  const activeSelectedCatalogItem =
    activeSelectedCatalogItemId !== 'ALL_ITEMS'
      ? activeTargetCatalog.find(c => c.itemId === activeSelectedCatalogItemId) ||
        null
      : null;

  const activeTargetCopies = activeTargetItem ? getCopiesForItem(activeTargetItem) : 1;
  const activeTargetRecommendedQty = activeSelectedCatalogItem
    ? Math.max(1, Number(activeSelectedCatalogItem.qty) || 1)
    : activeTargetItem
    ? getTotalBarangUnits(activeTargetItem)
    : 1;

  // Determine customUnitMeta for the top-left single sticker preview card
  const previewInstanceForTarget =
    (activeTargetItem &&
      expandedStickerInstances.find(inst => inst.item.id === activeTargetItem.id)) ||
    currentPageInstances[0];

  /**
   * Download Single High-Resolution QR Sticker Label (PNG)
   */
  const handleDownloadSingleStickerPng = async (item: BantuanItem) => {
    const canvas = document.createElement('canvas');
    canvas.width = 760;
    canvas.height = 530;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Header Blue (#002B66)
    const headerH = 92;
    ctx.fillStyle = '#002B66';
    ctx.fillRect(0, 0, canvas.width, headerH);
    ctx.fillStyle = '#10B981';
    ctx.fillRect(0, headerH, canvas.width, 6);

    // Official Bank Indonesia Logo Badge (strictly circular with clip)
    await new Promise<void>(resolve => {
      const biImg = new Image();
      biImg.crossOrigin = 'anonymous';
      biImg.onload = () => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(47, 45, 25, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.clip();
        ctx.drawImage(biImg, 47 - 30, 45 - 30, 60, 60);
        ctx.restore();
        resolve();
      };
      biImg.onerror = () => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(47, 45, 25, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.fillStyle = '#002B66';
        ctx.font = '900 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('BI', 47, 52);
        ctx.restore();
        resolve();
      };
      biImg.src = '/assets/aistudio/Logo_BI_Bulat_27bc9deb.png';
    });

    // Header Title & Subtitle
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 22px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('BANTUAN EPML DARI BANK INDONESIA', 84, 44);
    ctx.fillStyle = '#6EE7B7';
    ctx.font = '600 15px sans-serif';
    ctx.fillText(
      stickerConfig.headerSubtitle.trim() ||
        'KPw Bank Indonesia Provinsi Jawa Timur',
      84,
      68
    );

    // Year Pill in Header
    ctx.fillStyle = '#10B981';
    ctx.fillRect(canvas.width - 108, 28, 84, 36);
    ctx.fillStyle = '#052E16';
    ctx.font = '900 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${item.tahun}`, canvas.width - 66, 52);

    // Footer Green (#047857)
    const footerH = 64;
    const footerY = canvas.height - footerH;
    ctx.fillStyle = '#047857';
    ctx.fillRect(0, footerY, canvas.width, footerH);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      `TAHUN PENYALURAN: ${item.tahun} (${item.triwulan})`,
      24,
      footerY + 38
    );

    const footerMetaText = resolveFooterBadgeText(item, stickerConfig);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(canvas.width - 280, footerY + 14, 256, 36);
    ctx.fillStyle = '#002B66';
    ctx.font = '800 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(footerMetaText.slice(0, 28), canvas.width - 152, footerY + 37);

    // QR Code Box
    const qrBoxX = 24;
    const qrBoxY = headerH + 26;
    const qrBoxW = 240;
    const qrBoxH = 265;
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 2;
    ctx.strokeRect(qrBoxX, qrBoxY, qrBoxW, qrBoxH);

    const qrSrc =
      item.qrCodeDataUrl || (await StorageService.generateQrCodeDataUrl(item));
    if (qrSrc) {
      await new Promise<void>(resolve => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          ctx.drawImage(img, qrBoxX + 12, qrBoxY + 10, 216, 216);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = qrSrc;
      });
    }

    ctx.fillStyle = '#002B66';
    ctx.fillRect(qrBoxX + 12, qrBoxY + 230, 216, 24);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SCAN INFO QR EPML', qrBoxX + 120, qrBoxY + 246);

    // Right Metadata Area
    const infoX = 286;
    const maxW = canvas.width - infoX - 24;
    ctx.textAlign = 'left';

    // ID Badge
    ctx.fillStyle = '#EFF6FF';
    ctx.fillRect(infoX, qrBoxY, 240, 36);
    ctx.strokeStyle = '#BFDBFE';
    ctx.strokeRect(infoX, qrBoxY, 240, 36);
    ctx.fillStyle = '#002B66';
    ctx.font = '800 18px monospace';
    ctx.fillText(`ID: ${item.id}`, infoX + 12, qrBoxY + 24);

    // Recipient Label & Name
    ctx.fillStyle = '#047857';
    ctx.font = '800 13px sans-serif';
    ctx.fillText('NAMA LEMBAGA PENERIMA EPML:', infoX, qrBoxY + 64);

    ctx.fillStyle = '#0F172A';
    ctx.font = '800 22px sans-serif';
    const name = item.namaPenerima;
    if (name.length > 26) {
      ctx.fillText(name.slice(0, 26), infoX, qrBoxY + 94, maxW);
      ctx.fillText(
        name.slice(26, 52) + (name.length > 52 ? '...' : ''),
        infoX,
        qrBoxY + 122,
        maxW
      );
    } else {
      ctx.fillText(name, infoX, qrBoxY + 94, maxW);
    }

    // Metadata Box
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(infoX, qrBoxY + 145, maxW, 118);
    ctx.strokeStyle = '#E2E8F0';
    ctx.strokeRect(infoX, qrBoxY + 145, maxW, 118);

    ctx.fillStyle = '#475569';
    ctx.font = '700 15px sans-serif';
    ctx.fillText(
      `${inferKategoriLembaga(item)} • ${item.kabupatenKota}`,
      infoX + 12,
      qrBoxY + 174,
      maxW - 24
    );

    const rincian =
      item.daftarBarangVendor && item.daftarBarangVendor.length > 0
        ? item.daftarBarangVendor
            .map(b => `${b.namaBarang} (${b.qty} ${b.satuan || 'Unit'})`)
            .join(', ')
        : `${item.detailBantuan} (${item.qty} ${item.satuan})`;

    ctx.fillStyle = '#065F46';
    ctx.font = '800 15px sans-serif';
    ctx.fillText(`Item: ${rincian.slice(0, 36)}`, infoX + 12, qrBoxY + 204, maxW - 24);

    ctx.fillStyle = '#002B66';
    ctx.font = '700 14px sans-serif';
    ctx.fillText(
      `Vendor: ${item.vendorPenyedia.slice(0, 36)}`,
      infoX + 12,
      qrBoxY + 234,
      maxW - 24
    );

    // Outer Border
    ctx.strokeStyle = '#002B66';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `Stiker_QR_${item.id}.png`;
    link.click();
  };

  /**
   * Shared High-Resolution A4 Portrait Sheet Canvas Renderer (1654 × 2339 px ~200 DPI)
   * Renders up to 18 stickers (3 columns × 6 rows) with Bank Indonesia Blue-White-Green branding.
   */
  const renderA4SheetToCanvas = async (
    pageInstances: StickerPrintInstance[],
    qrMap: Map<string, string>
  ): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement('canvas');
    canvas.width = 1654;
    canvas.height = 2339;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 6mm margin on 210mm × 297mm => ~47px margin, 3mm gap => ~24px gap
    const marginX = 47;
    const marginY = 47;
    const gapX = 24;
    const gapY = 24;
    const cols = 3;
    const rows = 6;

    const usableW = canvas.width - marginX * 2 - gapX * (cols - 1);
    const usableH = canvas.height - marginY * 2 - gapY * (rows - 1);
    const cardW = Math.floor(usableW / cols);
    const cardH = Math.floor(usableH / rows);

    const loadImage = (src: string): Promise<HTMLImageElement> =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });

    let biLogoImg: HTMLImageElement | null = null;
    try {
      biLogoImg = await loadImage('/assets/aistudio/Logo_BI_Bulat_27bc9deb.png');
    } catch {
      biLogoImg = null;
    }

    for (let idx = 0; idx < pageInstances.length; idx++) {
      const inst = pageInstances[idx];
      if (!inst) continue;
      const item = inst.item;
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = marginX + col * (cardW + gapX);
      const y = marginY + row * (cardH + gapY);

      // Card white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x, y, cardW, cardH);

      // Header Banner (Blue #002B66 or Gradient Ribbon)
      const headerH = 58;
      if (stickerConfig.visualTemplate === 'GRADIENT_RIBBON') {
        const grad = ctx.createLinearGradient(x, y, x + cardW, y);
        grad.addColorStop(0, '#002B66');
        grad.addColorStop(0.55, '#003B8E');
        grad.addColorStop(1, '#047857');
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = '#002B66';
      }
      ctx.fillRect(x, y, cardW, headerH);

      // Green accent strip below header (#10B981)
      ctx.fillStyle = '#10B981';
      ctx.fillRect(x, y + headerH, cardW, 5);

      // Official Bank Indonesia Logo Badge (strictly circular with clip)
      ctx.save();
      ctx.beginPath();
      ctx.arc(x + 28, y + 29, 18, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.clip();

      if (biLogoImg) {
        ctx.drawImage(biLogoImg, x + 28 - 22, y + 29 - 22, 44, 44);
      } else {
        ctx.fillStyle = '#002B66';
        ctx.font = '900 15px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('BI', x + 28, y + 35);
      }
      ctx.restore();

      // Header Title & Subtitle
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 15px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('BANTUAN EPML DARI BANK INDONESIA', x + 52, y + 27, cardW - 118);

      ctx.fillStyle = '#6EE7B7';
      ctx.font = '600 12px sans-serif';
      ctx.fillText(
        stickerConfig.headerSubtitle.trim() ||
          'KPw Bank Indonesia Provinsi Jawa Timur',
        x + 52,
        y + 45,
        cardW - 118
      );

      // Year Pill in Header
      ctx.fillStyle = '#10B981';
      ctx.fillRect(x + cardW - 58, y + 16, 46, 26);
      ctx.fillStyle = '#052E16';
      ctx.font = '800 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${item.tahun}`, x + cardW - 35, y + 34);

      // Bottom Green Footer (#047857)
      const footerH = 40;
      const footerY = y + cardH - footerH;
      ctx.fillStyle = '#047857';
      ctx.fillRect(x, footerY, cardW, footerH);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 13px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(
        `TAHUN PENYALURAN: ${item.tahun} (${item.triwulan})`,
        x + 12,
        footerY + 25
      );

      const footerMetaText = resolveFooterBadgeText(item, stickerConfig);
      const badgeW = Math.min(210, Math.max(125, footerMetaText.length * 7.5 + 18));
      const badgeX = x + cardW - badgeW - 10;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(badgeX, footerY + 8, badgeW, 24);
      ctx.fillStyle = '#002B66';
      ctx.font = '800 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        footerMetaText.slice(0, 28),
        badgeX + badgeW / 2,
        footerY + 24,
        badgeW - 10
      );

      // Body Left: QR Code Frame
      const bodyY = y + headerH + 14;
      const qrBoxW = 168;
      const qrBoxH = 212;
      const qrX = x + 12;
      const qrY = bodyY;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(qrX, qrY, qrBoxW, qrBoxH);
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 1.8;
      ctx.strokeRect(qrX, qrY, qrBoxW, qrBoxH);

      const fallbackMeta = StorageService.getSpecificUnitLabel(
        item,
        inst.copyIndex,
        inst.totalCopies
      );
      const effectiveQrIdx = inst.customUnitMeta?.globalUnitIndex || inst.copyIndex;
      const effectiveQrTotal = Math.max(inst.totalCopies, effectiveQrIdx);
      const qrKey = `${item.id}::${effectiveQrIdx}::${effectiveQrTotal}`;
      const qrSrc =
        qrMap.get(qrKey) ||
        (await StorageService.generateUnitQrCodeDataUrl(
          item,
          effectiveQrIdx,
          effectiveQrTotal
        ));
      if (qrSrc) {
        try {
          const qrImg = await loadImage(qrSrc);
          ctx.drawImage(qrImg, qrX + 8, qrY + 6, qrBoxW - 16, qrBoxW - 16);
        } catch {
          // ignore QR image error
        }
      }

      // SCAN INFO QR bar inside QR frame
      ctx.fillStyle = '#002B66';
      ctx.fillRect(qrX + 8, qrY + qrBoxH - 30, qrBoxW - 16, 22);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SCAN INFO QR', qrX + qrBoxW / 2, qrY + qrBoxH - 15);

      // Body Right: Metadata Block
      const infoX = qrX + qrBoxW + 14;
      const maxInfoW = cardW - (qrBoxW + 38);
      ctx.textAlign = 'left';

      // Row 1: Unique Unit ID Pill + Unit Badge
      const hasUnitBadge = showUnitSequence && inst.totalCopies > 1;
      const unitText = `Unit ${inst.copyIndex}/${inst.totalCopies}`;
      const unitW = hasUnitBadge ? 88 : 0;
      const idBoxW = hasUnitBadge ? maxInfoW - unitW - 6 : maxInfoW;
      const displayUnitId = inst.customUnitMeta
        ? inst.customUnitMeta.unitCode
        : inst.totalCopies > 1
        ? fallbackMeta.unitCode
        : item.id;

      ctx.fillStyle = '#EFF6FF';
      ctx.fillRect(infoX, qrY, idBoxW, 28);
      ctx.strokeStyle = '#BFDBFE';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(infoX, qrY, idBoxW, 28);
      ctx.fillStyle = '#002B66';
      ctx.font = '800 12.5px monospace';
      ctx.fillText(`ID: ${displayUnitId}`, infoX + 8, qrY + 19, idBoxW - 14);

      if (hasUnitBadge) {
        const uX = infoX + idBoxW + 6;
        ctx.fillStyle = '#D1FAE5';
        ctx.fillRect(uX, qrY, unitW, 28);
        ctx.strokeStyle = '#6EE7B7';
        ctx.strokeRect(uX, qrY, unitW, 28);
        ctx.fillStyle = '#065F46';
        ctx.font = '800 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(unitText, uX + unitW / 2, qrY + 19, unitW - 8);
        ctx.textAlign = 'left';
      }

      // Row 2: Nama Lembaga Penerima EPML
      ctx.fillStyle = '#047857';
      ctx.font = '800 11.5px sans-serif';
      ctx.fillText('NAMA LEMBAGA PENERIMA EPML:', infoX, qrY + 48, maxInfoW);

      ctx.fillStyle = '#0F172A';
      ctx.font = '800 16.5px sans-serif';
      const words = item.namaPenerima.split(' ');
      let line1 = '';
      let line2 = '';
      for (const w of words) {
        const test = line1 ? `${line1} ${w}` : w;
        if (test.length <= 24) {
          line1 = test;
        } else {
          line2 = line2 ? `${line2} ${w}` : w;
        }
      }
      ctx.fillText(line1 || item.namaPenerima.slice(0, 24), infoX, qrY + 70, maxInfoW);
      if (line2) {
        ctx.fillText(
          line2.length > 26 ? `${line2.slice(0, 24)}...` : line2,
          infoX,
          qrY + 91,
          maxInfoW
        );
      }

      // Row 3: Metadata Box (Kategori, Kabupaten/Kota, Specific 1-Unit Item Bantuan, Optional Vendor)
      const metaBoxY = qrY + 106;
      const metaBoxH = qrBoxH - 106;
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(infoX, metaBoxY, maxInfoW, metaBoxH);
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(infoX, metaBoxY, maxInfoW, metaBoxH);

      const katLembaga = inferKategoriLembaga(item);
      const kabShort = item.kabupatenKota.replace('Kabupaten ', 'Kab. ');
      ctx.fillStyle = '#475569';
      ctx.font = '600 13px sans-serif';
      ctx.fillText(
        `${katLembaga} • ${kabShort}`,
        infoX + 8,
        metaBoxY + 24,
        maxInfoW - 16
      );

      const rincian = inst.customUnitMeta
        ? inst.customUnitMeta.itemLabel
        : fallbackMeta.itemLabel;

      ctx.fillStyle = '#065F46';
      ctx.font = '800 13px sans-serif';
      ctx.fillText(
        `Item: ${rincian.length > 34 ? `${rincian.slice(0, 32)}...` : rincian}`,
        infoX + 8,
        metaBoxY + 48,
        maxInfoW - 16
      );

      if (stickerConfig.showVendorInBody) {
        ctx.fillStyle = '#002B66';
        ctx.font = '700 12px sans-serif';
        ctx.fillText(
          `Vendor: ${
            item.vendorPenyedia.length > 30
              ? `${item.vendorPenyedia.slice(0, 28)}...`
              : item.vendorPenyedia
          }`,
          infoX + 8,
          metaBoxY + 72,
          maxInfoW - 16
        );
      }

      // Outer Card Border according to stickerConfig.borderStyle
      ctx.save();
      if (stickerConfig.borderStyle === 'SOLID_BOLD_BI') {
        ctx.strokeStyle = '#002B66';
        ctx.lineWidth = 4;
        ctx.setLineDash([]);
        ctx.strokeRect(x, y, cardW, cardH);
      } else if (stickerConfig.borderStyle === 'DASHED_CUTLINE') {
        ctx.strokeStyle = '#64748B';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([10, 6]);
        ctx.strokeRect(x, y, cardW, cardH);
      } else if (stickerConfig.borderStyle === 'SOLID_MINIMAL') {
        ctx.strokeStyle = '#CBD5E1';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([]);
        ctx.strokeRect(x, y, cardW, cardH);
      }
      ctx.restore();
    }

    return canvas;
  };

  /**
   * Builds a multi-page A4 Portrait PDF 1.4 binary Blob (210mm × 297mm = 595.28 × 841.89 pt)
   * directly from an array of rendered A4 page canvases with zero external dependencies.
   */
  const buildMultiPageA4PdfBlob = (canvases: HTMLCanvasElement[]): Blob => {
    const pageWidthPt = 595.28;
    const pageHeightPt = 841.89;
    const encoder = new TextEncoder();

    const pageData = canvases.map(canvas => {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const base64 = dataUrl.split(',')[1] || '';
      const binStr = atob(base64);
      const bytes = new Uint8Array(binStr.length);
      for (let i = 0; i < binStr.length; i++) {
        bytes[i] = binStr.charCodeAt(i);
      }
      return {
        bytes,
        width: canvas.width,
        height: canvas.height
      };
    });

    const numPages = pageData.length;
    const totalObjects = 2 + numPages * 3;
    const offsets: number[] = new Array(totalObjects + 1).fill(0);
    const chunks: Uint8Array[] = [];
    let currentOffset = 0;

    const pushString = (str: string) => {
      const bytes = encoder.encode(str);
      chunks.push(bytes);
      currentOffset += bytes.length;
    };

    const pushBytes = (bytes: Uint8Array) => {
      chunks.push(bytes);
      currentOffset += bytes.length;
    };

    // PDF Header
    pushString('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');

    // 1 0 obj (Catalog)
    offsets[1] = currentOffset;
    pushString('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

    // 2 0 obj (Pages)
    const kidsRefs = pageData.map((_, i) => `${3 + i * 3} 0 R`).join(' ');
    offsets[2] = currentOffset;
    pushString(
      `2 0 obj\n<< /Type /Pages /Kids [ ${kidsRefs} ] /Count ${numPages} >>\nendobj\n`
    );

    // Each Page + Content Stream + Image XObject
    for (let i = 0; i < numPages; i++) {
      const pageObjId = 3 + i * 3;
      const contentObjId = 4 + i * 3;
      const imageObjId = 5 + i * 3;
      const img = pageData[i];

      // Page Object
      offsets[pageObjId] = currentOffset;
      pushString(
        `${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidthPt} ${pageHeightPt}] /Resources << /XObject << /Im${i} ${imageObjId} 0 R >> >> /Contents ${contentObjId} 0 R >>\nendobj\n`
      );

      // Content Stream (draws the image scaled to full A4 page)
      const contentStream = `q\n${pageWidthPt} 0 0 ${pageHeightPt} 0 0 cm\n/Im${i} Do\nQ\n`;
      const contentBytes = encoder.encode(contentStream);
      offsets[contentObjId] = currentOffset;
      pushString(
        `${contentObjId} 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`
      );
      pushBytes(contentBytes);
      pushString('\nendstream\nendobj\n');

      // JPEG Image XObject
      offsets[imageObjId] = currentOffset;
      pushString(
        `${imageObjId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.bytes.length} >>\nstream\n`
      );
      pushBytes(img.bytes);
      pushString('\nendstream\nendobj\n');
    }

    // XRef Table
    const xrefOffset = currentOffset;
    pushString(`xref\n0 ${totalObjects + 1}\n`);
    pushString('0000000000 65535 f \n');
    for (let objId = 1; objId <= totalObjects; objId++) {
      const padded = String(offsets[objId]).padStart(10, '0');
      pushString(`${padded} 00000 n \n`);
    }

    // Trailer
    pushString(
      `trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
    );

    return new Blob(chunks as BlobPart[], { type: 'application/pdf' });
  };

  /**
   * Generates & Downloads a Multi-Page A4 Portrait PDF (3×6 Stickers per A4 Sheet)
   * and triggers print dialog when supported by the browser environment.
   */
  const handlePrintA4Pdf = async () => {
    if (expandedStickerInstances.length === 0 || isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    setPdfSavedMessage('');

    try {
      const qrMap = new Map<string, string>();
      for (const inst of expandedStickerInstances) {
        const effectiveQrIdx =
          inst.customUnitMeta?.globalUnitIndex || inst.copyIndex;
        const effectiveQrTotal = Math.max(inst.totalCopies, effectiveQrIdx);
        const key = `${inst.item.id}::${effectiveQrIdx}::${effectiveQrTotal}`;
        if (!qrMap.has(key)) {
          const url = await StorageService.generateUnitQrCodeDataUrl(
            inst.item,
            effectiveQrIdx,
            effectiveQrTotal
          );
          qrMap.set(key, url);
        }
      }

      // Render every A4 page (18 stickers per page) onto a high-res A4 canvas
      const pageCanvases: HTMLCanvasElement[] = [];
      for (const pageInstances of pages) {
        const pageCanvas = await renderA4SheetToCanvas(pageInstances, qrMap);
        pageCanvases.push(pageCanvas);
      }

      // Build valid multi-page A4 Portrait PDF and trigger direct file download
      const pdfBlob = buildMultiPageA4PdfBlob(pageCanvases);
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const fileName = `Stiker_QR_EPML_BI_Jatim_A4_${expandedStickerInstances.length}_Stiker_${totalPages}_Hal.pdf`;

      const downloadLink = document.createElement('a');
      downloadLink.href = pdfUrl;
      downloadLink.download = fileName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      setTimeout(() => URL.revokeObjectURL(pdfUrl), 60000);

      setPdfSavedMessage(
        `File PDF A4 (${expandedStickerInstances.length} Stiker Unit Unik • ${totalPages} Halaman) berhasil diunduh: ${fileName}`
      );
      setTimeout(() => {
        setPdfSavedMessage('');
      }, 8000);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  /**
   * High-Resolution A4 Sheet Image Download (3x6 Stickers on A4 Portrait Canvas)
   */
  const handleDownloadCurrentSheetImage = async () => {
    setIsGeneratingCanvas(true);
    try {
      const qrMap = new Map<string, string>();
      for (const inst of currentPageInstances) {
        const effectiveQrIdx =
          inst.customUnitMeta?.globalUnitIndex || inst.copyIndex;
        const effectiveQrTotal = Math.max(inst.totalCopies, effectiveQrIdx);
        const key = `${inst.item.id}::${effectiveQrIdx}::${effectiveQrTotal}`;
        if (!qrMap.has(key)) {
          const url = await StorageService.generateUnitQrCodeDataUrl(
            inst.item,
            effectiveQrIdx,
            effectiveQrTotal
          );
          qrMap.set(key, url);
        }
      }
      const canvas = await renderA4SheetToCanvas(currentPageInstances, qrMap);
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `Lembar_Stiker_QR_EPML_A4_Hal_${safePage}.png`;
      link.click();
    } finally {
      setIsGeneratingCanvas(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="relative w-full max-w-[1360px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[94vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Top Modal Header — Clean Single Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#002B66] text-white flex items-center justify-center shadow-xs border-b-2 border-emerald-500 shrink-0">
              <Printer className="w-5 h-5 text-emerald-300" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 truncate">
                  Cetak Stiker QR Bantuan EPML — Ukuran A4 Potrait (3×6)
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold shrink-0">
                  Presisi 64mm × 45mm (18 Stiker / A4)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Desain Resmi Biru-Putih-Hijau &bull; Label &ldquo;Bantuan EPML dari Bank Indonesia&rdquo; &bull; {filterSummaryText || 'Siap Cetak'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Summary Pill */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                Total:{' '}
                <strong className="font-extrabold text-slate-900 dark:text-white tabular-nums">
                  {expandedStickerInstances.length} Stiker
                </strong>{' '}
                ({totalPages} Lembar A4)
              </span>
            </div>

            <button
              type="button"
              onClick={handleDownloadCurrentSheetImage}
              disabled={isGeneratingCanvas || expandedStickerInstances.length === 0}
              className="h-9 px-3.5 rounded-xl border border-emerald-600 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-xs font-bold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>
                {isGeneratingCanvas ? 'Menyiapkan...' : `Unduh PNG A4 (Hal ${safePage})`}
              </span>
            </button>

            <button
              type="button"
              onClick={handlePrintA4Pdf}
              disabled={isGeneratingPdf || expandedStickerInstances.length === 0}
              className="h-9 px-4 rounded-xl bg-linear-to-r from-[#002B66] to-emerald-700 hover:from-blue-900 hover:to-emerald-600 text-white text-xs font-bold inline-flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              <Printer className={`w-4 h-4 text-emerald-200 ${isGeneratingPdf ? 'animate-pulse' : ''}`} />
              <span>
                {isGeneratingPdf
                  ? `Menyiapkan PDF A4 (${totalPages} Hal)...`
                  : `Cetak / Simpan PDF A4 (${expandedStickerInstances.length} Stiker)`}
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              title="Tutup Modal Cetak"
              className="w-9 h-9 rounded-xl inline-flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Confirmation Banner when PDF is generated & downloaded */}
        {pdfSavedMessage && (
          <div className="px-5 py-2 bg-emerald-600 text-white text-xs font-bold flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
              <span>{pdfSavedMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setPdfSavedMessage('')}
              className="text-emerald-100 hover:text-white text-[11px] underline cursor-pointer"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Main Split Workspace: Left Control Sidebar + Right Full-Height A4 Preview */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
          {/* LEFT SIDEBAR: Single Sticker Preview, Filter Jenis Barang & Quantity, Multi-Copy Controls & Design Config */}
          <aside className="w-full lg:w-[410px] xl:w-[435px] shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 overflow-y-auto p-4 space-y-3.5">
            {/* 1. Single Sticker High-Res Inspector Card + Search Engine & Recipient Mode Selector */}
            {previewItem && (
              <div className="rounded-xl overflow-hidden border border-blue-900/20 dark:border-slate-700 bg-linear-to-br from-slate-900 via-[#001F4D] to-emerald-950 text-white p-3.5 space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-300">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Pratinjau Stiker QR (64mm × 45mm)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadSingleStickerPng(previewItem)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[10px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Unduh Label PNG</span>
                  </button>
                </div>

                {/* Search Engine + Dropdown Selector for Recipient / (Cetak Semua) */}
                {items.length > 1 && (
                  <div className="space-y-2">
                    {/* Search Engine Bar for Dropdown Options */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-emerald-300/80 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={recipientSearchQuery}
                        onFocus={() => setIsSearchListOpen(true)}
                        onBlur={() => {
                          setTimeout(() => setIsSearchListOpen(false), 180);
                        }}
                        onChange={e => {
                          const val = e.target.value;
                          setRecipientSearchQuery(val);
                          setIsSearchListOpen(true);
                          setCurrentPage(1);
                        }}
                        placeholder="Cari opsi (ID, Nama Lembaga, Kab/Kota, Item)..."
                        className="w-full h-8 pl-8 pr-16 rounded-lg bg-slate-950/60 border border-white/20 focus:border-emerald-400 text-white placeholder:text-slate-400 text-[11px] font-medium focus:outline-none transition-colors"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {recipientSearchQuery ? (
                          <button
                            type="button"
                            onClick={() => {
                              setRecipientSearchQuery('');
                              setCurrentPage(1);
                            }}
                            title="Hapus pencarian"
                            className="p-0.5 rounded bg-white/10 hover:bg-white/20 text-slate-200 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        ) : null}
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[9px] font-bold tabular-nums">
                          {dropdownOptionsItems.length} Opsi
                        </span>
                      </div>

                      {/* Instant Search Engine Results Popover when typing */}
                      {isSearchListOpen && recipientSearchQuery.trim().length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 z-30 max-h-52 overflow-y-auto rounded-xl bg-slate-900 border border-emerald-500/40 shadow-2xl divide-y divide-slate-800 text-xs">
                          <button
                            type="button"
                            onMouseDown={e => {
                              e.preventDefault();
                              setSelectedPreviewId('ALL');
                              setIsSearchListOpen(false);
                              setCurrentPage(1);
                            }}
                            className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 hover:bg-emerald-950/80 transition-colors cursor-pointer ${
                              selectedPreviewId === 'ALL'
                                ? 'bg-emerald-950/90 text-emerald-300 font-extrabold'
                                : 'text-slate-200 font-semibold'
                            }`}
                          >
                            <span>
                              (Cetak Semua Hasil Cari) — {dropdownOptionsItems.length} Penerima
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                              Semua
                            </span>
                          </button>

                          {dropdownOptionsItems.length === 0 ? (
                            <div className="px-3 py-3 text-center text-[11px] text-slate-400">
                              Tidak ditemukan penerima untuk kata kunci &ldquo;{recipientSearchQuery}&rdquo;
                            </div>
                          ) : (
                            dropdownOptionsItems.map(it => (
                              <button
                                key={it.id}
                                type="button"
                                onMouseDown={e => {
                                  e.preventDefault();
                                  setSelectedPreviewId(it.id);
                                  setInspectedItemId(it.id);
                                  setBulkOverrideCopiesMap(prev => {
                                    const next = { ...prev };
                                    delete next[it.id];
                                    return next;
                                  });
                                  setIsSearchListOpen(false);
                                  setCurrentPage(1);
                                }}
                                className={`w-full px-3 py-2 text-left hover:bg-blue-950/80 transition-colors cursor-pointer ${
                                  selectedPreviewId === it.id
                                    ? 'bg-blue-950 text-emerald-300 font-bold'
                                    : 'text-white'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-mono text-[10px] text-emerald-300 font-bold">
                                    {it.id}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {it.kabupatenKota.replace('Kabupaten ', 'Kab. ')} &bull; {it.tahun}
                                  </span>
                                </div>
                                <div className="text-[11px] font-semibold truncate mt-0.5">
                                  {it.namaPenerima}
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {/* Dropdown Option with Default "(Cetak Semua)" + Filtered Recipients */}
                    <div className="flex items-center gap-1.5">
                      <select
                        value={
                          selectedPreviewId !== 'ALL' &&
                          !dropdownOptionsItems.some(i => i.id === selectedPreviewId)
                            ? 'ALL'
                            : selectedPreviewId
                        }
                        onChange={e => {
                          const val = e.target.value;
                          setSelectedPreviewId(val);
                          if (val !== 'ALL') {
                            setInspectedItemId(val);
                            // Clear bulk override so selecting an ID Penerima immediately shows its actual items & quantities
                            setBulkOverrideCopiesMap(prev => {
                              const next = { ...prev };
                              delete next[val];
                              return next;
                            });
                          }
                          setCurrentPage(1);
                        }}
                        className="flex-1 min-w-0 h-8.5 px-2.5 rounded-lg bg-white/12 border border-white/25 hover:border-emerald-400/60 text-white text-xs font-bold focus:outline-none cursor-pointer"
                      >
                        <option value="ALL" className="text-slate-900 font-extrabold">
                          (Cetak Semua) — {dropdownOptionsItems.length} Data Penerima Bantuan
                        </option>
                        {dropdownOptionsItems.map(it => (
                          <option key={it.id} value={it.id} className="text-slate-900">
                            {it.id} — {it.namaPenerima} ({getTotalBarangUnits(it)} Unit)
                          </option>
                        ))}
                      </select>

                      {selectedPreviewId !== 'ALL' && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPreviewId('ALL');
                            setCurrentPage(1);
                          }}
                          title="Kembali ke mode (Cetak Semua) di lembar A4"
                          className="h-8.5 px-2.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 text-[10px] font-extrabold shrink-0 cursor-pointer transition-colors"
                        >
                          Cetak Semua
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Dedicated Fixed-Height Wrapper so Sticker Card Never Overflows */}
                <div className="w-full">
                  <QrStickerDesignCard
                    item={previewItem}
                    compact={false}
                    config={stickerConfig}
                    copyIndex={previewInstanceForTarget?.copyIndex || 1}
                    totalCopies={previewInstanceForTarget?.totalCopies || activeTargetCopies}
                    showUnitSequence={showUnitSequence}
                    customUnitMeta={previewInstanceForTarget?.customUnitMeta}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-emerald-300/90 font-mono pt-0.5">
                  <span className="inline-flex items-center gap-1">
                    <Ruler className="w-3 h-3" /> Ukuran: 64mm × 45mm
                  </span>
                  <span className="truncate max-w-[230px]">
                    {selectedPreviewId === 'ALL'
                      ? `Mode: (Cetak Semua • ${activeSheetItems.length} Lembaga)`
                      : activeSelectedCatalogItem
                      ? `Item: ${activeSelectedCatalogItem.namaBarang}`
                      : `Mode: Semua Item (${previewItem.id})`}
                  </span>
                </div>
              </div>
            )}

            {/* 1B. NEW: Filter Cetak Berdasarkan Jenis Barang & Quantity Item Bantuan (Right Above Jumlah Cetak Stiker) */}
            {activeTargetItem && (
              <div className="bg-white dark:bg-slate-800/90 p-3.5 rounded-xl border border-blue-200 dark:border-blue-800/70 shadow-2xs space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#002B66] dark:text-blue-300">
                      <Filter className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Filter Jenis Barang &amp; Kuantitas Bantuan</span>
                    </div>
                    <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      Penerima:{' '}
                      <strong className="text-slate-700 dark:text-slate-200">
                        {activeTargetItem.id}
                      </strong>{' '}
                      &bull; {activeTargetItem.namaPenerima}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-[#002B66] dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px] font-extrabold shrink-0">
                    {activeTargetCatalog.length} Jenis &bull;{' '}
                    {getTotalBarangUnits(activeTargetItem)} Unit
                  </span>
                </div>

                {/* Global Jenis Barang & Quantity Filter when in (Cetak Semua) mode */}
                {items.length > 1 && selectedPreviewId === 'ALL' && (
                  <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                    <div>
                      <label className="block text-[9.5px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                        Filter Jenis Barang:
                      </label>
                      <select
                        value={topJenisBarangFilter}
                        onChange={e => {
                          setTopJenisBarangFilter(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-[11px] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                      >
                        <option value="ALL">Semua Jenis Barang</option>
                        {availableJenisBarangOptions.map(j => (
                          <option key={j} value={j}>
                            {j}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9.5px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                        Filter Quantity Unit:
                      </label>
                      <select
                        value={topQtyFilter}
                        onChange={e => {
                          setTopQtyFilter(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-[11px] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                      >
                        <option value="ALL">Semua Quantity</option>
                        <option value="SINGLE">1 Unit (Satuan)</option>
                        <option value="MULTI">&gt; 1 Unit (Multi-Barang)</option>
                        <option value="QTY_2_5">2 s/d 5 Unit</option>
                        <option value="QTY_GT_5">&gt; 5 Unit</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Dropdown Pilih Barang Item Bantuan yang Dicetak untuk Penerima Ini */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Pilih Item Bantuan yang Dicetak ({activeTargetItem.id}):
                  </label>
                  <select
                    value={activeSelectedCatalogItemId}
                    onChange={e => {
                      const val = e.target.value;
                      setSelectedPreviewId(activeTargetItem.id);
                      setInspectedItemId(activeTargetItem.id);
                      setSelectedCatalogItemFilter(prev => ({
                        ...prev,
                        [activeTargetItem.id]: val
                      }));
                      setBulkOverrideCopiesMap(prev => {
                        const next = { ...prev };
                        delete next[activeTargetItem.id];
                        return next;
                      });
                      setCurrentPage(1);
                    }}
                    className="w-full h-8.5 px-2.5 rounded-lg border border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-slate-900 text-xs font-bold text-[#002B66] dark:text-emerald-300 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL_ITEMS">
                      Semua Item Bantuan Penerima Ini ({activeTargetCatalog.length} Jenis &bull;{' '}
                      {activeTargetCatalog.reduce(
                        (s, c) => s + getCatalogItemPrintQty(c.itemId, c.qty),
                        0
                      )}{' '}
                      Stiker)
                    </option>
                    {activeTargetCatalog.map((cat, idx) => {
                      const pQty = getCatalogItemPrintQty(cat.itemId, cat.qty);
                      return (
                        <option key={cat.itemId} value={cat.itemId}>
                          Item #{idx + 1}: {cat.namaBarang} — Cetak {pQty} {cat.satuan} (Bantuan:{' '}
                          {cat.qty} {cat.satuan})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Clickable List of Assisted Items & Their Quantities */}
                <div className="space-y-1.5 pt-0.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    <span>Rincian Barang &amp; Jumlah Cetak (Klik untuk Preview):</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPreviewId(activeTargetItem.id);
                        setInspectedItemId(activeTargetItem.id);
                        setSelectedCatalogItemFilter(prev => ({
                          ...prev,
                          [activeTargetItem.id]: 'ALL_ITEMS'
                        }));
                        setCatalogItemPrintQtyMap(prev => {
                          const next = { ...prev };
                          activeTargetCatalog.forEach(c => {
                            next[c.itemId] = Math.max(1, Number(c.qty) || 1);
                          });
                          return next;
                        });
                        setBulkOverrideCopiesMap(prev => {
                          const next = { ...prev };
                          delete next[activeTargetItem.id];
                          return next;
                        });
                        setCurrentPage(1);
                      }}
                      className="text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer font-bold"
                      title="Reset semua item ke jumlah bantuan asli"
                    >
                      Sesuaikan Qty Asli
                    </button>
                  </div>

                  {/* Option 0: Cetak Semua Jenis Barang milik Penerima Ini */}
                  {activeTargetCatalog.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPreviewId(activeTargetItem.id);
                        setInspectedItemId(activeTargetItem.id);
                        setSelectedCatalogItemFilter(prev => ({
                          ...prev,
                          [activeTargetItem.id]: 'ALL_ITEMS'
                        }));
                        setBulkOverrideCopiesMap(prev => {
                          const next = { ...prev };
                          delete next[activeTargetItem.id];
                          return next;
                        });
                        setCurrentPage(1);
                      }}
                      className={`w-full px-2.5 py-2 rounded-lg border text-left transition-all flex items-center justify-between gap-2 cursor-pointer ${
                        activeSelectedCatalogItemId === 'ALL_ITEMS' &&
                        selectedPreviewId === activeTargetItem.id
                          ? 'bg-[#002B66] text-white border-[#002B66] shadow-2xs'
                          : 'bg-slate-50 dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="block text-[11px] font-extrabold truncate">
                          Semua Jenis Barang Bantuan ({activeTargetCatalog.length} Item)
                        </span>
                        <span
                          className={`block text-[9.5px] truncate ${
                            activeSelectedCatalogItemId === 'ALL_ITEMS' &&
                            selectedPreviewId === activeTargetItem.id
                              ? 'text-emerald-300'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {activeTargetCatalog.map(c => `${c.namaBarang} (${getCatalogItemPrintQty(c.itemId, c.qty)})`).join(' + ')}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold shrink-0 tabular-nums ${
                          activeSelectedCatalogItemId === 'ALL_ITEMS' &&
                          selectedPreviewId === activeTargetItem.id
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        }`}
                      >
                        {activeTargetCatalog.reduce(
                          (s, c) => s + getCatalogItemPrintQty(c.itemId, c.qty),
                          0
                        )}{' '}
                        Stiker
                      </span>
                    </button>
                  )}

                  {/* Option 1..N: Individual Catalog Items with Click-to-Preview & Quantity Stepper */}
                  {activeTargetCatalog.map((cat, idx) => {
                    const isItemSelected =
                      activeSelectedCatalogItemId === cat.itemId &&
                      selectedPreviewId === activeTargetItem.id;
                    const itemPrintQty = getCatalogItemPrintQty(cat.itemId, cat.qty);
                    const cleanSatuan =
                      cat.satuan ||
                      StorageService.normalizeSatuanLabel(activeTargetItem.satuan);

                    return (
                      <div
                        key={cat.itemId}
                        onClick={() => {
                          setSelectedPreviewId(activeTargetItem.id);
                          setInspectedItemId(activeTargetItem.id);
                          setSelectedCatalogItemFilter(prev => ({
                            ...prev,
                            [activeTargetItem.id]: cat.itemId
                          }));
                          setBulkOverrideCopiesMap(prev => {
                            const next = { ...prev };
                            delete next[activeTargetItem.id];
                            return next;
                          });
                          setCurrentPage(1);
                        }}
                        className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                          isItemSelected
                            ? 'bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-600 ring-1 ring-emerald-500/40'
                            : 'bg-slate-50/80 dark:bg-slate-900/70 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase shrink-0 ${
                                  isItemSelected
                                    ? 'bg-emerald-700 text-white'
                                    : 'bg-[#002B66]/10 dark:bg-blue-950 text-[#002B66] dark:text-blue-300'
                                }`}
                              >
                                Item #{idx + 1}
                              </span>
                              <span className="font-mono text-[9.5px] font-bold text-slate-500 dark:text-slate-400 truncate">
                                {cat.kodeQrRange || cat.kodeQrUnit}
                              </span>
                            </div>
                            <p className="text-[11.5px] font-extrabold text-slate-900 dark:text-slate-100 leading-snug mt-0.5">
                              {cat.namaBarang}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                              Jenis: <strong className="text-slate-700 dark:text-slate-300">{cat.jenisBarang}</strong> &bull; Qty Bantuan:{' '}
                              <strong className="text-emerald-700 dark:text-emerald-400">
                                {cat.qty} {cleanSatuan}
                              </strong>
                            </p>
                          </div>

                          {/* Per-Item Quantity Stepper (stops propagation so user can adjust qty directly) */}
                          <div
                            className="flex flex-col items-end gap-1 shrink-0"
                            onClick={e => e.stopPropagation()}
                          >
                            <div className="inline-flex items-center rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPreviewId(activeTargetItem.id);
                                  setInspectedItemId(activeTargetItem.id);
                                  setCatalogItemPrintQty(
                                    activeTargetItem.id,
                                    cat.itemId,
                                    itemPrintQty - 1
                                  );
                                }}
                                disabled={itemPrintQty <= 1}
                                className="w-6 h-6 inline-flex items-center justify-center text-xs font-extrabold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                                title="Kurangi jumlah stiker item ini"
                              >
                                &minus;
                              </button>
                              <input
                                type="number"
                                min={1}
                                max={500}
                                value={itemPrintQty}
                                onChange={e => {
                                  setSelectedPreviewId(activeTargetItem.id);
                                  setInspectedItemId(activeTargetItem.id);
                                  setCatalogItemPrintQty(
                                    activeTargetItem.id,
                                    cat.itemId,
                                    parseInt(e.target.value, 10) || 1
                                  );
                                }}
                                className="w-9 h-6 text-center text-[11px] font-extrabold text-[#002B66] dark:text-emerald-300 bg-transparent focus:outline-none tabular-nums"
                                title="Jumlah stiker yang dicetak untuk item ini"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPreviewId(activeTargetItem.id);
                                  setInspectedItemId(activeTargetItem.id);
                                  setCatalogItemPrintQty(
                                    activeTargetItem.id,
                                    cat.itemId,
                                    itemPrintQty + 1
                                  );
                                }}
                                className="w-6 h-6 inline-flex items-center justify-center text-xs font-extrabold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                title="Tambah jumlah stiker item ini"
                              >
                                +
                              </button>
                            </div>
                            <span
                              className={`text-[9.5px] font-bold ${
                                isItemSelected
                                  ? 'text-emerald-700 dark:text-emerald-300'
                                  : 'text-blue-800 dark:text-blue-300'
                              }`}
                            >
                              {isItemSelected
                                ? `Aktif (${itemPrintQty} Stiker)`
                                : `Klik Preview (${itemPrintQty}x)`}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Multi-Copy Quantity Card (Jumlah Cetak Stiker per Barang Bantuan) */}
            {activeTargetItem && (
              <div className="bg-white dark:bg-slate-800/90 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/70 shadow-2xs space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900 dark:text-slate-100">
                      <Layers className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Jumlah Cetak Stiker</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {activeSelectedCatalogItem
                        ? `${activeSelectedCatalogItem.namaBarang} (${activeTargetItem.id})`
                        : `${activeTargetItem.id} • ${activeTargetItem.namaPenerima}`}
                    </p>
                  </div>

                  {/* Stepper - / Input / + */}
                  <div className="inline-flex items-center rounded-lg border border-emerald-300 dark:border-emerald-700 bg-slate-50 dark:bg-slate-900 overflow-hidden shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setCopiesForItem(activeTargetItem.id, activeTargetCopies - 1)
                      }
                      disabled={activeTargetCopies <= 1}
                      className="w-8 h-8 inline-flex items-center justify-center text-sm font-extrabold text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                      title="Kurangi 1 stiker"
                    >
                      &minus;
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={activeTargetCopies}
                      onChange={e =>
                        setCopiesForItem(
                          activeTargetItem.id,
                          parseInt(e.target.value, 10) || 1
                        )
                      }
                      className="w-12 h-8 text-center text-xs font-extrabold text-[#002B66] dark:text-emerald-300 bg-white dark:bg-slate-950 border-x border-emerald-200 dark:border-emerald-800 focus:outline-none tabular-nums"
                      title="Jumlah stiker yang dicetak untuk ditempel di setiap barang"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setCopiesForItem(activeTargetItem.id, activeTargetCopies + 1)
                      }
                      className="w-8 h-8 inline-flex items-center justify-center text-sm font-extrabold text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer"
                      title="Tambah 1 stiker"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Proportional 3-Column Quick Presets */}
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCopiesForItem(activeTargetItem.id, 1)}
                    className={`h-8 px-2 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                      activeTargetCopies === 1
                        ? 'bg-[#002B66] text-white border-[#002B66]'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    1 Stiker
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setCopiesForItem(
                        activeTargetItem.id,
                        activeTargetRecommendedQty
                      )
                    }
                    className={`h-8 px-2 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer truncate ${
                      activeTargetCopies === activeTargetRecommendedQty &&
                      activeTargetRecommendedQty > 1
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100'
                    }`}
                    title={`Sesuai total unit barang (${activeTargetRecommendedQty} Stiker)`}
                  >
                    QTY ({activeTargetRecommendedQty}x)
                  </button>

                  <button
                    type="button"
                    onClick={() => setCopiesForItem(activeTargetItem.id, 3)}
                    className={`h-8 px-2 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                      activeTargetCopies === 3
                        ? 'bg-[#002B66] text-white border-[#002B66]'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    3x (1 Baris)
                  </button>

                  <button
                    type="button"
                    onClick={() => setCopiesForItem(activeTargetItem.id, 9)}
                    className={`h-8 px-2 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                      activeTargetCopies === 9
                        ? 'bg-[#002B66] text-white border-[#002B66]'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    9x (1/2 A4)
                  </button>

                  <button
                    type="button"
                    onClick={() => setCopiesForItem(activeTargetItem.id, 18)}
                    className={`h-8 px-2 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                      activeTargetCopies === 18
                        ? 'bg-[#002B66] text-white border-[#002B66]'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    18x (1 A4)
                  </button>

                  <button
                    type="button"
                    onClick={() => setCopiesForItem(activeTargetItem.id, 36)}
                    className={`h-8 px-2 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                      activeTargetCopies === 36
                        ? 'bg-[#002B66] text-white border-[#002B66]'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    36x (2 A4)
                  </button>
                </div>

                {filteredStickerItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const nextMap: Record<string, number> = {};
                      const nextItemQtyMap: Record<string, number> = {};
                      filteredStickerItems.forEach(it => {
                        nextMap[it.id] = getTotalBarangUnits(it);
                        const catList = StorageService.extractItemCatalogForBantuan(it);
                        catList.forEach(c => {
                          nextItemQtyMap[c.itemId] = Math.max(1, Number(c.qty) || 1);
                        });
                      });
                      setCopiesMap(nextMap);
                      setCatalogItemPrintQtyMap(prev => ({
                        ...prev,
                        ...nextItemQtyMap
                      }));
                      setBulkOverrideCopiesMap({});
                      setCurrentPage(1);
                    }}
                    className="w-full h-8 px-3 rounded-lg text-[11px] font-bold bg-[#002B66] hover:bg-blue-900 text-white transition-colors cursor-pointer"
                  >
                    Set Semua Penerima Sesuai QTY Barang
                  </button>
                )}

                {/* Toggle Nomor Urut Unit Barang */}
                <label className="flex items-center justify-between gap-2 cursor-pointer select-none text-[11px] font-semibold text-slate-700 dark:text-slate-200 bg-emerald-50/70 dark:bg-emerald-950/40 px-3 py-2 rounded-lg border border-emerald-200/80 dark:border-emerald-800/60">
                  <span>Tampilkan Label Nomor Unit (Unit 1/{activeTargetCopies > 1 ? activeTargetCopies : 'N'})</span>
                  <input
                    type="checkbox"
                    checked={showUnitSequence}
                    onChange={e => setShowUnitSequence(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600 cursor-pointer"
                  />
                </label>
              </div>
            )}

            {/* 3. Konfigurasi Desain, Border & Metadata Stiker */}
            <div className="bg-white dark:bg-slate-800/90 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 font-extrabold text-slate-800 dark:text-slate-100">
                  <Settings2 className="w-3.5 h-3.5 text-[#002B66] dark:text-blue-400" />
                  <span>Desain, Border & Metadata</span>
                </div>
                <button
                  type="button"
                  onClick={() => setStickerConfig(DEFAULT_STICKER_CONFIG)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Desain Visual Label QR:
                  </label>
                  <select
                    value={stickerConfig.visualTemplate}
                    onChange={e =>
                      setStickerConfig(prev => ({
                        ...prev,
                        visualTemplate: e.target.value as StickerVisualTemplate
                      }))
                    }
                    className="w-full h-8.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-medium"
                  >
                    <option value="MODERN_BI_SPLIT">
                      Desain Baru BI Split + Frame QR (Resmi)
                    </option>
                    <option value="GRADIENT_RIBBON">
                      Desain Pita Gradasi Biru-Hijau BI
                    </option>
                    <option value="FORMAL_GRID">
                      Desain Formal Institusional Minimalis
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Gaya Border Stiker:
                  </label>
                  <select
                    value={stickerConfig.borderStyle}
                    onChange={e =>
                      setStickerConfig(prev => ({
                        ...prev,
                        borderStyle: e.target.value as StickerBorderStyle
                      }))
                    }
                    className="w-full h-8.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-medium"
                  >
                    <option value="SOLID_MINIMAL">
                      Border Solid Minimalis (Tanpa Garis Potong)
                    </option>
                    <option value="SOLID_BOLD_BI">
                      Border Tebal Biru Resmi BI (#002B66)
                    </option>
                    <option value="DASHED_CUTLINE">
                      Garis Panduan Potong Putus-Putus (Dashed)
                    </option>
                    <option value="BORDERLESS">
                      Tanpa Border (Kertas Label Die-Cut)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Metadata Tambahan Footer Hijau:
                  </label>
                  <select
                    value={stickerConfig.footerMetaMode}
                    onChange={e =>
                      setStickerConfig(prev => ({
                        ...prev,
                        footerMetaMode: e.target.value as StickerFooterMetaMode
                      }))
                    }
                    className="w-full h-8.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-medium"
                  >
                    <option value="DEFAULT">Standar (&ldquo;QR Informasi Penerima&rdquo;)</option>
                    <option value="VENDOR">Nama Vendor Pengadaan</option>
                    <option value="PILAR_TAHAP">Pilar EPML & Tahap Penyaluran</option>
                    <option value="PIC_ASESMEN">Nama PIC Asesmen BI</option>
                    <option value="KONDISI_FISIK">Status Kondisi Fisik Barang</option>
                    <option value="CUSTOM_TEXT">Teks Kustom / Catatan Inventaris</option>
                  </select>
                </div>

                <div>
                  {stickerConfig.footerMetaMode === 'CUSTOM_TEXT' ? (
                    <>
                      <label className="block text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                        Teks Footer Kustom:
                      </label>
                      <input
                        type="text"
                        value={stickerConfig.customFooterText}
                        onChange={e =>
                          setStickerConfig(prev => ({
                            ...prev,
                            customFooterText: e.target.value
                          }))
                        }
                        placeholder="Contoh: Inventaris Bantuan BI Jatim"
                        className="w-full h-8.5 px-2.5 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs"
                      />
                    </>
                  ) : (
                    <>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Sub-Label Header Biru:
                      </label>
                      <input
                        type="text"
                        value={stickerConfig.headerSubtitle}
                        onChange={e =>
                          setStickerConfig(prev => ({
                            ...prev,
                            headerSubtitle: e.target.value
                          }))
                        }
                        placeholder="KPw Bank Indonesia Provinsi Jawa Timur"
                        className="w-full h-8.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs"
                      />
                    </>
                  )}
                </div>

                <label className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 cursor-pointer select-none">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                    Tampilkan Baris Vendor di Body Putih
                  </span>
                  <input
                    type="checkbox"
                    checked={stickerConfig.showVendorInBody}
                    onChange={e =>
                      setStickerConfig(prev => ({
                        ...prev,
                        showVendorInBody: e.target.checked
                      }))
                    }
                    className="w-4 h-4 rounded border-slate-300 text-[#002B66] focus:ring-blue-600 cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* 4. Filter Batch Cetak (Only shown when printing multiple recipients) */}
            {items.length > 1 && (
              <div className="bg-white dark:bg-slate-800/90 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-extrabold text-slate-800 dark:text-slate-100">
                    <Filter className="w-3.5 h-3.5 text-[#002B66] dark:text-blue-400" />
                    <span>Filter Batch Penerima</span>
                  </div>
                  {(modalYearFilter !== 'ALL' ||
                    modalKabFilter !== 'ALL' ||
                    modalKategoriFilter !== 'ALL' ||
                    topJenisBarangFilter !== 'ALL' ||
                    topQtyFilter !== 'ALL') && (
                    <button
                      type="button"
                      onClick={() => {
                        setModalYearFilter('ALL');
                        setModalKabFilter('ALL');
                        setModalKategoriFilter('ALL');
                        setTopJenisBarangFilter('ALL');
                        setTopQtyFilter('ALL');
                        setCurrentPage(1);
                      }}
                      className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                    >
                      Reset Filter
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <select
                    value={modalYearFilter}
                    onChange={e => {
                      setModalYearFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-8.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200"
                  >
                    <option value="ALL">Semua Tahun</option>
                    {availableYears.map(yr => (
                      <option key={yr} value={yr.toString()}>
                        Tahun {yr}
                      </option>
                    ))}
                  </select>

                  <select
                    value={modalKabFilter}
                    onChange={e => {
                      setModalKabFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-8.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200"
                  >
                    <option value="ALL">Semua Lokasi (13 Kab/Kota)</option>
                    {WILAYAH_KERJA_KPW_JATIM.map(w => (
                      <option key={w} value={w}>
                        {w.replace('Kabupaten ', 'Kab. ')}
                      </option>
                    ))}
                  </select>

                  <select
                    value={modalKategoriFilter}
                    onChange={e => {
                      setModalKategoriFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-8.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200"
                  >
                    <option value="ALL">Semua Kategori Lembaga</option>
                    <option value="Sekolah / SMK / Vokasi">Sekolah / SMK / Vokasi</option>
                    <option value="Pondok Pesantren / Yayasan">
                      Pondok Pesantren / Yayasan
                    </option>
                    <option value="UMKM / Koperasi / Kelompok Tani">
                      UMKM / Koperasi / Kelompok Tani
                    </option>
                    <option value="Komunitas / Pokmas / Bank Sampah">
                      Komunitas / Pokmas / Bank Sampah
                    </option>
                  </select>
                </div>
              </div>
            )}
          </aside>

          {/* RIGHT CANVAS: Full-Height Scrollable A4 Portrait Sheet Preview */}
          <div className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 bg-slate-200/80 dark:bg-slate-950 flex flex-col items-center">
            {/* Sticky Sheet Navigation Bar */}
            <div className="w-full max-w-[794px] mb-3 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-2 text-xs shrink-0 sticky top-0 z-10">
              <div className="flex flex-wrap items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>
                  Lembar A4 Potrait (3×6) &mdash;{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {expandedStickerInstances.length} Stiker
                  </strong>{' '}
                  dalam {totalPages} Halaman
                </span>
                {selectedPreviewId === 'ALL' ? (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-extrabold">
                    Mode: (Cetak Semua • {activeSheetItems.length} Penerima)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-[#002B66] dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px] font-extrabold">
                    <span>
                      Filter Penerima: {selectedPreviewId}
                      {activeSelectedCatalogItem
                        ? ` • Item: ${activeSelectedCatalogItem.namaBarang} (${activeTargetCopies}x)`
                        : ` • Semua Barang (${activeTargetCopies}x)`}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPreviewId('ALL');
                        setCurrentPage(1);
                      }}
                      className="text-rose-600 dark:text-rose-400 hover:underline ml-1 cursor-pointer"
                    >
                      (Cetak Semua)
                    </button>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 disabled:opacity-40 inline-flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Sebelumnya</span>
                </button>
                <span className="px-2.5 py-1 rounded-lg bg-[#002B66] text-white font-bold tabular-nums">
                  Hal {safePage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 disabled:opacity-40 inline-flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <span>Selanjutnya</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Simulated A4 Portrait Paper Container (Locked 210mm : 297mm aspect ratio, 3 columns × 6 rows) */}
            <div
              className="bg-white rounded-xs shadow-2xl border border-slate-300 p-4 sm:p-5 flex flex-col justify-between shrink-0"
              style={{
                width: '794px',
                minHeight: '1123px'
              }}
            >
              {/* Paper Header Meta Guide (Non-printed margin indicator) */}
              <div className="mb-2 flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-100 pb-1.5 shrink-0">
                <span className="font-semibold text-slate-500">
                  Kertas Cetak A4 Potrait (210mm × 297mm) &mdash; Grid Presisi 3 Kolom (64mm) × 6 Baris (45mm) = 18 Stiker
                </span>
                <span className="font-mono font-bold text-[#002B66]">
                  Lembar A4 #{safePage} dari {totalPages}
                </span>
              </div>

              {/* Strict 3 Horizontal × 6 Vertical Grid (18 Stickers with locked dimensions) */}
              <div
                className="grid gap-2.5 flex-1"
                style={{
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gridTemplateRows: 'repeat(6, 165px)'
                }}
              >
                {Array.from({ length: 18 }).map((_, idx) => {
                  const inst = currentPageInstances[idx];
                  const rowNumber = Math.floor(idx / 3) + 1;
                  const colNumber = (idx % 3) + 1;

                  if (!inst) {
                    return (
                      <div
                        key={`empty-${idx}`}
                        className="rounded-md border border-slate-200/80 bg-slate-50/50 flex flex-col items-center justify-center text-[10px] text-slate-300 p-2 h-[165px]"
                      >
                        <span className="font-semibold">Slot Stiker #{idx + 1}</span>
                        <span className="text-[9px] text-slate-300">
                          (Baris {rowNumber}, Kolom {colNumber} &bull; 64mm × 45mm)
                        </span>
                      </div>
                    );
                  }
                  const stickerItem = inst.item;
                  const isHighlighted = previewItem && previewItem.id === stickerItem.id;
                  return (
                    <div
                      key={`${stickerItem.id}-copy-${inst.copyIndex}-slot-${idx}`}
                      onClick={() => {
                        setInspectedItemId(stickerItem.id);
                      }}
                      title="Klik untuk melihat detail stiker ini pada pratinjau kiri"
                      className={`h-[165px] cursor-pointer transition-transform ${
                        isHighlighted ? 'ring-2 ring-blue-600/50 rounded-md' : 'hover:scale-[1.01]'
                      }`}
                    >
                      <QrStickerDesignCard
                        item={stickerItem}
                        compact={true}
                        config={stickerConfig}
                        copyIndex={inst.copyIndex}
                        totalCopies={inst.totalCopies}
                        showUnitSequence={showUnitSequence}
                        customUnitMeta={inst.customUnitMeta}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Paper Footer Meta */}
              <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[9.5px] text-slate-400 shrink-0">
                <span>
                  Sistem Informasi Bantuan EPML &mdash; KPw Bank Indonesia Provinsi Jawa Timur
                </span>
                <span>
                  Terisi {currentPageInstances.length} dari 18 slot stiker pada halaman ini
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
