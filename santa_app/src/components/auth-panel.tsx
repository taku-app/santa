'use client';

import { useEffect, useState } from "react";

import { useSupabaseSession } from "@/hooks/use-supabase-session";

type AuthMode = "signIn" | "signUp";

type Props = {
  onAuthSuccess?: () => void;
};

const buttonCopy: Record<AuthMode, string> = {
  signIn: "ログイン",
  signUp: "アカウント作成",
};

export default function AuthPanel({ onAuthSuccess }: Props) {
  const { session, supabase } = useSupabaseSession();
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [profileName, setProfileName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "idle" | "success" | "error"; message?: string }>({
    type: "idle",
    message: undefined,
  });

  useEffect(() => {
    setProfileName(session?.user.user_metadata?.username ?? "");
  }, [session]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthLoading(true);
    setStatus({ type: "idle" });

    try {
      if (mode === "signUp") {
        const trimmed = username.trim();
        if (!trimmed) {
          throw new Error("ユーザー名を入力してください。");
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: trimmed,
            },
          },
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
        onAuthSuccess?.();
      }
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "認証エラーが発生しました。",
      });
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleUsernameUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setProfileLoading(true);
    setStatus({ type: "idle" });
    try {
      const trimmed = profileName.trim();
      if (!trimmed) {
        throw new Error("ユーザー名を入力してください。");
      }
      const { error } = await supabase.auth.updateUser({
        data: { username: trimmed },
      });
      if (error) throw error;
      setStatus({ type: "success", message: "ユーザー名を更新しました。" });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "ユーザー名の更新に失敗しました。",
      });
    } finally {
      setProfileLoading(false);
    }
  }

  async function handleSignOut() {
    setAuthLoading(true);
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
      setAuthLoading(false);
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
          <form onSubmit={handleUsernameUpdate} className="mt-4 space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">
              ユーザー名
            </label>
            <input
              type="text"
              value={profileName}
              onChange={(event) => setProfileName(event.target.value)}
              placeholder="Nagoya Santa"
              className="w-full rounded-2xl border border-emerald-200 bg-white/90 px-4 py-2 text-sm text-emerald-800 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
            <button
              type="submit"
              disabled={profileLoading}
              className="w-full rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {profileLoading ? "保存中..." : "ユーザー名を保存"}
            </button>
          </form>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={authLoading}
            className="mt-4 w-full rounded-full bg-emerald-900/80 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:opacity-50"
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
          {mode === "signUp" && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                ユーザー名
              </label>
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required={mode === "signUp"}
                placeholder="Nagoya Santa"
                className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white/80 px-4 py-3 text-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
              />
            </div>
          )}
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
            disabled={authLoading}
            className="w-full rounded-full bg-rose-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-200 transition hover:bg-rose-600 disabled:opacity-50"
          >
            {authLoading ? "処理中..." : buttonCopy[mode]}
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
