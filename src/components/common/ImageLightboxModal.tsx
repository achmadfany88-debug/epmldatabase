/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Maximize2, ExternalLink } from 'lucide-react';

interface ImageLightboxModalProps {
  isOpen: boolean;
  imageUrl: string;
  title?: string;
  category?: string;
  date?: string;
  location?: string;
  caption?: string;
  onClose: () => void;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen,
  imageUrl,
  title,
  category,
  date,
  location,
  caption,
  onClose
}) => {
  const [scale, setScale] = useState(1);

  // Reset scale when image changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setScale(1);
    }
  }, [isOpen, imageUrl]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  const zoomIn = () => setScale(prev => Math.min(prev + 0.3, 3));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.3, 0.7));
  const resetZoom = () => setScale(1);

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Top Floating Action Bar */}
      <div 
        className="w-full max-w-5xl flex items-center justify-between pb-3 text-white z-10"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          {category && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-600/80 text-white">
              {category}
            </span>
          )}
          {location && (
            <span className="text-xs text-slate-300 font-medium hidden sm:inline">
              &bull; {location}
            </span>
          )}
          {date && (
            <span className="text-xs text-slate-400 hidden sm:inline">
              &bull; {date}
            </span>
          )}
        </div>

        {/* Zoom Controls & Close Button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-900/80 border border-slate-700 rounded-lg p-1 text-slate-200">
            <button
              onClick={zoomOut}
              className="p-1.5 hover:bg-slate-800 rounded transition-colors"
              title="Perkecil (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono px-2 text-slate-300 select-none">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={zoomIn}
              className="p-1.5 hover:bg-slate-800 rounded transition-colors"
              title="Perbesar (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={resetZoom}
              className="p-1.5 hover:bg-slate-800 rounded transition-colors border-l border-slate-700 ml-1"
              title="Reset Ukuran"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Tutup (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Image Display Container */}
      <div 
        className="relative flex-1 w-full max-w-5xl flex items-center justify-center overflow-hidden rounded-2xl bg-black/40 border border-white/10 p-2 sm:p-4 select-none cursor-default"
        onClick={e => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt={title || 'Foto Dokumentasi Pemberitaan EPML'}
          style={{ transform: `scale(${scale})`, transition: 'transform 0.15s ease-out' }}
          className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-2xl cursor-grab active:cursor-grabbing"
          draggable={false}
        />
      </div>

      {/* Bottom Title & Caption Bar */}
      {title && (
        <div 
          className="w-full max-w-5xl pt-3 text-center text-white z-10"
          onClick={e => e.stopPropagation()}
        >
          <h4 className="text-sm sm:text-base font-bold text-white tracking-wide">
            {title}
          </h4>
          {caption && (
            <p className="text-xs text-slate-300 max-w-2xl mx-auto mt-1 line-clamp-2">
              {caption}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
