import type { Config } from '@netlify/functions';
import { and, eq, inArray, notInArray, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { items, reviewLogs, userState } from '../../db/schema.js';

/**
 * Account data API. Every user's cards, FSRS state, settings, rank and review history
 * live in Netlify Database keyed by their Supabase user id, so the same account sees
 * the same data on every device.
 *
 * GET  /api/data            → full snapshot
 * GET  /api/data?revision=1 → { revision } (cheap change detection for other devices)
 * POST /api/data { op, ... } → { revision }
 */

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://yewgrnoiprxtlogayaob.supabase.co';
// Publishable anon key (safe to embed, same one the browser uses).
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_4GAnDJJPNa7lHP-Vvq7-Gg_O-3BHJdy';

type Kind = 'vocab' | 'grammar';
const isKind = (v: unknown): v is Kind => v === 'vocab' || v === 'grammar';

// Short-lived cache of verified tokens so every request doesn't round-trip to Supabase.
const tokenCache = new Map<string, { userId: string; until: number }>();

async function authenticate(req: Request): Promise<string | null> {
  const header = req.headers.get('authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  const cached = tokenCache.get(token);
  if (cached && cached.until > Date.now()) return cached.userId;

  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const user = (await res.json()) as { id?: string };
  if (!user?.id) return null;

  if (tokenCache.size > 500) tokenCache.clear();
  tokenCache.set(token, { userId: user.id, until: Date.now() + 60_000 });
  return user.id;
}

const json = (body: unknown, status = 200) => Response.json(body, { status });

async function bumpRevision(userId: string): Promise<number> {
  const [row] = await db
    .insert(userState)
    .values({ userId, revision: 1 })
    .onConflictDoUpdate({
      target: userState.userId,
      set: { revision: sql`${userState.revision} + 1`, updatedAt: sql`now()` },
    })
    .returning({ revision: userState.revision });
  return row.revision;
}

async function currentRevision(userId: string): Promise<number> {
  const [row] = await db.select({ revision: userState.revision }).from(userState).where(eq(userState.userId, userId));
  return row?.revision ?? 0;
}

type IncomingItem = { id: string; data?: unknown; study?: unknown };

function cleanItems(raw: unknown): IncomingItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((it): it is IncomingItem => !!it && typeof it === 'object' && typeof (it as IncomingItem).id === 'string' && (it as IncomingItem).id.length > 0);
}

type LogRecord = { timestamp?: unknown; itemType?: unknown; itemId?: unknown };
const logId = (log: LogRecord) => `${log.timestamp}|${log.itemType}|${log.itemId}`;

async function getSnapshot(userId: string) {
  const [rows, logs, [state]] = await Promise.all([
    db.select({ kind: items.kind, id: items.id, data: items.data, study: items.study, createdAt: items.createdAt })
      .from(items)
      .where(eq(items.userId, userId)),
    db.select({ data: reviewLogs.data }).from(reviewLogs).where(eq(reviewLogs.userId, userId)).orderBy(reviewLogs.ts),
    db.select().from(userState).where(eq(userState.userId, userId)),
  ]);

  const out: Record<Kind, { id: string; data: unknown; study: unknown }[]> = { vocab: [], grammar: [] };
  for (const row of rows) {
    if (isKind(row.kind)) out[row.kind].push({ id: row.id, data: row.data, study: row.study });
  }
  return {
    vocab: out.vocab,
    grammar: out.grammar,
    progress: state?.progress ?? null,
    settings: (state?.settings as Record<string, unknown>) ?? {},
    history: logs.map((l) => l.data),
    revision: state?.revision ?? 0,
  };
}

async function handleOp(userId: string, body: Record<string, unknown>): Promise<Response> {
  const op = body.op;
  const kind = body.kind;

  switch (op) {
    case 'upsertItems': {
      if (!isKind(kind)) return json({ error: 'Invalid kind' }, 400);
      const list = cleanItems(body.items);
      if (list.length) {
        await db
          .insert(items)
          .values(list.map((it) => ({ userId, kind, id: it.id, data: it.data ?? {}, study: it.study ?? null })))
          .onConflictDoUpdate({
            target: [items.userId, items.kind, items.id],
            set: {
              data: sql`excluded.data`,
              study: sql`coalesce(excluded.study, ${items.study})`,
              updatedAt: sql`now()`,
            },
          });
      }
      break;
    }
    case 'updateContent': {
      if (!isKind(kind)) return json({ error: 'Invalid kind' }, 400);
      const list = cleanItems(body.items);
      if (list.length) {
        await db
          .insert(items)
          .values(list.map((it) => ({ userId, kind, id: it.id, data: it.data ?? {}, study: null })))
          .onConflictDoUpdate({
            target: [items.userId, items.kind, items.id],
            set: { data: sql`excluded.data`, updatedAt: sql`now()` },
          });
      }
      break;
    }
    case 'updateStudy': {
      if (!isKind(kind)) return json({ error: 'Invalid kind' }, 400);
      const list = cleanItems(body.items);
      // One UPDATE per card: each card's FSRS state is independent, so two devices
      // reviewing different cards never overwrite each other.
      await Promise.all(
        list.map((it) =>
          db
            .update(items)
            .set({ study: it.study ?? null, updatedAt: sql`now()` })
            .where(and(eq(items.userId, userId), eq(items.kind, kind), eq(items.id, it.id)))
        )
      );
      break;
    }
    case 'deleteItems': {
      if (!isKind(kind)) return json({ error: 'Invalid kind' }, 400);
      const ids = Array.isArray(body.ids) ? body.ids.filter((id): id is string => typeof id === 'string') : [];
      if (ids.length) {
        await db.delete(items).where(and(eq(items.userId, userId), eq(items.kind, kind), inArray(items.id, ids)));
      }
      break;
    }
    case 'pruneItems': {
      // Deletes every card of `kind` that is not in keepIds (used by "replace all" / clear).
      if (!isKind(kind)) return json({ error: 'Invalid kind' }, 400);
      const keep = Array.isArray(body.keepIds) ? body.keepIds.filter((id): id is string => typeof id === 'string') : [];
      const where = keep.length
        ? and(eq(items.userId, userId), eq(items.kind, kind), notInArray(items.id, keep))
        : and(eq(items.userId, userId), eq(items.kind, kind));
      await db.delete(items).where(where);
      break;
    }
    case 'saveMeta': {
      const patch: Partial<typeof userState.$inferInsert> = {};
      if (body.progress !== undefined && body.progress !== null) patch.progress = body.progress;
      if (body.settings && typeof body.settings === 'object') patch.settings = body.settings as Record<string, unknown>;
      if (Object.keys(patch).length) {
        await db
          .insert(userState)
          .values({ userId, settings: {}, ...patch })
          .onConflictDoUpdate({ target: userState.userId, set: { ...patch, updatedAt: sql`now()` } });
      }
      const history = Array.isArray(body.history) ? (body.history as LogRecord[]).filter((l) => l && typeof l === 'object' && typeof l.timestamp === 'string') : [];
      for (let i = 0; i < history.length; i += 1000) {
        const part = history.slice(i, i + 1000);
        await db
          .insert(reviewLogs)
          .values(part.map((log) => ({ userId, id: logId(log), ts: String(log.timestamp), data: log })))
          .onConflictDoNothing();
      }
      break;
    }
    default:
      return json({ error: 'Unknown op' }, 400);
  }

  return json({ revision: await bumpRevision(userId) });
}

export default async (req: Request) => {
  let userId: string | null;
  try {
    userId = await authenticate(req);
  } catch (error) {
    console.error('Auth check failed:', error);
    return json({ error: 'Không xác thực được phiên đăng nhập.' }, 503);
  }
  if (!userId) return json({ error: 'Phiên đăng nhập đã hết hạn, hãy đăng nhập lại.', code: 'UNAUTHORIZED' }, 401);

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url);
      if (url.searchParams.has('revision')) return json({ revision: await currentRevision(userId) });
      return json(await getSnapshot(userId));
    }
    if (req.method === 'POST') {
      const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
      if (!body || typeof body !== 'object') return json({ error: 'Invalid body' }, 400);
      return await handleOp(userId, body);
    }
    return json({ error: 'Method not allowed' }, 405);
  } catch (error) {
    console.error('Data API error:', error);
    return json({ error: 'Máy chủ không lưu được dữ liệu, hãy thử lại.' }, 500);
  }
};

export const config: Config = {
  path: '/api/data',
};
