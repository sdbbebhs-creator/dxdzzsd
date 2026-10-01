import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Brain,
  Sparkles,
  CheckCircle2,
  Clock,
  Check,
  X,
  RefreshCw,
  Target,
  Smile,
  TrendingDown,
  TrendingUp,
  Lightbulb,
} from 'lucide-react';
import { VocabItem, GrammarItem, FSRSOptimizerResult } from '../types';
import { getMemoryLogsStats, getUserFSRSConfig, saveUserFSRSConfig, getReviewLogs } from '../utils/storage';
import { FSRSSettingsPanel } from './FSRSSettingsPanel';
import { updateFSRSSettings } from '../utils/fsrs';
import { useFSRSSettings } from '../hooks/useFSRSSettings';
import {
  RHYTHM_ELIGIBLE_REVIEWS,
  RHYTHM_MIN_MEASURED_REVIEWS,
  buildRhythmMessage,
  detectGoalKind,
  estimateWorkloadRatio,
  recommendRetention,
  type RhythmInput,
} from '../utils/memoryRhythm';

interface FSRSOptimizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  vocabList: VocabItem[];
  grammarList: GrammarItem[];
  onTargetRetentionChanged?: (newRetention: number) => void;
  onShowToast: (msg: string) => void;
}

const EASY_GOAL_OPTIONS = [
  {
    id: 'Thi IELTS / TOEFL / TOEIC cấp tốc (1-3 tháng)',
    label: 'Cần thi gấp / Kiểm tra trên lớp (Nhớ thật chắc)',
    desc: 'Ưu tiên nhớ chuẩn trên 90%, sẵn sàng ôn nhiều hơn một chút trước ngày thi để điểm cao.',
  },
  {
    id: 'Học dài hạn / Bền vững (Giao tiếp & Đi làm)',
    label: 'Học thong thả, bền vững (Giao tiếp & Đi làm)',
    desc: 'Học nhẹ nhàng thoải mái (khoảng 85-88%), giảm áp lực bài vở mỗi ngày, nhớ tự nhiên.',
  },
  {
    id: 'Tự do rèn luyện từ vựng hàng ngày',
    label: 'Học vui theo sở thích hàng ngày',
    desc: 'Mỗi ngày vài từ, vui vẻ nhẹ nhàng theo nhịp sống, không áp lực.',
  },
];

/** Đưa mục tiêu đã lưu (có thể là chuỗi cũ) về 1 trong 3 lựa chọn hiện có */
function normalizeGoal(goal?: string): string {
  if (goal && EASY_GOAL_OPTIONS.some((o) => o.id === goal)) return goal;
  if (!goal) return EASY_GOAL_OPTIONS[1].id;
  const kind = detectGoalKind(goal);
  return EASY_GOAL_OPTIONS[kind === 'exam' ? 0 : kind === 'casual' ? 2 : 1].id;
}

interface AIAdvice {
  goal: string;
  targetRetention: number;
  result: FSRSOptimizerResult;
}

