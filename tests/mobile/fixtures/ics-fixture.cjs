// Shared synthetic client fixtures. Never connects to a database or production.
function createMobileFixture() {
  const requests = [];
  let imageUploads = 0;
  const user = { id: 'fixture-student', instituteId: 'fixture-ics', name: 'Jamie Student', email: 'student@example.invalid', role: 'STUDENT', requiresEnrollment: false, institute: { code: 'ics', name: 'Institute of Computing Studies' } };
  const course = { id: 'course-1', coverImage: '/course-banners/programming.svg', code: 'ICS101', courseCode: 'ICS101', title: 'Programming Fundamentals and Problem Solving', section: 'A', subject: 'Programming', room: 'Lab', isArchived: false, instructorName: 'Sample Instructor', description: 'Synthetic course', enrolledCount: 9, pendingWorkCount: 5, pendingCount: 2 };
  course.mobileCoverImage = null;
  const secondCourse = { ...course, id: 'course-2', title: 'Introduction to System Administration', code: 'SYSADMIN', courseCode: 'SYSADMIN', pendingWorkCount: 0, pendingCount: 0 };
  let courses = [course, secondCourse];
  const today = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
  const deadline = { id: 'syllabus_work-1', title: 'Programming practice due', description: 'Synthetic assignment', eventDate: new Date(Date.now() - 86400000).toISOString(), source: 'classwork', courseId: course.id, courseTitle: course.title, courseCode: course.code, deepLink: '/ics/courses/course-1/classwork/work-1' };
  const calendar = { events: [], schedules: [{ ...course, scheduleDays: [0, 1, 2, 3, 4, 5, 6], scheduleStart: '09:00', scheduleEnd: '10:30', scheduleStartDate: `${today.slice(0, 7)}-01`, scheduleEndDate: `${today.slice(0, 4)}-12-31`, createdAt: '2026-01-01T00:00:00Z' }] };
  const items = Array.from({ length: 45 }, (_, index) => ({ id: `work-${index}`, title: `Practice ${index + 1}`, type: index === 0 ? 'QUIZ' : 'ASSIGNMENT', formId: index === 0 ? 'form-1' : null, description: 'Synthetic instructions for this activity.', orderIndex: index, attachments: [], submission: null }));
  const decks = [];
  const tasks = [{ id: 'fixture-task', title: 'Reading practice', description: 'Read chapter one', priority: 'low', dueDate: null, completed: false }];
  const student = { id: 'fixture-student', name: 'Jamie Student', email: 'student@example.invalid', studentNumber: 'SYNTHETIC-001' };
  const enrollments = ['approve', 'reject'].map(id => ({ id: 'enrollment-' + id, status: 'PENDING', student: { ...student, id: 'applicant-' + id, name: 'Applicant ' + id } }));
  const grades = { [student.id]: { 'work-1': { submissionId: 'submission-1', grade: null, status: 'SUBMITTED', isReturned: false, submittedAt: '2026-11-01T04:00:00Z', attachments: [] } } };
  const receipts = new Map();
  for (const item of items) Object.assign(item, { maxPoints: 100, dueDate: '2026-12-01T08:00:00Z' });

  function handle(method, pathname, payload = {}, headers = {}) {
    const url = new URL(pathname, 'http://synthetic.invalid');
    const request = { method: () => method, postDataJSON: () => payload };
    const route = { fulfill: value => value };
      requests.push(`${request.method()} ${url.pathname}`);
      let body = {};
      const response = value => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(value) });
      if (url.pathname === '/api/upload') return response(payload.kind === 'cover-image' ? { url: `/api/assets/fixture-cover-upload-${++imageUploads}`, fileName: 'square.png', fileSize: 69 } : { url: '/__fixture/answer.txt', fileName: 'synthetic-answer.txt', fileSize: 24 });
      if (url.pathname.endsWith('/submissions/grade') && method === 'POST') {
        Object.assign(grades[student.id]['work-1'], { grade: payload.grade, isReturned: true, feedback: payload.feedback });
        return response({ success: true, submission: grades[student.id]['work-1'] });
      }
      if (url.pathname.endsWith('/gradebook')) return response({ course, students: [student], assignments: [{ id: 'work-1', title: 'Practice 2', maxPoints: 100, type: 'ASSIGNMENT' }], grades });
      if (url.pathname.endsWith('/people')) return response({ instructor: { id: 'fixture-teacher', name: 'Jamie Professor', email: 'teacher@example.invalid' }, students: [], totalEnrolled: 0 });
      if (url.pathname.endsWith('/stream')) return response({ announcements: [
        { id: 'fixture-meet-post', content: 'Join class\nhttps://meet.google.com/abc-defg-hij', createdAt: '2026-10-19T01:00:00Z', author: { id: 'fixture-teacher', name: 'Sample Instructor', email: 'teacher@example.invalid' } },
        { id: 'fixture-plain-post', content: 'Bring your notes to class.', createdAt: '2026-10-18T01:00:00Z', author: { id: 'fixture-teacher', name: 'Sample Instructor', email: 'teacher@example.invalid' } },
      ], broadcasts: [] });
      if (url.pathname.endsWith('/enrollments')) {
        if (method === 'PATCH') { const enrollment = enrollments.find(e => e.id === payload.enrollmentId); if (enrollment) enrollment.status = payload.action === 'APPROVE' ? 'APPROVED' : 'REJECTED'; return response({ success: true, enrollment }); }
        return response({ enrollments: enrollments.filter(e => e.status === 'PENDING'), totalCount: enrollments.filter(e => e.status === 'PENDING').length });
      }
      if (url.pathname.endsWith('/submissions') && method === 'POST') {
        const key = headers['idempotency-key'];
        if (key && receipts.has(key)) return response(receipts.get(key));
        const item = items.find(item => item.id === payload.syllabusItemId);
        const submission = { id: 'submission-1', status: payload.status, submittedAt: new Date().toISOString(), isReturned: false, grade: null, attachments: payload.attachments || [] };
        if (item) item.submission = submission;
        const result = { success: true, submission }; if (key) receipts.set(key, result);
        return response(result);
      }
      if (url.pathname === '/api/auth/logout') return route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
      if (url.pathname.endsWith('/auth/login')) {
        const teacher = /teacher|professor/.test(String(payload.identifier || ''));
        const institute = ['ics', 'ibe', 'ite'].includes(payload.instituteCode) ? payload.instituteCode : 'ics';
        Object.assign(user, { id: teacher ? 'fixture-teacher' : 'fixture-student', name: teacher ? 'Jamie Professor' : 'Jamie Student', role: teacher ? 'PROFESSOR' : 'STUDENT', instituteId: 'fixture-' + institute, institute: { code: institute, name: institute.toUpperCase() } });
      }

      if (url.pathname.endsWith('/auth/login')) body = { token: 'synthetic_session_token_1234567890', user, mobileCapabilities: { studentReceipts: 1, hybridDrafts: 1, agenda: 1 } };
      else if (url.pathname.endsWith('/auth/me')) body = { user, mobileCapabilities: { studentReceipts: 1, hybridDrafts: 1, agenda: 1 } };
      else if (url.pathname === '/api/mobile/dashboard') {
        if (request.method() === 'PATCH') {
          courses = request.postDataJSON().courseIds.map(id => courses.find(course => course.id === id));
          body = { success: true };
        } else body = { courses, calendar, overdue: 1, dueSoon: 0, pendingAssignments: user.role === 'STUDENT' ? [deadline] : [] };
      }
      else if (url.pathname === '/api/student/join-class') body = { courseId: course.id, redirectTo: '/ics/students' };
      else if (url.pathname === '/api/flashcards/decks') {
        if (request.method() === 'POST') {
          body = { ...request.postDataJSON(), id: 'fixture-deck', courseId: null, courseTitle: null, creatorId: user.id, instituteId: user.instituteId, isArchived: false, cardCount: 0, correctCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
          decks.unshift(body);
        } else body = decks;
      }
      else if (url.pathname === '/api/flashcards/cards') body = [{ id: 'study-card-1', front: 'Why use active recall?', back: 'Retrieving information strengthens memory.', hint: 'Think about retrieval.', attachments: [] }, { id: 'study-card-2', front: 'What comes next?', back: 'Review again over time.', attachments: [] }];
      else if (url.pathname === '/api/flashcards/progress') body = { correct: true };
      else if (url.pathname === '/api/flashcards/complete-session') body = { success: true, grantedExp: 0 };
      else if (url.pathname === '/api/workspace/tasks') {
        if (request.method() === 'PATCH') { Object.assign(tasks[0], request.postDataJSON()); body = tasks[0]; }
        else body = tasks;
      }
      else if (url.pathname === '/api/courses') body = { courses: [course] };
      else if (url.pathname === '/api/courses/course-1' && method === 'PATCH') {
        const updates = {};
        for (const [field, value] of Object.entries(payload)) {
          const preset = (field === 'coverImage' ? /^\/course-banners\/(programming|database|networking|webdev|cybersecurity)\.svg$/ : /^\/course-banners\/mobile\/(programming|database|networking|webdev|cybersecurity)\.svg$/).test(value || '');
          const image = /^\/api\/assets\/fixture-cover-[a-z0-9-]+$/.test(value || '');
          if (!['coverImage', 'mobileCoverImage'].includes(field) || (value !== null && !preset && !image)) return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: 'Choose a class banner or upload an image.' }) });
          updates[field] = field === 'coverImage' ? value || '' : value;
        }
        Object.assign(course, updates); body = { ...payload };
      }
      else if (url.pathname === '/api/courses/course-1') body = { course };
      else if (url.pathname.endsWith('/classwork')) body = { items, categories: [] };
      else if (url.pathname.includes('/workspace/events')) body = { events: [{ id: 'event-1', title: 'Programming practice due', eventDate: '2026-12-01T08:00:00Z', source: 'classwork', courseId: 'course-1', courseTitle: course.title, deepLink: '/ics/courses/course-1/classwork/work-1' }] };
      else if (url.pathname === '/api/notifications') body = { notifications: [], unreadCount: 87 };
      else if (url.pathname.includes('/knowledge-exchange/posts')) body = { posts: [] };
      else if (url.pathname.endsWith('/profile')) body = { user, mobileCapabilities: { studentReceipts: 1, hybridDrafts: 1, agenda: 1 } };
      else return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'No synthetic fixture for this route' }) });
      return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*' }, contentType: 'application/json', body: JSON.stringify(body) });

  }
  return { user, course, secondCourse, deadline, items, tasks, requests, handle, get courses() { return courses; } };
}
module.exports = { createMobileFixture };
