/**
 * Arcade Mastery Badges & Achievements System
 * High difficulty achievements earned exclusively through skill in mini-games.
 * These badges do NOT alter FSRS study ranks, preserving the integrity of academic progress.
 */

export interface GameBadge {
  id: string;
  name: string;
  titleVi: string;
  description: string;
  icon: string;
  rarity: 'mythic' | 'legendary' | 'epic' | 'rare';
  rarityLabel: string;
  conditionDescription: string;
  isUnlocked: boolean;
  unlockedAt?: string;
  progress: number; // 0 to 100
  progressText: string;
  glowColor: string;
  badgeBorder: string;
}

const STORAGE_KEY = 'arcade_mastery_badges_v1';
const STATS_KEY = 'arcade_overall_stats_v1';

export interface ArcadeStats {
  gamesPlayed: number;
  highestCombo: number;
  highestScore: number;
  fastestReflexMs: number; // Lowest reaction time in ms
  flawlessSpaceGames: number;
  flawlessDuelGames: number;
  flawlessMissileGames: number;
}

const INITIAL_STATS: ArcadeStats = {
  gamesPlayed: 0,
  highestCombo: 0,
  highestScore: 0,
  fastestReflexMs: 9999,
  flawlessSpaceGames: 0,
  flawlessDuelGames: 0,
  flawlessMissileGames: 0,
};

const BASE_BADGES_CONFIG: Omit<GameBadge, 'isUnlocked' | 'progress' | 'progressText' | 'unlockedAt'>[] = [
  {
    id: 'sub_second_draw',
    name: 'Tốc Độ Bàn Thờ',
    titleVi: 'Tay Súng Chớp Nhoáng',
    description: 'Rút súng bắn hạ tay súng miền Tây với phản xạ dưới 0.75 giây',
    icon: '⚡',
    rarity: 'legendary',
    rarityLabel: 'Huyền Thoại',
    conditionDescription: 'Thời gian phản xạ bắn trúng < 0.75 giây (750ms) trong Đấu Súng Cao Bồi',
    glowColor: 'shadow-amber-500/40',
    badgeBorder: 'border-amber-400 bg-gradient-to-b from-amber-500/20 to-orange-950/40 text-amber-300',
  },
  {
    id: 'flawless_space_10',
    name: 'Xạ Thủ Tuyệt Đối',
    titleVi: 'Thiện Xạ Ngân Hà',
    description: 'Bắn hạ 10 thiên thạch liên tiếp với độ chính xác 100% không mất khiên',
    icon: '🎯',
    rarity: 'mythic',
    rarityLabel: 'Thần Thoại',
    conditionDescription: 'Độ chính xác 100% trong trận Vũ Trụ Xạ Thủ từ 10 câu trở lên, còn nguyên 3 khiên',
    glowColor: 'shadow-cyan-500/50',
    badgeBorder: 'border-cyan-400 bg-gradient-to-b from-cyan-500/25 to-blue-950/50 text-cyan-200',
  },
  {
    id: 'iron_fortress_100',
    name: 'Pháo Đài Thép',
    titleVi: 'Vòm Phòng Thủ Bất Bại',
    description: 'Phòng thủ cứ điểm thành công với 100% Máu cứ điểm nguyên vẹn',
    icon: '🛡️',
    rarity: 'epic',
    rarityLabel: 'Sử Thi',
    conditionDescription: 'Đánh chặn tất cả tên lửa ngữ pháp, không để cứ điểm chịu bất kỳ 1 điểm sát thương nào',
    glowColor: 'shadow-indigo-500/40',
    badgeBorder: 'border-indigo-400 bg-gradient-to-b from-indigo-500/25 to-slate-900 text-indigo-300',
  },
  {
    id: 'combo_overlord_10',
    name: 'Chúa Tể Chuỗi Bắn',
    titleVi: 'Liên Hoàn Kích X10',
    description: 'Duy trì chuỗi bắn chuẩn xác Combo x10 liên tục không ngắt quãng',
    icon: '🔥',
    rarity: 'mythic',
    rarityLabel: 'Thần Thoại',
    conditionDescription: 'Đạt chuỗi Combo liên tục từ 10 câu trở lên trong bất kỳ game nào',
    glowColor: 'shadow-rose-500/50',
    badgeBorder: 'border-rose-500 bg-gradient-to-b from-rose-500/25 to-stone-900 text-rose-300',
  },
  {
    id: 'undefeated_duel_5',
    name: 'Bất Bại Miền Tây',
    titleVi: 'Huyền Thoại Viễn Tây',
    description: 'Chiến thắng 5 tay súng sơn tặc liên tiếp mà còn nguyên vẹn cả 3 Mạng',
    icon: '🤠',
    rarity: 'legendary',
    rarityLabel: 'Huyền Thoại',
    conditionDescription: 'Hạ gục toàn bộ băng nhóm không để đối phương bắn trúng một phát nào',
    glowColor: 'shadow-orange-500/40',
    badgeBorder: 'border-orange-400 bg-gradient-to-b from-orange-500/20 to-amber-950/40 text-orange-200',
  },
  {
    id: 'apex_score_3500',
    name: 'Điểm Số Thần Thánh',
    titleVi: 'Bậc Thầy Điểm Đỉnh Cao',
    description: 'Đạt từ 3,500 điểm trở lên trong một trận đấu arcade duy nhất',
    icon: '🏆',
    rarity: 'legendary',
    rarityLabel: 'Huyền Thoại',
    conditionDescription: 'Tận dụng combo nhân điểm và phản xạ cực nhanh để đạt trên 3,500 điểm',
    glowColor: 'shadow-yellow-400/50',
    badgeBorder: 'border-yellow-400 bg-gradient-to-b from-yellow-500/25 to-amber-950/40 text-yellow-300',
  },
  {
    id: 'syntax_demigod_15',
    name: 'Bậc Thầy Cú Pháp',
    titleVi: 'Thiên Tài Cấu Trúc',
    description: 'Đánh chặn thành công ít nhất 13/15 tên lửa ngữ pháp độ khó cao',
    icon: '🧠',
    rarity: 'epic',
    rarityLabel: 'Sử Thi',
    conditionDescription: 'Chơi trận Tên Lửa Ngữ Pháp 15 câu và trả lời đúng tối thiểu 13 câu',
    glowColor: 'shadow-emerald-500/40',
    badgeBorder: 'border-emerald-400 bg-gradient-to-b from-emerald-500/20 to-teal-950/40 text-emerald-300',
  },
  {
    id: 'arcade_veteran_15',
    name: 'Đấu Sĩ Dạn Dày',
    titleVi: 'Chiến Binh Đấu Trường',
    description: 'Chinh chiến và hoàn tất tối thiểu 15 trận đấu ôn tập phản xạ',
    icon: '🎖️',
    rarity: 'rare',
    rarityLabel: 'Hiếm',
    conditionDescription: 'Hoàn thành 15 trận thi đấu bất kỳ trong Đấu Trường Game',
    glowColor: 'shadow-purple-500/30',
    badgeBorder: 'border-purple-400 bg-gradient-to-b from-purple-500/20 to-slate-900 text-purple-300',
  },
];

