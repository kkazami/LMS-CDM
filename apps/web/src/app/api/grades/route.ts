import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/api-auth';

export async function GET(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
    }

    // Grades are derived from StudentSubmission scores — return a placeholder for now
    // The actual implementation depends on the grading policy setup per course
    return NextResponse.json({
      grades: [],
      summary: [],
    });
  } catch (error) {
    console.error('GRADES_API_ERROR', error);
    return NextResponse.json({ message: 'Something went wrong.' }, { status: 500 });
  }
}
