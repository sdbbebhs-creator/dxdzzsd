import React from 'react';
import { Plus, Database, Sun, Moon, LogOut } from 'lucide-react';
import { LogoGlyph } from './LogoGlyph';
import type { LucideIcon } from 'lucide-react';

export interface NavItem<T extends string = string> {
  id: T;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  badge?: number | string;
  badgeTone?: 'brand' | 'accent';
}

interface SidebarProps<T extends string> {
  items: NavItem<T>[];
  activeId: T;
  onSelect: (id: T) => void;
  onOpenAddModal: () => void;
  onOpenBackupModal: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onLogoClick?: () => void;
  userEmail?: string | null;
  onLogout?: () => void;
}

/**
 * Desktop navigation rail. Collapses to icons on md and expands with labels on lg+.
 * Mobile uses the bottom navigation in App.tsx instead.
 */
export function Sidebar<T extends string>({
  items,
  activeId,
  onSelect,
  onOpenAddModal,
  onOpenBackupModal,
  isDarkMode,
  onToggleDarkMode,
  onLogoClick,
  userEmail,
  onLogout,
}: SidebarProps<T>) {
  const initial = (userEmail || '?').charAt(0).toUpperCase();

  return (
    <aside
      aria-label="Điều hướng chính"
      className="hidden md:flex sticky top-0 h-screen shrink-0 flex-col md:w-[76px] lg:w-64 border-r border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-950/60 backdrop-blur-xl z-40"
    >
      {/* Brand */}
      <button
        type="button"
        onClick={onLogoClick}
        className="flex items-center gap-3 h-16 px-5 lg:px-5 md:justify-center lg:justify-start cursor-pointer group shrink-0"
        title="Về màn hình chính"
      >
        <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/25 ring-1 ring-inset ring-white/20 shrink-0 group-hover:scale-105 transition-transform">
          <LogoGlyph size={20} />
        </span>
        <span className="hidden lg:flex flex-col items-start min-w-0 leading-tight">
          <span className="text-[15px] font-bold tracking-tight text-slate-900 dark:text-white">VocabBank</span>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">FSRS v4 · Spaced repetition</span>
        </span>
      </button>

      {/* Primary action */}
      <div className="px-3 lg:px-4 pt-2 pb-4">
        <button
          type="button"
          onClick={onOpenAddModal}
          className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-sm font-semibold shadow-sm active:scale-[0.98] transition-all cursor-pointer"
          title="Thêm từ vựng / ngữ pháp"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span className="hidden lg:inline">Thêm mới</span>
          <kbd className="hidden lg:inline ml-auto -mr-1 text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-md bg-white/10 dark:bg-slate-900/10 text-white/70 dark:text-slate-500">N</kbd>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 lg:px-3 space-y-0.5">
        <p className="hidden lg:block px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">
          Học tập
        </p>
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              id={`tab-btn-${item.id}`}
              onClick={() => onSelect(item.id)}
              aria-current={active ? 'page' : undefined}
              title={item.label}
              className={`relative w-full flex items-center gap-3 h-10 md:justify-center lg:justify-start px-3 rounded-xl text-sm transition-colors cursor-pointer group ${
                active
                  ? 'bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-700 dark:text-emerald-300 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100 font-medium'
              }`}
            >
              {active && (
                <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-emerald-500 lg:-left-3" aria-hidden />
              )}
              <Icon size={18} strokeWidth={active ? 2.25 : 2} className="shrink-0" />
              <span className="hidden lg:inline truncate">{item.label}</span>
              {item.badge !== undefined && item.badge !== 0 && (
                <>
                  <span
                    className={`hidden lg:inline-flex ml-auto min-w-[22px] h-5 px-1.5 items-center justify-center rounded-md text-[11px] font-semibold tabular-nums ${
                      item.badgeTone === 'accent'
                        ? 'bg-amber-400/15 text-amber-700 dark:text-amber-300'
                        : active
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                  {item.badgeTone !== 'accent' && (
                    <span className="lg:hidden absolute top-1.5 right-3 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-950" />
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/80 space-y-0.5">
        <button
          type="button"
          id="btn-open-backup"
          onClick={onOpenBackupModal}
          title="Dữ liệu, Xuất / Nhập và Sao lưu"
          className="w-full flex items-center gap-3 h-10 md:justify-center lg:justify-start px-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
        >
          <Database size={18} className="shrink-0" />
          <span className="hidden lg:inline">Dữ liệu & Sao lưu</span>
        </button>
        <button
          type="button"
          id="btn-toggle-theme"
          onClick={onToggleDarkMode}
          aria-label="Đổi giao diện sáng/tối"
          title={isDarkMode ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
          className="w-full flex items-center gap-3 h-10 md:justify-center lg:justify-start px-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
        >
          {isDarkMode ? <Sun size={18} className="shrink-0" /> : <Moon size={18} className="shrink-0" />}
          <span className="hidden lg:inline">{isDarkMode ? 'Giao diện sáng' : 'Giao diện tối'}</span>
        </button>

        {userEmail && (
          <div className="flex items-center gap-2.5 md:justify-center lg:justify-start mt-2 pt-3 px-1 border-t border-slate-200/60 dark:border-slate-800/60">
            <span className="hidden lg:flex w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-200 shrink-0">
              {initial}
            </span>
            <span className="hidden lg:block flex-1 min-w-0 text-xs font-medium text-slate-600 dark:text-slate-300 truncate" title={userEmail}>
              {userEmail}
            </span>
            <button
              type="button"
              id="btn-logout"
              onClick={onLogout}
              title={`Đăng xuất (${userEmail})`}
              aria-label="Đăng xuất"
              className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
