import type { ReactNode } from 'react';
import { pageActor } from '@/features/interactive-activities/ohmward/server/page-access';
import '@/features/interactive-activities/ohmward/components/ohmward.css';

export default async function Layout({ children, params }: { children: ReactNode; params: Promise<{ institute: string }> }) {
  await pageActor((await params).institute);
  return <div className="ohmward">{children}</div>;
}
