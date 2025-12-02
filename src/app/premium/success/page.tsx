'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useSupabaseSession } from "@/hooks/use-supabase-session";

type Status = "idle" | "processing" | "success" | "error";

export default function PremiumSuccessPage() {
  const { session } = useSupabaseSession();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("決済完了ページです。");

  useEffect(() => {
    if (!sessionId || !session?.user.id) {
      return;
    }
    let isMounted = true;

    const confirmPayment = async () => {
      setStatus("processing");
      setMessage("決済情報を検証し、プレミアムを付与しています…");
      try {
        const response = await fetch("/api/stripe/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, userId: session.user.id }),
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error ?? "決済の検証に失敗しました。");
        }
        if (isMounted) {
          setStatus("success");
          setMessage("プレミアムを付与しました。/game でトナカイARを体験できます。");
        }
      } catch (error) {
        if (isMounted) {
          setStatus("error");
          setMessage(error instanceof Error ? error.message : "決済の検証に失敗しました。");
        }
      }
    };

    void confirmPayment();

    return () => {
      isMounted = false;
    };
  }, [sessionId, session]);

  const headline =
    status === "success"
      ? "プレミアム登録が完了しました"
      : status === "error"
        ? "決済の確認に失敗しました"
        : "決済を確認しています";

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-emerald-50 px-4 py-12 text-zinc-900">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 rounded-3xl bg-white/90 p-8 text-center shadow-2xl ring-1 ring-rose-100">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-400">Premium Plan</p>
        <h1 className="text-3xl font-bold text-zinc-900">{headline}</h1>
        <p
          className={`text-sm ${
            status === "error" ? "text-rose-600" : status === "success" ? "text-emerald-600" : "text-zinc-600"
          }`}
        >
          {session
            ? message
            : "決済を確定するにはログインしてください。ログイン後このページを再読み込みすると同期されます。"}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/"
            className="rounded-full border border-zinc-200 px-5 py-3 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-50"
          >
            トップに戻る
          </Link>
          <Link
            href="/game"
            className="rounded-full bg-rose-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-200 transition hover:bg-rose-600"
          >
            ゲームページへ
          </Link>
        </div>
        {!session && (
          <p className="text-xs text-zinc-500">
            未ログインの場合はトップページのログインボタンからメール認証を行ってください。
          </p>
        )}
        {status === "error" && (
          <p className="text-xs text-rose-500">
            StripeセッションID: <span className="font-mono">{sessionId}</span>
          </p>
        )}
      </div>
    </div>
  );
}
