import {
  fetchAllUserData,
  fetchLegacySupabaseData,
  bulkSaveItems,
  saveStudyMeta,
  type AnyItem,
  type StudyMeta,
} from './cloudItems';
import {
  getReviewLogs,
  mergeReviewLogs,
  setReviewLogs,
  reviewLogId,
  saveAllVocab,
  saveAllGrammar,
  readSyncedSettings,
  writeSyncedSettings,
  SYNCED_SETTING_KEYS,
} from './storage';
import { getUserRankData, saveUserRankData } from './rankSystem';
import type { VocabItem, GrammarItem, ReviewLog, UserRankData } from '../types';

/**
 * Local cards/settings are cached per device. This key remembers which account the
 * cache belongs to, so a different account signing in on the same device never
 * inherits (or uploads) someone else's cards.
 */
const LOCAL_OWNER_KEY = 'cloud_local_owner_v1';

export function getLocalOwner(): string | null {
  try { return localStorage.getItem(LOCAL_OWNER_KEY); } catch { return null; }
}

export function setLocalOwner(userId: string | null): void {
  try {
    if (userId) localStorage.setItem(LOCAL_OWNER_KEY, userId);
    else localStorage.removeItem(LOCAL_OWNER_KEY);
  } catch {}
}

export interface SyncedData {
  vocab: VocabItem[];
  grammar: GrammarItem[];
  settingsChanged: boolean;
  logsChanged: boolean;
}

function localSettingsObject(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(readSyncedSettings())) {
    if (raw == null) continue;
    try { out[key] = JSON.parse(String(raw)); } catch { out[key] = raw; }
  }
  return out;
}

function cloudSettingsToLocal(settings: Record<string, unknown>): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const key of SYNCED_SETTING_KEYS) {
    if (!(key in settings)) continue;
    const value = settings[key];
    out[key] = value == null ? null : (typeof value === 'string' ? value : JSON.stringify(value));
  }
  return out;
}

// Review logs + settings already known to be in the account (avoids re-uploading them).
const syncedLogIds = new Set<string>();
let lastSyncedMeta = '';

const metaFingerprint = (progress: unknown, settings: unknown) => JSON.stringify([progress, settings]);

/** Union of two card lists by id; on conflict keep the one reviewed most recently. */
function unionCards<T extends AnyItem>(a: T[], b: T[]): T[] {
  const map = new Map<string, T>();
  const score = (item: T) => `${item.last_review || ''}|${String(item.reps ?? 0).padStart(6, '0')}`;
  for (const item of [...a, ...b]) {
    const prev = map.get(item.id);
    if (!prev || score(item) > score(prev)) map.set(item.id, item);
  }
  return [...map.values()];
}

/** Applies the account's settings / rank / history to this device. */
export function applyCloudMeta(meta: StudyMeta): { settingsChanged: boolean; logsChanged: boolean } {
  let settingsChanged = false;
  if (meta.progress) {
    saveUserRankData(meta.progress);
    settingsChanged = true;
  }
  const settings = cloudSettingsToLocal(meta.settings);
  if (Object.keys(settings).length) {
    writeSyncedSettings(settings);
    settingsChanged = true;
  }
  for (const log of meta.history) syncedLogIds.add(reviewLogId(log));
  const logsChanged = mergeReviewLogs(meta.history) > 0;
  lastSyncedMeta = metaFingerprint(getUserRankData(), localSettingsObject());
  return { settingsChanged, logsChanged };
}

/**
 * Runs on sign-in. Loads the account from the server; the very first time an account is
 * used on the new storage, moves in whatever this person already had — cards left in the old Supabase tables
 * and cards cached on this device — so nothing is lost when switching to the new storage.
 */
export async function pullAndMerge(
  userId: string,
  localVocab: VocabItem[],
  localGrammar: GrammarItem[]
): Promise<SyncedData> {
  const remote = await fetchAllUserData();
  const owner = getLocalOwner();
  const localIsMine = !owner || owner === userId;
  if (!localIsMine) {
    // This device's cache belongs to another account: never mix it into this one.
    clearLocalAccountData();
    localVocab = [];
    localGrammar = [];
  }
  let { vocab, grammar } = remote;
  let settingsChanged = false;
  let logsChanged = false;

  // revision 0 = nothing was ever saved to this account on the new storage.
  if (remote.revision === 0) {
    const legacy = await fetchLegacySupabaseData();
    vocab = unionCards(legacy?.vocab ?? [], localVocab);
    grammar = unionCards(legacy?.grammar ?? [], localGrammar);
    if (vocab.length) await bulkSaveItems('vocab', vocab);
    if (grammar.length) await bulkSaveItems('grammar', grammar);

    // Bring rank/settings/history from the old backend, merged with this device's.
    if (legacy && (legacy.progress || Object.keys(legacy.settings).length || legacy.history.length)) {
      ({ settingsChanged, logsChanged } = applyCloudMeta(legacy));
    }
    const local: StudyMeta = { progress: getUserRankData(), settings: localSettingsObject(), history: getReviewLogs() };
    await saveStudyMeta(local);
    for (const log of local.history) syncedLogIds.add(reviewLogId(log));
    lastSyncedMeta = metaFingerprint(local.progress, local.settings);
  } else {
    // Upload reviews done on this device that the account doesn't have yet, then apply the account's state.
    const remoteIds = new Set(remote.history.map(reviewLogId));
    const missing = getReviewLogs().filter((log) => !remoteIds.has(reviewLogId(log)));
    if (missing.length) await saveStudyMeta({ history: missing });
    for (const log of missing) syncedLogIds.add(reviewLogId(log));
    ({ settingsChanged, logsChanged } = applyCloudMeta(remote));
  }

  setLocalOwner(userId);
  return { vocab, grammar, settingsChanged, logsChanged };
}

/** Uploads settings/rank changes and new review logs from this device. No-op if nothing changed. */
export async function pushLocalChanges(): Promise<boolean> {
  const progress: UserRankData = getUserRankData();
  const settings = localSettingsObject();
  const fingerprint = metaFingerprint(progress, settings);
  const newLogs: ReviewLog[] = getReviewLogs().filter((log) => !syncedLogIds.has(reviewLogId(log)));
  if (fingerprint === lastSyncedMeta && newLogs.length === 0) return false;

  await saveStudyMeta(fingerprint === lastSyncedMeta ? { history: newLogs } : { progress, settings, history: newLogs });
  lastSyncedMeta = fingerprint;
  for (const log of newLogs) syncedLogIds.add(reviewLogId(log));
  return true;
}

/**
 * Removes the signed-in account's cached data from this device (on sign-out, or when
 * another account signs in). The data stays safe in the account on the server.
 */
export function clearLocalAccountData(): void {
  syncedLogIds.clear();
  lastSyncedMeta = '';
  setReviewLogs([]);
  writeSyncedSettings(Object.fromEntries(SYNCED_SETTING_KEYS.map((key) => [key, null])));
  void saveAllVocab([]);
  void saveAllGrammar([]);
  setLocalOwner(null);
}

/** True when settings/rank/history changed on this device and haven't been uploaded yet. */
export function hasUnsyncedMeta(): boolean {
  if (metaFingerprint(getUserRankData(), localSettingsObject()) !== lastSyncedMeta) return true;
  return getReviewLogs().some((log) => !syncedLogIds.has(reviewLogId(log)));
}
