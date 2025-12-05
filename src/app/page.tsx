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

    const loadPremiumStatus = async () => {
      setPremiumMessage("プレミアム状態を確認中です...");

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
      } catch (error) {
        if (!isMounted) return;
        console.error("Failed to fetch premium status", error);
        setPremiumMessage("プレミアム状態を取得できませんでした。時間をおいて再読み込みしてください。");
        setIsPremium(false);
      } finally {
        if (isMounted) {
          setIsCheckingPremium(false);
        }
      }
    };

    void loadPremiumStatus();

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
    <div className="relative min-h-screen overflow-hidden bg-[#041109] text-white">
      <div className="hero-aurora" />
      <div className="floating-orb floating-orb--pink" />
      <div className="floating-orb floating-orb--mint" />
      <div className="floating-orb floating-orb--gold" />
      {isLoginOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-md">
          <div className="relative w-full max-w-xl rounded-3xl border border-white/20 bg-gradient-to-br from-white/95 to-rose-50/90 p-6 text-zinc-900 shadow-[0_40px_120px_rgba(0,0,0,0.45)] sm:p-8">
            <button
              type="button"
              onClick={() => setIsLoginOpen(false)}
              className="absolute right-4 top-4 rounded-full border border-zinc-200/70 p-2 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500 transition hover:bg-white"
              aria-label="閉じる"
            >
              ✕
            </button>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-rose-500">Account Access</p>
            <h2 className="mt-2 text-2xl font-bold">メールログイン / 新規登録</h2>
            <p className="mt-2 text-sm text-zinc-600">
              ユーザー名を登録すると、ランキングやフッターに超可愛いニックネームが表示されます。
            </p>
            <div className="mt-6">
              <AuthPanel onAuthSuccess={() => setIsLoginOpen(false)} />
            </div>
          </div>
        </div>
      )}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6 sm:px-10 lg:px-12">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.5em] text-rose-200/80">Santa Quest</p>
          <p className="text-lg font-bold tracking-wide text-white">Nagoya Aurora Parade</p>
        </div>
        {session ? (
          <Link href="/game" className="candy-button candy-button--ghost">
            ゲームへ
          </Link>
        ) : (
          <button type="button" onClick={() => setIsLoginOpen(true)} className="candy-button candy-button--primary">
            ログイン
          </button>
        )}
      </header>
      <main className="relative z-10 mx-auto flex max-w-6xl flex-col gap-16 px-6 pb-20 pt-10 sm:px-10 lg:px-12">
        <section className="pixel-panel relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_transparent_60%)]"
            aria-hidden
          />
          <div className="grid items-center gap-10 lg:grid-cols-[3fr,2fr]">
            <div className="space-y-6">
              <p className="inline-flex items-center rounded-full border border-white/30 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.6em] text-rose-100">
                名古屋限定クリスマスクエスト
              </p>
              <h1 className="text-4xl font-black leading-tight sm:text-5xl">
                きらめきの街を駆け抜けて
                <br />
                <span className="text-rose-200">サンタを召喚</span>しよう。
              </h1>
              <p className="text-base text-white/80">
                キャンディのように愛らしいUIと、ARで踊り出すサンタ＆ピコモモ。スポットごとに3Dカードを集めて、冬のNagoyaをコンプリート！
              </p>
              <div className="flex flex-wrap gap-4">
                {session ? (
                  <Link href="/game" className="candy-button candy-button--primary">
                    サンタを探しに行く
                  </Link>
                ) : (
                  <button type="button" onClick={() => setIsLoginOpen(true)} className="candy-button candy-button--primary">
                    メールでログイン
                  </button>
                )}
                <a href="#spots" className="candy-button candy-button--ghost">
                  スポット一覧
                </a>
              </div>
            </div>
            <div className="tilt-stage">
              <div className="tilt-stage__halo" aria-hidden />
              <div className="tilt-stage__avatar">
                <span className="tilt-stage__avatar-face">ʕ•ᴥ•ʔ</span>
                <p className="text-xs uppercase tracking-[0.4em] text-white/70">Pico Momo</p>
              </div>
              <div className="tilt-stage__card tilt-stage__card--snow">
                <p className="text-xs uppercase tracking-[0.6em] text-white/70">Unlocked</p>
                <p className="text-3xl font-bold">3 / 6</p>
              </div>
              <div className="tilt-stage__card tilt-stage__card--gift">
                <p className="text-xs uppercase tracking-[0.4em] text-white/70">Bonus</p>
                <p className="text-lg font-semibold text-white">Candy Rain</p>
              </div>
              <div className="tilt-stage__stars" aria-hidden />
            </div>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {heroStats.map((stat) => (
              <div key={stat.label} className="stat-pillar">
                <p className="stat-pillar__value">{stat.value}</p>
                <p className="stat-pillar__label">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.6fr,1fr]">
          <div className="pixel-panel border-l-4 border-white/20 bg-gradient-to-br from-emerald-800/40 via-transparent to-rose-900/20">
            <p className="text-xs font-semibold uppercase tracking-[0.5em] text-rose-200">Candyverse Premium</p>
            <h2 className="mt-3 text-3xl font-bold text-white">¥500 でトナカイAR &amp; 限定実績を一気に解放。</h2>
            <p className="mt-3 text-sm text-white/80">
              Stripe決済のモックを先行実装。決済後はSupabaseにPremiumタグを付与し、`/game` のAR演出がきらめきMAXに。
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="bubble-card">
                <h3>Free</h3>
                <p className="text-sm text-white/70">ツリーAR / スポット進捗 / メール認証</p>
              </div>
              <div className="bubble-card">
                <h3>Premium</h3>
                <p className="text-sm text-white/70">サンタ＆トナカイAR / 限定BGM / 優先サポート</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handlePremiumClick}
              disabled={premiumLoading || isCheckingPremium}
              className="candy-button candy-button--primary mt-6 w-full justify-center"
            >
              {isPremium ? "すぐに /game へ" : premiumLoading ? "決済ページへ遷移中..." : "プレミアムにアップグレード"}
            </button>
            {premiumMessage && <p className="mt-3 text-xs text-rose-200">{premiumMessage}</p>}
          </div>
          <div className="pixel-panel">
            <p className="text-xs uppercase tracking-[0.4em] text-white/70">Journey</p>
            <ol className="mt-4 space-y-4">
              <li className="timeline-bubble">
                <span>1</span>
                <div>
                  <p className="font-semibold text-white">スポット到達</p>
                  <p className="text-xs text-white/70">GPS 100m圏内で判定。可愛いモーダルが即表示！</p>
                </div>
              </li>
              <li className="timeline-bubble">
                <span>2</span>
                <div>
                  <p className="font-semibold text-white">クラウド保存</p>
                  <p className="text-xs text-white/70">Supabaseにスタンプ進捗を保存。端末を変えても安心。</p>
                </div>
              </li>
              <li className="timeline-bubble">
                <span>3</span>
                <div>
                  <p className="font-semibold text-white">AR出現</p>
                  <p className="text-xs text-white/70">5スポット達成でサンタ + プレミアムならトナカイも登場。</p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        <section id="spots" className="pixel-panel">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.5em] text-rose-200">Nagoya Spots</p>
              <h2 className="mt-2 text-3xl font-bold text-white">街じゅうに散らばるキャンディースポット</h2>
              <p className="mt-2 text-sm text-white/70">モックデータでカード化。後続ではSupabaseからの取得を想定。</p>
            </div>
            <div className="premium-pill">GPS±50m / 判定100m</div>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {nagoyaSpots.map((spot, index) => (
              <article key={spot.name} className="spot-card">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.5em] text-white/60">#{String(index + 1).padStart(2, "0")}</p>
                    <h3 className="text-xl font-bold">{spot.name}</h3>
                  </div>
                  <span className="spot-card__badge">{spot.badge}</span>
                </div>
                <p className="mt-3 text-sm text-white/80">{spot.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[1.4fr,1fr]" id="access">
          <div className="pixel-panel bg-gradient-to-br from-emerald-900/40 via-transparent to-amber-900/20">
            <p className="text-xs font-semibold uppercase tracking-[0.5em] text-emerald-200">Camera Unlock</p>
            <h2 className="mt-3 text-3xl font-bold text-white">ARカメラはPWA風。サンタと一緒に夜景散歩。</h2>
            <p className="mt-3 text-sm text-white/80">
              ログイン後はクラウドプロフィールと同期。ブラウザ上でARを起動し、そのままスクショ＆シェアが可能。
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="bubble-card">
                <h3>サンタモード</h3>
                <p className="text-xs text-white/70">サンタ本体とARフォト。ARKit/ARCoreブラウザを想定。</p>
              </div>
              <div className="bubble-card">
                <h3>トナカイモード</h3>
                <p className="text-xs text-white/70">Premium限定。ギフトBOXや雪のパーティクルを配置。</p>
              </div>
            </div>
          </div>
          <div className="pixel-panel">
            <h3 className="text-xl font-bold text-white">ログインポータル</h3>
            <p className="mt-2 text-sm text-white/80">ユーザー名を設定するとランキングに愛称が表示されます。</p>
            <button
              type="button"
              onClick={() => setIsLoginOpen(true)}
              className="candy-button candy-button--primary mt-6 w-full justify-center"
            >
              {session ? "プロフィールを編集" : "ログインモーダルを開く"}
            </button>
            <p className="mt-3 text-xs text-white/60">同モーダルからログアウトも可能です。</p>
          </div>
        </section>

        <section className="pixel-panel">
          <div className="grid gap-8 md:grid-cols-2">
            {faqs.map((faq) => (
              <div key={faq.q} className="faq-card">
                <h3>{faq.q}</h3>
                <p>{faq.a}</p>
              </div>
            ))}
          </div>
        </section>
        <FooterStatus onLoginClick={() => setIsLoginOpen(true)} />
      </main>
    </div>
  );
}
