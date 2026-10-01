import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './utils/supabaseClient';
import { pullAndMerge, pushLocalChanges, applyCloudMeta, clearLocalAccountData, hasUnsyncedMeta } from './utils/syncClient';
import { onLocalChange } from './utils/localChanges';
import {
  newItemId,
  withItemId,
  fetchAllUserData,
  createItem,
  saveItem,
  updateItemContent,
  saveStudyData,
  saveStudyDataBatch,
  bulkSaveItems,
  deleteItems,
  describeCloudError,
  flushOutbox,
  getWriteEpoch,
  hasPendingWrites,
  getPendingChangeCount,
  onPendingChangesUpdate,
  type ItemKind,
} from './utils/cloudItems';
import { useCloudSync } from './hooks/useCloudSync';
import { reloadFSRSSettings } from './utils/fsrs';
import { AuthScreen } from './components/AuthScreen';
import { Calendar, Layers, BookOpen, FileText, BarChart3, Plus, CheckCircle2, AlertTriangle, Gamepad2 } from 'lucide-react';
import { VocabItem, GrammarItem, ReviewRating } from './types';
import {
  getTodayDate,
  addDays,
  diffDays,
  createDefaultFSRSCard,
  updateCardFSRS,
} from './utils/fsrs';
import {
  getAllVocab,
  getAllGrammar,
  saveAllVocab,
  saveAllGrammar,
  getSampleData,
  ensureFSRSVocab,
  ensureFSRSGrammar,
  saveReviewLog,
} from './utils/storage';
import { Navbar } from './components/Navbar';
import { Sidebar, type NavItem } from './components/Sidebar';
import { DailyReviewTab } from './components/DailyReviewTab';
import { FlashcardTab } from './components/FlashcardTab';
import { VocabListTab } from './components/VocabListTab';
import { GrammarListTab } from './components/GrammarListTab';
import { StatsTab } from './components/StatsTab';
import { GameHubTab } from './components/games/GameHubTab';
import { AddEditModal } from './components/AddEditModal';
import { BackupModal } from './components/BackupModal';
import { ImageLightboxModal } from './components/ImageLightboxModal';
import { FireCelebrationOverlay } from './components/FireCelebrationOverlay';
import { ContextOutputModal } from './components/ContextOutputModal';
import { FSRSOptimizerModal } from './components/FSRSOptimizerModal';
import { RankModal } from './components/RankModal';
import { UserRankData, RankTierDefinition } from './types';
import {
  getUserRankData,
  checkDailyRankDecay,
  recordStudyForRank,
  recordAllCardsCompletedForRank,
  getRankTierByKey,
} from './utils/rankSystem';

type TabType = 'review' | 'flashcard' | 'vocab' | 'grammar' | 'games' | 'stats';

function getInitialVocab(): VocabItem[] {
  try {
    const local = localStorage.getItem('vocab_data_v2_backup');
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(ensureFSRSVocab);
      }
    }
  } catch (e) {
    console.warn('localStorage read error:', e);
  }
  return [];
}

