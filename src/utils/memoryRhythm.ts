/**
 * ============================================================================
 * TRỢ LÝ ĐO NHỊP TRÍ NHỚ — LOGIC ĐỀ XUẤT (không phụ thuộc trình duyệt)
 * ============================================================================
 *
 * Dùng chung cho giao diện (FSRSOptimizerModal) và Netlify Function
 * (`/api/ai/optimize-fsrs`) để con số đề xuất luôn nhất quán: AI chỉ viết lời
 * giải thích, còn mức ghi nhớ khuyên dùng được tính bằng quy tắc cố định dưới đây.
 */

export const RHYTHM_MIN_RETENTION = 0.8;
export const RHYTHM_MAX_RETENTION = 0.95;
/** Số lượt ôn để hệ thống "hiểu rõ" nhịp nhớ của bạn */
export const RHYTHM_ELIGIBLE_REVIEWS = 1000;
/** Số lượt ôn lại (có khoảng cách) tối thiểu để tin vào tỷ lệ nhớ thực tế */
export const RHYTHM_MIN_MEASURED_REVIEWS = 50;

export type RhythmGoalKind = 'exam' | 'long_term' | 'casual';
export type RhythmStatus = 'COLD_START' | 'OPTIMIZED' | 'ADJUST_RETENTION';

export interface RhythmInput {
  total_reviews: number;
  /** Số lượt ôn lại thật sự (thẻ đã có lịch hẹn trước đó) */
  measured_reviews: number;
  /** Tỷ lệ nhớ thực tế khi ôn lại (%) */
  actual_retention: number;
  /** Mục tiêu ghi nhớ hiện tại (%) */
  target_retention: number;
  daily_cards: number;
  user_goal: string;
}

export interface RhythmRecommendation {
  goalKind: RhythmGoalKind;
  recommended_target_retention: number;
  status_code: RhythmStatus;
  is_eligible_for_optimization: boolean;
  /** Lý do ngắn gọn (tiếng Việt) giải thích con số đề xuất */
  reasons: string[];
}

export function clampRetention(value: number): number {
  if (!Number.isFinite(value)) return 0.9;
  const clamped = Math.min(RHYTHM_MAX_RETENTION, Math.max(RHYTHM_MIN_RETENTION, value));
  return Math.round(clamped * 100) / 100;
}

export function detectGoalKind(goal: string): RhythmGoalKind {
  const g = String(goal || '').toLowerCase();
  if (/(cấp tốc|gấp|ielts|toefl|toeic|kỳ thi|kiểm tra|ngắn hạn)/.test(g)) return 'exam';
  if (/(sở thích|tự do|vui)/.test(g)) return 'casual';
  return 'long_term';
}

const GOAL_BASE: Record<RhythmGoalKind, number> = {
  exam: 0.91,
  long_term: 0.87,
  casual: 0.85,
};

/**
 * Hệ số khối lượng ôn tập tương đối khi đặt mục tiêu ghi nhớ R.
 * Khoảng cách ôn của FSRS tỷ lệ với (R^(1/decay) - 1) (decay = -0.5),
 * nên số lượt ôn mỗi ngày tỷ lệ nghịch với đại lượng đó.
 */
function workloadFactor(retention: number): number {
  const r = clampRetention(retention);
  return 1 / (Math.pow(r, -2) - 1);
}

/** Tỷ lệ khối lượng ôn khi đổi từ mục tiêu `from` sang `to` (ví dụ 0.7 = giảm 30%) */
export function estimateWorkloadRatio(from: number, to: number): number {
  return workloadFactor(to) / workloadFactor(from);
}

