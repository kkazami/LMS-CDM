import { Prisma } from '@prisma/client';

export function isAcademicSchemaUnavailable(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2021' || error.code === 'P2022');
}

export const academicSetupMessage = 'The Program Head and organizational chart database setup is unavailable. Contact the system administrator.';
