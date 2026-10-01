import { VocabItem, GrammarItem, SyncConfig } from '../types';
import { getTodayDate, State } from './fsrs';

const DB_NAME = 'SmartReviewDB_v2';
const DB_VERSION = 1;
const VOCAB_STORE = 'vocab_items';
const GRAMMAR_STORE = 'grammar_items';
const CONFIG_STORE = 'app_config';

const LOCAL_STORAGE_KEY_VOCAB = 'vocab_data_v2_backup';
const LOCAL_STORAGE_KEY_GRAMMAR = 'grammar_data_v2_backup';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const timer = setTimeout(() => {
      reject(new Error('IndexedDB open timeout'));
    }, 1200);

    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onblocked = () => {
        clearTimeout(timer);
        reject(new Error('IndexedDB blocked'));
      };
      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(VOCAB_STORE)) {
          db.createObjectStore(VOCAB_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(GRAMMAR_STORE)) {
          db.createObjectStore(GRAMMAR_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(CONFIG_STORE)) {
          db.createObjectStore(CONFIG_STORE, { keyPath: 'key' });
        }
      };
      request.onsuccess = () => {
        clearTimeout(timer);
        resolve(request.result);
      };
      request.onerror = () => {
        clearTimeout(timer);
        reject(request.error || new Error('IndexedDB request error'));
      };
    } catch (err) {
      clearTimeout(timer);
      reject(err);
    }
  });
}

/**
 * Đảm bảo mọi thẻ khi tải lên đều sở hữu đủ 8 trường FSRS chuẩn
 */
export function ensureFSRSCard<T extends VocabItem | GrammarItem>(item: any): T {
  const reps = typeof item.reps === 'number' ? item.reps : (item.repetition || 0);
  const scheduledDays = typeof item.scheduled_days === 'number' ? item.scheduled_days : (item.interval || 0);
  const state = typeof item.state === 'number' ? item.state : (reps > 0 ? State.Review : State.New);

  return {
    ...item,
    stability: typeof item.stability === 'number' ? item.stability : 0,
    difficulty: typeof item.difficulty === 'number' ? item.difficulty : 0,
    elapsed_days: typeof item.elapsed_days === 'number' ? item.elapsed_days : 0,
    scheduled_days: scheduledDays,
    reps,
    lapses: typeof item.lapses === 'number' ? item.lapses : 0,
    state,
    last_review: item.last_review || item.lastReviewed,
    next_review: item.next_review || (item.reviewDate ? new Date(`${item.reviewDate}T00:00:00`).toISOString() : new Date().toISOString()),
    reviewDate: item.reviewDate || getTodayDate(),

    // Tương thích ngược
    repetition: reps,
    interval: scheduledDays,
    easeFactor: item.easeFactor || 2.5,

    // 5 Ngữ Cảnh Output Requirement
    completedContextsCount: typeof item.completedContextsCount === 'number' ? item.completedContextsCount : 0,
    contextOutputs: item.contextOutputs || {},
    lastOutputDate: item.lastOutputDate,
  } as T;
}

export const ensureFSRSVocab = (item: any): VocabItem => ensureFSRSCard<VocabItem>(item);
export const ensureFSRSGrammar = (item: any): GrammarItem => ensureFSRSCard<GrammarItem>(item);

const LOCAL_STORAGE_KEY_VOCAB_SAVED_AT = 'vocab_data_v2_saved_at';
const LOCAL_STORAGE_KEY_GRAMMAR_SAVED_AT = 'grammar_data_v2_saved_at';
const IDB_PLACEHOLDER = '[IndexedDB-stored]';

type ListSpec = { store: string; lsKey: string; lsSavedAtKey: string };
const VOCAB_SPEC: ListSpec = { store: VOCAB_STORE, lsKey: LOCAL_STORAGE_KEY_VOCAB, lsSavedAtKey: LOCAL_STORAGE_KEY_VOCAB_SAVED_AT };
const GRAMMAR_SPEC: ListSpec = { store: GRAMMAR_STORE, lsKey: LOCAL_STORAGE_KEY_GRAMMAR, lsSavedAtKey: LOCAL_STORAGE_KEY_GRAMMAR_SAVED_AT };

function readLocalList(spec: ListSpec): { items: any[] | null; savedAt: number } {
  try {
    const raw = localStorage.getItem(spec.lsKey);
    const parsed = raw ? JSON.parse(raw) : null;
    return {
      items: Array.isArray(parsed) ? parsed : null,
      savedAt: Number(localStorage.getItem(spec.lsSavedAtKey)) || 0,
    };
  } catch {
    return { items: null, savedAt: 0 };
  }
}