export const FSRSOptimizerModal: React.FC<FSRSOptimizerModalProps> = ({
  isOpen,
  onClose,
  vocabList,
  grammarList,
  onTargetRetentionChanged,
  onShowToast,
}) => {
  const [stats, setStats] = useState(() => getMemoryLogsStats(vocabList, grammarList));
  const reviewLogs = useMemo(() => (isOpen ? getReviewLogs() : []), [isOpen, stats]);
  const [userGoal, setUserGoal] = useState(() => normalizeGoal(getUserFSRSConfig().userGoal));
  // Tỷ lệ ghi nhớ (%) đọc trực tiếp từ kho cài đặt FSRS dùng chung
  const fsrsSettings = useFSRSSettings();
  const targetRetention = Math.round(fsrsSettings.targetRetention * 100);
  const setTargetRetention = (percent: number) => updateFSRSSettings({ targetRetention: percent / 100 });
  const [loading, setLoading] = useState(false);
  // Lời khuyên của AI chỉ còn hiệu lực khi mục tiêu học & mức nhớ hiện tại chưa đổi
  const [aiAdvice, setAIAdvice] = useState<AIAdvice | null>(null);
  // Mức nhớ hiện tại lúc mở trợ lý, dùng để so sánh sau khi bấm áp dụng
  const [baselineRetention, setBaselineRetention] = useState(targetRetention);

  useEffect(() => {
    if (isOpen) {
      setStats(getMemoryLogsStats(vocabList, grammarList));
      setUserGoal(normalizeGoal(getUserFSRSConfig().userGoal));
      setBaselineRetention(Math.round(fsrsSettings.targetRetention * 100));
      setAIAdvice(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, vocabList, grammarList]);

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

  const rhythmInput: RhythmInput = useMemo(
    () => ({
      total_reviews: stats.total_reviews,
      measured_reviews: stats.measured_reviews,
      actual_retention: stats.actual_retention,
      target_retention: baselineRetention,
      daily_cards: stats.daily_cards,
      user_goal: userGoal,
    }),
    [stats, baselineRetention, userGoal]
  );

  // Đề xuất tức thì, tính ngay trên máy từ dữ liệu ôn tập thật
  const localRec = useMemo(() => recommendRetention(rhythmInput), [rhythmInput]);

  const activeAdvice =
    aiAdvice && aiAdvice.goal === userGoal && aiAdvice.targetRetention === baselineRetention ? aiAdvice.result : null;
  const recommended = activeAdvice?.recommended_target_retention ?? localRec.recommended_target_retention;
  const recommendedPct = Math.round(recommended * 100);
  const message = activeAdvice?.user_message ?? buildRhythmMessage(rhythmInput, localRec);
  const statusCode = activeAdvice?.status_code ?? localRec.status_code;
  const applied = targetRetention === recommendedPct;

  const workloadRatio = estimateWorkloadRatio(baselineRetention / 100, recommended);
  const workloadDelta = Math.round((workloadRatio - 1) * 100);
  const projectedDaily = stats.daily_cards > 0 ? Math.max(1, Math.round(stats.daily_cards * workloadRatio)) : null;

  if (!isOpen) return null;

  const handleSelectGoal = (goal: string) => {
    setUserGoal(goal);
    saveUserFSRSConfig({ userGoal: goal });
  };

  // Nhờ AI viết lời khuyên chi tiết (con số đề xuất vẫn dựa trên quy tắc cố định)
  const handleAskAI = async () => {
    setLoading(true);
    const requestGoal = userGoal;
    const requestTarget = baselineRetention;
    try {
      const response = await fetch('/api/ai/optimize-fsrs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rhythmInput),
      });
      const resJson = await response.json();
      if (!response.ok || !resJson.success || !resJson.data) {
        throw new Error(resJson.error || 'Failed to optimize');
      }
      const result: FSRSOptimizerResult = resJson.data;
      setAIAdvice({ goal: requestGoal, targetRetention: requestTarget, result });
      saveUserFSRSConfig({
        userGoal: requestGoal,
        lastOptimizedAt: new Date().toISOString(),
        lastOptimizationResult: result,
      });
      onShowToast('✨ Trợ lý AI đã gửi lời khuyên cho bạn!');
    } catch {
      onShowToast('Không kết nối được trợ lý AI — đề xuất trên máy vẫn dùng được bình thường.');
    } finally {
      setLoading(false);
    }
  };

  // Áp dụng mức ghi nhớ được đề xuất cho toàn bộ lịch ôn
  const handleApplyRecommended = () => {
    updateFSRSSettings({ targetRetention: recommended });
    saveUserFSRSConfig({
      userGoal,
      lastOptimizedAt: new Date().toISOString(),
      lastOptimizationResult: {
        is_eligible_for_optimization: localRec.is_eligible_for_optimization,
        recommended_target_retention: recommended,
        status_code: statusCode,
        user_message: message,
      },
    });
    onTargetRetentionChanged?.(recommended);
    onShowToast(`🎯 Đã áp dụng mức nhớ ${recommendedPct}% vào lịch ôn tập hàng ngày!`);
  };

  const progressPercent = Math.min(100, Math.round((stats.total_reviews / RHYTHM_ELIGIBLE_REVIEWS) * 100));
  const hasRetentionData = stats.measured_reviews > 0 || stats.total_reviews > 0;
  const retentionReliable = stats.measured_reviews >= RHYTHM_MIN_MEASURED_REVIEWS;

  const statusLabel =
    statusCode === 'COLD_START' ? 'Mức an toàn' : statusCode === 'OPTIMIZED' ? 'Đang rất vừa vặn' : 'Nên điều chỉnh';

  return createPortal(
    <div
      id="modal-fsrs-optimizer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fsrs-optimizer-title"
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden m-auto flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[88vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 text-white relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3 pr-10">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner shrink-0">
              <Brain size={26} className="animate-pulse" />
            </div>
            <div>
              <h2 id="fsrs-optimizer-title" className="text-lg sm:text-xl font-black tracking-tight">
                Trợ Lý Đo Nhịp Trí Nhớ Của Bạn
              </h2>
              <p className="text-xs text-emerald-100 mt-0.5 max-w-md">
                Giống như bác sĩ đo nhịp tim, trợ lý xem bạn thực sự nhớ được bao nhiêu để chọn lịch ôn vừa vặn nhất cho riêng bạn.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 min-h-0 p-5 sm:p-6 space-y-5 overflow-y-auto overscroll-contain text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
          {/* Bước 1: Nhịp nhớ hiện tại */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm flex items-center gap-1.5">
                <Smile size={16} className="text-emerald-500" />
                1. Nhịp nhớ hiện tại của bạn
              </span>
              {stats.isEligible ? (
                <span className="flex items-center gap-1 text-[11px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-800">
                  <CheckCircle2 size={13} />
                  Đã hiểu rõ ({stats.total_reviews.toLocaleString('vi-VN')} lượt)
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-800">
                  <Clock size={13} />
                  Đang tìm hiểu ({stats.total_reviews}/{RHYTHM_ELIGIBLE_REVIEWS.toLocaleString('vi-VN')} lượt)
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    stats.isEligible ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-400 to-emerald-500'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {stats.isEligible
                  ? 'Bạn đã ôn hơn 1.000 lượt — đủ để trợ lý hiểu rõ tốc độ nhớ và đề xuất chính xác cho riêng bạn.'
                  : `Còn ${Math.max(0, RHYTHM_ELIGIBLE_REVIEWS - stats.total_reviews).toLocaleString('vi-VN')} lượt ôn nữa để trợ lý hiểu rõ nhịp nhớ của bạn. Trong lúc đó, đề xuất dưới đây dùng mức an toàn theo mục tiêu học.`}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400">Bạn thực sự nhớ</span>
                <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {hasRetentionData ? `${stats.actual_retention}%` : '—'}
                </div>
                <span className="text-[10px] text-slate-500">
                  {stats.measured_reviews > 0 ? `qua ${stats.measured_reviews} lượt ôn lại` : 'chưa có lượt ôn lại'}
                </span>
              </div>

              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400">Mục tiêu hiện tại</span>
                <div className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {targetRetention}%
                </div>
                <span className="text-[10px] text-slate-500">mức ghi nhớ</span>
              </div>

              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400">Mỗi ngày ôn</span>
                <div className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5">
                  {stats.daily_cards > 0 ? stats.daily_cards : '—'}
                </div>
                <span className="text-[10px] text-slate-500">thẻ (30 ngày qua)</span>
              </div>

              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400">Tổng lượt ôn</span>
                <div className="text-base sm:text-lg font-black text-teal-600 dark:text-teal-400 mt-0.5">
                  {stats.total_reviews.toLocaleString('vi-VN')}
                </div>
                <span className="text-[10px] text-slate-500">{stats.activeLogsCount.toLocaleString('vi-VN')} lượt có lịch sử</span>
              </div>
            </div>

            {stats.measured_reviews > 0 && !retentionReliable && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Tỷ lệ nhớ sẽ chính xác hơn khi có từ {RHYTHM_MIN_MEASURED_REVIEWS} lượt ôn lại trở lên.
              </p>
            )}
          </div>

          {/* Bước 2: Chọn mục tiêu học */}
          <div className="space-y-2">
            <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-xs sm:text-sm">
              <Target size={16} className="text-indigo-500" />
              2. Bạn muốn học theo phong cách nào?
            </span>
            <div className="grid grid-cols-1 gap-2" role="radiogroup" aria-label="Mục tiêu học tập">
              {EASY_GOAL_OPTIONS.map((goal) => {
                const isSelected = userGoal === goal.id;
                return (
                  <button
                    key={goal.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => handleSelectGoal(goal.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-slate-900 dark:text-slate-100 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{goal.label}</span>
                      {isSelected && <Check size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{goal.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Đề xuất (cập nhật ngay khi đổi mục tiêu) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-emerald-50/60 to-white dark:from-slate-800/90 dark:via-indigo-950/40 dark:to-slate-800 border-2 border-indigo-300 dark:border-indigo-800/80 shadow-md space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-600 text-white">
                  <Sparkles size={16} />
                </div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">Đề xuất cho bạn</h4>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                {statusLabel}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-indigo-200 dark:border-indigo-900">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Mức ghi nhớ khuyên dùng</span>
                <div className="text-xl sm:text-2xl font-black text-indigo-700 dark:text-indigo-400">{recommendedPct}%</div>
                <span className="text-[11px] text-slate-500">Trước đó: {baselineRetention}%</span>
              </div>
              <div className="p-3 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-indigo-200 dark:border-indigo-900">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Khối lượng ôn dự kiến</span>
                <div
                  className={`text-xl sm:text-2xl font-black flex items-center gap-1 ${
                    workloadDelta < 0 ? 'text-emerald-600 dark:text-emerald-400' : workloadDelta > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {workloadDelta < 0 ? <TrendingDown size={20} /> : workloadDelta > 0 ? <TrendingUp size={20} /> : null}
                  {workloadDelta === 0 ? 'Giữ nguyên' : `${workloadDelta > 0 ? '+' : ''}${workloadDelta}%`}
                </div>
                <span className="text-[11px] text-slate-500">
                  {projectedDaily !== null ? `~${projectedDaily} thẻ/ngày (hiện ~${stats.daily_cards})` : 'so với mức hiện tại'}
                </span>
              </div>
            </div>

            <div className="p-3 bg-indigo-100/50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200/60 dark:border-indigo-900/60 text-xs text-indigo-950 dark:text-indigo-200 leading-relaxed font-medium">
              {activeAdvice && (
                <span className="inline-flex items-center gap-1 mr-1 text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-300">
                  <Sparkles size={11} /> AI:
                </span>
              )}
              {message}
            </div>

            <ul className="space-y-1">
              {localRec.reasons.map((reason) => (
                <li key={reason} className="flex items-start gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                  <Lightbulb size={12} className="text-amber-500 mt-0.5 shrink-0" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleApplyRecommended}
                disabled={applied}
                className={`py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:cursor-default ${
                  applied ? 'bg-emerald-600 text-white shadow-xs' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
                }`}
              >
                {applied ? (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Đang dùng mức {recommendedPct}%</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Áp dụng mức {recommendedPct}%</span>
                  </>
                )}
              </button>
              <button
                type="button"
                disabled={loading || !!activeAdvice}
                onClick={handleAskAI}
                className="py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer border border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 bg-white/70 dark:bg-slate-900/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 disabled:opacity-60 disabled:cursor-default"
              >
                {loading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>AI đang phân tích...</span>
                  </>
                ) : activeAdvice ? (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Đã có lời khuyên từ AI</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Nhờ AI giải thích thêm</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Cài đặt thuật toán FSRS: retention, khoảng cách tối đa, bước học, tham số riêng */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <FSRSSettingsPanel
              targetRetention={targetRetention}
              onTargetRetentionChange={setTargetRetention}
              reviewLogs={reviewLogs}
              onShowToast={onShowToast}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
