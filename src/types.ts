export type WordType = 'n' | 'v' | 'adj' | 'adv' | 'phrase' | 'idiom' | 'prep' | 'conj' | string;

/**
 * 4 mức đánh giá FSRS:
 * 1: Làm lại (Again - Chưa nhớ được / Cần làm lại ngay)
 * 2: Cần gọt giũa (Hard - Nhớ chật vật / Cần gọt giũa thêm)
 * 3: Trôi chảy (Good - Nhớ tự nhiên / Phản xạ trôi chảy)
 * 4: Thành thạo (Easy - Nắm rất vững / Sử dụng thành thạo)
 */
export type ReviewRating = 1 | 2 | 3 | 4;

/**
 * Trạng thái của thẻ FSRS
 * 0: New (Mới tạo, chưa học)
 * 1: Learning (Đang học / Thẻ quên học lại)
 * 2: Review (Đã thuộc, trong chu kỳ ôn tập ngắt quãng)
 * 3: Relearning (Học lại sau khi quên)
 */
export enum FSRSState {
  New = 0,
  Learning = 1,
  Review = 2,
  Relearning = 3,
}

/**
 * YÊU CẦU III.1: CẤU TRÚC DỮ LIỆU CỦA THẺ (CARD SCHEMA)
 * Chứa đầy đủ các trường cốt lõi theo chuẩn FSRS:
 * - stability (float, mặc định 0)
 * - difficulty (float, mặc định 0)
 * - reps (int, mặc định 0)
 * - lapses (int, mặc định 0)
 * - state (New=0, Learning=1, Review=2)
 * - last_review (DateTime)
 * - next_review (DateTime)
 */
export interface Card {
  stability: number;       // S: Độ bền vững trí nhớ (float, mặc định 0, tính bằng ngày)
  difficulty: number;      // D: Độ khó của thẻ (float, mặc định 0, thang điểm 1 đến 10)
  reps: number;            // int: Tổng số lần đã ôn tập (mặc định 0)
  lapses: number;          // int: Số lần bấm quên/sai (mặc định 0)
  state: number;           // int: New=0, Learning=1, Review=2, Relearning=3
  last_review?: string;    // DateTime / ISO string: Thời gian lần ôn cuối
  next_review: string;     // DateTime / ISO string: Thời gian đến hạn ôn tiếp theo

  // Các trường bổ trợ tích hợp ứng dụng
  reviewDate: string;      // YYYY-MM-DD: Định dạng ngày để tra cứu theo lịch
  elapsed_days?: number;   // Số ngày thực tế đã trôi qua kể từ lần ôn cuối
  scheduled_days?: number; // Khoảng cách ngày đã lên lịch (Interval). 0 = thẻ đang ở bước học ngắn
  learning_steps?: number; // Vị trí bước học ngắn hiện tại (Learning Steps: 10m, 30m...)
  interval?: number;       // Khoảng cách ngày (tương thích)
  repetition?: number;     // Số lần lặp lại
  easeFactor?: number;     // Hệ số dễ (tương thích SM-2 nếu cần)
}

/**
 * Định nghĩa tương thích cho các component hiện tại
 */
export type FSRSCardData = Card;

export interface VocabItem extends FSRSCardData {
  id: string;
  word: string;
  phonetic?: string;
  meaning: string;
  type?: WordType;
  topic?: string;
  example?: string;
  exampleVi?: string;
  imageUrl?: string;
  audioUrl?: string;
  createdAt: string;

  // Thuộc tính theo dõi hoàn thành Output 5 ngữ cảnh
  completedContextsCount?: number;     // 0 đến 5 ngữ cảnh đã hoàn thành
  contextOutputs?: Record<number, string>; // Câu output của người dùng theo ID ngữ cảnh 1..5
  lastOutputDate?: string;             // Ngày hoàn thành output (YYYY-MM-DD)
}

