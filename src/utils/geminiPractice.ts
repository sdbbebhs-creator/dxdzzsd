/**
 * Client wrappers for the "Luyện Output" Gemini endpoint (/api/ai/context-practice).
 * The Gemini API key never reaches the browser — every call goes through the Netlify Function.
 */
import { evaluateSentenceOffline, evaluateGrammarSentenceOffline } from './contextEngine';
import { DEFAULT_TOPIC_NAMES, pickTopicsOffline } from './contextTopics';

export type PracticeKind = 'vocab' | 'grammar';

export const DEFAULT_CONTEXTS = DEFAULT_TOPIC_NAMES;

export interface SampleSentence {
  english: string;
  vietnamese: string;
}

export interface SentenceValidation {
  isCorrect: boolean;
  score: number;
  grammarCorrection: string;
  feedback: string;
  betterSuggestion: string;
}

export class PracticeApiError extends Error {
  constructor(message: string, public code: 'RATE_LIMITED' | 'NO_API_KEY' | 'AI_ERROR' | 'NETWORK') {
    super(message);
  }
  get isRateLimit() {
    return this.code === 'RATE_LIMITED';
  }
}

async function callPracticeApi<T>(payload: Record<string, unknown>): Promise<T> {
  let res: Response;
  try {
    res = await fetch('/api/ai/context-practice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new PracticeApiError('Không kết nối được máy chủ.', 'NETWORK');
  }
  const json = await res.json().catch(() => null);
  if (res.status === 429 || json?.code === 'RATE_LIMITED') {
    throw new PracticeApiError(json?.message || 'Gemini đang quá tải (429). Thử lại sau ít giây.', 'RATE_LIMITED');
  }
  if (!res.ok || !json?.success) {
    throw new PracticeApiError(json?.message || 'AI tạm thời không phản hồi.', json?.code === 'NO_API_KEY' ? 'NO_API_KEY' : 'AI_ERROR');
  }
  return json.data as T;
}

/** HÀM 1 — 5 ngữ cảnh chọn từ 20 nhóm chủ đề cố định. Lỗi / 429 → chọn offline theo từ khóa. */
export async function suggestDynamicContexts(
  word: string,
  definition: string,
  kind: PracticeKind = 'vocab'
): Promise<{ contexts: string[]; fromAI: boolean }> {
  try {
    const contexts = await callPracticeApi<string[]>({ action: 'suggestContexts', kind, word, definition });
    if (Array.isArray(contexts) && contexts.length >= 5) return { contexts: contexts.slice(0, 5), fromAI: true };
    throw new Error('Invalid contexts');
  } catch (err) {
    console.warn('suggestDynamicContexts → fallback tabs:', err);
    return { contexts: pickTopicsOffline(word, definition), fromAI: false };
  }
}

/** HÀM 2 — câu mẫu theo ngữ cảnh. Ném PracticeApiError để UI tự quyết định fallback. */
export async function generateSampleSentence(
  word: string,
  context: string,
  kind: PracticeKind = 'vocab',
  avoid?: string
): Promise<SampleSentence> {
  return callPracticeApi<SampleSentence>({ action: 'sampleSentence', kind, word, context, avoid });
}

/** HÀM 3 — chấm điểm câu người dùng. Lỗi AI → chấm offline cơ bản (thang 100). */
export async function validateUserSentence(
  word: string,
  context: string,
  userSentence: string,
  kind: PracticeKind = 'vocab',
  formula?: string
): Promise<{ result: SentenceValidation; fromAI: boolean; error?: PracticeApiError }> {
  try {
    const result = await callPracticeApi<SentenceValidation>({ action: 'validate', kind, word, context, userSentence });
    return { result, fromAI: true };
  } catch (err) {
    const offline =
      kind === 'grammar'
        ? evaluateGrammarSentenceOffline(word, formula || word, userSentence, context)
        : evaluateSentenceOffline(word, userSentence, context);
    return {
      fromAI: false,
      error: err instanceof PracticeApiError ? err : undefined,
      result: {
        isCorrect: offline.isCorrect,
        score: Math.round(offline.score * 10),
        grammarCorrection: offline.improvedSentence || userSentence,
        feedback: offline.feedbackVi,
        betterSuggestion: '',
      },
    };
  }
}
