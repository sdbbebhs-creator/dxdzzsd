export interface WordContext {
  id: number;
  domain: string;
  domainIcon: string;
  scenario: string;
  prompt: string;
  sampleSentence: string;
  sampleTranslation: string;
  collocation: string;
  hint: string;
}

export interface ContextEvaluationResult {
  isCorrect: boolean;
  score: number;
  feedbackVi: string;
  improvedSentence?: string;
  explanation?: string;
}

/**
 * Intelligent client-side Context Engine for generating 5 distinct real-world contexts
 * for any English vocabulary item based on its word, meaning, and part of speech.
 */
export function generateOfflineContexts(
  word: string,
  meaning: string,
  type?: string,
  topic?: string
): WordContext[] {
  const cleanWord = word.trim();
  const lower = cleanWord.toLowerCase();
  const pos = (type || 'n').toLowerCase();

  // Domain definitions
  return [
    {
      id: 1,
      domain: 'Đời sống hàng ngày (Daily Life & Casual)',
      domainIcon: 'MessageCircle',
      scenario: `Giao tiếp thường nhật, trò chuyện với bạn bè hoặc gia đình về các chủ đề đời sống (${topic || 'Sinh hoạt hằng ngày'}).`,
      prompt: `Hãy đặt 1 câu giao tiếp tự nhiên có chứa từ "${cleanWord}" khi nói về trải nghiệm hoặc cảm xúc của bạn.`,
      sampleSentence: createSampleSentence(cleanWord, pos, 1),
      sampleTranslation: createSampleTranslation(cleanWord, meaning, 1),
      collocation: `feel / be ${cleanWord}`,
      hint: `Dùng thì Hiện tại đơn hoặc Quá khứ đơn (Ví dụ: I always try to... / In my daily routine...).`,
    },
    {
      id: 2,
      domain: 'Công sở & Nơi làm việc (Workplace & Business)',
      domainIcon: 'Briefcase',
      scenario: `Môi trường công việc chuyên nghiệp, phỏng vấn tuyển dụng, họp nhóm hoặc báo cáo dự án.`,
      prompt: `Viết 1 câu áp dụng từ "${cleanWord}" trong bối cảnh công việc, giải quyết vấn đề hoặc làm việc nhóm.`,
      sampleSentence: createSampleSentence(cleanWord, pos, 2),
      sampleTranslation: createSampleTranslation(cleanWord, meaning, 2),
      collocation: `${cleanWord} in the workplace / professional environment`,
      hint: `Sử dụng ngôn ngữ lịch sự, chuyên nghiệp (Ví dụ: Our team demonstrates... / To succeed at work, one must...).`,
    },
    {
      id: 3,
      domain: 'Học thuật & Tranh luận (Academic & IELTS / Essays)',
      domainIcon: 'GraduationCap',
      scenario: `Viết bài luận học thuật, thảo luận nghiên cứu khoa học hoặc chuẩn bị bài thi IELTS / TOEFL Writing & Speaking.`,
      prompt: `Viết 1 câu văn học thuật hoặc luận điểm phân tích sử dụng từ "${cleanWord}".`,
      sampleSentence: createSampleSentence(cleanWord, pos, 3),
      sampleTranslation: createSampleTranslation(cleanWord, meaning, 3),
      collocation: `significant ${cleanWord} / plays a crucial role`,
      hint: `Dùng cấu trúc câu phức, liên từ chỉ nguyên nhân - kết quả (Ví dụ: Recent studies highlight... / It is widely argued that...).`,
    },
    {
      id: 4,
      domain: 'Công nghệ & Đời sống số (Technology & Modern Media)',
      domainIcon: 'Laptop',
      scenario: `Thời đại công nghệ số, mạng xã hội, trí tuệ nhân tạo (AI) và các xu hướng số hóa hiện đại.`,
      prompt: `Viết 1 câu liên hệ từ "${cleanWord}" với công nghệ, mạng internet hoặc chuyển đổi số.`,
      sampleSentence: createSampleSentence(cleanWord, pos, 4),
      sampleTranslation: createSampleTranslation(cleanWord, meaning, 4),
      collocation: `digital / modern ${cleanWord}`,
      hint: `Liên hệ với smartphone, mạng xã hội hoặc xu hướng công nghệ (Ví dụ: With rapid technological advancements,...).`,
    },
    {
      id: 5,
      domain: 'Thử thách cá nhân & Sáng tạo tự do (Personal Creative Output)',
      domainIcon: 'Sparkles',
      scenario: `Chia sẻ một câu chuyện có thật của bản thân, một bài học rút ra hoặc góc nhìn độc đáo của chính bạn.`,
      prompt: `Sáng tạo một câu mang dấu ấn cá nhân của bạn chứa "${cleanWord}" để ghi nhớ sâu sắc từ này.`,
      sampleSentence: createSampleSentence(cleanWord, pos, 5),
      sampleTranslation: createSampleTranslation(cleanWord, meaning, 5),
      collocation: `personally ${cleanWord} / a valuable lesson`,
      hint: `Viết về một kỷ niệm, mục tiêu tương lai hoặc một triết lý sống mà bạn tâm đắc.`,
    },
  ];
}

