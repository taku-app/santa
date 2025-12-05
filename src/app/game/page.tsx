'use client';

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

import AchievementModal from "@/components/achievement-modal";
import { useSupabaseSession } from "@/hooks/use-supabase-session";

const THRESHOLD_METERS = 100;

type AchievementSpot = {
  id: string;
  title: string;
  spot: string;
  description: string;
  lat: number;
  lng: number;
};

type DisplayAchievement = AchievementSpot & { unlocked: boolean };

const UNLOCK_SPARKS = [
  { id: "spark-1", top: "18%", left: "18%", delay: "0s" },
  { id: "spark-2", top: "12%", left: "70%", delay: "0.2s" },
  { id: "spark-3", top: "70%", left: "20%", delay: "0.4s" },
  { id: "spark-4", top: "65%", left: "75%", delay: "0.1s" },
  { id: "spark-5", top: "40%", left: "10%", delay: "0.3s" },
] as const;

const baseAchievements: AchievementSpot[] = [
  {
    id: "midland",
    title: "ツリー煌き実績",
    spot: "名古屋駅 ミッドランドスクエア",
    description: "巨大ツリーを背景にARイルミを解放。",
    lat: 35.17048023143814,
    lng: 136.88513577807637,
  },
  {
    id: "oasis21",
    title: "スターキャッチャー",
    spot: "栄 オアシス21",
    description: "銀河の広場で星屑を集めよう。",
    lat: 35.170915,
    lng: 136.908284,
  },
  {
    id: "nagoya-castle",
    title: "和装サンタ",
    spot: "名古屋城",
    description: "城壁ARで和コラボ演出を開放。",
    lat: 35.185146,
    lng: 136.899517,
  },
  {
    id: "dainagoya",
    title: "スカイリフト",
    spot: "大名古屋ビルヂング",
    description: "スカイガーデンで夜景を解放。",
    lat: 35.170987,
    lng: 136.881646,
  },
  {
    id: "port",
    title: "ポートライダー",
    spot: "名古屋港ガーデンふ頭",
    description: "海辺のトナカイスタンプを集める。",
    lat: 35.093544,
    lng: 136.882299,
  },
  {
    id: "osu",
    title: "大須チャレンジャー",
    spot: "大須商店街",
    description: "フード＆ガチャARをコンプリート。",
    lat: 35.158164,
    lng: 136.906997,
  },
];

const latitudes = baseAchievements.map((spot) => spot.lat);
const longitudes = baseAchievements.map((spot) => spot.lng);
const PADDING = 0.002;
const MAP_BOUNDS = {
  minLat: Math.min(...latitudes) - PADDING,
  maxLat: Math.max(...latitudes) + PADDING,
  minLng: Math.min(...longitudes) - PADDING,
  maxLng: Math.max(...longitudes) + PADDING,
};

function clamp01(value: number) {
  return Math.min(Math.max(value, 0), 1);
}

function projectToMap(lat: number, lng: number) {
  const latRange = MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat || 0.001;
  const lngRange = MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng || 0.001;
  const topRatio = clamp01((lat - MAP_BOUNDS.minLat) / latRange);
  const leftRatio = clamp01((lng - MAP_BOUNDS.minLng) / lngRange);
  return {
    left: `${leftRatio * 80 + 10}%`,
    top: `${(1 - topRatio) * 80 + 10}%`,
  };
}

function calculateDistanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371e3;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const deltaLat = ((b.lat - a.lat) * Math.PI) / 180;
  const deltaLng = ((b.lng - a.lng) * Math.PI) / 180;

  const hav =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
  return R * c;
}

function findClosestAchievement(
  coords: { lat: number; lng: number },
): { spot: AchievementSpot; distance: number } {
  if (baseAchievements.length === 0) {
    throw new Error("No achievements configured for distance checks.");
  }

  return baseAchievements.slice(1).reduce(
    (closest, spot) => {
      const distance = calculateDistanceMeters(coords, { lat: spot.lat, lng: spot.lng });
      if (distance < closest.distance) {
        return { spot, distance };
      }
      return closest;
    },
    {
      spot: baseAchievements[0],
      distance: calculateDistanceMeters(coords, { lat: baseAchievements[0].lat, lng: baseAchievements[0].lng }),
    },
  );
}