export function recommendRetention(input: RhythmInput): RhythmRecommendation {
  const goalKind = detectGoalKind(input.user_goal);
  const reasons: string[] = [];
  let rec = GOAL_BASE[goalKind];
  reasons.push(
    goalKind === 'exam'
      ? 'Bạn cần nhớ chắc cho kỳ thi nên mức ghi nhớ được đặt cao.'
      : goalKind === 'casual'
      ? 'Bạn học theo sở thích nên ưu tiên ít áp lực, ít thẻ mỗi ngày.'
      : 'Bạn học lâu dài nên cân bằng giữa nhớ bền và số thẻ phải ôn.'
  );

  const hasMeasurement = input.measured_reviews >= RHYTHM_MIN_MEASURED_REVIEWS;
  const currentTarget = input.target_retention / 100;

  // Quá tải: số thẻ mỗi ngày quá nhiều → hạ nhẹ mục tiêu để giảm khối lượng
  if (input.daily_cards > 150) {
    rec -= 0.02;
    reasons.push(`Bạn đang ôn khoảng ${input.daily_cards} thẻ/ngày, hơi nhiều — hạ nhẹ mục tiêu để giảm tải.`);
  } else if (input.daily_cards > 90) {
    rec -= 0.01;
    reasons.push(`Khối lượng ~${input.daily_cards} thẻ/ngày khá cao nên đề xuất giảm tải một chút.`);
  }

  if (hasMeasurement) {
    const gap = input.actual_retention - input.target_retention;
    if (gap <= -8) {
      // Nhớ thực tế thấp hơn nhiều so với mục tiêu: đặt mục tiêu cao hơn chỉ làm lịch dày đặc
      // mà không cải thiện được. Giữ mục tiêu vừa phải và khuyên tối ưu tham số riêng.
      rec = Math.min(rec, 0.88);
      reasons.push(
        `Thực tế bạn nhớ được ${input.actual_retention}% (thấp hơn mục tiêu ${input.target_retention}%). Hãy tối ưu tham số riêng ở mục 3 để lịch hẹn sát với trí nhớ của bạn hơn.`
      );
    } else if (gap >= 5 && goalKind !== 'exam') {
      // Nhớ tốt hơn kỳ vọng: có thể giãn lịch mà vẫn an toàn
      rec -= 0.01;
      reasons.push(`Bạn nhớ tốt hơn kỳ vọng (${input.actual_retention}%), có thể giãn lịch ôn thêm một chút.`);
    }
  } else {
    reasons.push('Chưa đủ lượt ôn lại để đo chính xác tỷ lệ nhớ — đang dùng mức an toàn theo mục tiêu của bạn.');
  }

  const recommended = clampRetention(rec);
  const isEligible = input.total_reviews >= RHYTHM_ELIGIBLE_REVIEWS;
  const status_code: RhythmStatus = !isEligible
    ? 'COLD_START'
    : Math.abs(recommended - currentTarget) >= 0.015
    ? 'ADJUST_RETENTION'
    : 'OPTIMIZED';

  return {
    goalKind,
    recommended_target_retention: recommended,
    status_code,
    is_eligible_for_optimization: isEligible,
    reasons,
  };
}

/** Lời nhắn mặc định khi không dùng được AI */
export function buildRhythmMessage(input: RhythmInput, rec: RhythmRecommendation): string {
  const pct = Math.round(rec.recommended_target_retention * 100);
  const ratio = estimateWorkloadRatio(input.target_retention / 100, rec.recommended_target_retention);
  const deltaPct = Math.round((ratio - 1) * 100);
  const workload =
    Math.abs(deltaPct) < 3
      ? 'khối lượng ôn mỗi ngày gần như giữ nguyên'
      : deltaPct < 0
      ? `số thẻ phải ôn mỗi ngày giảm khoảng ${Math.abs(deltaPct)}%`
      : `số thẻ phải ôn mỗi ngày tăng khoảng ${deltaPct}% nhưng bạn sẽ nhớ chắc hơn`;

  if (rec.status_code === 'COLD_START') {
    return `Bạn đã ôn ${input.total_reviews}/${RHYTHM_ELIGIBLE_REVIEWS.toLocaleString('vi-VN')} lượt — cứ đều đặn mỗi ngày nhé! Trong lúc chờ, mức nhớ ${pct}% là lựa chọn an toàn cho mục tiêu của bạn, ${workload}.`;
  }
  if (rec.status_code === 'OPTIMIZED') {
    return `Nhịp học hiện tại (${input.target_retention}%) đã rất vừa vặn với bạn. Hãy giữ nguyên và tiếp tục ôn đều mỗi ngày!`;
  }
  return `Sau ${input.total_reviews} lượt ôn, mức nhớ ${pct}% phù hợp với bạn hơn: ${workload}.`;
}
