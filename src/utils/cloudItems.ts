import { supabase } from './supabaseClient';
import { ensureFSRSVocab, ensureFSRSGrammar } from './storage';
import type { VocabItem, GrammarItem, ReviewLog, UserRankData } from '../types';

/**
 * Account data layer. Cards, FSRS state, settings, rank and review history are stored in
 * Netlify Database through `/api/data` (netlify/functions/data.mts), keyed by the signed-in
 * Supabase user — so the same account sees the same data on every device.
 *
 * Writes that fail because of the network (offline, timeout, 5xx) are kept in a persistent
 * per-account outbox in localStorage and replayed in order as soon as the server is reachable
 * again, so nothing studied offline is lost.
 */

export type ItemKind = 'vocab' | 'grammar';
export type AnyItem = VocabItem | GrammarItem;
export type ItemOf<K extends ItemKind> = K extends 'vocab' ? VocabItem : GrammarItem;

export type ItemRow = {
  id: string;
  data: Record<string, unknown>;
  study?: Partial<StudyEntry> | null;
};

export type StudyEntry = {
  state: number;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  scheduled_days: number;
  elapsed_days: number;
  learning_steps: number;
  reviewDate: string | null;
  last_review: string | null;
  next_review: string;
};

export type StudyMap = Record<string, StudyEntry>;

export type StudyMeta = {
  progress: UserRankData | null;
  settings: Record<string, unknown>;
  history: ReviewLog[];
};

const API = '/api/data';
const FSRS_KEYS = new Set([
  'stability', 'difficulty', 'reps', 'lapses', 'state', 'last_review', 'next_review',
  'reviewDate', 'elapsed_days', 'scheduled_days', 'learning_steps', 'interval',
  'repetition', 'easeFactor',
]);
const WRITE_CHUNK_ROWS = 200;
const WRITE_CHUNK_BYTES = 2_500_000;
const HISTORY_CHUNK = 2000;

export class CloudSyncError extends Error {
  constructor(public readonly action: string, public readonly cause?: unknown) {
    super(`Không thể ${action}: ${explainCause(cause)}`);
    this.name = 'CloudSyncError';
  }
}

function explainCause(cause: unknown): string {
  const err = (cause ?? {}) as { message?: string; status?: number };
  const message = err.message || String(cause ?? '');
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'mất kết nối mạng.';
  if (err.status === 401 || /JWT|not signed in|chưa đăng nhập|hết hạn/i.test(message)) return 'phiên đăng nhập đã hết hạn, hãy đăng nhập lại.';
  if (/fetch|network|load failed|timeout/i.test(message)) return 'không kết nối được máy chủ, hãy kiểm tra mạng.';
  return message || 'lỗi không xác định.';
}

export function describeCloudError(error: unknown): string {
  if (error instanceof CloudSyncError) return error.message;
  return `Lỗi đồng bộ: ${explainCause(error)}`;
}

function fail(action: string, cause: unknown): never {
  console.error('Cloud Error:', action, cause);
  throw new CloudSyncError(action, cause);
}

class HttpError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

// ---------------------------------------------------------------------------
// Session + transport
// ---------------------------------------------------------------------------

async function getSession(forceRefresh = false) {
  if (forceRefresh) {
    const { data } = await supabase.auth.refreshSession();
    if (data.session) return data.session;
  }
  const { data } = await supabase.auth.getSession();
  return data.session;
}

async function currentUserId(): Promise<string | null> {
  return (await getSession())?.user.id ?? null;
}

