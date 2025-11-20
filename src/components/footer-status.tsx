'use client';

import { useSupabaseSession } from "@/hooks/use-supabase-session";

type Props = {
  onLoginClick: () => void;
};

export default function FooterStatus({ onLoginClick }: Props) {
  const { session } = useSupabaseSession();
  const displayName = session?.user.user_metadata?.username || session?.user.email;

  return (
    <footer className="mt-16 rounded-3xl border border-rose-100 bg-white/90 p-6 shadow-lg backdrop-blur">
      {session ? (
        <div className="flex flex-col gap-3 text-sm text-zinc-700 sm:flex-row sm:items-center sm:justify-between">
          <p>
            ログイン中: <span className="font-semibold text-rose-500">{displayName}</span>
          </p>
          <button
            onClick={onLoginClick}
            className="rounded-full border border-rose-200 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-rose-500 transition hover:bg-rose-50"
          >
            アカウント設定
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 text-sm text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
          <p>まだログインしていません。街に出る前にアカウントを作成しましょう。</p>
          <button
            onClick={onLoginClick}
            className="rounded-full bg-rose-500 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-rose-200 transition hover:bg-rose-600"
          >
            ログイン / 新規登録
          </button>
        </div>
      )}
    </footer>
  );
}
