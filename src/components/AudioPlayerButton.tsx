import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { playAudioOrTTS, stopCurrentAudio } from '../utils/audio';

interface AudioPlayerButtonProps {
  audioUrl?: string;
  fallbackText?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
  iconOnly?: boolean;
}

export const AudioPlayerButton: React.FC<AudioPlayerButtonProps> = ({
  audioUrl,
  fallbackText,
  size = 'md',
  className = '',
  label,
  iconOnly = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    return () => {
      if (isPlaying) {
        stopCurrentAudio();
      }
    };
  }, [isPlaying]);

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying) {
      stopCurrentAudio();
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    playAudioOrTTS(
      audioUrl,
      fallbackText,
      () => setIsPlaying(true),
      () => setIsPlaying(false)
    );
  };

  const sizeClasses = {
    sm: 'p-1.5 text-xs gap-1.5 rounded-lg',
    md: 'px-3 py-1.5 text-xs font-medium gap-2 rounded-xl',
    lg: 'px-4 py-2 text-sm font-semibold gap-2.5 rounded-xl',
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 18,
  };

  const defaultStyle = isPlaying
    ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300 dark:ring-emerald-600 animate-pulse'
    : audioUrl
    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800/80 active:scale-95'
    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/70 dark:border-slate-700 active:scale-95';

  return (
    <button
      type="button"
      id="btn-play-audio"
      onClick={handlePlay}
      className={`inline-flex items-center justify-center transition-all cursor-pointer ${sizeClasses[size]} ${defaultStyle} ${className}`}
      title={audioUrl ? 'Nghe phát âm (file tải lên)' : 'Nghe phát âm chuẩn (TTS)'}
      aria-label="Phát âm"
    >
      {isPlaying ? (
        <VolumeX size={iconSizes[size]} className="animate-spin text-current" />
      ) : (
        <Volume2 size={iconSizes[size]} className="text-current" />
      )}
      {!iconOnly && (
        <span>
          {isPlaying ? 'Đang phát...' : label || (audioUrl ? 'Nghe Audio' : 'Phát âm')}
        </span>
      )}
    </button>
  );
};
