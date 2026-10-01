import type { Config } from '@netlify/functions';
import { GoogleGenAI } from '@google/genai';
import {
  RHYTHM_ELIGIBLE_REVIEWS,
  buildRhythmMessage,
  clampRetention,
  recommendRetention,
  type RhythmInput,
} from '../../src/utils/memoryRhythm';

const GEMINI_MODELS = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'] as const;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });
}

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    recommended_target_retention: { type: 'NUMBER' },
    user_message: { type: 'STRING' },
  },
  required: ['recommended_target_retention', 'user_message'],
};

async function callGeminiWithFallback(ai: GoogleGenAI, prompt: string) {
  let lastError: any = null;
  for (const model of GEMINI_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema: RESPONSE_SCHEMA },
      });
      if (response && response.text) return response;
    } catch (err: any) {
      lastError = err;
      const code = err?.status || err?.code || err?.error?.code;
      const msg = String(err?.message || '');
      const isTransient =
        code === 503 || code === 429 || msg.includes('503') || msg.includes('high demand') ||
        msg.includes('UNAVAILABLE') || msg.includes('RESOURCE_EXHAUSTED');
      if (isTransient) {
        await new Promise((resolve) => setTimeout(resolve, 350));
        continue;
      }
    }
  }
  throw lastError;
}

export default async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
  const input: RhythmInput = {
    total_reviews: Math.max(0, Math.round(num(body.total_reviews, 0))),
    measured_reviews: Math.max(0, Math.round(num(body.measured_reviews, 0))),
    actual_retention: Math.min(100, Math.max(0, num(body.actual_retention, 0))),
    target_retention: Math.min(95, Math.max(80, num(body.target_retention, 90))),
    daily_cards: Math.max(0, Math.round(num(body.daily_cards, 0))),
    user_goal: String(body.user_goal || 'Học dài hạn / Bền vững').slice(0, 200),
  };

  // Con số đề xuất luôn được tính bằng quy tắc cố định (giống hệt trên trình duyệt)
  const rec = recommendRetention(input);
  const fallbackData = {
    is_eligible_for_optimization: rec.is_eligible_for_optimization,
    recommended_target_retention: rec.recommended_target_retention,
    status_code: rec.status_code,
    user_message: buildRhythmMessage(input, rec),
  };

  const ai = getGeminiClient();
  if (!ai) {
    return Response.json({ success: true, source: 'local_deterministic', data: fallbackData });
  }

  const recPct = Math.round(rec.recommended_target_retention * 100);
  const prompt = `Bạn là "Trợ lý Đo Nhịp Trí Nhớ" trong một ứng dụng học từ vựng bằng lặp lại ngắt quãng.
Hệ thống đã tính sẵn mức ghi nhớ mục tiêu khuyên dùng. Nhiệm vụ của bạn là viết lời giải thích thân thiện cho người học.

--- DỮ LIỆU ---
- Tổng số lượt ôn: ${input.total_reviews} (mốc hiểu rõ nhịp nhớ: ${RHYTHM_ELIGIBLE_REVIEWS})
- Số lượt ôn lại dùng để đo: ${input.measured_reviews}
- Tỷ lệ nhớ thực tế khi ôn lại: ${input.measured_reviews > 0 ? `${input.actual_retention}%` : 'chưa đo được'}
- Mục tiêu ghi nhớ hiện tại: ${input.target_retention}%
- Số thẻ ôn trung bình mỗi ngày học: ${input.daily_cards}
- Mục tiêu học tập: ${input.user_goal}
- Mức khuyên dùng do hệ thống tính: ${recPct}% (trạng thái: ${rec.status_code})
- Lý do: ${rec.reasons.join(' ')}

--- YÊU CẦU ---
- recommended_target_retention: giữ nguyên ${rec.recommended_target_retention} trừ khi có lý do rất rõ ràng; chỉ được lệch tối đa 0.02 và nằm trong 0.80–0.95.
- user_message: tối đa 3 câu, tiếng Việt, thân thiện, không dùng thuật ngữ kỹ thuật (FSRS, tham số w, log-loss). Nêu mức khuyên dùng và lợi ích cụ thể (nhớ chắc hơn hay bớt số thẻ phải ôn).`;

  try {
    const response = await callGeminiWithFallback(ai, prompt);
    const parsed = JSON.parse(response.text || '{}');
    const aiRetention =
      typeof parsed.recommended_target_retention === 'number' ? parsed.recommended_target_retention : NaN;
    const recommended = Number.isFinite(aiRetention)
      ? clampRetention(
          Math.min(rec.recommended_target_retention + 0.02, Math.max(rec.recommended_target_retention - 0.02, aiRetention))
        )
      : rec.recommended_target_retention;
    const message = typeof parsed.user_message === 'string' && parsed.user_message.trim() ? parsed.user_message.trim() : '';
    return Response.json({
      success: true,
      source: 'gemini_api',
      data: {
        ...fallbackData,
        recommended_target_retention: recommended,
        // Nếu AI đổi con số, lời nhắn mặc định không còn khớp nên chỉ dùng lời nhắn của AI
        user_message: message || (recommended === rec.recommended_target_retention ? fallbackData.user_message : `Mức nhớ ${Math.round(recommended * 100)}% là lựa chọn phù hợp với bạn lúc này.`),
      },
    });
  } catch (err: any) {
    console.warn('Gemini memory-rhythm message fell back to offline engine:', err?.message || err);
    return Response.json({ success: true, source: 'fallback_offline', data: fallbackData });
  }
};

export const config: Config = {
  path: '/api/ai/optimize-fsrs',
};
