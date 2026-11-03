/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { Upload, X, ZoomIn, RefreshCw, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface MultiPhotoUploaderProps {
  label: string;
  subtitle?: string;
  photos: string[];
  onChange: (photos: string[]) => void;
  onEnlarge: (photoUrl: string, caption: string) => void;
  maxPhotos?: number;
}

export const MultiPhotoUploader: React.FC<MultiPhotoUploaderProps> = ({
  label,
  subtitle,
  photos,
  onChange,
  onEnlarge,
  maxPhotos = 7
}) => {
  const addFileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);
  const activeReplaceIndexRef = useRef<number>(-1);

  // Handle adding new photos (single or multiple, up to maxPhotos)
  const handleAddPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxPhotos - photos.length;
    if (remainingSlots <= 0) return;

    const filesToRead = Array.from(files).slice(0, remainingSlots);
    const readPromises = filesToRead.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          }
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readPromises).then(newUrls => {
      const updated = [...photos, ...newUrls].slice(0, maxPhotos);
      onChange(updated);
      if (addFileInputRef.current) {
        addFileInputRef.current.value = '';
      }
    });
  };

  // Trigger replace dialog for a specific photo index
  const triggerReplacePhoto = (index: number) => {
    activeReplaceIndexRef.current = index;
    if (replaceFileInputRef.current) {
      replaceFileInputRef.current.value = '';
      replaceFileInputRef.current.click();
    }
  };

  // Handle replacing a specific photo
  const handleReplacePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetIndex = activeReplaceIndexRef.current;
    if (!file || targetIndex < 0 || targetIndex >= photos.length) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const updated = [...photos];
        updated[targetIndex] = reader.result;
        onChange(updated);
      }
      activeReplaceIndexRef.current = -1;
      if (replaceFileInputRef.current) {
        replaceFileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  // Delete a specific photo
  const handleDeletePhoto = (index: number) => {
    const updated = photos.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5 flex flex-col justify-between">
      {/* Hidden file input for replacing an individual photo */}
      <input
        type="file"
        ref={replaceFileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleReplacePhoto}
      />

      {/* Header with Photo Count Badge (Max 7) */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block leading-tight">
            {label}
          </span>
          {subtitle && (
            <p className="text-[10px] text-slate-400 leading-snug mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 tabular-nums ${
            photos.length >= maxPhotos
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : photos.length > 0
              ? 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300'
              : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
          }`}
        >
          {photos.length} / {maxPhotos} Foto
        </span>
      </div>

      {/* Photo Gallery Grid */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto p-0.5">
          {photos.map((url, idx) => (
            <div
              key={idx}
              className="relative group h-24 rounded-lg bg-slate-200 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700 shadow-2xs"
            >
              <img
                src={url}
                alt={`${label} #${idx + 1}`}
                className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                onClick={() => onEnlarge(url, `${label} (Foto ${idx + 1} dari ${photos.length})`)}
              />

              {/* Photo Index Badge */}
              <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/60 backdrop-blur-xs text-white text-[9px] font-bold rounded">
                #{idx + 1}
              </span>

              {/* Hover Action Overlay */}
              <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                {/* Enlarge Button */}
                <button
                  type="button"
                  title="Perbesar Foto"
                  onClick={() => onEnlarge(url, `${label} (Foto ${idx + 1} dari ${photos.length})`)}
                  className="p-1 rounded-md bg-white/90 text-slate-800 hover:bg-white transition-colors"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>

                {/* Replace Button */}
                <button
                  type="button"
                  title="Ganti Foto Ini"
                  onClick={() => triggerReplacePhoto(idx)}
                  className="p-1 rounded-md bg-blue-600/90 text-white hover:bg-blue-600 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>

                {/* Delete Button */}
                <button
                  type="button"
                  title="Hapus Foto Ini"
                  onClick={() => handleDeletePhoto(idx)}
                  className="p-1 rounded-md bg-red-600/90 text-white hover:bg-red-600 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="h-24 w-full rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 gap-1 text-[11px]">
          <ImageIcon className="w-6 h-6 text-slate-300 dark:text-slate-600" />
          <span>Belum ada foto diunggah</span>
        </div>
      )}

      {/* Upload & Add More Photos Button (hidden if maxPhotos reached) */}
      <div className="pt-1">
        {photos.length < maxPhotos ? (
          <div>
            <label className="cursor-pointer w-full py-1.5 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-blue-900 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors flex items-center justify-center gap-1.5 shadow-2xs">
              <Upload className="w-3.5 h-3.5" />
              <span>
                {photos.length === 0 ? 'Unggah Foto (Bisa Banyak)' : `Tambah Foto (+${maxPhotos - photos.length} Tersisa)`}
              </span>
              <input
                ref={addFileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleAddPhotos}
              />
            </label>
            <p className="text-[9px] text-slate-400 text-center mt-1">
              Bisa pilih sekaligus lebih dari satu foto (Maks. {maxPhotos} foto)
            </p>
          </div>
        ) : (
          <div className="text-center py-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 rounded-md border border-emerald-200/50 dark:border-emerald-900/50">
            ✓ Batas maksimal 7 foto terpenuhi (bisa diganti / dihapus)
          </div>
        )}
      </div>
    </div>
  );
};