export interface GrammarItem extends FSRSCardData {
  id: string;
  title: string;
  type: string; // Thì / Cấu trúc / Mệnh đề / Giới từ / Khác
  formula: string;
  explanation: string;
  example?: string;
  exampleVi?: string;
  imageUrl?: string;
  audioUrl?: string;
  createdAt: string;

  // Thuộc tính theo dõi hoàn thành Output 5 ngữ cảnh
  completedContextsCount?: number;     // 0 đến 5 ngữ cảnh đã hoàn thành
  contextOutputs?: Record<number, string>; // Câu output của người dùng theo ID ngữ cảnh 1..5
  lastOutputDate?: string;             // Ngày hoàn thành output (YYYY-MM-DD)
}

export interface ReviewLog {
  itemId: string;
  itemType: 'vocab' | 'grammar';
  rating: ReviewRating;
  timestamp: string;
  prevScheduledDays: number;
  nextScheduledDays: number;
  stability: number;
  difficulty: number;
  state: number;
}

export interface SyncConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  autoSync: boolean;
  lastSyncedAt?: string;
}

export interface FSRSOptimizerResult {
  is_eligible_for_optimization: boolean;
  recommended_target_retention: number;
  status_code: 'COLD_START' | 'OPTIMIZED' | 'ADJUST_RETENTION';
  user_message: string;
}

export interface FSRSOptimizerParams {
  total_reviews: number;
  actual_retention: number;
  target_retention: number;
  daily_cards: number;
  user_goal: string;
}

export interface FSRSUserConfig {
  targetRetention: number;
  userGoal: string;
  lastOptimizedAt?: string;
  lastOptimizationResult?: FSRSOptimizerResult;
}

/**
 * HỆ THỐNG MỨC RANK & GIỮ CHUỖI ÔN TẬP
 */
export type RankTierKey =
  | 'wood'        // Sơ Khởi · Initiate
  | 'bronze'      // Học Giả · Scholar
  | 'silver'      // Tinh Thông · Adept
  | 'gold'        // Chuyên Gia · Expert
  | 'platinum'    // Bác Học · Savant
  | 'diamond'     // Đại Sư · Master
  | 'master'      // Tông Sư · Grandmaster
  | 'challenger'; // Huyền Thoại · Legend

export type RankDivision = 'III' | 'II' | 'I';

export interface RankTierDefinition {
  key: RankTierKey;
  level: number;
  nameVi: string;
  nameEn: string;
  titleVi: string;
  minStreak: number;
  minExp: number;
  /** Tổng số ngày đã hoàn thành toàn bộ lịch ôn (UserRankData.totalDaysProtected). */
  minActiveDays: number;
  /** @deprecated emblems are drawn by RankEmblem */
  icon?: string;
  minDailyCardsToMaintain?: number;
  color: string;
  bgGradient: string;
  borderColor: string;
  textColor: string;
  badgeClass: string;
  perks: string[];
}

export interface UserRankData {
  tierKey: RankTierKey;
  currentExp: number;
  streakCount: number;
  bestStreak: number;
  todayReviewedCount: number;
  todayProtected: boolean;
  lastStudyDate: string | null;
  lastCompletedAllScheduleDate?: string | null; // Ngày hoàn thành toàn bộ lịch ôn để tính streak & bảo vệ rank
  celebrationShownDate?: string | null; // Ngày đã hiển thị hiệu ứng bốc lửa ăn mừng (chỉ hiện 1 lần/ngày)
  shieldsCount: number; // Khiên bảo vệ tụt rank (Streak Freeze / Rank Shield)
  /** Ngày cuối cùng chuỗi được coi là an toàn (đã hoàn thành, ngày nghỉ không có thẻ, hoặc đã dùng khiên/xử lý tụt rank). */
  streakSafeThrough?: string | null;
  totalDaysProtected: number;
  demotionsCount: number;
  recentRankUpMessage?: string | null;
  /** Phiên bản thang rank đã áp dụng cho dữ liệu này (2 = thang VocabBank). */
  rankVersion?: number;
}

