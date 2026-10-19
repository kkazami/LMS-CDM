import { notFound, redirect } from 'next/navigation';
import { academicActor } from './policy';
import { AccessError } from '@/lib/super-user-v1/actor';
export async function academicPageActor(institute: string, instructorOnly = false) {
    try {
        const actor = await academicActor();
        if (actor.instituteCode !== institute.toLowerCase() || instructorOnly && actor.role !== 'INSTRUCTOR')
            notFound();
        return actor;
    }
    catch (error) {
        if (error instanceof AccessError) {
            if (error.status === 401)
                redirect('/login?institute=' + encodeURIComponent(institute));
            if (error.status === 403)
                notFound();
        }
        throw error;
    }
}
