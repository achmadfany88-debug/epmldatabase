/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { BantuanItem } from '../types';

// Official Google Workspace Scopes configured for this application
export const SCOPES = ['https://www.googleapis.com/auth/drive'];

// Designated Google Drive Folder IDs & Share Links provided by User
export const DRIVE_VIDEO_FOLDER_ID = '1pYT5b3qMuKRPjywVky15fA-5MCTWvslW';
export const DRIVE_VIDEO_FOLDER_URL =
  'https://drive.google.com/drive/folders/1pYT5b3qMuKRPjywVky15fA-5MCTWvslW?usp=sharing';

export const DRIVE_PHOTO_ARCHIVE_ROOT_ID = '1Qw4MZn43mzI2yZTQRDpD7pbWZZpy3RIt';
export const DRIVE_PHOTO_ARCHIVE_ROOT_URL =
  'https://drive.google.com/drive/folders/1Qw4MZn43mzI2yZTQRDpD7pbWZZpy3RIt?usp=sharing';

export const DRIVE_BACKUP_FOLDER_ID = '13QMsleueA1Mp4kMWLa2q36bIuWwXXvDT';
export const DRIVE_BACKUP_FOLDER_URL =
  'https://drive.google.com/drive/folders/13QMsleueA1Mp4kMWLa2q36bIuWwXXvDT?usp=sharing';

const DRIVE_ARCHIVE_REGISTRY_KEY = 'bi_epml_gdrive_photo_archive_registry_v1';
const DRIVE_YEAR_FOLDERS_REGISTRY_KEY = 'bi_epml_gdrive_yearly_folders_registry_v1';
const ACTIVE_BUDGET_YEAR_STORAGE_KEY = 'bi_epml_active_budget_year_v1';
const LAST_DETECTED_CALENDAR_YEAR_KEY = 'bi_epml_last_calendar_year_v1';

export interface DriveArchiveRegistryEntry {
  bantuanId: string;
  namaPenerima: string;
  tahun: number;
  yearFolderName: string;
  yearFolderId: string;
  recipientFolderName: string;
  recipientFolderId: string;
  recipientFolderUrl: string;
  photoCount: number;
  lastSyncedAt: string;
  isRecipientDeletedFromRekap?: boolean;
}

export interface DriveYearlyFolderEntry {
  tahun: number;
  folderName: string; // e.g. "EPML 2026", "EPML 2027"
  photoYearFolderId?: string;
  photoYearFolderUrl?: string;
  videoYearFolderId?: string;
  videoYearFolderUrl?: string;
  lastVerifiedAt: string;
}

/**
 * Get the current active Budget Year (Tahun Anggaran).
 * Automatically advances when the system calendar year rolls over to a new year
 * (e.g. 2026 -> 2027 -> 2028 and so on).
 */
export const getActiveBudgetYear = (): number => {
  const calendarYear = Math.max(2026, new Date().getFullYear());
  try {
    const lastCalendarRaw = localStorage.getItem(LAST_DETECTED_CALENDAR_YEAR_KEY);
    const storedBudgetRaw = localStorage.getItem(ACTIVE_BUDGET_YEAR_STORAGE_KEY);
    const lastCalendarYear = lastCalendarRaw ? parseInt(lastCalendarRaw, 10) : calendarYear;
    let activeYear = storedBudgetRaw ? parseInt(storedBudgetRaw, 10) : calendarYear;

    if (isNaN(activeYear) || activeYear < 2024) {
      activeYear = calendarYear;
    }

    // If real calendar year has rolled over to a newer year, automatically advance the budget year
    if (calendarYear > lastCalendarYear && calendarYear > activeYear) {
      activeYear = calendarYear;
      localStorage.setItem(ACTIVE_BUDGET_YEAR_STORAGE_KEY, String(activeYear));
    }
    localStorage.setItem(LAST_DETECTED_CALENDAR_YEAR_KEY, String(calendarYear));
    return activeYear;
  } catch {
    return calendarYear;
  }
};