function createSampleSentence(word: string, pos: string, contextId: number): string {
  // Specialize based on known common samples
  const lower = word.toLowerCase();
  if (lower === 'resilient') {
    switch (contextId) {
      case 1: return 'Despite facing multiple setbacks today, she remained resilient and kept a warm smile.';
      case 2: return 'A resilient leader can guide the organization through unforeseen economic turbulence.';
      case 3: return 'Sociological research reveals that resilient communities recover significantly faster from natural disasters.';
      case 4: return 'Modern cloud infrastructure must be engineered to be highly resilient against cyberattacks.';
      case 5: return 'My grandmother taught me to be resilient, showing that patience always turns hardships into strength.';
    }
  }

  if (lower === 'serendipity') {
    switch (contextId) {
      case 1: return 'Running into my childhood neighbor at the supermarket was a delightful moment of serendipity.';
      case 2: return 'Some of our most groundbreaking business collaborations were born out of pure serendipity.';
      case 3: return 'Scientific history demonstrates that serendipity often sparks revolutionary discoveries, such as penicillin.';
      case 4: return 'Smart algorithms often create digital serendipity by recommending content we never knew we needed.';
      case 5: return 'I believe life is full of serendipity if we keep an open mind and a curious heart.';
    }
  }

  if (lower === 'meticulous') {
    switch (contextId) {
      case 1: return 'He took meticulous care when preparing dinner for his family on the weekend.';
      case 2: return 'The audit team conducted a meticulous review of all financial statements before submission.';
      case 3: return 'Academic peer review requires meticulous attention to experimental methodology and statistical validity.';
      case 4: return 'Software developers need to write meticulous code to avoid security vulnerabilities.';
      case 5: return 'Cultivating a meticulous habit in daily planning helped me achieve my long-term dreams.';
    }
  }

  if (lower === 'ubiquitous') {
    switch (contextId) {
      case 1: return 'Coffee shops have become ubiquitous in almost every street corner of the city.';
      case 2: return 'Remote communication tools are now ubiquitous across modern global enterprises.';
      case 3: return 'Scholars study the ubiquitous influence of mass advertising on adolescent consumer psychology.';
      case 4: return 'Artificial intelligence is becoming ubiquitous, seamlessly powering everything from smartphones to healthcare devices.';
      case 5: return 'Kindness should be ubiquitous; even a simple smile can illuminate someone else\'s cloudy day.';
    }
  }

  // Generic sentence constructor by Part of Speech
  switch (contextId) {
    case 1:
      if (pos.startsWith('v')) return `I make it a point to ${word} whenever I have free time at home.`;
      if (pos.startsWith('adj')) return `It was a very ${word} experience that my family will remember fondly.`;
      return `Having a good ${word} brings a lot of comfort to our daily routine.`;
    case 2:
      if (pos.startsWith('v')) return `Our department strives to ${word} efficiently to meet client expectations.`;
      if (pos.startsWith('adj')) return `Maintaining a ${word} approach is crucial for achieving quarterly team targets.`;
      return `Effective management of ${word} is essential for our corporate strategy.`;
    case 3:
      if (pos.startsWith('v')) return `Scholars argue that institutions must ${word} to sustain academic excellence.`;
      if (pos.startsWith('adj')) return `Empirical evidence indicates that ${word} factors exert a substantial influence on outcomes.`;
      return `The fundamental importance of ${word} has been thoroughly substantiated by recent literature.`;
    case 4:
      if (pos.startsWith('v')) return `Emerging tech startups continue to ${word} to stay ahead in the digital era.`;
      if (pos.startsWith('adj')) return `Modern users increasingly demand more ${word} digital platforms and mobile apps.`;
      return `The integration of ${word} into digital platforms is transforming user engagement.`;
    case 5:
    default:
      if (pos.startsWith('v')) return `Whenever I look back at my journey, I realize how important it was to ${word}.`;
      if (pos.startsWith('adj')) return `Staying ${word} helped me overcome personal doubts and pursue my true passion.`;
      return `Embracing ${word} in my own life has opened doors to unexpected opportunities.`;
  }
}

