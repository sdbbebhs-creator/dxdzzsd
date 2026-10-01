/**
 * ============================================================================
 * TỐI ƯU TẬP THAM SỐ RIÊNG (PERSONAL WEIGHTS OPTIMIZER)
 * ============================================================================
 *
 * FSRS dùng một bộ tham số w (ts-fsrs / FSRS-6: 21 tham số) để mô tả đường cong quên.
 * Mặc định hệ thống dùng bộ tham số chuẩn. Khi đã có đủ lịch sử ôn tập (vài trăm - 1.000 lượt),
 * hàm này phát lại (replay) toàn bộ lịch sử của từng thẻ, dự đoán xác suất nhớ R tại mỗi lượt ôn
 * và điều chỉnh w để giảm sai số giữa dự đoán và kết quả thực tế (nhớ = Hard/Good/Easy, quên = Again).
 *
 * Hàm mục tiêu: Log-loss trung bình (giống bộ tối ưu chính thức của FSRS)
 *   loss = -mean( y * ln(R) + (1 - y) * ln(1 - R) )
 * cộng một lượng nhỏ điều chuẩn (regularization) kéo về bộ mặc định để tránh "học vẹt" khi dữ liệu còn ít.
 *
 * Thuật toán tìm kiếm: Coordinate descent (dò từng tham số, giảm dần bước nhảy), chạy bất đồng bộ
 * để không làm treo giao diện.
 */

import {
  fsrs,
  generatorParameters,
  createEmptyCard,
  forgetting_curve,
  CLAMP_PARAMETERS,
  W17_W18_Ceiling,
  State as FSRSStateLib,
  type Card as FSCard,
  type Grade,
} from 'ts-fsrs';
import { ReviewLog } from '../types';
import { DEFAULT_LIBRARY_WEIGHTS } from './fsrs';

/** Số lượt ôn tối thiểu để bắt đầu tối ưu (độ tin cậy trung bình) */
export const MIN_REVIEWS_FOR_OPTIMIZATION = 400;
/** Số lượt ôn khuyến nghị để có bộ tham số đáng tin cậy */
export const RECOMMENDED_REVIEWS_FOR_OPTIMIZATION = 1000;
/** Giới hạn số lượt đưa vào tối ưu để giữ tốc độ trên trình duyệt */
const MAX_LOGS_FOR_OPTIMIZATION = 4000;

const DAY_MS = 86_400_000;

export interface WeightsOptimizationResult {
  weights: number[];
  lossBefore: number;
  lossAfter: number;
  /** Cải thiện sai số dự đoán (%) */
  improvementPercent: number;
  reviewCount: number;
  itemCount: number;
}

interface ReplayEvent {
  time: number;
  rating: Grade;
}

/**
 * Nhóm log theo thẻ, sắp xếp theo thời gian. Ưu tiên các thẻ ôn gần đây nhất
 * (giữ nguyên toàn bộ lịch sử của từng thẻ) cho đến khi đạt giới hạn số lượt.
 */
function buildHistories(logs: ReviewLog[]): ReplayEvent[][] {
  const groups = new Map<string, ReplayEvent[]>();
  for (const log of logs) {
    const time = new Date(log.timestamp).getTime();
    if (!isFinite(time) || log.rating < 1 || log.rating > 4) continue;
    const key = `${log.itemType}:${log.itemId}`;
    const list = groups.get(key) ?? [];
    list.push({ time, rating: log.rating as Grade });
    groups.set(key, list);
  }

  const histories = [...groups.values()]
    .map((events) => events.sort((a, b) => a.time - b.time))
    .sort((a, b) => b[b.length - 1].time - a[a.length - 1].time);

  const selected: ReplayEvent[][] = [];
  let total = 0;
  for (const events of histories) {
    if (events.length < 2) continue; // cần ít nhất 1 lượt ôn sau lần học đầu để đo trí nhớ
    if (total + events.length > MAX_LOGS_FOR_OPTIMIZATION && selected.length > 0) break;
    selected.push(events);
    total += events.length;
  }
  return selected;
}