export function getArcadeStats(): ArcadeStats {
  try {
    const saved = localStorage.getItem(STATS_KEY);
    if (saved) {
      return { ...INITIAL_STATS, ...JSON.parse(saved) };
    }
  } catch {}
  return { ...INITIAL_STATS };
}

export function saveArcadeStats(stats: ArcadeStats): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {}
}

export function getAllGameBadges(): GameBadge[] {
  let unlockedMap: Record<string, { unlockedAt: string }> = {};
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      unlockedMap = JSON.parse(saved);
    }
  } catch {}

  const stats = getArcadeStats();

  return BASE_BADGES_CONFIG.map((config) => {
    const isUnlocked = Boolean(unlockedMap[config.id]);
    const unlockedAt = unlockedMap[config.id]?.unlockedAt;

    let progress = 0;
    let progressText = '0%';

    switch (config.id) {
      case 'sub_second_draw':
        if (isUnlocked) {
          progress = 100;
          progressText = `Kỷ lục: ${(stats.fastestReflexMs / 1000).toFixed(2)}s`;
        } else if (stats.fastestReflexMs < 9000) {
          progress = Math.min(95, Math.round(((4000 - stats.fastestReflexMs) / (4000 - 750)) * 100));
          progressText = `Nhanh nhất: ${(stats.fastestReflexMs / 1000).toFixed(2)}s / Mục tiêu: <0.75s`;
        } else {
          progress = 0;
          progressText = 'Mục tiêu: <0.75s';
        }
        break;

      case 'flawless_space_10':
        progress = isUnlocked ? 100 : stats.flawlessSpaceGames > 0 ? 100 : 0;
        progressText = isUnlocked ? 'Đã đạt 100% chính xác' : 'Cần 100% chính xác (≥10 câu)';
        break;

      case 'iron_fortress_100':
        progress = isUnlocked ? 100 : stats.flawlessMissileGames > 0 ? 100 : 0;
        progressText = isUnlocked ? 'Đã giữ 100% Máu' : 'Cần 100% Máu cứ điểm';
        break;

      case 'combo_overlord_10':
        progress = isUnlocked ? 100 : Math.min(100, Math.round((stats.highestCombo / 10) * 100));
        progressText = isUnlocked ? `Đã đạt Combo x${stats.highestCombo}` : `${stats.highestCombo}/10 combo`;
        break;

      case 'undefeated_duel_5':
        progress = isUnlocked ? 100 : stats.flawlessDuelGames > 0 ? 100 : 0;
        progressText = isUnlocked ? 'Đã thắng 5/5 nguyên vẹn' : 'Cần thắng 5/5 nguyên 3 tim';
        break;

      case 'apex_score_3500':
        progress = isUnlocked ? 100 : Math.min(100, Math.round((stats.highestScore / 3500) * 100));
        progressText = isUnlocked ? `Kỷ lục: ${stats.highestScore.toLocaleString()} đ` : `${stats.highestScore.toLocaleString()}/3,500 đ`;
        break;

      case 'syntax_demigod_15':
        progress = isUnlocked ? 100 : 0;
        progressText = isUnlocked ? 'Đã hoàn thành xuất sắc' : 'Cần đúng ≥13/15 câu';
        break;

      case 'arcade_veteran_15':
        progress = isUnlocked ? 100 : Math.min(100, Math.round((stats.gamesPlayed / 15) * 100));
        progressText = isUnlocked ? `Đã hoàn thành ${stats.gamesPlayed} trận` : `${stats.gamesPlayed}/15 trận`;
        break;

      default:
        progress = isUnlocked ? 100 : 0;
        progressText = isUnlocked ? 'Đã mở khóa' : 'Chưa mở';
    }

    return {
      ...config,
      isUnlocked,
      unlockedAt,
      progress,
      progressText,
    };
  });
}