function readIDBList(spec: ListSpec): Promise<{ items: any[]; savedAt: number } | null> {
  return openDB()
    .then(
      (db) =>
        new Promise<{ items: any[]; savedAt: number } | null>((resolve) => {
          const timer = setTimeout(() => resolve(null), 1500);
          try {
            const tx = db.transaction([spec.store, CONFIG_STORE], 'readonly');
            const itemsReq = tx.objectStore(spec.store).getAll();
            const metaReq = tx.objectStore(CONFIG_STORE).get(`${spec.store}_saved_at`);
            tx.oncomplete = () => {
              clearTimeout(timer);
              resolve({ items: (itemsReq.result as any[]) || [], savedAt: Number(metaReq.result?.value) || 0 });
            };
            tx.onerror = () => {
              clearTimeout(timer);
              resolve(null);
            };
          } catch {
            clearTimeout(timer);
            resolve(null);
          }
        })
    )
    .catch(() => null);
}

/**
 * Đọc bản lưu MỚI NHẤT trên máy. localStorage được ghi đồng bộ ngay khi dữ liệu đổi,
 * còn IndexedDB ghi bất đồng bộ (có thể chưa kịp xong nếu người dùng F5 ngay) — nên so
 * dấu thời gian của 2 bản và chọn bản mới hơn. IndexedDB chỉ được dùng để bù lại ảnh/audio
 * quá lớn không nhét vừa localStorage.
 */
async function loadLatestList(spec: ListSpec): Promise<any[]> {
  const local = readLocalList(spec);
  const idb = await readIDBList(spec);

  if (!idb || (idb.items.length === 0 && idb.savedAt === 0)) return local.items || [];
  if (!local.items || idb.savedAt >= local.savedAt) return idb.items;

  const idbById = new Map(idb.items.map((item) => [item.id, item]));
  return local.items.map((item) => {
    const full = idbById.get(item.id);
    if (!full) return item;
    return {
      ...item,
      imageUrl: item.imageUrl === IDB_PLACEHOLDER ? full.imageUrl : item.imageUrl,
      audioUrl: item.audioUrl === IDB_PLACEHOLDER ? full.audioUrl : item.audioUrl,
    };
  });
}

export async function getAllVocab(): Promise<VocabItem[]> {
  return (await loadLatestList(VOCAB_SPEC)).map(ensureFSRSVocab);
}

export async function getAllGrammar(): Promise<GrammarItem[]> {
  return (await loadLatestList(GRAMMAR_SPEC)).map(ensureFSRSGrammar);
}

async function saveList(spec: ListSpec, items: any[]): Promise<void> {
  const savedAt = Date.now();
  try {
    const lightweight = items.map((item) => {
      let next = item;
      if (item.imageUrl && item.imageUrl.length > 200000) next = { ...next, imageUrl: IDB_PLACEHOLDER };
      if (item.audioUrl && item.audioUrl.length > 200000) next = { ...next, audioUrl: IDB_PLACEHOLDER };
      return next;
    });
    localStorage.setItem(spec.lsKey, JSON.stringify(lightweight));
    // Chỉ đánh dấu thời gian khi bản localStorage thực sự được ghi (không vượt quota)
    localStorage.setItem(spec.lsSavedAtKey, String(savedAt));
  } catch (err) {
    console.warn('localStorage save error:', err);
  }

  try {
    const db = await openDB();
    const tx = db.transaction([spec.store, CONFIG_STORE], 'readwrite');
    const store = tx.objectStore(spec.store);
    store.clear();
    for (const item of items) {
      store.put(item);
    }
    tx.objectStore(CONFIG_STORE).put({ key: `${spec.store}_saved_at`, value: savedAt });
  } catch (err) {
    console.error(`Error saving ${spec.store} to IndexedDB`, err);
  }
}

export async function saveAllVocab(items: VocabItem[]): Promise<void> {
  await saveList(VOCAB_SPEC, items.map(ensureFSRSCard));
}

export async function saveAllGrammar(items: GrammarItem[]): Promise<void> {
  await saveList(GRAMMAR_SPEC, items.map(ensureFSRSCard));
}