function AchievementCollectionCard({ achievement }: { achievement: DisplayAchievement }) {
  return (
    <div
      className={`collection-card ${
        achievement.unlocked ? "collection-card--unlocked" : "collection-card--locked"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="collection-card__spot">{achievement.spot}</p>
          <h3 className="collection-card__title">{achievement.title}</h3>
        </div>
        <span
          className={`collection-card__status ${
            achievement.unlocked ? "collection-card__status--unlocked" : "collection-card__status--locked"
          }`}
        >
          {achievement.unlocked ? "UNLOCKED" : "LOCKED"}
        </span>
      </div>
      <p className="collection-card__description">{achievement.description}</p>
      <div className="collection-card__chips">
        <span>判定距離 {THRESHOLD_METERS}m</span>
        <span>{achievement.unlocked ? "クラウド同期済み" : "現地チェック必要"}</span>
      </div>
    </div>
  );
}

export default function GamePage() {
  const { session, supabase } = useSupabaseSession();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [status, setStatus] = useState<"idle" | "checking" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [unlockedMap, setUnlockedMap] = useState<Record<string, boolean>>({});
  const [modalData, setModalData] = useState<{
    achievement: AchievementSpot;
    unlocked: boolean;
    distance?: number;
  } | null>(null);
  const [arStage, setArStage] = useState<"hidden" | "celebration" | "camera">("hidden");
  const [hasTriggeredArIntro, setHasTriggeredArIntro] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [cloudStatusMessage, setCloudStatusMessage] = useState("");
  const [unlockCelebration, setUnlockCelebration] = useState<{
    id: string;
    title: string;
    spot: string;
  } | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const achievements: DisplayAchievement[] = baseAchievements.map((item) => ({
    ...item,
    unlocked: unlockedMap[item.id] ?? false,
  }));
  const unlockedCount = achievements.filter((ach) => ach.unlocked).length;
  const firstUnlocked = achievements.find((ach) => ach.unlocked);

  // Supabase progress needs to stay in sync with the browser session, so we update state via this effect.
  useEffect(() => {
    let isSubscribed = true;

    if (!session) {
      return () => {
        isSubscribed = false;
      };
    }

    const loadCloudProgress = async () => {
      setCloudStatus("syncing");
      setCloudStatusMessage("クラウド進捗を同期中...");

      const { data, error } = await supabase
        .from("user_achievements")
        .select("achievement_id")
        .eq("user_id", session.user.id);

      if (!isSubscribed) {
        return;
      }

      if (error) {
        console.error("Failed to fetch achievement progress", error);
        setCloudStatus("error");
        setCloudStatusMessage("クラウド実績の取得に失敗しました。");
        return;
      }

      const next: Record<string, boolean> = {};
      data?.forEach((row) => {
        next[row.achievement_id] = true;
      });
      setUnlockedMap(next);
      setCloudStatus("success");
      setCloudStatusMessage("クラウドと同期済み");
    };

    void loadCloudProgress();

    return () => {
      isSubscribed = false;
    };
  }, [session, supabase]);

  const persistUnlockedAchievements = useCallback(
    async (achievementIds: string[], coords: { lat: number; lng: number }) => {
      if (!session || achievementIds.length === 0) {
        return;
      }

      setCloudStatus("syncing");
      setCloudStatusMessage("実績をクラウドへ保存中...");

      const payload = achievementIds.map((achievementId) => ({
        user_id: session.user.id,
        achievement_id: achievementId,
        unlocked_at: new Date().toISOString(),
        last_lat: coords.lat,
        last_lng: coords.lng,
      }));

      const { error } = await supabase
        .from("user_achievements")
        .upsert(payload, { onConflict: "user_id,achievement_id" });

      if (error) {
        console.error("Failed to persist achievements", error);
        setCloudStatus("error");
        setCloudStatusMessage("クラウド保存に失敗しました。通信環境を確認してください。");
        return;
      }

      setCloudStatus("success");
      setCloudStatusMessage("クラウドと同期済み");
    },
    [session, supabase],
  );

  useEffect(() => {
    if (arStage === "celebration") {
      const timer = window.setTimeout(() => setArStage("camera"), 2500);
      return () => window.clearTimeout(timer);
    }
  }, [arStage]);

  const triggerUnlockFeedback = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      if ("vibrate" in navigator && typeof navigator.vibrate === "function") {
        navigator.vibrate([180, 80, 180]);
      }
    } catch (error) {
      console.error("Failed to vibrate device", error);
    }

    const AudioCtor =
      window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) {
      return;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioCtor();
    }

    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(820, ctx.currentTime);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.7);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.7);
  }, []);

  useEffect(() => {
    if (!unlockCelebration) {
      return;
    }

    triggerUnlockFeedback();
    const timeout = window.setTimeout(() => setUnlockCelebration(null), 2500);
    return () => window.clearTimeout(timeout);
  }, [unlockCelebration, triggerUnlockFeedback]);

  function handleCheckLocation() {
    if (!("geolocation" in navigator)) {
      setStatus("error");
      setMessage("この端末では位置情報を取得できません。");
      return;
    }

    setStatus("checking");
    setMessage("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(coords);

        const closest = findClosestAchievement(coords);
        const isWithinRange = closest.distance <= THRESHOLD_METERS;

        if (isWithinRange) {
          setUnlockedMap((prev) => {
            const next = { ...prev };
            next[closest.spot.id] = true;

            // Calculate the count of newly unlocked achievements
            const newlyUnlockedCount = baseAchievements.filter((ach) => next[ach.id]).length;

            if (!hasTriggeredArIntro && newlyUnlockedCount >= 5) {
              setHasTriggeredArIntro(true);
              setArStage("celebration");
            }

            return next;
          });
          const canonicalCoords = { lat: closest.spot.lat, lng: closest.spot.lng };
          void persistUnlockedAchievements(
            [closest.spot.id],
            canonicalCoords,
          );
          setStatus("success");
          setMessage(`${closest.spot.title} を解除しました！`);
          setModalData({
            achievement: closest.spot,
            unlocked: true,
            distance: closest.distance,
          });
          setUnlockCelebration({
            id: closest.spot.id,
            title: closest.spot.title,
            spot: closest.spot.spot,
          });
        } else {
          setStatus("error");
          setMessage(`${closest.spot.title} まで ${Math.round(closest.distance)}m`);
          setModalData({
            achievement: closest.spot,
            unlocked: false,
            distance: closest.distance,
          });
        }
      },
      (error) => {
        setStatus("error");
        setMessage(error.message || "位置情報の取得に失敗しました。");
      },
      {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 0,
      },
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#041109] text-white">
      <div className="hero-aurora hero-aurora--game" />
      <div className="floating-orb floating-orb--pink floating-orb--sm" />
      <div className="floating-orb floating-orb--mint floating-orb--md" />
      <div className="floating-orb floating-orb--gold floating-orb--lg" />
      <AchievementModal
        open={Boolean(modalData)}
        onClose={() => setModalData(null)}
        isUnlocked={modalData?.unlocked ?? false}
        distanceMeters={modalData?.distance}
        achievement={modalData?.achievement}
      />
      {unlockCelebration && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center">
          <div className="unlock-burst text-center text-white">
            <div className="unlock-burst__ring" aria-hidden />
            <div className="unlock-burst__ring unlock-burst__ring--secondary" aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-[0.6em] text-amber-200/80">Achievement</p>
            <p className="mt-2 text-3xl font-bold">{unlockCelebration.title}</p>
            <p className="mt-1 text-sm text-white/80">{unlockCelebration.spot}</p>
          </div>
          {UNLOCK_SPARKS.map((spark) => (
            <span
              key={spark.id}
              className="unlock-burst__sparkle"
              style={{ top: spark.top, left: spark.left, animationDelay: spark.delay }}
            />
          ))}
        </div>
      )}
      {arStage !== "hidden" && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4 py-8 backdrop-blur-md">
          {arStage === "celebration" ? (
            <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-gradient-to-b from-rose-50 via-white to-amber-50 p-8 text-center shadow-2xl">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.35),_transparent_70%)]" />
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-rose-400">Achievement</p>
              <h2 className="mt-4 text-3xl font-bold text-rose-600">実績解除おめでとう！</h2>
              <p className="mt-3 text-sm text-zinc-600">
                {firstUnlocked?.title ?? "新しい実績"} を開放しました。
                <br />
                ARカメラで可愛いキャラクターがあなたを祝福します。
              </p>
              <div className="mt-6 flex flex-col items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-5 py-2 text-xs font-semibold tracking-widest text-rose-500">
                  <span className="h-2 w-2 animate-ping rounded-full bg-rose-500" />
                  ARビュー準備中...
                </span>
                <p className="text-xs text-zinc-500">数秒後にARカメラ画面へ切り替わります。</p>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-2xl rounded-3xl bg-zinc-900/95 p-6 text-white shadow-[0_30px_80px_rgba(0,0,0,0.65)]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.4em] text-emerald-300">AR Camera</p>
                  <h3 className="text-2xl font-bold text-white">ピコモモ現れた！</h3>
                  <p className="mt-1 text-sm text-zinc-200">端末を動かしてキャラクターを探してみましょう。</p>
                </div>
                <button
                  type="button"
                  onClick={() => setArStage("hidden")}
                  className="rounded-full border border-white/30 px-5 py-2 text-xs font-semibold tracking-[0.3em] text-white transition hover:bg-white/10"
                >
                  CLOSE
                </button>
              </div>
              <div className="relative mt-6 h-96 overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.2),_rgba(0,0,0,0.8))]">
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:60px_60px]" />
                <div className="pointer-events-none absolute inset-x-10 inset-y-12 border border-white/30" />
                <div className="absolute left-1/2 top-1/2 h-48 w-40 -translate-x-1/2 -translate-y-1/2 rounded-[45%] bg-gradient-to-b from-rose-100 via-rose-300 to-rose-500 shadow-[0_10px_35px_rgba(244,114,182,0.6)]">
                  <div className="absolute left-1/2 top-6 flex -translate-x-1/2 gap-5">
                    <span className="h-4 w-4 rounded-full bg-white shadow-inner shadow-rose-400" />
                    <span className="h-4 w-4 rounded-full bg-white shadow-inner shadow-rose-400" />
                  </div>
                  <div className="absolute left-1/2 top-16 -translate-x-1/2 text-3xl text-white">ᵔᴥᵔ</div>
                  <div className="absolute inset-x-6 bottom-6 flex items-center justify-between text-xs text-white/80">
                    <span>ピコモモ</span>
                    <span className="rounded-full bg-white/20 px-2 py-1 text-[10px] uppercase tracking-widest">AR</span>
                  </div>
                </div>
                <div className="absolute inset-0 animate-pulse bg-[radial-gradient(circle,_rgba(255,255,255,0.2),_transparent_60%)] opacity-20" />
                <div className="absolute right-4 top-4 flex flex-col gap-2 text-[10px] text-white/70">
                  <span className="rounded-full bg-black/40 px-3 py-1">Depth Lock</span>
                  <span className="rounded-full bg-black/40 px-3 py-1">Light Boost</span>
                </div>
              </div>
              <p className="mt-4 text-sm text-zinc-200">
                実際のカメラ映像の上にキャラクターが合成される想定のモックです。周囲をスキャンして新しい演出を探してみてください。
              </p>
            </div>
          )}
        </div>
      )}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 flex items-start justify-end bg-black/60 px-4 py-6 backdrop-blur-md">
          <div className="h-full w-full max-w-md overflow-y-auto rounded-3xl border border-white/20 bg-gradient-to-br from-[#1e1130]/95 to-[#0a1f2d]/95 p-6 text-white shadow-[0_30px_80px_rgba(0,0,0,0.65)] sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-200">Stamp Rally</p>
                <h2 className="text-2xl font-bold">実績ギャラリー</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="rounded-full border border-white/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/80 transition hover:bg-white/10"
              >
                CLOSE
              </button>
            </div>
            <p className="mt-2 text-sm text-white/70">
              未解除のスポットはグレーで表示されます。現地でチェックインすると華やかなスタンプに変化します。
            </p>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {achievements.map((ach) => (
                <AchievementCollectionCard key={`drawer-${ach.id}`} achievement={ach} />
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="relative z-10 mx-auto flex max-w-5xl flex-col gap-12 px-4 pb-20 pt-12 sm:px-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.5em] text-rose-200/80">Field Game</p>
            <h1 className="text-3xl font-bold">スポット チェックイン</h1>
            <p className="mt-1 text-sm text-white/70">名古屋のキャンディースポットを巡り、100m圏内で実績を解放しましょう。</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setIsMenuOpen(true)} className="candy-button candy-button--ghost">
              メニュー
            </button>
            <Link href="/" className="candy-button candy-button--ghost">
              ← LPへ戻る
            </Link>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[3fr,2fr]">
          <div className="frosted-panel space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.5em] text-rose-200">Candy Map</p>
              <h2 className="text-2xl font-bold">簡易マップ</h2>
              <p className="mt-1 text-sm text-white/70">スポットの相対位置を示すミニマップ。判定自体はGPSで行われます。</p>
            </div>
            <div className="relative h-80 overflow-hidden rounded-2xl border border-white/20 bg-[radial-gradient(circle_at_center,_rgba(244,114,182,0.25),_rgba(3,0,20,0.6))] text-xs">
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[size:20px_20px]" />
              {achievements.map((spot) => {
                const position = projectToMap(spot.lat, spot.lng);
                return (
                  <div
                    key={spot.id}
                    className="absolute flex flex-col items-center"
                    style={{ left: position.left, top: position.top }}
                  >
                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-semibold ${
                        spot.unlocked
                          ? "bg-gradient-to-r from-rose-500 to-amber-400 text-white shadow-lg shadow-rose-500/30"
                          : "bg-white/15 text-white/70"
                      }`}
                    >
                      {spot.title}
                    </span>
                    <span
                      className={`mt-2 h-4 w-4 rounded-full border-4 ${
                        spot.unlocked ? "border-white bg-rose-500 shadow shadow-rose-500/40" : "border-white/20 bg-white/30"
                      }`}
                    />
                  </div>
                );
              })}
              {userLocation && (
                <div
                  className="absolute flex flex-col items-center text-emerald-200"
                  style={projectToMap(userLocation.lat, userLocation.lng)}
                >
                  <span className="rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-semibold text-white shadow">
                    あなた
                  </span>
                  <span className="mt-2 h-4 w-4 rounded-full border-4 border-white bg-emerald-400 shadow" />
                </div>
              )}
            </div>
            <p className="text-xs text-white/60">※ 実際のマップではなく、スポットとの相対距離をイメージ化した表示です。</p>
          </div>

          <div className="frosted-panel space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.5em] text-emerald-200">Status</p>
              <h2 className="mt-2 text-2xl font-bold">
                {status === "success"
                  ? "実績解除済み"
                  : status === "checking"
                    ? "測位中..."
                    : status === "error"
                      ? "圏内に未到達"
                      : "未チェック"}
              </h2>
              <p className="mt-2 text-sm text-white/70">
                {status === "success"
                  ? "スタンプ帳に実績を追加しました。ギャラリーでコレクション状況を確認できます。"
                  : "「現在地を確認」でスポットチェックを実行できます。"}
              </p>
            </div>

            <div className="grid gap-2 text-sm text-white/70">
              <p>登録スポット数: {achievements.length} 箇所</p>
              <p>判定距離: {THRESHOLD_METERS}m 以内</p>
              <p>現在のスタンプ: {unlockedCount} / {achievements.length}</p>
            </div>

            {message && (
              <p
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  status === "success"
                    ? "border-emerald-300/60 bg-emerald-500/10 text-emerald-200"
                    : "border-rose-300/60 bg-rose-500/10 text-rose-200"
                }`}
              >
                {message}
              </p>
            )}

            <button
              type="button"
              onClick={handleCheckLocation}
              disabled={status === "checking"}
              className="candy-button candy-button--primary w-full justify-center text-sm disabled:opacity-60"
            >
              {status === "checking" ? "測位中..." : "現在地を確認"}
            </button>

            <div>
              <div className="flex justify-between text-xs text-white/70">
                <span>スタンプ進捗</span>
                <span>
                  {unlockedCount} / {achievements.length}
                </span>
              </div>
              <div className="game-progress mt-2">
                <div
                  className="game-progress__bar"
                  style={{ width: `${(unlockedCount / achievements.length) * 100}%` }}
                />
              </div>
            </div>
            <p className={`text-xs ${session && cloudStatus === "error" ? "text-rose-200" : "text-white/60"}`}>
              {session
                ? cloudStatusMessage || "ログイン中はクラウドに同期されます。"
                : "ログインすると解除状況をSupabaseに保存できます。"}
            </p>

            {unlockedCount >= 5 && (
              <div className="rounded-2xl border border-white/20 bg-gradient-to-br from-rose-500/30 via-transparent to-amber-400/20 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/70">AR Experience</p>
                    <h3 className="text-lg font-bold">サンタARを起動できます！</h3>
                    <p className="mt-1 text-sm text-white/80">全スポット制覇おめでとう！サンタ召喚モードを今すぐ体験。</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setArStage("camera")}
                    className="candy-button candy-button--primary text-xs uppercase tracking-[0.3em]"
                  >
                    ARカメラを起動
                  </button>
                </div>
              </div>
            )}

            {unlockedCount < 5 && (
              <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg font-bold text-white">
                    {5 - unlockedCount}
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/70">AR Unlock</p>
                    <h3 className="text-lg font-bold">AR解放まであと {5 - unlockedCount} スポット！</h3>
                  </div>
                </div>
                <p className="mt-3 text-sm text-white/70">名古屋を巡ってスタンプを集めるほど、演出が華やかになります。</p>
              </div>
            )}

            <p className="text-xs text-white/60">
              ブラウザの位置情報許可が必要です。精度の都合で100m以内でも再計測が必要になる場合があります。
            </p>
          </div>
        </div>

        <div className="frosted-panel border border-white/15">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.5em] text-rose-200">Collection Deck</p>
              <h2 className="text-2xl font-bold">3Dコレクションカード</h2>
              <p className="mt-1 text-sm text-white/70">解除したスポットをコレクションカードで眺めましょう。</p>
            </div>
            <div className="premium-pill bg-white/10 text-white">
              {unlockedCount} / {achievements.length} 解放済み
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {achievements.map((ach) => (
              <AchievementCollectionCard key={`grid-${ach.id}`} achievement={ach} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