function createSampleTranslation(word: string, meaning: string, contextId: number): string {
  const firstMeaning = meaning.split(/[,;]/)[0].trim();
  switch (contextId) {
    case 1: return `Trong đời sống thường nhật, việc (${firstMeaning}) mang lại nhiều trải nghiệm ý nghĩa và tích cực.`;
    case 2: return `Trong môi trường công việc chuyên nghiệp, yếu tố (${firstMeaning}) đóng vai trò quyết định tới thành công của dự án.`;
    case 3: return `Trong nghiên cứu học thuật, việc phân tích (${firstMeaning}) giúp làm rõ các luận điểm khoa học quan trọng.`;
    case 4: return `Trong thời đại công nghệ số, (${firstMeaning}) đang thay đổi cách mọi người tương tác và làm việc.`;
    case 5: default: return `Từ trải nghiệm của bản thân, thấu hiểu (${firstMeaning}) là một bài học sâu sắc giúp tôi hoàn thiện mỗi ngày.`;
  }
}

/**
 * Checks whether user sentence contains the target word (or variants)
 */
export function checkWordUsageInSentence(word: string, sentence: string): boolean {
  if (!word || !sentence) return false;
  const cleanWord = word.trim().toLowerCase();
  const lowerSentence = sentence.toLowerCase();

  // Exact match
  if (lowerSentence.includes(cleanWord)) return true;

  // Stems / basic morphological variants (e.g. s, es, ed, ing, ly)
  const base = cleanWord.replace(/(e|ing|ed|s|es|ly)$/, '');
  if (base.length >= 3 && lowerSentence.includes(base)) {
    return true;
  }

  return false;
}

/**
 * Fast offline sentence evaluation with helpful feedback
 */
