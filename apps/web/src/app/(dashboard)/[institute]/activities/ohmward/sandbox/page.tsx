import { notFound } from 'next/navigation';
import { pageActor } from '@/features/interactive-activities/ohmward/server/page-access';
import { Banner } from '@/features/interactive-activities/ohmward/components/Shared';
import { Sandbox } from '@/features/interactive-activities/ohmward/components/Sandbox';
export default async function Page({params}:{params:Promise<{institute:string}>}){
  const actor=await pageActor((await params).institute);if(actor.role!=='STUDENT')notFound();
  return <><Banner/><Sandbox/></>;
}