/**
 * Các khóa localStorage được đồng bộ lên Cloud và đưa vào file sao lưu:
 * cài đặt FSRS (bộ tham số, khoảng cách tối đa, bước học), tỷ lệ ghi nhớ mục tiêu,
 * cấu hình Trợ Lý Đo Nhịp và dữ liệu Rank/Chuỗi lửa.
 */
export const SYNCED_SETTING_KEYS = [
  'fsrs_scheduler_settings_v1',
  'fsrs_target_retention',
  'smartreview_fsrs_user_config_v2',
  'user_rank_data_v1',
] as const;

/** Đọc giá trị thô (chuỗi) của các khóa cài đặt được đồng bộ */
export function readSyncedSettings(): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const key of SYNCED_SETTING_KEYS) {
    try {
      out[key] = localStorage.getItem(key);
    } catch {
      out[key] = null;
    }
  }
  return out;
}

/** Ghi giá trị thô cho các khóa cài đặt được đồng bộ (null = xóa). Khóa lạ bị bỏ qua. */
export function writeSyncedSettings(values: Record<string, string | null | undefined>): void {
  for (const key of SYNCED_SETTING_KEYS) {
    if (!(key in values)) continue;
    const value = values[key];
    try {
      if (typeof value === 'string') localStorage.setItem(key, value);
      else localStorage.removeItem(key);
    } catch (err) {
      console.warn('Lỗi ghi cài đặt:', err);
    }
  }
}

export interface BackupFile {
  version: string;
  appName: string;
  exportDate: string;
  vocab: VocabItem[];
  grammar: GrammarItem[];
  /** Cài đặt FSRS & Rank, theo khóa localStorage (giá trị đã parse JSON) */
  settings?: Record<string, unknown>;
  reviewLogs?: ReviewLog[];
}

export function exportBackup(vocab: VocabItem[], grammar: GrammarItem[]): string {
  const settings: Record<string, unknown> = {};
  Object.entries(readSyncedSettings()).forEach(([key, raw]) => {
    if (raw === null) return;
    try {
      settings[key] = JSON.parse(raw);
    } catch {
      settings[key] = raw;
    }
  });

  const data: BackupFile = {
    version: '4.0-FSRS',
    appName: 'VocabBank',
    exportDate: new Date().toISOString(),
    vocab: vocab.map(ensureFSRSVocab),
    grammar: grammar.map(ensureFSRSGrammar),
    settings,
    reviewLogs: getReviewLogs(),
  };
  return JSON.stringify(data, null, 2);
}

/** Đọc & kiểm tra file sao lưu. Trả về null nếu không đúng định dạng. */
export function parseBackup(text: string): BackupFile | null {
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const hasVocab = Array.isArray(parsed.vocab);
  const hasGrammar = Array.isArray(parsed.grammar);
  if (!hasVocab && !hasGrammar) return null;

  const validItem = (item: any) => item && typeof item === 'object' && item.id != null;
  return {
    version: String(parsed.version || ''),
    appName: String(parsed.appName || ''),
    exportDate: String(parsed.exportDate || ''),
    vocab: (hasVocab ? parsed.vocab : []).filter(validItem).map((v: any) => ensureFSRSVocab({ ...v, id: String(v.id) })),
    grammar: (hasGrammar ? parsed.grammar : []).filter(validItem).map((g: any) => ensureFSRSGrammar({ ...g, id: String(g.id) })),
    settings: parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : undefined,
    reviewLogs: Array.isArray(parsed.reviewLogs)
      ? parsed.reviewLogs.filter((l: any) => l && typeof l.timestamp === 'string' && l.itemId != null)
      : undefined,
  };
}

/** Áp dụng cài đặt FSRS/Rank từ file sao lưu */
export function applyBackupSettings(settings: Record<string, unknown>): void {
  const values: Record<string, string | null> = {};
  for (const key of SYNCED_SETTING_KEYS) {
    if (!(key in settings)) continue;
    const value = settings[key];
    if (value === null || value === undefined) continue;
    values[key] = typeof value === 'string' && key === 'fsrs_target_retention' ? value : JSON.stringify(value);
  }
  writeSyncedSettings(values);
}

