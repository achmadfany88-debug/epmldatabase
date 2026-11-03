/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { WILAYAH_JAWA_TIMUR, WILAYAH_KERJA_KPW_JATIM, isWilayahKerjaKPwJatim } from '../../data/initialData';
import { BantuanItem } from '../../types';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  ArrowRight,
  Move,
  Navigation,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  X,
  PenTool,
  Palette,
  Check,
  Undo2,
  Trash2,
  Sparkles,
  MousePointerClick,
  Crosshair,
  Sliders,
  Layers,
  Upload,
  Image as ImageIcon,
  Link2,
  RefreshCw,
  Plus
} from 'lucide-react';

export interface MapVisualizationProps {
  bantuanList: BantuanItem[];
  onSelectBantuan?: (item: BantuanItem) => void;
  selectedKabupaten?: string;
  onFilterKabupaten?: (kab: string) => void;
  heightClass?: string;
  showFilters?: boolean;
  initialYear?: string;
  initialQuarter?: string;
  /**
   * When true (ONLY in Admin -> Peta Sebaran & Geo-Tagging Jatim),
   * displays the "Pen Tool & Edit Wilayah" and "Update / Upload Map Baru" tools.
   * When false/omitted (on the main public Dashboard), hides all editing/upload controls
   * while still automatically linking and rendering the updated map & region boundaries.
   */
  enableAdminTools?: boolean;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface RegionZonePolygon {
  id: string;
  namaZona: string;
  points: Point2D[];
  curveMode: 'polygon' | 'smooth';
  pathD: string;
}

export interface RegionVectorFeature {
  id: string;
  nama: string;
  label: string;
  officialTitle: string;
  isWilayahKerja: boolean;
  // Precise SVG polygon/path coordinate for 1000x1000 square map space (combines all zones)
  pathD: string;
  points: Point2D[];
  curveMode: 'polygon' | 'smooth';
  // Multi-zone support for Kab/Kota with islands separated from mainland (daratan utama + pulau)
  zones?: RegionZonePolygon[];
  center: Point2D;
  // Normal / Base state appearance
  fillColor: string;
  fillOpacity: number;
  strokeColor: string;
  strokeWidth: number;
  // Cursor Hover state appearance (ketika dipilih kursor)
  hoverColor: string;
  hoverOpacity: number;
  hoverStrokeColor: string;
  // Clicked / Selected state appearance (ketika diklik)
  selectedColor: string;
  selectedOpacity: number;
  selectedStrokeColor: string;
  // Custom redesign flag
  isCustomRedesigned?: boolean;
}

export interface CustomBaseMapConfig {
  imageUrl: string;
  fileName: string;
  updatedAt: string;
  scale: number;
  offsetX: number;
  offsetY: number;
  opacity: number;
  fitMode: 'meet' | 'slice' | 'none';
}

const DEFAULT_BASE_MAP_URL = '/assets/aistudio/629950e7-208d-4bbb-84d7-4ea6c8023086_e6a6e581.jpg';
const STORAGE_KEY_CUSTOM_REGIONS = 'epml_jatim_custom_map_regions_v2';
const STORAGE_KEY_CUSTOM_BASEMAP = 'epml_jatim_custom_basemap_v1';
const MAP_SYNC_EVENT = 'epml-jatim-map-sync';

const DEFAULT_BASEMAP_CONFIG: CustomBaseMapConfig = {
  imageUrl: DEFAULT_BASE_MAP_URL,
  fileName: 'Peta_Standar_KPwBI_Jatim.jpg',
  updatedAt: '',
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  opacity: 1,
  fitMode: 'meet'
};

/**
 * Convert an array of 2D vertices into either a crisp straight-line SVG polygon path
 * or a smooth Catmull-Rom cubic Bezier SVG path.
 */
function pointsToSvgPath(
  points: Point2D[],
  closed: boolean = true,
  curveMode: 'polygon' | 'smooth' = 'polygon'
): string {
  if (!points || points.length === 0) return '';
  if (points.length === 1) {
    return `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  }

  if (curveMode === 'polygon' || points.length < 3) {
    const start = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
    const lines = points
      .slice(1)
      .map(pt => `L ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`)
      .join(' ');
    return closed ? `${start} ${lines} Z` : `${start} ${lines}`;
  }

  // Smooth Catmull-Rom spline converted to cubic Bezier segments
  const n = points.length;
  const tension = 0.22;
  let d = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;

  const segmentCount = closed ? n : n - 1;
  for (let i = 0; i < segmentCount; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i % n];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];

    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }

  if (closed) d += ' Z';
  return d;
}

/**
 * Compute geometric centroid of a polygon
 */
function computePolygonCentroid(points: Point2D[]): Point2D {
  if (!points || points.length === 0) return { x: 500, y: 350 };
  if (points.length < 3) {
    const sumX = points.reduce((acc, p) => acc + p.x, 0);
    const sumY = points.reduce((acc, p) => acc + p.y, 0);
    return {
      x: Math.round(sumX / points.length),
      y: Math.round(sumY / points.length)
    };
  }

  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    const cross = p1.x * p2.y - p2.x * p1.y;
    area += cross;
    cx += (p1.x + p2.x) * cross;
    cy += (p1.y + p2.y) * cross;
  }

  area *= 0.5;
  if (Math.abs(area) < 1e-5) {
    const sumX = points.reduce((acc, p) => acc + p.x, 0);
    const sumY = points.reduce((acc, p) => acc + p.y, 0);
    return {
      x: Math.round(sumX / points.length),
      y: Math.round(sumY / points.length)
    };
  }

  return {
    x: Math.round(cx / (6 * area)),
    y: Math.round(cy / (6 * area))
  };
}

/**
 * Retrieve normalized array of zones (Daratan Utama + Pulau/Zonasi tambahan) for a region
 */
function getRegionZones(feat: RegionVectorFeature): RegionZonePolygon[] {
  if (Array.isArray(feat.zones) && feat.zones.length > 0) {
    return feat.zones;
  }
  const fallbackCurve = feat.curveMode || 'polygon';
  const fallbackPath = (
    feat.pathD || pointsToSvgPath(feat.points || [], true, fallbackCurve)
  ).trim();
  return [
    {
      id: `${feat.id}_zone_1`,
      namaZona: 'Zona 1 (Daratan Utama)',
      points: feat.points || [],
      curveMode: fallbackCurve,
      pathD: fallbackPath
    }
  ];
}

/**
 * Synchronize a RegionVectorFeature with an updated list of zones so all zones render & highlight together
 */
function applyZonesToFeature(
  feat: RegionVectorFeature,
  nextZones: RegionZonePolygon[]
): RegionVectorFeature {
  const safeZones = nextZones.length > 0 ? nextZones : getRegionZones(feat);
  const normalizedZones = safeZones.map((z, idx) => {
    const cMode = z.curveMode || 'polygon';
    const computedPath = pointsToSvgPath(z.points, true, cMode).trim();
    return {
      ...z,
      id: z.id || `${feat.id}_zone_${idx + 1}`,
      namaZona:
        z.namaZona ||
        (idx === 0 ? 'Zona 1 (Daratan Utama)' : `Zonasi / Pulau #${idx + 1}`),
      curveMode: cMode,
      pathD: (computedPath || z.pathD || '').trim()
    };
  });
  const combinedPathD = normalizedZones
    .map(z => z.pathD)
    .filter(Boolean)
    .join(' ');

  return {
    ...feat,
    zones: normalizedZones,
    points: normalizedZones[0].points,
    curveMode: normalizedZones[0].curveMode,
    pathD: combinedPathD,
    isCustomRedesigned: true
  };
}

