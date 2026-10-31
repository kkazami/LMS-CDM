import { notFound, redirect } from 'next/navigation';
import { actorFor } from './access';
import { OhmwardError } from '../domain/schema';

export async function pageActor(institute: string) {
  if (institute.toLowerCase() !== 'ics') notFound();
  try { return await actorFor(); }
  catch (error) {
    if (error instanceof OhmwardError && error.status === 401) redirect('/login?institute=ics');
    if (error instanceof OhmwardError && [403, 404].includes(error.status)) notFound();
    throw error;
  }
}
