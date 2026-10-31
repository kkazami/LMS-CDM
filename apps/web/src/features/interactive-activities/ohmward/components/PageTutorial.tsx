'use client';
import { usePathname } from 'next/navigation';
import { Tutorial } from './Tutorial';
import { SURFACE_GUIDES } from '../domain/guidance';
export function PageTutorial(){
  const pathname=usePathname(),root='/ics/activities/ohmward';
  const key=pathname===root?'journey':pathname===root+'/primer'?'primer':pathname===root+'/progress'?'progress':pathname.startsWith(root+'/instructor/students/')?'inspection':pathname===root+'/instructor'?'instructor':pathname.startsWith(root+'/modules/')?'module':null;
  return key?<Tutorial key={pathname} guide={SURFACE_GUIDES[key]}/>:null;
}
