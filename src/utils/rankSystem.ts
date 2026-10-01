import { RankDivision, RankTierDefinition, RankTierKey, UserRankData, ReviewRating } from '../types';
import { addDays, diffDays, getTodayDate } from './fsrs';
import { notifyLocalChange } from './localChanges';

export const RANK_TIERS: RankTierDefinition[] = [
  {
    key: 'wood',
    level: 1,
    nameVi: 'Sơ Khởi',
    nameEn: 'Initiate',
    titleVi: 'Đặt nền móng trí nhớ',
    minStreak: 0,
    minExp: 0,
    minActiveDays: 0,
    color: '#78716c',
    bgGradient: 'from-stone-500/15 via-stone-400/5 to-transparent',
    borderColor: 'border-stone-300 dark:border-stone-700',
    textColor: 'text-stone-700 dark:text-stone-300',
    badgeClass: 'bg-stone-100 dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-300 dark:border-stone-700',
    perks: ['Điểm khởi đầu của mọi người học', 'Tặng 1 Khiên bảo vệ tân thủ'],
  },
  {
    key: 'bronze',
    level: 2,
    nameVi: 'Học Giả',
    nameEn: 'Scholar',
    titleVi: 'Kỷ luật hình thành',
    minStreak: 7,
    minExp: 2000,
    minActiveDays: 7,
    color: '#c2733b',
    bgGradient: 'from-orange-700/15 via-amber-600/10 to-transparent',
    borderColor: 'border-orange-300/70 dark:border-orange-800/70',
    textColor: 'text-orange-800 dark:text-orange-300',
    badgeClass: 'bg-orange-50 dark:bg-orange-950/60 text-orange-800 dark:text-orange-200 border-orange-300 dark:border-orange-800',
    perks: ['Một tuần ôn tập không gián đoạn', 'Huy hiệu Học Giả bằng đồng'],
  },
  {
    key: 'silver',
    level: 3,
    nameVi: 'Tinh Thông',
    nameEn: 'Adept',
    titleVi: 'Phản xạ ổn định',
    minStreak: 14,
    minExp: 6000,
    minActiveDays: 20,
    color: '#94a3b8',
    bgGradient: 'from-slate-400/20 via-slate-300/10 to-transparent',
    borderColor: 'border-slate-300 dark:border-slate-600',
    textColor: 'text-slate-700 dark:text-slate-200',
    badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-100 border-slate-300 dark:border-slate-600',
    perks: ['Hai tuần duy trì nhịp ôn đều đặn', 'Huy hiệu bạc có cánh'],
  },
  {
    key: 'gold',
    level: 4,
    nameVi: 'Chuyên Gia',
    nameEn: 'Expert',
    titleVi: 'Làm chủ nền tảng',
    minStreak: 30,
    minExp: 15000,
    minActiveDays: 45,
    color: '#eab308',
    bgGradient: 'from-yellow-500/20 via-amber-400/10 to-transparent',
    borderColor: 'border-yellow-300 dark:border-yellow-700/80',
    textColor: 'text-yellow-800 dark:text-yellow-300',
    badgeClass: 'bg-yellow-50 dark:bg-yellow-950/60 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700',
    perks: ['Một tháng liên tục không bỏ ngày nào', 'Mốc nhận Khiên bảo vệ đầu tiên (30 ngày)'],
  },
  {
    key: 'platinum',
    level: 5,
    nameVi: 'Bác Học',
    nameEn: 'Savant',
    titleVi: 'Trí nhớ dài hạn',
    minStreak: 60,
    minExp: 35000,
    minActiveDays: 90,
    color: '#14b8a6',
    bgGradient: 'from-teal-500/20 via-cyan-400/10 to-transparent',
    borderColor: 'border-teal-300 dark:border-teal-700/80',
    textColor: 'text-teal-800 dark:text-teal-300',
    badgeClass: 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 border-teal-300 dark:border-teal-700',
    perks: ['Hai tháng kỷ luật, 90 ngày hoàn thành lịch ôn', 'Huy hiệu bạch kim với vòng nguyệt quế'],
  },
  {
    key: 'diamond',
    level: 6,
    nameVi: 'Đại Sư',
    nameEn: 'Master',
    titleVi: 'Bậc thầy ngôn ngữ',
    minStreak: 100,
    minExp: 70000,
    minActiveDays: 150,
    color: '#3b82f6',
    bgGradient: 'from-blue-500/20 via-sky-400/10 to-transparent',
    borderColor: 'border-blue-300 dark:border-blue-700/80',
    textColor: 'text-blue-800 dark:text-blue-300',
    badgeClass: 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700',
    perks: ['100 ngày chuỗi liên tục', 'Huy hiệu kim cương đa giác'],
  },
  {
    key: 'master',
    level: 7,
    nameVi: 'Tông Sư',
    nameEn: 'Grandmaster',
    titleVi: 'Uy quyền tri thức',
    minStreak: 180,
    minExp: 130000,
    minActiveDays: 250,
    color: '#e11d48',
    bgGradient: 'from-rose-600/20 via-rose-400/10 to-transparent',
    borderColor: 'border-rose-300 dark:border-rose-800/80',
    textColor: 'text-rose-800 dark:text-rose-300',
    badgeClass: 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-800',
    perks: ['Nửa năm không ngắt chuỗi', 'Huy hiệu hồng ngọc đội vương miện'],
  },
  {
    key: 'challenger',
    level: 8,
    nameVi: 'Huyền Thoại',
    nameEn: 'Legend',
    titleVi: 'Vượt thời gian',
    minStreak: 365,
    minExp: 250000,
    minActiveDays: 365,
    color: '#f59e0b',
    bgGradient: 'from-amber-400/25 via-violet-500/15 to-transparent',
    borderColor: 'border-amber-300 dark:border-amber-600/80',
    textColor: 'text-amber-800 dark:text-amber-200',
    badgeClass: 'bg-gradient-to-r from-amber-100 to-violet-100 dark:from-amber-950/70 dark:to-violet-950/70 text-amber-900 dark:text-amber-100 border-amber-300 dark:border-amber-600',
    perks: ['Một năm trọn vẹn, 365 ngày chuỗi liên tục', 'Huy hiệu Huyền Thoại hào quang vĩnh viễn'],
  },
];

