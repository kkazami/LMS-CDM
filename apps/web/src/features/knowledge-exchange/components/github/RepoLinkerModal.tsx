'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { GitBranch, X, Lock, Users, EyeOff, Loader2, Link2 } from 'lucide-react';

interface RepoLinkerModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId?: string;
  onLinked?: (repoLink: any) => void;
}

function parseGithubUrl(input: string): {
  owner?: string;
  repo?: string;
  branch?: string;
  filePath?: string;
  lineStart?: string;
  lineEnd?: string;
} | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Pattern 1: Full GitHub URL with optional /blob/:branch/:filePath#L10-L20
  const urlPattern =
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/#?]+)(?:\/(?:blob|tree)\/([^/#?]+)\/(.*?))?(?:#L(\d+)(?:-L(\d+))?)?$/i;
  const match = trimmed.match(urlPattern);

  if (match) {
    const [, parsedOwner, rawRepo, parsedBranch, parsedFilePath, startLine, endLine] = match;
    const cleanRepo = rawRepo.replace(/\.git$/i, '');
    return {
      owner: parsedOwner,
      repo: cleanRepo,
      branch: parsedBranch || undefined,
      filePath: parsedFilePath ? decodeURIComponent(parsedFilePath) : undefined,
      lineStart: startLine || undefined,
      lineEnd: endLine || (startLine ? startLine : undefined),
    };
  }

  // Pattern 2: owner/repo shorthand (e.g. "facebook/react")
  const shortPattern = /^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/;
  const shortMatch = trimmed.match(shortPattern);
  if (shortMatch) {
    return {
      owner: shortMatch[1],
      repo: shortMatch[2].replace(/\.git$/i, ''),
    };
  }

  return null;
}

export function RepoLinkerModal({ isOpen, onClose, postId, onLinked }: RepoLinkerModalProps) {
  const [mounted, setMounted] = useState(false);
  const [quickUrl, setQuickUrl] = useState('');
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [branch, setBranch] = useState('main');
  const [filePath, setFilePath] = useState('');
  const [lineStart, setLineStart] = useState<string>('');
  const [lineEnd, setLineEnd] = useState<string>('');
  const [visibility, setVisibility] = useState<'cohort' | 'instructor_only' | 'anonymous'>('cohort');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const applyParsed = (parsed: ReturnType<typeof parseGithubUrl>) => {
    if (!parsed) return;
    if (parsed.owner) setOwner(parsed.owner);
    if (parsed.repo) setRepo(parsed.repo);
    if (parsed.branch) setBranch(parsed.branch);
    if (parsed.filePath) setFilePath(parsed.filePath);
    if (parsed.lineStart) setLineStart(parsed.lineStart);
    if (parsed.lineEnd) setLineEnd(parsed.lineEnd);
    setError(null);
  };

  const handleQuickUrlChange = (val: string) => {
    setQuickUrl(val);
    const parsed = parseGithubUrl(val);
    if (parsed) {
      applyParsed(parsed);
    }
  };

  const handleOwnerChange = (val: string) => {
    const parsed = parseGithubUrl(val);
    if (parsed && parsed.owner && parsed.repo) {
      applyParsed(parsed);
    } else {
      setOwner(val);
    }
  };

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const cleanOwner = owner.trim().replace(/^https?:\/\/(?:www\.)?github\.com\//i, '').split('/')[0].trim();
    const cleanRepo = repo.trim().replace(/\.git$/i, '').trim();

    if (!cleanOwner || !cleanRepo) {
      setError('Repository owner and name are required.');
      return;
    }

    let parsedStart: number | undefined;
    let parsedEnd: number | undefined;

    if (lineStart.trim()) {
      const s = parseInt(lineStart.trim(), 10);
      if (isNaN(s) || s <= 0) {
        setError('Line start must be a positive integer.');
        return;
      }
      parsedStart = s;
    }

    if (lineEnd.trim()) {
      const e = parseInt(lineEnd.trim(), 10);
      if (isNaN(e) || e <= 0) {
        setError('Line end must be a positive integer.');
        return;
      }
      parsedEnd = e;
    }

    if (parsedStart && parsedEnd && parsedStart > parsedEnd) {
      setError('Line start cannot be greater than line end.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        owner: cleanOwner,
        repo: cleanRepo,
        branch: branch.trim() || 'main',
        visibility,
      };

      if (postId) payload.postId = postId;
      if (filePath.trim()) payload.filePath = filePath.trim().replace(/^\/+/, '');
      if (parsedStart) payload.lineStart = parsedStart;
      if (parsedEnd) payload.lineEnd = parsedEnd;

      if (!postId) {
        if (onLinked) onLinked(payload as any);
        onClose();
        return;
      }

      const res = await fetch('/api/github/repos/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to link repository.');
      }

      const newLink = await res.json();
      if (onLinked) onLinked(newLink);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to link repository.');
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-orange-500" />
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Attach GitHub Repository</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded-md cursor-pointer"
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

          {/* Quick Paste Field */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Quick Paste URL or owner/repo (optional)
            </label>
            <div className="relative">
              <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
              <input
                type="text"
                placeholder="https://github.com/facebook/react or facebook/react"
                value={quickUrl}
                onChange={(e) => handleQuickUrlChange(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:outline-hidden focus:ring-2 focus:ring-orange-500 text-neutral-900 dark:text-neutral-100"
              />
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
              Supports full repo links, file paths, and line anchors (e.g. #L10-L20)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Owner / Org *
              </label>
              <input
                type="text"
                placeholder="e.g. facebook"
                value={owner}
                onChange={(e) => handleOwnerChange(e.target.value)}
                required
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:outline-hidden focus:ring-2 focus:ring-orange-500 text-neutral-900 dark:text-neutral-100"
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
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:outline-hidden focus:ring-2 focus:ring-orange-500 text-neutral-900 dark:text-neutral-100"
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
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:outline-hidden focus:ring-2 focus:ring-orange-500 text-neutral-900 dark:text-neutral-100"
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
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:outline-hidden focus:ring-2 focus:ring-orange-500 text-neutral-900 dark:text-neutral-100"
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
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:outline-hidden focus:ring-2 focus:ring-orange-500 text-neutral-900 dark:text-neutral-100"
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
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:outline-hidden focus:ring-2 focus:ring-orange-500 text-neutral-900 dark:text-neutral-100"
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

  return createPortal(modalContent, document.body);
}
