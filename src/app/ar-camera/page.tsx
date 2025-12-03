'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSupabaseSession } from '@/hooks/use-supabase-session';

// Extend HTMLElement for model-viewer custom element
interface ModelViewerElement extends HTMLElement {
  toBlob(options?: { idealAspect?: boolean }): Promise<Blob>;
  activateAR(): void;
}

export default function ARCameraPage() {
  const modelViewerRef = useRef<ModelViewerElement | null>(null);
  const [isARSupported, setIsARSupported] = useState<boolean | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showCaptured, setShowCaptured] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { session } = useSupabaseSession();

  useEffect(() => {
    // Load model-viewer script
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js';
    document.head.appendChild(script);

    return () => {
      if (script.parentNode === document.head) {
        document.head.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    // Check AR support
    const checkARSupport = async () => {
      if ('xr' in navigator) {
        try {
          const xr = (navigator as { xr?: { isSessionSupported?: (mode: string) => Promise<boolean> } }).xr;
          if (xr && typeof xr.isSessionSupported === 'function') {
            const supported = await xr.isSessionSupported('immersive-ar');
            setIsARSupported(supported);
          } else {
            setIsARSupported(false);
          }
        } catch {
          setIsARSupported(false);
        }
      } else {
        setIsARSupported(false);
      }
    };
    checkARSupport();
  }, []);

  const handleCapture = async () => {
    if (!modelViewerRef.current) return;
    
    setErrorMessage(null);
    try {
      // Get screenshot from model-viewer
      const modelViewer = modelViewerRef.current;
      const blob = await modelViewer.toBlob({ idealAspect: true });
      const url = URL.createObjectURL(blob);
      setCapturedImage(url);
      setShowCaptured(true);
    } catch (error) {
      console.error('Failed to capture image:', error);
      setErrorMessage('写真の撮影に失敗しました。モデルの読み込みが完了してから再度お試しください。');
    }
  };

  const handleDownload = () => {
    if (!capturedImage) return;
    const link = document.createElement('a');
    link.href = capturedImage;
    link.download = `santa-ar-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 via-green-50 to-red-50 text-zinc-900">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="animate-snow absolute text-4xl opacity-60">❄️</div>
        <div className="animate-snow-delay-1 absolute left-1/4 text-3xl opacity-50">⭐</div>
        <div className="animate-snow-delay-2 absolute left-1/2 text-5xl opacity-40">❄️</div>
      </div>

      {showCaptured && capturedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setShowCaptured(false)}
              className="absolute right-4 top-4 rounded-full border border-zinc-200 p-2 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500 transition hover:bg-zinc-50"
              aria-label="閉じる"
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold text-zinc-900">📸 撮影完了！</h2>
            <p className="mt-2 text-sm text-zinc-600">
              ARカメラで撮影した写真です。ダウンロードして保存できます。
            </p>
            <div className="mt-4 overflow-hidden rounded-2xl border-2 border-rose-200">
              <Image
                src={capturedImage}
                alt="Captured AR scene"
                width={800}
                height={600}
                className="w-full"
                unoptimized
              />
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleDownload}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-rose-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-200 transition hover:bg-rose-600"
              >
                <span className="text-lg">💾</span>
                ダウンロード
              </button>
              <button
                type="button"
                onClick={() => setShowCaptured(false)}
                className="flex flex-1 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-6 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
              >
                戻る
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl px-6 py-8 sm:px-10">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-red-500">
              <span className="text-lg">📸</span> AR Camera
            </p>
            <h1 className="mt-2 text-3xl font-bold text-zinc-900">
              🎅 ARカメラ体験
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              3Dモデルと一緒に写真を撮影しましょう！
            </p>
          </div>
          <Link
            href="/game"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 px-6 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
          >
            <span className="text-lg">🏠</span>
            ゲームに戻る
          </Link>
        </header>

        {!session && (
          <div className="mb-6 rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="flex items-center gap-2 font-semibold">
              <span className="text-lg">⚠️</span>
              ログインしていません
            </p>
            <p className="mt-1">
              ARカメラを使用するには、トップページからログインしてください。
            </p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="rounded-3xl border-2 border-rose-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xl font-bold text-zinc-900">
                <span className="text-2xl">🎄</span>
                3Dモデルビューア
              </h2>
              {isARSupported !== null && (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    isARSupported
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {isARSupported ? '✓ AR対応' : 'AR非対応'}
                </span>
              )}
            </div>

            <div className="relative overflow-hidden rounded-2xl border-2 border-rose-100 bg-gradient-to-b from-rose-50 to-white">
              <div
                ref={(el) => {
                  if (el && !modelViewerRef.current) {
                    const mv = document.createElement('model-viewer') as ModelViewerElement;
                    mv.setAttribute('src', 'https://modelviewer.dev/shared-assets/models/Astronaut.glb');
                    mv.setAttribute('alt', 'Christmas 3D Model');
                    mv.setAttribute('ar', '');
                    mv.setAttribute('ar-modes', 'webxr scene-viewer quick-look');
                    mv.setAttribute('camera-controls', '');
                    mv.setAttribute('touch-action', 'pan-y');
                    mv.setAttribute('auto-rotate', '');
                    mv.setAttribute('shadow-intensity', '1');
                    mv.style.width = '100%';
                    mv.style.height = '500px';
                    mv.style.backgroundColor = 'transparent';
                    
                    const poster = document.createElement('div');
                    poster.setAttribute('slot', 'poster');
                    poster.style.width = '100%';
                    poster.style.height = '100%';
                    poster.style.display = 'flex';
                    poster.style.alignItems = 'center';
                    poster.style.justifyContent = 'center';
                    poster.style.background = 'linear-gradient(to bottom, #fecaca, #ffffff)';
                    poster.innerHTML = '<p style="color: #71717a;">🎄 Loading 3D model...</p>';
                    mv.appendChild(poster);
                    
                    el.appendChild(mv);
                    modelViewerRef.current = mv;
                  }
                }}
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleCapture}
                disabled={!session}
                className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-red-600 to-green-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-300 transition hover:from-red-700 hover:to-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="text-lg">📸</span>
                写真を撮る
              </button>

              {isARSupported && (
                <button
                  type="button"
                  onClick={() => {
                    const viewer = modelViewerRef.current;
                    if (viewer) {
                      viewer.activateAR();
                    }
                  }}
                  disabled={!session}
                  className="flex items-center justify-center gap-2 rounded-full border-2 border-rose-500 bg-white px-6 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="text-lg">🥽</span>
                  ARモードを起動
                </button>
              )}
            </div>

            {errorMessage && (
              <div className="mt-4 rounded-2xl border-2 border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                <p className="flex items-center gap-2 font-semibold">
                  <span className="text-lg">⚠️</span>
                  エラー
                </p>
                <p className="mt-1">{errorMessage}</p>
              </div>
            )}

            <p className="mt-4 text-xs text-zinc-500">
              💡 3Dモデルをドラッグして回転、ピンチで拡大・縮小できます。
              {isARSupported && 'ARモードでは実際の空間にモデルを配置できます。'}
            </p>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border-2 border-green-200 bg-white p-6 shadow-xl">
              <h3 className="flex items-center gap-2 text-lg font-bold text-zinc-900">
                <span className="text-xl">ℹ️</span>
                使い方
              </h3>
              <ol className="mt-4 space-y-3 text-sm text-zinc-600">
                <li className="flex gap-2">
                  <span className="font-semibold text-rose-500">1.</span>
                  <span>3Dモデルをドラッグして好きな角度に調整</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-rose-500">2.</span>
                  <span>「写真を撮る」ボタンで現在のビューを撮影</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-rose-500">3.</span>
                  <span>撮影した画像をダウンロードして保存</span>
                </li>
                {isARSupported && (
                  <li className="flex gap-2">
                    <span className="font-semibold text-rose-500">4.</span>
                    <span>ARモードで実際の空間に配置して撮影可能</span>
                  </li>
                )}
              </ol>
            </div>

            <div className="rounded-3xl border-2 border-amber-200 bg-amber-50 p-6 shadow-lg">
              <h3 className="flex items-center gap-2 text-lg font-bold text-amber-900">
                <span className="text-xl">🎨</span>
                使用ライブラリ
              </h3>
              <div className="mt-4 space-y-2 text-sm text-amber-800">
                <p>
                  <strong>@google/model-viewer</strong>
                </p>
                <p>
                  Google製のWeb Components ベースの3DモデルビューアーとARライブラリを使用しています。
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
                  <li>iOS: AR Quick Look (Safari)</li>
                  <li>Android: Scene Viewer (Chrome)</li>
                  <li>Desktop: WebXR対応ブラウザ</li>
                </ul>
              </div>
            </div>

            <div className="rounded-3xl border-2 border-blue-200 bg-blue-50 p-6 shadow-lg">
              <h3 className="flex items-center gap-2 text-lg font-bold text-blue-900">
                <span className="text-xl">🎁</span>
                モデルについて
              </h3>
              <p className="mt-3 text-sm text-blue-800">
                現在は宇宙飛行士のサンプルモデルを表示しています。
                <code className="mt-2 block rounded bg-blue-100 px-2 py-1 font-mono text-xs">
                  /public/santa.glb
                </code>
                に好きなGLB/GLTFモデルを配置すると、そのモデルを表示できます。
              </p>
              <p className="mt-3 text-xs text-blue-700">
                💡 無料の3Dモデルは
                <a
                  href="https://sketchfab.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline"
                >
                  Sketchfab
                </a>
                や
                <a
                  href="https://poly.pizza"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 font-semibold underline"
                >
                  Poly Pizza
                </a>
                から入手できます。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