export function evaluateSentenceOffline(word: string, sentence: string, contextName: string): ContextEvaluationResult {
  const trimmed = sentence.trim();
  const hasWord = checkWordUsageInSentence(word, trimmed);
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;

  if (!hasWord) {
    return {
      isCorrect: false,
      score: 4,
      feedbackVi: `Câu của bạn chưa chứa từ vựng mục tiêu "${word}". Hãy lồng ghép từ này vào câu của mình nhé!`,
      improvedSentence: `${sentence} (hãy thêm từ "${word}")`,
      explanation: `Yêu cầu output bắt buộc câu của bạn phải sử dụng từ vựng đang ôn tập.`,
    };
  }

  if (wordCount < 4) {
    return {
      isCorrect: false,
      score: 5,
      feedbackVi: `Câu hơi ngắn (${wordCount} từ). Hãy mở rộng thêm một chút để diễn đạt ngữ cảnh ${contextName} đầy đủ hơn nhé!`,
      improvedSentence: sentence,
      explanation: `Một câu hoàn chỉnh nên có chủ ngữ, vị ngữ và ngữ cảnh rõ ràng.`,
    };
  }

  // Good sentence
  const isCapitalized = /^[A-Z]/.test(trimmed);
  const hasPunctuation = /[.!?]$/.test(trimmed);

  let feedbackVi = `Rất tốt! Bạn đã sử dụng chính xác từ "${word}" trong bối cảnh ${contextName}.`;
  if (!isCapitalized || !hasPunctuation) {
    feedbackVi += ` Góp ý nhỏ: Hãy nhớ viết hoa đầu câu và có dấu chấm kết thúc nhé!`;
  }

  return {
    isCorrect: true,
    score: isCapitalized && hasPunctuation ? 9 : 8,
    feedbackVi,
    improvedSentence: isCapitalized && hasPunctuation ? trimmed : `${trimmed.charAt(0).toUpperCase() + trimmed.slice(1)}${hasPunctuation ? '' : '.'}`,
    explanation: `Câu tự nhiên, đáp ứng đúng yêu cầu của bối cảnh ${contextName}.`,
  };
}

/**
 * Intelligent client-side Context Engine for generating 5 distinct real-world contexts
 * for any English Grammar structure based on its title, formula, explanation, and example.
 */
export function generateOfflineGrammarContexts(
  title: string,
  formula: string,
  explanation: string,
  type?: string,
  example?: string
): WordContext[] {
  const cleanTitle = title.trim();
  const cleanFormula = formula.trim();

  // Smart sample sentences for grammar
  const sample1 = example && example.trim().length > 0 ? example : `In daily conversation, we often say that practice makes perfect.`;
  const sample2 = `Our company has implemented the new policy to ensure that deadlines are met consistently.`;
  const sample3 = `Scholars argue that unless systemic reforms are introduced, socio-economic disparities will persist.`;
  const sample4 = `Modern algorithms are designed so that user privacy can be safeguarded across digital ecosystems.`;
  const sample5 = `Looking back on my learning journey, I realize that whenever I faced difficulties, perseverance kept me going.`;

  return [
    {
      id: 1,
      domain: 'Đời sống hàng ngày (Daily Life & Casual)',
      domainIcon: 'MessageCircle',
      scenario: `Giao tiếp sinh hoạt thân mật thường nhật, chia sẻ thói quen, cảm xúc hoặc câu chuyện với bạn bè, người thân.`,
      prompt: `Hãy viết 1 câu giao tiếp đời thường áp dụng cấu trúc ngữ pháp "${cleanTitle}" [${cleanFormula}].`,
      sampleSentence: sample1,
      sampleTranslation: `Câu áp dụng cấu trúc ngữ pháp trong tình huống giao tiếp thân mật đời thường.`,
      collocation: `Cấu trúc: ${cleanFormula}`,
      hint: `Sử dụng cấu trúc vào hoàn cảnh gần gũi (thói quen, gia đình, thời tiết, sở thích).`,
    },
    {
      id: 2,
      domain: 'Công sở & Nơi làm việc (Workplace & Business)',
      domainIcon: 'Briefcase',
      scenario: `Môi trường làm việc chuyên nghiệp, viết email công việc, trao đổi với đồng nghiệp hoặc báo cáo dự án.`,
      prompt: `Viết 1 câu công việc lịch sự, mạch lạc sử dụng điểm ngữ pháp "${cleanTitle}".`,
      sampleSentence: sample2,
      sampleTranslation: `Áp dụng chuẩn xác trong môi trường công sở, viết email và phối hợp công việc.`,
      collocation: `Chuyên nghiệp: ${cleanFormula}`,
      hint: `Kết hợp với từ vựng công sở (deadline, project, team, client, target).`,
    },
    {
      id: 3,
      domain: 'Học thuật & Tranh luận (Academic & IELTS / Essays)',
      domainIcon: 'GraduationCap',
      scenario: `Viết bài luận học thuật, luận điểm IELTS Writing Task 2 hoặc bài thi chứng chỉ quốc tế.`,
      prompt: `Tạo 1 câu văn học thuật mang tính phân tích, lập luận vững chắc áp dụng cấu trúc "${cleanTitle}".`,
      sampleSentence: sample3,
      sampleTranslation: `Cấu trúc câu phức học thuật giúp nâng band điểm ngữ pháp trong IELTS/bài luận.`,
      collocation: `Học thuật: ${cleanFormula}`,
      hint: `Sử dụng mệnh đề phức, liên từ nối (furthermore, however, in consequence).`,
    },
    {
      id: 4,
      domain: 'Công nghệ & Đời sống số (Technology & Modern Media)',
      domainIcon: 'Laptop',
      scenario: `Chủ đề mạng xã hội, ứng dụng di động, trí tuệ nhân tạo (AI) và cách mạng số.`,
      prompt: `Viết 1 câu bàn về công nghệ hoặc mạng xã hội có vận dụng cấu trúc "${cleanTitle}".`,
      sampleSentence: sample4,
      sampleTranslation: `Vận dụng cấu trúc ngữ pháp vào bình luận công nghệ hiện đại.`,
      collocation: `Kỹ thuật số: ${cleanFormula}`,
      hint: `Liên hệ với AI, smartphone, online learning hoặc an toàn mạng.`,
    },
    {
      id: 5,
      domain: 'Kể chuyện & Trải nghiệm cá nhân (Personal Storytelling)',
      domainIcon: 'Sparkles',
      scenario: `Tự do sáng tạo, kể một kỷ niệm đáng nhớ, bài học cuộc sống hoặc mục tiêu tương lai của bạn.`,
      prompt: `Viết 1 câu chia sẻ trải nghiệm chân thật của bạn, sử dụng chính xác cấu trúc "${cleanTitle}".`,
      sampleSentence: sample5,
      sampleTranslation: `Gắn ngữ pháp với cảm xúc và câu chuyện thực tế của chính bạn để ghi nhớ sâu sắc.`,
      collocation: `Trải nghiệm: ${cleanFormula}`,
      hint: `Viết từ góc nhìn ngôi thứ nhất (I, my journey, whenever I...).`,
    },
  ];
}

