import type { Config } from '@netlify/functions';
import { GoogleGenAI } from '@google/genai';

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

async function callGeminiWithFallback(ai: GoogleGenAI, prompt: string) {
  let lastError: any = null;
  for (const model of GEMINI_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: 'application/json' },
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

function getOfflineItemData(trimmedQuery: string, type: 'vocab' | 'grammar') {
  if (type === 'vocab') {
    return {
      word: trimmedQuery,
      phonetic: `/${trimmedQuery.toLowerCase()}/`,
      meaning: `Ý nghĩa của từ "${trimmedQuery}"`,
      wordType: 'v',
      topic: 'Học thuật & Đời sống',
      example: `We should practice using ${trimmedQuery} consistently in our daily conversations.`,
      exampleVi: `Chúng ta nên thực hành sử dụng "${trimmedQuery}" đều đặn trong các cuộc đối thoại hàng ngày.`,
    };
  }
  return {
    title: trimmedQuery,
    grammarType: 'Cấu trúc & Mệnh đề',
    formula: `S + ${trimmedQuery} + O / V-ing`,
    explanation: `Cấu trúc "${trimmedQuery}" dùng để diễn tả hành động, ý định hoặc quan điểm trong tiếng Anh.`,
    example: `They demonstrated how ${trimmedQuery} is applied effectively in modern English.`,
    exampleVi: `Họ đã minh họa cách "${trimmedQuery}" được áp dụng hiệu quả trong tiếng Anh hiện đại.`,
  };
}

export default async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { query, type = 'vocab' } = await req.json();
  if (!query || typeof query !== 'string' || !query.trim()) {
    return Response.json({ success: false, message: 'Query is required.' }, { status: 400 });
  }

  const trimmedQuery = query.trim();
  const ai = getGeminiClient();

  if (!ai) {
    return Response.json({ success: true, source: 'offline_preset', data: getOfflineItemData(trimmedQuery, type) });
  }

  let prompt = '';
  if (type === 'vocab') {
    prompt = `You are an expert bilingual English-Vietnamese dictionary assistant.
For the English word/phrase "${trimmedQuery}", provide precise, high quality educational details.
Return ONLY raw JSON (no markdown formatting, no code blocks):
{
  "word": "${trimmedQuery}",
  "phonetic": "Standard IPA transcription e.g. /əˈkʌm.plɪʃ/",
  "meaning": "Natural, concise Vietnamese translation/meaning",
  "wordType": "One of: 'n' (noun), 'v' (verb), 'adj' (adjective), 'adv' (adverb), 'idiom', 'phrasal_verb'",
  "topic": "Appropriate topic name in Vietnamese e.g. Công việc, Du lịch, Học thuật, Công nghệ, Giao tiếp",
  "example": "A clear, natural, native-level English example sentence illustrating the word",
  "exampleVi": "Accurate Vietnamese translation of the example sentence"
}`;
  } else {
    prompt = `You are an expert English grammar instructor for Vietnamese learners.
For the English grammar concept or pattern "${trimmedQuery}", provide precise details.
Return ONLY raw JSON (no markdown formatting, no code blocks):
{
  "title": "${trimmedQuery}",
  "grammarType": "One of: 'Thì (Tense)', 'Câu điều kiện', 'Mệnh đề quan hệ', 'Câu bị động', 'Động từ khuyết thiếu', 'Cấu trúc so sánh', 'Đảo ngữ', 'Mệnh đề nhượng bộ', 'Cấu trúc'",
  "formula": "Standard formula e.g. S + have/has + V3/ed + O",
  "explanation": "Clear, concise Vietnamese explanation of when and how to use it (2-3 sentences)",
  "example": "A natural, native-level English sentence applying this exact formula",
  "exampleVi": "Accurate Vietnamese translation of the example sentence"
}`;
  }

  try {
    const response = await callGeminiWithFallback(ai, prompt);
    const parsed = JSON.parse(response.text || '{}');
    return Response.json({ success: true, source: 'gemini_api', data: parsed });
  } catch (err: any) {
    console.warn('Gemini card autofill fell back safely to offline preset:', err?.message || err);
    return Response.json({ success: true, source: 'offline_preset', data: getOfflineItemData(trimmedQuery, type) });
  }
};

export const config: Config = {
  path: '/api/ai/lookup-item',
};
