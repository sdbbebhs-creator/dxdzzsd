import { pgTable, text, jsonb, timestamp, bigint, primaryKey, index } from 'drizzle-orm/pg-core';

/**
 * One row per card (vocab or grammar) per account. `data` is the card content,
 * `study` its FSRS state — kept in the same row so a card and its schedule can
 * never drift apart.
 */
export const items = pgTable(
  'items',
  {
    userId: text('user_id').notNull(),
    kind: text('kind').notNull(), // 'vocab' | 'grammar'
    id: text('id').notNull(),
    data: jsonb('data').notNull(),
    study: jsonb('study'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.kind, table.id] })]
);

/** Review history, one row per review so devices only ever add to it. */
export const reviewLogs = pgTable(
  'review_logs',
  {
    userId: text('user_id').notNull(),
    id: text('id').notNull(),
    ts: text('ts').notNull(),
    data: jsonb('data').notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.id] }), index('review_logs_user_ts_idx').on(table.userId, table.ts)]
);

/**
 * Per-account settings + rank/EXP/streak. `revision` is bumped on every write to
 * any of this user's data so other devices can cheaply detect changes.
 */
export const userState = pgTable('user_state', {
  userId: text('user_id').primaryKey(),
  progress: jsonb('progress'),
  settings: jsonb('settings').notNull().default({}),
  revision: bigint('revision', { mode: 'number' }).notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
