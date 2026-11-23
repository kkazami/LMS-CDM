export default function DeckProgress({ total, mastered }: { total: number; mastered: number }) {
  const progress = total > 0 ? Math.min(100, Math.round((mastered / total) * 100)) : 0;

  return (
    <div className="min-w-0 space-y-2">
      <div className="flex items-baseline justify-between gap-2 text-xs text-secondary-theme">
        <span>{mastered} of {total} mastered</span>
        <span className="font-semibold tabular-nums text-primary-theme">{progress}%</span>
      </div>
      <div
        role="progressbar"
        aria-label="Cards mastered"
        aria-valuenow={progress}
        aria-valuetext={`${mastered} of ${total} cards mastered`}
        className="h-1.5 overflow-hidden rounded-full bg-(--border-color)"
      >
        <div className="h-full rounded-full bg-(--action-bg)" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