/** Streak milestones that award a bonus Rank Shield (max 3). */
export const SHIELD_STREAK_MILESTONES = [30, 60, 100, 180, 365];

const STORAGE_KEY = 'user_rank_data_v1';
const RANK_VERSION = 2;

export function getRankTierByKey(key: RankTierKey): RankTierDefinition {
  const found = RANK_TIERS.find((t) => t.key === key);
  return found || RANK_TIERS[0];
}

export function getNextRankTier(key: RankTierKey): RankTierDefinition | null {
  const idx = RANK_TIERS.findIndex((t) => t.key === key);
  if (idx >= 0 && idx < RANK_TIERS.length - 1) {
    return RANK_TIERS[idx + 1];
  }
  return null;
}

function meetsTier(tier: RankTierDefinition, streak: number, exp: number, activeDays: number): boolean {
  return streak >= tier.minStreak && exp >= tier.minExp && activeDays >= tier.minActiveDays;
}

/** Highest tier whose streak, EXP and active-day requirements are ALL met. */
export function calculateTierFromProgress(streak: number, exp: number, activeDays: number): RankTierKey {
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (meetsTier(RANK_TIERS[i], streak, exp, activeDays)) return RANK_TIERS[i].key;
  }
  return 'wood';
}

export interface RankRequirementProgress {
  key: 'streak' | 'exp' | 'days';
  label: string;
  unit: string;
  current: number;
  target: number;
  met: boolean;
}

/**
 * Progress toward the next tier. Overall percent is the weakest requirement,
 * since promotion needs every requirement at once.
 */
export function getRankProgress(data: UserRankData): {
  nextTier: RankTierDefinition | null;
  percent: number;
  requirements: RankRequirementProgress[];
} {
  const current = getRankTierByKey(data.tierKey);
  const next = getNextRankTier(data.tierKey);
  if (!next) return { nextTier: null, percent: 100, requirements: [] };

  const items: Array<[RankRequirementProgress['key'], string, string, number, number, number]> = [
    ['streak', 'Chuỗi ngày liên tục', 'ngày', data.streakCount, current.minStreak, next.minStreak],
    ['exp', 'EXP tích lũy', 'EXP', data.currentExp, current.minExp, next.minExp],
    ['days', 'Ngày hoàn thành lịch ôn', 'ngày', data.totalDaysProtected || 0, current.minActiveDays, next.minActiveDays],
  ];

  let weakest = 1;
  const requirements = items.map(([key, label, unit, value, base, target]) => {
    const fraction = target <= base ? 1 : Math.min(1, Math.max(0, (value - base) / (target - base)));
    weakest = Math.min(weakest, fraction);
    return { key, label, unit, current: value, target, met: value >= target };
  });

  return { nextTier: next, percent: Math.round(weakest * 100), requirements };
}