export function getSampleData(): { vocab: VocabItem[]; grammar: GrammarItem[] } {
  const today = getTodayDate();
  
  const sampleVocab: any[] = [
    {
      id: 'sample-1',
      word: 'Resilient',
      phonetic: '/rɪˈzɪliənt/',
      meaning: 'Kiên cường, bền bỉ, có khả năng phục hồi nhanh chóng sau khó khăn',
      type: 'adj',
      topic: 'Tính cách & Đời sống',
      example: 'She is a resilient woman who always bounces back from adversity.',
      exampleVi: 'Cô ấy là một người phụ nữ kiên cường, luôn vượt qua mọi nghịch cảnh.',
      imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80',
      stability: 0,
      difficulty: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      reps: 0,
      lapses: 0,
      state: State.New,
      reviewDate: today,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'sample-2',
      word: 'Serendipity',
      phonetic: '/ˌser.ənˈdɪp.ə.t̬i/',
      meaning: 'Sự tình cờ may mắn, sự run rủi đem lại điều tốt lành bất ngờ',
      type: 'n',
      topic: 'Từ vựng hay',
      example: 'Finding my childhood friend in Tokyo was pure serendipity.',
      exampleVi: 'Gặp lại người bạn thời thơ ấu ở Tokyo thực sự là một sự tình cờ may mắn tuyệt vời.',
      imageUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=600&auto=format&fit=crop&q=80',
      stability: 2.3,
      difficulty: 4.8,
      elapsed_days: 2,
      scheduled_days: 2,
      reps: 1,
      lapses: 0,
      state: State.Learning,
      last_review: new Date(Date.now() - 2 * 86400000).toISOString(),
      reviewDate: today,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'sample-3',
      word: 'Meticulous',
      phonetic: '/məˈtɪk.jə.ləs/',
      meaning: 'Tỉ mỉ, cẩn thận từng chi tiết nhỏ, chu đáo',
      type: 'adj',
      topic: 'Công việc',
      example: 'He gave meticulous attention to every single detail in the report.',
      exampleVi: 'Anh ấy dành sự chú ý tỉ mỉ cho từng chi tiết nhỏ trong bản báo cáo.',
      imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&auto=format&fit=crop&q=80',
      stability: 6.5,
      difficulty: 3.5,
      elapsed_days: 5,
      scheduled_days: 5,
      reps: 2,
      lapses: 0,
      state: State.Review,
      last_review: new Date(Date.now() - 5 * 86400000).toISOString(),
      reviewDate: today,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'sample-4',
      word: 'Ubiquitous',
      phonetic: '/juːˈbɪk.wə.t̬əs/',
      meaning: 'Có mặt ở khắp mọi nơi, phổ biến rộng rãi',
      type: 'adj',
      topic: 'Công nghệ & Xã hội',
      example: 'Smartphones have become ubiquitous in modern daily life.',
      exampleVi: 'Điện thoại thông minh đã trở nên phổ biến khắp mọi nơi trong cuộc sống hiện đại.',
      imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80',
      stability: 0,
      difficulty: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      reps: 0,
      lapses: 0,
      state: State.New,
      reviewDate: today,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'sample-5',
      word: 'Lucid',
      phonetic: '/ˈluː.sɪd/',
      meaning: 'Rõ ràng, minh bạch, dễ hiểu, minh mẫn',
      type: 'adj',
      topic: 'Giao tiếp',
      example: 'The professor gave a lucid explanation of complex quantum physics.',
      exampleVi: 'Giáo sư đã đưa ra lời giải thích vô cùng rõ ràng về vật lý lượng tử phức tạp.',
      imageUrl: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=600&auto=format&fit=crop&q=80',
      stability: 14.2,
      difficulty: 2.1,
      elapsed_days: 12,
      scheduled_days: 12,
      reps: 3,
      lapses: 0,
      state: State.Review,
      last_review: new Date(Date.now() - 12 * 86400000).toISOString(),
      reviewDate: today,
      createdAt: new Date().toISOString(),
    }
  ];

  const sampleGrammar: any[] = [
    {
      id: 'sample-g-1',
      title: 'Thì Hiện Tại Hoàn Thành (Present Perfect)',
      type: 'Thì (Tense)',
      formula: 'S + have / has + V3/ed (+ O)',
      explanation: 'Diễn tả hành động đã xảy ra trong quá khứ nhưng để lại kết quả ở hiện tại, hoặc trải nghiệm tính đến thời điểm nói.',
      example: 'I have lived in this city for over five years.',
      exampleVi: 'Tôi đã sống ở thành phố này được hơn năm năm rồi (và hiện tại vẫn sống ở đây).',
      stability: 3.2,
      difficulty: 4.0,
      elapsed_days: 2,
      scheduled_days: 2,
      reps: 1,
      lapses: 0,
      state: State.Learning,
      last_review: new Date(Date.now() - 2 * 86400000).toISOString(),
      reviewDate: today,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'sample-g-2',
      title: 'Câu Điều Kiện Loại 2 (Conditional Type 2)',
      type: 'Cấu trúc (Structure)',
      formula: 'If + S + V2/ed (were), S + would/could + V-inf',
      explanation: 'Diễn tả một giả định trái ngược với thực tế ở hiện tại hoặc tương lai (không có thật lúc nói).',
      example: 'If I had more free time, I would travel around the world.',
      exampleVi: 'Nếu tôi có nhiều thời gian rảnh hơn, tôi sẽ đi du lịch khắp thế giới (thực tế hiện tại tôi rất bận).',
      stability: 0,
      difficulty: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      reps: 0,
      lapses: 0,
      state: State.New,
      reviewDate: today,
      createdAt: new Date().toISOString(),
    }
  ];

  return {
    vocab: sampleVocab.map((v) => ensureFSRSCard<VocabItem>(v)),
    grammar: sampleGrammar.map((g) => ensureFSRSCard<GrammarItem>(g)),
  };
}