/**
 * Set or advance the active Budget Year (Tahun Anggaran) and persist it.
 */
export const setActiveBudgetYear = (tahun: number): number => {
  const validYear = Math.max(2024, Math.min(2100, Math.floor(Number(tahun) || new Date().getFullYear())));
  try {
    localStorage.setItem(ACTIVE_BUDGET_YEAR_STORAGE_KEY, String(validYear));
  } catch {
    // Ignore storage errors
  }
  return validYear;
};

/**
 * Get persistent registry of provisioned "EPML {tahun}" folders in Arsip Foto & Arsip Video.
 */
export const getYearlyFoldersRegistry = (): DriveYearlyFolderEntry[] => {
  try {
    const raw = localStorage.getItem(DRIVE_YEAR_FOLDERS_REGISTRY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => b.tahun - a.tahun);
  } catch {
    return [];
  }
};

export const saveYearlyFolderRegistryEntry = (
  partial: Partial<DriveYearlyFolderEntry> & { tahun: number }
): DriveYearlyFolderEntry => {
  const cleanYear = Number(partial.tahun) || getActiveBudgetYear();
  const folderName = `EPML ${cleanYear}`;
  const nowFormatted = new Date().toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const list = getYearlyFoldersRegistry();
  const idx = list.findIndex(item => item.tahun === cleanYear);

  const updatedEntry: DriveYearlyFolderEntry =
    idx >= 0
      ? {
          ...list[idx],
          ...partial,
          tahun: cleanYear,
          folderName,
          lastVerifiedAt: partial.lastVerifiedAt || nowFormatted
        }
      : {
          tahun: cleanYear,
          folderName,
          photoYearFolderId: partial.photoYearFolderId,
          photoYearFolderUrl: partial.photoYearFolderUrl,
          videoYearFolderId: partial.videoYearFolderId,
          videoYearFolderUrl: partial.videoYearFolderUrl,
          lastVerifiedAt: partial.lastVerifiedAt || nowFormatted
        };

  if (idx >= 0) {
    list[idx] = updatedEntry;
  } else {
    list.push(updatedEntry);
  }

  list.sort((a, b) => b.tahun - a.tahun);
  try {
    localStorage.setItem(DRIVE_YEAR_FOLDERS_REGISTRY_KEY, JSON.stringify(list));
  } catch {
    // Ignore storage errors
  }
  return updatedEntry;
};

// Initialize Firebase App safely
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
SCOPES.forEach(scope => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'select_account'
});

// Flag to indicate if we are in the middle of a sign-in flow.
let isSigningIn = false;
// Cache the access token in memory ONLY (never in localStorage or sessionStorage).
let cachedAccessToken: string | null = null;
let cachedGoogleUser: User | null = null;

type AuthListener = (state: {
  isConnected: boolean;
  user: User | null;
  accessToken: string | null;
}) => void;

const authListeners = new Set<AuthListener>();

const notifyAuthListeners = () => {
  const payload = {
    isConnected: Boolean(cachedAccessToken),
    user: cachedGoogleUser,
    accessToken: cachedAccessToken
  };
  authListeners.forEach(listener => listener(payload));
};

// Initialize auth state listener. Call this on app load.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    cachedGoogleUser = user;
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
    notifyAuthListeners();
  });
};

export const subscribeGoogleDriveAuth = (listener: AuthListener): (() => void) => {
  authListeners.add(listener);
  listener({
    isConnected: Boolean(cachedAccessToken),
    user: cachedGoogleUser,
    accessToken: cachedAccessToken
  });
  return () => {
    authListeners.delete(listener);
  };
};

// Must be called from a button click or user interaction
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan access token Google Drive dari Firebase Auth.');
    }

    cachedAccessToken = credential.accessToken;
    cachedGoogleUser = result.user;
    notifyAuthListeners();
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Drive sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const getConnectedGoogleUser = (): User | null => {
  return cachedGoogleUser;
};