function getInitialGrammar(): GrammarItem[] {
  try {
    const local = localStorage.getItem('grammar_data_v2_backup');
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(ensureFSRSGrammar);
      }
    }
  } catch (e) {
    console.warn('localStorage read error:', e);
  }
  return [];
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('review');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDate());
  const [vocabList, setVocabList] = useState<VocabItem[]>(getInitialVocab);
  const [grammarList, setGrammarList] = useState<GrammarItem[]>(getInitialGrammar);

  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const hasSyncedInitialData = useRef(false);
  const syncDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cloudReady, setCloudReady] = useState(0);
  const vocabListRef = useRef(vocabList);
  const grammarListRef = useRef(grammarList);
  vocabListRef.current = vocabList;
  grammarListRef.current = grammarList;

  // Track Supabase auth session
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (mounted) setSession(data.session);
      } catch (error) {
        console.error('Supabase auth session error:', error);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) hasSyncedInitialData.current = false;
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // Toast (errors stay longer and use the alert style)
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, tone: 'success' | 'error' = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message: msg, tone });
    toastTimer.current = setTimeout(() => setToast(null), tone === 'error' ? 6000 : 3000);
  }, []);

  /** Logs a failed save/load and tells the user instead of swallowing it. */
  const reportCloudError = useCallback(
    (error: unknown) => {
      console.error('Cloud Error:', error);
      showToast(`⚠️ ${describeCloudError(error)}`, 'error');
    },
    [showToast]
  );

  // Replace a list in state, the ref (read by async handlers) and the local cache in one go
  const commitVocab = useCallback((update: (prev: VocabItem[]) => VocabItem[]) => {
    const next = update(vocabListRef.current);
    if (next === vocabListRef.current) return;
    vocabListRef.current = next;
    setVocabList(next);
    saveAllVocab(next);
  }, []);

  const commitGrammar = useCallback((update: (prev: GrammarItem[]) => GrammarItem[]) => {
    const next = update(grammarListRef.current);
    if (next === grammarListRef.current) return;
    grammarListRef.current = next;
    setGrammarList(next);
    saveAllGrammar(next);
  }, []);

  const commitList = useCallback(
    (kind: ItemKind, update: (prev: Array<VocabItem | GrammarItem>) => Array<VocabItem | GrammarItem>) => {
      if (kind === 'vocab') commitVocab(update as unknown as (prev: VocabItem[]) => VocabItem[]);
      else commitGrammar(update as unknown as (prev: GrammarItem[]) => GrammarItem[]);
    },
    [commitVocab, commitGrammar]
  );

  // The account (Netlify Database via /api/data) is the source of truth for cards and FSRS
  const cloudLoadedRef = useRef(false);
  const loadSeqRef = useRef(0);
  const [pendingChanges, setPendingChanges] = useState(getPendingChangeCount);
  useEffect(() => onPendingChangesUpdate(setPendingChanges), []);

  const applyRankFromStorage = useCallback(() => {
    reloadFSRSSettings();
    const rd = getUserRankData();
    setRankData(rd);
    setStreakCount(rd.streakCount ?? 0);
  }, []);

  /** Reloads cards, settings and rank from the account (another device changed something). */
  const loadFromCloud = useCallback(async () => {
    const seq = ++loadSeqRef.current;
    const epoch = getWriteEpoch();
    const remote = await fetchAllUserData();
    // A newer load started, or this device wrote meanwhile — the snapshot may be stale
    if (seq !== loadSeqRef.current || epoch !== getWriteEpoch() || hasPendingWrites()) return;

    const same = (a: unknown[], b: unknown[]) => a.length === b.length && JSON.stringify(a) === JSON.stringify(b);
    commitVocab((prev) => (same(prev, remote.vocab) ? prev : remote.vocab));
    commitGrammar((prev) => (same(prev, remote.grammar) ? prev : remote.grammar));
    // Don't overwrite settings changed here that are about to be uploaded
    if (!hasUnsyncedMeta() && applyCloudMeta(remote).settingsChanged) applyRankFromStorage();
  }, [commitVocab, commitGrammar, applyRankFromStorage]);

  /**
   * On login: uploads queued offline changes, then loads the account (moving any
   * existing data from the old storage / this device into it the first time).
   */
  const syncInProgressRef = useRef(false);
  const initialSync = useCallback(async () => {
    if (!session || syncInProgressRef.current) return;
    syncInProgressRef.current = true;
    try {
      await flushOutbox().catch(() => {});
      // Still offline with unsent changes: keep showing this device's copy and retry later
      if (hasPendingWrites()) return;
      const synced = await pullAndMerge(session.user.id, vocabListRef.current, grammarListRef.current);
      cloudLoadedRef.current = true;
      commitVocab(() => synced.vocab);
      commitGrammar(() => synced.grammar);
      if (synced.settingsChanged) applyRankFromStorage();
      setCloudReady((n) => n + 1);
    } catch (error) {
      reportCloudError(error);
    } finally {
      syncInProgressRef.current = false;
    }
  }, [session, commitVocab, commitGrammar, applyRankFromStorage, reportCloudError]);

  useEffect(() => {
    if (!session || hasSyncedInitialData.current) return;
    hasSyncedInitialData.current = true;
    cloudLoadedRef.current = false;
    initialSync();
  }, [session, initialSync]);

  // Picks up changes made on other devices (polling + focus/online) and retries a failed first load
  useCloudSync(
    session?.user.id ?? null,
    () => (cloudLoadedRef.current ? loadFromCloud().catch((err) => console.warn('Cloud reload failed:', err)) : initialSync()),
    () => cloudLoadedRef.current
  );

  // Debounced persistence of settings, rank/EXP/streak and review history into study_data
  useEffect(() => {
    if (!session || !cloudLoadedRef.current) return;

    if (syncDebounceTimer.current) clearTimeout(syncDebounceTimer.current);
    const schedule = () => {
      if (syncDebounceTimer.current) clearTimeout(syncDebounceTimer.current);
      syncDebounceTimer.current = setTimeout(() => {
        pushLocalChanges().catch((err) =>
          console.warn('Cloud push failed, will retry on next change:', err)
        );
      }, 1500);
    };
    schedule();
    const unsubscribe = onLocalChange(schedule);

    return () => {
      unsubscribe();
      if (syncDebounceTimer.current) clearTimeout(syncDebounceTimer.current);
    };
  }, [session, vocabList, grammarList, cloudReady]);

  const handleSwitchTab = useCallback((tab: TabType) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Ensure whenever activeTab changes, the viewport scrolls immediately to top
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab]);

  // Harmonious Dark Theme State (defaults to true as requested)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('theme_mode');
      if (saved) return saved === 'dark';
    } catch {}
    return true; // Default to dark mode
  });

  useEffect(() => {
    try {
      localStorage.setItem('theme_mode', isDarkMode ? 'dark' : 'light');
    } catch {}
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{
    type: 'vocab' | 'grammar';
    data: VocabItem | GrammarItem;
  } | null>(null);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; caption?: string } | null>(null);
  
  // Fire Celebration & Animated Rank Bar Fill Config
  const [fireCelebrationConfig, setFireCelebrationConfig] = useState<{
    isOpen: boolean;
    mode: 'rank-defense' | 'streak' | 'rank-up';
    rankData?: UserRankData;
    targetCards?: number;
    reviewedCards?: number;
    startPercent?: number;
    newTier?: RankTierDefinition;
  }>({
    isOpen: false,
    mode: 'rank-defense',
  });

  const [contextModalItem, setContextModalItem] = useState<VocabItem | GrammarItem | null>(null);
  const [showFSRSOptimizer, setShowFSRSOptimizer] = useState<boolean>(false);

  // Streak & Rank System (Default streak is 0 as requested)
  const [rankData, setRankData] = useState<UserRankData>(getUserRankData);
  const [streakCount, setStreakCount] = useState<number>(() => {
    const init = getUserRankData();
    return init.streakCount ?? 0;
  });
  const [isStreakJumping, setIsStreakJumping] = useState<boolean>(false);
  const [isRankModalOpen, setIsRankModalOpen] = useState<boolean>(false);

  // Update streak and EXP for Rank when an item is reviewed or output is submitted
  const recordStudyActivity = useCallback((rating?: ReviewRating, isContextOutput = false, progressMessage?: string) => {
    const today = getTodayDate();
    const result = recordStudyForRank({ rating, isContextOutput, todayDate: today });

    setRankData(result.rankData);
    setStreakCount(result.rankData.streakCount);

    // Kích hoạt hiệu ứng lửa nhảy ăn mừng ở Navbar
    setIsStreakJumping(true);
    setTimeout(() => setIsStreakJumping(false), 1400);

    const tier = getRankTierByKey(result.rankData.tierKey);

    if (result.rankUp && result.newTier) {
      showToast(`🎉 THĂNG HẠNG: Chúc mừng bạn đã lên Rank ${result.newTier.nameVi} (${result.newTier.titleVi})! +${result.expGained} EXP`);
      setFireCelebrationConfig({
        isOpen: true,
        mode: 'rank-up',
        rankData: result.rankData,
        newTier: result.newTier,
        startPercent: result.prevProgressPercent,
        targetCards: result.targetCards,
        reviewedCards: result.rankData.todayReviewedCount,
      });
    } else {
      showToast(
        progressMessage ??
          (result.rankData.todayProtected
            ? `🔥 +${result.expGained} EXP · Chuỗi ${result.rankData.streakCount} ngày · Rank ${tier.nameVi} đã được giữ hôm nay`
            : `🔥 +${result.expGained} EXP · Chuỗi ${result.rankData.streakCount} ngày · Cần hoàn thành tất cả lịch thẻ để bảo vệ Rank ${tier.nameVi}!`)
      );
    }
  }, []);

  // After a review: the day only counts (streak +1, rank kept) once nothing is due today anymore.
  // Always uses the real current date, never the date picked in the calendar, so reviewing
  // another day's cards can't grant a streak for that day.
  const recordReviewProgressForRank = useCallback(
    (
      vocab: VocabItem[],
      grammar: GrammarItem[],
      cardsReviewedCount: number,
      rating: ReviewRating | undefined,
      progressMessage: (remainingVocab: number, remainingGrammar: number) => string
    ) => {
      const today = getTodayDate();
      const remainingVocab = vocab.filter((item) => item.reviewDate <= today).length;
      const remainingGrammar = grammar.filter((item) => item.reviewDate <= today).length;

      if (remainingVocab + remainingGrammar > 0) {
        // Còn thẻ chưa hoàn thành: chưa tăng streak và chưa bảo vệ rank
        recordStudyActivity(rating, false, progressMessage(remainingVocab, remainingGrammar));
        return;
      }

      if (getUserRankData().lastCompletedAllScheduleDate === today) {
        // Đã nhận thưởng hoàn thành hôm nay: ôn thêm chỉ được EXP thường, không nhận lại thưởng cả ngày
        recordStudyActivity(rating, false, '✅ Đã hoàn thành lịch hôm nay · Ôn thêm được cộng EXP thường.');
        return;
      }

      // Hoàn thành TẤT CẢ lịch thẻ hôm nay: mới được + streak và bảo vệ rank!
      const result = recordAllCardsCompletedForRank({ todayDate: today, cardsReviewedCount });

      setRankData(result.rankData);
      setStreakCount(result.rankData.streakCount);

      setIsStreakJumping(true);
      setTimeout(() => setIsStreakJumping(false), 1400);

      const tier = getRankTierByKey(result.rankData.tierKey);

      // Hiệu ứng bốc lửa bảo vệ rank chỉ hiện lên 1 lần khi làm xong!
      if (result.shouldShowCelebration) {
        setFireCelebrationConfig({
          isOpen: true,
          mode: result.rankUp ? 'rank-up' : 'rank-defense',
          rankData: result.rankData,
          newTier: result.newTier,
          targetCards: cardsReviewedCount,
          reviewedCards: cardsReviewedCount,
          startPercent: 0,
        });
      }

      if (result.rankUp && result.newTier) {
        showToast(`🎉 THĂNG HẠNG: Chúc mừng bạn đã lên Rank ${result.newTier.nameVi} (${result.newTier.titleVi})! Đã hoàn thành tất cả lịch thẻ hôm nay! +${result.expGained} EXP`);
      } else if (result.justProtectedRank) {
        showToast(`🔥 HOÀN THÀNH TẤT CẢ LỊCH THẺ HÔM NAY! ĐÃ BẢO VỆ RANK ${tier.nameVi.toUpperCase()} & +1 CHUỖI LỬA! +${result.expGained} EXP`);
      } else {
        showToast(`🔥 Đã hoàn thành tất cả lịch thẻ hôm nay! +${result.expGained} EXP`);
      }
    },
    [recordStudyActivity]
  );

  // Callback to update completed context outputs for both Vocab and Grammar
  const handleCompleteContexts = useCallback(async (itemId: string, outputs: Record<number, string>, kind: 'vocab' | 'grammar') => {
    const count = Object.values(outputs).filter((s) => s && s.trim().length > 0).length;
    const patch = { completedContextsCount: count, contextOutputs: outputs, lastOutputDate: selectedDate };

    // Outputs show up right away while typing; the save below reports a toast if it fails
    const current = (kind === 'vocab' ? vocabListRef.current : grammarListRef.current).find((item) => item.id === itemId);
    const updatedItem = current ? ({ ...current, ...patch } as VocabItem | GrammarItem) : undefined;
    if (!updatedItem) return;

    try {
      // Persist first. The UI and EXP are committed only after the account save succeeds (or is queued offline).
      await updateItemContent(kind, updatedItem);
      commitList(kind, (prev) => prev.map((item) => (item.id === itemId ? updatedItem : item)));
      setContextModalItem((prev) => {
        if (prev && prev.id === itemId) return { ...prev, ...patch } as VocabItem | GrammarItem;
        return prev;
      });
      if (count >= 5) recordStudyActivity(undefined, true);
    } catch (error) {
      reportCloudError(error);
    }
  }, [selectedDate, recordStudyActivity, commitList, reportCloudError]);

  const lastRankCheckDateRef = useRef<string | null>(null);

  // Daily Rank & Streak Maintenance check. Past days only count as missed if they had due cards.
  const runDailyRankCheck = useCallback(() => {
    const today = getTodayDate();
    lastRankCheckDateRef.current = today;
    const dueDates = [...vocabListRef.current, ...grammarListRef.current].map((item) => item.reviewDate);
    const decayResult = checkDailyRankDecay(today, dueDates);
    setRankData(decayResult.rankData);
    setStreakCount(decayResult.rankData.streakCount);

    if (decayResult.decayed) {
      showToast(`⚠️ Bỏ lỡ ngày học: Chuỗi lửa reset về 0 và rank tụt xuống ${getRankTierByKey(decayResult.rankData.tierKey).nameVi}!`);
    } else if (decayResult.shieldUsed) {
      showToast(`🛡️ Đã dùng ${decayResult.shieldsUsed} Khiên bảo vệ để giữ vững Rank & Chuỗi lửa cho bạn!`);
    }
  }, []);

  // Background DB sync and daily rank maintenance check
  useEffect(() => {
    async function loadData() {
      try {
        const loadedVocab = await getAllVocab();
        const loadedGrammar = await getAllGrammar();

        // Never overwrite fresher data that already came from the account
        if (!cloudLoadedRef.current && (loadedVocab.length > 0 || loadedGrammar.length > 0)) {
          setVocabList(loadedVocab);
          setGrammarList(loadedGrammar);
          vocabListRef.current = loadedVocab;
          grammarListRef.current = loadedGrammar;
        }
      } catch (err) {
        console.error('Failed to load DB data in background:', err);
      }
      runDailyRankCheck();
    }

    loadData();
  }, [runDailyRankCheck]);

  // Re-run the daily check when the app is reopened on a new day (e.g. left open overnight)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && lastRankCheckDateRef.current && lastRankCheckDateRef.current !== getTodayDate()) {
        runDailyRankCheck();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [runDailyRankCheck]);

  // Cards whose review is still being saved (ignores double taps)
  const reviewsInFlight = useRef(new Set<string>());

  /**
   * Rates one card with FSRS: waits for the account save to confirm the new
   * values before updating the UI, the review log and rank progress.
   */
  const rateItem = useCallback(
    async (kind: ItemKind, id: string, rating: ReviewRating) => {
      const key = `${kind}:${id}`;
      if (reviewsInFlight.current.has(key)) return;
      const list: Array<VocabItem | GrammarItem> = kind === 'vocab' ? vocabListRef.current : grammarListRef.current;
      const item = list.find((i) => i.id === id);
      if (!item) return;

      const { updatedCard } = updateCardFSRS(item, rating);
      const reviewed = { ...updatedCard, lastOutputDate: item.lastOutputDate || selectedDate };

      reviewsInFlight.current.add(key);
      try {
        await saveStudyData(kind, reviewed);
        if (reviewed.lastOutputDate !== item.lastOutputDate) await updateItemContent(kind, reviewed);
      } catch (error) {
        reportCloudError(error);
        return;
      } finally {
        reviewsInFlight.current.delete(key);
      }

      saveReviewLog({
        itemId: id,
        itemType: kind,
        rating,
        timestamp: new Date().toISOString(),
        prevScheduledDays: item.scheduled_days || item.interval || 0,
        nextScheduledDays: updatedCard.scheduled_days || updatedCard.interval || 1,
        stability: updatedCard.stability || 0,
        difficulty: updatedCard.difficulty || 0,
        state: updatedCard.state || 2,
      });
      commitList(kind, (prev) => prev.map((i) => (i.id === id ? reviewed : i)));

      const label = kind === 'vocab' ? 'từ vựng' : 'ngữ pháp';
      recordReviewProgressForRank(vocabListRef.current, grammarListRef.current, 1, rating, (v, g) =>
        `Đã ôn 1 ${label}! Còn ${v + g} thẻ đến hạn hôm nay (V:${v}, G:${g}) cần ôn để bảo vệ Rank & tăng chuỗi!`
      );
      try {
        await pushLocalChanges();
      } catch (error) {
        reportCloudError(error);
      }
    },
    [selectedDate, session, commitList, reportCloudError, recordReviewProgressForRank]
  );

  const handleRateVocab = useCallback((id: string, rating: ReviewRating) => rateItem('vocab', id, rating), [rateItem]);
  const handleRateGrammar = useCallback((id: string, rating: ReviewRating) => rateItem('grammar', id, rating), [rateItem]);

  // Batch review all due items
  const handleMarkAllReviewed = useCallback(
    async (type: 'vocab' | 'grammar') => {
      const sourceList: Array<VocabItem | GrammarItem> = type === 'vocab' ? vocabListRef.current : grammarListRef.current;
      const due = sourceList.filter((item) => item.reviewDate <= selectedDate);
      if (due.length === 0) {
        showToast(type === 'vocab' ? 'Không có từ vựng nào đến hạn để đánh dấu.' : 'Không có điểm ngữ pháp nào đến hạn để đánh dấu.');
        return;
      }

      const reviewed = new Map<string, VocabItem | GrammarItem>(
        due.map((item) => {
          const { updatedCard } = updateCardFSRS(item, 3);
          return [item.id, { ...updatedCard, lastOutputDate: item.lastOutputDate || selectedDate }];
        })
      );

      try {
        await saveStudyDataBatch(type, [...reviewed.values()]);
      } catch (error) {
        reportCloudError(error);
        return;
      }

      const now = new Date();
      for (const item of due) {
        const updated = reviewed.get(item.id)!;
        saveReviewLog({
          itemId: item.id,
          itemType: type,
          rating: 3,
          timestamp: new Date(now.getTime() + due.indexOf(item)).toISOString(),
          prevScheduledDays: item.scheduled_days || item.interval || 0,
          nextScheduledDays: updated.scheduled_days || updated.interval || 1,
          stability: updated.stability || 0,
          difficulty: updated.difficulty || 0,
          state: updated.state || 2,
        });
      }
      commitList(type, (prev) => prev.map((item) => reviewed.get(item.id) ?? item));
      const label = type === 'vocab' ? 'từ vựng' : 'ngữ pháp';
      recordReviewProgressForRank(vocabListRef.current, grammarListRef.current, due.length, 3, (v, g) =>
        `Đã ôn tất cả ${label}! Còn ${v + g} thẻ đến hạn hôm nay (V:${v}, G:${g}) cần hoàn thành để bảo vệ Rank & tăng chuỗi!`
      );
      try {
        await pushLocalChanges();
      } catch (error) {
        reportCloudError(error);
      }
    },
    [selectedDate, session, showToast, commitList, reportCloudError, recordReviewProgressForRank]
  );

  // Save new or edited Vocab
  const handleSaveVocab = async (itemData: Partial<VocabItem>) => {
    setEditingItem(null);
    const existing = itemData.id ? vocabListRef.current.find((v) => v.id === itemData.id) : undefined;
    try {
      if (existing) {
        // Edit: cập nhật đúng dòng có id này trong vocab_items + study_data
        const edited = { ...existing, ...itemData } as VocabItem;
        await saveItem('vocab', edited);
        commitVocab((prev) => prev.map((v) => (v.id === edited.id ? edited : v)));
        showToast('Đã lưu thay đổi từ vựng!');
      } else {
        const draft: VocabItem = {
          ...createDefaultFSRSCard(itemData.reviewDate || getTodayDate()),
          id: newItemId(),
          word: itemData.word || '',
          phonetic: itemData.phonetic,
          meaning: itemData.meaning || '',
          type: itemData.type || 'n',
          topic: itemData.topic || 'Chung',
          example: itemData.example,
          exampleVi: itemData.exampleVi,
          imageUrl: itemData.imageUrl,
          audioUrl: itemData.audioUrl,
          createdAt: new Date().toISOString(),
        };
        // Create the content row and its initial study_data entry before updating UI.
        const created = await createItem('vocab', draft);
        // Realtime may already have added it — never show it twice
        commitVocab((prev) => [created, ...prev.filter((v) => v.id !== created.id)]);
        showToast('Đã thêm từ vựng mới thành công!');
      }
    } catch (error) {
      reportCloudError(error);
    }
  };

  // Save new or edited Grammar
  const handleSaveGrammar = async (itemData: Partial<GrammarItem>) => {
    setEditingItem(null);
    const existing = itemData.id ? grammarListRef.current.find((g) => g.id === itemData.id) : undefined;
    try {
      if (existing) {
        const edited = { ...existing, ...itemData } as GrammarItem;
        await saveItem('grammar', edited);
        commitGrammar((prev) => prev.map((g) => (g.id === edited.id ? edited : g)));
        showToast('Đã lưu thay đổi ngữ pháp!');
      } else {
        const draft: GrammarItem = {
          ...createDefaultFSRSCard(itemData.reviewDate || getTodayDate()),
          id: newItemId(),
          title: itemData.title || '',
          type: itemData.type || 'Cấu trúc',
          formula: itemData.formula || '',
          explanation: itemData.explanation || '',
          example: itemData.example,
          exampleVi: itemData.exampleVi,
          imageUrl: itemData.imageUrl,
          audioUrl: itemData.audioUrl,
          createdAt: new Date().toISOString(),
        };
        const created = await createItem('grammar', draft);
        commitGrammar((prev) => [created, ...prev.filter((g) => g.id !== created.id)]);
        showToast('Đã thêm điểm ngữ pháp mới!');
      }
    } catch (error) {
      reportCloudError(error);
    }
  };

  const confirmDelete = (message: string) => {
    try {
      if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        return window.confirm(message);
      }
    } catch {}
    return true;
  };

  // Delete handlers
  const handleDeleteVocab = async (id: string) => {
    if (!confirmDelete('Bạn có chắc chắn muốn xóa từ vựng này không?')) return;
    try {
      await deleteItems('vocab', [id]);
      commitVocab((prev) => prev.filter((v) => v.id !== id));
      showToast('Đã xóa từ vựng.');
    } catch (error) {
      reportCloudError(error);
    }
  };

  const handleDeleteGrammar = async (id: string) => {
    if (!confirmDelete('Bạn có chắc chắn muốn xóa điểm ngữ pháp này không?')) return;
    try {
      await deleteItems('grammar', [id]);
      commitGrammar((prev) => prev.filter((g) => g.id !== id));
      showToast('Đã xóa điểm ngữ pháp.');
    } catch (error) {
      reportCloudError(error);
    }
  };

  /**
   * Replaces both lists: deletes cards that disappear, saves the new/changed ones to
   * the account, and only then updates the UI. Returns false (after a toast) on failure.
   */
  const replaceAllData = async (nextVocab: VocabItem[], nextGrammar: GrammarItem[], toSave = { vocab: nextVocab, grammar: nextGrammar }) => {
    const keepVocab = new Set(nextVocab.map((v) => v.id));
    const keepGrammar = new Set(nextGrammar.map((g) => g.id));
    try {
      await deleteItems('vocab', vocabListRef.current.filter((v) => !keepVocab.has(v.id)).map((v) => v.id));
      await deleteItems('grammar', grammarListRef.current.filter((g) => !keepGrammar.has(g.id)).map((g) => g.id));
      await bulkSaveItems('vocab', toSave.vocab);
      await bulkSaveItems('grammar', toSave.grammar);
    } catch (error) {
      reportCloudError(error);
      // Part of the batch may have been written; show what the account really has now
      loadFromCloud().catch((err) => console.error('Cloud Error: reload failed', err));
      return false;
    }
    commitVocab(() => nextVocab);
    commitGrammar(() => nextGrammar);
    return true;
  };

  // Import JSON data
  const handleImportData = async (importedVocab: VocabItem[], importedGrammar: GrammarItem[], mode: 'merge' | 'replace') => {
    const newVocab = importedVocab.map(withItemId).map(ensureFSRSVocab);
    const newGrammar = importedGrammar.map(withItemId).map(ensureFSRSGrammar);
    let ok: boolean;
    if (mode === 'replace') {
      ok = await replaceAllData(newVocab, newGrammar);
    } else {
      // Merge: only cards that aren't here yet are added
      const existingVocabIds = new Set(vocabListRef.current.map((v) => v.id));
      const addedVocab = newVocab.filter((v) => !existingVocabIds.has(v.id));
      const existingGrammarIds = new Set(grammarListRef.current.map((g) => g.id));
      const addedGrammar = newGrammar.filter((g) => !existingGrammarIds.has(g.id));
      ok = await replaceAllData(
        [...vocabListRef.current, ...addedVocab],
        [...grammarListRef.current, ...addedGrammar],
        { vocab: addedVocab, grammar: addedGrammar }
      );
    }
    if (ok) showToast('Đã khôi phục dữ liệu thành công!');
  };

  // Load sample pack (fresh UUIDs so each load creates its own rows)
  const handleLoadSampleData = async () => {
    const sample = getSampleData();
    const vocab = sample.vocab.map((v) => ({ ...v, id: newItemId() }));
    const grammar = sample.grammar.map((g) => ({ ...g, id: newItemId() }));
    if (await replaceAllData(vocab, grammar)) showToast('Đã nạp bộ dữ liệu mẫu!');
  };

  // Clear all
  const handleClearAllData = async () => {
    if (await replaceAllData([], [])) showToast('Đã xóa toàn bộ dữ liệu.');
  };

  // Calculate due count badge for today
  const todayDueCount =
    vocabList.filter((v) => v.reviewDate <= getTodayDate()).length +
    grammarList.filter((g) => g.reviewDate <= getTodayDate()).length;

  const openAddModal = useCallback(() => {
    setEditingItem(null);
    setIsAddModalOpen(true);
  }, []);

  const navItems: NavItem<TabType>[] = [
    { id: 'review', label: 'Ôn tập hôm nay', shortLabel: 'Ôn tập', description: 'Lịch ôn theo FSRS và hàng đợi ưu tiên', icon: Calendar, badge: todayDueCount },
    { id: 'flashcard', label: 'Thẻ lật', shortLabel: 'Thẻ lật', description: 'Lật thẻ và tự đánh giá mức độ nhớ', icon: Layers },
    { id: 'vocab', label: 'Từ vựng', shortLabel: 'Từ vựng', description: `${vocabList.length} từ trong kho`, icon: BookOpen, badge: vocabList.length },
    { id: 'grammar', label: 'Ngữ pháp', shortLabel: 'Ngữ pháp', description: `${grammarList.length} điểm ngữ pháp`, icon: FileText, badge: grammarList.length },
    { id: 'games', label: 'Đấu trường 3D', shortLabel: 'Game', description: 'Ôn tập qua mini-game 3D', icon: Gamepad2, badge: '3D', badgeTone: 'accent' },
    { id: 'stats', label: 'Thống kê', shortLabel: 'Thống kê', description: 'Tiến độ, độ ghi nhớ và trí nhớ dài hạn', icon: BarChart3 },
  ];
  const activeNavItem = navItems.find((n) => n.id === activeTab) ?? navItems[0];

  // Keyboard shortcut: "N" opens the add modal, 1–6 switch sections.
  // Flashcards and games own the keyboard, so shortcuts are off there.
  useEffect(() => {
    if (activeTab === 'flashcard' || activeTab === 'games') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      if (document.querySelector('[role="dialog"], .fixed.inset-0')) return;
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        openAddModal();
        return;
      }
      const idx = Number(e.key) - 1;
      const order: TabType[] = ['review', 'flashcard', 'vocab', 'grammar', 'games', 'stats'];
      if (idx >= 0 && idx < order.length) setActiveTab(order[idx]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openAddModal, activeTab]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-slate-950">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-600/25 animate-pulse" />
        <div className="w-24 h-1 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
          <div className="h-full w-1/3 rounded-full bg-emerald-500 animate-[rank-bar-shimmer_1.2s_linear_infinite]" />
        </div>
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  const handleLogout = async () => {
    // Make sure everything studied on this device is in the account before leaving
    await flushOutbox().catch(() => {});
    await pushLocalChanges().catch(() => {});
    const pending = getPendingChangeCount();
    if (
      pending > 0 &&
      !confirmDelete(`Còn ${pending} thay đổi chưa tải lên tài khoản (đang mất mạng). Chúng sẽ được tải lên khi bạn đăng nhập lại trên thiết bị này. Vẫn đăng xuất?`)
    ) {
      return;
    }
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // The data stays in the account; remove this account's copy from the device
      cloudLoadedRef.current = false;
      clearLocalAccountData();
      commitVocab(() => []);
      commitGrammar(() => []);
    } catch (error) {
      reportCloudError(error);
    }
  };

  return (
    <div
      id="app-root-container"
      className="app-backdrop min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex font-sans"
    >
      {/* Desktop sidebar */}
      <Sidebar
        items={navItems}
        activeId={activeTab}
        onSelect={setActiveTab}
        onOpenAddModal={openAddModal}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
        onLogoClick={() => setActiveTab('review')}
        userEmail={session.user.email}
        onLogout={handleLogout}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <Navbar
          onOpenAddModal={openAddModal}
          onOpenBackupModal={() => setIsBackupModalOpen(true)}
          onOpenOptimizer={() => setShowFSRSOptimizer(true)}
          onLoadSampleData={handleLoadSampleData}
          hasItems={vocabList.length > 0 || grammarList.length > 0}
          streakCount={streakCount}
          isStreakJumping={isStreakJumping}
          onStreakClick={() => {
            setIsRankModalOpen(true);
          }}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
          rankData={rankData}
          onOpenRankModal={() => setIsRankModalOpen(true)}
          onLogoClick={() => setActiveTab('review')}
          userEmail={session.user.email}
          onLogout={handleLogout}
          pageTitle={activeNavItem.label}
          pageDescription={activeNavItem.description}
        />

        {/* Main Container */}
        <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-10 py-5 sm:py-8 pb-28 md:pb-12 flex-1 flex flex-col">
          {/* Tab Content Display */}
          <div key={activeTab} className="flex-1 animate-fade-in">
            {activeTab === 'review' && (
              <DailyReviewTab
                vocabList={vocabList}
                grammarList={grammarList}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                onRateVocab={handleRateVocab}
                onRateGrammar={handleRateGrammar}
                onMarkAllReviewed={handleMarkAllReviewed}
                onEditVocab={(v) => {
                  setEditingItem({ type: 'vocab', data: v });
                  setIsAddModalOpen(true);
                }}
                onEditGrammar={(g) => {
                  setEditingItem({ type: 'grammar', data: g });
                  setIsAddModalOpen(true);
                }}
                onDeleteVocab={handleDeleteVocab}
                onDeleteGrammar={handleDeleteGrammar}
                onOpenImageLightbox={(url, cap) => setLightboxImage({ url, caption: cap })}
                onSwitchToFlashcard={() => setActiveTab('flashcard')}
                onSwitchToGames={() => setActiveTab('games')}
                onOpenContextOutputModal={(v) => setContextModalItem(v)}
                rankData={rankData}
                onOpenRankModal={() => setIsRankModalOpen(true)}
              />
            )}

            {activeTab === 'flashcard' && (
              <FlashcardTab
                vocabList={vocabList}
                grammarList={grammarList}
                selectedDate={selectedDate}
                onRateVocab={handleRateVocab}
                onRateGrammar={handleRateGrammar}
                onOpenImageLightbox={(url, cap) => setLightboxImage({ url, caption: cap })}
                onOpenContextOutputModal={(v) => setContextModalItem(v)}
              />
            )}

            {activeTab === 'vocab' && (
              <VocabListTab
                vocabList={vocabList}
                onOpenAddModal={() => {
                  setEditingItem(null);
                  setIsAddModalOpen(true);
                }}
                onEditVocab={(v) => {
                  setEditingItem({ type: 'vocab', data: v });
                  setIsAddModalOpen(true);
                }}
                onDeleteVocab={handleDeleteVocab}
                onOpenImageLightbox={(url, cap) => setLightboxImage({ url, caption: cap })}
                onOpenContextOutputModal={(v) => setContextModalItem(v)}
              />
            )}

            {activeTab === 'grammar' && (
              <GrammarListTab
                grammarList={grammarList}
                onOpenAddModal={() => {
                  setEditingItem(null);
                  setIsAddModalOpen(true);
                }}
                onEditGrammar={(g) => {
                  setEditingItem({ type: 'grammar', data: g });
                  setIsAddModalOpen(true);
                }}
                onDeleteGrammar={handleDeleteGrammar}
                onOpenImageLightbox={(url, cap) => setLightboxImage({ url, caption: cap })}
                onOpenContextOutputModal={(g) => setContextModalItem(g)}
              />
            )}

            {activeTab === 'games' && (
              <GameHubTab
                vocabList={vocabList}
                grammarList={grammarList}
                onShowToast={showToast}
              />
            )}

            {activeTab === 'stats' && (
              <StatsTab
                vocabList={vocabList}
                grammarList={grammarList}
                streakCount={streakCount}
                onOpenOptimizer={() => setShowFSRSOptimizer(true)}
                rankData={rankData}
                onOpenRankModal={() => setIsRankModalOpen(true)}
              />
            )}
          </div>
        </main>
      </div>

      {/* Mobile Floating Add Button */}
      <button
        type="button"
        onClick={openAddModal}
        className="md:hidden fixed right-4 z-30 w-14 h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-90 text-white shadow-xl shadow-emerald-700/30 ring-1 ring-inset ring-white/15 flex items-center justify-center transition-all cursor-pointer"
        style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
        aria-label="Thêm mới"
      >
        <Plus size={24} strokeWidth={2.25} />
      </button>

      {/* Mobile Bottom Navigation Bar (Safe Area aware) */}
      <nav
        id="mobile-bottom-nav"
        aria-label="Điều hướng chính"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/85 dark:bg-slate-950/85 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 px-2 pt-1.5 flex items-stretch safe-area-pb"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-1 py-1 rounded-xl transition-colors cursor-pointer ${
                active
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400 active:text-slate-800 dark:active:text-slate-200'
              }`}
            >
              <span
                className={`relative flex items-center justify-center w-12 h-7 rounded-full transition-colors ${
                  active ? 'bg-emerald-500/12 dark:bg-emerald-400/12' : ''
                }`}
              >
                <Icon size={19} strokeWidth={active ? 2.3 : 2} />
                {item.id === 'review' && todayDueCount > 0 && (
                  <span className="absolute -top-1 right-1 min-w-[16px] h-4 px-1 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-950 tabular-nums">
                    {todayDueCount > 99 ? '99+' : todayDueCount}
                  </span>
                )}
              </span>
              <span className={`text-[10px] leading-none tracking-tight truncate ${active ? 'font-semibold' : 'font-medium'}`}>
                {item.shortLabel}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Modals */}
      <AddEditModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingItem(null);
        }}
        onSaveVocab={handleSaveVocab}
        onSaveGrammar={handleSaveGrammar}
        editingItem={editingItem}
        vocabCount={vocabList.length}
        grammarCount={grammarList.length}
        existingTopics={Array.from(new Set([...vocabList.map(v => v.topic).filter(Boolean), ...grammarList.map(g => g.type).filter(Boolean)])) as string[]}
      />

      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        vocabList={vocabList}
        grammarList={grammarList}
        onImportData={handleImportData}
        onLoadSampleData={handleLoadSampleData}
        onClearAllData={handleClearAllData}
      />

      <ImageLightboxModal
        imageUrl={lightboxImage?.url || null}
        caption={lightboxImage?.caption}
        onClose={() => setLightboxImage(null)}
      />

      {/* Screen Fire Celebration & Animated Filling Rank Bar Overlay */}
      <FireCelebrationOverlay
        isOpen={fireCelebrationConfig.isOpen}
        onClose={() => setFireCelebrationConfig((prev) => ({ ...prev, isOpen: false }))}
        streakCount={streakCount}
        mode={fireCelebrationConfig.mode}
        rankData={fireCelebrationConfig.rankData || rankData}
        targetCards={fireCelebrationConfig.targetCards}
        reviewedCards={fireCelebrationConfig.reviewedCards}
        startPercent={fireCelebrationConfig.startPercent}
        newTier={fireCelebrationConfig.newTier}
        onOpenRankModal={() => {
          setFireCelebrationConfig((prev) => ({ ...prev, isOpen: false }));
          setIsRankModalOpen(true);
        }}
      />

      {/* 5-Context Output Practice Modal */}
      {contextModalItem && (
        <ContextOutputModal
          isOpen={Boolean(contextModalItem)}
          item={contextModalItem}
          itemKind={'formula' in contextModalItem ? 'grammar' : 'vocab'}
          onClose={() => setContextModalItem(null)}
          onCompleteContexts={handleCompleteContexts}
          onRateVocab={handleRateVocab}
          onRateGrammar={handleRateGrammar}
          todayDate={selectedDate}
        />
      )}

      {/* AI FSRS Memory Optimizer Modal */}
      <FSRSOptimizerModal
        isOpen={showFSRSOptimizer}
        onClose={() => setShowFSRSOptimizer(false)}
        vocabList={vocabList}
        grammarList={grammarList}
        onTargetRetentionChanged={(newRetention) => {
          showToast(`🎯 Đã áp dụng mục tiêu ghi nhớ ${Math.round(newRetention * 100)}% vào thuật toán FSRS!`);
        }}
        onShowToast={showToast}
      />

      {/* Rank & Daily Retention Tier Modal */}
      <RankModal
        isOpen={isRankModalOpen}
        onClose={() => setIsRankModalOpen(false)}
        rankData={rankData}
        onStartReview={() => {
          setActiveTab('review');
        }}
      />

      {/* Offline changes waiting to be uploaded to the account */}
      {pendingChanges > 0 && (
        <div
          role="status"
          className="fixed top-3 right-3 z-50 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/95 text-white shadow-lg flex items-center gap-1.5"
        >
          <AlertTriangle size={14} className="shrink-0" />
          Đang chờ mạng · {pendingChanges} thay đổi sẽ tự lưu vào tài khoản
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          id="toast-notification"
          role={toast.tone === 'error' ? 'alert' : 'status'}
          aria-live={toast.tone === 'error' ? 'assertive' : 'polite'}
          className={`fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50 max-w-[calc(100vw-2rem)] pl-3 pr-4 py-2.5 rounded-xl shadow-xl text-sm font-medium flex items-center gap-2.5 backdrop-blur-md animate-fade-in ${
            toast.tone === 'error'
              ? 'bg-rose-600/95 text-white ring-1 ring-rose-300/30'
              : 'bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 ring-1 ring-white/10 dark:ring-slate-900/10'
          }`}
        >
          {toast.tone === 'error' ? (
            <AlertTriangle size={16} className="text-white shrink-0" />
          ) : (
            <CheckCircle2 size={16} className="text-emerald-400 dark:text-emerald-600 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
