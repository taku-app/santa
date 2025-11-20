'use client';

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabaseBrowserClient } from "@/lib/supabase-browser";

type AuthMode = "signIn" | "signUp";

const buttonCopy: Record<AuthMode, string> = {
  signIn: "ログイン",
  signUp: "アカウント作成",
};

export default function AuthPanel() {
  const supabase = useMemo(() => supabaseBrowserClient(), []);
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "idle" | "success" | "error"; message?: string }>({
    type: "idle",
    message: undefined,
  });
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        setSession(data.session ?? null);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (isMounted) {
        setSession(currentSession);
      }
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus({ type: "idle" });

    try {
      if (mode === "signUp") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setStatus({
          type: "success",
          message: "確認メールを送信しました。受信トレイをチェックしてください。",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setStatus({
          type: "success",
          message: "ようこそ！スポット実績の同期を開始します。",
        });
      }
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "認証エラーが発生しました。",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    setLoading(true);
    setStatus({ type: "idle" });
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setStatus({ type: "success", message: "ログアウトしました。" });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "ログアウトに失敗しました。",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex rounded-full bg-zinc-100 p-1 text-sm font-semibold text-zinc-500">
        {(["signIn", "signUp"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            className={`flex-1 rounded-full px-4 py-2 transition ${
              mode === key ? "bg-white text-rose-500 shadow" : "opacity-70"
            }`}
          >
            {key === "signIn" ? "ログイン" : "新規登録"}
          </button>
        ))}
      </div>

      {session ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-700">
          <p className="font-semibold">ログイン済み</p>
          <p className="mt-1 text-emerald-800">{session.user.email}</p>
          <p className="mt-2 text-xs uppercase tracking-widest text-emerald-500">実績同期モード</p>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={loading}
            className="mt-4 w-full rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            ログアウト
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              placeholder="you@example.com"
              className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white/80 px-4 py-3 text-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              placeholder="6文字以上"
              className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white/80 px-4 py-3 text-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-rose-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-200 transition hover:bg-rose-600 disabled:opacity-50"
          >
            {loading ? "処理中..." : buttonCopy[mode]}
          </button>
          <p className="text-center text-xs text-zinc-500">
            後日Google/Appleでのソーシャルログインも追加予定です。
          </p>
        </form>
      )}

      {status.message && (
        <p
          className={`text-sm ${
            status.type === "error" ? "text-rose-500" : "text-emerald-600"
          }`}
        >
          {status.message}
        </p>
      )}
    </div>
  );
}