// ============================================================================
// MEMORY LOGS & FSRS OPTIMIZATION STORAGE
// ============================================================================

const MEMORY_LOGS_KEY = 'smartreview_memory_logs_v2';
const FSRS_USER_CONFIG_KEY = 'smartreview_fsrs_user_config_v2';

import { ReviewLog, FSRSOptimizerResult, FSRSUserConfig } from '../types';
import { getActiveTargetRetention, setActiveTargetRetention } from './fsrs';
import { RHYTHM_ELIGIBLE_REVIEWS } from './memoryRhythm';
import { notifyLocalChange } from './localChanges';

/**
 * Lưu 1 lượt review vào Memory Logs
 */
export function saveReviewLog(log: ReviewLog): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getReviewLogs();
    existing.push(log);
    // Lưu tối đa 20,000 logs gần nhất để tối ưu dung lượng localStorage
    const trimmed = existing.length > MAX_REVIEW_LOGS ? existing.slice(-MAX_REVIEW_LOGS) : existing;
    localStorage.setItem(MEMORY_LOGS_KEY, JSON.stringify(trimmed));
    notifyLocalChange();
  } catch (err) {
    console.warn('Lỗi lưu Review Log:', err);
  }
}

const MAX_REVIEW_LOGS = 20000;

/** Khóa định danh 1 lượt ôn (dùng để gộp lịch sử giữa các thiết bị mà không bị trùng) */
export function reviewLogId(log: ReviewLog): string {
  return `${log.timestamp}|${log.itemType}|${log.itemId}`;
}

