/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import {
  BantuanItem,
  KondisiItemBarang,
  KondisiUnitSatuan,
  StatusKondisiFisik,
  UserAccount
} from '../../types';
import { StorageService } from '../../services/storageService';
import { QrStickerDesignCard, getTotalBarangUnits } from '../admin/PrintQrStickerModal';
import {
  QrCode,
  Lock,
  KeyRound,
  User,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
  Camera,
  Upload,
  Search,
  MapPin,
  ShieldCheck,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Save,
  Layers,
  Edit3,
  SlidersHorizontal,
  Sparkles,
  SwitchCamera,
  Zap,
  ZapOff,
  AlertCircle,
  Check
} from 'lucide-react';

interface ScanQrSubPageProps {
  bantuanList: BantuanItem[];
  onBackToHome: () => void;
  onUpdateKondisiViaQr: (
    id: string,
    kondisi: StatusKondisiFisik,
    catatan: string,
    fotoUrl?: string,
    kondisiPerItem?: KondisiItemBarang[],
    actorOverride?: string
  ) => void;
}

type QrUpdateScopeMode = 'SAME_ITEM_ALL_UNITS' | 'EDIT_SEKALIGUS_ALL' | 'UPDATE_SATUAN_UNIT';

const KONDISI_ITEM_OPTIONS: StatusKondisiFisik[] = [
  'Baik & Lengkap',
  'Perlu Perbaikan Ringan',
  'Rusak Ringan',
  'Rusak Berat',
  'Kurang Jumlah',
  'Belum Diterima / Tahap Asesmen'
];