/** Sub-division inside a tier (III → II → I) derived from progress toward the next tier. The top tier has none. */
export function getRankDivision(data: UserRankData): RankDivision | null {
  const { nextTier, percent } = getRankProgress(data);
  if (!nextTier) return null;
  if (percent >= 66) return 'I';
  if (percent >= 33) return 'II';
  return 'III';
}

/** Display name including division, e.g. "Học Giả II". */
export function getRankDisplayName(data: UserRankData): string {
  const tier = getRankTierByKey(data.tierKey);
  const division = getRankDivision(data);
  return division ? `${tier.nameVi} ${division}` : tier.nameVi;
}

/**
 * Calculate progress of daily rank protection
 */
export function getRankDefenseProgress(
  data: UserRankData,
  details?: { remainingCount?: number; totalCount?: number }
): {
  current: number;
  target: number;
  percent: number;
  isProtected: boolean;
  remaining: number;
} {
  const today = getTodayDate();
  const isProtected = Boolean(data.todayProtected && data.lastCompletedAllScheduleDate === today);

  if (isProtected) {
    const total = details?.totalCount || Math.max(1, data.todayReviewedCount || 1);
    return {
      current: total,
      target: total,
      percent: 100,
      isProtected: true,
      remaining: 0,
    };
  }

  // If exact remaining and total counts are provided
  if (details && typeof details.totalCount === 'number' && typeof details.remainingCount === 'number') {
    const target = Math.max(1, details.totalCount);
    const remaining = Math.max(0, details.remainingCount);
    const current = Math.max(0, target - remaining);
    const percent = remaining === 0 ? 100 : Math.min(95, Math.round((current / target) * 100));
    return {
      current,
      target,
      percent,
      isProtected: false,
      remaining,
    };
  }

  const current = data.lastStudyDate === today ? (data.todayReviewedCount || 0) : 0;
  return {
    current,
    target: Math.max(1, current + 1),
    percent: Math.min(90, Math.round((current / Math.max(1, current + 1)) * 100)),
    isProtected: false,
    remaining: 1,
  };
}

/**
 * Load user rank data from localStorage.
 * Defaults streak to 0 as requested by user.
 */
export function getUserRankData(): UserRankData {
  const today = getTodayDate();
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed: UserRankData = JSON.parse(saved);
      // Ensure valid fields
      if (typeof parsed.streakCount !== 'number') parsed.streakCount = 0;
      if (typeof parsed.currentExp !== 'number') parsed.currentExp = 0;
      if (typeof parsed.shieldsCount !== 'number') parsed.shieldsCount = 1;
      if (!parsed.tierKey) parsed.tierKey = 'wood';

      // Check if today is officially protected (only true when all cards for today were completed)
      if (parsed.lastCompletedAllScheduleDate === today) {
        parsed.todayProtected = true;
      } else {
        parsed.todayProtected = false;
      }

      if (parsed.lastStudyDate !== today) {
        parsed.todayReviewedCount = 0;
      }

      // One-time move to the VocabBank ladder: re-evaluate the tier against the stricter requirements.
      if (parsed.rankVersion !== RANK_VERSION) {
        parsed.tierKey = calculateTierFromProgress(parsed.streakCount, parsed.currentExp, parsed.totalDaysProtected || 0);
        parsed.rankVersion = RANK_VERSION;
        saveUserRankData(parsed);
      }

      return parsed;
    }
  } catch (e) {
    console.warn('Error reading rank data from storage:', e);
  }

  // Default initial state: streak is 0!
  const defaultData: UserRankData = {
    tierKey: 'wood',
    currentExp: 0,
    streakCount: 0, // Mặc định streek lửa là 0 theo yêu cầu!
    bestStreak: 0,
    todayReviewedCount: 0,
    todayProtected: false,
    lastStudyDate: null,
    lastCompletedAllScheduleDate: null,
    celebrationShownDate: null,
    shieldsCount: 1, // 1 Khiên bảo vệ tân thủ
    totalDaysProtected: 0,
    demotionsCount: 0,
    recentRankUpMessage: null,
    rankVersion: RANK_VERSION,
  };

  saveUserRankData(defaultData);
  return defaultData;
}