// Default 13 Wilayah Kerja KPw Bank Indonesia Provinsi Jawa Timur
const DEFAULT_KPW_REGIONS: RegionVectorFeature[] = [
  // PULAU MADURA (4 Kabupaten)
  {
    id: 'bangkalan',
    nama: 'Kabupaten Bangkalan',
    label: 'Bangkalan',
    officialTitle: 'KABUPATEN BANGKALAN',
    isWilayahKerja: true,
    points: [
      { x: 476, y: 268 },
      { x: 495, y: 238 },
      { x: 530, y: 233 },
      { x: 572, y: 250 },
      { x: 571, y: 285 },
      { x: 565, y: 317 },
      { x: 520, y: 315 },
      { x: 485, y: 308 }
    ],
    curveMode: 'smooth',
    pathD: `
      M 476,268 
      C 480,240 500,233 530,233 
      C 555,233 570,235 572,250 
      C 574,275 572,305 565,317 
      C 545,317 510,317 485,308 
      C 475,295 474,280 476,268 Z
    `,
    center: { x: 524, y: 275 },
    fillColor: '#1d4ed8',
    fillOpacity: 0.14,
    strokeColor: '#ffffff',
    strokeWidth: 1.5,
    hoverColor: '#2563eb',
    hoverOpacity: 0.48,
    hoverStrokeColor: '#38bdf8',
    selectedColor: '#ea580c',
    selectedOpacity: 0.92,
    selectedStrokeColor: '#ffffff'
  },
  {
    id: 'sampang',
    nama: 'Kabupaten Sampang',
    label: 'Sampang',
    officialTitle: 'KABUPATEN SAMPANG',
    isWilayahKerja: true,
    points: [
      { x: 572, y: 250 },
      { x: 605, y: 233 },
      { x: 642, y: 233 },
      { x: 640, y: 278 },
      { x: 634, y: 317 },
      { x: 598, y: 317 },
      { x: 565, y: 317 },
      { x: 571, y: 285 }
    ],
    curveMode: 'smooth',
    pathD: `
      M 572,250 
      C 590,233 615,233 642,233 
      C 644,255 640,285 634,317 
      C 610,317 585,317 565,317 
      C 572,305 574,275 572,250 Z
    `,
    center: { x: 606, y: 275 },
    fillColor: '#2563eb',
    fillOpacity: 0.14,
    strokeColor: '#ffffff',
    strokeWidth: 1.5,
    hoverColor: '#3b82f6',
    hoverOpacity: 0.48,
    hoverStrokeColor: '#38bdf8',
    selectedColor: '#ea580c',
    selectedOpacity: 0.92,
    selectedStrokeColor: '#ffffff'
  },
  {
    id: 'pamekasan',
    nama: 'Kabupaten Pamekasan',
    label: 'Pamekasan',
    officialTitle: 'KABUPATEN PAMEKASAN',
    isWilayahKerja: true,
    points: [
      { x: 642, y: 233 },
      { x: 672, y: 234 },
      { x: 700, y: 235 },
      { x: 698, y: 282 },
      { x: 684, y: 332 },
      { x: 656, y: 326 },
      { x: 634, y: 317 },
      { x: 640, y: 278 }
    ],
    curveMode: 'smooth',
    pathD: `
      M 642,233 
      C 660,233 680,235 700,235 
      C 704,260 700,295 684,332 
      C 660,332 645,325 634,317 
      C 640,285 644,255 642,233 Z
    `,
    center: { x: 668, y: 280 },
    fillColor: '#1e40af',
    fillOpacity: 0.14,
    strokeColor: '#ffffff',
    strokeWidth: 1.5,
    hoverColor: '#2563eb',
    hoverOpacity: 0.48,
    hoverStrokeColor: '#38bdf8',
    selectedColor: '#ea580c',
    selectedOpacity: 0.92,
    selectedStrokeColor: '#ffffff'
  },
  {
    id: 'sumenep',
    nama: 'Kabupaten Sumenep',
    label: 'Sumenep',
    officialTitle: 'KABUPATEN SUMENEP',
    isWilayahKerja: true,
    points: [
      { x: 700, y: 235 },
      { x: 752, y: 234 },
      { x: 808, y: 255 },
      { x: 775, y: 282 },
      { x: 735, y: 302 },
      { x: 710, y: 305 },
      { x: 684, y: 332 },
      { x: 698, y: 282 }
    ],
    curveMode: 'smooth',
    pathD: `
      M 700,235 
      C 730,233 775,232 808,255 
      C 812,265 800,278 775,282 
      C 755,285 752,305 710,305 
      C 690,305 684,332 684,332 
      C 700,295 704,260 700,235 Z
    `,
    center: { x: 748, y: 268 },
    fillColor: '#0284c7',
    fillOpacity: 0.14,
    strokeColor: '#ffffff',
    strokeWidth: 1.5,
    hoverColor: '#2563eb',
    hoverOpacity: 0.48,
    hoverStrokeColor: '#38bdf8',
    selectedColor: '#ea580c',
    selectedOpacity: 0.92,
    selectedStrokeColor: '#ffffff'
  },

  // PANTURA & INLAND JAWA TIMUR
  {
    id: 'tuban',
    nama: 'Kabupaten Tuban',
    label: 'Tuban',
    officialTitle: 'KABUPATEN TUBAN',
    isWilayahKerja: true,
    points: [
      { x: 235, y: 210 },
      { x: 290, y: 208 },
      { x: 340, y: 230 },
      { x: 358, y: 262 },
      { x: 350, y: 295 },
      { x: 295, y: 288 },
      { x: 240, y: 280 },
      { x: 220, y: 245 }
    ],
    curveMode: 'smooth',
    pathD: `
      M 235,210 
      C 260,205 315,208 340,230 
      C 362,245 362,275 350,295 
      C 320,295 285,285 240,280 
      C 215,265 215,225 235,210 Z
    `,
    center: { x: 290, y: 250 },
    fillColor: '#0369a1',
    fillOpacity: 0.14,
    strokeColor: '#ffffff',
    strokeWidth: 1.5,
    hoverColor: '#2563eb',
    hoverOpacity: 0.48,
    hoverStrokeColor: '#38bdf8',
    selectedColor: '#ea580c',
    selectedOpacity: 0.92,
    selectedStrokeColor: '#ffffff'
  },
  {
    id: 'bojonegoro',
    nama: 'Kabupaten Bojonegoro',
    label: 'Bojonegoro',
    officialTitle: 'KABUPATEN BOJONEGORO',
    isWilayahKerja: true,
    points: [
      { x: 175, y: 325 },
      { x: 240, y: 280 },
      { x: 295, y: 288 },
      { x: 350, y: 295 },
      { x: 342, y: 338 },
      { x: 330, y: 375 },
      { x: 260, y: 374 },
      { x: 195, y: 370 }
    ],
    curveMode: 'smooth',
    pathD: `
      M 175,325 
      C 210,305 240,280 350,295 
      C 350,325 340,355 330,375 
      C 295,375 240,375 195,370 
      C 175,360 170,345 175,325 Z
    `,
    center: { x: 260, y: 338 },
    fillColor: '#1e40af',
    fillOpacity: 0.14,
    strokeColor: '#ffffff',
    strokeWidth: 1.5,
    hoverColor: '#2563eb',
    hoverOpacity: 0.48,
    hoverStrokeColor: '#38bdf8',
    selectedColor: '#ea580c',
    selectedOpacity: 0.92,
    selectedStrokeColor: '#ffffff'
  },
  {
    id: 'lamongan',
    nama: 'Kabupaten Lamongan',
    label: 'Lamongan',
    officialTitle: 'KABUPATEN LAMONGAN',
    isWilayahKerja: true,
    points: [
      { x: 340, y: 230 },
      { x: 388, y: 234 },
      { x: 425, y: 270 },
      { x: 412, y: 315 },
      { x: 390, y: 355 },
      { x: 355, y: 358 },
      { x: 330, y: 375 },
      { x: 350, y: 295 }
    ],
    curveMode: 'smooth',
    pathD: `
      M 340,230 
      C 375,230 405,235 425,270 
      C 425,295 405,335 390,355 
      C 360,355 345,355 330,375 
      C 340,355 350,325 350,295 
      C 362,275 362,245 340,230 Z
    `,
    center: { x: 385, y: 295 },
    fillColor: '#0284c7',
    fillOpacity: 0.14,
    strokeColor: '#ffffff',
    strokeWidth: 1.5,
    hoverColor: '#2563eb',
    hoverOpacity: 0.48,
    hoverStrokeColor: '#38bdf8',
    selectedColor: '#ea580c',
    selectedOpacity: 0.92,
    selectedStrokeColor: '#ffffff'
  },
  {
    id: 'gresik',
    nama: 'Kabupaten Gresik',
    label: 'Gresik',
    officialTitle: 'KABUPATEN GRESIK',
    isWilayahKerja: true,
    points: [
      { x: 425, y: 270 },
      { x: 452, y: 242 },
      { x: 470, y: 295 },
      { x: 465, y: 328 },
      { x: 440, y: 355 },
      { x: 390, y: 355 },
      { x: 412, y: 315 }
    ],
    curveMode: 'smooth',
    pathD: `
      M 425,270 
      C 445,225 465,245 470,295 
      C 475,315 460,335 440,355 
      C 420,355 410,355 390,355 
      C 405,335 425,295 425,270 Z
    `,
    center: { x: 442, y: 298 },
    fillColor: '#0f766e',
    fillOpacity: 0.14,
    strokeColor: '#ffffff',
    strokeWidth: 1.5,
    hoverColor: '#2563eb',
    hoverOpacity: 0.48,
    hoverStrokeColor: '#38bdf8',
    selectedColor: '#ea580c',
    selectedOpacity: 0.92,
    selectedStrokeColor: '#ffffff'
  },
  {
    id: 'surabaya',
    nama: 'Kota Surabaya',
    label: 'Surabaya',
    officialTitle: 'KOTA SURABAYA',
    isWilayahKerja: true,
    points: [
      { x: 470, y: 295 },
      { x: 498, y: 308 },
      { x: 515, y: 345 },
      { x: 492, y: 358 },
      { x: 460, y: 355 },
      { x: 465, y: 325 }
    ],
    curveMode: 'smooth',
    pathD: `
      M 470,295 
      C 490,305 515,315 515,345 
      C 515,360 480,360 460,355 
      C 460,335 475,315 470,295 Z
    `,
    center: { x: 492, y: 334 },
    fillColor: '#1e3a8a',
    fillOpacity: 0.14,
    strokeColor: '#ffffff',
    strokeWidth: 1.5,
    hoverColor: '#2563eb',
    hoverOpacity: 0.48,
    hoverStrokeColor: '#38bdf8',
    selectedColor: '#ea580c',
    selectedOpacity: 0.92,
    selectedStrokeColor: '#ffffff'
  },
  {
    id: 'sidoarjo',
    nama: 'Kabupaten Sidoarjo',
    label: 'Sidoarjo',
    officialTitle: 'KABUPATEN SIDOARJO',
    isWilayahKerja: true,
    points: [
      { x: 460, y: 355 },
      { x: 492, y: 358 },
      { x: 515, y: 375 },
      { x: 505, y: 398 },
      { x: 455, y: 400 },
      { x: 452, y: 376 }
    ],
    curveMode: 'smooth',
    pathD: `
      M 460,355 
      C 480,360 515,360 515,375 
      C 518,400 485,405 455,400 
      C 450,385 455,365 460,355 Z
    `,
    center: { x: 485, y: 378 },
    fillColor: '#2563eb',
    fillOpacity: 0.14,
    strokeColor: '#ffffff',
    strokeWidth: 1.5,
    hoverColor: '#3b82f6',
    hoverOpacity: 0.48,
    hoverStrokeColor: '#38bdf8',
    selectedColor: '#ea580c',
    selectedOpacity: 0.92,
    selectedStrokeColor: '#ffffff'
  },
  {
    id: 'kota_mojokerto',
    nama: 'Kota Mojokerto',
    label: 'Kota Mojokerto',
    officialTitle: 'KOTA MOJOKERTO',
    isWilayahKerja: true,
    points: [
      { x: 412, y: 352 },
      { x: 432, y: 354 },
      { x: 438, y: 375 },
      { x: 424, y: 381 },
      { x: 410, y: 375 },
      { x: 409, y: 362 }
    ],
    curveMode: 'smooth',
    pathD: `
      M 412,352 
      C 432,352 438,360 438,375 
      C 430,382 415,382 410,375 
      C 408,365 410,355 412,352 Z
    `,
    center: { x: 424, y: 366 },
    fillColor: '#0284c7',
    fillOpacity: 0.14,
    strokeColor: '#ffffff',
    strokeWidth: 1.5,
    hoverColor: '#2563eb',
    hoverOpacity: 0.48,
    hoverStrokeColor: '#38bdf8',
    selectedColor: '#ea580c',
    selectedOpacity: 0.92,
    selectedStrokeColor: '#ffffff'
  },
  {
    id: 'kab_mojokerto',
    nama: 'Kabupaten Mojokerto',
    label: 'Kab. Mojokerto',
    officialTitle: 'KABUPATEN MOJOKERTO',
    isWilayahKerja: true,
    points: [
      { x: 410, y: 375 },
      { x: 438, y: 375 },
      { x: 455, y: 400 },
      { x: 458, y: 432 },
      { x: 415, y: 445 },
      { x: 403, y: 412 }
    ],
    curveMode: 'smooth',
    pathD: `
      M 410,375 
      C 430,382 445,375 455,400 
      C 465,430 445,450 415,445 
      C 400,425 400,395 410,375 Z
    `,
    center: { x: 435, y: 412 },
    fillColor: '#1d4ed8',
    fillOpacity: 0.14,
    strokeColor: '#ffffff',
    strokeWidth: 1.5,
    hoverColor: '#2563eb',
    hoverOpacity: 0.48,
    hoverStrokeColor: '#38bdf8',
    selectedColor: '#ea580c',
    selectedOpacity: 0.92,
    selectedStrokeColor: '#ffffff'
  },
  {
    id: 'jombang',
    nama: 'Kabupaten Jombang',
    label: 'Jombang',
    officialTitle: 'KABUPATEN JOMBANG',
    isWilayahKerja: true,
    points: [
      { x: 345, y: 355 },
      { x: 390, y: 355 },
      { x: 410, y: 375 },
      { x: 403, y: 412 },
      { x: 415, y: 445 },
      { x: 368, y: 440 },
      { x: 340, y: 395 }
    ],
    curveMode: 'smooth',
    pathD: `
      M 345,355 
      C 380,355 410,355 410,375 
      C 400,395 400,425 415,445 
      C 375,445 345,435 340,395 
      C 335,380 340,365 345,355 Z
    `,
    center: { x: 375, y: 398 },
    fillColor: '#0369a1',
    fillOpacity: 0.14,
    strokeColor: '#ffffff',
    strokeWidth: 1.5,
    hoverColor: '#2563eb',
    hoverOpacity: 0.48,
    hoverStrokeColor: '#38bdf8',
    selectedColor: '#ea580c',
    selectedOpacity: 0.92,
    selectedStrokeColor: '#ffffff'
  }
];

const COLOR_PRESETS_CLICK = [
  { label: 'Oranye BI', value: '#ea580c' },
  { label: 'Biru Utama', value: '#1d4ed8' },
  { label: 'Hijau Emerald', value: '#059669' },
  { label: 'Merah Crimson', value: '#dc2626' },
  { label: 'Ungu Royal', value: '#7c3aed' },
  { label: 'Kuning Emas', value: '#d97706' },
  { label: 'Cyan Laut', value: '#0891b2' }
];

const COLOR_PRESETS_HOVER = [
  { label: 'Biru Cerah', value: '#2563eb' },
  { label: 'Sky Cyan', value: '#0284c7' },
  { label: 'Hijau Mint', value: '#10b981' },
  { label: 'Oranye Muda', value: '#f97316' },
  { label: 'Amber Kuning', value: '#eab308' },
  { label: 'Indigo', value: '#4f46e5' },
  { label: 'Rose Pink', value: '#e11d48' }
];

const COLOR_PRESETS_BASE = [
  { label: 'Biru BI', value: '#1d4ed8' },
  { label: 'Biru Navy', value: '#1e3a8a' },
  { label: 'Teal Hijau', value: '#0f766e' },
  { label: 'Emerald', value: '#047857' },
  { label: 'Sky Blue', value: '#0284c7' },
  { label: 'Slate Abu', value: '#475569' }
];

type PenSubMode = 'DRAW_NEW' | 'EDIT_NODES' | 'PREVIEW';

function loadSavedRegions(): RegionVectorFeature[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_REGIONS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // fallback
  }
  return DEFAULT_KPW_REGIONS;
}

function loadSavedBaseMap(): CustomBaseMapConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_BASEMAP);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed.imageUrl === 'string' && parsed.imageUrl.trim() !== '') {
        return {
          ...DEFAULT_BASEMAP_CONFIG,
          ...parsed
        };
      }
    }
  } catch {
    // fallback
  }
  return DEFAULT_BASEMAP_CONFIG;
}