export const logoutGoogleDrive = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  cachedGoogleUser = null;
  notifyAuthListeners();
};

/**
 * Ensure we have an active Google Drive OAuth token; if not, trigger popup sign-in.
 */
export const ensureDriveAccessToken = async (): Promise<string> => {
  if (cachedAccessToken) {
    return cachedAccessToken;
  }
  const signedIn = await googleSignIn();
  if (!signedIn?.accessToken) {
    throw new Error('Otorisasi Google Drive dibatalkan atau belum berhasil.');
  }
  return signedIn.accessToken;
};

/**
 * Helper to escape single quotes in Google Drive query strings
 */
const escapeDriveQueryValue = (val: string): string => {
  return val.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
};

/**
 * Sanitize folder/file names so they are clean in Google Drive
 */
const sanitizeDriveName = (raw: string): string => {
  return raw.replace(/[\\/:*?"<>|]/g, ' - ').replace(/\s+/g, ' ').trim();
};

/**
 * Find an existing subfolder by name inside a parent folder, or create it if it does not exist.
 */
export const findOrCreateDriveFolder = async (
  folderName: string,
  parentFolderId: string,
  accessToken: string
): Promise<{ id: string; name: string; webViewLink: string }> => {
  const cleanName = sanitizeDriveName(folderName);
  const q = `mimeType = 'application/vnd.google-apps.folder' and name = '${escapeDriveQueryValue(
    cleanName
  )}' and '${parentFolderId}' in parents and trashed = false`;

  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    q
  )}&fields=files(id,name,webViewLink)&supportsAllDrives=true&includeItemsFromAllDrives=true&pageSize=5`;

  const searchRes = await fetch(searchUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (searchRes.status === 401) {
    cachedAccessToken = null;
    notifyAuthListeners();
    throw new Error('Sesi Google Drive telah berakhir. Silakan klik Sign in with Google kembali.');
  }

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (Array.isArray(searchData.files) && searchData.files.length > 0) {
      const existing = searchData.files[0];
      return {
        id: existing.id,
        name: existing.name,
        webViewLink:
          existing.webViewLink || `https://drive.google.com/drive/folders/${existing.id}`
      };
    }
  }

  // Create new folder inside parentFolderId
  const createUrl =
    'https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink&supportsAllDrives=true';
  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: cleanName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId]
    })
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Gagal membuat folder "${cleanName}" di Google Drive: ${errText}`);
  }

  const created = await createRes.json();
  return {
    id: created.id,
    name: created.name,
    webViewLink: created.webViewLink || `https://drive.google.com/drive/folders/${created.id}`
  };
};

/**
 * Automatically ensure "EPML {tahun}" folder exists in BOTH:
 * 1. Arsip Foto Penerima (DRIVE_PHOTO_ARCHIVE_ROOT_ID: 1Qw4MZn43mzI2yZTQRDpD7pbWZZpy3RIt)
 * 2. Arsip Video Landing Page (DRIVE_VIDEO_FOLDER_ID: 1pYT5b3qMuKRPjywVky15fA-5MCTWvslW)
 * whenever the budget year changes or a new budget year is used.
 */
export const ensureYearlyArchiveFoldersForYear = async (
  tahunInput: number | string,
  accessToken?: string
): Promise<DriveYearlyFolderEntry> => {
  const token = accessToken || (await ensureDriveAccessToken());
  const validYear = Number(tahunInput) || getActiveBudgetYear();
  const yearFolderName = `EPML ${validYear}`;

  const [photoYearFolder, videoYearFolder] = await Promise.all([
    findOrCreateDriveFolder(yearFolderName, DRIVE_PHOTO_ARCHIVE_ROOT_ID, token),
    findOrCreateDriveFolder(yearFolderName, DRIVE_VIDEO_FOLDER_ID, token)
  ]);

  return saveYearlyFolderRegistryEntry({
    tahun: validYear,
    folderName: yearFolderName,
    photoYearFolderId: photoYearFolder.id,
    photoYearFolderUrl: photoYearFolder.webViewLink,
    videoYearFolderId: videoYearFolder.id,
    videoYearFolderUrl: videoYearFolder.webViewLink
  });
};

