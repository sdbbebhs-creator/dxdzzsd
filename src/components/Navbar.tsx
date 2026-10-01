import React from 'react';
import { Database, Sparkles, Flame, Sun, Moon, LogOut } from 'lucide-react';
import { LogoGlyph } from './LogoGlyph';
import { UserRankData } from '../types';
import { getRankTierByKey } from '../utils/rankSystem';
import { RankEmblem } from './RankEmblem';

interface NavbarProps {
  onOpenAddModal: () => void;
  onOpenBackupModal: () => void;
  onOpenOptimizer?: () => void;
  onLoadSampleData: () => void;
  hasItems: boolean;
  streakCount: number;
  isStreakJumping?: boolean;
  onStreakClick?: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  rankData?: UserRankData;
  onOpenRankModal?: () => void;
  onLogoClick?: () => void;
  userEmail?: string | null;
  onLogout?: () => void;
  pageTitle?: string;
  pageDescription?: string;
}

const iconBtn =
  'inline-flex items-center justify-center w-9 h-9 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shrink-0';

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAddModal,
  onOpenBackupModal,
  onLoadSampleData,
  hasItems,
  streakCount,
  onStreakClick,
  isDarkMode,
  onToggleDarkMode,
  rankData,
  onOpenRankModal,
  onLogoClick,
  userEmail,
  onLogout,
  pageTitle,
  pageDescription,
}) => {
  const currentTier = rankData ? getRankTierByKey(rankData.tierKey) : null;
  const dateStr = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <header className="sticky top-0 z-30 bg-slate-50/80 dark:bg-slate-950/75 backdrop-blur-xl border-b border-slate-200/70 dark:border-slate-800/70 pt-[env(safe-area-inset-top)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 h-14 md:h-16 flex items-center justify-between gap-3">
        {/* Mobile: brand. Desktop: current page */}
        <button
          type="button"
          onClick={onLogoClick}
          className="md:hidden flex items-center gap-2.5 min-w-0 cursor-pointer"
          title="Về màn hình chính"
        >
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-sm shadow-emerald-600/25 shrink-0">
            <LogoGlyph size={18} />
          </span>
          <span className="flex flex-col items-start min-w-0 leading-tight">
            <span className="text-[15px] font-bold tracking-tight text-slate-900 dark:text-white truncate">
              {pageTitle || 'VocabBank'}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 capitalize truncate">{dateStr}</span>
          </span>
        </button>

        <div className="hidden md:block min-w-0">
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white truncate">
            {pageTitle || 'VocabBank'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            <span className="capitalize">{dateStr}</span>
            {pageDescription && <span className="hidden lg:inline"> · {pageDescription}</span>}
          </p>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {!hasItems && (
            <button
              type="button"
              id="btn-sample-data"
              onClick={onLoadSampleData}
              className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 text-xs font-semibold rounded-xl text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/15 ring-1 ring-inset ring-emerald-500/20 transition-colors cursor-pointer"
            >
              <Sparkles size={14} />
              <span>Nạp mẫu</span>
            </button>
          )}

          {/* Rank badge */}
          {currentTier && (
            <button
              type="button"
              id="navbar-rank-badge"
              onClick={onOpenRankModal}
              className="relative inline-flex items-center gap-2 h-9 pl-2 pr-2.5 sm:pr-3 rounded-xl bg-white dark:bg-slate-900 ring-1 ring-inset ring-slate-200 dark:ring-slate-800 hover:ring-slate-300 dark:hover:ring-slate-700 shadow-2xs text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all cursor-pointer active:scale-95 shrink-0"
              title={`Đẳng Cấp: Rank ${currentTier.nameVi} (${currentTier.titleVi}) - ${
                rankData?.todayProtected ? 'Đã bảo vệ rank hôm nay!' : 'Chưa bảo vệ rank hôm nay! Bấm để xem chi tiết.'
              }`}
            >
              <RankEmblem tierKey={currentTier.key} size={26} className="shrink-0" />
              <span className="hidden lg:inline">{currentTier.nameVi}</span>
              <span className="relative flex w-2 h-2 shrink-0">
                {!rankData?.todayProtected && (
                  <span className="absolute inset-0 rounded-full bg-rose-500 animate-ping opacity-60" />
                )}
                <span
                  className={`relative w-2 h-2 rounded-full ${rankData?.todayProtected ? 'bg-emerald-500' : 'bg-rose-500'}`}
                  title={rankData?.todayProtected ? 'Hôm nay: An toàn' : 'Hôm nay: Cần ôn tập để giữ Rank!'}
                />
              </span>
            </button>
          )}

          {/* Streak */}
          <button
            type="button"
            id="navbar-streak-badge"
            onClick={onStreakClick || onOpenRankModal}
            className={`inline-flex items-center gap-1.5 h-9 pl-2 pr-2.5 sm:pr-3 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-95 shrink-0 ring-1 ring-inset ${
              streakCount === 0
                ? 'bg-white dark:bg-slate-900 ring-slate-200 dark:ring-slate-800 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-300 shadow-2xs'
                : 'bg-gradient-to-b from-amber-400/15 to-orange-500/15 ring-amber-500/30 text-amber-800 dark:text-amber-200'
            }`}
            title={
              streakCount === 0
                ? 'Chuỗi lửa: 0 ngày. Hoàn thành tất cả lịch thẻ hôm nay để thắp sáng ngọn lửa!'
                : `Chuỗi ôn tập: ${streakCount} ngày liên tiếp (Bấm để xem chi tiết)`
            }
          >
            <Flame
              size={16}
              className={streakCount === 0 ? '' : 'flame-burning text-amber-500 fill-amber-400'}
            />
            <span className="tabular-nums text-sm font-bold">{streakCount}</span>
            <span className="hidden sm:inline font-medium opacity-70">ngày</span>
          </button>

          {/* Mobile-only utilities (desktop has them in the sidebar) */}
          <div className="flex md:hidden items-center">
            <button type="button" onClick={onToggleDarkMode} className={iconBtn} aria-label="Đổi giao diện sáng/tối">
              {isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button type="button" onClick={onOpenBackupModal} className={iconBtn} aria-label="Dữ liệu & Backup">
              <Database size={17} />
            </button>
            {userEmail && (
              <button type="button" onClick={onLogout} className={iconBtn} aria-label="Đăng xuất" title={`Đăng xuất (${userEmail})`}>
                <LogOut size={16} />
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