export function saveUserRankData(data: UserRankData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    // Also sync the streak count into legacy study_streak_count for backward compatibility
    localStorage.setItem('study_streak_count', data.streakCount.toString());
    if (data.lastStudyDate) {
      localStorage.setItem('study_last_date', data.lastStudyDate);
    }
    notifyLocalChange();
  } catch (e) {
    console.error('Failed to save user rank data:', e);
  }
}

/**
 * Daily check for rank decay.
 * A past day only counts as "missed" if it actually had due cards: any card whose
 * `reviewDate` is still on or before that day was left unreviewed. Days with nothing
 * scheduled are rest days and never cost a shield or the streak.
 * - Each missed day consumes one shield (streak and rank are kept).
 * - Not enough shields: streak resets to 0 and rank drops 1 tier (if > wood).
 * The check is idempotent — `streakSafeThrough` is moved to yesterday so reloading
 * the app on the same day never consumes another shield or demotes again.
 */
export function checkDailyRankDecay(
  todayDate: string,
  dueDates: string[] = []
): {
  rankData: UserRankData;
  decayed: boolean;
  shieldUsed: boolean;
  shieldsUsed: number;
  prevRank?: string;
} {
  const current = getUserRankData();
  current.todayProtected = current.lastCompletedAllScheduleDate === todayDate;

  const referenceDate = current.streakSafeThrough || current.lastCompletedAllScheduleDate || current.lastStudyDate;
  if (!referenceDate) {
    // Brand new user, streak is 0, no decay needed
    return { rankData: current, decayed: false, shieldUsed: false, shieldsUsed: 0 };
  }

  const yesterday = addDays(todayDate, -1);
  if (diffDays(todayDate, referenceDate) <= 1) {
    // 0: completed today, 1: safe through yesterday. All good!
    saveUserRankData(current);
    return { rankData: current, decayed: false, shieldUsed: false, shieldsUsed: 0 };
  }

  // Days between the reference date and today (exclusive) that still had due cards.
  const firstGapDay = addDays(referenceDate, 1);
  const earliestDue = dueDates.reduce<string | null>((min, d) => (d && (!min || d < min) ? d : min), null);
  let missedDays = 0;
  if (earliestDue && earliestDue <= yesterday) {
    const firstMissed = earliestDue > firstGapDay ? earliestDue : firstGapDay;
    missedDays = diffDays(todayDate, firstMissed);
  }

  const tier = getRankTierByKey(current.tierKey);
  const nothingToLose = current.streakCount === 0 && tier.level === 1;

  if (missedDays === 0 || nothingToLose) {
    // Only rest days in the gap (or nothing at stake): bridge the gap for free.
    current.streakSafeThrough = yesterday;
    saveUserRankData(current);
    return { rankData: current, decayed: false, shieldUsed: false, shieldsUsed: 0 };
  }

  if (current.shieldsCount >= missedDays) {
    // Shield(s) activated: one shield per missed day.
    current.shieldsCount -= missedDays;
    current.streakSafeThrough = yesterday;
    saveUserRankData(current);
    return { rankData: current, decayed: false, shieldUsed: true, shieldsUsed: missedDays };
  }

  // Not enough shields: Rank Decay!
  let newTierKey: RankTierKey = 'wood';
  if (tier.level > 1) {
    const demotedTier = RANK_TIERS.find((t) => t.level === tier.level - 1);
    newTierKey = demotedTier ? demotedTier.key : 'wood';
  }

  const decayedData: UserRankData = {
    ...current,
    streakCount: 0, // Reset streak to 0
    tierKey: newTierKey,
    todayProtected: false,
    todayReviewedCount: 0,
    streakSafeThrough: yesterday,
    demotionsCount: (current.demotionsCount || 0) + 1,
    recentRankUpMessage: `⚠️ Bạn đã bỏ lỡ ngày học! Chuỗi lửa về 0 và rank bị tụt xuống ${getRankTierByKey(newTierKey).nameVi}. Hãy hoàn thành tất cả lịch thẻ hôm nay để thắp lại ngọn lửa!`,
  };

  saveUserRankData(decayedData);
  return {
    rankData: decayedData,
    decayed: true,
    shieldUsed: false,
    shieldsUsed: 0,
    prevRank: tier.nameVi,
  };
}