/**
 * Automatically check and create "EPML {tahun}" folders in both Arsip Foto and Arsip Video
 * for all active budget years (current calendar year, active budget year, and any years in data).
 */
export const ensureAllActiveYearlyArchiveFolders = async (
  extraYears: number[] = [],
  interactiveIfMissingToken = false
): Promise<{
  synced: boolean;
  entries: DriveYearlyFolderEntry[];
  message: string;
}> => {
  let token = await getAccessToken();
  if (!token) {
    if (!interactiveIfMissingToken) {
      return {
        synced: false,
        entries: getYearlyFoldersRegistry(),
        message: 'Akun Google Drive belum terhubung.'
      };
    }
    token = await ensureDriveAccessToken();
  }

  const activeBudgetYear = getActiveBudgetYear();
  const calendarYear = Math.max(2026, new Date().getFullYear());
  const existingRegistry = getYearlyFoldersRegistry();

  const targetYearsSet = new Set<number>([
    activeBudgetYear,
    calendarYear,
    ...extraYears.filter(y => typeof y === 'number' && y >= 2024 && y <= 2100)
  ]);

  const sortedYears = Array.from(targetYearsSet).sort((a, b) => a - b);
  const syncedEntries: DriveYearlyFolderEntry[] = [];

  for (const yr of sortedYears) {
    const existing = existingRegistry.find(e => e.tahun === yr);
    if (
      existing &&
      existing.photoYearFolderId &&
      existing.videoYearFolderId &&
      !interactiveIfMissingToken
    ) {
      syncedEntries.push(existing);
      continue;
    }
    const entry = await ensureYearlyArchiveFoldersForYear(yr, token);
    syncedEntries.push(entry);
  }

  return {
    synced: true,
    entries: getYearlyFoldersRegistry(),
    message: `Folder Tahun Anggaran (${sortedYears
      .map(y => `EPML ${y}`)
      .join(', ')}) otomatis disiapkan pada Arsip Foto & Arsip Video Google Drive.`
  };
};

/**
 * Upload a Blob or File into a specific Google Drive folder using multipart upload.
 */
export const uploadBlobToDriveFolder = async (
  blob: Blob | File,
  fileName: string,
  mimeType: string,
  parentFolderId: string,
  description: string,
  accessToken: string
): Promise<{
  id: string;
  name: string;
  webViewLink: string;
  webContentLink?: string;
}> => {
  const metadata = {
    name: sanitizeDriveName(fileName),
    mimeType,
    parents: [parentFolderId],
    description
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', blob, sanitizeDriveName(fileName));

  const uploadUrl =
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink&supportsAllDrives=true';

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    body: form
  });

  if (res.status === 401) {
    cachedAccessToken = null;
    notifyAuthListeners();
    throw new Error('Sesi Google Drive berakhir. Silakan hubungkan kembali akun Google Anda.');
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gagal mengunggah file "${fileName}" ke Google Drive: ${errText}`);
  }

  const data = await res.json();
  return {
    id: data.id,
    name: data.name,
    webViewLink: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`,
    webContentLink: data.webContentLink
  };
};

/**
 * Convert a Data URL (base64 image) or remote URL to a Blob for uploading to Google Drive.
 */