/** Ghi đè toàn bộ lịch sử ôn tập (đã sắp theo thời gian, giữ tối đa 20.000 lượt gần nhất) */
export function setReviewLogs(logs: ReviewLog[]): void {
  if (typeof window === 'undefined') return;
  const sorted = [...logs].sort((a, b) => (a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0));
  const trimmed = sorted.length > MAX_REVIEW_LOGS ? sorted.slice(-MAX_REVIEW_LOGS) : sorted;
  try {
    localStorage.setItem(MEMORY_LOGS_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.warn('Lỗi lưu Review Log:', err);
  }
}

/** Gộp thêm lịch sử ôn tập (bỏ trùng theo reviewLogId). Trả về số lượt mới được thêm. */
export function mergeReviewLogs(incoming: ReviewLog[]): number {
  const existing = getReviewLogs();
  const ids = new Set(existing.map(reviewLogId));
  const fresh = incoming.filter((log) => {
    const id = reviewLogId(log);
    if (ids.has(id)) return false;
    ids.add(id);
    return true;
  });
  if (fresh.length > 0) setReviewLogs([...existing, ...fresh]);
  return fresh.length;
}

/**
 * Lấy danh sách toàn bộ Memory Logs
 */
export function getReviewLogs(): ReviewLog[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(MEMORY_LOGS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Lấy cấu hình FSRS cá nhân của người dùng
 */
export function getUserFSRSConfig(): FSRSUserConfig {
  const defaultTarget = getActiveTargetRetention();
  const defaultConfig: FSRSUserConfig = {
    targetRetention: defaultTarget,
    userGoal: 'Ghi nhớ chắc chắn nhất (>90%)',
  };

  if (typeof window === 'undefined') return defaultConfig;
  try {
    const raw = localStorage.getItem(FSRS_USER_CONFIG_KEY);
    if (!raw) return defaultConfig;
    const parsed = JSON.parse(raw);
    return {
      // Tỷ lệ ghi nhớ luôn đọc từ kho cài đặt FSRS dùng chung (1 nguồn dữ liệu duy nhất)
      targetRetention: defaultTarget,
      userGoal: parsed.userGoal || 'Ghi nhớ chắc chắn nhất (>90%)',
      lastOptimizedAt: parsed.lastOptimizedAt,
      lastOptimizationResult: parsed.lastOptimizationResult,
    };
  } catch {
    return defaultConfig;
  }
}

/**
 * Lưu cấu hình FSRS cá nhân của người dùng
 */
export function saveUserFSRSConfig(config: Partial<FSRSUserConfig>): FSRSUserConfig {
  const current = getUserFSRSConfig();
  const updated: FSRSUserConfig = {
    ...current,
    ...config,
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(FSRS_USER_CONFIG_KEY, JSON.stringify(updated));
      if (typeof config.targetRetention === 'number') {
        setActiveTargetRetention(config.targetRetention);
      }
      notifyLocalChange();
    } catch (err) {
      console.warn('Lỗi lưu FSRS User Config:', err);
    }
  }

  return updated;
}

/**
 * Tính toán thống kê Memory Logs thực tế cho Prompt AI Optimize FSRS
 */
export function getMemoryLogsStats(
  vocabList: VocabItem[] = [],
  grammarList: GrammarItem[] = []
): {
  total_reviews: number;
  /** Số lượt ôn lại thật sự (thẻ đã có lịch hẹn trước đó) dùng để đo tỷ lệ nhớ */
  measured_reviews: number;
  actual_retention: number;
  target_retention: number;
  daily_cards: number;
  user_goal: string;
  isEligible: boolean;
  activeLogsCount: number;
} {
  const logs = getReviewLogs();
  const config = getUserFSRSConfig();
  const allItems = [...vocabList, ...grammarList];

  // Tổng số lượt ôn: lấy giá trị lớn hơn giữa lịch sử đã lưu và số lần ôn ghi trên thẻ
  // (thẻ nhập từ bản sao lưu có thể có reps nhưng chưa có lịch sử trên máy này).
  const cardsRepsTotal = allItems.reduce((acc, item) => acc + (item.reps || item.repetition || 0), 0);
  const total_reviews = Math.max(logs.length, cardsRepsTotal);

  // Tỷ lệ nhớ thực tế: chỉ tính các lượt ÔN LẠI (thẻ đã được hẹn lịch trước đó),
  // bỏ qua lần học đầu tiên. Theo FSRS, Hard/Good/Easy đều là "nhớ được", chỉ Again là quên.
  const recallLogs = logs.filter((l) => (l.prevScheduledDays || 0) > 0);
  const measured_reviews = recallLogs.length;
  let actual_retention = 0;
  if (measured_reviews > 0) {
    const recalled = recallLogs.filter((l) => l.rating >= 2).length;
    actual_retention = Number(((recalled / measured_reviews) * 100).toFixed(1));
  } else if (cardsRepsTotal > 0) {
    // Ước tính từ số lần quên (lapses) trên thẻ khi chưa có lịch sử ôn
    const totalLapses = allItems.reduce((acc, item) => acc + (item.lapses || 0), 0);
    actual_retention = Number(Math.max(0, 100 - (totalLapses / cardsRepsTotal) * 100).toFixed(1));
  }

  const target_retention = Math.round(getActiveTargetRetention() * 100);

  // Số thẻ ôn trung bình mỗi ngày học, tính trên 30 ngày gần nhất
  let daily_cards = 0;
  const since = Date.now() - 30 * 86_400_000;
  const recentLogs = logs.filter((l) => new Date(l.timestamp).getTime() >= since);
  if (recentLogs.length > 0) {
    const activeDays = new Set(recentLogs.map((l) => l.timestamp.slice(0, 10))).size;
    daily_cards = Math.round(recentLogs.length / Math.max(1, activeDays));
  }

  return {
    total_reviews,
    measured_reviews,
    actual_retention,
    target_retention,
    daily_cards,
    user_goal: config.userGoal || 'Học dài hạn / Bền vững',
    isEligible: total_reviews >= RHYTHM_ELIGIBLE_REVIEWS,
    activeLogsCount: logs.length,
  };
}
