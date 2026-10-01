import React, { useState } from 'react';
import { Mail, Lock, Loader2, Brain, Sparkles, Cloud, ArrowRight } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { LogoGlyph } from './LogoGlyph';
import { FloatingWords } from './FloatingWords';

export const AuthScreen: React.FC = () => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      } else {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        setMessage('Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản, sau đó đăng nhập.');
      }
    } catch (err: any) {
      setError(err?.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Brain, title: 'Lịch ôn FSRS v4', text: 'Thuật toán lặp lại ngắt quãng hiện đại nhất, tự tính ngày ôn tối ưu cho từng thẻ.' },
    { icon: Sparkles, title: 'Luyện Output 5 ngữ cảnh', text: 'AI gợi ý tình huống và chấm câu bạn viết, biến kiến thức thành phản xạ.' },
    { icon: Cloud, title: 'Đồng bộ mọi thiết bị', text: 'Kho từ vựng & ngữ pháp luôn theo bạn, trên điện thoại lẫn máy tính.' },
  ];

  const inputCls =
    'w-full h-11 pl-10 pr-3 text-sm bg-white dark:bg-slate-900 ring-1 ring-inset ring-slate-200 dark:ring-slate-800 hover:ring-slate-300 dark:hover:ring-slate-700 focus:ring-2 focus:ring-emerald-500 rounded-xl outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition-shadow';

  return (
    <div className="relative isolate overflow-hidden min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-slate-50 dark:bg-slate-950">
      {/* One shared backdrop behind both columns so the screen reads as a single surface */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-60 dark:opacity-100"
        style={{
          background:
            'radial-gradient(48rem 34rem at 8% 0%, rgba(16,185,129,0.24), transparent 60%), radial-gradient(44rem 30rem at 95% 100%, rgba(20,184,166,0.16), transparent 60%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 text-slate-900 dark:text-white opacity-[0.04] dark:opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse at center, black 35%, transparent 80%)',
        }}
      />
      <FloatingWords className="-z-10" />

      {/* Brand panel */}
      <section className="relative hidden lg:flex flex-col justify-between p-12 xl:p-16 text-slate-900 dark:text-white">
        <div className="relative flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 ring-1 ring-inset ring-white/20">
            <LogoGlyph size={22} />
          </span>
          <span className="text-base font-bold tracking-tight">VocabBank</span>
        </div>

        <div className="relative max-w-lg">
          <p className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full text-xs font-medium bg-white/70 dark:bg-white/5 ring-1 ring-inset ring-slate-200 dark:ring-white/10 text-emerald-700 dark:text-emerald-300 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
            Học ít hơn, nhớ lâu hơn
          </p>
          <h2 className="text-4xl xl:text-5xl font-bold leading-[1.1] tracking-tight">
            Ghi nhớ từ vựng & ngữ pháp
            <span className="block bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-300 dark:to-teal-200 bg-clip-text text-transparent">
              đúng lúc bạn sắp quên.
            </span>
          </h2>
          <ul className="mt-10 space-y-6">
            {features.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="w-10 h-10 shrink-0 rounded-xl bg-white/70 dark:bg-white/5 ring-1 ring-inset ring-slate-200 dark:ring-white/10 flex items-center justify-center text-emerald-600 dark:text-emerald-300 backdrop-blur-sm">
                  <Icon size={18} />
                </span>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{title}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mt-0.5">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-400 dark:text-slate-500">© {new Date().getFullYear()} VocabBank · FSRS v4</p>
      </section>

      {/* Form */}
      <section className="relative flex items-center justify-center px-5 py-12 sm:px-8">
        <div className="relative w-full max-w-[380px] animate-fade-in">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/25">
              <LogoGlyph size={22} />
            </span>
            <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">VocabBank</span>
          </div>

          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-slate-900 dark:text-white">
            {mode === 'signin' ? 'Chào mừng trở lại' : 'Tạo tài khoản miễn phí'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            {mode === 'signin'
              ? 'Đăng nhập để tiếp tục lịch ôn tập của bạn.'
              : 'Bắt đầu xây kho từ vựng, đồng bộ trên mọi thiết bị.'}
          </p>

          <div className="flex mt-8 mb-6 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 ring-1 ring-inset ring-slate-200/70 dark:ring-slate-800">
            {(['signin', 'signup'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(null); setMessage(null); }}
                className={`flex-1 h-9 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                  mode === m
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {m === 'signin' ? 'Đăng nhập' : 'Đăng ký'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="auth-email" className="text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  id="auth-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ban@email.com"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label htmlFor="auth-password" className="text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Mật khẩu</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  id="auth-password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  className={inputCls}
                />
              </div>
            </div>

            {error && (
              <p role="alert" className="text-[13px] text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 ring-1 ring-inset ring-rose-200 dark:ring-rose-500/25 rounded-xl px-3.5 py-2.5">
                {error}
              </p>
            )}
            {message && (
              <p role="status" className="text-[13px] text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 ring-1 ring-inset ring-emerald-200 dark:ring-emerald-500/25 rounded-xl px-3.5 py-2.5">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group w-full h-11 flex items-center justify-center gap-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-xl shadow-md shadow-emerald-600/20 ring-1 ring-inset ring-white/10 active:scale-[0.99] transition-all cursor-pointer"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {mode === 'signin' ? 'Đăng nhập' : 'Tạo tài khoản'}
              {!loading && <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />}
            </button>
          </form>

          <p className="text-center text-[13px] text-slate-500 dark:text-slate-400 mt-8">
            {mode === 'signin' ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
            <button
              type="button"
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setMessage(null); }}
              className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline underline-offset-4 cursor-pointer"
            >
              {mode === 'signin' ? 'Đăng ký ngay' : 'Đăng nhập'}
            </button>
          </p>
        </div>
      </section>
    </div>
  );
};