export const convertPhotoSourceToBlob = async (
  photoSource: string
): Promise<{ blob: Blob; mimeType: string; extension: string } | null> => {
  if (!photoSource) return null;

  try {
    if (photoSource.startsWith('data:')) {
      const matches = photoSource.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) return null;
      const mimeType = matches[1] || 'image/jpeg';
      const base64Data = matches[2];
      const byteCharacters = atob(base64Data);
      const byteArrays: BlobPart[] = [];

      for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
        const slice = byteCharacters.slice(offset, offset + 1024);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        byteArrays.push(new Uint8Array(byteNumbers) as unknown as BlobPart);
      }

      const blob = new Blob(byteArrays, { type: mimeType });
      const ext = mimeType.includes('png')
        ? 'png'
        : mimeType.includes('webp')
        ? 'webp'
        : 'jpg';
      return { blob, mimeType, extension: ext };
    }

    // Also support fetching local/blob/remote URLs if possible
    const response = await fetch(photoSource);
    if (!response.ok) return null;
    const blob = await response.blob();
    const mimeType = blob.type || 'image/jpeg';
    const ext = mimeType.includes('png')
      ? 'png'
      : mimeType.includes('webp')
      ? 'webp'
      : 'jpg';
    return { blob, mimeType, extension: ext };
  } catch {
    return null;
  }
};

/**
 * Compute a lightweight signature for a photo string so we don't re-upload the exact same photo twice.
 */
const getPhotoSignature = (categoryKey: string, index: number, photoUrl: string): string => {
  const len = photoUrl.length;
  const head = photoUrl.slice(0, 36);
  const tail = photoUrl.slice(Math.max(0, len - 36));
  return `${categoryKey}_${index}_${len}_${head}_${tail}`;
};

/**
 * Ensure the hierarchy:
 * Root Folder (1Qw4MZn43mzI2yZTQRDpD7pbWZZpy3RIt)
 *   └── "EPML {tahun}" (e.g. "EPML 2026", "EPML 2027", dst.)
 *         └── "{namaPenerima}" (e.g. "SMK Budi Utomo & Komunitas Vokasi Digital")
 * Also automatically ensures "EPML {tahun}" exists in Arsip Video (1pYT5b3qMuKRPjywVky15fA-5MCTWvslW).
 */
export const ensureRecipientPhotoArchiveHierarchy = async (
  tahunInput: number | string,
  namaPenerima: string,
  accessToken?: string
): Promise<{
  yearFolderId: string;
  yearFolderName: string;
  yearFolderUrl: string;
  recipientFolderId: string;
  recipientFolderName: string;
  recipientFolderUrl: string;
}> => {
  const token = accessToken || (await ensureDriveAccessToken());
  const validYear = Number(tahunInput) || getActiveBudgetYear();
  const yearFolderName = `EPML ${validYear}`;
  const recipientFolderName = sanitizeDriveName(namaPenerima || 'Penerima Bantuan EPML');

  // 1. Find or create "EPML {tahun}" inside DRIVE_PHOTO_ARCHIVE_ROOT_ID (and also in DRIVE_VIDEO_FOLDER_ID)
  const [yearFolder, videoYearFolder] = await Promise.all([
    findOrCreateDriveFolder(yearFolderName, DRIVE_PHOTO_ARCHIVE_ROOT_ID, token),
    findOrCreateDriveFolder(yearFolderName, DRIVE_VIDEO_FOLDER_ID, token)
  ]);

  saveYearlyFolderRegistryEntry({
    tahun: validYear,
    folderName: yearFolderName,
    photoYearFolderId: yearFolder.id,
    photoYearFolderUrl: yearFolder.webViewLink,
    videoYearFolderId: videoYearFolder.id,
    videoYearFolderUrl: videoYearFolder.webViewLink
  });

  // 2. Find or create "{namaPenerima}" inside "EPML {tahun}"
  const recipientFolder = await findOrCreateDriveFolder(
    recipientFolderName,
    yearFolder.id,
    token
  );

  return {
    yearFolderId: yearFolder.id,
    yearFolderName: yearFolder.name,
    yearFolderUrl: yearFolder.webViewLink,
    recipientFolderId: recipientFolder.id,
    recipientFolderName: recipientFolder.name,
    recipientFolderUrl: recipientFolder.webViewLink
  };
};