async function call<T>(init: { method: 'GET' | 'POST'; query?: string; body?: unknown }): Promise<T> {
  let session = await getSession();
  if (!session) throw new HttpError('Chưa đăng nhập', 401);

  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${API}${init.query ?? ''}`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: 'no-store',
    });
    if (res.status === 401 && attempt === 0) {
      // Access token expired between refreshes — refresh once and retry.
      const refreshed = await getSession(true);
      if (refreshed) { session = refreshed; continue; }
    }
    const payload = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) throw new HttpError(payload?.error || `HTTP ${res.status}`, res.status);
    return payload;
  }
}

/** Network failures and server errors are retryable; 4xx (except 401/408/429) are not. */
function isRetryable(error: unknown): boolean {
  if (error instanceof HttpError) return error.status >= 500 || [401, 408, 429].includes(error.status);
  return true; // fetch threw: offline, DNS, CORS, timeout...
}

// ---------------------------------------------------------------------------
// Revision tracking (lets App skip reloads caused by its own writes)
// ---------------------------------------------------------------------------

let knownRevision = 0;
let writeEpoch = 0;
let writesInFlight = 0;

function noteRevision(revision: unknown) {
  if (typeof revision === 'number' && revision > knownRevision) knownRevision = revision;
}

export const getKnownRevision = () => knownRevision;
/** Changes every time this device writes; a load that started before a write must be discarded. */
export const getWriteEpoch = () => writeEpoch;
export const hasPendingWrites = () => writesInFlight > 0 || outboxSize() > 0;

export async function fetchRevision(): Promise<number> {
  const { revision } = await call<{ revision: number }>({ method: 'GET', query: '?revision=1' });
  return revision ?? 0;
}

// ---------------------------------------------------------------------------
// Offline outbox
// ---------------------------------------------------------------------------

type Op = Record<string, unknown> & { op: string };
const OUTBOX_PREFIX = 'cloud_outbox_v1:';
let outboxUser: string | null = null;
let outboxCache: Op[] = [];
let flushing: Promise<void> | null = null;
const outboxListeners = new Set<(size: number) => void>();

function loadOutbox(userId: string): Op[] {
  if (outboxUser === userId) return outboxCache;
  outboxUser = userId;
  try {
    const raw = localStorage.getItem(OUTBOX_PREFIX + userId);
    outboxCache = raw ? (JSON.parse(raw) as Op[]) : [];
  } catch {
    outboxCache = [];
  }
  return outboxCache;
}

function persistOutbox(): boolean {
  if (!outboxUser) return false;
  try {
    if (outboxCache.length) localStorage.setItem(OUTBOX_PREFIX + outboxUser, JSON.stringify(outboxCache));
    else localStorage.removeItem(OUTBOX_PREFIX + outboxUser);
    outboxListeners.forEach((fn) => fn(outboxCache.length));
    return true;
  } catch (error) {
    console.warn('Không lưu được hàng đợi offline:', error);
    return false;
  }
}

function outboxSize(): number {
  return outboxUser ? outboxCache.length : 0;
}

/** Number of changes waiting to be uploaded (0 = everything is saved to the account). */
export function getPendingChangeCount(): number {
  return outboxSize();
}

export function onPendingChangesUpdate(listener: (size: number) => void): () => void {
  outboxListeners.add(listener);
  return () => { outboxListeners.delete(listener); };
}

/** Uploads queued offline changes in order. Resolves when the queue is empty, throws if the server is still unreachable. */
export async function flushOutbox(): Promise<void> {
  if (flushing) return flushing;
  flushing = (async () => {
    const userId = await currentUserId();
    if (!userId) return;
    const queue = loadOutbox(userId);
    while (queue.length) {
      const result = await call<{ revision: number }>({ method: 'POST', body: queue[0] }).catch((error) => {
        if (isRetryable(error)) throw error;
        // The server rejected this change outright; drop it so it can't block the rest.
        console.error('Cloud Error: dropping rejected offline change', queue[0].op, error);
        return null;
      });
      if (result) noteRevision(result.revision);
      queue.shift();
      writeEpoch++;
      persistOutbox();
    }
  })().finally(() => { flushing = null; });
  return flushing;
}

/** Sends one write. Offline/server failures are queued for later instead of being lost. */
async function send(action: string, body: Op): Promise<void> {
  writesInFlight++;
  writeEpoch++;
  try {
    const userId = await currentUserId();
    if (!userId) fail(action, new HttpError('Chưa đăng nhập', 401));
    const queue = loadOutbox(userId);

    if (queue.length) {
      try { await flushOutbox(); } catch { /* still offline: queue this one behind the rest */ }
    }
    if (!queue.length) {
      try {
        const { revision } = await call<{ revision: number }>({ method: 'POST', body });
        noteRevision(revision);
        return;
      } catch (error) {
        if (!isRetryable(error)) fail(action, error);
        console.warn('Cloud write deferred (will retry):', action, error);
      }
    }
    queue.push(body);
    if (!persistOutbox()) {
      queue.pop();
      fail(action, new Error('không có mạng và bộ nhớ thiết bị đã đầy'));
    }
  } finally {
    writesInFlight--;
    writeEpoch++;
  }
}

// ---------------------------------------------------------------------------
// Item helpers
// ---------------------------------------------------------------------------

export function newItemId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function withItemId<T extends { id?: string }>(item: T): T & { id: string } {
  return { ...item, id: item.id || newItemId() };
}

const normalize = <K extends ItemKind>(kind: K, raw: unknown): ItemOf<K> =>
  (kind === 'vocab' ? ensureFSRSVocab(raw) : ensureFSRSGrammar(raw)) as ItemOf<K>;

/** Card content only; FSRS state is stored separately in `study`. */
function contentOf(item: AnyItem): Record<string, unknown> {
  const data: Record<string, unknown> = { ...item };
  delete data.id;
  for (const key of FSRS_KEYS) delete data[key];
  return data;
}

export function pickFSRSFields(item: AnyItem): Partial<AnyItem> {
  const out: Record<string, unknown> = {};
  for (const key of FSRS_KEYS) if (key in item) out[key] = (item as unknown as Record<string, unknown>)[key];
  return out as Partial<AnyItem>;
}

const toInt = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : 0;
const toNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : 0;

export function toStudyEntry(item: AnyItem): StudyEntry {
  return {
    state: toInt(item.state),
    stability: toNum(item.stability),
    difficulty: toNum(item.difficulty),
    reps: toInt(item.reps),
    lapses: toInt(item.lapses),
    scheduled_days: toInt(item.scheduled_days),
    elapsed_days: toInt(item.elapsed_days),
    learning_steps: toInt(item.learning_steps),
    reviewDate: item.reviewDate || null,
    last_review: item.last_review || null,
    next_review: item.next_review || new Date().toISOString(),
  };
}

export function studyEntryToFields(entry: Partial<StudyEntry>): Partial<AnyItem> {
  const fields: Record<string, unknown> = {};
  const numeric = ['state', 'stability', 'difficulty', 'reps', 'lapses', 'scheduled_days', 'elapsed_days', 'learning_steps'] as const;
  for (const key of numeric) {
    const value = entry[key];
    if (typeof value === 'number' && Number.isFinite(value)) fields[key] = value;
  }
  if ('scheduled_days' in fields) fields.interval = fields.scheduled_days;
  if ('reps' in fields) fields.repetition = fields.reps;
  if (typeof entry.next_review === 'string') fields.next_review = entry.next_review;
  if (typeof entry.last_review === 'string') fields.last_review = entry.last_review;
  if (entry.reviewDate) fields.reviewDate = entry.reviewDate;
  return fields as Partial<AnyItem>;
}

export function rowsToItem<K extends ItemKind>(kind: K, row: ItemRow, fallbackFSRS?: Partial<AnyItem>): ItemOf<K> {
  const study = row.study && typeof row.study === 'object' ? studyEntryToFields(row.study) : {};
  return normalize(kind, { ...row.data, ...(fallbackFSRS || {}), ...study, id: row.id });
}

function chunk<T>(rows: T[]): T[][] {
  const out: T[][] = [];
  let batch: T[] = [];
  let bytes = 0;
  for (const row of rows) {
    const size = JSON.stringify(row).length;
    if (batch.length && (batch.length >= WRITE_CHUNK_ROWS || bytes + size > WRITE_CHUNK_BYTES)) {
      out.push(batch); batch = []; bytes = 0;
    }
    batch.push(row); bytes += size;
  }
  if (batch.length) out.push(batch);
  return out;
}

const label = (kind: ItemKind) => kind === 'vocab' ? 'từ vựng' : 'ngữ pháp';
const byNewest = (a: AnyItem, b: AnyItem) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''));

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export interface CloudUserData extends StudyMeta {
  vocab: VocabItem[];
  grammar: GrammarItem[];
  revision: number;
}

export async function fetchAllUserData(): Promise<CloudUserData> {
  const action = 'tải dữ liệu tài khoản';
  try {
    const snap = await call<{
      vocab: ItemRow[]; grammar: ItemRow[]; progress: UserRankData | null;
      settings: Record<string, unknown>; history: ReviewLog[]; revision: number;
    }>({ method: 'GET' });
    noteRevision(snap.revision);
    const build = <K extends ItemKind>(kind: K, rows: ItemRow[]) =>
      (rows || []).map((row) => rowsToItem(kind, row, pickFSRSFields(row.data as unknown as AnyItem))).sort(byNewest) as ItemOf<K>[];
    return {
      vocab: build('vocab', snap.vocab),
      grammar: build('grammar', snap.grammar),
      progress: snap.progress && typeof snap.progress === 'object' ? snap.progress : null,
      settings: snap.settings && typeof snap.settings === 'object' ? snap.settings : {},
      history: Array.isArray(snap.history) ? snap.history : [],
      revision: snap.revision ?? 0,
    };
  } catch (error) {
    fail(action, error);
  }
}

/**
 * Reads whatever this account had stored in the previous Supabase tables
 * (vocab_items / grammar_items / study_data). Used once to seed an empty account;
 * any failure (missing tables, RLS, offline) simply returns null.
 */
export async function fetchLegacySupabaseData(): Promise<(StudyMeta & { vocab: VocabItem[]; grammar: GrammarItem[] }) | null> {
  try {
    const userId = await currentUserId();
    if (!userId) return null;
    const readTable = async (table: string) => {
      const rows: { id: string; data: Record<string, unknown> }[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase.from(table).select('id,data').eq('user_id', userId).range(from, from + 999);
        if (error) return rows;
        rows.push(...((data as typeof rows) || []));
        if (!data || data.length < 1000) return rows;
      }
    };
    const [vocabRows, grammarRows, studyRes] = await Promise.all([
      readTable('vocab_items'),
      readTable('grammar_items'),
      supabase.from('study_data').select('*').eq('user_id', userId).maybeSingle(),
    ]);
    const study = (studyRes.error ? null : studyRes.data) as Record<string, unknown> | null;
    const parseMap = (value: unknown): Record<string, Partial<StudyEntry>> => {
      let parsed = value;
      if (typeof parsed === 'string') { try { parsed = JSON.parse(parsed); } catch { return {}; } }
      if (Array.isArray(parsed)) {
        return Object.fromEntries(parsed.filter((it) => it && typeof it.id === 'string').map((it) => [it.id, toStudyEntry(it)]));
      }
      return parsed && typeof parsed === 'object' ? parsed as Record<string, Partial<StudyEntry>> : {};
    };
    const build = <K extends ItemKind>(kind: K, rows: { id: string; data: Record<string, unknown> }[]) => {
      const map = parseMap(study?.[kind]);
      const out = rows.filter((r) => r?.id && r.data).map((row) =>
        rowsToItem(kind, { id: row.id, data: row.data, study: map[row.id] ?? null }, pickFSRSFields(row.data as unknown as AnyItem)));
      // Very old format: full cards stored as an array inside study_data.
      if (!out.length && Array.isArray(study?.[kind])) {
        for (const raw of study![kind] as AnyItem[]) if (raw && typeof raw.id === 'string') out.push(normalize(kind, raw));
      }
      return out.sort(byNewest) as ItemOf<K>[];
    };
    return {
      vocab: build('vocab', vocabRows),
      grammar: build('grammar', grammarRows),
      progress: study?.progress && typeof study.progress === 'object' && Object.keys(study.progress).length ? study.progress as UserRankData : null,
      settings: study?.settings && typeof study.settings === 'object' ? study.settings as Record<string, unknown> : {},
      history: Array.isArray(study?.history) ? study!.history as ReviewLog[] : [],
    };
  } catch (error) {
    console.warn('Legacy Supabase data unavailable:', error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function createItem<K extends ItemKind>(kind: K, rawItem: ItemOf<K>): Promise<ItemOf<K>> {
  const item = withItemId(rawItem) as ItemOf<K>;
  await send(`lưu ${label(kind)} mới`, {
    op: 'upsertItems', kind, items: [{ id: item.id, data: contentOf(item), study: toStudyEntry(item) }],
  });
  return rowsToItem(kind, { id: item.id, data: contentOf(item), study: toStudyEntry(item) });
}

export async function updateItemContent(kind: ItemKind, item: AnyItem): Promise<void> {
  await send(`lưu thay đổi ${label(kind)}`, { op: 'updateContent', kind, items: [{ id: item.id, data: contentOf(item) }] });
}

/** Edit: content + FSRS state in one write. */
export async function saveItem(kind: ItemKind, item: AnyItem): Promise<void> {
  await bulkSaveItems(kind, [item]);
}

export async function saveStudyData(kind: ItemKind, item: AnyItem): Promise<void> {
  await saveStudyDataBatch(kind, [item]);
}

export async function saveStudyDataBatch(kind: ItemKind, items: AnyItem[]): Promise<void> {
  const action = `lưu tiến độ ôn ${label(kind)}`;
  for (const part of chunk(items.map((item) => ({ id: item.id, study: toStudyEntry(item) })))) {
    await send(action, { op: 'updateStudy', kind, items: part });
  }
}

export async function bulkSaveItems(kind: ItemKind, items: AnyItem[]): Promise<void> {
  const action = `lưu ${items.length} ${label(kind)}`;
  for (const part of chunk(items.map((item) => ({ id: item.id, data: contentOf(item), study: toStudyEntry(item) })))) {
    await send(action, { op: 'upsertItems', kind, items: part });
  }
}

export async function deleteItems(kind: ItemKind, ids: string[]): Promise<void> {
  const action = `xóa ${label(kind)}`;
  for (let i = 0; i < ids.length; i += 500) {
    await send(action, { op: 'deleteItems', kind, ids: ids.slice(i, i + 500) });
  }
}

/** Settings / rank are replaced; review history is only ever added to (server de-duplicates). */
export async function saveStudyMeta(meta: Partial<StudyMeta>): Promise<void> {
  const action = 'lưu tiến trình học tập';
  const history = meta.history ?? [];
  await send(action, { op: 'saveMeta', progress: meta.progress ?? null, settings: meta.settings ?? null, history: history.slice(0, HISTORY_CHUNK) });
  for (let i = HISTORY_CHUNK; i < history.length; i += HISTORY_CHUNK) {
    await send(action, { op: 'saveMeta', history: history.slice(i, i + HISTORY_CHUNK) });
  }
}
