'use client';

import { useEffect, useRef, useState } from 'react';

type ArCameraProps = {
  open: boolean;
  onClose: () => void;
  modelUrl?: string;
};

export default function ArCamera({ open, onClose, modelUrl = '/models/santa.glb' }: ArCameraProps) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const modelViewerRef = useRef<HTMLElement & { addEventListener?: (event: string, handler: () => void) => void }>(null);

  useEffect(() => {
    if (!open) {
      // Clean up camera stream when closing
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setCapturedImage(null);
      setCameraError(null);
      return;
    }

    // Request camera access
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment', // Use back camera on mobile
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        });
        
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraError(null);
      } catch (error) {
        console.error('Camera access error:', error);
        setCameraError('カメラへのアクセスが拒否されました。ブラウザの設定でカメラの許可を有効にしてください。');
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [open]);

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsCapturing(true);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 1920;
      canvas.height = video.videoHeight || 1080;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to image
      const imageUrl = canvas.toDataURL('image/png');
      setCapturedImage(imageUrl);
    } catch (error) {
      console.error('Capture error:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleDownload = () => {
    if (!capturedImage) return;

    const link = document.createElement('a');
    link.download = `santa-ar-${Date.now()}.png`;
    link.href = capturedImage;
    link.click();
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black">
      {capturedImage ? (
        // Photo preview mode
        <div className="relative h-full w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={capturedImage} alt="Captured AR photo" className="h-full w-full object-contain" />
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-4 bg-gradient-to-t from-black/80 to-transparent p-6">
            <button
              type="button"
              onClick={handleRetake}
              className="rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              もう一度撮る
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="rounded-full bg-rose-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-500/50 transition hover:bg-rose-600"
            >
              📥 写真を保存
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full border border-white/30 bg-black/50 px-5 py-2 text-xs font-semibold tracking-[0.3em] text-white backdrop-blur-sm transition hover:bg-white/10"
          >
            CLOSE
          </button>
        </div>
      ) : (
        // Camera mode
        <div className="relative h-full w-full">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />
          
          {/* AR Model Overlay - using model-viewer for WebXR AR */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <model-viewer
              ref={modelViewerRef}
              src={modelUrl}
              alt="AR Character"
              ar
              ar-modes="webxr scene-viewer quick-look"
              camera-controls
              shadow-intensity="1"
              style={{
                width: '100%',
                height: '100%',
                pointerEvents: 'auto'
              }}
              className="pointer-events-auto"
              onLoad={() => setModelLoaded(true)}
              onError={() => setModelLoaded(false)}
            />
            {!modelLoaded && (
              <div className="absolute left-1/2 top-1/2 h-32 w-24 -translate-x-1/2 -translate-y-1/2 rounded-[45%] bg-gradient-to-b from-rose-200 to-rose-500 shadow-[0_10px_30px_rgba(244,114,182,0.5)]">
                <div className="absolute left-1/2 top-6 flex -translate-x-1/2 gap-4">
                  <span className="h-3 w-3 rounded-full bg-white shadow-inner shadow-rose-400" />
                  <span className="h-3 w-3 rounded-full bg-white shadow-inner shadow-rose-400" />
                </div>
                <div className="absolute left-1/2 top-14 -translate-x-1/2 text-2xl text-white">^_^</div>
                <div className="absolute inset-x-6 bottom-4 text-center text-xs text-white/90">ピコモモ</div>
              </div>
            )}
          </div>

          {cameraError && (
            <div className="absolute inset-x-4 top-4 rounded-2xl border border-rose-200 bg-rose-50/95 p-4 text-sm text-rose-700 backdrop-blur-sm">
              {cameraError}
            </div>
          )}

          {/* Camera controls */}
          <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-4 bg-gradient-to-t from-black/80 to-transparent p-6 pb-10">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleCapture}
                disabled={isCapturing || !!cameraError}
                className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-rose-500 shadow-lg shadow-rose-500/50 transition hover:bg-rose-600 disabled:opacity-50"
              >
                {isCapturing ? (
                  <span className="text-xs text-white">...</span>
                ) : (
                  <span className="text-2xl">📸</span>
                )}
              </button>
            </div>
            <p className="text-center text-xs text-white/80">
              端末を動かしてキャラクターの位置を調整し、シャッターボタンで撮影できます
            </p>
          </div>

          {/* AR Mode indicator */}
          <div className="absolute left-4 top-4 flex flex-col gap-2">
            <span className="rounded-full bg-black/50 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white backdrop-blur-sm">
              📷 AR Camera
            </span>
            <span className="rounded-full bg-emerald-500/90 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm">
              ● LIVE
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
