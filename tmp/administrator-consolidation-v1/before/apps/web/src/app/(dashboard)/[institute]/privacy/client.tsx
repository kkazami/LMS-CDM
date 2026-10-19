"use client";

import { useState } from "react";
import { KeyRound, Smartphone, Monitor, Shield, LogOut, Loader2 } from "lucide-react";
import ChangePasswordModal from "@/components/common/ChangePasswordModal";
import { useRouter } from "next/navigation";

interface SessionInfo {
  id: string;
  createdAt: string;
  expiresAt: string;
}

interface PrivacyClientProps {
  sessions: SessionInfo[];
  currentSessionId: string;
}

export default function PrivacyClient({ sessions, currentSessionId }: PrivacyClientProps) {
  const router = useRouter();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingId(sessionId);
    try {
      const res = await fetch(`/api/auth/sessions?id=${sessionId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.refresh();
      } else {
        alert("Failed to revoke session. Please try again.");
      }
    } catch (err) {
      alert("An error occurred while revoking the session.");
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Account Security */}
      <section className="rounded-3xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] shadow-sm overflow-hidden">
        <div className="border-b border-slate-200/80 dark:border-white/5 bg-slate-50 dark:bg-[#181B26] px-6 py-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-[#F0F2F8]">
            <Shield className="h-5 w-5 text-slate-400" />
            Account Security
          </h2>
        </div>
        
        <div className="p-6 space-y-8">
          {/* Password Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-8">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-bold text-slate-900 dark:text-[#F0F2F8] flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-slate-400" />
                Password
              </span>
              <p className="text-sm text-slate-500 dark:text-[#8B92A5] max-w-md">
                Ensure your account is using a long, random password to stay secure. It's recommended to change your password every 6 months.
              </p>
            </div>
            <button
              onClick={() => setIsPasswordModalOpen(true)}
              className="shrink-0 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-white font-semibold rounded-xl text-sm transition-colors"
            >
              Change Password
            </button>
          </div>

          {/* Active Sessions Section */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1 mb-2">
              <span className="text-sm font-bold text-slate-900 dark:text-[#F0F2F8] flex items-center gap-2">
                <Monitor className="w-4 h-4 text-slate-400" />
                Active Sessions
              </span>
              <p className="text-sm text-slate-500 dark:text-[#8B92A5] max-w-md">
                These are devices that have logged into your account. Revoke any sessions that you do not recognize.
              </p>
            </div>

            <div className="grid gap-3">
              {sessions.map((session) => {
                const isCurrent = session.id === currentSessionId;
                const createdDate = new Date(session.createdAt);
                
                return (
                  <div 
                    key={session.id} 
                    className="flex items-center justify-between p-4 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-[#181B26]/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-white dark:bg-[#1E2132] rounded-xl shadow-sm border border-slate-100 dark:border-white/5">
                        <Monitor className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          Web Browser
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] uppercase tracking-wider font-bold">
                              Current
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Started on {createdDate.toLocaleDateString()} at {createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {!isCurrent && (
                      <button
                        onClick={() => handleRevokeSession(session.id)}
                        disabled={revokingId === session.id}
                        className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                        title="Revoke session"
                      >
                        {revokingId === session.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <LogOut className="w-5 h-5" />
                        )}
                      </button>
                    )}
                  </div>
                );
              })}

              {sessions.length === 0 && (
                <div className="p-4 text-center text-sm text-slate-500">
                  No active sessions found.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <ChangePasswordModal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)} 
      />
    </div>
  );
}
