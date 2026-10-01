import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Award,
  Flame,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Clock,
  Zap,
  CheckCircle2,
  Info,
  Lock,
} from 'lucide-react';
import { UserRankData } from '../types';
import { RankEmblem } from './RankEmblem';
import {
  RANK_TIERS,
  getRankTierByKey,
  getNextRankTier,
  getRankProgress,
  SHIELD_STREAK_MILESTONES,
} from '../utils/rankSystem';

interface RankModalProps {
  isOpen: boolean;
  onClose: () => void;
  rankData: UserRankData;
  onStartReview: () => void;
}

export const RankModal: React.FC<RankModalProps> = ({
  isOpen,
  onClose,
  rankData,
  onStartReview,
}) => {
  const [timeLeftStr, setTimeLeftStr] = useState<string>('');

  const currentTier = getRankTierByKey(rankData.tierKey);
  const nextTier = getNextRankTier(rankData.tierKey);
  const rankProgress = getRankProgress(rankData);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Support closing with Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Calculate countdown to midnight (23:59:59)
  useEffect(() => {
    if (!isOpen) return;
    const updateCountdown = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(23, 59, 59, 999);
      const diffMs = Math.max(0, midnight.getTime() - now.getTime());

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      setTimeLeftStr(
        `${hours.toString().padStart(2, '0')}:${minutes
          .toString()
          .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  // Promotion needs every requirement at once, so the overall percent is the weakest one
  const nextRankPercent = rankProgress.percent;

  return createPortal(
    <div
      id="rank-modal-backdrop"
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden m-auto flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[88vh] transition-colors">
        {/* Modal Top Banner with Dynamic Tier Theme */}
        <div
          className={`relative p-6 sm:p-7 bg-gradient-to-br ${currentTier.bgGradient} border-b ${currentTier.borderColor}`}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
            aria-label="Đóng bảng rank"
          >
            <X size={18} />
          </button>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 text-center sm:text-left">
            {/* Rank Icon with Glowing Aura */}
            <div className="relative shrink-0">
              <div
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl flex items-center justify-center text-4xl sm:text-5xl shadow-xl border-2"
                style={{
                  backgroundColor: `${currentTier.color}20`,
                  borderColor: currentTier.color,
                  boxShadow: `0 10px 25px -5px ${currentTier.color}50`,
                }}
              >
                <RankEmblem tierKey={currentTier.key} size={72} />
              </div>
              <span
                className="absolute -bottom-2 -right-2 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full border bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-xs"
                style={{ borderColor: currentTier.color }}
              >
                Cấp {currentTier.level}
              </span>
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Đẳng Cấp Hiện Tại
                </span>
                <span className={`px-2.5 py-0.5 text-xs font-black rounded-full border ${currentTier.badgeClass}`}>
                  Rank {currentTier.nameVi}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {currentTier.titleVi}
              </h2>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                Ôn tập đều đặn mỗi ngày để duy trì ngọn lửa, bảo vệ rank và thăng tiến trên con đường thông thạo ngoại ngữ.
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar inside Banner */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-6">
            {/* Streak */}
            <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-500 shrink-0">
                <Flame size={18} className={rankData.streakCount > 0 ? 'flame-burning fill-amber-400' : ''} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block truncate">
                  Chuỗi Lửa
                </span>
                <span className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tabular-nums">
                  {rankData.streakCount} <span className="text-xs font-medium text-slate-400">ngày</span>
                </span>
              </div>
            </div>

            {/* EXP */}
            <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-500 shrink-0">
                <Zap size={18} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block truncate">
                  Điểm EXP
                </span>
                <span className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
                  {rankData.currentExp} <span className="text-xs font-medium text-slate-400">EXP</span>
                </span>
              </div>
            </div>

            {/* Shields */}
            <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-500 shrink-0">
                <Shield size={18} className="fill-emerald-500/20" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block truncate">
                  Khiên Bảo Vệ
                </span>
                <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {rankData.shieldsCount} <span className="text-xs font-medium text-slate-400">khiên</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-6 flex-1 min-h-0 overflow-y-auto">
          {/* ========================================================================= */}
          {/* DAILY RETENTION STATUS & COUNTDOWN WARNING                                */}
          {/* ========================================================================= */}
          {rankData.todayProtected ? (
            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500/60 text-emerald-950 dark:text-emerald-200 space-y-3 fire-glow-border">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-emerald-500 text-white shrink-0 shadow-md shadow-emerald-500/30">
                  <ShieldCheck size={26} />
                </div>
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-base text-emerald-900 dark:text-emerald-100">
                      Đã Bảo Vệ Rank Hôm Nay Thành Công!
                    </h3>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-200/80 dark:bg-emerald-900/80 text-emerald-900 dark:text-emerald-200 uppercase">
                      An toàn 100%
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                    Tuyệt vời! Bạn đã hoàn thành ôn tập tất cả lịch thẻ hôm nay. Rank <strong>{currentTier.nameVi}</strong> và ngọn lửa chuỗi ({rankData.streakCount} ngày) đã được giữ an toàn cho hôm nay!
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-orange-500/15 border-2 border-amber-400 dark:border-amber-500 text-slate-900 dark:text-slate-100 space-y-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0 animate-bounce shadow-md shadow-amber-500/30">
                    <ShieldAlert size={24} />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-base text-amber-950 dark:text-amber-200">
                        Cảnh Báo: Chưa Hoàn Thành Bảo Vệ Rank!
                      </h3>
                      <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-rose-500 text-white uppercase animate-pulse">
                        Nguy cơ tụt hạng
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      Bạn chưa hoàn thành tất cả lịch thẻ đến hạn hôm nay. Bạn phải hoàn thành tất cả lịch thẻ (từ vựng & ngữ pháp) của ngày hôm đó thì mới được + chuỗi và bảo vệ Rank!
                    </p>
                  </div>
                </div>

                {/* Countdown Timer */}
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block uppercase">
                    Hạn chót còn
                  </span>
                  <div className="text-lg font-mono font-black text-rose-600 dark:text-rose-400">
                    {timeLeftStr}
                  </div>
                </div>
              </div>

              {/* Call to action */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-1 border-t border-amber-300/40 dark:border-amber-700/40">
                <div className="flex items-center gap-1.5 text-xs text-amber-900 dark:text-amber-300 font-bold">
                  <Clock size={14} className="text-amber-600 dark:text-amber-400" />
                  <span>Yêu cầu hôm nay: Hoàn thành tất cả lịch thẻ ôn tập</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onStartReview();
                  }}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white text-xs font-black shadow-md shadow-orange-500/25 transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Flame size={15} className="fill-white flame-burning" />
                  <span>Ôn tập ngay để giữ Rank</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PROGRESS TO NEXT RANK                                                     */}
          {/* ========================================================================= */}
          {nextTier ? (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp size={18} className="text-indigo-600 dark:text-indigo-400" />
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    Tiến độ thăng hạng: Rank {nextTier.nameVi}
                  </span>
                  <RankEmblem tierKey={nextTier.key} size={24} animated={false} />
                </div>
                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                  {nextRankPercent}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-3.5 rounded-full overflow-hidden p-0.5">
                <div
                  className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 h-full rounded-full transition-all duration-500 relative"
                  style={{ width: `${nextRankPercent}%` }}
                >
                  <div className="absolute inset-0 rank-bar-shimmer-active" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600 dark:text-slate-300">
                {rankProgress.requirements.map((req) => {
                  const missing = Math.max(0, req.target - req.current);
                  return (
                    <div
                      key={req.key}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800"
                    >
                      <span className="truncate">{req.label}:</span>
                      <span className="font-black text-slate-900 dark:text-slate-100 tabular-nums shrink-0">
                        {req.current} / {req.target} {req.unit} {req.met ? '✅' : `(còn ${missing})`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-400 text-center space-y-1">
              <span className="text-2xl">🏆</span>
              <h3 className="font-black text-base text-amber-900 dark:text-amber-200">
                Bạn Đã Đạt Đẳng Cấp Thần Thoại Tối Thượng!
              </h3>
              <p className="text-xs text-amber-800 dark:text-amber-300">
                Hãy tiếp tục ôn tập mỗi ngày để giữ vững kỷ lục ngọn lửa bất tử và không bị tụt hạng.
              </p>
            </div>
          )}

          {/* ========================================================================= */}
          {/* RANK SHIELD MANAGEMENT (STREAK FREEZE)                                    */}
          {/* ========================================================================= */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-emerald-500 fill-emerald-500/20" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Khiên Bảo Vệ Tụt Rank (Rank Shield)
                </h3>
              </div>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                Đang có: {rankData.shieldsCount}/3 khiên
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Nếu bạn bỏ lỡ một ngày có thẻ đến hạn, <strong>Khiên Bảo Vệ</strong> sẽ tự động kích hoạt (mỗi ngày bỏ lỡ tốn 1 khiên) để giữ nguyên Chuỗi Lửa và không bị giáng rank. Ngày không có thẻ nào đến hạn được tính là ngày nghỉ, không tốn khiên. Nhận thêm 1 khiên (tối đa 3) khi chuỗi đạt mốc {SHIELD_STREAK_MILESTONES.join(', ')} ngày.
            </p>
          </div>

          {/* ========================================================================= */}
          {/* FULL ROADMAP OF 8 RANK TIERS                                              */}
          {/* ========================================================================= */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Award size={18} className="text-amber-500" />
                Lộ trình 8 Mức Đẳng Cấp & Quy Tắc Giữ Rank
              </h3>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Từ Tập Sự đến Thần Thoại
              </span>
            </div>

            <div className="space-y-2.5">
              {RANK_TIERS.map((tier) => {
                const isCurrent = tier.key === rankData.tierKey;
                const isUnlocked = currentTier.level >= tier.level;

                return (
                  <div
                    key={tier.key}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                      isCurrent
                        ? `bg-gradient-to-r ${tier.bgGradient} ${tier.borderColor} ring-2 ring-offset-2 ring-emerald-500/50 dark:ring-offset-slate-950 shadow-md`
                        : isUnlocked
                        ? 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 opacity-90'
                        : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-xl sm:text-2xl shadow-xs border"
                          style={{
                            backgroundColor: `${tier.color}15`,
                            borderColor: `${tier.color}40`,
                          }}
                        >
                          <RankEmblem tierKey={tier.key} size={40} muted={!isUnlocked} animated={isCurrent} />
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-sm text-slate-900 dark:text-slate-100">
                              {tier.nameVi} - {tier.titleVi}
                            </span>
                            {isCurrent && (
                              <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded-full bg-emerald-500 text-white">
                                Đang ở đây
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Cần {tier.minStreak} ngày chuỗi + {tier.minExp} EXP + {tier.minActiveDays} ngày hoàn thành lịch ôn
                          </p>
                        </div>
                      </div>

                      {/* Status indicator */}
                      <div className="shrink-0 text-right">
                        {isCurrent ? (
                          <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 size={16} />
                            <span>Hiện tại</span>
                          </span>
                        ) : isUnlocked ? (
                          <span className="text-[11px] font-bold text-slate-400">Đã mở</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400">
                            <Lock size={12} />
                            <span>Khóa</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Perks list */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex flex-wrap gap-1.5">
                      {tier.perks.map((perk, pIdx) => (
                        <span
                          key={pIdx}
                          className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                        >
                          • {perk}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* How Rank & Streak Decay Works Guide */}
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
              <Info size={16} className="text-indigo-500" />
              <span>Quy tắc vận hành Hệ Thống Rank & Giữ Chuỗi:</span>
            </div>
            <ul className="list-disc pl-5 space-y-1 leading-relaxed">
              <li><strong>Mặc định ban đầu:</strong> Chuỗi lửa là 0 ngày. Bạn thắp sáng ngọn lửa bằng cách hoàn thành tất cả thẻ đến hạn hôm nay.</li>
              <li><strong>Cơ chế giữ Rank:</strong> Mỗi ngày hoàn thành tất cả lịch thẻ đến hạn (từ vựng & ngữ pháp) để giữ Rank và +1 chuỗi.</li>
              <li><strong>Hệ quả khi bỏ lỡ 1 ngày:</strong> Nếu có Khiên, khiên sẽ tự bung để cứu chuỗi. Nếu không đủ khiên, chuỗi lửa sẽ tắt về 0 và rank bị tụt 1 bậc!</li>
              <li><strong>Thăng hạng:</strong> Cần đạt đồng thời cả 3 điều kiện của rank tiếp theo: chuỗi ngày, EXP tích lũy và số ngày hoàn thành lịch ôn.</li>
              <li><strong>Cộng điểm EXP:</strong> Ôn 1 thẻ (+10 EXP), trả lời Tốt/Dễ (+15-20 EXP), hoàn thành đủ 5 ngữ cảnh (+60 EXP), hoàn thành toàn bộ lịch ôn trong ngày (+50 EXP, cộng thêm 5 EXP mỗi thẻ, tối đa 300).</li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
            Học tập kỷ luật mỗi ngày để giữ vững đỉnh cao!
          </span>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onStartReview();
              }}
              className="px-4 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs shadow-emerald-600/30 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Flame size={15} className="fill-white" />
              <span>Học để giữ Rank</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
