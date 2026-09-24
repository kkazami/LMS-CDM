'use client';

import React, { useEffect, useState } from 'react';
import { ExternalLink, MessageSquarePlus, Loader2, Code2, AlertTriangle } from 'lucide-react';
import { InlineCommentThread, InlineCommentItem } from './InlineCommentThread';

interface CodeViewerProps {
  owner: string;
  repo: string;
  filePath: string;
  refSha?: string;
  lineStart?: number;
  lineEnd?: number;
  repoLinkId?: string;
  currentUserId?: string;
}

export function CodeViewer({
  owner,
  repo,
  filePath,
  refSha,
  lineStart,
  lineEnd,
  repoLinkId,
  currentUserId,
}: CodeViewerProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<InlineCommentItem[]>([]);
  const [activeCommentLine, setActiveCommentLine] = useState<number | null>(null);

  // 1. Fetch file content
  useEffect(() => {
    async function loadContent() {
      setLoading(true);
      setError(null);
      try {
        const query = refSha ? `?ref=${refSha}` : '';
        const res = await fetch(`/api/github/repos/${owner}/${repo}/contents/${filePath}${query}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to load file contents from GitHub.');
        }
        const data = await res.json();
        setContent(data.content);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadContent();
  }, [owner, repo, filePath, refSha]);

  // 2. Fetch inline comments if repoLinkId is provided
  useEffect(() => {
    if (!repoLinkId) return;
    async function loadComments() {
      try {
        const res = await fetch(`/api/github/comments?repoLinkId=${repoLinkId}&filePath=${encodeURIComponent(filePath)}`);
        if (res.ok) {
          const data = await res.json();
          setComments(data);
        }
      } catch (err) {
        console.error('Failed to load inline comments:', err);
      }
    }
    loadComments();
  }, [repoLinkId, filePath]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-neutral-900 text-neutral-400 rounded-xl border border-neutral-800 text-xs">
        <Loader2 className="w-5 h-5 animate-spin mb-2 text-orange-500" />
        <span>Fetching {filePath} from GitHub...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 bg-rose-950/30 text-rose-300 rounded-xl border border-rose-900 text-xs">
        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  const allLines = content.split('\n');
  const displayLines = lineStart && lineEnd
    ? allLines.slice(lineStart - 1, lineEnd)
    : allLines;

  const startOffset = lineStart || 1;
  const githubUrl = `https://github.com/${owner}/${repo}/blob/${refSha || 'main'}/${filePath}`;

  const handleCommentAdded = (newComment: InlineCommentItem) => {
    setComments((prev) => [...prev, newComment]);
    setActiveCommentLine(null);
  };

  const handleCommentResolved = (commentId: string) => {
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, resolved: true } : c))
    );
  };

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-950 text-neutral-100 shadow-sm text-xs font-mono">
      {/* File Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-900 border-b border-neutral-800 text-neutral-300">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-orange-400" />
          <span className="font-medium text-neutral-100">{filePath}</span>
          {lineStart && lineEnd && (
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">
              Lines {lineStart}–{lineEnd}
            </span>
          )}
        </div>
        <a
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white transition-colors"
        >
          <span>View on GitHub</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Code Table */}
      <div className="overflow-x-auto py-2">
        <table className="w-full border-collapse">
          <tbody>
            {displayLines.map((line, idx) => {
              const lineNum = startOffset + idx;
              const isTargetRange = lineStart && lineEnd && lineNum >= lineStart && lineNum <= lineEnd;
              const lineComments = comments.filter((c) => c.lineNumber === lineNum);

              return (
                <React.Fragment key={lineNum}>
                  <tr
                    className={`group transition-colors ${
                      isTargetRange
                        ? 'bg-orange-950/20 hover:bg-orange-950/30'
                        : 'hover:bg-neutral-900/60'
                    }`}
                  >
                    {/* Line number + comment button */}
                    <td className="w-12 px-2 text-right select-none text-neutral-500 border-r border-neutral-800/60 relative">
                      <span className="group-hover:hidden">{lineNum}</span>
                      {repoLinkId && (
                        <button
                          onClick={() =>
                            setActiveCommentLine(
                              activeCommentLine === lineNum ? null : lineNum
                            )
                          }
                          className="hidden group-hover:flex items-center justify-center absolute inset-0 text-orange-400 hover:text-orange-300 transition-colors"
                          title={`Comment on line ${lineNum}`}
                          aria-label={`Comment on line ${lineNum}`}
                        >
                          <MessageSquarePlus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>

                    {/* Code Content */}
                    <td className="px-4 py-0.5 whitespace-pre font-mono text-neutral-200">
                      {line || ' '}
                    </td>
                  </tr>

                  {/* Render existing comments or active comment box */}
                  {(lineComments.length > 0 || activeCommentLine === lineNum) && (
                    <tr>
                      <td colSpan={2} className="px-4 py-1 bg-neutral-900/40">
                        {repoLinkId && (
                          <InlineCommentThread
                            repoLinkId={repoLinkId}
                            filePath={filePath}
                            lineNumber={lineNum}
                            comments={lineComments}
                            currentUserId={currentUserId}
                            onCommentAdded={handleCommentAdded}
                            onResolved={handleCommentResolved}
                          />
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
