'use client';

import Link from "next/link";
import { useEffect, useState } from "react";

import AuthPanel from "@/components/auth-panel";
import FooterStatus from "@/components/footer-status";
import { useSupabaseSession } from "@/hooks/use-supabase-session";

const heroStats = [
  { label: "名古屋スポット", value: "6" },
  { label: "解放されるAR", value: "2種" },
  { label: "先行ユーザー", value: "120+" },
];

const nagoyaSpots = [
  {
    name: "名古屋駅 ミッドランドスクエア",
    description: "巨大ツリーの前でチェックイン。夜はイルミネーション演出が解放。",
    badge: "ツリー煌き実績",
  },
  {
    name: "栄 オアシス21",
    description: "銀河の広場で星屑を集めるフォトフレームを獲得。",
    badge: "スターキャッチャー",
  },
  {
    name: "名古屋城",
    description: "城壁を背景に和装サンタが登場。歴史コラボ実績を解除。",
    badge: "和装サンタ",
  },
  {
    name: "大名古屋ビルヂング",
    description: "スカイガーデンで夜景を撮影。高層ARのきらめきをコレクション。",
    badge: "スカイリフト",
  },
  {
    name: "名古屋港ガーデンふ頭",
    description: "海辺のトナカイスタンプが集められるスポット。",
    badge: "ポートライダー",
  },
  {
    name: "大須商店街",
    description: "射的×ガチャARで限定ギフトを抽選。フード実績も共有。",
    badge: "大須チャレンジャー",
  },
];

const faqs = [
  {
    q: "位置情報はどのように使われますか？",
    a: "現在地を元に、名古屋エリアのスポット到達を判定します。スポット情報は端末内で処理し、移動履歴は保存しません。",
  },
  {
    q: "プレミアム課金はいつ実装されますか？",
    a: "初期リリースではUIモックとして表示され、予約購入ボタンから外部の決済ページに遷移予定です。",
  },
  {
    q: "サンタARはどのブラウザで使えますか？",
    a: "最新のSafari/Chromeで動作確認予定です。5スポット以上制覇で解放されます。",
  },
];