/**
 * Automatically create "EPML {tahun}/{namaPenerima}" folder in Google Drive and upload all
 * recipient photos (Foto Lokasi Penerima, Bukti Penyerahan Vendor, Bukti BAST, Foto Monitoring).
 * NOTE: Never deletes any existing photos in Google Drive!
 */
export const syncRecipientPhotosToGoogleDrive = async (
  item: BantuanItem,
  onProgress?: (message: string) => void,
  interactiveIfMissingToken = true
): Promise<{
  synced: boolean;
  yearFolderId?: string;
  yearFolderName?: string;
  recipientFolderId?: string;
  recipientFolderName?: string;
  recipientFolderUrl?: string;
  uploadedPhotoMap?: Record<string, string>;
  newlyUploadedCount: number;
  totalArchivedCount: number;
  message: string;
}> => {
  let token = await getAccessToken();
  if (!token) {
    if (!interactiveIfMissingToken) {
      return {
        synced: false,
        newlyUploadedCount: 0,
        totalArchivedCount: Object.keys(item.driveUploadedPhotoMap || {}).length,
        message: 'Akun Google Drive belum terhubung.'
      };
    }
    token = await ensureDriveAccessToken();
  }

  const tahunFolder = item.tahun || getActiveBudgetYear();
  if (onProgress) {
    onProgress(`Menyiapkan folder Google Drive: EPML ${tahunFolder} / ${item.namaPenerima}...`);
  }

  const hierarchy = await ensureRecipientPhotoArchiveHierarchy(
    tahunFolder,
    item.namaPenerima,
    token
  );

  // If the recipient's budget year or recipient folder changed, re-upload photos to the new year's folder
  // while leaving the old year's folder untouched in Google Drive.
  const isSameRecipientFolder =
    !item.driveRecipientFolderId || item.driveRecipientFolderId === hierarchy.recipientFolderId;
  const existingMap: Record<string, string> = isSameRecipientFolder
    ? { ...(item.driveUploadedPhotoMap || {}) }
    : {};
  let newlyUploadedCount = 0;

  const photoCategories: {
    key: string;
    prefix: string;
    label: string;
    list: string[];
  }[] = [
    {
      key: 'LOKASI',
      prefix: '01_Foto_Lokasi_Penerima',
      label: 'Foto Lokasi Penerima',
      list:
        item.fotoPenerimaList && item.fotoPenerimaList.length > 0
          ? item.fotoPenerimaList
          : item.fotoPenerimaUrl
          ? [item.fotoPenerimaUrl]
          : []
    },
    {
      key: 'PENYERAHAN',
      prefix: '02_Bukti_Penyerahan_Vendor',
      label: 'Bukti Penyerahan Vendor',
      list:
        item.buktiPenyaluranVendorList && item.buktiPenyaluranVendorList.length > 0
          ? item.buktiPenyaluranVendorList
          : item.buktiPenyaluranVendorUrl
          ? [item.buktiPenyaluranVendorUrl]
          : []
    },
    {
      key: 'BAST',
      prefix: '03_Bukti_BAST',
      label: 'Bukti Serah Terima (BAST)',
      list:
        item.buktiSerahTerimaBastList && item.buktiSerahTerimaBastList.length > 0
          ? item.buktiSerahTerimaBastList
          : item.buktiSerahTerimaBastUrl
          ? [item.buktiSerahTerimaBastUrl]
          : []
    },
    {
      key: 'MONITORING',
      prefix: '04_Foto_Monitoring',
      label: 'Foto Monitoring Lapangan',
      list:
        item.fotoMonitoringList && item.fotoMonitoringList.length > 0
          ? item.fotoMonitoringList
          : item.fotoMonitoringUrl
          ? [item.fotoMonitoringUrl]
          : []
    }
  ];

  const cleanRecipientShort = sanitizeDriveName(item.namaPenerima).slice(0, 45);

  for (const cat of photoCategories) {
    for (let i = 0; i < cat.list.length; i++) {
      const photoUrl = cat.list[i];
      if (!photoUrl) continue;

      const sig = getPhotoSignature(cat.key, i + 1, photoUrl);
      if (existingMap[sig]) {
        // Already uploaded to this recipient's Google Drive folder; skip re-uploading
        continue;
      }

      if (onProgress) {
        onProgress(
          `Mengunggah ${cat.label} #${i + 1} ke folder ${hierarchy.yearFolderName} / ${hierarchy.recipientFolderName}...`
        );
      }

      const converted = await convertPhotoSourceToBlob(photoUrl);
      if (!converted) continue;

      const fileName = `${cat.prefix}_${i + 1}_${cleanRecipientShort}_${item.id}.${converted.extension}`;
      const description = `Arsip Dokumentasi EPML BI Jatim | Tahun: EPML ${tahunFolder} | Penerima: ${item.namaPenerima} (${item.id}) | Kategori: ${cat.label} #${i + 1}`;

      const uploaded = await uploadBlobToDriveFolder(
        converted.blob,
        fileName,
        converted.mimeType,
        hierarchy.recipientFolderId,
        description,
        token
      );

      existingMap[sig] = uploaded.id;
      newlyUploadedCount++;
    }
  }

  const nowFormatted = new Date().toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  // Save to permanent local registry so even if the recipient is deleted from Rekapitulasi,
  // the Google Drive folder reference and photos remain permanently recorded & untouched.
  saveDriveArchiveRegistryEntry({
    bantuanId: item.id,
    namaPenerima: item.namaPenerima,
    tahun: Number(tahunFolder),
    yearFolderName: hierarchy.yearFolderName,
    yearFolderId: hierarchy.yearFolderId,
    recipientFolderName: hierarchy.recipientFolderName,
    recipientFolderId: hierarchy.recipientFolderId,
    recipientFolderUrl: hierarchy.recipientFolderUrl,
    photoCount: Object.keys(existingMap).length,
    lastSyncedAt: nowFormatted,
    isRecipientDeletedFromRekap: false
  });

  return {
    synced: true,
    yearFolderId: hierarchy.yearFolderId,
    yearFolderName: hierarchy.yearFolderName,
    recipientFolderId: hierarchy.recipientFolderId,
    recipientFolderName: hierarchy.recipientFolderName,
    recipientFolderUrl: hierarchy.recipientFolderUrl,
    uploadedPhotoMap: existingMap,
    newlyUploadedCount,
    totalArchivedCount: Object.keys(existingMap).length,
    message:
      newlyUploadedCount > 0
        ? `Folder "${hierarchy.yearFolderName} / ${hierarchy.recipientFolderName}" siap di Google Drive (${newlyUploadedCount} foto baru diunggah).`
        : `Folder "${hierarchy.yearFolderName} / ${hierarchy.recipientFolderName}" telah terhubung di Google Drive.`
  };
};