/**
 * Record single card review or context output.
 * Awards base EXP and updates stats without prematurely triggering rank protection or streak increase.
 * Rank protection and streak increase are ONLY triggered when ALL scheduled cards are completed.
 */
export function recordStudyForRank(params: {
  rating?: ReviewRating;
  isContextOutput?: boolean;
  todayDate: string;
}): {
  rankData: UserRankData;
  rankUp: boolean;
  justProtectedRank: boolean;
  newTier?: RankTierDefinition;
  expGained: number;
  prevProgressPercent: number;
  currentProgressPercent: number;
  targetCards: number;
} {
  const current = getUserRankData();
  const { rating, isContextOutput, todayDate } = params;

  // Calculate EXP gained
  let exp = 10; // Base 10 EXP per card
  if (rating === 3) exp += 5; // Good / Trôi chảy: +15 EXP
  if (rating === 4) exp += 10; // Easy / Thành thạo: +20 EXP
  if (isContextOutput) exp += 50; // Output 5 contexts: +50 EXP huge boost!

  const prevTier = getRankTierByKey(current.tierKey);
  const prevTodayCount = current.lastStudyDate === todayDate ? (current.todayReviewedCount || 0) : 0;
  const newReviewedCount = prevTodayCount + 1;
  const newExp = current.currentExp + exp;

  // Check if eligible for Rank Up from EXP
  const calculatedTierKey = calculateTierFromProgress(current.streakCount, newExp, current.totalDaysProtected || 0);
  const calculatedTier = getRankTierByKey(calculatedTierKey);

  let rankUp = false;
  let finalTierKey = current.tierKey;

  if (calculatedTier.level > prevTier.level) {
    rankUp = true;
    finalTierKey = calculatedTierKey;
  }

  const updatedData: UserRankData = {
    ...current,
    tierKey: finalTierKey,
    currentExp: newExp,
    todayReviewedCount: newReviewedCount,
    // Note: todayProtected is maintained if already protected today, but not granted until all cards are completed
    todayProtected: current.lastCompletedAllScheduleDate === todayDate,
    lastStudyDate: todayDate,
    recentRankUpMessage: rankUp ? `🎉 Chúc mừng! Bạn đã thăng hạng lên ${calculatedTier.nameVi} · ${calculatedTier.nameEn}!` : null,
  };

  saveUserRankData(updatedData);

  return {
    rankData: updatedData,
    rankUp,
    justProtectedRank: false, // Never prematurely set to true here
    newTier: rankUp ? calculatedTier : undefined,
    expGained: exp,
    prevProgressPercent: updatedData.todayProtected ? 100 : Math.min(90, prevTodayCount * 15),
    currentProgressPercent: updatedData.todayProtected ? 100 : Math.min(90, newReviewedCount * 15),
    targetCards: Math.max(1, newReviewedCount + 1),
  };
}

/**
 * Triggers when the user finishes reviewing ALL due cards (vocab + grammar) for today.
 * ONLY at this point does streak increase (+1), rank gets protected, and the single celebration can erupt!
 */