export default function Home() {
  const { session, supabase } = useSupabaseSession();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [isCheckingPremium, setIsCheckingPremium] = useState(false);
  const [premiumLoading, setPremiumLoading] = useState(false);
  const [premiumMessage, setPremiumMessage] = useState("");

  useEffect(() => {
    let isMounted = true;
    if (!session) {
      setIsPremium(false);
      setPremiumMessage("");
      setIsCheckingPremium(false);
      return () => {
        isMounted = false;
      };
    }

    setIsCheckingPremium(true);
    setPremiumMessage("プレミアム状態を確認中です...");

    const checkPremium = async () => {
      try {
        const { data, error } = await supabase
          .from("user_payments")
          .select("status")
          .eq("user_id", session.user.id)
          .eq("status", "paid")
          .maybeSingle();

        if (!isMounted) return;

        if (error && error.code !== "PGRST116") {
          console.error("Failed to fetch premium status", error);
          setPremiumMessage("プレミアム状態を取得できませんでした。時間をおいて再読み込みしてください。");
          setIsPremium(false);
          return;
        }

        if (data) {
          setIsPremium(true);
          setPremiumMessage("プレミアムが有効になりました。いつでも /game を開けます。");
        } else {
          setIsPremium(false);
          setPremiumMessage("");
        }
      } finally {
        if (isMounted) {
          setIsCheckingPremium(false);
        }
      }
    };

    checkPremium();

    return () => {
      isMounted = false;
    };
  }, [session, supabase]);

  async function handlePremiumClick() {
    if (!session) {
      setPremiumMessage("プレミアム決済にはログインが必要です。");
      setIsLoginOpen(true);
      return;
    }

    if (isPremium) {
      window.location.href = "/game";
      return;
    }

    const email = session.user.email;
    if (!email) {
      setPremiumMessage("メールアドレスが見つかりません。再ログインしてからお試しください。");
      return;
    }

    setPremiumLoading(true);
    setPremiumMessage("");
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.user.id, email }),
      });
      const data = await response.json();
      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "決済ページの生成に失敗しました。");
      }
      window.location.href = data.url;
    } catch (error) {
      setPremiumMessage(error instanceof Error ? error.message : "決済の開始に失敗しました。");
    } finally {
      setPremiumLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 via-green-50 to-red-50 text-zinc-900">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(220,38,38,0.15),_transparent_55%)]" />
        <div className="animate-snow absolute text-4xl opacity-60">❄️</div>
        <div className="animate-snow-delay-1 absolute left-1/4 text-3xl opacity-50">⭐</div>
        <div className="animate-snow-delay-2 absolute left-1/2 text-5xl opacity-40">❄️</div>
        <div className="animate-snow-delay-3 absolute left-3/4 text-3xl opacity-70">✨</div>
        <div className="animate-snow-delay-4 absolute right-1/4 text-4xl opacity-50">❄️</div>
      </div>
      {isLoginOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-sm">
          <div className="relative w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <button
              type="button"
              onClick={() => setIsLoginOpen(false)}
              className="absolute right-4 top-4 rounded-full border border-zinc-200 p-2 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500 transition hover:bg-zinc-50"
              aria-label="閉じる"
            >
              ✕
            </button>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-400">
              Account Access
            </p>
            <h2 className="mt-2 text-2xl font-bold text-zinc-900">メールログイン / 新規登録</h2>
            <p className="mt-2 text-sm text-zinc-600">
              ユーザー名を登録すると、実績リーダーボードやフッターに表示されます。
            </p>
            <div className="mt-6">
              <AuthPanel onAuthSuccess={() => setIsLoginOpen(false)} />
            </div>
          </div>
        </div>
      )}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 sm:px-10 lg:px-12">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-red-500">
            <span className="text-lg">🎅</span> Santa Quest
          </p>
          <p className="text-lg font-bold text-zinc-900">🎄 Nagoya AR Journey</p>
        </div>
        {session ? (
          <button
            type="button"
            onClick={() => setIsLoginOpen(true)}
            className="flex items-center gap-2 rounded-full border border-emerald-200 bg-white/90 px-6 py-2 text-sm font-semibold text-emerald-600 shadow-lg shadow-emerald-100 transition hover:bg-emerald-50"
          >
            <span className="text-lg">👤</span>
            {session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'ユーザー'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsLoginOpen(true)}
            className="flex items-center gap-2 rounded-full border border-rose-200 bg-white/80 px-6 py-2 text-sm font-semibold text-rose-500 shadow-lg shadow-rose-100 transition hover:bg-rose-50"
          >
            <span className="text-lg">🎅</span>
            ログイン
          </button>
        )}
      </header>
      <main className="mx-auto flex max-w-6xl flex-col gap-24 px-6 py-16 sm:px-10 lg:px-12">
        <section className="rounded-3xl bg-gradient-to-br from-red-100 via-white to-green-100 p-10 shadow-xl ring-2 ring-red-200/50 lg:p-16">
          <div className="grid items-center gap-10 lg:grid-cols-[3fr,2fr]">
            <div className="space-y-6">
              <p className="inline-flex items-center gap-2 rounded-full border border-red-300 bg-white/90 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-red-600 shadow-sm">
                <span className="text-base">🎄</span>
                名古屋限定クリスマスARクエスト
              </p>
              <h1 className="text-4xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-5xl">
                🎅 5スポット制覇でサンタが現れる。
                <br />
                街を巡って実績を解放しよう ✨
              </h1>
              <p className="text-lg text-zinc-600">
                位置情報を元に名古屋の代表スポットをチェックイン。5つ以上の実績を解放すると、Webブラウザでカメラを起動し、ARサンタや限定トナカイとフォト撮影ができます。
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={() => setIsLoginOpen(true)}
                  className="flex items-center gap-2 rounded-full bg-red-600 px-8 py-3 text-white shadow-xl shadow-red-300 transition hover:bg-red-700"
                >
                  <span className="text-lg">🎅</span>
                  メールでログイン
                </button>
                <a
                  href="#spots"
                  className="flex items-center gap-2 rounded-full border border-green-500/50 px-8 py-3 text-green-700 transition hover:bg-green-100"
                >
                  <span className="text-lg">🎄</span>
                  スポットを見る
                </a>
              </div>
            </div>
            <div className="rounded-2xl border-2 border-red-200 bg-white/90 p-6 shadow-xl ring-2 ring-red-100/50">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-red-500">
                <span className="text-lg">🎁</span>
                現在の旅の進捗
              </h2>
              <p className="mt-4 text-2xl font-semibold text-zinc-900">
                サンタARまであと <span className="text-red-600">2 スポット</span> 🎅
              </p>
              <div className="mt-5 space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-zinc-500">
                    <span>名古屋スポット達成率</span>
                    <span>3 / 5</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-red-100">
                    <div className="h-full w-3/5 rounded-full bg-gradient-to-r from-red-500 to-green-500" />
                  </div>
                </div>
                <div className="rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-4 text-sm text-green-700">
                  🎄 5箇所を超えるとサンタが登場。さらにプレミアム課金でトナカイとの撮影も解放されます 🦌
                </div>
              </div>
            </div>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {heroStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/70 bg-white/60 p-5 text-center shadow-sm backdrop-blur"
              >
                <p className="text-3xl font-bold text-rose-500">{stat.value}</p>
                <p className="mt-1 text-sm text-zinc-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-10 lg:grid-cols-2" id="spots">
          <div className="rounded-3xl bg-white/80 p-8 shadow-xl ring-1 ring-rose-100">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-rose-400">
              Unlock Flow
            </p>
            <h2 className="mt-4 text-3xl font-bold text-zinc-900">
              位置情報でスポットを巡り、<span className="text-rose-500">5つの実績</span>を集めよう。
            </h2>
            <ol className="mt-8 space-y-6 text-zinc-700">
              <li className="flex gap-4">
                <span className="mt-1 h-8 w-8 rounded-full bg-rose-500 text-center text-lg font-semibold text-white">
                  1
                </span>
                <div>
                  <h3 className="font-semibold">チェックイン</h3>
                  <p>スポット半径内に入ると自動でチェックイン。UIから達成状況を表示。</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="mt-1 h-8 w-8 rounded-full bg-rose-500 text-center text-lg font-semibold text-white">
                  2
                </span>
                <div>
                  <h3 className="font-semibold">実績解除</h3>
                  <p>スポット固有のバッジを獲得し、ギャラリーに保存。5個でカメラUIを解放。</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="mt-1 h-8 w-8 rounded-full bg-rose-500 text-center text-lg font-semibold text-white">
                  3
                </span>
                <div>
                  <h3 className="font-semibold">AR撮影</h3>
                  <p>無料ユーザーはツリーと、プレミアムはサンタ＆トナカイと撮影できる予定です。</p>
                </div>
              </li>
            </ol>
          </div>
          <div className="rounded-3xl border border-dashed border-rose-200 bg-white/70 p-8 shadow-inner">
            <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-rose-400">
              Premium Mock
            </h2>
            <p className="mt-4 text-3xl font-bold text-zinc-900">
              500円でプレミアムサンタと<span className="text-rose-500">トナカイAR</span>撮影を解放。
            </p>
              <p className="mt-4 text-zinc-600">
                決済ボタンから外部のチェックアウトページに遷移するUIモックを先に実装。決済完了後にアカウントへ「Premium」タグを付与する設計を想定しています。
              </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-zinc-100 bg-white/80 p-6">
                <h3 className="text-lg font-semibold">Free</h3>
                <ul className="mt-4 space-y-2 text-sm text-zinc-600">
                  <li>・ツリーARのみ</li>
                  <li>・スポット履歴保存</li>
                  <li>・メール認証</li>
                </ul>
                <Link
                  href="/game"
                  className="mt-6 inline-flex w-full items-center justify-center rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-500 transition hover:bg-rose-50"
                >
                  実績チェックへ
                </Link>
              </div>
              <div id="premium" className="rounded-2xl border border-rose-200 bg-rose-50/70 p-6">
                <div
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    isPremium ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-500"
                  }`}
                >
                  {isPremium ? "ACTIVE" : "COMING SOON"}
                </div>
                <h3 className="mt-2 text-lg font-semibold">
                  {isPremium ? "Premium アクセス中" : "Premium ¥500"}
                </h3>
                <ul className="mt-4 space-y-2 text-sm text-zinc-600">
                  <li>・サンタ＆トナカイAR</li>
                  <li>・限定実績＆BGM</li>
                  <li>・優先サポート</li>
                </ul>
                <button
                  type="button"
                  onClick={handlePremiumClick}
                  disabled={premiumLoading || isCheckingPremium}
                  className={`mt-6 w-full rounded-full px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-rose-200 transition ${
                    isPremium
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-500 hover:bg-rose-600 disabled:opacity-60"
                  }`}
                >
                  {isPremium
                    ? "ゲームページへ"
                    : premiumLoading
                      ? "決済ページへ遷移中..."
                      : "プレミアムにアップグレード"}
                </button>
                {premiumMessage && (
                  <p
                    className={`mt-3 text-xs ${
                      isPremium ? "text-emerald-600" : "text-rose-500"
                    }`}
                  >
                    {premiumMessage}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white/80 p-8 shadow-lg ring-1 ring-rose-100">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-rose-400">
                Nagoya Map
              </p>
              <h2 className="mt-2 text-3xl font-bold text-zinc-900">街に散らばるスポット実績</h2>
              <p className="mt-2 text-zinc-600">
                後続ではバックエンドからスポット情報を取得予定。ひとまずモックデータでカードを表示します。
              </p>
            </div>
            <div className="rounded-full border border-rose-200 bg-rose-50/80 px-6 py-3 text-sm font-semibold text-rose-500">
              GPS精度±50mで判定予定
            </div>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {nagoyaSpots.map((spot) => (
              <article
                key={spot.name}
                className="rounded-2xl border border-rose-50 bg-gradient-to-br from-white to-rose-50/60 p-6 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-zinc-900">{spot.name}</h3>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-600">
                    {spot.badge}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-zinc-600">{spot.description}</p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-rose-400">
                  実績ポイント +1
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-10 lg:grid-cols-[2fr,1fr]" id="access">
          <div className="rounded-3xl bg-gradient-to-br from-emerald-50 to-white p-8 shadow-lg ring-1 ring-emerald-100">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-400">
              Camera Unlock
            </p>
            <h2 className="mt-3 text-3xl font-bold text-zinc-900">
              5箇所以上でサンタARを開放。無料でもツリー撮影OK。
            </h2>
            <p className="mt-3 text-zinc-600">
              ログイン後はクラウド上のプロフィールに実績数を保存。カメラUIはProgressive Web Appとして提供予定です。
            </p>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-zinc-100 bg-white/80 p-5">
                <h3 className="font-semibold text-zinc-800">サンタモード</h3>
                <p className="mt-1 text-sm text-zinc-600">
                  サンタ本体とARフォトを撮影。ARKit/ARCore対応ブラウザで動作。
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-100 bg-white/80 p-5">
                <h3 className="font-semibold text-zinc-800">トナカイモード</h3>
                <p className="mt-1 text-sm text-zinc-600">
                  プレミアム限定。同行するトナカイ、ギフトBOXを配置できる予定。
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-rose-100 bg-white/80 p-8 shadow-lg">
            <h2 className="text-xl font-semibold text-zinc-900">ログインポータル</h2>
            <p className="mt-2 text-sm text-zinc-600">
              メール＋パスワードに加えて、ユーザー名を登録するとスポットランキングに表示されます。
            </p>
            <button
              type="button"
              onClick={() => setIsLoginOpen(true)}
              className="mt-6 w-full rounded-full bg-rose-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-200 transition hover:bg-rose-600"
            >
              ログイン / 新規登録モーダルを開く
            </button>
            <p className="mt-3 text-xs text-zinc-500">
              モーダルからプロフィール名の変更やログアウトも実行できます。
            </p>
          </div>
        </section>

        <section className="rounded-3xl bg-white/80 p-8 shadow-lg ring-1 ring-rose-100">
          <div className="grid gap-8 md:grid-cols-2">
            {faqs.map((faq) => (
              <div key={faq.q} className="space-y-2">
                <h3 className="text-lg font-semibold text-zinc-900">{faq.q}</h3>
                <p className="text-sm text-zinc-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>
        <FooterStatus onLoginClick={() => setIsLoginOpen(true)} />
      </main>
    </div>
  );
}