/**
 * Evaluate game match results and unlock any newly earned badges
 */
export function evaluateGameMatchForBadges(match: {
  gameType: 'space-shooter' | 'wild-west' | 'grammar-missile';
  score: number;
  combo: number;
  correctCount: number;
  totalCount: number;
  livesRemaining?: number; // e.g. 3/3 shields or hearts
  fastestReflexMs?: number;
  cityHealthRemaining?: number; // e.g. 100%
}): {
  newlyUnlockedBadges: GameBadge[];
  allBadges: GameBadge[];
} {
  const stats = getArcadeStats();
  stats.gamesPlayed += 1;
  stats.highestScore = Math.max(stats.highestScore, match.score);
  stats.highestCombo = Math.max(stats.highestCombo, match.combo);

  if (match.fastestReflexMs && match.fastestReflexMs > 0) {
    stats.fastestReflexMs = Math.min(stats.fastestReflexMs, match.fastestReflexMs);
  }

  const isFlawless = match.correctCount === match.totalCount && match.totalCount >= 10;
  if (match.gameType === 'space-shooter' && isFlawless && match.livesRemaining === 3) {
    stats.flawlessSpaceGames += 1;
  }
  if (match.gameType === 'wild-west' && match.correctCount === match.totalCount && match.livesRemaining === 3) {
    stats.flawlessDuelGames += 1;
  }
  if (match.gameType === 'grammar-missile' && match.cityHealthRemaining === 100) {
    stats.flawlessMissileGames += 1;
  }

  saveArcadeStats(stats);

  // Load current unlocked map
  let unlockedMap: Record<string, { unlockedAt: string }> = {};
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      unlockedMap = JSON.parse(saved);
    }
  } catch {}

  const newlyUnlockedBadges: GameBadge[] = [];
  const now = new Date().toLocaleDateString('vi-VN');

  const checkAndUnlock = (badgeId: string) => {
    if (!unlockedMap[badgeId]) {
      unlockedMap[badgeId] = { unlockedAt: now };
      const badgeConfig = BASE_BADGES_CONFIG.find((b) => b.id === badgeId);
      if (badgeConfig) {
        newlyUnlockedBadges.push({
          ...badgeConfig,
          isUnlocked: true,
          unlockedAt: now,
          progress: 100,
          progressText: 'Mở khóa thành công!',
        });
      }
    }
  };

  // Rule 1: Sub-second reflex (< 750ms in wild west duel)
  if (match.gameType === 'wild-west' && match.fastestReflexMs && match.fastestReflexMs > 0 && match.fastestReflexMs < 750) {
    checkAndUnlock('sub_second_draw');
  }

  // Rule 2: Flawless space shooter >= 10 questions with 3 shields
  if (match.gameType === 'space-shooter' && isFlawless && match.livesRemaining === 3) {
    checkAndUnlock('flawless_space_10');
  }

  // Rule 3: Iron fortress 100% city health
  if (match.gameType === 'grammar-missile' && match.cityHealthRemaining === 100 && match.totalCount >= 5) {
    checkAndUnlock('iron_fortress_100');
  }

  // Rule 4: Combo >= 10
  if (match.combo >= 10) {
    checkAndUnlock('combo_overlord_10');
  }

  // Rule 5: Undefeated duel 5/5 with 3 lives
  if (match.gameType === 'wild-west' && match.correctCount >= 5 && match.correctCount === match.totalCount && match.livesRemaining === 3) {
    checkAndUnlock('undefeated_duel_5');
  }

  // Rule 6: Score >= 3500
  if (match.score >= 3500) {
    checkAndUnlock('apex_score_3500');
  }

  // Rule 7: Syntax Demigod (>=13 correct out of 15 questions)
  if (match.gameType === 'grammar-missile' && match.totalCount >= 15 && match.correctCount >= 13) {
    checkAndUnlock('syntax_demigod_15');
  }

  // Rule 8: 15 games played
  if (stats.gamesPlayed >= 15) {
    checkAndUnlock('arcade_veteran_15');
  }

  // Save updated map
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(unlockedMap));
  } catch {}

  const allBadges = getAllGameBadges();

  return {
    newlyUnlockedBadges,
    allBadges,
  };
}