/**
 * Fast offline grammar sentence evaluation
 */
export function evaluateGrammarSentenceOffline(
  grammarTitle: string,
  formula: string,
  sentence: string,
  contextName: string
): ContextEvaluationResult {
  const trimmed = sentence.trim();
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;

  if (wordCount < 4) {
    return {
      isCorrect: false,
      score: 5,
      feedbackVi: `Câu hơi ngắn (${wordCount} từ). Hãy viết câu hoàn chỉnh (có chủ ngữ, vị ngữ) vận dụng cấu trúc "${grammarTitle}"!`,
      improvedSentence: sentence,
      explanation: `Một câu hoàn chỉnh để thực hành ngữ pháp cần diễn đạt được ý nghĩa trọn vẹn.`,
    };
  }

  const isCapitalized = /^[A-Z]/.test(trimmed);
  const hasPunctuation = /[.!?]$/.test(trimmed);

  let feedbackVi = `Tuyệt vời! Bạn đã vận dụng cấu trúc "${grammarTitle}" vào bối cảnh ${contextName}.`;
  if (!isCapitalized || !hasPunctuation) {
    feedbackVi += ` Lưu ý: Nhớ viết hoa chữ cái đầu câu và có dấu kết thúc câu (. / ! / ?).`;
  }

  return {
    isCorrect: true,
    score: isCapitalized && hasPunctuation ? 9 : 8,
    feedbackVi,
    improvedSentence: isCapitalized && hasPunctuation ? trimmed : `${trimmed.charAt(0).toUpperCase() + trimmed.slice(1)}${hasPunctuation ? '' : '.'}`,
    explanation: `Câu tự nhiên và áp dụng đúng cấu trúc trong bối cảnh ${contextName}.`,
  };
}

