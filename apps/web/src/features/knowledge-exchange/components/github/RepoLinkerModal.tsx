'use client';

import React, { useState } from 'react';
import { GitBranch, X, Lock, Users, EyeOff, Loader2 } from 'lucide-react';

interface RepoLinkerModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId?: string;
  onLinked?: (repoLink: any) => void;
}

export function RepoLinkerModal({ isOpen, onClose, postId, onLinked }: RepoLinkerModalProps) {
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [branch, setBranch] = useState('main');
  const [filePath, setFilePath] = useState('');
  const [lineStart, setLineStart] = useState<string>('');
  const [lineEnd, setLineEnd] = useState<string>('');
  const [visibility, setVisibility] = useState<'cohort' | 'instructor_only' | 'anonymous'>('cohort');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!owner.trim() || !repo.trim()) {
      setError('Repository owner and name are required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        owner: owner.trim(),
        repo: repo.trim(),
        branch: branch.trim() || 'main',
        visibility,
      };

      if (postId) payload.postId = postId;
      if (filePath.trim()) payload.filePath = filePath.trim();
      if (lineStart) payload.lineStart = parseInt(lineStart, 10);
      if (lineEnd) payload.lineEnd = parseInt(lineEnd, 10);

      const res = await fetch('/api/github/repos/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to link repository.');
      }

      const newLink = await res.json();
      if (onLinked) onLinked(newLink);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-orange-500" />
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Attach GitHub Repository</h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded-md"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 rounded-lg border border-rose-200 dark:border-rose-900">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Owner / Org *
              </label>
              <input
                type="text"
                placeholder="e.g. facebook"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                required
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Repository Name *
              </label>
              <input
                type="text"
                placeholder="e.g. react"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                required
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Branch
              </label>
              <input
                type="text"
                placeholder="main"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Line Start
              </label>
              <input
                type="number"
                placeholder="1"
                min="1"
                value={lineStart}
                onChange={(e) => setLineStart(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Line End
              </label>
              <input
                type="number"
                placeholder="50"
                min="1"
                value={lineEnd}
                onChange={(e) => setLineEnd(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              File Path (Optional)
            </label>
            <input
              type="text"
              placeholder="src/index.ts"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Visibility Controls */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Visibility Controls
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setVisibility('cohort')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                  visibility === 'cohort'
                    ? 'border-orange-500 bg-orange-50 text-orange-900 dark:bg-orange-950/30 dark:text-orange-300 font-semibold'
                    : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                }`}
              >
                <Users className="w-4 h-4 mb-1 text-orange-500" />
                <span>Cohort</span>
              </button>
              <button
                type="button"
                onClick={() => setVisibility('instructor_only')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                  visibility === 'instructor_only'
                    ? 'border-orange-500 bg-orange-50 text-orange-900 dark:bg-orange-950/30 dark:text-orange-300 font-semibold'
                    : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                }`}
              >
                <Lock className="w-4 h-4 mb-1 text-amber-500" />
                <span>Instructor Only</span>
              </button>
              <button
                type="button"
                onClick={() => setVisibility('anonymous')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                  visibility === 'anonymous'
                    ? 'border-orange-500 bg-orange-50 text-orange-900 dark:bg-orange-950/30 dark:text-orange-300 font-semibold'
                    : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                }`}
              >
                <EyeOff className="w-4 h-4 mb-1 text-purple-500" />
                <span>Anonymous</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-orange-600 hover:bg-orange-500 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Link Repository</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
