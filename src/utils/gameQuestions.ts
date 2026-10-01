import { VocabItem, GrammarItem } from '../types';

export interface GameQuestion {
  id: string;
  sourceType: 'vocab' | 'grammar';
  title: string;
  prompt: string;
  promptVi?: string;
  targetSubject: string;
  options: {
    id: string;
    text: string;
    subText?: string;
    isCorrect: boolean;
  }[];
  correctAnswerText: string;
  explanation: string;
  pronounceText?: string;
  audioUrl?: string;
  rawItem?: VocabItem | GrammarItem;
}

// Built-in backup templates used strictly as distractors for wrong options when user has < 4 items
const FALLBACK_VOCAB: Partial<VocabItem>[] = [
  { word: 'perseverance', meaning: 'sự kiên trì, bền chí', phonetic: '/ˌpɜːsɪˈvɪərəns/', example: 'Perseverance is key to mastering English.' },
  { word: 'resilience', meaning: 'khả năng phục hồi, kiên cường', phonetic: '/rɪˈzɪliəns/', example: 'She showed great courage and resilience.' },
  { word: 'ubiquitous', meaning: 'phổ biến ở khắp mọi nơi', phonetic: '/juːˈbɪkwɪtəs/', example: 'Smartphones are now ubiquitous.' },
  { word: 'meticulous', meaning: 'tỉ mỉ, cẩn thận từng chi tiết', phonetic: '/məˈtɪkjələs/', example: 'He is meticulous in his research.' },
  { word: 'lucid', meaning: 'rõ ràng, minh bạch, dễ hiểu', phonetic: '/ˈluːsɪd/', example: 'His explanation was very lucid.' },
  { word: 'innovative', meaning: 'mang tính sáng tạo, đổi mới', phonetic: '/ˈɪnəveɪtɪv/', example: 'The company is known for innovative ideas.' },
  { word: 'articulate', meaning: 'diễn đạt lưu loát, rõ ràng', phonetic: '/ɑːˈtɪkjələt/', example: 'She is an articulate speaker.' },
  { word: 'comprehend', meaning: 'thấu hiểu, lĩnh hội toàn diện', phonetic: '/ˌkɒmprɪˈhend/', example: 'He could barely comprehend the reality.' },
  { word: 'fascinating', meaning: 'lôi cuốn, quyến rũ, hấp dẫn', phonetic: '/ˈfæsɪneɪtɪŋ/', example: 'The universe is truly fascinating.' },
  { word: 'collaborate', meaning: 'hợp tác, phối hợp cùng làm', phonetic: '/kəˈlæbəreɪt/', example: 'We collaborate with partners worldwide.' },
  { word: 'accelerate', meaning: 'tăng tốc, thúc đẩy nhanh hơn', phonetic: '/əkˈseləreɪt/', example: 'Technology helps accelerate our growth.' },
  { word: 'versatile', meaning: 'đa năng, linh hoạt nhiều vai trò', phonetic: '/ˈvɜːsətaɪl/', example: 'He is a versatile and talented player.' },
];

