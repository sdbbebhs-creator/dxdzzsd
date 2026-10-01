import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Award, Trophy, Sparkles, Check, X, ShieldAlert } from 'lucide-react';
import { GameBadge } from '../../utils/gameBadges';
import { playBadgeUnlockFanfare } from '../../utils/gameAudio';

interface BadgeUnlockModalProps {
  badges: GameBadge[];
  isOpen: boolean;
  onClose: () => void;
}

export const BadgeUnlockModal: React.FC<BadgeUnlockModalProps> = ({
  badges,
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    if (isOpen && badges.length > 0) {
      playBadgeUnlockFanfare();
    }
  }, [isOpen, badges]);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!isOpen || badges.length === 0) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, badges.length]);

  // Support closing with Escape key
  useEffect(() => {
    if (!isOpen || badges.length === 0) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, badges.length, onClose]);

  if (!isOpen || badges.length === 0) return null;

  return createPortal(
    <div
      id="modal-badge-unlock"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
    >
      <div className="relative w-full max-w-lg m-auto bg-gradient-to-b from-slate-900 via-slate-950 to-black border-2 border-amber-400/80 rounded-3xl p-6 sm:p-8 text-center text-white shadow-2xl shadow-amber-500/20 overflow-hidden max-h-[92vh] sm:max-h-[88vh] max-h-[calc(100dvh-2rem)] flex flex-col">
        {/* Shimmer background light */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/60 hover:bg-slate-800 cursor-pointer transition-colors"
          aria-label="Đóng"
        >
          <X size={18} />
        </button>

        <div className="space-y-4 relative z-10">
          <div className="inline-flex p-4 rounded-3xl bg-amber-500/20 border border-amber-400/50 text-amber-300 shadow-lg shadow-amber-500/30">
            <Trophy size={48} className="animate-bounce text-amber-400" />
          </div>

          <div>
            <span className="text-[11px] font-black uppercase tracking-widest text-amber-400 block mb-1">
              CHIẾN TÍCH ĐỈNH CAO MỞ KHÓA!
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {badges.length === 1 ? 'HUY HIỆU DANH DỰ MỚI' : `ĐẠT ĐƯỢC ${badges.length} HUY HIỆU DANH DỰ!`}
            </h2>
          </div>

          {/* Badges list */}
          <div className="space-y-3 py-2 max-h-72 overflow-y-auto">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className={`p-4 rounded-2xl border-2 text-left flex items-start gap-4 shadow-lg ${badge.badgeBorder} badge-shimmer-active`}
              >
                <div className="text-4xl p-2 rounded-xl bg-black/40 border border-white/10 shrink-0">
                  {badge.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-base text-white">{badge.name}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-black/50 border border-white/20">
                      {badge.rarityLabel}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium mt-0.5">{badge.titleVi}</p>
                  <p className="text-xs text-slate-400 mt-1">{badge.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Rule statement */}
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2 text-left">
            <Sparkles size={16} className="text-amber-400 shrink-0" />
            <span>
              Huy hiệu này minh chứng cho phản xạ và kỹ năng game xuất sắc! Rank học thuật chỉ được thăng hạng thông qua lịch ôn tập FSRS chuẩn mực.
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm uppercase tracking-wider cursor-pointer shadow-lg shadow-orange-500/30 transition-all active:scale-95"
          >
            Tuyệt vời! Tiếp tục
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