/**
 * Upload a Landing Page Video or Media file into the designated Video Google Drive Folder:
 * https://drive.google.com/drive/folders/1pYT5b3qMuKRPjywVky15fA-5MCTWvslW?usp=sharing
 * Automatically creates a subfolder per Budget Year ("EPML 2026", "EPML 2027", etc.) inside the Video Archive root
 * (and also ensures the matching year folder exists in Photo Archive).
 */
export const uploadLandingVideoToGoogleDrive = async (
  file: File,
  tahunInput?: number | string
): Promise<{
  fileId: string;
  fileName: string;
  webViewLink: string;
  folderUrl: string;
  yearFolderId: string;
  yearFolderName: string;
  yearFolderUrl: string;
  tahun: number;
}> => {
  const token = await ensureDriveAccessToken();
  const validYear = Number(tahunInput) || getActiveBudgetYear();
  const yearEntry = await ensureYearlyArchiveFoldersForYear(validYear, token);

  const timestamp = new Date().toISOString().slice(0, 10);
  const targetFileName = `VIDEO_LANDING_EPML_${validYear}_${timestamp}_${file.name}`;
  const description = `Arsip Video Landing Page / Media Sistem EPML KPw Bank Indonesia Provinsi Jawa Timur | Tahun Anggaran: EPML ${validYear} (${file.name})`;

  const targetParentFolderId = yearEntry.videoYearFolderId || DRIVE_VIDEO_FOLDER_ID;

  const uploaded = await uploadBlobToDriveFolder(
    file,
    targetFileName,
    file.type || 'video/mp4',
    targetParentFolderId,
    description,
    token
  );

  return {
    fileId: uploaded.id,
    fileName: uploaded.name,
    webViewLink: uploaded.webViewLink,
    folderUrl: DRIVE_VIDEO_FOLDER_URL,
    yearFolderId: targetParentFolderId,
    yearFolderName: yearEntry.folderName,
    yearFolderUrl: yearEntry.videoYearFolderUrl || DRIVE_VIDEO_FOLDER_URL,
    tahun: validYear
  };
};