const FALLBACK_GRAMMAR: Partial<GrammarItem>[] = [
  {
    title: 'Thì Quá khứ hoàn thành (Past Perfect)',
    formula: 'S + had + V3/ed',
    explanation: 'Diễn tả hành động xảy ra và kết thúc trước một hành động khác trong quá khứ.',
    example: 'By the time she arrived, the train had left.',
  },
  {
    title: 'Câu điều kiện loại 2 (Conditional Type 2)',
    formula: 'If + S + V2/ed, S + would/could + V-bare',
    explanation: 'Diễn tả điều giả định trái ngược với thực tế ở hiện tại.',
    example: 'If I had a million dollars, I would travel the world.',
  },
  {
    title: 'Cấu trúc Used to',
    formula: 'S + used to + V-bare',
    explanation: 'Chỉ thói quen hoặc tình trạng đã từng xảy ra trong quá khứ nhưng giờ không còn.',
    example: 'I used to live in London when I was young.',
  },
  {
    title: 'Mệnh đề quan hệ rút gọn (V-ing / V3-ed)',
    formula: 'N + V-ing (chủ động) / V3-ed (bị động)',
    explanation: 'Rút gọn mệnh đề quan hệ dạng chủ động dùng V-ing, bị động dùng V-ed.',
    example: 'The boy playing guitar over there is my brother.',
  },
  {
    title: 'Câu bị động Hiện tại hoàn thành (Passive Present Perfect)',
    formula: 'S + have/has + been + V3/ed',
    explanation: 'Diễn tả hành động đã được hoàn tất bởi đối tượng nào đó và kết quả còn lưu lại.',
    example: 'The project has been completed successfully.',
  },
  {
    title: 'Cấu trúc It is time + S + V2/ed',
    formula: 'It is time + S + V2/ed',
    explanation: 'Đã đến lúc ai đó nên làm điều gì (thể hiện sự khẩn cấp hoặc nhắc nhở).',
    example: 'It is time we went home before it rains.',
  },
];

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function generateGameQuestions(params: {
  vocabList: VocabItem[];
  grammarList: GrammarItem[];
  mode: 'all' | 'vocab' | 'grammar';
  dueOnly?: boolean;
  todayDate: string;
  topic?: string;
  limit?: number;
}): GameQuestion[] {
  const { vocabList, grammarList, mode, dueOnly = false, todayDate, topic, limit } = params;

  // STRICT REQUIREMENT:
  // Khi không có từ vựng hay ngữ pháp, game SẼ KHÔNG CÓ DỮ LIỆU KIẾN THỨC ĐỂ CHƠI (trả về mảng rỗng)!
  let filteredVocab = [...vocabList];
  let filteredGrammar = [...grammarList];

  // Lọc theo chủ đề (nếu người dùng chọn chủ đề cụ thể)
  if (topic && topic !== 'all') {
    const normTopic = topic.trim().toLowerCase();
    filteredVocab = filteredVocab.filter(
      (v) => v.topic && v.topic.trim().toLowerCase() === normTopic
    );
    filteredGrammar = filteredGrammar.filter(
      (g) =>
        (g.type && g.type.trim().toLowerCase() === normTopic) ||
        (g.title && g.title.trim().toLowerCase().includes(normTopic))
    );
  }

  // Lọc theo ngày đến hạn ôn (nếu chọn chế độ thẻ đến hạn)
  if (dueOnly) {
    filteredVocab = filteredVocab.filter((v) => v.reviewDate <= todayDate);
    filteredGrammar = filteredGrammar.filter((g) => g.reviewDate <= todayDate);
  }

  // Nếu danh sách không có dữ liệu thực tế từ người dùng, trả về rỗng ngay lập tức!
  if (mode === 'vocab' && filteredVocab.length === 0) {
    return [];
  }
  if (mode === 'grammar' && filteredGrammar.length === 0) {
    return [];
  }
  if (mode === 'all' && filteredVocab.length === 0 && filteredGrammar.length === 0) {
    return [];
  }

  const candidateVocab = mode === 'all' || mode === 'vocab' ? filteredVocab : [];
  const candidateGrammar = mode === 'all' || mode === 'grammar' ? filteredGrammar : [];

  // Kho distractor cho phương án sai: ưu tiên dữ liệu của chính người dùng
  const allVocabMeanings = Array.from(
    new Set([...vocabList.map((v) => v.meaning), ...(FALLBACK_VOCAB.map((v) => v.meaning || ''))])
  ).filter(Boolean);

  const allVocabWords = Array.from(
    new Set([...vocabList.map((v) => v.word), ...(FALLBACK_VOCAB.map((v) => v.word || ''))])
  ).filter(Boolean);

  const allGrammarFormulas = Array.from(
    new Set([
      ...grammarList.map((g) => g.formula || ''),
      ...(FALLBACK_GRAMMAR.map((g) => g.formula || '')),
      'S + will + V-bare',
      'S + have/has + V3/ed',
      'S + am/is/are + V-ing',
      'S + was/were + V-ing',
      'S + had + V3/ed',
      'S + modal + V-bare',
    ])
  ).filter(Boolean);

  const allGrammarTitles = Array.from(
    new Set([
      ...grammarList.map((g) => g.title),
      ...(FALLBACK_GRAMMAR.map((g) => g.title || '')),
    ])
  ).filter(Boolean);

  const questions: GameQuestion[] = [];

  // Tạo câu hỏi Từ vựng từ dữ liệu thực tế
  if (candidateVocab.length > 0) {
    const shuffledVocab = shuffle(candidateVocab);
    shuffledVocab.forEach((item, index) => {
      const qSeed = Math.random().toString(36).slice(2, 7);

      // Loại 1: Cho từ tiếng Anh -> Bắn nghĩa tiếng Việt
      const wrongMeanings = allVocabMeanings.filter((m) => m !== item.meaning);
      const selectedWrongMeanings = shuffle(wrongMeanings).slice(0, 3);

      const options = shuffle([
        { id: `opt_v1_${index}_c_${qSeed}`, text: item.meaning, isCorrect: true },
        ...selectedWrongMeanings.map((w, idx) => ({
          id: `opt_v1_${index}_w${idx}_${qSeed}`,
          text: w,
          isCorrect: false,
        })),
      ]);

      questions.push({
        id: `q_v1_${item.id || index}_${qSeed}`,
        sourceType: 'vocab',
        title: 'Bắn trúng Nghĩa tiếng Việt!',
        prompt: item.word,
        promptVi: item.phonetic ? `Phiên âm: ${item.phonetic}` : undefined,
        targetSubject: item.word,
        options,
        correctAnswerText: item.meaning,
        explanation: `"${item.word}" có nghĩa là "${item.meaning}"`,
        pronounceText: item.word,
        audioUrl: item.audioUrl,
        rawItem: item,
      });

      // Loại 2: Cho nghĩa tiếng Việt -> Bắn từ tiếng Anh
      const wrongWords = allVocabWords.filter((w) => w.toLowerCase() !== item.word.toLowerCase());
      const selectedWrongWords = shuffle(wrongWords).slice(0, 3);

      const wordOptions = shuffle([
        { id: `opt_v2_${index}_c_${qSeed}`, text: item.word, subText: item.phonetic, isCorrect: true },
        ...selectedWrongWords.map((w, idx) => ({
          id: `opt_v2_${index}_w${idx}_${qSeed}`,
          text: w,
          isCorrect: false,
        })),
      ]);

      questions.push({
        id: `q_v2_${item.id || index}_${qSeed}`,
        sourceType: 'vocab',
        title: 'Bắn trúng Từ vựng tiếng Anh!',
        prompt: item.meaning,
        targetSubject: item.meaning,
        options: wordOptions,
        correctAnswerText: item.word,
        explanation: `"${item.meaning}" trong tiếng Anh là "${item.word}" ${item.phonetic || ''}`,
        pronounceText: item.word,
        audioUrl: item.audioUrl,
        rawItem: item,
      });

      // Loại 3: Điền từ vào câu ví dụ (nếu có câu ví dụ)
      if (item.example && item.example.toLowerCase().includes(item.word.toLowerCase())) {
        const regex = new RegExp(`\\b${item.word}\\b`, 'gi');
        const blankedSentence = item.example.replace(regex, '_______');
        if (blankedSentence !== item.example) {
          const wrongFillers = allVocabWords.filter((w) => w.toLowerCase() !== item.word.toLowerCase());
          const fillOptions = shuffle([
            { id: `opt_v3_${index}_c_${qSeed}`, text: item.word, isCorrect: true },
            ...shuffle(wrongFillers).slice(0, 3).map((w, idx) => ({
              id: `opt_v3_${index}_w${idx}_${qSeed}`,
              text: w,
              isCorrect: false,
            })),
          ]);

          questions.push({
            id: `q_v3_${item.id || index}_${qSeed}`,
            sourceType: 'vocab',
            title: 'Bắn từ khuyết vào câu!',
            prompt: blankedSentence,
            promptVi: item.exampleVi || item.meaning,
            targetSubject: blankedSentence,
            options: fillOptions,
            correctAnswerText: item.word,
            explanation: `Đáp án: "${item.word}" -> "${item.example}"`,
            pronounceText: item.example,
            rawItem: item,
          });
        }
      }
    });
  }

  // Tạo câu hỏi Ngữ pháp từ dữ liệu thực tế
  if (candidateGrammar.length > 0) {
    const shuffledGrammar = shuffle(candidateGrammar);
    shuffledGrammar.forEach((gItem, index) => {
      const qSeed = Math.random().toString(36).slice(2, 7);
      const targetFormula = gItem.formula || 'S + V + O';

      // Loại G1: Tên cấu trúc -> Bắn công thức
      const wrongFormulas = allGrammarFormulas.filter((f) => f !== targetFormula);
      const options = shuffle([
        { id: `opt_g1_${index}_c_${qSeed}`, text: targetFormula, isCorrect: true },
        ...shuffle(wrongFormulas).slice(0, 3).map((f, idx) => ({
          id: `opt_g1_${index}_w${idx}_${qSeed}`,
          text: f,
          isCorrect: false,
        })),
      ]);

      questions.push({
        id: `q_g1_${gItem.id || index}_${qSeed}`,
        sourceType: 'grammar',
        title: 'Bắn công thức cấu trúc!',
        prompt: gItem.title,
        promptVi: gItem.explanation,
        targetSubject: gItem.title,
        options,
        correctAnswerText: targetFormula,
        explanation: `${gItem.title}: ${targetFormula}. ${gItem.explanation}`,
        pronounceText: gItem.example || gItem.title,
        audioUrl: gItem.audioUrl,
        rawItem: gItem,
      });

      // Loại G2: Câu ví dụ ứng dụng
      if (gItem.example && gItem.example.length > 8) {
        const wrongTitles = allGrammarTitles.filter((t) => t !== gItem.title);
        questions.push({
          id: `q_g2_${gItem.id || index}_${qSeed}`,
          sourceType: 'grammar',
          title: 'Bắn điểm ngữ pháp ứng dụng!',
          prompt: gItem.example,
          promptVi: gItem.exampleVi || gItem.explanation,
          targetSubject: gItem.example,
          options: shuffle([
            { id: `opt_g2_${index}_c_${qSeed}`, text: gItem.title, isCorrect: true },
            ...shuffle(wrongTitles).slice(0, 3).map((t, idx) => ({
              id: `opt_g2_${index}_w${idx}_${qSeed}`,
              text: t,
              isCorrect: false,
            })),
          ]),
          correctAnswerText: gItem.title,
          explanation: `Ví dụ: "${gItem.example}" thuộc cấu trúc "${gItem.title}". ${gItem.formula ? `(${gItem.formula})` : ''}`,
          pronounceText: gItem.example,
          audioUrl: gItem.audioUrl,
          rawItem: gItem,
        });
      }
    });
  }

  const randomized = shuffle(questions);
  if (limit && limit > 0) {
    return randomized.slice(0, limit);
  }
  // If limit is not set or 0 (chơi hết), return all questions!
  return randomized;
}
