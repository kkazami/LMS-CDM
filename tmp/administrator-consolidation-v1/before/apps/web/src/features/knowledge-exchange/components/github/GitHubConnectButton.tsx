'use client';

import React, { useEffect, useState } from 'react';
import { GitBranch, Unlink, Loader2, CheckCircle2 } from 'lucide-react';

interface GitHubStatus {
  connected: boolean;
  username?: string | null;
  avatarUrl?: string | null;
  scope?: string;
  connectedAt?: string;
}

export function GitHubConnectButton() {
  const [status, setStatus] = useState<GitHubStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch('/api/github/auth/status');
        if (res.ok) {
          const data = await res.json();
          setStatus(data);
        }
      } catch (err) {
        console.error('Failed to check GitHub status:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, []);

  const handleConnect = () => {
    window.location.href = '/api/github/auth/connect';
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your GitHub account?')) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/github/auth/disconnect', { method: 'DELETE' });
      if (res.ok) {
        setStatus({ connected: false });
      }
    } catch (err) {
      console.error('Failed to disconnect GitHub:', err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 text-xs text-neutral-400 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>Checking GitHub link...</span>
      </div>
    );
  }

  if (status?.connected) {
    return (
      <div className="inline-flex items-center gap-3 p-1.5 pr-3 bg-neutral-900 text-white rounded-lg text-xs shadow-sm">
        {status.avatarUrl ? (
          <img
            src={status.avatarUrl}
            alt={status.username || 'GitHub'}
            className="w-6 h-6 rounded-full border border-neutral-700 object-cover"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-neutral-700 flex items-center justify-center font-bold">
            GH
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-medium text-neutral-200">@{status.username || 'connected'}</span>
        </div>
        <button
          onClick={handleDisconnect}
          disabled={actionLoading}
          className="ml-2 text-neutral-400 hover:text-rose-400 p-1 rounded hover:bg-neutral-800 transition-colors"
          title="Disconnect GitHub account"
          aria-label="Disconnect GitHub account"
        >
          {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5" />}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-medium transition-colors shadow-sm cursor-pointer"
    >
      <GitBranch className="w-4 h-4 text-orange-400" />
      <span>Connect GitHub</span>
    </button>
  );
}
