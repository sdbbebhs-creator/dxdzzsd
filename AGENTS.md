# AGENTS.md

## Account storage (current — supersedes the Supabase-data notes below)

- Supabase is now **auth only**. All user data lives in Netlify Database, accessed only through `netlify/functions/data.mts` (`/api/data`), which verifies the Supabase access token (Bearer) and scopes every query to that user id.
- Schema `db/schema.ts`: `items` (user_id, kind, id, data, study), `review_logs` (append-only, de-duplicated by `timestamp|itemType|itemId`), `user_state` (progress, settings, `revision`). Every write bumps `revision`.
- Client data layer: `src/utils/cloudItems.ts` (replaces `supabaseItems.ts`). Failed network writes go into a per-account localStorage outbox and are replayed in order (`flushOutbox`).
- `src/utils/syncClient.ts` `pullAndMerge`: on first use (revision 0) migrates the old Supabase tables + this device's cache into the account. The device cache is tagged with its owner so another account never inherits it; sign-out clears it.
- `src/hooks/useCloudSync.ts` replaces Realtime: polls `?revision=1` every 15 s / on focus / online and reloads when another device changed data.
- The Supabase sections below describe the previous design and are kept only for history.

## Architecture

- React 19 + Vite SPA (`src/`). No Express server — the old `server.ts` was removed in favor of Netlify Functions.
- `netlify/functions/*.mts` — serverless endpoints using the Web `Request`/`Response` API with `export const config: Config = { path: '/api/...' }` for routing:
  - `lookup-item.mts` → `/api/ai/lookup-item` (Gemini-backed vocab/grammar autofill, offline fallback)
  - `optimize-fsrs.mts` → `/api/ai/optimize-fsrs` (Gemini-backed FSRS parameter tuning, offline fallback)
  - `context-practice.mts` → `/api/ai/context-practice` (Luyện Output 5 ngữ cảnh: `action` = `suggestContexts` | `sampleSentence` | `validate`, works for both vocab and grammar via `kind`). All Gemini calls use `responseMimeType: 'application/json'` + a `responseSchema`, try a small model fallback list, and return HTTP 429 `{ code: 'RATE_LIMITED' }` when every model is rate-limited.
  - Supabase is the sole runtime persistence layer: `vocab_items`, `grammar_items`, and `study_data`.
