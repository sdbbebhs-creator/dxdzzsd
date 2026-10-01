import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  Award,
  TrendingUp,
  Calendar,
  Brain,
  ShieldCheck,
  ShieldAlert,
  Shield,
  Zap,
  Layers,
  BarChart3,
  Check,
  Filter,
  Sparkles,
  Cpu,
} from 'lucide-react';
import { VocabItem, GrammarItem, UserRankData } from '../types';
import { getTodayDate, addDays, formatDate } from '../utils/fsrs';
import { getMemoryLogsStats, getUserFSRSConfig } from '../utils/storage';
import { getRankTierByKey, getNextRankTier, getRankProgress } from '../utils/rankSystem';
import { RankEmblem } from './RankEmblem';

interface StatsTabProps {
  vocabList: VocabItem[];
  grammarList: GrammarItem[];
  streakCount: number;
  onOpenOptimizer?: () => void;
  rankData?: UserRankData;
  onOpenRankModal?: () => void;
}

type ScopeType = 'all' | 'vocab' | 'grammar';
type PeriodType = 'thisWeek' | 'last7Days' | 'next7Days';

export const StatsTab: React.FC<StatsTabProps> = ({
  vocabList,
  grammarList,
  streakCount,
  onOpenOptimizer,
  rankData,
  onOpenRankModal,
}) => {
  const memoryStats = useMemo(() => getMemoryLogsStats(vocabList, grammarList), [vocabList, grammarList]);
  const userConfig = useMemo(() => getUserFSRSConfig(), []);
  const today = getTodayDate();
  const [selectedScope, setSelectedScope] = useState<ScopeType>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('thisWeek');

  const currentTier = rankData ? getRankTierByKey(rankData.tierKey) : null;
  const nextTier = rankData ? getNextRankTier(rankData.tierKey) : null;
  // Promotion needs streak, EXP and active days at once, so show the weakest requirement
  const rankProgressPercent = rankData ? getRankProgress(rankData).percent : 0;

  // Overall counts
  const totalVocab = vocabList.length;
  const totalGrammar = grammarList.length;
  const allItems = [...vocabList, ...grammarList];
  const totalAll = totalVocab + totalGrammar;

  // Due today
  const dueVocabToday = vocabList.filter((v) => v.reviewDate === today).length;
  const dueGrammarToday = grammarList.filter((g) => g.reviewDate === today).length;
  const dueToday = dueVocabToday + dueGrammarToday;

  // Overdue
  const overdueVocab = vocabList.filter((v) => v.reviewDate < today).length;
  const overdueGrammar = grammarList.filter((g) => g.reviewDate < today).length;
  const overdueTotal = overdueVocab + overdueGrammar;

  // FSRS Stability & Difficulty averages
  const avgStability = allItems.length > 0
    ? (allItems.reduce((sum, item) => sum + (item.stability || item.interval || 1), 0) / allItems.length).toFixed(1)
    : '1.0';

  const avgDifficulty = allItems.length > 0
    ? (allItems.reduce((sum, item) => sum + (item.difficulty || 5), 0) / allItems.length).toFixed(1)
    : '5.0';

  // FSRS States
  const newCardsCount = allItems.filter((item) => (item.state ?? 0) === 0).length;
  const learningCardsCount = allItems.filter((item) => item.state === 1).length;
  const reviewCardsCount = allItems.filter((item) => item.state === 2).length;
  const relearningCardsCount = allItems.filter((item) => item.state === 3).length;

  // 5-Context Output Mastery Gate statistics for both Vocab and Grammar
  const vocabMasteredOutput = vocabList.filter((v) => (v.completedContextsCount ?? 0) >= 5).length;
  const vocabInProgressOutput = vocabList.filter(
    (v) => (v.completedContextsCount ?? 0) > 0 && (v.completedContextsCount ?? 0) < 5
  ).length;
  const vocabNotStartedOutput = vocabList.filter((v) => (v.completedContextsCount ?? 0) === 0).length;

  const grammarMasteredOutput = grammarList.filter((g) => (g.completedContextsCount ?? 0) >= 5).length;
  const grammarInProgressOutput = grammarList.filter(
    (g) => (g.completedContextsCount ?? 0) > 0 && (g.completedContextsCount ?? 0) < 5
  ).length;
  const grammarNotStartedOutput = grammarList.filter((g) => (g.completedContextsCount ?? 0) === 0).length;

  const totalMasteredOutput = vocabMasteredOutput + grammarMasteredOutput;
  const totalItemsCount = totalVocab + totalGrammar;
  const outputMasteryRate = totalItemsCount > 0 ? Math.round((totalMasteredOutput / totalItemsCount) * 100) : 0;

  // Helper to get Monday of the current week (YYYY-MM-DD)
  const getMondayOfCurrentWeek = (baseDateStr: string): string => {
    const parts = baseDateStr.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const day = d.getDay(); // 0 is Sunday, 1 is Monday...
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(parts[0], parts[1] - 1, diff);
    return formatDate(monday);
  };

  // Recharts Chart Dataset Generation
  const chartData = useMemo(() => {
    let dateStrings: string[] = [];

    if (selectedPeriod === 'thisWeek') {
      // Monday to Sunday of the current week
      const monday = getMondayOfCurrentWeek(today);
      dateStrings = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
    } else if (selectedPeriod === 'last7Days') {
      // Rolling last 7 days ending today
      dateStrings = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
    } else {
      // Next 7 days starting from today (Forecast)
      dateStrings = Array.from({ length: 7 }, (_, i) => addDays(today, i));
    }

    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    return dateStrings.map((dStr) => {
      const parts = dStr.split('-').map(Number);
      const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
      const dayIndex = dateObj.getDay();
      const dayName = dayNames[dayIndex];
      const isToday = dStr === today;

      const dayLabel = isToday
        ? `Hôm nay (${dateObj.getDate()}/${dateObj.getMonth() + 1})`
        : `${dayName} (${dateObj.getDate()}/${dateObj.getMonth() + 1})`;

      // Vocab Due on this day
      const dueVocab = isToday
        ? vocabList.filter((v) => v.reviewDate <= today).length
        : vocabList.filter((v) => v.reviewDate === dStr).length;

      // Grammar Due on this day
      const dueGrammar = isToday
        ? grammarList.filter((g) => g.reviewDate <= today).length
        : grammarList.filter((g) => g.reviewDate === dStr).length;

      // Vocab Completed: Output 5/5 completed or reviewed on this day
      const completedVocab = vocabList.filter((v) => {
        if (v.lastOutputDate === dStr && (v.completedContextsCount ?? 0) >= 5) return true;
        if (v.last_review && v.last_review.startsWith(dStr)) return true;
        if (isToday && (v.completedContextsCount ?? 0) >= 5 && (!v.lastOutputDate || v.lastOutputDate === today)) return true;
        return false;
      }).length;

      // Grammar Completed: Output 5/5 completed or reviewed on this day
      const completedGrammar = grammarList.filter((g) => {
        if (g.lastOutputDate === dStr && (g.completedContextsCount ?? 0) >= 5) return true;
        if (g.last_review && g.last_review.startsWith(dStr)) return true;
        if (isToday && (g.completedContextsCount ?? 0) >= 5 && (!g.lastOutputDate || g.lastOutputDate === today)) return true;
        return false;
      }).length;

      // Determine values according to selectedScope
      let displayCompleted = 0;
      let displayDue = 0;

      if (selectedScope === 'vocab') {
        displayCompleted = completedVocab;
        displayDue = dueVocab;
      } else if (selectedScope === 'grammar') {
        displayCompleted = completedGrammar;
        displayDue = dueGrammar;
      } else {
        displayCompleted = completedVocab + completedGrammar;
        displayDue = dueVocab + dueGrammar;
      }

      return {
        date: dStr,
        dayLabel,
        fullDateLabel: `${dayName}, ngày ${dateObj.getDate()} tháng ${dateObj.getMonth() + 1}`,
        isToday,
        completed: displayCompleted,
        due: displayDue,
        completedVocab,
        dueVocab,
        completedGrammar,
        dueGrammar,
      };
    });
  }, [vocabList, grammarList, selectedScope, selectedPeriod, today]);

  // Aggregate totals for the selected period
  const totalCompletedInPeriod = useMemo(
    () => chartData.reduce((sum, d) => sum + d.completed, 0),
    [chartData]
  );
  const totalDueInPeriod = useMemo(
    () => chartData.reduce((sum, d) => sum + d.due, 0),
    [chartData]
  );
  const periodCompletionRate = totalDueInPeriod > 0
    ? Math.min(100, Math.round((totalCompletedInPeriod / totalDueInPeriod) * 100))
    : totalCompletedInPeriod > 0 ? 100 : 0;

  // Custom Tooltip component for Recharts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 dark:bg-slate-950/95 text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700/80 text-xs backdrop-blur-md space-y-2 min-w-[210px] animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-700/70 pb-1.5 gap-2">
            <span className="font-bold text-slate-100">{data.fullDateLabel}</span>
            {data.isToday && (
              <span className="px-1.5 py-0.5 text-[10px] font-black uppercase rounded bg-emerald-500 text-white">
                Hôm nay
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between font-semibold">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-xs" />
                Tổng đã hoàn thành:
              </span>
              <span className="font-black text-sm text-emerald-300">{data.completed}</span>
            </div>

            <div className="flex items-center justify-between font-semibold">
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shadow-xs" />
                Từ cần ôn tập:
              </span>
              <span className="font-black text-sm text-amber-300">{data.due}</span>
            </div>
          </div>

          {selectedScope === 'all' && (
            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center justify-between">
                <span>Từ vựng:</span>
                <span className="font-medium text-slate-300">
                  {data.completedVocab} hoàn thành / {data.dueVocab} cần ôn
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Ngữ pháp:</span>
                <span className="font-medium text-slate-300">
                  {data.completedGrammar} hoàn thành / {data.dueGrammar} cần ôn
                </span>
              </div>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* 6 Top Metric Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-4">
        {/* Total Vocab */}
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1.5 sm:mb-2">
            <BookOpen size={18} />
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">Từ vựng</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">{totalVocab}</div>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">Tổng số từ đã lưu</p>
        </div>

        {/* Total Grammar */}
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 mb-1.5 sm:mb-2">
            <TrendingUp size={18} />
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">Ngữ pháp</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">{totalGrammar}</div>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">Điểm ngữ pháp</p>
        </div>

        {/* Due Today */}
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-teal-600 dark:text-teal-400 mb-1.5 sm:mb-2">
            <Clock size={18} />
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">Hôm nay</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-teal-700 dark:text-teal-400">{dueToday}</div>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">Mục cần ôn</p>
        </div>

        {/* Overdue */}
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 mb-1.5 sm:mb-2">
            <AlertTriangle size={18} />
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">Quá hạn</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-700 dark:text-rose-400">{overdueTotal}</div>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">Cần ôn bù ngay</p>
        </div>

        {/* FSRS Average Stability */}
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-1.5 sm:mb-2">
            <Brain size={18} />
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">FSRS Độ bền</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-700 dark:text-blue-400">{avgStability}d</div>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">Độ khó TB: {avgDifficulty}/10</p>
        </div>

        {/* Streak with burning flame effect (0 is unlit ember) */}
        <div
          onClick={onOpenRankModal}
          className={`relative overflow-visible p-3 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer hover:scale-105 shadow-xs ${
            streakCount === 0
              ? 'bg-slate-100/90 dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              : 'fire-streak-box bg-gradient-to-br from-amber-500/10 via-orange-500/15 to-rose-500/10 dark:from-amber-500/15 dark:via-orange-500/20 dark:to-rose-500/15 border-amber-400 dark:border-amber-500/80'
          }`}
          title={
            streakCount === 0
              ? 'Chuỗi lửa: 0 ngày (Chưa thắp lửa). Bấm để xem Rank & bắt đầu học!'
              : `Chuỗi ôn tập: ${streakCount} ngày liên tiếp (Bấm để xem Rank & Ngọn lửa!)`
          }
        >
          {streakCount > 0 && (
            <>
              <span className="spark-particle-1 absolute -top-1 left-4 w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_6px_#f59e0b] pointer-events-none" />
              <span className="spark-particle-2 absolute -top-1.5 right-6 w-1 h-1 rounded-full bg-rose-400 shadow-[0_0_5px_#ef4444] pointer-events-none" />
            </>
          )}

          <div className="flex items-center justify-between text-amber-500 dark:text-amber-400 mb-1.5 sm:mb-2">
            <Flame
              size={20}
              className={
                streakCount === 0
                  ? 'text-slate-400 dark:text-slate-500'
                  : 'flame-burning fill-amber-400 dark:fill-amber-300 text-amber-500'
              }
            />
            <span
              className={`text-[10px] uppercase font-black tracking-wider px-1.5 py-0.5 rounded-md ${
                streakCount === 0
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  : 'text-orange-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-500/20'
              }`}
            >
              {streakCount === 0 ? 'Chưa thắp lửa' : 'Rực lửa 🔥'}
            </span>
          </div>
          <div
            className={`text-xl sm:text-2xl font-black ${
              streakCount === 0
                ? 'text-slate-800 dark:text-slate-200'
                : 'text-amber-950 dark:text-amber-100 drop-shadow-[0_1px_4px_rgba(245,158,11,0.6)]'
            }`}
          >
            {streakCount}
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">
            {streakCount === 0 ? 'Thắp lửa hôm nay!' : 'Ngày liên tiếp'}
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RANK TIER & DAILY RETENTION MASTERY SECTION                               */}
      {/* ========================================================================= */}
      {rankData && currentTier && (
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-3xl shadow-sm border shrink-0"
                style={{
                  backgroundColor: `${currentTier.color}15`,
                  borderColor: `${currentTier.color}50`,
                }}
              >
                <RankEmblem tierKey={currentTier.key} size={40} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-slate-900 dark:text-slate-100 text-base sm:text-lg">
                    Hệ Thống Đẳng Cấp: Rank {currentTier.nameVi} ({currentTier.titleVi})
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${currentTier.badgeClass}`}>
                    Cấp {currentTier.level}/8
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Ôn tập mỗi ngày để không bị giáng rank, duy trì chuỗi lửa và tích lũy EXP thăng hạng.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenRankModal}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-all cursor-pointer shrink-0"
            >
              <Award size={15} className="text-amber-500" />
              <span>Lộ trình 8 Mức Rank</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* Today Protection */}
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                rankData.todayProtected
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                  : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
              }`}
            >
              <div
                className={`p-2 rounded-lg text-white shrink-0 ${
                  rankData.todayProtected ? 'bg-emerald-500' : 'bg-amber-500 animate-bounce'
                }`}
              >
                {rankData.todayProtected ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                  Trạng thái hôm nay
                </span>
                <div
                  className={`text-sm font-black ${
                    rankData.todayProtected
                      ? 'text-emerald-800 dark:text-emerald-300'
                      : 'text-amber-800 dark:text-amber-300'
                  }`}
                >
                  {rankData.todayProtected ? 'Đã giữ Rank an toàn' : 'Cần ôn tập để giữ Rank!'}
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {rankData.todayProtected
                    ? 'Chuỗi lửa tiếp tục cháy'
                    : 'Nguy cơ tụt 1 bậc nếu bỏ quên'}
                </span>
              </div>
            </div>

            {/* EXP & Next Rank */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-indigo-500 text-white shrink-0">
                <Zap size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                    Tiến độ thăng hạng
                  </span>
                  <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                    {rankData.currentExp} EXP
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  {nextTier ? `Rank tiếp: ${nextTier.nameVi} · ${rankProgressPercent}%` : 'Đạt đỉnh Thần Thoại 🏆'}
                </div>
                {nextTier && (
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full rounded-full"
                      style={{
                        width: `${rankProgressPercent}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Shields Remaining */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-teal-500 text-white shrink-0">
                <Shield size={18} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                  Khiên bảo vệ Rank
                </span>
                <div className="text-sm font-black text-teal-800 dark:text-teal-300">
                  {rankData.shieldsCount} / 3 khiên dự trữ
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Tự động cứu chuỗi khi bận rộn 1 ngày
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RECHARTS BAR CHART: TỔNG SỐ TỪ ĐÃ HOÀN THÀNH VS TỪ CẦN ÔN TRONG TUẦN       */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
        {/* Header with Title and Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
                <BarChart3 size={20} />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base sm:text-lg">
                Biểu đồ tiến độ tuần: Tổng đã hoàn thành vs Từ cần ôn
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              So sánh số lượng thẻ đã hoàn thành output 5 ngữ cảnh / ôn tập xong với số thẻ đến hạn trong tuần theo thuật toán FSRS.
            </p>
          </div>

          {/* Interactive Filters: Scope (All / Vocab / Grammar) & Period */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Scope Filter */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs font-bold">
              <button
                type="button"
                onClick={() => setSelectedScope('all')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  selectedScope === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Tất cả ({totalAll})
              </button>
              <button
                type="button"
                onClick={() => setSelectedScope('vocab')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  selectedScope === 'vocab'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Từ vựng ({totalVocab})
              </button>
              <button
                type="button"
                onClick={() => setSelectedScope('grammar')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  selectedScope === 'grammar'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Ngữ pháp ({totalGrammar})
              </button>
            </div>

            {/* Period Filter */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs font-bold">
              <button
                type="button"
                onClick={() => setSelectedPeriod('thisWeek')}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  selectedPeriod === 'thisWeek'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Tuần này (T2-CN)
              </button>
              <button
                type="button"
                onClick={() => setSelectedPeriod('last7Days')}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  selectedPeriod === 'last7Days'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                7 ngày gần nhất
              </button>
              <button
                type="button"
                onClick={() => setSelectedPeriod('next7Days')}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  selectedPeriod === 'next7Days'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                7 ngày tới (FSRS)
              </button>
            </div>
          </div>
        </div>

        {/* Quick Summary Pill Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-xl border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                Tổng đã hoàn thành
              </span>
              <div className="text-xl font-black text-emerald-900 dark:text-emerald-100 mt-0.5">
                {totalCompletedInPeriod} <span className="text-xs font-semibold">thẻ</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={20} />
            </div>
          </div>

          <div className="p-3 bg-amber-50/70 dark:bg-amber-950/40 rounded-xl border border-amber-200/60 dark:border-amber-800/60 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                Tổng từ cần ôn
              </span>
              <div className="text-xl font-black text-amber-900 dark:text-amber-100 mt-0.5">
                {totalDueInPeriod} <span className="text-xs font-semibold">thẻ</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Clock size={20} />
            </div>
          </div>

          <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-200/60 dark:border-blue-800/60 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">
                Tỷ lệ hoàn thành tuần
              </span>
              <div className="text-xl font-black text-blue-900 dark:text-blue-100 mt-0.5">
                {periodCompletionRate}%
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Award size={20} />
            </div>
          </div>
        </div>

        {/* Recharts BarChart Canvas */}
        <div className="w-full h-72 sm:h-80 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 15, right: 15, left: -15, bottom: 25 }}
              barGap={6}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#94a3b8"
                opacity={0.2}
              />
              <XAxis
                dataKey="dayLabel"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={{ stroke: '#cbd5e1', opacity: 0.5 }}
                tickLine={false}
                dy={10}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                dx={-5}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '16px', fontSize: '12px', fontWeight: 'bold' }}
                iconType="circle"
              />
              {/* Bar 1: Total Completed (Emerald) */}
              <Bar
                name="Tổng đã hoàn thành"
                dataKey="completed"
                fill="#10b981"
                radius={[6, 6, 0, 0]}
                maxBarSize={38}
              />
              {/* Bar 2: Due to Review (Amber) */}
              <Bar
                name="Từ cần ôn"
                dataKey="due"
                fill="#f59e0b"
                radius={[6, 6, 0, 0]}
                maxBarSize={38}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5-CONTEXT OUTPUT MASTERY BREAKDOWN: VOCABULARY & GRAMMAR                  */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-500 border border-amber-200/60 dark:border-amber-800/60">
              <Zap size={18} className="fill-amber-400" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
              Tiến độ chuẩn hóa Output 5 Ngữ Cảnh (Vocab & Grammar)
            </h3>
          </div>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-200/60 dark:border-emerald-800/60">
            Tổng đạt chuẩn: {totalMasteredOutput}/{totalItemsCount} ({outputMasteryRate}%)
          </span>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Theo cơ chế bảo vệ chất lượng ghi nhớ, mỗi thẻ <strong>Từ vựng</strong> hoặc điểm <strong>Ngữ pháp</strong> bắt buộc phải trải qua 5 ngữ cảnh thực tế (Hội thoại, Công việc, Học thuật, Công nghệ, Thành ngữ/Ứng dụng đời sống) để mở khóa đánh giá FSRS.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Vocabulary 5-Context Card */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm flex items-center gap-1.5">
                <BookOpen size={16} className="text-emerald-500" />
                Từ vựng ({totalVocab})
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {vocabMasteredOutput}/{totalVocab} ({totalVocab > 0 ? Math.round((vocabMasteredOutput / totalVocab) * 100) : 0}%)
              </span>
            </div>

            {/* Segmented Progress Bar */}
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full transition-all"
                style={{ width: `${totalVocab > 0 ? (vocabMasteredOutput / totalVocab) * 100 : 0}%` }}
                title={`Đạt chuẩn 5/5: ${vocabMasteredOutput}`}
              />
              <div
                className="bg-amber-400 h-full transition-all"
                style={{ width: `${totalVocab > 0 ? (vocabInProgressOutput / totalVocab) * 100 : 0}%` }}
                title={`Đang rèn luyện (1-4/5): ${vocabInProgressOutput}`}
              />
              <div
                className="bg-slate-300 dark:bg-slate-600 h-full transition-all"
                style={{ width: `${totalVocab > 0 ? (vocabNotStartedOutput / totalVocab) * 100 : 0}%` }}
                title={`Chưa làm (0/5): ${vocabNotStartedOutput}`}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-1 text-[11px]">
              <div className="p-2 rounded-lg bg-emerald-100/60 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">
                <span className="font-black text-sm block">{vocabMasteredOutput}</span>
                <span>Đủ 5/5 ngữ cảnh</span>
              </div>
              <div className="p-2 rounded-lg bg-amber-100/60 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300">
                <span className="font-black text-sm block">{vocabInProgressOutput}</span>
                <span>Đang rèn (1-4)</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-200/60 dark:bg-slate-700/40 text-slate-600 dark:text-slate-400">
                <span className="font-black text-sm block">{vocabNotStartedOutput}</span>
                <span>Chưa bắt đầu</span>
              </div>
            </div>
          </div>

          {/* Grammar 5-Context Card */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm flex items-center gap-1.5">
                <TrendingUp size={16} className="text-indigo-500" />
                Ngữ pháp ({totalGrammar})
              </span>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {grammarMasteredOutput}/{totalGrammar} ({totalGrammar > 0 ? Math.round((grammarMasteredOutput / totalGrammar) * 100) : 0}%)
              </span>
            </div>

            {/* Segmented Progress Bar */}
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full transition-all"
                style={{ width: `${totalGrammar > 0 ? (grammarMasteredOutput / totalGrammar) * 100 : 0}%` }}
                title={`Đạt chuẩn 5/5: ${grammarMasteredOutput}`}
              />
              <div
                className="bg-amber-400 h-full transition-all"
                style={{ width: `${totalGrammar > 0 ? (grammarInProgressOutput / totalGrammar) * 100 : 0}%` }}
                title={`Đang rèn luyện (1-4/5): ${grammarInProgressOutput}`}
              />
              <div
                className="bg-slate-300 dark:bg-slate-600 h-full transition-all"
                style={{ width: `${totalGrammar > 0 ? (grammarNotStartedOutput / totalGrammar) * 100 : 0}%` }}
                title={`Chưa làm (0/5): ${grammarNotStartedOutput}`}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-1 text-[11px]">
              <div className="p-2 rounded-lg bg-emerald-100/60 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">
                <span className="font-black text-sm block">{grammarMasteredOutput}</span>
                <span>Đủ 5/5 ngữ cảnh</span>
              </div>
              <div className="p-2 rounded-lg bg-amber-100/60 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300">
                <span className="font-black text-sm block">{grammarInProgressOutput}</span>
                <span>Đang rèn (1-4)</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-200/60 dark:bg-slate-700/40 text-slate-600 dark:text-slate-400">
                <span className="font-black text-sm block">{grammarNotStartedOutput}</span>
                <span>Chưa bắt đầu</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ANKI FSRS AI MEMORY OPTIMIZER BANNER                                      */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-br from-indigo-50/90 via-emerald-50/50 to-white dark:from-slate-900 dark:via-indigo-950/30 dark:to-slate-900 p-5 sm:p-6 rounded-2xl border-2 border-indigo-200/80 dark:border-indigo-900/60 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/25 shrink-0">
              <Brain size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-slate-900 dark:text-slate-100 text-base">
                  Trợ lý Tối ưu Ghi nhớ FSRS (AI Optimizer)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Anki FSRS Nguyên Gốc
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Phân tích Memory Logs để tính toán tốc độ quên thực tế của não bộ, cá nhân hóa mục tiêu ghi nhớ và độ giãn cách ôn tập.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenOptimizer}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-700 hover:to-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer shrink-0"
          >
            <Sparkles size={16} />
            <span>Tối ưu hóa FSRS với AI</span>
          </button>
        </div>

        {/* Quick FSRS Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-3 bg-white/80 dark:bg-slate-800/80 rounded-xl border border-slate-200/70 dark:border-slate-700/70">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lượt ôn thực tế</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-black text-slate-900 dark:text-slate-100">{memoryStats.total_reviews}</span>
              <span className="text-xs text-slate-400">/ 1.000</span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium">
              {memoryStats.isEligible ? 'Đủ điều kiện cá nhân hóa' : 'Giai đoạn Cold Start'}
            </span>
          </div>

          <div className="p-3 bg-white/80 dark:bg-slate-800/80 rounded-xl border border-slate-200/70 dark:border-slate-700/70">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tỷ lệ nhớ thực tế</span>
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {memoryStats.measured_reviews > 0 || memoryStats.total_reviews > 0 ? `${memoryStats.actual_retention}%` : '—'}
            </div>
            <span className="text-[10px] text-slate-500 font-medium">Khả năng thu hồi (Recall)</span>
          </div>

          <div className="p-3 bg-white/80 dark:bg-slate-800/80 rounded-xl border border-slate-200/70 dark:border-slate-700/70">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mục tiêu FSRS</span>
            <div className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
              {memoryStats.target_retention}%
            </div>
            <span className="text-[10px] text-slate-500 font-medium">Target Retention</span>
          </div>

          <div className="p-3 bg-white/80 dark:bg-slate-800/80 rounded-xl border border-slate-200/70 dark:border-slate-700/70">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mục tiêu hiện tại</span>
            <div className="text-xs font-black text-slate-800 dark:text-slate-200 mt-1 line-clamp-1">
              {memoryStats.user_goal}
            </div>
            <span className="text-[10px] text-slate-500 font-medium">~{memoryStats.daily_cards} thẻ/ngày</span>
          </div>
        </div>

        {userConfig.lastOptimizationResult && (
          <div className="p-3 bg-white/90 dark:bg-slate-800/90 rounded-xl border border-indigo-200/70 dark:border-indigo-900/70 flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
            <Sparkles size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-slate-900 dark:text-slate-100">
                Khuyến nghị AI gần nhất:
              </span>
              <p className="italic text-slate-600 dark:text-slate-300 font-normal">
                "{userConfig.lastOptimizationResult.user_message}"
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* FSRS STATE BREAKDOWN & ALGORITHM GUIDE                                    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* FSRS States Distribution */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1.5">
              <Brain size={16} className="text-emerald-500" />
              Phân loại trạng thái FSRS
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {totalAll} mục tổng
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 mb-1">
                <span className="text-xs font-semibold">Mới (New)</span>
                <span className="text-xs font-bold">{newCardsCount}</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-slate-400 h-full rounded-full"
                  style={{ width: `${totalAll > 0 ? (newCardsCount / totalAll) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
              <div className="flex items-center justify-between text-amber-900 dark:text-amber-300 mb-1">
                <span className="text-xs font-semibold">Đang học (Learning)</span>
                <span className="text-xs font-bold">{learningCardsCount}</span>
              </div>
              <div className="w-full bg-amber-200 dark:bg-amber-900/50 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full"
                  style={{ width: `${totalAll > 0 ? (learningCardsCount / totalAll) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50">
              <div className="flex items-center justify-between text-emerald-900 dark:text-emerald-300 mb-1">
                <span className="text-xs font-semibold">Ôn tập (Review)</span>
                <span className="text-xs font-bold">{reviewCardsCount}</span>
              </div>
              <div className="w-full bg-emerald-200 dark:bg-emerald-900/50 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: `${totalAll > 0 ? (reviewCardsCount / totalAll) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50">
              <div className="flex items-center justify-between text-rose-900 dark:text-rose-300 mb-1">
                <span className="text-xs font-semibold">Học lại (Relearning)</span>
                <span className="text-xs font-bold">{relearningCardsCount}</span>
              </div>
              <div className="w-full bg-rose-200 dark:bg-rose-900/50 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-rose-500 h-full rounded-full"
                  style={{ width: `${totalAll > 0 ? (relearningCardsCount / totalAll) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Algorithm Tip */}
        <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 space-y-2.5 text-xs leading-relaxed text-emerald-950 dark:text-emerald-200">
          <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300 text-sm">
            <ShieldCheck size={18} />
            <span>Thuật toán lặp lại ngắt quãng hiện đại FSRS</span>
          </div>
          <p>
            Ứng dụng sử dụng thuật toán <strong>FSRS (Free Spaced Repetition Scheduler)</strong> thế hệ mới nhất kết hợp chuẩn hóa <strong>Output 5 Ngữ Cảnh</strong>:
          </p>
          <ul className="list-disc pl-4 space-y-1 text-slate-700 dark:text-slate-300">
            <li><strong>Độ bền ghi nhớ (Stability - S):</strong> Thời gian tính bằng ngày mà xác suất bạn nhớ từ đạt ít nhất 90%.</li>
            <li><strong>Độ khó nội dung (Difficulty - D):</strong> Thang điểm 1-10 đo lường độ thử thách đối với não bộ của bạn.</li>
            <li><strong>Cổng chuẩn hóa 5 ngữ cảnh (Output Gate):</strong> Bắt buộc áp dụng cho cả Từ vựng và Ngữ pháp để chống học vẹt.</li>
          </ul>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
            Chỉ cần 5–10 phút ôn tập và output mỗi ngày để khắc sâu trí nhớ dài hạn!
          </p>
        </div>
      </div>
    </div>
  );
};