export const ScanQrSubPage: React.FC<ScanQrSubPageProps> = ({
  bantuanList,
  onBackToHome,
  onUpdateKondisiViaQr
}) => {
  // Verification Gate State: auto-detect logged-in session user if available
  const [verifiedUser, setVerifiedUser] = useState<UserAccount | null>(() => {
    return StorageService.getSessionUser();
  });
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');

  // Camera & Real-Time QR Scanner State (Auto-detects laptop webcam & smartphone camera)
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isPausedRef = useRef<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isDetectingCamera, setIsDetectingCamera] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [isQrDetectedFlash, setIsQrDetectedFlash] = useState<boolean>(false);
  const [detectedQrCodeText, setDetectedQrCodeText] = useState<string>('');

  // Scan QR Workspace State
  const [qrCodeSearchInput, setQrCodeSearchInput] = useState('');
  const [selectedBantuanId, setSelectedBantuanId] = useState('');
  const [selectedUnitIndex, setSelectedUnitIndex] = useState<number>(1);
  const [simulatedScanning, setSimulatedScanning] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');

  // 3 Integrated Update Modes on the same QR
  const [updateMode, setUpdateMode] = useState<QrUpdateScopeMode>('SAME_ITEM_ALL_UNITS');

  // Form state for the currently scanned BantuanItem
  const [sameItemKondisi, setSameItemKondisi] = useState<StatusKondisiFisik>('Baik & Lengkap');
  const [sameItemCatatan, setSameItemCatatan] = useState<string>('');
  const [overallKondisi, setOverallKondisi] = useState<StatusKondisiFisik>('Baik & Lengkap');
  const [overallCatatan, setOverallCatatan] = useState('');
  const [fotoBuktiUrl, setFotoBuktiUrl] = useState('');
  const [itemConditions, setItemConditions] = useState<KondisiItemBarang[]>([]);

  const scannedItem = useMemo(
    () => bantuanList.find(b => b.id === selectedBantuanId) || null,
    [bantuanList, selectedBantuanId]
  );

  const totalUnitsForScanned = useMemo(() => {
    if (!scannedItem) return 1;
    const sum = itemConditions.reduce(
      (acc, it) => acc + Math.max(1, Number(it.qty) || 1),
      0
    );
    return sum > 0 ? sum : getTotalBarangUnits(scannedItem);
  }, [scannedItem, itemConditions]);

  // Determine which catalog item & unit corresponds to selectedUnitIndex
  const activeUnitContext = useMemo(() => {
    if (!scannedItem || itemConditions.length === 0) return null;

    for (let i = 0; i < itemConditions.length; i++) {
      const catItem = itemConditions[i];
      const units = catItem.rincianUnit || [];
      const foundU = units.find(u => u.globalUnitIndex === selectedUnitIndex);
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
  }, [scannedItem, itemConditions, selectedUnitIndex]);

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

  const handleVerifyCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (!usernameInput.trim() || !passwordInput.trim()) {
      setAuthError('Username dan Password wajib diisi untuk mengakses halaman Scan QR Bantuan.');
      return;
    }

    const result = StorageService.login(usernameInput.trim(), passwordInput.trim());
    if (!result.success || !result.user) {
      setAuthError(result.error || 'Username atau Password tidak valid.');
      return;
    }

    setVerifiedUser(result.user);
    setPasswordInput('');
  };

  const loadBantuanIntoScanner = (item: BantuanItem, unitIdx = 1) => {
    const catalog = StorageService.extractItemCatalogForBantuan(item);
    const maxUnits = StorageService.getTotalUnitsCount(item);
    const clampedUnit = Math.min(Math.max(1, unitIdx), maxUnits);

    setSelectedBantuanId(item.id);
    setSelectedUnitIndex(clampedUnit);
    setOverallKondisi(item.statusKondisiFisik);
    setOverallCatatan(item.catatanKondisiFisik || '');
    setFotoBuktiUrl(item.buktiSerahTerimaBastUrl || '');
    setItemConditions(catalog);
    setSaveSuccessMessage('');

    const matchedCat =
      catalog.find(c => c.rincianUnit?.some(ru => ru.globalUnitIndex === clampedUnit)) ||
      catalog[0];

    if (matchedCat && (matchedCat.qty || 1) > 1) {
      setUpdateMode('SAME_ITEM_ALL_UNITS');
    } else if (catalog.length > 1) {
      setUpdateMode('EDIT_SEKALIGUS_ALL');
    } else {
      setUpdateMode('SAME_ITEM_ALL_UNITS');
    }
  };

  // Parse a scanned/typed QR code string such as "EPML-JTM-2025-004-U02" or "EPML-JTM-2025-004"
  const handleLookupQrCode = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = qrCodeSearchInput.trim();
    if (!raw) return;

    setSimulatedScanning(true);
    setTimeout(() => {
      setSimulatedScanning(false);
      const resolved = StorageService.resolveScannedQrCode(raw, bantuanList);
      if (resolved) {
        loadBantuanIntoScanner(resolved.bantuan, resolved.globalUnitIndex);
        setSaveSuccessMessage(`QR Terverifikasi: ${raw} (${resolved.bantuan.namaPenerima} - Unit #${resolved.globalUnitIndex})`);
      } else {
        setSaveSuccessMessage(`Kode "${raw}" tidak ditemukan dalam database bantuan EPML.`);
      }
    }, 250);
  };

  // Stop camera tracks and scanning animation frame
  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsTorchOn(false);
  };

  // Robust auto-detect camera function (handles smartphone environment/front camera & laptop webcams)
  const startCamera = async (targetDeviceId?: string, mode?: 'environment' | 'user') => {
    stopCamera();
    setCameraError(null);
    setIsDetectingCamera(true);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Browser ini tidak mendukung akses kamera langsung (WebRTC tidak tersedia). Silakan gunakan input manual kode QR atau upload foto QR.');
      setIsDetectingCamera(false);
      return;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const vDevs = devices.filter(d => d.kind === 'videoinput');
      setVideoDevices(vDevs);
    } catch (e) {
      console.warn('enumerateDevices error:', e);
    }

    let stream: MediaStream | null = null;
    const preferFacing = mode || facingMode;

    // Strategy 1: Target device ID if user selected a specific camera
    if (targetDeviceId) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: targetDeviceId },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
      } catch (e) {
        console.warn('Target deviceId constraint failed, falling back...', e);
      }
    }

    // Strategy 2: Ideal facingMode ('environment' for phone back camera or 'user' for laptop webcam)
    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: preferFacing },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
      } catch (e) {
        console.warn('Ideal facingMode failed, trying general video constraint...', e);
      }
    }

    // Strategy 3: General fallback `{ video: true }` (Guaranteed to detect laptop webcams!)
    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      } catch (err: any) {
        console.error('All camera attempts failed:', err);
        let msg = 'Kamera tidak dapat diakses. Pastikan izin kamera telah disetujui di browser/perangkat Anda.';
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          msg = 'Izin akses kamera ditolak. Silakan izinkan akses kamera di pengaturan browser atau smartphone Anda.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          msg = 'Tidak ada perangkat kamera yang terdeteksi di HP atau Laptop Anda.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          msg = 'Kamera sedang digunakan oleh aplikasi lain. Tutup aplikasi tersebut lalu coba lagi.';
        }
        setCameraError(msg);
        setIsDetectingCamera(false);
        return;
      }
    }

    streamRef.current = stream;
    setIsCameraActive(true);
    setIsDetectingCamera(false);

    // Check torch capability
    const track = stream.getVideoTracks()[0];
    if (track) {
      try {
        const caps = (track.getCapabilities && track.getCapabilities()) as any;
        setHasTorch(!!(caps && caps.torch));
      } catch (e) {
        setHasTorch(false);
      }
    }

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.setAttribute('playsinline', 'true');
      try {
        await videoRef.current.play();
      } catch (e) {
        console.warn('video.play() waiting for interaction:', e);
      }
      startScanLoop();
    }
  };

  // Continuous frame scanning loop with jsQR
  const startScanLoop = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }

    const tick = () => {
      const video = videoRef.current;
      if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
        let canvas = canvasRef.current;
        if (!canvas) {
          canvas = document.createElement('canvas');
          canvasRef.current = canvas;
        }

        const w = video.videoWidth;
        const h = video.videoHeight;
        if (w > 0 && h > 0) {
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, w, h);
            const imageData = ctx.getImageData(0, 0, w, h);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert'
            });

            if (code && code.data && !isPausedRef.current) {
              handleQrCodeDetected(code.data);
            }
          }
        }
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
  };

  // Called when a QR code is recognized by jsQR
  const handleQrCodeDetected = (rawCode: string) => {
    const cleaned = rawCode.trim();
    if (!cleaned) return;

    isPausedRef.current = true;
    setDetectedQrCodeText(cleaned);
    setIsQrDetectedFlash(true);

    // Chime sound synthesized via Web Audio API
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        const audioCtx = new AudioCtxClass();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.18);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.18);
      }
    } catch (e) {}

    // Haptic feedback for smartphones
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([100, 50, 100]);
      } catch (e) {}
    }

    setTimeout(() => {
      setIsQrDetectedFlash(false);
    }, 1500);

    const resolved = StorageService.resolveScannedQrCode(cleaned, bantuanList);
    if (resolved) {
      loadBantuanIntoScanner(resolved.bantuan, resolved.globalUnitIndex);
      setSaveSuccessMessage(
        `QR Terdeteksi: ${cleaned} — ${resolved.bantuan.namaPenerima} (Unit #${resolved.globalUnitIndex})`
      );
    } else {
      setQrCodeSearchInput(cleaned);
      setSaveSuccessMessage(`Kode terbaca: "${cleaned}". Tidak terdaftar pada database bantuan aktif.`);
    }

    // Cooldown before next scan
    setTimeout(() => {
      isPausedRef.current = false;
    }, 2500);
  };

  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(undefined, nextMode);
  };

  const handleToggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const nextState = !isTorchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }]
        });
        setIsTorchOn(nextState);
      } catch (e) {
        console.warn('Torch constraint error:', e);
      }
    }
  };

  const handleFileUploadQr = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imgData.data, imgData.width, imgData.height);
          if (code && code.data) {
            handleQrCodeDetected(code.data);
          } else {
            setCameraError('Tidak ditemukan kode QR yang jelas pada gambar yang diunggah. Pastikan gambar jelas dan tidak buram.');
          }
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Automatically activate camera when user is inside the scanner
  useEffect(() => {
    if (verifiedUser) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [verifiedUser]);

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

  const handleSingleUnitChange = (
    itemIndex: number,
    unitNumber: number,
    field: 'kondisi' | 'catatan',
    value: string
  ) => {
    const nowDate = new Date().toISOString().slice(0, 10);
    const actor = verifiedUser?.namaLengkap || 'Petugas Verifikasi QR';
    setItemConditions(prev => {
      const next = [...prev];
      const targetItem = { ...next[itemIndex] };
      const units = (targetItem.rincianUnit || []).map(u =>
        u.unitNumber === unitNumber
          ? {
              ...u,
              [field]: value,
              updatedAt: nowDate,
              updatedBy: actor
            }
          : u
      );
      targetItem.rincianUnit = units;
      targetItem.kondisi = deriveItemConditionFromUnits(units);

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
      targetItem.updatedBy = actor;
      next[itemIndex] = targetItem;
      return next;
    });
  };

  const handleBulkItemChange = (
    itemIndex: number,
    field: 'kondisi' | 'catatan',
    value: string
  ) => {
    const nowDate = new Date().toISOString().slice(0, 10);
    const actor = verifiedUser?.namaLengkap || 'Petugas Verifikasi QR';
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
          updatedBy: actor
        }));
      } else {
        target.catatan = value;
        target.rincianUnit = (target.rincianUnit || []).map(u => ({
          ...u,
          catatan: value
        }));
      }
      target.updatedAt = nowDate;
      target.updatedBy = actor;
      next[itemIndex] = target;
      return next;
    });
  };

  const handleSetAllRecipientItemsKondisi = (kondisi: StatusKondisiFisik) => {
    const nowDate = new Date().toISOString().slice(0, 10);
    const actor = verifiedUser?.namaLengkap || 'Petugas Verifikasi QR';
    setOverallKondisi(kondisi);
    setItemConditions(prev =>
      prev.map(it => ({
        ...it,
        kondisi,
        updatedAt: nowDate,
        updatedBy: actor,
        rincianUnit: (it.rincianUnit || []).map(u => ({
          ...u,
          kondisi,
          updatedAt: nowDate,
          updatedBy: actor
        }))
      }))
    );
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFotoBuktiUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveScanUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedItem || !verifiedUser || !activeUnitContext) return;

    const nowDate = new Date().toISOString().slice(0, 10);
    const actor = verifiedUser.namaLengkap;
    let finalItems: KondisiItemBarang[] = [...itemConditions];
    let msg = '';

    if (updateMode === 'SAME_ITEM_ALL_UNITS') {
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
            updatedBy: actor
          }));
          updatedUnitCount += units.length || it.qty;
          return {
            ...it,
            kondisi: sameItemKondisi,
            catatan:
              sameItemCatatan.trim() ||
              `Seluruh ${it.qty} ${it.satuan} ${it.namaBarang} terverifikasi ${sameItemKondisi} melalui scan QR ${activeUnitContext.unitSatuan.kodeQrUnit}.`,
            updatedAt: nowDate,
            updatedBy: actor,
            rincianUnit: units
          };
        }
        return it;
      });

      msg = `Berhasil! Seluruh ${updatedUnitCount} ${activeUnitContext.catalogItem.satuan} "${activeUnitContext.catalogItem.namaBarang}" langsung terupdate (${sameItemKondisi}) cukup dengan scan 1 QR (${activeUnitContext.unitSatuan.kodeQrUnit}).`;
    } else if (updateMode === 'EDIT_SEKALIGUS_ALL') {
      msg = `Berhasil! Edit Sekaligus seluruh ${finalItems.length} jenis barang (${totalUnitsForScanned} Unit) pada ${scannedItem.namaPenerima} telah disimpan dan tersinkronisasi ke Hasil Tracking & Monitoring.`;
    } else {
      msg = `Berhasil! Update Satuan per Unit untuk "${activeUnitContext.catalogItem.namaBarang}" telah disimpan dan tersinkronisasi ke Hasil Tracking & Monitoring.`;
    }

    let derivedOverall: StatusKondisiFisik = 'Baik & Lengkap';
    if (finalItems.some(i => i.kondisi === 'Rusak Berat' || i.kondisi === 'Rusak')) {
      derivedOverall = 'Rusak Berat';
    } else if (finalItems.some(i => i.kondisi === 'Kurang Jumlah')) {
      derivedOverall = 'Kurang Jumlah';
    } else if (
      finalItems.some(
        i => i.kondisi === 'Perlu Perbaikan Ringan' || i.kondisi === 'Rusak Ringan'
      )
    ) {
      derivedOverall = 'Perlu Perbaikan Ringan';
    } else if (finalItems.every(i => i.kondisi === 'Belum Diterima / Tahap Asesmen')) {
      derivedOverall = 'Belum Diterima / Tahap Asesmen';
    }

    const autoNote =
      overallCatatan.trim() ||
      finalItems
        .map(i => `${i.namaBarang} (${i.qty} ${i.satuan}): ${i.kondisi}`)
        .join(' | ');

    onUpdateKondisiViaQr(
      scannedItem.id,
      derivedOverall,
      autoNote,
      fotoBuktiUrl || undefined,
      finalItems,
      actor
    );

    setSaveSuccessMessage(msg);
  };

  // ============================================================================
  // GATE 1: VERIFIKASI USERNAME & PASSWORD SEBELUM MASUK HALAMAN SCAN QR BANTUAN
  // ============================================================================
  if (!verifiedUser) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full mx-auto space-y-6">
          <div>
            <button
              type="button"
              onClick={onBackToHome}
              className="px-3.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-[#002B66] dark:text-blue-400" />
              <span>Kembali ke Beranda</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="bg-[#002B66] px-6 py-6 text-white border-b-4 border-emerald-500">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                  <QrCode className="w-6 h-6 text-amber-300" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-300 block">
                    Otorisasi Petugas Lapangan
                  </span>
                  <h1 className="text-lg font-extrabold tracking-tight">
                    Verifikasi Akses Scan QR Bantuan
                  </h1>
                </div>
              </div>
              <p className="text-xs text-blue-100/90 mt-3 leading-relaxed">
                Masukkan <strong>Username</strong> dan <strong>Password</strong> terlebih dahulu untuk membuka sistem pemindaian QR Unit Barang yang terhubung langsung dengan menu <strong>QR Code &amp; Tracking Fisik</strong> serta <strong>Hasil Tracking &amp; Monitoring Bantuan</strong>.
              </p>
            </div>

            <form onSubmit={handleVerifyCredentials} className="p-6 space-y-4">
              {authError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-xs font-semibold text-red-700 dark:text-red-300">
                  {authError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  Username Petugas / Admin
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={e => setUsernameInput(e.target.value)}
                    placeholder="Masukkan Username..."
                    autoComplete="username"
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#002B66]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  Password Verifikasi
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={e => setPasswordInput(e.target.value)}
                    placeholder="Masukkan Password..."
                    autoComplete="current-password"
                    className="w-full h-11 pl-10 pr-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#002B66]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-11 rounded-xl bg-[#002B66] hover:bg-blue-900 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer"
              >
                <Lock className="w-4 h-4 text-amber-300" />
                <span>Verifikasi &amp; Buka Halaman Scan QR</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // GATE 2: HALAMAN UTAMA SCAN QR BANTUAN (TERHUBUNG 3 MODE MONITORING)
  // ============================================================================
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-16">
      {/* Top Banner */}
      <div className="bg-[#002B66] text-white border-b border-blue-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onBackToHome}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-blue-100 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Beranda</span>
              </button>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Terverifikasi: {verifiedUser.namaLengkap}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setVerifiedUser(null);
                setSelectedBantuanId('');
              }}
              className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-xs font-bold text-red-200 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Kunci Sesi Verifikasi</span>
            </button>
          </div>

          <div className="mt-4 max-w-3xl">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Portal Scan QR Unit Barang &amp; Update Kondisi Lapangan
            </h1>
            <p className="text-xs sm:text-sm text-blue-100/90 mt-1 leading-relaxed">
              Setiap unit barang memiliki QR Code unik yang terhubung langsung dengan fitur <strong>Update Semua Item Sama</strong>, <strong>Edit Sekaligus</strong>, maupun <strong>Update Satuan per Unit</strong> pada menu Hasil Tracking &amp; Monitoring Bantuan.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {saveSuccessMessage && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{saveSuccessMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setSaveSuccessMessage('')}
              className="text-emerald-700 hover:text-emerald-950 font-bold"
            >
              &times;
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT 5 COLS: Camera Scanner & Per-Unit QR Sticker Preview */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#002B66] dark:text-blue-400" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Pemindai Kode QR Unit Barang
                  </h2>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-[#002B66] dark:text-blue-300">
                  1 QR = 1 Unit Barang
                </span>
              </div>

              {/* Hidden file input for QR image upload fallback */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUploadQr}
                className="hidden"
              />

              {/* Live Interactive Camera Viewport */}
              <div className={`relative h-64 sm:h-72 w-full rounded-2xl bg-slate-950 border overflow-hidden flex flex-col items-center justify-center transition-all ${
                isQrDetectedFlash 
                  ? 'border-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.5)] ring-4 ring-emerald-400/50' 
                  : 'border-slate-800 shadow-md'
              }`}>
                {/* 1. Live Video Stream */}
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className={`w-full h-full object-cover ${!isCameraActive ? 'hidden' : 'block'}`}
                />

                {/* 2. Top Controls & Status Bar Overlay */}
                <div className="absolute top-3 inset-x-3 z-20 flex items-center justify-between gap-2 pointer-events-auto">
                  {/* Status Indicator */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white shadow-xs">
                    {isDetectingCamera ? (
                      <>
                        <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
                        <span className="text-amber-300">Mendeteksi Kamera...</span>
                      </>
                    ) : isCameraActive ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-emerald-300">
                          {facingMode === 'environment' ? 'Kamera Belakang' : 'Webcam / Depan'} • Aktif
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        <span className="text-rose-300">Kamera Nonaktif</span>
                      </>
                    )}
                  </div>

                  {/* Camera Action Buttons */}
                  <div className="flex items-center gap-1.5">
                    {/* Torch Toggle (if available on mobile device) */}
                    {hasTorch && isCameraActive && (
                      <button
                        type="button"
                        onClick={handleToggleTorch}
                        className={`p-1.5 rounded-lg backdrop-blur-md border transition-all cursor-pointer ${
                          isTorchOn
                            ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                            : 'bg-slate-900/80 text-white border-white/10 hover:bg-slate-800'
                        }`}
                        title={isTorchOn ? 'Matikan Senter' : 'Nyalakan Senter'}
                      >
                        {isTorchOn ? <Zap className="w-3.5 h-3.5" /> : <ZapOff className="w-3.5 h-3.5" />}
                      </button>
                    )}

                    {/* Switch Camera Button (Front <-> Back / Laptop <-> Phone) */}
                    <button
                      type="button"
                      onClick={handleToggleFacingMode}
                      className="px-2 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-white border border-white/10 backdrop-blur-md text-[10px] font-bold flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                      title="Ganti Kamera (Kamera Depan / Belakang / Webcam)"
                    >
                      <SwitchCamera className="w-3.5 h-3.5 text-blue-300" />
                      <span className="hidden sm:inline">Ganti Kamera</span>
                    </button>

                    {/* File Upload QR Fallback Button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-white border border-white/10 backdrop-blur-md transition-colors cursor-pointer"
                      title="Pindai QR dari File / Galeri Foto"
                    >
                      <Upload className="w-3.5 h-3.5 text-emerald-300" />
                    </button>
                  </div>
                </div>

                {/* 3. Reticle / QR Target Box Overlay */}
                {isCameraActive && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none p-4">
                    <div className={`relative w-44 h-44 sm:w-52 sm:h-52 rounded-2xl border-2 transition-all ${
                      isQrDetectedFlash 
                        ? 'border-emerald-400 bg-emerald-500/20 scale-105' 
                        : 'border-emerald-400/80 bg-emerald-500/5'
                    }`}>
                      {/* 4 Corner Markers */}
                      <span className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                      <span className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                      <span className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                      {/* Sweeping Laser Line Animation */}
                      {!isQrDetectedFlash && (
                        <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#34d399] animate-[bounce_2s_infinite]" />
                      )}

                      {/* Detection Confirmation Overlay */}
                      {isQrDetectedFlash && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 bg-emerald-950/80 rounded-2xl animate-in zoom-in-95">
                          <Check className="w-10 h-10 text-emerald-400 animate-bounce" />
                          <span className="text-xs font-extrabold text-white mt-1">QR Berhasil Terbaca!</span>
                          <span className="text-[10px] font-mono text-emerald-300 truncate max-w-[150px]">
                            {detectedQrCodeText}
                          </span>
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] font-semibold text-slate-200 mt-3 drop-shadow bg-slate-950/70 px-3 py-1 rounded-full backdrop-blur-xs">
                      Arahkan kamera ke stiker QR unit barang
                    </p>
                  </div>
                )}

                {/* 4. Fallback / Permission Error State */}
                {!isCameraActive && (
                  <div className="relative z-10 p-6 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-900/40 border border-blue-500/30 flex items-center justify-center text-blue-300">
                      <Camera className="w-6 h-6 text-amber-300" />
                    </div>

                    {cameraError ? (
                      <div className="max-w-xs space-y-1">
                        <p className="text-xs font-bold text-rose-300 flex items-center justify-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Akses Kamera Membutuhkan Izin</span>
                        </p>
                        <p className="text-[11px] text-slate-300 leading-snug">
                          {cameraError}
                        </p>
                      </div>
                    ) : (
                      <div className="max-w-xs space-y-1">
                        <p className="text-xs font-bold text-slate-200">
                          Kamera Siap Diaktifkan
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Klik tombol di bawah untuk mendeteksi kamera HP atau laptop Anda secara otomatis.
                        </p>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => startCamera()}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Deteksi &amp; Aktifkan Kamera</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Upload Foto QR</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Manual QR Code Lookup */}
              <form onSubmit={handleLookupQrCode} className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Masukkan Kode QR Unit Barang (Contoh: EPML-JTM-2025-004-U01):
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={qrCodeSearchInput}
                      onChange={e => setQrCodeSearchInput(e.target.value)}
                      placeholder="Ketik kode QR unit misal EPML-JTM-2025-004-U02..."
                      className="w-full h-10 pl-8 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-[#002B66]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="h-10 px-4 rounded-xl bg-[#002B66] hover:bg-blue-900 text-white text-xs font-bold inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5 text-amber-300" />
                    <span>Scan QR</span>
                  </button>
                </div>
              </form>

              {/* Direct Selector for Testing/Field Inspection */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Atau Pilih Langsung Data Bantuan untuk Simulasi Scan:
                </label>
                <select
                  value={selectedBantuanId}
                  onChange={e => {
                    const found = bantuanList.find(b => b.id === e.target.value);
                    if (found) loadBantuanIntoScanner(found, 1);
                  }}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
                >
                  <option value="">-- Pilih Paket Bantuan EPML --</option>
                  {bantuanList.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.id} — {b.namaPenerima} ({getTotalBarangUnits(b)} Unit QR)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Preview of Specific Unit QR Sticker */}
            {scannedItem && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                      Pratinjau Stiker QR Spesifik per Unit
                    </span>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      Stiker Unit {selectedUnitIndex} dari {totalUnitsForScanned} Barang
                    </h3>
                  </div>

                  {totalUnitsForScanned > 1 && (
                    <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => setSelectedUnitIndex(prev => Math.max(1, prev - 1))}
                        disabled={selectedUnitIndex <= 1}
                        className="p-1 rounded hover:bg-white dark:hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-2 text-[11px] font-mono font-bold text-[#002B66] dark:text-blue-300">
                        Unit {selectedUnitIndex}/{totalUnitsForScanned}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedUnitIndex(prev => Math.min(totalUnitsForScanned, prev + 1))
                        }
                        disabled={selectedUnitIndex >= totalUnitsForScanned}
                        className="p-1 rounded hover:bg-white dark:hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <QrStickerDesignCard
                    item={scannedItem}
                    copyIndex={selectedUnitIndex}
                    totalCopies={totalUnitsForScanned}
                  />
                </div>
              </div>
            )}
          </div>

          {/* RIGHT 7 COLS: 3-Mode Integrated Inspection & Condition Update Form */}
          <div className="lg:col-span-7">
            {!scannedItem || !activeUnitContext ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#002B66] dark:text-blue-400 flex items-center justify-center mx-auto">
                  <QrCode className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Belum Ada QR Unit Barang yang Dipindai
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Silakan pindai kode QR unit barang pada panel di sebelah kiri atau pilih salah satu penerima bantuan untuk menampilkan fitur <strong>Update Item Sama</strong>, <strong>Edit Sekaligus</strong>, dan <strong>Update Satuan</strong>.
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleSaveScanUpdate}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5"
              >
                {/* Recipient Header & Scanned Unit Identity */}
                <div className="pb-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-blue-900 text-white">
                        QR Aktif: {activeUnitContext.unitSatuan.kodeQrUnit}
                      </span>
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                        {activeUnitContext.catalogItem.namaBarang} (Unit #
                        {activeUnitContext.unitSatuan.unitNumber} dari{' '}
                        {activeUnitContext.catalogItem.qty}{' '}
                        {activeUnitContext.catalogItem.satuan})
                      </span>
                    </div>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white mt-1.5">
                      {scannedItem.namaPenerima}
                    </h2>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {scannedItem.alamat}, {scannedItem.kabupatenKota} &bull; Tahun{' '}
                        {scannedItem.tahun} ({scannedItem.triwulan})
                      </span>
                    </p>
                  </div>
                </div>

                {/* 3 Mode Update Selector on the Same QR */}
                <div className="space-y-3">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-blue-900 dark:text-blue-400" />
                    <span>Pilih Mode Update dari QR Ini (Terhubung ke Monitoring Bantuan):</span>
                  </label>

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
                          Update Semua "{activeUnitContext.catalogItem.namaBarang}"
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
                            {itemConditions.length} Jenis / {totalUnitsForScanned} Unit
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

                  {/* MODE 1 WORKSPACE */}
                  {updateMode === 'SAME_ITEM_ALL_UNITS' && (
                    <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/70 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-emerald-200/70 dark:border-emerald-800/60">
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                            Cukup Scan 1 QR Ini untuk Mengupdate Seluruh Kuantitas Item yang Sama
                          </span>
                          <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                            {activeUnitContext.catalogItem.namaBarang} ({activeUnitContext.catalogItem.qty}{' '}
                            {activeUnitContext.catalogItem.satuan})
                          </h4>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white text-xs font-bold">
                          {activeUnitContext.catalogItem.qty}{' '}
                          {activeUnitContext.catalogItem.satuan} Terupdate Sekaligus
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        <div className="sm:col-span-5">
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Kondisi Semua {activeUnitContext.catalogItem.qty}{' '}
                            {activeUnitContext.catalogItem.satuan} Item Ini:
                          </label>
                          <select
                            value={sameItemKondisi}
                            onChange={e =>
                              setSameItemKondisi(e.target.value as StatusKondisiFisik)
                            }
                            className="w-full px-3 py-2 rounded-xl border border-emerald-400 dark:border-emerald-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white"
                          >
                            {KONDISI_ITEM_OPTIONS.map(opt => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-7">
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Catatan Kondisi untuk Item "{activeUnitContext.catalogItem.namaBarang}":
                          </label>
                          <input
                            type="text"
                            value={sameItemCatatan}
                            onChange={e => setSameItemCatatan(e.target.value)}
                            placeholder={`Contoh: Ke-${activeUnitContext.catalogItem.qty} ${activeUnitContext.catalogItem.satuan} dalam keadaan baik dan lengkap...`}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MODE 2 WORKSPACE */}
                  {updateMode === 'EDIT_SEKALIGUS_ALL' && (
                    <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/70 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-blue-200/70 dark:border-blue-800/60">
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-900 dark:text-blue-300 block">
                            Edit Sekaligus Semua Barang Penerima ({itemConditions.length} Jenis Item • {totalUnitsForScanned} Unit)
                          </span>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400">
                            Gunakan jika hasil pemeriksaan seluruh barang di lokasi penerima baik-baik saja.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSetAllRecipientItemsKondisi('Baik & Lengkap')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Set Semua Baik &amp; Lengkap ({totalUnitsForScanned} Unit)</span>
                        </button>
                      </div>

                      <div className="space-y-2.5">
                        {itemConditions.map((it, idx) => (
                          <div
                            key={it.itemId}
                            className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                          >
                            <div className="sm:col-span-4">
                              <p className="text-xs font-extrabold text-slate-900 dark:text-white">
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
                                {KONDISI_ITEM_OPTIONS.map(opt => (
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

                  {/* MODE 3 WORKSPACE */}
                  {updateMode === 'UPDATE_SATUAN_UNIT' && (
                    <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/70 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-amber-200/70 dark:border-amber-800/60">
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300 block">
                            Update Satuan per Unit (Jika Ada Unit Tertentu yang Eror/Perlu Perbaikan)
                          </span>
                          <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                            {activeUnitContext.catalogItem.namaBarang} ({activeUnitContext.catalogItem.qty}{' '}
                            {activeUnitContext.catalogItem.satuan})
                          </h4>
                        </div>

                        {itemConditions.length > 1 && (
                          <div className="flex flex-wrap gap-1">
                            {itemConditions.map(ic => (
                              <button
                                key={ic.itemId}
                                type="button"
                                onClick={() => {
                                  const firstU = ic.rincianUnit?.[0]?.globalUnitIndex || 1;
                                  setSelectedUnitIndex(firstU);
                                }}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${
                                  ic.itemId === activeUnitContext.catalogItem.itemId
                                    ? 'bg-[#002B66] text-white border-[#002B66]'
                                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                {ic.namaBarang.slice(0, 22)} ({ic.qty})
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                        {(activeUnitContext.catalogItem.rincianUnit || []).map(unit => {
                          const isCurrentScannedUnit =
                            unit.globalUnitIndex === selectedUnitIndex;
                          return (
                            <div
                              key={unit.unitId}
                              className={`p-3 rounded-xl border space-y-2 ${
                                isCurrentScannedUnit
                                  ? 'bg-white dark:bg-slate-900 border-blue-600 ring-2 ring-blue-500/20'
                                  : 'bg-white/90 dark:bg-slate-900/70 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                    isCurrentScannedUnit
                                      ? 'bg-[#002B66] text-white'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  Unit #{unit.unitNumber} {isCurrentScannedUnit ? '(QR Aktif)' : ''}
                                </span>
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
                                {KONDISI_ITEM_OPTIONS.map(opt => (
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

                {/* General Inspection Notes & BAST Photo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Catatan Keseluruhan Pemeriksaan Fisik (Opsional):
                    </label>
                    <textarea
                      rows={2}
                      value={overallCatatan}
                      onChange={e => setOverallCatatan(e.target.value)}
                      placeholder="Ringkasan hasil verifikasi lapangan..."
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Unggah Foto Bukti Pemeriksaan / Serah Terima:
                    </label>
                    <label className="h-[60px] rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 flex items-center justify-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
                      <Upload className="w-4 h-4 text-[#002B66] dark:text-blue-400" />
                      <span>
                        {fotoBuktiUrl
                          ? 'Foto Bukti Tersimpan (Klik untuk Ganti)'
                          : 'Pilih File Foto Dokumentasi'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="submit"
                    className="h-10 px-6 rounded-xl bg-[#002B66] hover:bg-blue-900 text-white text-xs font-bold inline-flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                  >
                    <Save className="w-4 h-4 text-amber-300" />
                    <span>
                      {updateMode === 'SAME_ITEM_ALL_UNITS'
                        ? `Simpan Semua "${activeUnitContext.catalogItem.namaBarang.slice(0, 18)}..." (${activeUnitContext.catalogItem.qty} ${activeUnitContext.catalogItem.satuan})`
                        : updateMode === 'EDIT_SEKALIGUS_ALL'
                        ? `Simpan Edit Sekaligus (${totalUnitsForScanned} Unit)`
                        : 'Simpan Update Satuan per Unit'}
                    </span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