export const MapVisualization: React.FC<MapVisualizationProps> = ({
  bantuanList,
  onSelectBantuan,
  selectedKabupaten,
  onFilterKabupaten,
  heightClass = 'h-[720px]',
  showFilters = true,
  initialYear = 'ALL',
  initialQuarter = 'ALL',
  enableAdminTools = false
}) => {
  // 1. Load custom regions & custom base map from localStorage (shared & linked between Admin and Public Dashboard)
  const [regions, setRegions] = useState<RegionVectorFeature[]>(loadSavedRegions);
  const [baseMapConfig, setBaseMapConfig] = useState<CustomBaseMapConfig>(loadSavedBaseMap);

  // Sync changes across components/tabs whenever Admin updates map or regions
  const broadcastMapSync = useCallback(() => {
    window.dispatchEvent(new CustomEvent(MAP_SYNC_EVENT));
  }, []);

  useEffect(() => {
    const handleSync = () => {
      setRegions(loadSavedRegions());
      setBaseMapConfig(loadSavedBaseMap());
    };
    window.addEventListener(MAP_SYNC_EVENT, handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener(MAP_SYNC_EVENT, handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Helper to update and persist regions
  const saveAndSetRegions = useCallback(
    (updater: RegionVectorFeature[] | ((prev: RegionVectorFeature[]) => RegionVectorFeature[])) => {
      setRegions(prev => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        try {
          localStorage.setItem(STORAGE_KEY_CUSTOM_REGIONS, JSON.stringify(next));
          broadcastMapSync();
        } catch {
          // ignore storage quota errors
        }
        return next;
      });
    },
    [broadcastMapSync]
  );

  // Helper to update and persist base map config
  const saveAndSetBaseMap = useCallback(
    (updater: CustomBaseMapConfig | ((prev: CustomBaseMapConfig) => CustomBaseMapConfig)) => {
      setBaseMapConfig(prev => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        try {
          localStorage.setItem(STORAGE_KEY_CUSTOM_BASEMAP, JSON.stringify(next));
          broadcastMapSync();
        } catch {
          // ignore storage quota errors
        }
        return next;
      });
    },
    [broadcastMapSync]
  );

  // Map View Mode (Thematic by default, optional Google Maps)
  const [showGoogleMaps, setShowGoogleMaps] = useState<boolean>(false);

  // Independent Selection State
  const [internalSelectedKab, setInternalSelectedKab] = useState<string>(selectedKabupaten || '');
  const activeSelectedKab =
    selectedKabupaten !== undefined && selectedKabupaten !== ''
      ? selectedKabupaten
      : internalSelectedKab;

  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [activeInspectorRegion, setActiveInspectorRegion] = useState<string | null>(null);

  // Filter Tahunan & Triwulanan
  const [selectedYear, setSelectedYear] = useState<string>(initialYear);
  const [selectedQuarter, setSelectedQuarter] = useState<string>(initialQuarter);

  // Hide / Unhide States for Info Cards and Quick Pills
  const [showLegendInfo, setShowLegendInfo] = useState<boolean>(true);
  const [showQuickPills, setShowQuickPills] = useState<boolean>(true);

  // ============================================================================
  // ADMIN ONLY: STUDIO PEN TOOL & UPDATE/UPLOAD MAP BARU STATES
  // ============================================================================
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [isMapUploadOpen, setIsMapUploadOpen] = useState<boolean>(false);
  const [customMapUrlInput, setCustomMapUrlInput] = useState<string>('');
  const [isProcessingUpload, setIsProcessingUpload] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editorTargetNama, setEditorTargetNama] = useState<string>('Kota Surabaya');
  const [activeZoneIndex, setActiveZoneIndex] = useState<number>(0);
  const [isDrawingNewZone, setIsDrawingNewZone] = useState<boolean>(false);
  const [penSubMode, setPenSubMode] = useState<PenSubMode>('EDIT_NODES');
  const [draftPoints, setDraftPoints] = useState<Point2D[]>([]);
  const [draftCurveMode, setDraftCurveMode] = useState<'polygon' | 'smooth'>('polygon');
  const [cursorSvgPoint, setCursorSvgPoint] = useState<Point2D | null>(null);
  const [draggingNodeIndex, setDraggingNodeIndex] = useState<number | null>(null);
  const [selectedNodeIndex, setSelectedNodeIndex] = useState<number | null>(null);
  const [isDraggingCenterPin, setIsDraggingCenterPin] = useState<boolean>(false);
  const [editorNotice, setEditorNotice] = useState<string | null>(null);

  // If enableAdminTools is false (e.g. on Public Dashboard), force editor/upload panels closed
  const activeEditorOpen = enableAdminTools && isEditorOpen;
  const activeMapUploadOpen = enableAdminTools && isMapUploadOpen;

  // Zoom & Pan Interactive State
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const mapGroupRef = useRef<SVGGElement>(null);

  const triggerNotice = useCallback((msg: string) => {
    setEditorNotice(msg);
    setTimeout(() => {
      setEditorNotice(prev => (prev === msg ? null : prev));
    }, 3500);
  }, []);

  // Handle uploading a new map image file (compress/optimize via canvas so it fits in localStorage and links to Dashboard)
  const handleMapFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingUpload(true);
    const reader = new FileReader();

    reader.onload = (ev) => {
      const resultDataUrl = ev.target?.result as string;
      if (!resultDataUrl) {
        setIsProcessingUpload(false);
        return;
      }

      // If SVG, store directly
      if (file.type === 'image/svg+xml') {
        const nowStr = new Date().toLocaleString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        saveAndSetBaseMap(prev => ({
          ...prev,
          imageUrl: resultDataUrl,
          fileName: file.name,
          updatedAt: nowStr
        }));
        setIsProcessingUpload(false);
        triggerNotice(`Peta baru "${file.name}" berhasil diunggah & langsung terlink ke halaman Dashboard!`);
        return;
      }

      // Optimize raster image (PNG/JPG/WEBP) so it persists cleanly in localStorage
      const img = new Image();
      img.onload = () => {
        const maxDim = 1600;
        let targetW = img.width;
        let targetH = img.height;
        if (targetW > maxDim || targetH > maxDim) {
          if (targetW > targetH) {
            targetH = Math.round((targetH * maxDim) / targetW);
            targetW = maxDim;
          } else {
            targetW = Math.round((targetW * maxDim) / targetH);
            targetH = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Fill white background for JPEG or keep transparency for PNG
          const isPng = file.type === 'image/png' || file.type === 'image/webp';
          if (!isPng) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, targetW, targetH);
          }
          ctx.drawImage(img, 0, 0, targetW, targetH);
          const optimizedDataUrl = isPng
            ? canvas.toDataURL('image/webp', 0.88)
            : canvas.toDataURL('image/jpeg', 0.88);

          const nowStr = new Date().toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          saveAndSetBaseMap(prev => ({
            ...prev,
            imageUrl: optimizedDataUrl,
            fileName: file.name,
            updatedAt: nowStr
          }));
          triggerNotice(`Peta baru "${file.name}" berhasil diupdate & langsung terlink ke Dashboard Utama!`);
        }
        setIsProcessingUpload(false);
      };
      img.onerror = () => {
        setIsProcessingUpload(false);
        triggerNotice('Gagal memuat file gambar peta. Pastikan format PNG, JPG, WEBP, atau SVG.');
      };
      img.src = resultDataUrl;
    };

    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleApplyCustomMapUrl = () => {
    const trimmed = customMapUrlInput.trim();
    if (!trimmed) return;
    const nowStr = new Date().toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    saveAndSetBaseMap(prev => ({
      ...prev,
      imageUrl: trimmed,
      fileName: trimmed.split('/').pop() || 'Custom_Map_URL',
      updatedAt: nowStr
    }));
    setCustomMapUrlInput('');
    triggerNotice('URL Peta kewilayahan baru diterapkan & langsung terlink ke halaman Dashboard!');
  };

  const handleResetBaseMapToDefault = () => {
    localStorage.removeItem(STORAGE_KEY_CUSTOM_BASEMAP);
    setBaseMapConfig(DEFAULT_BASEMAP_CONFIG);
    broadcastMapSync();
    triggerNotice('Peta dasar dikembalikan ke Peta Standar KPwBI Provinsi Jawa Timur.');
  };

  // Ensure editorTargetNama exists in `regions`
  const activeEditorRegion = useMemo(() => {
    return regions.find(r => r.nama === editorTargetNama) || regions[0];
  }, [regions, editorTargetNama]);

  const activeZones = useMemo(() => {
    return activeEditorRegion ? getRegionZones(activeEditorRegion) : [];
  }, [activeEditorRegion]);

  const safeZoneIndex = activeZoneIndex < activeZones.length ? activeZoneIndex : 0;
  const activeZone = activeZones[safeZoneIndex] || activeZones[0];

  const handleSelectEditorTarget = (nama: string) => {
    setEditorTargetNama(nama);
    setActiveZoneIndex(0);
    setIsDrawingNewZone(false);
    setSelectedNodeIndex(null);
    setDraftPoints([]);
    saveAndSetRegions(prev => {
      const exists = prev.find(r => r.nama === nama);
      if (exists) {
        const zList = getRegionZones(exists);
        setDraftCurveMode(zList[0]?.curveMode || exists.curveMode || 'polygon');
        return prev;
      }
      const sample = prev[0] || DEFAULT_KPW_REGIONS[0];
      const defaultPts = [
        { x: 460, y: 460 },
        { x: 520, y: 460 },
        { x: 520, y: 520 },
        { x: 460, y: 520 }
      ];
      const defaultPath = 'M 460,460 L 520,460 L 520,520 L 460,520 Z';
      const idSlug = nama.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      const newFeat: RegionVectorFeature = {
        id: idSlug,
        nama,
        label: nama.replace('Kabupaten ', 'Kab. '),
        officialTitle: nama.toUpperCase(),
        isWilayahKerja: isWilayahKerjaKPwJatim(nama),
        points: defaultPts,
        curveMode: 'polygon',
        pathD: defaultPath,
        zones: [
          {
            id: `${idSlug}_zone_1`,
            namaZona: 'Zona 1 (Daratan Utama)',
            points: defaultPts,
            curveMode: 'polygon',
            pathD: defaultPath
          }
        ],
        center: { x: 490, y: 490 },
        fillColor: sample.fillColor,
        fillOpacity: sample.fillOpacity,
        strokeColor: sample.strokeColor,
        strokeWidth: sample.strokeWidth,
        hoverColor: sample.hoverColor,
        hoverOpacity: sample.hoverOpacity,
        hoverStrokeColor: sample.hoverStrokeColor,
        selectedColor: sample.selectedColor,
        selectedOpacity: sample.selectedOpacity,
        selectedStrokeColor: sample.selectedStrokeColor,
        isCustomRedesigned: true
      };
      return [...prev, newFeat];
    });
  };

  // Convert client mouse event to exact 1000x1000 SVG coordinate inside the zoomed/panned group
  const getSvgPointFromEvent = useCallback(
    (clientX: number, clientY: number): Point2D | null => {
      const svg = svgRef.current;
      const g = mapGroupRef.current;
      if (!svg || !g) return null;
      const ctm = g.getScreenCTM();
      if (!ctm) return null;
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const transformed = pt.matrixTransform(ctm.inverse());
      return {
        x: Math.max(0, Math.min(1000, Math.round(transformed.x * 10) / 10)),
        y: Math.max(0, Math.min(1000, Math.round(transformed.y * 10) / 10))
      };
    },
    []
  );

  // Update a specific region's properties
  const updateRegionFeature = useCallback(
    (nama: string, updater: (prevFeat: RegionVectorFeature) => RegionVectorFeature) => {
      saveAndSetRegions(prev =>
        prev.map(r => (r.nama === nama ? updater(r) : r))
      );
    },
    [saveAndSetRegions]
  );

  // Start adding a new island/zone polygon to the currently selected Kab/Kota
  const handleStartAddNewZone = useCallback(() => {
    setIsDrawingNewZone(true);
    setPenSubMode('DRAW_NEW');
    setDraftPoints([]);
    setSelectedNodeIndex(null);
    setDraftCurveMode('smooth');
    triggerNotice(
      `Mode Tambah Zonasi Baru (${activeEditorRegion?.label || editorTargetNama} - Pulau/Zonasi #${activeZones.length + 1}): Klik titik-titik pada pulau di peta lalu klik "Simpan Zonasi".`
    );
  }, [activeEditorRegion, editorTargetNama, activeZones.length, triggerNotice]);

  // Delete an additional island/zone from the currently selected Kab/Kota
  const handleDeleteZone = useCallback(
    (zoneIdxToDelete: number) => {
      if (!activeEditorRegion || zoneIdxToDelete <= 0) return;
      updateRegionFeature(activeEditorRegion.nama, feat => {
        const currentZones = getRegionZones(feat);
        if (currentZones.length <= 1) return feat;
        const filteredZones = currentZones.filter((_, i) => i !== zoneIdxToDelete);
        return applyZonesToFeature(feat, filteredZones);
      });
      setActiveZoneIndex(0);
      setSelectedNodeIndex(null);
      setDraftPoints([]);
      triggerNotice(`Zonasi tambahan #${zoneIdxToDelete + 1} pada ${activeEditorRegion.nama} telah dihapus.`);
    },
    [activeEditorRegion, updateRegionFeature, triggerNotice]
  );

  // Finish drawing a new polygon with the Pen Tool and apply it to `editorTargetNama` (either as a new island zone or updating active zone)
  const handleFinishPenDrawing = useCallback(() => {
    if (draftPoints.length < 3) {
      triggerNotice('Minimal buat 3 titik sudut di peta untuk membentuk garis wilayah / zonasi.');
      return;
    }
    const newZonePathD = pointsToSvgPath(draftPoints, true, draftCurveMode);

    if (isDrawingNewZone) {
      let createdZoneIdx = 0;
      updateRegionFeature(editorTargetNama, feat => {
        const currentZones = getRegionZones(feat);
        const newZoneNumber = currentZones.length + 1;
        createdZoneIdx = currentZones.length;
        const newZone: RegionZonePolygon = {
          id: `${feat.id}_zone_${Date.now()}`,
          namaZona: `Zonasi / Pulau #${newZoneNumber}`,
          points: [...draftPoints],
          curveMode: draftCurveMode,
          pathD: newZonePathD
        };
        const nextZones = [...currentZones, newZone];
        const updated = applyZonesToFeature(feat, nextZones);
        return {
          ...updated,
          fillOpacity: Math.max(feat.fillOpacity, 0.28)
        };
      });

      setDraftPoints([]);
      setIsDrawingNewZone(false);
      setActiveZoneIndex(createdZoneIdx);
      setPenSubMode('EDIT_NODES');
      triggerNotice(
        `Zonasi / Pulau baru (#${createdZoneIdx + 1}) berhasil ditambahkan ke ${editorTargetNama} & tersinkron ke Dashboard!`
      );
      return;
    }

    const newCenter = computePolygonCentroid(draftPoints);

    updateRegionFeature(editorTargetNama, feat => {
      const currentZones = getRegionZones(feat);
      const targetIdx = safeZoneIndex < currentZones.length ? safeZoneIndex : 0;
      const nextZones = currentZones.map((z, idx) =>
        idx === targetIdx
          ? {
              ...z,
              points: [...draftPoints],
              curveMode: draftCurveMode,
              pathD: newZonePathD
            }
          : z
      );
      const updated = applyZonesToFeature(feat, nextZones);
      return {
        ...updated,
        center: targetIdx === 0 ? newCenter : feat.center,
        fillOpacity: Math.max(feat.fillOpacity, 0.28)
      };
    });

    setDraftPoints([]);
    setPenSubMode('EDIT_NODES');
    triggerNotice(
      `Garis ${activeZone?.namaZona || 'wilayah'} (${editorTargetNama}) berhasil disimpan & tersinkron ke Dashboard!`
    );
  }, [
    draftPoints,
    draftCurveMode,
    isDrawingNewZone,
    editorTargetNama,
    safeZoneIndex,
    activeZone,
    updateRegionFeature,
    triggerNotice
  ]);

  // Apply color settings of the current region to ALL regions on the map
  const handleApplyColorsToAllRegions = () => {
    if (!activeEditorRegion) return;
    saveAndSetRegions(prev =>
      prev.map(r => ({
        ...r,
        fillColor: activeEditorRegion.fillColor,
        fillOpacity: activeEditorRegion.fillOpacity,
        strokeColor: activeEditorRegion.strokeColor,
        strokeWidth: activeEditorRegion.strokeWidth,
        hoverColor: activeEditorRegion.hoverColor,
        hoverOpacity: activeEditorRegion.hoverOpacity,
        hoverStrokeColor: activeEditorRegion.hoverStrokeColor,
        selectedColor: activeEditorRegion.selectedColor,
        selectedOpacity: activeEditorRegion.selectedOpacity,
        selectedStrokeColor: activeEditorRegion.selectedStrokeColor
      }))
    );
    triggerNotice('Pengaturan warna diterapkan ke semua wilayah & tersinkron ke Dashboard!');
  };

  // Reset single region to default
  const handleResetSingleRegion = (nama: string) => {
    const def = DEFAULT_KPW_REGIONS.find(d => d.nama === nama);
    if (def) {
      saveAndSetRegions(prev => prev.map(r => (r.nama === nama ? { ...def } : r)));
      setDraftPoints([]);
      triggerNotice(`Wilayah ${nama} dikembalikan ke garis & warna awal.`);
    } else {
      saveAndSetRegions(prev => prev.filter(r => r.nama !== nama));
      setEditorTargetNama('Kota Surabaya');
      triggerNotice(`Wilayah tambahan ${nama} dihapus.`);
    }
  };

  // Reset all regions to default
  const handleResetAllRegions = () => {
    localStorage.removeItem(STORAGE_KEY_CUSTOM_REGIONS);
    setRegions(DEFAULT_KPW_REGIONS);
    setDraftPoints([]);
    broadcastMapSync();
    triggerNotice('Seluruh garis wilayah & warna peta dikembalikan ke pengaturan awal.');
  };

  // Zoom Controls
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(4.0, Number((prev + 0.3).toFixed(1))));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => {
      const next = Math.max(1.0, Number((prev - 0.3).toFixed(1)));
      if (next === 1.0) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  }, []);

  // Wheel Zoom (smooth and clamped)
  const handleWheel = (e: React.WheelEvent) => {
    if (showGoogleMaps) return;
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.2 : -0.2;
    setZoom(prev => {
      const next = Math.min(4.0, Math.max(1.0, Number((prev + zoomDelta).toFixed(1))));
      if (next === 1.0) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  // Drag & Pan or Node Dragging handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeEditorOpen && (draggingNodeIndex !== null || isDraggingCenterPin)) {
      return;
    }
    if (activeEditorOpen && penSubMode === 'DRAW_NEW' && e.button === 0) {
      return;
    }
    if (zoom > 1.0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // 1. Live cursor tracking when in Pen Tool mode
    if (activeEditorOpen) {
      const svgPt = getSvgPointFromEvent(e.clientX, e.clientY);
      if (svgPt) {
        setCursorSvgPoint(svgPt);

        // If dragging an existing vertex node in EDIT_NODES mode (updates activeZone)
        if (penSubMode === 'EDIT_NODES' && draggingNodeIndex !== null && activeEditorRegion) {
          updateRegionFeature(activeEditorRegion.nama, feat => {
            const currentZones = getRegionZones(feat);
            const targetIdx = safeZoneIndex < currentZones.length ? safeZoneIndex : 0;
            const targetZone = currentZones[targetIdx];
            if (!targetZone) return feat;

            const nextPts = targetZone.points.map((p, idx) =>
              idx === draggingNodeIndex ? svgPt : p
            );
            const nextZones = currentZones.map((z, idx) =>
              idx === targetIdx
                ? {
                    ...z,
                    points: nextPts,
                    pathD: pointsToSvgPath(nextPts, true, z.curveMode)
                  }
                : z
            );
            return applyZonesToFeature(feat, nextZones);
          });
          return;
        }

        // If dragging the region center pin
        if (penSubMode === 'EDIT_NODES' && isDraggingCenterPin && activeEditorRegion) {
          updateRegionFeature(activeEditorRegion.nama, feat => ({
            ...feat,
            center: svgPt,
            isCustomRedesigned: true
          }));
          return;
        }
      }
    }

    // 2. Standard Map Panning when zoomed
    if (isDragging && zoom > 1.0) {
      const maxPan = (zoom - 1) * 350;
      const newX = Math.max(-maxPan, Math.min(maxPan, e.clientX - dragStart.x));
      const newY = Math.max(-maxPan, Math.min(maxPan, e.clientY - dragStart.y));
      setPan({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggingNodeIndex(null);
    setIsDraggingCenterPin(false);
  };

  // Handle clicking on the SVG canvas when Pen Tool DRAW_NEW is active
  const handleSvgCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!activeEditorOpen || penSubMode !== 'DRAW_NEW') return;
    const pt = getSvgPointFromEvent(e.clientX, e.clientY);
    if (!pt) return;

    // Check if user clicked close to the starting point to close the polygon
    if (draftPoints.length >= 3) {
      const first = draftPoints[0];
      const dist = Math.hypot(pt.x - first.x, pt.y - first.y);
      if (dist <= 14 / zoom) {
        handleFinishPenDrawing();
        return;
      }
    }

    setDraftPoints(prev => [...prev, pt]);
  };

  // Filter bantuan data based on active Year & Quarter filter
  const filteredBantuanByTime = useMemo(() => {
    return bantuanList.filter(item => {
      const matchYear = selectedYear === 'ALL' || String(item.tahun) === selectedYear;
      const matchQuarter = selectedQuarter === 'ALL' || item.triwulan === selectedQuarter;
      return matchYear && matchQuarter;
    });
  }, [bantuanList, selectedYear, selectedQuarter]);

  // Group stats per region based on filtered time
  const statsPerKab = useMemo(() => {
    const map = new Map<string, { count: number; totalNominal: number; items: BantuanItem[] }>();
    WILAYAH_JAWA_TIMUR.forEach(w => {
      map.set(w.nama, { count: 0, totalNominal: 0, items: [] });
    });

    filteredBantuanByTime.forEach(item => {
      const existing = map.get(item.kabupatenKota);
      if (existing) {
        existing.count += 1;
        existing.totalNominal += item.nominalBantuan;
        existing.items.push(item);
      } else {
        map.set(item.kabupatenKota, {
          count: 1,
          totalNominal: item.nominalBantuan,
          items: [item]
        });
      }
    });

    return map;
  }, [filteredBantuanByTime]);

  // Summary in the 13 Wilayah Kerja KPw Jatim
  const kpwSummary = useMemo(() => {
    let count = 0;
    let nominal = 0;
    filteredBantuanByTime.forEach(item => {
      if (isWilayahKerjaKPwJatim(item.kabupatenKota)) {
        count += 1;
        nominal += item.nominalBantuan;
      }
    });
    return { count, nominal };
  }, [filteredBantuanByTime]);

  // Handle region click
  const handleRegionClick = (nama: string) => {
    if (activeEditorOpen) {
      if (penSubMode === 'DRAW_NEW') return;
      handleSelectEditorTarget(nama);
      setInternalSelectedKab(nama);
      setActiveInspectorRegion(nama);
      if (onFilterKabupaten) onFilterKabupaten(nama);
      return;
    }

    const next = activeSelectedKab === nama ? '' : nama;
    setInternalSelectedKab(next);
    setActiveInspectorRegion(next || null);
    if (onFilterKabupaten) {
      onFilterKabupaten(next);
    }
  };

  const currentInspectorTarget = activeInspectorRegion || activeSelectedKab || hoveredRegion;
  const inspectorData = useMemo(() => {
    if (!currentInspectorTarget) return null;
    const stat = statsPerKab.get(currentInspectorTarget) || { count: 0, totalNominal: 0, items: [] };
    const wilayah = WILAYAH_JAWA_TIMUR.find(w => w.nama === currentInspectorTarget);
    const feat = regions.find(r => r.nama === currentInspectorTarget);
    const isKpw = isWilayahKerjaKPwJatim(currentInspectorTarget) || !!feat;
    return {
      nama: currentInspectorTarget,
      isKpw,
      stat,
      alokasiPagu: wilayah?.alokasiPagu || 0,
      feature: feat
    };
  }, [currentInspectorTarget, statsPerKab, regions]);

  const selectedFeature = useMemo(() => {
    if (!activeSelectedKab) return null;
    return regions.find(r => r.nama === activeSelectedKab) || null;
  }, [activeSelectedKab, regions]);

  const selectedFeatureStat = useMemo(() => {
    if (!selectedFeature) return null;
    return statsPerKab.get(selectedFeature.nama) || { count: 0, totalNominal: 0, items: [] };
  }, [selectedFeature, statsPerKab]);

  const hasActiveFilters = selectedYear !== 'ALL' || selectedQuarter !== 'ALL' || !!activeSelectedKab;

  const resetAllMapFilters = () => {
    setSelectedYear('ALL');
    setSelectedQuarter('ALL');
    setInternalSelectedKab('');
    setActiveInspectorRegion(null);
    if (onFilterKabupaten) onFilterKabupaten('');
  };

  // Preview path while drawing in DRAW_NEW mode
  const liveDraftPathD = useMemo(() => {
    if (draftPoints.length === 0) return '';
    const pts = cursorSvgPoint ? [...draftPoints, cursorSvgPoint] : draftPoints;
    return pointsToSvgPath(pts, draftPoints.length >= 3, draftCurveMode);
  }, [draftPoints, cursorSvgPoint, draftCurveMode]);

  const isCustomBaseMapActive = baseMapConfig.imageUrl !== DEFAULT_BASE_MAP_URL;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col font-sans">
      {/* MAP TOP CONTROLS & HEADER */}
      {showFilters && (
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-white flex items-center justify-center shrink-0 shadow-2xs ring-1 ring-slate-200/80">
              <img
                src="/assets/aistudio/Logo_BI_Bulat_27bc9deb.png"
                alt="Logo Bank Indonesia"
                className="w-full h-full object-cover rounded-full scale-[1.22]"
              />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-blue-900 uppercase tracking-widest">
                  Peta Tematik Penyaluran EPML
                </span>
                <span className="text-slate-300">&bull;</span>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                  {regions.length} Wilayah Terpetakan
                </span>
                {enableAdminTools && isCustomBaseMapActive && (
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200 flex items-center gap-1">
                    <Link2 className="w-3 h-3" />
                    <span>Peta Baru Terlink ke Dashboard</span>
                  </span>
                )}
              </div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                Wilayah Kerja KPw Bank Indonesia Provinsi Jawa Timur
              </h3>
            </div>
          </div>

          {/* FILTER CONTROLS & ADMIN-ONLY MAP TOOLS */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Wilayah */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Wilayah:</span>
              <select
                value={activeSelectedKab}
                onChange={(e) => {
                  const val = e.target.value;
                  setInternalSelectedKab(val);
                  setActiveInspectorRegion(val || null);
                  if (val) setEditorTargetNama(val);
                  if (onFilterKabupaten) onFilterKabupaten(val);
                }}
                className={`bg-white text-xs font-semibold px-3 py-2 rounded-xl border shadow-xs focus:outline-none focus:ring-2 cursor-pointer transition-colors ${
                  activeSelectedKab
                    ? 'border-orange-500 text-orange-950 focus:ring-orange-500 ring-2 ring-orange-400 bg-orange-50/40'
                    : 'border-slate-200 text-slate-800 focus:ring-blue-600'
                }`}
              >
                <option value="">Semua 13 Wilayah Kerja ({kpwSummary.count} Bantuan)</option>
                {WILAYAH_KERJA_KPW_JATIM.map(nama => {
                  const stat = statsPerKab.get(nama);
                  return (
                    <option key={nama} value={nama}>
                      {nama.replace('Kabupaten ', 'Kab. ')} ({stat?.count || 0})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Filter Tahun */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Tahun:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className={`bg-white text-xs font-semibold px-3 py-2 rounded-xl border shadow-xs focus:outline-none focus:ring-2 cursor-pointer transition-colors ${
                  selectedYear !== 'ALL'
                    ? 'border-blue-600 text-blue-900 ring-1 ring-blue-400'
                    : 'border-slate-200 text-slate-800 focus:ring-blue-600'
                }`}
              >
                <option value="ALL">Semua Tahun</option>
                <option value="2026">Tahun 2026</option>
                <option value="2025">Tahun 2025</option>
                <option value="2024">Tahun 2024</option>
              </select>
            </div>

            {/* Filter Triwulan */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Triwulan:</span>
              <select
                value={selectedQuarter}
                onChange={(e) => setSelectedQuarter(e.target.value)}
                className={`bg-white text-xs font-semibold px-3 py-2 rounded-xl border shadow-xs focus:outline-none focus:ring-2 cursor-pointer transition-colors ${
                  selectedQuarter !== 'ALL'
                    ? 'border-blue-600 text-blue-900 ring-1 ring-blue-400'
                    : 'border-slate-200 text-slate-800 focus:ring-blue-600'
                }`}
              >
                <option value="ALL">Semua Triwulan</option>
                <option value="Q1">Triwulan I (Q1)</option>
                <option value="Q2">Triwulan II (Q2)</option>
                <option value="Q3">Triwulan III (Q3)</option>
                <option value="Q4">Triwulan IV (Q4)</option>
              </select>
            </div>

            {/* Reset Filters Button */}
            {hasActiveFilters && (
              <button
                onClick={resetAllMapFilters}
                className="px-2.5 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 transition-colors flex items-center gap-1 cursor-pointer"
                title="Reset Filter Peta"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}

            {/* ==================================================================== */}
            {/* ADMIN-ONLY CONTROLS (ONLY IN SUB-MENU PETA SEBARAN & GEO-TAGGING)    */}
            {/* ==================================================================== */}
            {enableAdminTools && (
              <>
                {/* 1. UPDATE / UPLOAD PETA BARU BUTTON */}
                <button
                  type="button"
                  onClick={() => {
                    setShowGoogleMaps(false);
                    setIsMapUploadOpen(prev => !prev);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                    activeMapUploadOpen
                      ? 'bg-indigo-700 text-white border-indigo-700 shadow-sm ring-2 ring-indigo-500/30'
                      : 'bg-indigo-50 text-indigo-950 border-indigo-200 hover:bg-indigo-100 shadow-2xs'
                  }`}
                  title="Update atau Upload Gambar Peta Kewilayahan Baru (Langsung Terlink ke Dashboard Utama)"
                >
                  <Upload className={`w-3.5 h-3.5 ${activeMapUploadOpen ? 'text-indigo-200' : 'text-indigo-700'}`} />
                  <span>{activeMapUploadOpen ? 'Tutup Upload Map' : 'Update / Upload Map Baru'}</span>
                </button>

                {/* 2. PEN TOOL & COLOR EDITOR TOGGLE BUTTON */}
                <button
                  type="button"
                  onClick={() => {
                    setShowGoogleMaps(false);
                    setIsEditorOpen(prev => !prev);
                    if (!isEditorOpen && activeSelectedKab) {
                      setEditorTargetNama(activeSelectedKab);
                    }
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                    activeEditorOpen
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-500/30'
                      : 'bg-blue-950 text-white border-blue-950 hover:bg-blue-900 shadow-xs'
                  }`}
                  title="Buka Studio Pen Tool untuk Redesain Garis Wilayah Kab/Kota & Edit Warna Interaktif"
                >
                  <PenTool className="w-3.5 h-3.5 text-emerald-300" />
                  <span>{activeEditorOpen ? 'Tutup Pen Tool & Warna' : 'Pen Tool & Edit Wilayah'}</span>
                </button>
              </>
            )}

            {/* Google Maps Toggle */}
            <button
              onClick={() => setShowGoogleMaps(prev => !prev)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                showGoogleMaps
                  ? 'bg-blue-900 text-white border-blue-900 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
              }`}
              title="Alihkan ke tampilan Google Maps Satelit"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>{showGoogleMaps ? 'Peta Tematik' : 'Google Maps'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ======================================================================== */}
      {/* ADMIN STUDIO 1: UPDATE / UPLOAD MAP KEWILAYAHAN BARU (TERLINK DASHBOARD) */}
      {/* ======================================================================== */}
      {activeMapUploadOpen && !showGoogleMaps && (
        <div className="bg-indigo-950 text-slate-100 border-b border-indigo-900 px-4 sm:px-5 py-4 space-y-3.5 animate-in fade-in duration-150">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-indigo-900/80">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 px-2.5 py-1 rounded-lg text-[11px] font-extrabold uppercase tracking-wider">
                <ImageIcon className="w-3.5 h-3.5 text-indigo-300" />
                <span>Update / Upload Layout Peta Kewilayahan Baru</span>
              </div>

              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                <Link2 className="w-3.5 h-3.5" />
                <span>Otomatis Terlink & Tersinkron ke Peta Tematik Dashboard Utama</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              {editorNotice && (
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-[11px] font-semibold flex items-center gap-1 animate-in fade-in">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{editorNotice}</span>
                </span>
              )}

              {isCustomBaseMapActive && (
                <button
                  type="button"
                  onClick={handleResetBaseMapToDefault}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800/70 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Kembalikan gambar peta ke Peta Standar KPwBI Jatim"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Kembalikan Peta Standar</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
            {/* Left 6 Cols: Upload File Gambar Peta Baru atau Input URL */}
            <div className="lg:col-span-6 bg-indigo-900/45 border border-indigo-800/80 rounded-xl p-3.5 flex flex-col justify-between gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-indigo-300" />
                    <span>Unggah File Peta Kewilayahan Baru</span>
                  </h4>
                  <p className="text-[11px] text-indigo-200/80 mt-0.5 leading-relaxed">
                    Jika terdapat pembaruan desain atau layout kewilayahan Jawa Timur, unggah gambar peta baru (PNG, JPG, WEBP, atau SVG). Peta pada halaman utama Dashboard publik akan otomatis ikut diperbarui.
                  </p>
                </div>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                  onChange={handleMapFileUpload}
                  className="hidden"
                />

                <button
                  type="button"
                  disabled={isProcessingUpload}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs shrink-0 flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
                >
                  {isProcessingUpload ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Pilih File Peta Baru</span>
                    </>
                  )}
                </button>
              </div>

              {/* URL Input Alternative + Active File Status */}
              <div className="pt-2 border-t border-indigo-800/60 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  value={customMapUrlInput}
                  onChange={e => setCustomMapUrlInput(e.target.value)}
                  placeholder="Atau tempel URL gambar peta baru (https://... atau /assets/...)"
                  className="flex-1 bg-indigo-950/90 text-white placeholder-indigo-400/60 text-xs px-3 py-1.5 rounded-lg border border-indigo-800 focus:outline-none focus:border-emerald-400"
                />
                <button
                  type="button"
                  disabled={!customMapUrlInput.trim()}
                  onClick={handleApplyCustomMapUrl}
                  className="px-3 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40 text-white text-xs font-bold cursor-pointer shrink-0 transition-colors"
                >
                  Terapkan URL Peta
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-indigo-200/90 bg-indigo-950/70 px-3 py-1.5 rounded-lg border border-indigo-800/60">
                <span className="truncate">
                  Peta Aktif: <strong className="text-white">{baseMapConfig.fileName}</strong>
                </span>
                <span className="text-[10px] text-emerald-300 font-semibold shrink-0 ml-2">
                  {baseMapConfig.updatedAt ? `Diupdate: ${baseMapConfig.updatedAt}` : 'Peta Bawaan Sistem'}
                </span>
              </div>
            </div>

            {/* Right 6 Cols: Kalibrasi Posisi & Skala Layout Peta Baru */}
            <div className="lg:col-span-6 bg-indigo-900/45 border border-indigo-800/80 rounded-xl p-3.5 flex flex-col justify-between gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-300" />
                  <span>Kalibrasi Posisi & Proporsi Layout Peta</span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    saveAndSetBaseMap(prev => ({
                      ...prev,
                      scale: 1,
                      offsetX: 0,
                      offsetY: 0,
                      opacity: 1,
                      fitMode: 'meet'
                    }))
                  }
                  className="text-[10px] font-bold text-indigo-200 hover:text-white bg-indigo-800/70 px-2 py-0.5 rounded cursor-pointer"
                >
                  Reset Posisi & Skala (100%)
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Scale Slider */}
                <div className="bg-indigo-950/70 p-2.5 rounded-lg border border-indigo-800/70 space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-indigo-200 font-semibold">Skala Ukuran Peta:</span>
                    <span className="font-mono font-bold text-emerald-300">
                      {Math.round(baseMapConfig.scale * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={160}
                    value={Math.round(baseMapConfig.scale * 100)}
                    onChange={e =>
                      saveAndSetBaseMap(prev => ({
                        ...prev,
                        scale: Number(e.target.value) / 100
                      }))
                    }
                    className="w-full accent-emerald-400 cursor-pointer h-1.5"
                  />
                </div>

                {/* Opacity Slider */}
                <div className="bg-indigo-950/70 p-2.5 rounded-lg border border-indigo-800/70 space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-indigo-200 font-semibold">Kecerahan / Opasitas Peta:</span>
                    <span className="font-mono font-bold text-emerald-300">
                      {Math.round(baseMapConfig.opacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={25}
                    max={100}
                    value={Math.round(baseMapConfig.opacity * 100)}
                    onChange={e =>
                      saveAndSetBaseMap(prev => ({
                        ...prev,
                        opacity: Number(e.target.value) / 100
                      }))
                    }
                    className="w-full accent-emerald-400 cursor-pointer h-1.5"
                  />
                </div>

                {/* Offset X Slider */}
                <div className="bg-indigo-950/70 p-2.5 rounded-lg border border-indigo-800/70 space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-indigo-200 font-semibold">Geser Horizontal (X):</span>
                    <span className="font-mono font-bold text-sky-300">{baseMapConfig.offsetX}px</span>
                  </div>
                  <input
                    type="range"
                    min={-250}
                    max={250}
                    value={baseMapConfig.offsetX}
                    onChange={e =>
                      saveAndSetBaseMap(prev => ({
                        ...prev,
                        offsetX: Number(e.target.value)
                      }))
                    }
                    className="w-full accent-sky-400 cursor-pointer h-1.5"
                  />
                </div>

                {/* Offset Y Slider */}
                <div className="bg-indigo-950/70 p-2.5 rounded-lg border border-indigo-800/70 space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-indigo-200 font-semibold">Geser Vertikal (Y):</span>
                    <span className="font-mono font-bold text-sky-300">{baseMapConfig.offsetY}px</span>
                  </div>
                  <input
                    type="range"
                    min={-250}
                    max={250}
                    value={baseMapConfig.offsetY}
                    onChange={e =>
                      saveAndSetBaseMap(prev => ({
                        ...prev,
                        offsetY: Number(e.target.value)
                      }))
                    }
                    className="w-full accent-sky-400 cursor-pointer h-1.5"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================== */}
      {/* ADMIN STUDIO 2: REDESAIN GARIS WILAYAH (PEN TOOL) & EDITOR WARNA         */}
      {/* ======================================================================== */}
      {activeEditorOpen && !showGoogleMaps && activeEditorRegion && (
        <div className="bg-slate-900 text-slate-100 border-b border-slate-800 px-4 sm:px-5 py-3.5 space-y-3 animate-in fade-in duration-150">
          {/* Top Row: Target Region Selector + Sub-Mode Switcher + Status Notice */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-2.5 py-1 rounded-lg text-[11px] font-extrabold uppercase tracking-wider">
                <PenTool className="w-3.5 h-3.5" />
                <span>Studio Pen Tool & Warna Wilayah</span>
              </div>

              {/* Select Kab/Kota to Redesign */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[11px] font-semibold text-slate-400">Target Kab/Kota:</span>
                <select
                  value={activeEditorRegion.nama}
                  onChange={e => handleSelectEditorTarget(e.target.value)}
                  className="bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-400 cursor-pointer"
                >
                  <optgroup label="13 Wilayah Kerja KPw BI Prov. Jatim">
                    {WILAYAH_KERJA_KPW_JATIM.map(nama => {
                      const r = regions.find(reg => reg.nama === nama);
                      return (
                        <option key={nama} value={nama}>
                          {nama} {r?.isCustomRedesigned ? '✓ (Diedit)' : ''}
                        </option>
                      );
                    })}
                  </optgroup>
                  <optgroup label="Wilayah Jawa Timur Lainnya (Tambah/Gambar)">
                    {WILAYAH_JAWA_TIMUR.filter(w => !isWilayahKerjaKPwJatim(w.nama)).map(w => {
                      const r = regions.find(reg => reg.nama === w.nama);
                      return (
                        <option key={w.nama} value={w.nama}>
                          {w.nama} {r ? '✓ (Terpetakan)' : '+ (Buat Garis)'}
                        </option>
                      );
                    })}
                  </optgroup>
                </select>
              </div>

              {/* 3 Mode Buttons: Gambar Baru (Pen Tool) | Edit Titik Sudut | Uji Hover & Klik */}
              <div className="inline-flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setIsDrawingNewZone(false);
                    setPenSubMode('DRAW_NEW');
                    setDraftPoints([]);
                    setSelectedNodeIndex(null);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    penSubMode === 'DRAW_NEW' && !isDrawingNewZone
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="Klik titik demi titik di peta untuk menggambar ulang batas zona aktif saat ini"
                >
                  <PenTool className="w-3 h-3" />
                  <span>1. Gambar Ulang Zona (Pen Tool)</span>
                </button>

                <button
                  type="button"
                  onClick={handleStartAddNewZone}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    penSubMode === 'DRAW_NEW' && isDrawingNewZone
                      ? 'bg-teal-500 text-slate-950 shadow-xs'
                      : 'text-emerald-300 hover:text-white'
                  }`}
                  title="Tambahkan zonasi wilayah / pulau terpisah dari daratan utama untuk Kab/Kota ini"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Tambah Zonasi / Pulau</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsDrawingNewZone(false);
                    setPenSubMode('EDIT_NODES');
                    setDraftPoints([]);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    penSubMode === 'EDIT_NODES'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="Geser titik sudut yang sudah ada, tambah titik di tengah garis, atau geser posisi pin wilayah"
                >
                  <Crosshair className="w-3 h-3" />
                  <span>2. Geser & Rapikan Titik ({activeZone?.points.length || 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsDrawingNewZone(false);
                    setPenSubMode('PREVIEW');
                    setDraftPoints([]);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    penSubMode === 'PREVIEW'
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="Uji coba warna ketika wilayah dipilih kursor (hover) maupun ketika diklik"
                >
                  <MousePointerClick className="w-3 h-3" />
                  <span>3. Uji Kursor & Klik</span>
                </button>
              </div>
            </div>

            {/* Action & Reset Controls */}
            <div className="flex items-center gap-2">
              {editorNotice && (
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-[11px] font-semibold flex items-center gap-1 animate-in fade-in">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{editorNotice}</span>
                </span>
              )}

              <button
                type="button"
                onClick={() => {
                  setActiveZoneIndex(0);
                  setIsDrawingNewZone(false);
                  handleResetSingleRegion(activeEditorRegion.nama);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                title="Kembalikan garis & warna wilayah ini ke default"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Wilayah Ini</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveZoneIndex(0);
                  setIsDrawingNewZone(false);
                  handleResetAllRegions();
                }}
                className="px-2.5 py-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-900/80 text-rose-200 border border-rose-800/60 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                title="Reset seluruh 13 wilayah ke desain default"
              >
                <Trash2 className="w-3 h-3" />
                <span>Reset Semua</span>
              </button>
            </div>
          </div>

          {/* Row 1.5: Multi-Zone / Kepulauan Bar for Selected Kab/Kota */}
          <div className="bg-slate-800/75 border border-slate-700/80 rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-extrabold text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>Zonasi Wilayah & Pulau ({activeEditorRegion.label} &bull; {activeZones.length} Zona):</span>
              </span>

              <div className="flex flex-wrap items-center gap-1.5">
                {activeZones.map((zone, zIdx) => {
                  const isZoneActive = !isDrawingNewZone && safeZoneIndex === zIdx;
                  return (
                    <div
                      key={zone.id || zIdx}
                      className={`inline-flex items-center rounded-lg border text-[11px] font-bold transition-all ${
                        isZoneActive
                          ? 'bg-teal-500/20 border-teal-400 text-teal-200 ring-1 ring-teal-400/40'
                          : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setActiveZoneIndex(zIdx);
                          setIsDrawingNewZone(false);
                          setSelectedNodeIndex(null);
                          setDraftPoints([]);
                          setDraftCurveMode(zone.curveMode || 'polygon');
                          if (penSubMode === 'PREVIEW') {
                            setPenSubMode('EDIT_NODES');
                          }
                        }}
                        className="px-2.5 py-1 flex items-center gap-1.5 cursor-pointer"
                        title={`Pilih ${zone.namaZona} untuk diedit titik sudutnya atau digambar ulang`}
                      >
                        <span>
                          {zIdx === 0 ? 'Zona 1 (Daratan Utama)' : `Zona ${zIdx + 1} (Pulau / Area #${zIdx + 1})`}
                        </span>
                        <span className="text-[10px] font-mono opacity-75">
                          ({zone.points.length} titik)
                        </span>
                      </button>

                      {zIdx > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteZone(zIdx);
                          }}
                          className="pr-2 pl-1 py-1 text-rose-400 hover:text-rose-200 cursor-pointer"
                          title={`Hapus Zona ${zIdx + 1}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={handleStartAddNewZone}
                  className={`px-3 py-1 rounded-lg text-[11px] font-extrabold flex items-center gap-1 cursor-pointer transition-all border ${
                    penSubMode === 'DRAW_NEW' && isDrawingNewZone
                      ? 'bg-teal-400 text-slate-950 border-teal-300 shadow-sm'
                      : 'bg-emerald-600/25 hover:bg-emerald-600/40 text-emerald-300 border-emerald-500/40'
                  }`}
                  title="Gambar zonasi pulau tambahan menggunakan Pen Tool untuk Kab/Kota ini"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>
                    {penSubMode === 'DRAW_NEW' && isDrawingNewZone
                      ? `Sedang Menggambar Zona #${activeZones.length + 1} (Pulau)...`
                      : '+ Tambah Zonasi Wilayah / Pulau'}
                  </span>
                </button>
              </div>
            </div>

            <span className="text-[10px] text-slate-400">
              Seluruh zona dalam 1 Kab/Kota otomatis menyala bersamaan saat dipilih kursor atau diklik.
            </span>
          </div>

          {/* Row 2: Contextual Pen Tool Controls + Interactive Color Pickers (Klik, Kursor Hover & Normal) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
            {/* Left 5 Cols: Pen Tool / Vertex Instructions & Controls */}
            <div className="lg:col-span-5 bg-slate-800/90 border border-slate-700/80 rounded-xl p-3 flex flex-col justify-between gap-2">
              {penSubMode === 'DRAW_NEW' ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-extrabold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      {isDrawingNewZone
                        ? `Tambah Zonasi / Pulau Baru (#${activeZones.length + 1}): ${activeEditorRegion.label}`
                        : `Gambar Ulang Zona #${safeZoneIndex + 1}: ${activeEditorRegion.label}`}
                    </span>
                    <span className="text-[11px] font-mono bg-slate-900 px-2 py-0.5 rounded text-slate-300">
                      {draftPoints.length} Titik Dibuat
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {isDrawingNewZone ? (
                      <>
                        Klik titik demi titik mengelilingi <strong className="text-teal-300">pulau / zonasi tambahan</strong> milik{' '}
                        <strong className="text-white">{activeEditorRegion.nama}</strong>. Daratan utama tidak akan terhapus dan akan terhubung otomatis.
                      </>
                    ) : (
                      <>
                        Klik pada peta mengikuti batas <strong className="text-white">{activeZone?.namaZona || activeEditorRegion.nama}</strong>. Klik titik awal (hijau) atau tombol <strong className="text-emerald-300">Selesai & Terapkan</strong> untuk menutup garis wilayah.
                      </>
                    )}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {/* Straight vs Smooth Curve Toggle */}
                    <button
                      type="button"
                      onClick={() =>
                        setDraftCurveMode(prev => (prev === 'polygon' ? 'smooth' : 'polygon'))
                      }
                      className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-semibold cursor-pointer"
                    >
                      Tipe Garis: {draftCurveMode === 'polygon' ? 'Poligon Tegas (Lurus)' : 'Kurva Halus (Bezier)'}
                    </button>

                    <button
                      type="button"
                      disabled={draftPoints.length === 0}
                      onClick={() => setDraftPoints(prev => prev.slice(0, -1))}
                      className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Undo2 className="w-3 h-3" />
                      <span>Undo Titik</span>
                    </button>

                    <button
                      type="button"
                      disabled={draftPoints.length === 0}
                      onClick={() => setDraftPoints([])}
                      className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-rose-300 text-[11px] font-semibold cursor-pointer"
                    >
                      Hapus Draft
                    </button>

                    <button
                      type="button"
                      disabled={draftPoints.length < 3}
                      onClick={handleFinishPenDrawing}
                      className="ml-auto px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 text-[11px] font-black flex items-center gap-1 cursor-pointer shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isDrawingNewZone ? 'Simpan Zonasi Baru' : 'Selesai & Terapkan Garis'}</span>
                    </button>
                  </div>
                </div>
              ) : penSubMode === 'EDIT_NODES' ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-extrabold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Crosshair className="w-3.5 h-3.5" />
                      Rapikan Titik ({activeZone?.namaZona || `Zona #${safeZoneIndex + 1}`}): {activeEditorRegion.label}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const currentCurve = activeZone?.curveMode || activeEditorRegion.curveMode;
                          const nextMode: 'polygon' | 'smooth' = currentCurve === 'polygon' ? 'smooth' : 'polygon';
                          updateRegionFeature(activeEditorRegion.nama, feat => {
                            const currentZones = getRegionZones(feat);
                            const tIdx = safeZoneIndex < currentZones.length ? safeZoneIndex : 0;
                            const nextZones = currentZones.map((z, idx) =>
                              idx === tIdx
                                ? {
                                    ...z,
                                    curveMode: nextMode,
                                    pathD: pointsToSvgPath(z.points, true, nextMode)
                                  }
                                : z
                            );
                            return applyZonesToFeature(feat, nextZones);
                          });
                        }}
                        className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-[10px] font-bold text-sky-300 cursor-pointer"
                      >
                        Mode: {(activeZone?.curveMode || activeEditorRegion.curveMode) === 'polygon' ? 'Garis Lurus' : 'Kurva Halus'}
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    &bull; <strong className="text-white">Geser titik putih</strong> pada zona aktif untuk merapikan garis batas.<br />
                    &bull; <strong className="text-emerald-300">Klik titik hijau kecil (+)</strong> di tengah garis untuk menambah titik sudut baru.<br />
                    &bull; Klik tombol <strong className="text-teal-300">+ Tambah Zonasi / Pulau</strong> di atas jika wilayah ini memiliki pulau terpisah.
                  </p>
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <span className="text-[10px] text-slate-400">
                      {selectedNodeIndex !== null
                        ? `Titik #${selectedNodeIndex + 1} pada Zona #${safeZoneIndex + 1} dipilih`
                        : 'Klik salah satu titik sudut jika ingin menghapusnya'}
                    </span>
                    {selectedNodeIndex !== null && (activeZone?.points.length || 0) > 3 && (
                      <button
                        type="button"
                        onClick={() => {
                          updateRegionFeature(activeEditorRegion.nama, feat => {
                            const currentZones = getRegionZones(feat);
                            const tIdx = safeZoneIndex < currentZones.length ? safeZoneIndex : 0;
                            const targetZ = currentZones[tIdx];
                            if (!targetZ || targetZ.points.length <= 3) return feat;
                            const nextPts = targetZ.points.filter((_, i) => i !== selectedNodeIndex);
                            const nextZones = currentZones.map((z, idx) =>
                              idx === tIdx
                                ? {
                                    ...z,
                                    points: nextPts,
                                    pathD: pointsToSvgPath(nextPts, true, z.curveMode)
                                  }
                                : z
                            );
                            return applyZonesToFeature(feat, nextZones);
                          });
                          setSelectedNodeIndex(null);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Hapus Titik #{selectedNodeIndex + 1}</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-extrabold text-orange-300 uppercase tracking-wider flex items-center gap-1.5">
                    <MousePointerClick className="w-3.5 h-3.5" />
                    Mode Uji Interaksi Kursor & Klik Peta
                  </span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Arahkan kursor (hover) atau klik langsung daratan utama maupun pulau milik <strong className="text-white">{activeEditorRegion.nama}</strong> di peta untuk melihat seluruh zonasi menyala secara serentak.
                  </p>
                </div>
              )}
            </div>

            {/* Right 7 Cols: Interactive Color Controls (Saat Diklik, Saat Dipilih Kursor / Hover, dan Warna Dasar/Garis) */}
            <div className="lg:col-span-7 bg-slate-800/90 border border-slate-700/80 rounded-xl p-3 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-amber-400" />
                  Edit Warna Wilayah ({activeEditorRegion.label})
                </span>
                <button
                  type="button"
                  onClick={handleApplyColorsToAllRegions}
                  className="px-2.5 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 border border-blue-400/40 text-blue-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Samakan warna Klik, Hover Kursor, dan Warna Dasar ke seluruh 13 wilayah"
                >
                  <Layers className="w-3 h-3" />
                  <span>Terapkan Warna Ini ke Semua Wilayah</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* 1. WARNA SAAT DIKLIK (SELECTED) */}
                <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-300">
                      1. Saat Diklik (Aktif)
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {Math.round(activeEditorRegion.selectedOpacity * 100)}%
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={activeEditorRegion.selectedColor}
                      onChange={e =>
                        updateRegionFeature(activeEditorRegion.nama, feat => ({
                          ...feat,
                          selectedColor: e.target.value,
                          isCustomRedesigned: true
                        }))
                      }
                      className="w-7 h-7 rounded cursor-pointer border border-slate-600 bg-transparent shrink-0"
                      title="Pilih Warna Wilayah Saat Diklik"
                    />
                    <div className="flex flex-wrap gap-1">
                      {COLOR_PRESETS_CLICK.map(preset => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() =>
                            updateRegionFeature(activeEditorRegion.nama, feat => ({
                              ...feat,
                              selectedColor: preset.value,
                              isCustomRedesigned: true
                            }))
                          }
                          className={`w-4 h-4 rounded-full border transition-transform cursor-pointer ${
                            activeEditorRegion.selectedColor.toLowerCase() === preset.value
                              ? 'scale-125 border-white ring-1 ring-white'
                              : 'border-slate-600 hover:scale-110'
                          }`}
                          style={{ backgroundColor: preset.value }}
                          title={`Warna Klik: ${preset.label}`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">Pekat:</span>
                    <input
                      type="range"
                      min={20}
                      max={100}
                      value={Math.round(activeEditorRegion.selectedOpacity * 100)}
                      onChange={e =>
                        updateRegionFeature(activeEditorRegion.nama, feat => ({
                          ...feat,
                          selectedOpacity: Number(e.target.value) / 100,
                          isCustomRedesigned: true
                        }))
                      }
                      className="w-full accent-orange-500 cursor-pointer h-1.5"
                    />
                  </div>
                </div>

                {/* 2. WARNA SAAT DIPILIH KURSOR (HOVER) */}
                <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-300">
                      2. Saat Kursor (Hover)
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {Math.round(activeEditorRegion.hoverOpacity * 100)}%
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={activeEditorRegion.hoverColor}
                      onChange={e =>
                        updateRegionFeature(activeEditorRegion.nama, feat => ({
                          ...feat,
                          hoverColor: e.target.value,
                          isCustomRedesigned: true
                        }))
                      }
                      className="w-7 h-7 rounded cursor-pointer border border-slate-600 bg-transparent shrink-0"
                      title="Pilih Warna Saat Kursor Diarahkan (Hover)"
                    />
                    <div className="flex flex-wrap gap-1">
                      {COLOR_PRESETS_HOVER.map(preset => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() =>
                            updateRegionFeature(activeEditorRegion.nama, feat => ({
                              ...feat,
                              hoverColor: preset.value,
                              isCustomRedesigned: true
                            }))
                          }
                          className={`w-4 h-4 rounded-full border transition-transform cursor-pointer ${
                            activeEditorRegion.hoverColor.toLowerCase() === preset.value
                              ? 'scale-125 border-white ring-1 ring-white'
                              : 'border-slate-600 hover:scale-110'
                          }`}
                          style={{ backgroundColor: preset.value }}
                          title={`Warna Hover Kursor: ${preset.label}`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">Pekat:</span>
                    <input
                      type="range"
                      min={15}
                      max={95}
                      value={Math.round(activeEditorRegion.hoverOpacity * 100)}
                      onChange={e =>
                        updateRegionFeature(activeEditorRegion.nama, feat => ({
                          ...feat,
                          hoverOpacity: Number(e.target.value) / 100,
                          isCustomRedesigned: true
                        }))
                      }
                      className="w-full accent-sky-400 cursor-pointer h-1.5"
                    />
                  </div>
                </div>

                {/* 3. WARNA DASAR & GARIS BATAS WILAYAH */}
                <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">
                      3. Warna Dasar & Garis
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Isi {Math.round(activeEditorRegion.fillOpacity * 100)}%
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={activeEditorRegion.fillColor}
                      onChange={e =>
                        updateRegionFeature(activeEditorRegion.nama, feat => ({
                          ...feat,
                          fillColor: e.target.value,
                          isCustomRedesigned: true
                        }))
                      }
                      className="w-7 h-7 rounded cursor-pointer border border-slate-600 bg-transparent shrink-0"
                      title="Pilih Warna Dasar Wilayah"
                    />
                    <div className="flex flex-wrap gap-1">
                      {COLOR_PRESETS_BASE.map(preset => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() =>
                            updateRegionFeature(activeEditorRegion.nama, feat => ({
                              ...feat,
                              fillColor: preset.value,
                              isCustomRedesigned: true
                            }))
                          }
                          className={`w-4 h-4 rounded-full border transition-transform cursor-pointer ${
                            activeEditorRegion.fillColor.toLowerCase() === preset.value
                              ? 'scale-125 border-white ring-1 ring-white'
                              : 'border-slate-600 hover:scale-110'
                          }`}
                          style={{ backgroundColor: preset.value }}
                          title={`Warna Dasar: ${preset.label}`}
                        />
                      ))}
                    </div>

                    {/* Stroke Color Picker */}
                    <div className="ml-auto flex items-center gap-1" title="Warna Garis Batas Wilayah">
                      <span className="text-[9px] text-slate-400">Garis:</span>
                      <input
                        type="color"
                        value={activeEditorRegion.strokeColor}
                        onChange={e =>
                          updateRegionFeature(activeEditorRegion.nama, feat => ({
                            ...feat,
                            strokeColor: e.target.value,
                            isCustomRedesigned: true
                          }))
                        }
                        className="w-5 h-5 rounded cursor-pointer border border-slate-600 bg-transparent"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">Isi:</span>
                    <input
                      type="range"
                      min={0}
                      max={90}
                      value={Math.round(activeEditorRegion.fillOpacity * 100)}
                      onChange={e =>
                        updateRegionFeature(activeEditorRegion.nama, feat => ({
                          ...feat,
                          fillOpacity: Number(e.target.value) / 100,
                          isCustomRedesigned: true
                        }))
                      }
                      className="w-full accent-emerald-400 cursor-pointer h-1.5"
                    />
                    <span className="text-[10px] text-slate-400">Tebal:</span>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      step={0.5}
                      value={activeEditorRegion.strokeWidth}
                      onChange={e =>
                        updateRegionFeature(activeEditorRegion.nama, feat => ({
                          ...feat,
                          strokeWidth: Number(e.target.value),
                          isCustomRedesigned: true
                        }))
                      }
                      className="w-16 accent-emerald-400 cursor-pointer h-1.5"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN MAP CANVAS WITH REPLICATED GRID LINES MATCHING THE ASSET PHOTO */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`relative ${heightClass} w-full overflow-hidden select-none ${
          activeEditorOpen && penSubMode === 'DRAW_NEW'
            ? 'cursor-crosshair'
            : zoom > 1.0
            ? isDragging
              ? 'cursor-grabbing'
              : 'cursor-grab'
            : 'cursor-default'
        }`}
        style={{
          backgroundColor: '#ffffff',
          backgroundImage: `
            linear-gradient(to right, rgba(203, 213, 225, 0.45) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(203, 213, 225, 0.45) 1px, transparent 1px)
          `,
          backgroundSize: '62.5px 62.5px'
        }}
      >
        {!showGoogleMaps ? (
          <div className="relative w-full h-full flex items-center justify-center p-2 sm:p-4">
            {/* FLOATING ZOOM & PAN CONTROLS */}
            <div className="absolute top-5 right-5 z-20 flex flex-col items-center bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-lg p-1.5 gap-1">
              <button
                onClick={handleZoomIn}
                disabled={zoom >= 4.0}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-700 hover:bg-slate-100 hover:text-slate-950 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Perbesar Peta (Zoom In)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <div className="px-2 py-0.5 text-[10px] font-extrabold text-blue-900 tabular-nums">
                {Math.round(zoom * 100)}%
              </div>

              <button
                onClick={handleZoomOut}
                disabled={zoom <= 1.0}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-700 hover:bg-slate-100 hover:text-slate-950 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Perkecil Peta (Zoom Out)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              {zoom > 1.0 && (
                <button
                  onClick={handleResetZoom}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-orange-600 hover:bg-orange-50 transition-colors border-t border-slate-100 cursor-pointer"
                  title="Reset Ukuran Peta (100%)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* DRAG / PAN OR PEN TOOL INSTRUCTION HINT */}
            {activeEditorOpen ? (
              <div className="absolute top-5 left-5 z-20 bg-slate-900/90 backdrop-blur-md text-white text-[11px] font-semibold px-3.5 py-2 rounded-2xl shadow-lg border border-slate-700 flex items-center gap-2 pointer-events-none animate-in fade-in">
                <PenTool className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {penSubMode === 'DRAW_NEW'
                    ? `Mode Pen Tool Aktif (${activeEditorRegion?.label}): Klik di peta untuk membuat titik sudut garis wilayah`
                    : penSubMode === 'EDIT_NODES'
                    ? `Mode Edit Titik (${activeEditorRegion?.label}): Geser titik putih di peta untuk merapikan garis batas`
                    : 'Mode Uji: Arahkan kursor atau klik wilayah untuk menguji warna'}
                </span>
                {cursorSvgPoint && (
                  <span className="font-mono text-[10px] text-emerald-300 bg-slate-800 px-1.5 py-0.5 rounded">
                    X:{Math.round(cursorSvgPoint.x)} Y:{Math.round(cursorSvgPoint.y)}
                  </span>
                )}
              </div>
            ) : (
              zoom > 1.0 && (
                <div className="absolute top-5 left-5 z-20 bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5 pointer-events-none animate-in fade-in">
                  <Move className="w-3.5 h-3.5 text-orange-400" />
                  <span>Geser peta untuk menjelajahi wilayah</span>
                </div>
              )
            )}

            {/* SVG CONTAINER WITH EXACT 1:1 SQUARE VIEWBOX MATCHING REFERENCE ARTWORK */}
            <svg
              ref={svgRef}
              viewBox="0 0 1000 1000"
              onClick={handleSvgCanvasClick}
              onDoubleClick={() => {
                if (activeEditorOpen && penSubMode === 'DRAW_NEW' && draftPoints.length >= 3) {
                  handleFinishPenDrawing();
                }
              }}
              className="w-full h-full max-h-full object-contain filter drop-shadow-[0_12px_28px_rgba(0,0,0,0.06)]"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                {/* 1. 3D Elevation Filters for active hover and selection states */}
                <filter id="activeElevationHover" x="-40%" y="-40%" width="180%" height="180%">
                  <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#091e42" floodOpacity="0.45" />
                  <feDropShadow dx="0" dy="1" stdDeviation="3" floodColor="#38bdf8" floodOpacity="0.8" />
                </filter>

                {/* 2. 3D ELEVATION FILTER WHEN CLICKED / SELECTED */}
                <filter id="activeElevationSelectedOrange" x="-45%" y="-45%" width="190%" height="190%">
                  <feDropShadow dx="0" dy="12" stdDeviation="8" floodColor="#0f172a" floodOpacity="0.65" />
                  <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="#ffffff" floodOpacity="0.45" />
                </filter>

                {/* 3. Topmost Layer Pop-up Shadow Filter */}
                <filter id="topPopupShadow" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#091e42" floodOpacity="0.65" />
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0f172a" floodOpacity="0.4" />
                </filter>
              </defs>

              {/* ZOOM & PAN SCALABLE GROUP CONTAINER */}
              <g
                ref={mapGroupRef}
                transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
                style={{
                  transformOrigin: '500px 500px',
                  transition:
                    isDragging || draggingNodeIndex !== null || isDraggingCenterPin
                      ? 'none'
                      : 'transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1)'
                }}
              >
                {/* CARTOGRAPHIC BASE LAYER (AUTOMATICALLY LINKED BETWEEN ADMIN & DASHBOARD) */}
                <g
                  transform={`translate(${500 + baseMapConfig.offsetX}, ${500 + baseMapConfig.offsetY}) scale(${baseMapConfig.scale}) translate(-500, -500)`}
                  style={{ opacity: baseMapConfig.opacity }}
                >
                  <image
                    href={baseMapConfig.imageUrl}
                    x="0"
                    y="0"
                    width="1000"
                    height="1000"
                    preserveAspectRatio={
                      baseMapConfig.fitMode === 'slice'
                        ? 'xMidYMid slice'
                        : baseMapConfig.fitMode === 'none'
                        ? 'none'
                        : 'xMidYMid meet'
                    }
                  />
                </g>

                {/* BASE INTERACTIVE WILAYAH POLYGONS */}
                <g id="kpw-working-areas">
                  {regions.map((feat) => {
                    const stat = statsPerKab.get(feat.nama);
                    const isHovered = hoveredRegion === feat.nama;
                    const isSelected = activeSelectedKab === feat.nama;
                    const isBeingEdited = activeEditorOpen && activeEditorRegion?.nama === feat.nama;
                    const aidCount = stat?.count || 0;

                    const currentFill = isSelected
                      ? feat.selectedColor || '#ea580c'
                      : isHovered
                      ? feat.hoverColor || '#2563eb'
                      : feat.fillColor || '#0284c7';

                    const currentFillOpacity = isSelected
                      ? feat.selectedOpacity ?? 0.92
                      : isHovered
                      ? feat.hoverOpacity ?? 0.48
                      : isBeingEdited
                      ? Math.max(feat.fillOpacity ?? 0.14, 0.35)
                      : feat.fillOpacity ?? 0.14;

                    const currentStroke = isSelected
                      ? feat.selectedStrokeColor || '#ffffff'
                      : isHovered
                      ? feat.hoverStrokeColor || '#38bdf8'
                      : isBeingEdited
                      ? '#10b981'
                      : feat.strokeColor || '#ffffff';

                    const currentStrokeWidth = isSelected
                      ? Math.max((feat.strokeWidth || 1.5) + 2, 3.5)
                      : isHovered
                      ? Math.max((feat.strokeWidth || 1.5) + 1.2, 2.8)
                      : isBeingEdited
                      ? Math.max(feat.strokeWidth || 1.5, 2.5)
                      : feat.strokeWidth || 1.5;

                    return (
                      <g
                        key={feat.id}
                        className={`transition-all duration-150 ${
                          activeEditorOpen && penSubMode === 'DRAW_NEW'
                            ? 'pointer-events-none'
                            : 'cursor-pointer'
                        }`}
                        onMouseEnter={() => setHoveredRegion(feat.nama)}
                        onMouseLeave={() => setHoveredRegion(null)}
                        onClick={(e) => {
                          if (activeEditorOpen && penSubMode === 'DRAW_NEW') return;
                          e.stopPropagation();
                          handleRegionClick(feat.nama);
                        }}
                      >
                        {/* Base Vector Polygon Highlight */}
                        <path
                          d={feat.pathD}
                          fill={currentFill}
                          fillOpacity={currentFillOpacity}
                          stroke={currentStroke}
                          strokeWidth={currentStrokeWidth}
                          strokeLinejoin="round"
                          strokeLinecap="round"
                          filter={
                            isSelected
                              ? 'url(#activeElevationSelectedOrange)'
                              : isHovered
                              ? 'url(#activeElevationHover)'
                              : undefined
                          }
                          className="transition-colors duration-150"
                        />

                        {/* Aid Assistance Badge Pin on the Territory Center (when not selected) */}
                        {!isSelected && (
                          <g
                            transform={`translate(${feat.center.x}, ${feat.center.y})`}
                            className="pointer-events-none"
                          >
                            <rect
                              x="-26"
                              y="-22"
                              width="52"
                              height="20"
                              rx="10"
                              fill={isHovered ? feat.hoverColor || '#0284c7' : '#0f172a'}
                              stroke="#ffffff"
                              strokeWidth={1.5}
                              className="drop-shadow-lg transition-all duration-200"
                            />
                            <text
                              x="0"
                              y="-9"
                              textAnchor="middle"
                              fill="#ffffff"
                              fontSize="9.5"
                              fontWeight="extrabold"
                              fontFamily="sans-serif"
                            >
                              {aidCount > 0 ? `${aidCount} Pkt` : '0 Pkt'}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </g>

                {/* ========================================================================= */}
                {/* TOPMOST SELECTED LAYER: POP-UP NAMA KABUPATEN/KOTA & HIGHLIGHT TERPILIH   */}
                {/* ========================================================================= */}
                {selectedFeature && (!activeEditorOpen || penSubMode === 'PREVIEW') && (
                  <g id="topmost-selected-popup-layer">
                    {/* 1. Highlight Polygon Terpilih di Layer Paling Atas */}
                    <path
                      d={selectedFeature.pathD}
                      fill={selectedFeature.selectedColor || '#ea580c'}
                      fillOpacity={selectedFeature.selectedOpacity ?? 0.94}
                      stroke={selectedFeature.selectedStrokeColor || '#ffffff'}
                      strokeWidth={Math.max((selectedFeature.strokeWidth || 1.5) + 2, 3.8)}
                      strokeLinejoin="round"
                      filter="url(#activeElevationSelectedOrange)"
                      className="cursor-pointer"
                      onClick={() => handleRegionClick(selectedFeature.nama)}
                    />

                    {/* 2. Pin Radar Animasi di Titik Pusat Wilayah Terpilih */}
                    <g
                      transform={`translate(${selectedFeature.center.x}, ${selectedFeature.center.y})`}
                      className="pointer-events-none"
                    >
                      <circle
                        r="24"
                        fill={selectedFeature.selectedColor || '#f97316'}
                        fillOpacity="0.45"
                        className="animate-ping"
                      />
                      <circle
                        r="8"
                        fill="#ffffff"
                        stroke={selectedFeature.selectedColor || '#ea580c'}
                        strokeWidth="3"
                        filter="url(#topPopupShadow)"
                      />
                    </g>

                    {/* 3. Pop-up Callout Banner Nama Kabupaten/Kota di Layer Paling Atas */}
                    <g
                      transform={`translate(${selectedFeature.center.x}, ${selectedFeature.center.y - 48})`}
                      className="transition-transform duration-200"
                    >
                      <polygon points="0,8 -10,-4 10,-4" fill="#0f172a" />

                      <rect
                        x="-110"
                        y="-54"
                        width="220"
                        height="52"
                        rx="12"
                        fill="#0f172a"
                        stroke={selectedFeature.selectedColor || '#f97316'}
                        strokeWidth="2.5"
                        filter="url(#topPopupShadow)"
                        className="cursor-pointer"
                        onClick={() => handleRegionClick(selectedFeature.nama)}
                      />

                      {/* Tombol Tutup X di Pojok Kanan Pop-up */}
                      <g
                        transform="translate(88, -38)"
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRegionClick(selectedFeature.nama);
                        }}
                      >
                        <circle r="7.5" fill="#1e293b" stroke="#cbd5e1" strokeWidth="1" />
                        <line x1="-2.5" y1="-2.5" x2="2.5" y2="2.5" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
                        <line x1="2.5" y1="-2.5" x2="-2.5" y2="2.5" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
                      </g>

                      {/* Nama Resmi Kabupaten / Kota */}
                      <text
                        x="-6"
                        y="-31"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="13"
                        fontWeight="900"
                        letterSpacing="0.8"
                        fontFamily="system-ui, -apple-system, sans-serif"
                        className="pointer-events-none"
                        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
                      >
                        {selectedFeature.officialTitle}
                      </text>

                      {/* Informasi Realisasi & Paket Bantuan di Dalam Pop-up */}
                      <text
                        x="0"
                        y="-15"
                        textAnchor="middle"
                        fill="#fdba74"
                        fontSize="9.5"
                        fontWeight="700"
                        fontFamily="system-ui, -apple-system, sans-serif"
                        className="pointer-events-none"
                      >
                        {selectedFeatureStat && selectedFeatureStat.count > 0
                          ? `${selectedFeatureStat.count} Paket Bantuan • Rp ${(selectedFeatureStat.totalNominal / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} Juta`
                          : '0 Paket Bantuan Terdata'}
                      </text>
                    </g>
                  </g>
                )}

                {/* ========================================================================= */}
                {/* PEN TOOL OVERLAY LAYER: EDIT NODES OR DRAW NEW BOUNDARY (ADMIN ONLY)      */}
                {/* ========================================================================= */}
                {activeEditorOpen && activeEditorRegion && (
                  <g id="pen-tool-interactive-layer">
                    {/* SUB-MODE A: EDIT EXISTING VERTEX NODES & MIDPOINTS (SUPPORTS MULTI-ZONE / PULAU) */}
                    {penSubMode === 'EDIT_NODES' && activeZone && (
                      <g>
                        {/* Render non-active zones of the same Kabupaten/Kota so user can click to switch zone */}
                        {activeZones.map((zone, zIdx) => {
                          if (zIdx === safeZoneIndex) return null;
                          return (
                            <path
                              key={`other-zone-${zone.id || zIdx}`}
                              d={zone.pathD}
                              fill={activeEditorRegion.fillColor}
                              fillOpacity={0.22}
                              stroke="#38bdf8"
                              strokeWidth={2 / Math.sqrt(zoom)}
                              strokeDasharray={`${4 / zoom},${3 / zoom}`}
                              className="cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveZoneIndex(zIdx);
                                setSelectedNodeIndex(null);
                              }}
                            >
                              <title>Klik untuk mengedit {zone.namaZona}</title>
                            </path>
                          );
                        })}

                        {/* Highlight outline of the currently active zone being edited */}
                        <path
                          d={activeZone.pathD}
                          fill={activeEditorRegion.fillColor}
                          fillOpacity={0.35}
                          stroke="#10b981"
                          strokeWidth={2.5 / Math.sqrt(zoom)}
                          strokeDasharray={`${5 / zoom},${3 / zoom}`}
                          className="pointer-events-none"
                        />

                        {/* Midpoint "+" handles to insert new vertices along any segment of activeZone */}
                        {activeZone.points.map((pt, idx) => {
                          const nextPt =
                            activeZone.points[(idx + 1) % activeZone.points.length];
                          const midX = (pt.x + nextPt.x) / 2;
                          const midY = (pt.y + nextPt.y) / 2;
                          const r = Math.max(2.5, 4.5 / Math.sqrt(zoom));
                          return (
                            <g
                              key={`mid-${idx}`}
                              transform={`translate(${midX}, ${midY})`}
                              className="cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateRegionFeature(activeEditorRegion.nama, feat => {
                                  const currentZones = getRegionZones(feat);
                                  const tIdx = safeZoneIndex < currentZones.length ? safeZoneIndex : 0;
                                  const targetZ = currentZones[tIdx];
                                  if (!targetZ) return feat;
                                  const nextPts = [...targetZ.points];
                                  nextPts.splice(idx + 1, 0, {
                                    x: Math.round(midX * 10) / 10,
                                    y: Math.round(midY * 10) / 10
                                  });
                                  const nextZones = currentZones.map((z, zIndex) =>
                                    zIndex === tIdx
                                      ? {
                                          ...z,
                                          points: nextPts,
                                          pathD: pointsToSvgPath(nextPts, true, z.curveMode)
                                        }
                                      : z
                                  );
                                  return applyZonesToFeature(feat, nextZones);
                                });
                                setSelectedNodeIndex(idx + 1);
                              }}
                            >
                              <title>Klik untuk menambah titik sudut baru di sini</title>
                              <circle
                                r={r}
                                fill="#10b981"
                                stroke="#ffffff"
                                strokeWidth={1.2 / Math.sqrt(zoom)}
                              />
                            </g>
                          );
                        })}

                        {/* Draggable Vertex Anchor Nodes for activeZone */}
                        {activeZone.points.map((pt, idx) => {
                          const isNodeSelected = selectedNodeIndex === idx;
                          const r = Math.max(3.5, (isNodeSelected ? 7 : 5.5) / Math.sqrt(zoom));
                          return (
                            <g
                              key={`vertex-${idx}`}
                              transform={`translate(${pt.x}, ${pt.y})`}
                              className="cursor-move"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setSelectedNodeIndex(idx);
                                setDraggingNodeIndex(idx);
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedNodeIndex(idx);
                              }}
                            >
                              <title>
                                Titik #{idx + 1} ({Math.round(pt.x)}, {Math.round(pt.y)}) — Geser untuk merapikan garis batas
                              </title>
                              <circle
                                r={r}
                                fill={isNodeSelected ? '#f97316' : '#ffffff'}
                                stroke={isNodeSelected ? '#ffffff' : '#0f172a'}
                                strokeWidth={2 / Math.sqrt(zoom)}
                              />
                            </g>
                          );
                        })}

                        {/* Draggable Center Pin Handle for Label/Badge Position */}
                        <g
                          transform={`translate(${activeEditorRegion.center.x}, ${activeEditorRegion.center.y})`}
                          className="cursor-move"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setIsDraggingCenterPin(true);
                          }}
                        >
                          <title>Geser untuk memindahkan posisi Pin / Label Wilayah</title>
                          <circle
                            r={Math.max(5, 8 / Math.sqrt(zoom))}
                            fill="#f97316"
                            stroke="#ffffff"
                            strokeWidth={2 / Math.sqrt(zoom)}
                          />
                          <circle
                            r={Math.max(2, 3 / Math.sqrt(zoom))}
                            fill="#ffffff"
                          />
                        </g>
                      </g>
                    )}

                    {/* SUB-MODE B: DRAW NEW POLYGON OR NEW ISLAND ZONE WITH PEN TOOL */}
                    {penSubMode === 'DRAW_NEW' && (
                      <g>
                        {/* Keep existing zones visible in the background so user sees mainland when adding an island */}
                        <path
                          d={activeEditorRegion.pathD}
                          fill={isDrawingNewZone ? activeEditorRegion.fillColor : 'none'}
                          fillOpacity={isDrawingNewZone ? 0.25 : 0}
                          stroke={isDrawingNewZone ? '#14b8a6' : '#94a3b8'}
                          strokeWidth={1.8 / Math.sqrt(zoom)}
                          strokeDasharray={`${4 / zoom},${4 / zoom}`}
                          className="pointer-events-none"
                        />

                        {/* Live Draft Polygon Fill & Path */}
                        {draftPoints.length > 0 && (
                          <>
                            <path
                              d={liveDraftPathD}
                              fill={activeEditorRegion.fillColor || '#1d4ed8'}
                              fillOpacity={0.35}
                              stroke="#10b981"
                              strokeWidth={2.5 / Math.sqrt(zoom)}
                              strokeLinejoin="round"
                              className="pointer-events-none"
                            />

                            {/* Rubber-band line from last vertex to cursor */}
                            {cursorSvgPoint && (
                              <line
                                x1={draftPoints[draftPoints.length - 1].x}
                                y1={draftPoints[draftPoints.length - 1].y}
                                x2={cursorSvgPoint.x}
                                y2={cursorSvgPoint.y}
                                stroke="#38bdf8"
                                strokeWidth={2 / Math.sqrt(zoom)}
                                strokeDasharray={`${4 / zoom},${3 / zoom}`}
                                className="pointer-events-none"
                              />
                            )}

                            {/* Placed Draft Vertices */}
                            {draftPoints.map((pt, idx) => {
                              const isFirst = idx === 0;
                              const canClose = isFirst && draftPoints.length >= 3;
                              const r = Math.max(
                                3.5,
                                (canClose ? 7.5 : 5) / Math.sqrt(zoom)
                              );
                              return (
                                <g
                                  key={`draft-pt-${idx}`}
                                  transform={`translate(${pt.x}, ${pt.y})`}
                                  className={canClose ? 'cursor-pointer' : 'pointer-events-none'}
                                  onClick={(e) => {
                                    if (canClose) {
                                      e.stopPropagation();
                                      handleFinishPenDrawing();
                                    }
                                  }}
                                >
                                  <circle
                                    r={r}
                                    fill={isFirst ? '#10b981' : '#ffffff'}
                                    stroke="#0f172a"
                                    strokeWidth={2 / Math.sqrt(zoom)}
                                  />
                                </g>
                              );
                            })}
                          </>
                        )}
                      </g>
                    )}
                  </g>
                )}
              </g>
            </svg>

            {/* FLOATING INSPECTION CARD (When clicking or hovering a working area) */}
            {inspectorData && !activeEditorOpen && (
              <div className="absolute bottom-6 right-6 z-20 w-80 bg-white/95 backdrop-blur-md border border-slate-200 text-slate-800 rounded-2xl p-5 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="flex items-start justify-between pb-3 mb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      {inspectorData.isKpw ? (
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                            activeSelectedKab === inspectorData.nama
                              ? 'text-orange-700 bg-orange-50 border-orange-300 ring-1 ring-orange-400'
                              : 'text-blue-700 bg-blue-50 border-blue-200/60'
                          }`}
                        >
                          Wilayah Kerja KPwBI Jatim
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          Wilayah Jawa Timur
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-extrabold text-slate-900 leading-snug">
                      {inspectorData.nama}
                    </h4>
                  </div>
                  <button
                    onClick={() => {
                      setActiveInspectorRegion(null);
                      setInternalSelectedKab('');
                      if (onFilterKabupaten) onFilterKabupaten('');
                    }}
                    className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
                    title="Tutup Kartu Informasi"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {inspectorData.isKpw ? (
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">
                        Penyaluran ({selectedYear === 'ALL' ? 'Semua Tahun' : selectedYear} &bull;{' '}
                        {selectedQuarter === 'ALL' ? 'Semua Triwulan' : selectedQuarter}):
                      </span>
                      <span
                        className={`font-extrabold tabular-nums ${
                          activeSelectedKab === inspectorData.nama
                            ? 'text-orange-600'
                            : 'text-blue-900'
                        }`}
                      >
                        {inspectorData.stat.count} Lokasi Terdata
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Realisasi Bantuan:</span>
                      <span className="font-extrabold text-slate-900 tabular-nums">
                        Rp {inspectorData.stat.totalNominal.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Alokasi Pagu KPw BI:</span>
                      <span className="font-semibold text-slate-700 tabular-nums">
                        Rp {inspectorData.alokasiPagu.toLocaleString('id-ID')}
                      </span>
                    </div>

                    {inspectorData.stat.items.length > 0 && (
                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-[11px] font-bold text-slate-600 block mb-1">
                          Penerima Bantuan Terakhir:
                        </span>
                        <div
                          className={`p-2.5 rounded-xl border ${
                            activeSelectedKab === inspectorData.nama
                              ? 'bg-orange-50/70 border-orange-200'
                              : 'bg-blue-50/70 border-blue-100'
                          }`}
                        >
                          <p
                            className={`font-bold text-[11px] truncate ${
                              activeSelectedKab === inspectorData.nama
                                ? 'text-orange-950'
                                : 'text-blue-950'
                            }`}
                          >
                            {inspectorData.stat.items[0].namaPenerima}
                          </p>
                          <p
                            className={`text-[10px] truncate mt-0.5 ${
                              activeSelectedKab === inspectorData.nama
                                ? 'text-orange-800'
                                : 'text-blue-800'
                            }`}
                          >
                            {inspectorData.stat.items[0].detailBantuan}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                      {enableAdminTools ? (
                        <button
                          type="button"
                          onClick={() => {
                            handleSelectEditorTarget(inspectorData.nama);
                            setIsEditorOpen(true);
                          }}
                          className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                        >
                          <PenTool className="w-3 h-3" />
                          <span>Edit Garis & Warna</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">Klik wilayah untuk filter</span>
                      )}

                      <button
                        onClick={() => {
                          if (onFilterKabupaten) onFilterKabupaten(inspectorData.nama);
                          if (inspectorData.stat.items.length > 0 && onSelectBantuan) {
                            onSelectBantuan(inspectorData.stat.items[0]);
                          }
                        }}
                        className={`text-xs font-bold flex items-center gap-1 cursor-pointer ${
                          activeSelectedKab === inspectorData.nama
                            ? 'text-orange-600 hover:text-orange-800'
                            : 'text-blue-900 hover:text-blue-700'
                        }`}
                      >
                        <span>Lihat Rincian</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 leading-relaxed italic">
                    Wilayah Jawa Timur di luar 13 wilayah kerja operasional utama KPwBI Provinsi Jawa Timur.
                  </p>
                )}
              </div>
            )}

            {/* FLOATING LEGEND & INFORMASI 13 WILAYAH KERJA WITH HIDE / UNHIDE FEATURE */}
            {showLegendInfo ? (
              <div className="absolute bottom-6 left-6 z-20 bg-white/95 backdrop-blur-md px-4 py-3 rounded-2xl border border-slate-200 text-xs shadow-md space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between gap-3 pb-1.5 border-b border-slate-100">
                  <span className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider">
                    Informasi Peta Wilayah Kerja
                  </span>
                  <button
                    onClick={() => setShowLegendInfo(false)}
                    className="text-slate-400 hover:text-slate-600 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    title="Sembunyikan Informasi"
                  >
                    <EyeOff className="w-3 h-3" />
                    <span>Sembunyikan</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded inline-block shadow-sm border border-white ring-1 ring-slate-300"
                      style={{
                        backgroundColor: activeEditorRegion?.hoverColor || '#2563eb'
                      }}
                      title="Warna Saat Dipilih Kursor (Hover)"
                    />
                    <span
                      className="w-3.5 h-3.5 rounded inline-block shadow-sm border border-white ring-1 ring-slate-300"
                      style={{
                        backgroundColor: activeEditorRegion?.selectedColor || '#ea580c'
                      }}
                      title="Warna Saat Diklik (Terpilih)"
                    />
                    <span className="font-bold text-slate-800">
                      13 Wilayah Kerja (Hover Kursor &bull; Berubah Saat Diklik)
                    </span>
                  </div>

                  {enableAdminTools && (
                    <button
                      type="button"
                      onClick={() => setIsEditorOpen(prev => !prev)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Sliders className="w-3 h-3 text-blue-900" />
                      <span>{activeEditorOpen ? 'Tutup Editor' : 'Pen Tool & Warna'}</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* UNHIDE BUTTON WHEN LEGEND IS HIDDEN */
              <button
                onClick={() => setShowLegendInfo(true)}
                className="absolute bottom-6 left-6 z-20 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 shadow-md hover:bg-slate-50 transition-all flex items-center gap-2 cursor-pointer"
                title="Tampilkan Kembali Informasi & Legenda"
              >
                <Eye className="w-3.5 h-3.5 text-blue-900" />
                <span>Tampilkan Informasi Wilayah</span>
              </button>
            )}
          </div>
        ) : (
          /* GOOGLE MAPS EMBEDDED VIEW */
          <div className="w-full h-full relative">
            <iframe
              title="Peta Titik Penyaluran Google Maps Jawa Timur"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1011408.8242202611!2d112.01509170362308!3d-7.795863334237885!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2dd7fb4c1b92c421%3A0x3039d80b220cc40!2sJawa%20Timur!5e0!3m2!1sid!2sid!4v1700000000000!5m2!1sid!2sid"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen={false}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="w-full h-full filter saturate-110"
            />
          </div>
        )}
      </div>

      {/* QUICK SELECT STRIP WITH HIDE & UNHIDE TOGGLE */}
      {showFilters && (
        <div className="bg-slate-50 border-t border-slate-200/80 transition-all">
          <div className="px-3.5 py-2 flex items-center justify-between text-xs border-b border-slate-200/50">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-blue-950 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-blue-800" />
                13 Wilayah Kerja Terpetakan ({kpwSummary.count} Bantuan Terdata):
              </span>
              {activeSelectedKab && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
                  Terpilih: {activeSelectedKab.replace('Kabupaten ', 'Kab. ')}
                </span>
              )}
            </div>

            <button
              onClick={() => setShowQuickPills(prev => !prev)}
              className="text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1 text-[11px] cursor-pointer"
              title={showQuickPills ? 'Sembunyikan Daftar Wilayah' : 'Tampilkan Daftar Wilayah'}
            >
              <span>{showQuickPills ? 'Sembunyikan Daftar' : 'Tampilkan Daftar Wilayah'}</span>
              {showQuickPills ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {showQuickPills && (
            <div className="p-3 flex items-center gap-2 overflow-x-auto text-xs animate-in fade-in">
              <button
                onClick={() => {
                  setInternalSelectedKab('');
                  setActiveInspectorRegion(null);
                  if (onFilterKabupaten) onFilterKabupaten('');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs shrink-0 font-bold transition-all cursor-pointer ${
                  !activeSelectedKab
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Semua ({kpwSummary.count})
              </button>

              {WILAYAH_KERJA_KPW_JATIM.map(nama => {
                const stat = statsPerKab.get(nama);
                const isSelected = activeSelectedKab === nama;
                const feat = regions.find(r => r.nama === nama);
                return (
                  <button
                    key={nama}
                    onClick={() => handleRegionClick(nama)}
                    style={
                      isSelected && feat?.selectedColor
                        ? { backgroundColor: feat.selectedColor, borderColor: feat.selectedColor }
                        : undefined
                    }
                    className={`px-3 py-1.5 rounded-xl text-xs shrink-0 font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-orange-600 text-white shadow-sm ring-2 ring-orange-400'
                        : 'bg-white text-slate-700 border border-slate-200 hover:border-orange-300 hover:bg-orange-50/50'
                    }`}
                  >
                    <span>{nama.replace('Kabupaten ', 'Kab. ')}</span>
                    {stat && stat.count > 0 && (
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] tabular-nums font-bold ${
                          isSelected ? 'bg-black/25 text-white' : 'bg-blue-100 text-blue-900'
                        }`}
                      >
                        {stat.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