export function recordAllCardsCompletedForRank(params: {
  todayDate: string;
  cardsReviewedCount?: number;
}): {
  rankData: UserRankData;
  rankUp: boolean;
  justProtectedRank: boolean;
  shouldShowCelebration: boolean;
  newTier?: RankTierDefinition;
  expGained: number;
} {
  const current = getUserRankData();
  const { todayDate, cardsReviewedCount = 1 } = params;

  // Bonus for completing the whole day's schedule: 50 EXP + 5 per card, capped at 300
  const exp = Math.min(300, 50 + cardsReviewedCount * 5);

  const prevTier = getRankTierByKey(current.tierKey);
  const wasAlreadyProtectedToday = (current.lastCompletedAllScheduleDate === todayDate);
  const wasCelebratedToday = (current.celebrationShownDate === todayDate);

  // Update streak if first time completing all schedule today
  let newStreak = current.streakCount;
  let isFirstCompletionToday = false;

  if (current.lastCompletedAllScheduleDate !== todayDate) {
    isFirstCompletionToday = true;
    // Continue the streak if the chain is safe through yesterday (completed, rest day, or shield)
    const safeDate = current.streakSafeThrough || current.lastCompletedAllScheduleDate;
    if (safeDate && diffDays(todayDate, safeDate) <= 1) {
      newStreak += 1;
    } else {
      newStreak = 1;
    }
  }

  const newExp = current.currentExp + exp;
  const newReviewedCount = (current.todayReviewedCount || 0) + cardsReviewedCount;
  const bestStreak = Math.max(current.bestStreak, newStreak);
  const newActiveDays = isFirstCompletionToday ? (current.totalDaysProtected || 0) + 1 : current.totalDaysProtected || 0;

  // Check if eligible for Rank Up
  const calculatedTierKey = calculateTierFromProgress(newStreak, newExp, newActiveDays);
  const calculatedTier = getRankTierByKey(calculatedTierKey);

  let rankUp = false;
  let finalTierKey = current.tierKey;

  if (calculatedTier.level > prevTier.level) {
    rankUp = true;
    finalTierKey = calculatedTierKey;
  }

  // Bonus shield when hitting a streak milestone
  let newShields = current.shieldsCount;
  if (isFirstCompletionToday && SHIELD_STREAK_MILESTONES.includes(newStreak)) {
    newShields = Math.min(3, newShields + 1);
  }

  // Check if celebration should be shown: ONLY 1 TIME PER DAY!
  let shouldShowCelebration = false;
  let newCelebrationShownDate = current.celebrationShownDate || null;
  if (!wasCelebratedToday) {
    shouldShowCelebration = true;
    newCelebrationShownDate = todayDate;
  }

  const updatedData: UserRankData = {
    ...current,
    tierKey: finalTierKey,
    currentExp: newExp,
    streakCount: newStreak,
    bestStreak,
    todayReviewedCount: newReviewedCount,
    todayProtected: true, // Officially protected!
    lastStudyDate: todayDate,
    lastCompletedAllScheduleDate: todayDate,
    streakSafeThrough: todayDate,
    celebrationShownDate: newCelebrationShownDate,
    shieldsCount: newShields,
    totalDaysProtected: newActiveDays,
    recentRankUpMessage: rankUp ? `🎉 Chúc mừng! Bạn đã thăng hạng lên ${calculatedTier.nameVi} · ${calculatedTier.nameEn}!` : null,
  };

  saveUserRankData(updatedData);

  return {
    rankData: updatedData,
    rankUp,
    justProtectedRank: isFirstCompletionToday,
    shouldShowCelebration,
    newTier: rankUp ? calculatedTier : undefined,
    expGained: exp,
  };
}

// Alias for backward compatibility
export const recordAllVocabCompletedForRank = recordAllCardsCompletedForRank;

/**
 * Record EXP and rewards earned from playing review mini-games
 */
export function recordGameCompletionForRank(params: {
  expEarned: number;
  todayDate: string;
}): {
  rankData: UserRankData;
  rankUp: boolean;
  newTier?: RankTierDefinition;
  expGained: number;
  prevProgressPercent: number;
  currentProgressPercent: number;
} {
  const current = getUserRankData();
  const { expEarned, todayDate } = params;
  const exp = Math.max(5, Math.round(expEarned));

  const prevTier = getRankTierByKey(current.tierKey);
  const newExp = current.currentExp + exp;

  const calculatedTierKey = calculateTierFromProgress(current.streakCount, newExp, current.totalDaysProtected || 0);
  const calculatedTier = getRankTierByKey(calculatedTierKey);

  let rankUp = false;
  let finalTierKey = current.tierKey;

  if (calculatedTier.level > prevTier.level) {
    rankUp = true;
    finalTierKey = calculatedTierKey;
  }

  const prevProgress = getRankDefenseProgress(current);

  const updatedData: UserRankData = {
    ...current,
    tierKey: finalTierKey,
    currentExp: newExp,
    lastStudyDate: todayDate,
    recentRankUpMessage: rankUp ? `🎉 Chúc mừng! Bạn đã thăng hạng lên ${calculatedTier.nameVi} · ${calculatedTier.nameEn} từ đấu trường mini-game!` : null,
  };

  saveUserRankData(updatedData);
  const currentProgress = getRankDefenseProgress(updatedData);

  return {
    rankData: updatedData,
    rankUp,
    newTier: rankUp ? calculatedTier : undefined,
    expGained: exp,
    prevProgressPercent: prevProgress.percent,
    currentProgressPercent: currentProgress.percent,
  };
}
