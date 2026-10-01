/**
 * Module tương thích ngược (Backward Compatibility)
 * Chuyển hướng các hàm tính toán sang chuẩn FSRS (Free Spaced Repetition Scheduler)
 */
import { ReviewRating } from '../types';
import {
  formatDate,
  getTodayDate,
  addDays,
  diffDays,
  formatRelativeDate,
  FSRS_RATING_CONFIG,
  updateCardFSRS,
  createDefaultFSRSCard,
} from './fsrs';

export { formatDate, getTodayDate, addDays, diffDays, formatRelativeDate, createDefaultFSRSCard };
export const RATING_CONFIG = FSRS_RATING_CONFIG;

export interface SM2Result {
  repetition: number;
  interval: number;
  easeFactor: number;
  nextReviewDate: string;
}

/**
 * Hàm SM-2 tương thích: Áp dụng thuật toán FSRS bên dưới
 */
export function calculateSM2(
  currentRepetition?: number,
  currentInterval?: number,
  currentEaseFactor?: number,
  rating: ReviewRating = 3
): SM2Result {
  const reps = currentRepetition ?? 0;
  const interval = currentInterval ?? 1;
  const easeFactor = currentEaseFactor ?? 2.5;

  const dummyCard = {
    ...createDefaultFSRSCard(),
    reps,
    scheduled_days: interval,
    difficulty: Math.max(1, Math.min(10, 11 - (easeFactor - 1.3) / 0.3)),
    repetition: reps,
    interval,
    easeFactor,
  };

  const { updatedCard, nextReviewDate } = updateCardFSRS(dummyCard, rating);

  return {
    repetition: updatedCard.reps,
    interval: updatedCard.scheduled_days,
    easeFactor: updatedCard.easeFactor ?? 2.5,
    nextReviewDate,
  };
}
