'use client';

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useState } from "react";
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

  const achievements = baseAchievements.map((item) => ({
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

  function handleCheckLocation() {
    if (!session) {
      setStatus("error");
      setMessage("実績を解除するにはログインが必要です。トップページからログインしてください。");
      setModalData({
        achievement: baseAchievements[0],
        unlocked: false,
        distance: undefined,
      });
      return;
    }

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

        const distances = baseAchievements.map((spot) => ({
          spot,
          distance: calculateDistanceMeters(coords, { lat: spot.lat, lng: spot.lng }),
        }));

        const unlockedNow = distances.filter((entry) => entry.distance <= THRESHOLD_METERS);
        const closest = distances.reduce((prev, current) =>
          current.distance < prev.distance ? current : prev,
        );

        if (unlockedNow.length > 0) {
          setUnlockedMap((prev) => {
            const next = { ...prev };
            unlockedNow.forEach(({ spot }) => {
              next[spot.id] = true;
            });
            return next;
          });
          void persistUnlockedAchievements(
            unlockedNow.map(({ spot }) => spot.id),
            coords,
          );
          setStatus("success");
          setMessage(`${unlockedNow[0].spot.title} を解除しました！`);
          setModalData({
            achievement: unlockedNow[0].spot,
            unlocked: true,
            distance: unlockedNow[0].distance,
          });
          if (!hasTriggeredArIntro) {
            setHasTriggeredArIntro(true);
            setArStage("celebration");
          }
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
    <div className="min-h-screen bg-gradient-to-b from-red-50 via-green-50 to-red-50 px-4 py-8 text-zinc-900">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="animate-snow absolute text-3xl opacity-40">❄️</div>
        <div className="animate-snow-delay-1 absolute left-1/4 text-2xl opacity-30">⭐</div>
        <div className="animate-snow-delay-2 absolute left-1/2 text-4xl opacity-30">❄️</div>
        <div className="animate-snow-delay-3 absolute left-3/4 text-2xl opacity-40">✨</div>
      </div>
      <AchievementModal
        open={Boolean(modalData)}
        onClose={() => setModalData(null)}
        isUnlocked={modalData?.unlocked ?? false}
        distanceMeters={modalData?.distance}
        achievement={modalData?.achievement}
      />
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
        <div className="fixed inset-0 z-40 flex items-start justify-end bg-black/30 px-4 py-6 backdrop-blur-sm">
          <div className="h-full w-full max-w-md overflow-y-auto rounded-3xl border-2 border-green-200 bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-red-500">
                  <span className="text-lg">🎁</span> Stamp Rally
                </p>
                <h2 className="text-2xl font-bold text-zinc-900">実績ギャラリー</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500 transition hover:bg-zinc-50"
              >
                CLOSE
              </button>
            </div>
            <p className="mt-2 text-sm text-zinc-600">
              未解除のスポットは 🔒 で表示されます。現地でチェックインすると華やかなスタンプに変化します 🎉
            </p>
            <div className="mt-6 grid gap-4">
              {achievements.map((ach) => (
                <div
                  key={ach.id}
                  className={`rounded-2xl border p-4 transition ${
                    ach.unlocked
                      ? "border-red-200 bg-gradient-to-br from-red-100 via-white to-green-50 shadow-lg"
                      : "border-dashed border-zinc-200 bg-zinc-50/60 text-zinc-400"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3
                      className={`flex items-center gap-2 text-lg font-semibold ${
                        ach.unlocked ? "text-red-600" : "text-zinc-400"
                      }`}
                    >
                      <span>{ach.unlocked ? '🎁' : '🔒'}</span>
                      {ach.title}
                    </h3>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        ach.unlocked ? "bg-green-100 text-green-700" : "bg-zinc-200 text-zinc-500"
                      }`}
                    >
                      {ach.unlocked ? "✓ Unlocked" : "Locked"}
                    </span>
                  </div>
                  <p className={`mt-1 text-sm ${ach.unlocked ? "text-zinc-600" : "text-zinc-400"}`}>
                    {ach.spot}
                  </p>
                  <p className={`mt-2 text-sm ${ach.unlocked ? "text-zinc-600" : "text-zinc-400"}`}>
                    {ach.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="mx-auto flex max-w-4xl flex-col gap-8 rounded-3xl border-2 border-red-200 bg-white/90 p-6 shadow-2xl ring-2 ring-green-100/50 sm:p-10">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-red-500">
              <span className="text-lg">🎮</span> Field Game
            </p>
            <h1 className="flex items-center gap-2 text-3xl font-bold">
              <span className="text-2xl">🎯</span>
              スポット チェックイン
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              現在地を確認して、100m圏内の近くにあるスポットの実績を解除できます。
              {!session && <span className="ml-1 font-semibold text-red-600">※ログインが必要です 🔒</span>}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-green-200 bg-green-50 px-6 py-2 text-sm font-semibold text-green-700 shadow-sm transition hover:bg-green-100"
            >
              <span className="text-lg">🎄</span>
              メニュー
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 px-6 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
            >
              <span className="text-lg">🏠</span>
              LPへ戻る
            </Link>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[3fr,2fr]">
          <div className="rounded-3xl border-2 border-green-200 bg-gradient-to-br from-red-50 to-green-50 p-6 shadow-xl">
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-green-600">
              <span className="text-lg">🗺️</span>
              簡易マップ
            </p>
            <div className="relative mt-4 h-80 overflow-hidden rounded-2xl border-2 border-red-200 bg-[radial-gradient(circle_at_center,_rgba(220,38,38,0.15),_rgba(34,197,94,0.15))] text-xs text-zinc-600">
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(220,38,38,0.1)_1px,transparent_1px),linear-gradient(rgba(34,197,94,0.1)_1px,transparent_1px)] bg-[size:20px_20px]" />
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
                        spot.unlocked ? "bg-red-600 text-white shadow-lg" : "bg-zinc-300 text-zinc-600"
                      }`}
                    >
                      {spot.unlocked ? '🎁 ' : '🔒 '}{spot.title}
                    </span>
                    <span
                      className={`mt-2 h-4 w-4 rounded-full border-4 ${
                        spot.unlocked ? "border-white bg-green-500 shadow-lg shadow-green-300" : "border-zinc-200 bg-zinc-400"
                      }`}
                    />
                  </div>
                );
              })}
              {userLocation && (
                <div
                  className="absolute flex flex-col items-center text-emerald-600"
                  style={projectToMap(userLocation.lat, userLocation.lng)}
                >
                  <span className="rounded-full bg-blue-600 px-3 py-1 text-[10px] font-semibold text-white shadow">
                    🎅 あなた
                  </span>
                  <span className="mt-2 h-4 w-4 animate-pulse rounded-full border-4 border-white bg-blue-500 shadow-lg" />
                </div>
              )}
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              ※ 実際のマップではなく、スポットとの相対位置のイメージ図です。実際の位置判定はGPSを使用します。
            </p>
          </div>

          <div className="space-y-6 rounded-3xl border-2 border-red-200 bg-white/95 p-6 shadow-xl">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-green-500">
                <span className="text-lg">📊</span> ステータス
              </p>
              <h2 className="mt-2 text-2xl font-bold text-zinc-900">
                {status === "success"
                  ? "🎉 実績解除済み"
                  : status === "checking"
                    ? "📍 測位中..."
                    : status === "error"
                      ? "❌ 圏内に未到達"
                      : "⏳ 未チェック"}
              </h2>
              <p className="mt-2 text-sm text-zinc-600">
                {status === "success"
                  ? "スタンプ帳に実績が追加されました。ギャラリーから進捗を確認しましょう。"
                  : "「現在地を確認」ボタンを押してスポットをチェックインしましょう。"}
              </p>
            </div>

            <div className="rounded-2xl border border-dashed border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-4 text-sm text-green-700">
              🎄 登録スポット数: {achievements.length} 箇所
              <br />
              🎯 判定距離: {THRESHOLD_METERS}m 以内
              <br />
              ⭐ 現在のスタンプ: {unlockedCount} / {achievements.length}
            </div>

            {message && (
              <p
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  status === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-rose-200 bg-rose-50 text-rose-600"
                }`}
              >
                {message}
              </p>
            )}

            <button
              type="button"
              onClick={handleCheckLocation}
              disabled={status === "checking" || !session}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-red-600 to-green-600 px-4 py-3 text-sm font-semibold text-white shadow-xl shadow-red-300 transition hover:from-red-700 hover:to-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {!session ? (
                <>
                  <span className="text-lg">🔒</span>
                  ログインが必要です
                </>
              ) : status === "checking" ? (
                <>
                  <span className="text-lg">📍</span>
                  測位中...
                </>
              ) : (
                <>
                  <span className="text-lg">🎯</span>
                  現在地を確認
                </>
              )}
            </button>

            <div>
              <div className="flex justify-between text-xs font-semibold text-zinc-500">
                <span>スタンプ進捗</span>
                <span>
                  {unlockedCount} / {achievements.length}
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-red-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-red-500 to-green-500 transition-all"
                  style={{ width: `${(unlockedCount / achievements.length) * 100}%` }}
                />
              </div>
            </div>
            <p
              className={`text-xs ${
                session && cloudStatus === "error" ? "text-rose-500" : "text-zinc-500"
              }`}
            >
              {session
                ? cloudStatusMessage || "ログイン中はクラウドに同期されます。 ☁️"
                : "🔒 ログインすると解除状況をSupabaseに保存できます。"}
            </p>

            {unlockedCount > 0 && (
              <div className="rounded-2xl border-2 border-red-200 bg-gradient-to-br from-red-50 via-white to-green-50 p-4 shadow-xl">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-red-500">
                      <span className="text-lg">🎅</span> AR Experience
                    </p>
                    <h3 className="text-lg font-bold text-zinc-900">ARキャラクターが待っています ✨</h3>
                    <p className="mt-1 text-sm text-zinc-600">
                      最初の実績を解除したので、ARカメラでキャラクター「ピコモモ」を召喚できます 🎄
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Link
                      href="/ar-camera"
                      className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-red-600 to-green-600 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-red-300 transition hover:from-red-700 hover:to-green-700"
                    >
                      <span className="text-base">📸</span>
                      ARカメラを起動
                    </Link>
                    <button
                      type="button"
                      onClick={() => setArStage("camera")}
                      className="flex items-center justify-center gap-2 rounded-full border-2 border-rose-300 bg-white px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-rose-600 transition hover:bg-rose-50"
                    >
                      <span className="text-base">🎨</span>
                      モック表示
                    </button>
                  </div>
                </div>
                <div className="mt-4 h-36 overflow-hidden rounded-2xl border border-dashed border-rose-200 bg-gradient-to-b from-zinc-900 via-zinc-800 to-zinc-900">
                  <div className="relative h-full w-full">
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />
                    <div className="absolute left-1/2 top-1/2 h-24 w-20 -translate-x-1/2 -translate-y-1/2 rounded-[45%] bg-gradient-to-b from-rose-200 to-rose-500 shadow-[0_8px_20px_rgba(244,114,182,0.45)]">
                      <div className="absolute left-1/2 top-5 flex -translate-x-1/2 gap-3">
                        <span className="h-3 w-3 rounded-full bg-white shadow-inner shadow-rose-400" />
                        <span className="h-3 w-3 rounded-full bg-white shadow-inner shadow-rose-400" />
                      </div>
                      <div className="absolute left-1/2 top-12 -translate-x-1/2 text-xl text-white">^_^</div>
                    </div>
                    <div className="absolute inset-0 animate-pulse bg-[radial-gradient(circle,_rgba(255,255,255,0.15),_transparent_60%)] opacity-30" />
                  </div>
                </div>
              </div>
            )}

            <p className="text-xs text-zinc-500">
              ブラウザの位置情報許可が必要です。精度の都合で100m以内でも再計測が必要になる場合があります。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
