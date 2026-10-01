import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ImageLightboxModalProps {
  imageUrl: string | null;
  caption?: string;
  onClose: () => void;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  imageUrl,
  caption,
  onClose,
}) => {
  // Lock body scroll while modal is open
  useEffect(() => {
    if (!imageUrl) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [imageUrl]);

  // Support closing with Escape key
  useEffect(() => {
    if (!imageUrl) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [imageUrl, onClose]);

  if (!imageUrl) return null;

  return createPortal(
    <div
      id="modal-lightbox"
      onClick={onClose}
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-3xl w-full m-auto max-h-[92vh] sm:max-h-[88vh] bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-slate-200/50 dark:border-slate-800"
      >
        <div className="absolute top-3 right-3 z-10">
          <button
            type="button"
            id="btn-close-lightbox"
            onClick={onClose}
            className="p-2 bg-slate-900/70 hover:bg-slate-900 text-white rounded-full transition-colors cursor-pointer"
            aria-label="Đóng ảnh"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-auto flex items-center justify-center p-2 bg-slate-900 dark:bg-slate-950">
          <img
            src={imageUrl}
            alt={caption || 'Chi tiết hình ảnh'}
            className="max-w-full max-h-[75vh] object-contain rounded-lg"
          />
        </div>
        {caption && (
          <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 text-center font-medium text-slate-800 dark:text-slate-200">
            {caption}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