/** Log-loss trung bình của một bộ tham số trên toàn bộ lịch sử */
function evaluateLoss(w: number[], histories: ReplayEvent[][]): number {
  const f = fsrs(
    generatorParameters({
      w,
      enable_short_term: false,
      enable_fuzz: false,
      maximum_interval: 36500,
    })
  );

  let loss = 0;
  let count = 0;
  for (const events of histories) {
    let card: FSCard = createEmptyCard(new Date(events[0].time));
    let lastReview = events[0].time;

    for (const ev of events) {
      if (card.state !== FSRSStateLib.New) {
        const elapsed = (ev.time - lastReview) / DAY_MS;
        // Bỏ qua các lượt ôn lại trong cùng ngày: chúng đo trí nhớ ngắn hạn, không phải đường cong quên
        if (elapsed >= 0.5) {
          const r = Math.min(1 - 1e-4, Math.max(1e-4, forgetting_curve(w, elapsed, card.stability)));
          const recalled = ev.rating > 1 ? 1 : 0;
          loss -= recalled * Math.log(r) + (1 - recalled) * Math.log(1 - r);
          count++;
        }
      }
      card = f.next(card, new Date(ev.time), ev.rating).card;
      lastReview = ev.time;
    }
  }
  return count > 0 ? loss / count : Infinity;
}

/** Điều chuẩn kéo nhẹ về bộ mặc định, tỷ lệ nghịch với lượng dữ liệu */
function regularization(w: number[], bounds: number[][], sampleCount: number): number {
  const lambda = 2 / Math.max(1, sampleCount);
  let sum = 0;
  for (let i = 0; i < w.length; i++) {
    const range = Math.max(1e-3, bounds[i][1] - bounds[i][0]);
    const diff = (w[i] - DEFAULT_LIBRARY_WEIGHTS[i]) / range;
    sum += diff * diff;
  }
  return lambda * sum;
}

const yieldToUI = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * Tối ưu bộ tham số riêng từ lịch sử ôn tập.
 * @param logs Lịch sử ôn tập (Memory Logs)
 * @param onProgress Báo tiến độ 0..1
 */
export async function optimizeFSRSWeights(
  logs: ReviewLog[],
  onProgress?: (progress: number) => void
): Promise<WeightsOptimizationResult> {
  const histories = buildHistories(logs);
  const reviewCount = histories.reduce((acc, h) => acc + h.length, 0);
  if (reviewCount < MIN_REVIEWS_FOR_OPTIMIZATION) {
    throw new Error(
      `Cần ít nhất ${MIN_REVIEWS_FOR_OPTIMIZATION} lượt ôn (của các thẻ đã ôn từ 2 lần trở lên). Hiện có ${reviewCount} lượt.`
    );
  }

  const bounds = CLAMP_PARAMETERS(W17_W18_Ceiling, false);
  const clampParam = (i: number, v: number) => Math.min(bounds[i][1], Math.max(bounds[i][0], v));

  let w = [...DEFAULT_LIBRARY_WEIGHTS];
  const lossBefore = evaluateLoss(w, histories);
  let best = lossBefore + regularization(w, bounds, reviewCount);

  const stepScales = [0.25, 0.1, 0.04];
  const totalEvals = stepScales.length * w.length * 2;
  let evals = 0;

  for (const scale of stepScales) {
    for (let i = 0; i < w.length; i++) {
      const range = bounds[i][1] - bounds[i][0];
      // Bước nhảy tương đối theo giá trị hiện tại, tối thiểu theo độ rộng miền cho phép
      const step = Math.max(Math.abs(w[i]) * scale, range * scale * 0.05);

      for (const dir of [1, -1]) {
        const candidate = [...w];
        candidate[i] = clampParam(i, w[i] + dir * step);
        evals++;
        if (candidate[i] === w[i]) continue;

        const score = evaluateLoss(candidate, histories) + regularization(candidate, bounds, reviewCount);
        if (score < best) {
          best = score;
          w = candidate;
          break; // hướng này tốt, chuyển sang tham số tiếp theo
        }
      }
      onProgress?.(Math.min(0.99, evals / totalEvals));
      await yieldToUI();
    }
  }

  const lossAfter = evaluateLoss(w, histories);
  onProgress?.(1);

  return {
    weights: w.map((v) => Number(v.toFixed(4))),
    lossBefore: Number(lossBefore.toFixed(4)),
    lossAfter: Number(lossAfter.toFixed(4)),
    improvementPercent: lossBefore > 0 ? Number((((lossBefore - lossAfter) / lossBefore) * 100).toFixed(1)) : 0,
    reviewCount,
    itemCount: histories.length,
  };
}
