'use client';

import React from 'react';
import { CheckCircle2, XCircle, Clock, Ban, ExternalLink } from 'lucide-react';

export interface CIResultProps {
  status: string; // 'success' | 'failure' | 'pending' | 'cancelled'
  conclusion?: string | null;
  workflowName?: string | null;
  runUrl?: string | null;
}

export function CIStatusBadge({ status, conclusion, workflowName, runUrl }: CIResultProps) {
  const isSuccess = status === 'success' || conclusion === 'success';
  const isFailure = status === 'failure' || conclusion === 'failure';
  const isPending = status === 'pending' || !conclusion;

  let badgeColor = 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-300';
  let Icon = Ban;
  let label = 'CI: Not Run';

  if (isSuccess) {
    badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
    Icon = CheckCircle2;
    label = 'CI: Passed';
  } else if (isFailure) {
    badgeColor = 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
    Icon = XCircle;
    label = 'CI: Failed';
  } else if (isPending) {
    badgeColor = 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
    Icon = Clock;
    label = 'CI: Running';
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${badgeColor}`}
      title={workflowName ? `Workflow: ${workflowName}` : label}
    >
      <Icon className={`w-3.5 h-3.5 ${isPending ? 'animate-spin' : ''}`} />
      <span>{label}</span>
      {runUrl && (
        <a
          href={runUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-1 hover:opacity-80 transition-opacity"
          aria-label="View CI run on GitHub"
        >
          <ExternalLink className="w-3 h-3 inline" />
        </a>
      )}
    </div>
  );
}