- `db/schema.ts` — Drizzle schema (`vocab_items`, `grammar_items`, each row is `{ user_id, id, data: jsonb, updated_at }`, one JSONB blob per item so the full `VocabItem`/`GrammarItem` shape doesn't need to be hand-modeled in SQL).
- `db/index.ts` — Drizzle client via `drizzle-orm/netlify-db`.
- Migrations live in `netlify/database/migrations/`, generated with `npx drizzle-kit generate --name <slug>`. Never edit or apply migrations manually — Netlify applies them automatically at deploy time.
- Auth: Supabase (`src/utils/supabaseClient.ts`) handles Email/Password sign-in. All runtime persistence is authenticated directly with `supabase.auth.getUser()` and RLS.
- **Cards + FSRS live in Supabase, in 3 tables** (SQL in `supabase/migrations/`). The code must work with the user's existing Supabase schema — never require new columns/tables there and never show "run the migration" style errors:
  - `vocab_items` / `grammar_items`: `{ user_id, id, data }`, one row per card; `data` is the card content **without** FSRS fields.
  - `study_data`: one row per **user** with the existing columns `user_id, vocab, grammar, created_at, updated_at`. `vocab`/`grammar` each hold one JSON object `{ [itemId]: StudyEntry }` (`state, stability, difficulty, reps, lapses, scheduled_days, elapsed_days, learning_steps, reviewDate, last_review, next_review`). Don't store FSRS values in separate columns. `parseStudyMap` accepts jsonb or a JSON string, and also the legacy format (array of full cards), which can seed an empty account.
- `src/utils/supabaseItems.ts` is the only Supabase data layer: `createItem` (insert item → get id → write initial FSRS into the `study_data` JSON, rolls back the item if step 2 fails), `saveStudyData` (review: read-modify-write of the user's JSON column, queued so local writes never overlap; inserts the row if missing), `saveItem`/`updateItemContent` (edits), `saveStudyDataBatch`, `bulkSaveItems`, `deleteItems`, `fetchAllUserData`, `rowsToItem`. Every write throws `SupabaseSyncError` with a Vietnamese user-facing message; callers in `App.tsx` `await` it and show an error toast via `reportSupabaseError` — never fire-and-forget. Logs use `console.log("Saving to Supabase:", ...)` / `console.error("Supabase Error:", ...)`.
- UI updates only after Supabase confirms (add, edit, delete, FSRS review, mark-all, import, sample pack, clear). Exception: context outputs update state first and toast on failure. Always write through `commitVocab`/`commitGrammar`/`commitList` in `App.tsx`, which keep state, the `*ListRef` refs (read by async handlers) and the IndexedDB cache in sync.
- Realtime: `src/hooks/useSupabaseRealtime.ts` opens one channel with INSERT/UPDATE/DELETE listeners on the item tables and INSERT/UPDATE on `study_data` (filtered by `user_id`; DELETE is checked client-side) and calls handlers in `App.tsx`. `study_data` events are parsed per column (`onStudyUpsert(kind, entries)`); an entry for a card that hasn't arrived yet is parked in `pendingStudyRef` and applied when the card row lands. On reconnect, tab focus or `online`, it calls `onResync` → full `loadFromSupabase()`.
- On login, `pullAndMerge` reads the three Supabase tables. `study_data` restores FSRS, settings, rank/EXP/streak and review history. Realtime listens to INSERT/UPDATE/DELETE on all three tables.
- New items always get `crypto.randomUUID()` ids via `newItemId()` — never reuse fixed ids like the sample pack's `sample-*`.
- Client persistence: `src/utils/storage.ts` manages IndexedDB/localStorage as a fast local cache shown before Supabase responds (it never overwrites data once Supabase has loaded).

- FSRS scheduler settings live in `src/utils/fsrs.ts` (`getFSRSSchedulerSettings`/`saveFSRSSchedulerSettings`, localStorage key `fsrs_scheduler_settings_v1`): custom weights, maximum interval, learning steps. Desired retention is clamped to 80–95%. `getFSRSRatingOutcomes` is the single source for button previews and `reviewCard`; learning steps only apply to new/in-step cards (`scheduled_days === 0`).
- FSRS settings are a single reactive store: `getFSRSSettings()` (cached snapshot of scheduler settings + `targetRetention`), `updateFSRSSettings(patch)`, `subscribeFSRSSettings()` in `src/utils/fsrs.ts`, exposed to React via `useFSRSSettings()` (`src/hooks/useFSRSSettings.ts`, `useSyncExternalStore`). Every write path (`saveFSRSSchedulerSettings`, `setActiveTargetRetention`, `saveUserFSRSConfig`) emits a change, and cross-tab `storage` events are forwarded. Review screens (`FlashcardTab`, `DailyReviewTab`, `ContextOutputModal`) must pass the hook's settings into `previewNextFSRSIntervals` so button labels re-render when settings change. `FSRSSettingsPanel` auto-applies each valid change — there is no Save step. `smartreview_fsrs_user_config_v2.targetRetention` is ignored on read; `fsrs_target_retention` is the only source of truth.
- Trợ Lý Đo Nhịp Trí Nhớ (`FSRSOptimizerModal.tsx`) is the only FSRS explainer surface — the old "Nguyên lý FSRS" tab was removed on purpose; don't re-add it. The recommended retention comes from `recommendRetention()` in `src/utils/memoryRhythm.ts` (pure, no browser APIs) which is imported by both the modal and `netlify/functions/optimize-fsrs.mts`; Gemini only writes the explanation and may nudge the number by at most ±0.02. `getMemoryLogsStats` measures retention only on logs with `prevScheduledDays > 0` and counts rating ≥ 2 as recalled. Don't add buttons that overwrite `smartreview_memory_logs_v2` with fake data — those logs feed the weights optimizer.
- `src/utils/fsrsOptimizer.ts` fits personal weights in the browser (replays review logs, minimizes log-loss, coordinate descent; min 400 reviews). UI: `src/components/FSRSSettingsPanel.tsx`, embedded in `FSRSOptimizerModal.tsx`.

## Conventions

- UI shell: `src/components/Sidebar.tsx` (desktop nav, md = icon rail, lg = full) + `src/components/Navbar.tsx` (contextual top bar; shows the active section title) + mobile bottom nav in `App.tsx`. All three read the same `navItems` array in `App.tsx` — add sections there, not in each nav.
- Design tokens live in the `@theme` block of `src/index.css`: the Tailwind `slate`/`emerald` scales, shadows and font weights are overridden there, so components keep using plain `slate-*`/`emerald-*` classes. Change the palette in one place instead of editing components.
- `animate-fade-in` / `animate-in` are opacity-only on purpose — a transform would make animated wrappers the containing block for `position: fixed` modals and full-screen games rendered inside tabs.

- Gemini keys stay server-side. The browser only talks to `/api/ai/*`; `src/utils/geminiPractice.ts` wraps the context-practice endpoint and owns the fallbacks (default tabs `DEFAULT_CONTEXTS`, offline scoring from `contextEngine.ts`). `ContextOutputModal.tsx` never calls Gemini directly.
- Gemini 1.5/2.0 Flash are retired and not available through Netlify AI Gateway; `gemini-2.5-flash` is the primary model. Check the `netlify-ai-gateway` skill's model list before changing models.

- Do not reintroduce automatic sample-data seeding. `getSampleData()` in `src/utils/storage.ts` exists only for the manual "Nạp mẫu"/"Nạp bộ thẻ mẫu" button (`BackupModal.tsx`, `handleLoadSampleData` in `App.tsx`) — new accounts must start empty.
- Netlify Functions in this repo use `.mts` and the Web API signature (`export default async (req: Request) => ...`), not the older Lambda-style handler signature.
- The Supabase URL and publishable anon key are safe to embed client-side; they are configured in `src/utils/supabaseClient.ts` via `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`.

## Rank & streak rules (`src/utils/rankSystem.ts`)

- A day counts (streak +1, rank kept) only when nothing is due **today** — App.tsx always uses `getTodayDate()` for rank bookkeeping, never the calendar's `selectedDate`. The full-day bonus is paid once per day.
- `checkDailyRankDecay(today, dueDates)` is idempotent via `streakSafeThrough`: a past day is only "missed" if some card's `reviewDate` is still on/before it (days with nothing due are free rest days). One shield per missed day; not enough shields → streak 0 and demote 1 tier. It runs on load and again when the tab becomes visible on a new day.
- Shields are only earned at `SHIELD_STREAK_MILESTONES` (max 3). There is intentionally no free "claim shield" button and no daily "rank protection" progress bar in `RankModal` — don't re-add them.
- Promotion progress everywhere uses `getRankProgress()` (weakest of streak / EXP / active days), not EXP alone.
