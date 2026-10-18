"use client";

import Modal from "@/components/common/Modal";
import UserAvatar from "@/components/common/UserAvatar";
import LevelBadge from "@/components/common/LevelBadge";
import { Flame, Trophy, Sparkles } from "lucide-react";

interface StudentProfileModalProps {
  open: boolean;
  onClose: () => void;
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
  primaryColor: string;
}

export default function StudentProfileModal({
  open,
  onClose,
  name,
  avatarUrl,
  department,
  exp,
  level,
  levelTier,
  streak,
  badgeCount,
  isSelf,
  isAnonymized,
  primaryColor,
}: StudentProfileModalProps) {
  // Don't show modal content for anonymized students (unless it's the current user)
  const showReal = !isAnonymized || isSelf;

  return (
    <Modal open={open} onClose={onClose} title={showReal ? name : "Private Profile"}>
      <div className="flex flex-col items-center text-center space-y-4 py-2">
        <UserAvatar
          name={showReal ? name : "?"}
          avatarUrl={showReal ? avatarUrl : null}
          size="lg"
          color={primaryColor}
        />

        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-[#F0F2F8]">
            {showReal ? name : "This student is private"}
            {isSelf && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded-md bg-orange-500/15 text-orange-600 dark:text-orange-400 font-bold">
                You
              </span>
            )}
          </h3>
          {showReal && department && (
            <p className="text-xs text-slate-500 dark:text-[#8B92A5] mt-0.5">{department}</p>
          )}
        </div>

        {showReal ? (
          <>
            <div className="flex items-center gap-2">
              <LevelBadge exp={exp} size="md" />
            </div>

            <div className="grid grid-cols-3 gap-4 w-full max-w-xs pt-2">
              <div className="rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 p-3">
                <Sparkles className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                <div className="text-sm font-black font-mono text-slate-900 dark:text-[#F0F2F8]">
                  {exp.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">EXP</div>
              </div>
              <div className="rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 p-3">
                <Flame className="w-4 h-4 text-orange-500 mx-auto mb-1" />
                <div className="text-sm font-black font-mono text-slate-900 dark:text-[#F0F2F8]">
                  {streak}d
                </div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">Streak</div>
              </div>
              <div className="rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 p-3">
                <Trophy className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                <div className="text-sm font-black font-mono text-slate-900 dark:text-[#F0F2F8]">
                  {badgeCount}
                </div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">Badges</div>
              </div>
            </div>
          </>
        ) : (
          <p className="text-xs text-slate-400 dark:text-[#555C72] max-w-[240px]">
            This student has their profile set to private. Their identity is hidden on leaderboards.
          </p>
        )}
      </div>
    </Modal>
  );
}
