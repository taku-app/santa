'use client';

import { useState } from 'react';
import ArCamera from '@/components/ar-camera';

export default function ArDemoPage() {
  const [arOpen, setArOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-rose-50 via-white to-green-50 p-6">
      <div className="w-full max-w-2xl space-y-8 rounded-3xl border-2 border-red-200 bg-white/90 p-8 shadow-2xl">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-rose-400">
            AR Camera Demo
          </p>
          <h1 className="mt-2 text-4xl font-bold text-zinc-900">
            ARカメラデモ
          </h1>
          <p className="mt-4 text-zinc-600">
            ARカメラ機能のデモページです。下のボタンをクリックしてARカメラを起動できます。
          </p>
        </div>

        <div className="space-y-4 rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-6">
          <h2 className="text-lg font-semibold text-zinc-900">機能</h2>
          <ul className="space-y-2 text-sm text-zinc-600">
            <li>✅ リアルタイムカメラアクセス（バックカメラ優先）</li>
            <li>✅ 3Dキャラクター表示（GLB/GLTF対応）</li>
            <li>✅ 写真撮影と保存機能</li>
            <li>✅ プレビューとリテイク機能</li>
            <li>✅ WebXR AR対応</li>
          </ul>
        </div>

        <div className="space-y-4 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-6">
          <h2 className="text-lg font-semibold text-zinc-900">注意事項</h2>
          <ul className="space-y-2 text-sm text-zinc-600">
            <li>📷 カメラへのアクセス許可が必要です</li>
            <li>🌐 HTTPSまたはlocalhostでのみ動作します</li>
            <li>📱 モバイルデバイスで最適な体験が得られます</li>
            <li>🎨 3Dモデルファイルがない場合はフォールバックキャラクターが表示されます</li>
          </ul>
        </div>

        <button
          type="button"
          onClick={() => setArOpen(true)}
          className="flex w-full items-center justify-center gap-3 rounded-full bg-gradient-to-r from-red-600 to-rose-600 px-8 py-4 text-lg font-semibold text-white shadow-xl shadow-red-300 transition hover:from-red-700 hover:to-rose-700"
        >
          <span className="text-2xl">📸</span>
          ARカメラを起動
        </button>

        <div className="pt-4 text-center">
          <a
            href="/game"
            className="text-sm text-zinc-500 underline decoration-dotted hover:text-zinc-700"
          >
            ← ゲームページに戻る
          </a>
        </div>
      </div>

      <ArCamera open={arOpen} onClose={() => setArOpen(false)} />
    </div>
  );
}
