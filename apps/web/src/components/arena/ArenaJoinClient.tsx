"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Gamepad2, ArrowRight, AlertCircle, Loader2 } from "lucide-react";

interface ArenaJoinClientProps {
  instituteCode: string;
  defaultNickname: string;
}

export default function ArenaJoinClient({ instituteCode, defaultNickname }: ArenaJoinClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPin = searchParams.get("pin") || "";

  const [pin, setPin] = useState(initialPin);
  const [nickname, setNickname] = useState(defaultNickname);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!pin.trim()) {
      setErrorMessage("Please enter a 6-digit game PIN.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/arena/sessions/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin: pin.trim(),
          nickname: nickname.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to join game.");
      }

      router.push(`/${instituteCode}/arena/play/${data.sessionId}`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Could not join game.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-[#12151F] border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
          <Gamepad2 className="w-8 h-8" />
        </div>

        <div>
          <span className="text-xs font-black uppercase tracking-wider text-amber-500">
            IBE Quiz Arena
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
            Enter Game PIN
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Join your live classroom quiz and compete on the leaderboard!
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2 text-left animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4 text-left">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              6-Digit Game PIN
            </label>
            <input
              type="text"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              className="w-full text-center text-3xl font-mono font-black tracking-widest p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#181B26] text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-600 focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Your Nickname / Player Name
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Nickname..."
              maxLength={24}
              className="w-full p-3.5 text-sm font-bold rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#181B26] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !pin.trim()}
            className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-base flex items-center justify-center gap-2 transition transform hover:scale-[1.01] active:scale-[0.99] shadow-xl shadow-amber-500/20 disabled:opacity-40 disabled:pointer-events-none"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>Enter Game</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
