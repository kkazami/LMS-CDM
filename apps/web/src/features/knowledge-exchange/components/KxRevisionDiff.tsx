"use client";

import React, { useState } from "react";
import { History, ArrowLeft, ArrowRight, User } from "lucide-react";
import KxLatexRenderer from "./KxLatexRenderer";

export interface KxRevisionItem {
  id: string;
  postId: string;
  title: string;
  body: string;
  editSummary: string | null;
  createdAt: string;
  user?: {
    name: string | null;
    email: string | null;
  };
}

interface KxRevisionDiffProps {
  revisions: KxRevisionItem[];
  currentPost: {
    title: string;
    body: string;
    updatedAt: string;
  };
}

export function KxRevisionDiff({ revisions, currentPost }: KxRevisionDiffProps) {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  if (!revisions || revisions.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
        <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="font-medium">No previous revisions recorded</p>
        <p className="text-sm">This post has not been edited yet.</p>
      </div>
    );
  }

  const activeRevision = revisions[selectedIndex];

  return (
    <div className="space-y-6">
      {/* Revision selector bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          <span className="font-semibold text-sm">
            Revision {revisions.length - selectedIndex} of {revisions.length}
          </span>
          <span className="text-xs text-muted-foreground">
            ({new Date(activeRevision.createdAt).toLocaleString()})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedIndex((i) => Math.min(revisions.length - 1, i + 1))}
            disabled={selectedIndex >= revisions.length - 1}
            className="p-1.5 rounded-md border border-border text-xs font-medium hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            title="Older revision"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-muted-foreground font-mono">
            {selectedIndex + 1} / {revisions.length}
          </span>
          <button
            onClick={() => setSelectedIndex((i) => Math.max(0, i - 1))}
            disabled={selectedIndex <= 0}
            className="p-1.5 rounded-md border border-border text-xs font-medium hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            title="Newer revision"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {activeRevision.editSummary && (
        <div className="p-3 bg-muted/40 rounded-md border border-border/60 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Edit Summary:</span> {activeRevision.editSummary}
        </div>
      )}

      {/* Side-by-side or stacked view: Selected Revision vs Current */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3 rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between pb-3 border-b border-border text-xs font-medium text-muted-foreground">
            <span className="text-foreground font-semibold">Historic Revision</span>
            <span>{new Date(activeRevision.createdAt).toLocaleDateString()}</span>
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground mb-2">{activeRevision.title}</h3>
            <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90">
              <KxLatexRenderer content={activeRevision.body} />
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/[0.02] p-5">
          <div className="flex items-center justify-between pb-3 border-b border-border text-xs font-medium text-muted-foreground">
            <span className="text-primary font-semibold">Current Version</span>
            <span>{new Date(currentPost.updatedAt).toLocaleDateString()}</span>
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground mb-2">{currentPost.title}</h3>
            <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90">
              <KxLatexRenderer content={currentPost.body} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
