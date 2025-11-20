'use client';

import { useState } from "react";
import Link from "next/link";

import AchievementModal from "@/components/achievement-modal";

const THRESHOLD_METERS = 50;

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

  const achievements = baseAchievements.map((item) => ({
    ...item,
    unlocked: unlockedMap[item.id] ?? false,
  }));
  const unlockedCount = achievements.filter((ach) => ach.unlocked).length;

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
          setStatus("success");
          setMessage(`${unlockedNow[0].spot.title} を解除しました！`);
          setModalData({
            achievement: unlockedNow[0].spot,
            unlocked: true,
            distance: unlockedNow[0].distance,
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
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-emerald-50 px-4 py-8 text-zinc-900">
      <AchievementModal
        open={Boolean(modalData)}
        onClose={() => setModalData(null)}
        isUnlocked={modalData?.unlocked ?? false}
        distanceMeters={modalData?.distance}
        achievement={modalData?.achievement}
      />
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 flex items-start justify-end bg-black/30 px-4 py-6 backdrop-blur-sm">
          <div className="h-full w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-400">Stamp Rally</p>
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
              未解除のスポットはグレーで表示されます。現地でチェックインすると華やかなスタンプに変化します。
            </p>
            <div className="mt-6 grid gap-4">
              {achievements.map((ach) => (
                <div
                  key={ach.id}
                  className={`rounded-2xl border p-4 transition ${
                    ach.unlocked
                      ? "border-rose-200 bg-gradient-to-br from-rose-100 via-white to-emerald-50 shadow-lg"
                      : "border-dashed border-zinc-200 bg-zinc-50/60 text-zinc-400"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3
                      className={`text-lg font-semibold ${
                        ach.unlocked ? "text-rose-600" : "text-zinc-400"
                      }`}
                    >
                      {ach.title}
                    </h3>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        ach.unlocked ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-500"
                      }`}
                    >
                      {ach.unlocked ? "Unlocked" : "Locked"}
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
      <div className="mx-auto flex max-w-4xl flex-col gap-8 rounded-3xl bg-white/80 p-6 shadow-2xl ring-1 ring-rose-100 sm:p-10">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-400">Field Game</p>
            <h1 className="text-3xl font-bold">スポット チェックイン</h1>
            <p className="mt-1 text-sm text-zinc-500">
              現在地を確認して、50m圏内の近くにあるスポットの実績を解除できます。
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              className="inline-flex items-center justify-center rounded-full border border-rose-200 px-6 py-2 text-sm font-semibold text-rose-500 shadow-sm transition hover:bg-rose-50"
            >
              メニュー
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-zinc-200 px-6 py-2 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-50"
            >
              ← LPへ戻る
            </Link>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[3fr,2fr]">
          <div className="rounded-3xl border border-rose-100 bg-gradient-to-br from-rose-100 to-white p-6 shadow-inner">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-rose-500">簡易マップ</p>
            <div className="relative mt-4 h-80 overflow-hidden rounded-2xl border border-white/40 bg-[radial-gradient(circle_at_center,_rgba(244,114,182,0.2),_rgba(255,255,255,0.1))] text-xs text-zinc-600">
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.2)_1px,transparent_1px)] bg-[size:20px_20px]" />
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
                        spot.unlocked ? "bg-rose-500 text-white" : "bg-zinc-200 text-zinc-500"
                      }`}
                    >
                      {spot.title}
                    </span>
                    <span
                      className={`mt-2 h-4 w-4 rounded-full border-4 ${
                        spot.unlocked ? "border-white bg-rose-500 shadow-lg shadow-rose-200" : "border-zinc-100 bg-zinc-400"
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
                  <span className="rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-semibold text-white shadow">
                    あなた
                  </span>
                  <span className="mt-2 h-4 w-4 rounded-full border-4 border-white bg-emerald-500 shadow" />
                </div>
              )}
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              ※ 実際のマップではなく、スポットとの相対位置のイメージ図です。実際の位置判定はGPSを使用します。
            </p>
          </div>

          <div className="space-y-6 rounded-3xl border border-zinc-100 bg-white/90 p-6 shadow-lg">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-400">ステータス</p>
              <h2 className="mt-2 text-2xl font-bold text-zinc-900">
                {status === "success"
                  ? "実績解除済み"
                  : status === "checking"
                    ? "測位中..."
                    : status === "error"
                      ? "圏内に未到達"
                      : "未チェック"}
              </h2>
              <p className="mt-2 text-sm text-zinc-600">
                {status === "success"
                  ? "スタンプ帳に実績が追加されました。ギャラリーから進捗を確認しましょう。"
                  : "「現在地を確認」ボタンを押してスポットをチェックインしましょう。"}
              </p>
            </div>

            <div className="rounded-2xl border border-dashed border-emerald-100 bg-emerald-50/80 p-4 text-sm text-emerald-700">
              登録スポット数: {achievements.length} 箇所
              <br />
              判定距離: {THRESHOLD_METERS}m 以内
              <br />
              現在のスタンプ: {unlockedCount} / {achievements.length}
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
              disabled={status === "checking"}
              className="w-full rounded-full bg-rose-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-200 transition hover:bg-rose-600 disabled:opacity-50"
            >
              {status === "checking" ? "測位中..." : "現在地を確認"}
            </button>

            <div>
              <div className="flex justify-between text-xs font-semibold text-zinc-500">
                <span>スタンプ進捗</span>
                <span>
                  {unlockedCount} / {achievements.length}
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-rose-100">
                <div
                  className="h-full rounded-full bg-rose-500 transition-all"
                  style={{ width: `${(unlockedCount / achievements.length) * 100}%` }}
                />
              </div>
            </div>

            <p className="text-xs text-zinc-500">
              ブラウザの位置情報許可が必要です。精度の都合で50m以内でも再計測が必要になる場合があります。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
