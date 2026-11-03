import { test } from 'node:test';
import assert from 'node:assert/strict';
import { courseworkSettingsError, githubSubmissionError, parseGithubRepository } from '../../apps/web/src/lib/coursework-submission';

test('repository roots normalize without accepting unrelated GitHub pages or lookalike hosts', () => {
  for (const url of ['https://github.com/student/project', ' https://www.github.com/student/project.git/ ']) {
    assert.deepEqual(parseGithubRepository(url), { url: 'https://github.com/student/project', name: 'student/project' });
  }
  for (const url of [
    '', 'student/project', 'http://github.com/student/project', 'https://gitlab.com/student/project',
    'https://github.com', 'https://github.com/student', 'https://github.com/student/project/issues',
    'https://github.com/student/project/tree/main', 'https://github.com/student/project/blob/main/file.ts',
    'https://github.com/orgs/student', 'https://github.com/settings/profile',
    'https://github.com.evil.test/student/project', 'https://github.com@evil.test/student/project',
    'https://evil.test/github.com/student/project', 'https://user:password@github.com/student/project',
    'https://github.com:8443/student/project', 'https://github.com/student/project?tab=readme',
    'https://github.com/student/project#readme', 'https://github.com/student/project\\issues',
    'https://github.com/student/%70roject', 'https://github.com/student/.git',
  ]) assert.equal(parseGithubRepository(url), null, url);
});

test('a GitHub-only turn-in needs exactly one repository link; drafts may be empty', () => {
  const repo = { type: 'LINK', url: 'https://github.com/student/project' };
  assert.equal(githubSubmissionError(true, [repo], true), null);
  assert.equal(githubSubmissionError(true, [], false), null);
  assert.ok(githubSubmissionError(true, [], true));
  assert.ok(githubSubmissionError(true, [repo, repo], true));
  assert.ok(githubSubmissionError(true, [{ ...repo, type: 'FILE' }], false));
  assert.ok(githubSubmissionError(true, [{ type: 'LINK', url: 'https://example.com' }], false));
  assert.equal(githubSubmissionError(false, [{ type: 'FILE', url: '/uploads/work.pdf' }], true), null);
});

test('programming is independent of assessment category and GitHub requires programming', () => {
  for (const type of ['ASSIGNMENT', 'QUIZ', 'ACTIVITY', 'MIDTERM_EXAM', 'FINAL_EXAM', 'Laboratory Work']) {
    assert.equal(courseworkSettingsError({ type, isProgramming: true, requireGithubRepo: true }), null);
    assert.equal(courseworkSettingsError({ type, isProgramming: true, requireGithubRepo: false }), null);
  }
  assert.ok(courseworkSettingsError({ type: 'ASSIGNMENT', requireGithubRepo: true }));
  assert.ok(courseworkSettingsError({ type: 'material', isProgramming: true }));
  assert.equal(courseworkSettingsError({ type: 'MATERIAL' }), null);
});