/**
 * Upload a Full System Backup JSON file into the designated Backup Google Drive Folder:
 * https://drive.google.com/drive/folders/13QMsleueA1Mp4kMWLa2q36bIuWwXXvDT?usp=sharing
 */
export const uploadBackupJsonToGoogleDrive = async (
  backupJsonPayload: string
): Promise<{
  fileId: string;
  fileName: string;
  webViewLink: string;
  folderUrl: string;
  syncedAt: string;
}> => {
  const token = await ensureDriveAccessToken();
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10);
  const timePart = now.toTimeString().slice(0, 8).replace(/:/g, '-');
  const fileName = `BACKUP_EPML_BI_JATIM_${datePart}_${timePart}.json`;
  const blob = new Blob([backupJsonPayload], { type: 'application/json' });
  const description = `Cadangan Data Utuh (Database Penerima, Vendor, Konfigurasi & Log Audit) Sistem EPML KPw Bank Indonesia Provinsi Jawa Timur — ${now.toLocaleString(
    'id-ID'
  )}`;

  const uploaded = await uploadBlobToDriveFolder(
    blob,
    fileName,
    'application/json',
    DRIVE_BACKUP_FOLDER_ID,
    description,
    token
  );

  const syncedAt = now.toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  return {
    fileId: uploaded.id,
    fileName: uploaded.name,
    webViewLink: uploaded.webViewLink,
    folderUrl: DRIVE_BACKUP_FOLDER_URL,
    syncedAt
  };
};

/**
 * Persistent Registry of Google Drive Photo Archives.
 * Even when a recipient is deleted from "Pencatatan & Rekapitulasi Penerima",
 * their Google Drive folder and photos are NEVER deleted and stay recorded here.
 */
export const getDriveArchiveRegistry = (): DriveArchiveRegistryEntry[] => {
  try {
    const raw = localStorage.getItem(DRIVE_ARCHIVE_REGISTRY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveDriveArchiveRegistryEntry = (entry: DriveArchiveRegistryEntry): void => {
  try {
    const list = getDriveArchiveRegistry();
    const idx = list.findIndex(e => e.bantuanId === entry.bantuanId && e.tahun === entry.tahun);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...entry };
    } else {
      list.unshift(entry);
    }
    localStorage.setItem(DRIVE_ARCHIVE_REGISTRY_KEY, JSON.stringify(list));
  } catch {
    // Ignore storage quota errors
  }
};

export const markRecipientDeletedButKeepDriveArchive = (bantuanId: string): void => {
  try {
    const list = getDriveArchiveRegistry();
    let updated = false;
    for (let i = 0; i < list.length; i++) {
      if (list[i].bantuanId === bantuanId) {
        list[i] = {
          ...list[i],
          isRecipientDeletedFromRekap: true
        };
        updated = true;
      }
    }
    if (updated) {
      localStorage.setItem(DRIVE_ARCHIVE_REGISTRY_KEY, JSON.stringify(list));
    }
  } catch {
    // Ignore errors
  }
};
