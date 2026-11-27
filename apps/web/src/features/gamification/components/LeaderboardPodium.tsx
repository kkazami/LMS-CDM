"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChevronRight, Flame, Pause, Play, UserRound } from "lucide-react";
import styles from "./LeaderboardPodium.module.css";

export interface PodiumStudent {
  rank: number;
  studentId: string;
  name: string;
  avatarUrl: string | null;
  department: string;
  exp: number;
  level: number;
  levelTier: string;
  streak: number;
  badgeCount: number;
  isSelf: boolean;
  isAnonymized: boolean;
}

interface LeaderboardPodiumProps {
  top3: PodiumStudent[];
  onSelectStudent: (student: PodiumStudent, anchor: HTMLButtonElement) => void;
  profileOpen: boolean;
}

export default function LeaderboardPodium({ top3, onSelectStudent, profileOpen }: LeaderboardPodiumProps) {
  const listRef = useRef<HTMLOListElement>(null);
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    let inView = false;
    const sync = () => setVisible(inView && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      sync();
    });
    observer.observe(list);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  const ordered = [2, 1, 3].flatMap(rank => top3.filter(student => student.rank === rank));
  if (ordered.length === 0) return null;

  return (
    <section aria-labelledby="leaderboard-top-three">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="leaderboard-top-three" className="text-lg font-bold text-primary-theme">Top 3</h2>
        <button
          type="button"
          className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-secondary-theme hover:bg-elevated hover:text-primary-theme motion-reduce:hidden"
          onClick={() => setPaused(value => !value)}
        >
          {paused ? <Play aria-hidden="true" className="size-3.5" /> : <Pause aria-hidden="true" className="size-3.5" />}
          {paused ? "Play motion" : "Pause motion"}
        </button>
      </div>
      <ol ref={listRef} data-floating={visible && !paused && !profileOpen} className={styles.list}>
        {ordered.map(student => (
          <PodiumCard key={student.studentId} student={student} onSelectStudent={onSelectStudent} />
        ))}
      </ol>
    </section>
  );
}

function PodiumCard({ student, onSelectStudent }: { student: PodiumStudent; onSelectStudent: LeaderboardPodiumProps["onSelectStudent"] }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const photo = !student.isAnonymized && student.avatarUrl !== failedUrl ? student.avatarUrl : null;
  const portrait = photo ? (
    <Image
      src={photo}
      alt=""
      fill
      unoptimized
      referrerPolicy="no-referrer"
      sizes="(max-width: 639px) 48px, 88px"
      className="object-cover object-center saturate-[0.85] contrast-[1.03]"
      onError={() => setFailedUrl(photo)}
    />
  ) : <UserRound aria-hidden="true" className="size-[46%] text-secondary-theme" strokeWidth={1.5} />;
  const portraitFrame = (
    <>
      <span className={styles.portraitRim} aria-hidden="true" />
      <span className={styles.portraitFrame}>{portrait}</span>
    </>
  );

  return (
    <li value={student.rank} className={styles.card}>
      {student.isAnonymized ? (
        <div className={styles.portrait}>{portraitFrame}</div>
      ) : (
        <button
          type="button"
          aria-label={`View ${student.name}'s profile`}
          aria-haspopup="dialog"
          data-photo={photo ? "true" : undefined}
          onClick={event => onSelectStudent(student, event.currentTarget)}
          className={`${styles.portrait} group cursor-pointer`}
        >
          {portraitFrame}
          <span aria-hidden="true" className="absolute right-0 bottom-0 z-10 grid size-5 place-items-center rounded-full border border-theme bg-surface text-secondary-theme transition-colors group-hover:bg-(--action-bg) group-hover:text-(--action-ink) sm:size-6">
            <ChevronRight className="size-3.5" />
          </span>
        </button>
      )}
      <div className="mt-5 grid w-full min-w-0 justify-items-center gap-2 text-center text-primary-theme">
        <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1">
          <span className={styles.rank}>
            <span className="sr-only">Rank </span>
            <span aria-hidden="true">#</span>{student.rank}
          </span>
          {student.isSelf && <span className="text-xs font-semibold text-secondary-theme">You</span>}
        </div>
        <h3 className="line-clamp-3 w-full wrap-anywhere text-xs leading-[1.4] font-bold sm:text-base" title={student.name}>{student.name}</h3>
        <p className="w-full wrap-anywhere text-sm leading-snug font-bold tabular-nums sm:text-lg">{student.exp.toLocaleString()} EXP</p>
        <p className="hidden flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-xs text-secondary-theme sm:flex">
          <span className="inline-flex items-center gap-1"><Flame aria-hidden="true" className="size-3.5" />{student.streak}d streak</span>
          <span>{student.badgeCount} badges</span>
        </p>
      </div>
    </li>
  );
}
