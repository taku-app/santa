'use client';

type Props = {
  open: boolean;
  onClose: () => void;
  isUnlocked: boolean;
  distanceMeters?: number;
  achievement?: {
    title: string;
    spot: string;
    description: string;
  };
};

export default function AchievementModal({ open, onClose, isUnlocked, distanceMeters, achievement }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500 transition hover:bg-zinc-50"
        >
          CLOSE
        </button>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-400">
          {achievement?.spot ?? "Achievement"}
        </p>
        <h2 className="mt-2 text-2xl font-bold text-zinc-900">
          {isUnlocked
            ? `${achievement?.title ?? "実績"}を解除しました！`
            : `${achievement?.title ?? "実績"}まであと少し`}
        </h2>
        <p className="mt-3 text-sm text-zinc-600">
          {isUnlocked
            ? achievement?.description ?? "スポットに到達しました。"
            : `${achievement?.spot ?? "スポット"}に近づいて100m圏内でチェックインしましょう。`}
        </p>
        {typeof distanceMeters === "number" && (
          <p className="mt-4 text-xs uppercase tracking-[0.4em] text-zinc-500">
            距離推定: {Math.round(distanceMeters)}m
          </p>
        )}
        {isUnlocked && (
          <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">
            次のスポット解放へ進みましょう。ARカメラ画面からサンタが近づいてきます！
          </div>
        )}
      </div>
    </div>
  );
}
