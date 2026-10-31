export interface CourseworkSettings {
  type: string;
  isProgramming?: boolean;
  requireGithubRepo?: boolean;
}

export function courseworkSettingsError(settings: CourseworkSettings): string | null {
  if (settings.type.toUpperCase() === 'MATERIAL' && (settings.isProgramming || settings.requireGithubRepo)) {
    return 'Materials cannot require programming submissions.';
  }
  if (settings.requireGithubRepo && !settings.isProgramming) {
    return 'Enable programming coursework before requiring a GitHub repository.';
  }
  return null;
}

const githubPages = new Set(['about', 'account', 'apps', 'collections', 'enterprise', 'explore', 'features', 'issues', 'login', 'marketplace', 'new', 'notifications', 'organizations', 'orgs', 'pricing', 'pulls', 'search', 'security', 'settings', 'signup', 'site', 'sponsors', 'topics', 'users']);

/** Accept repository roots only; parsing a URL is not proof of access or authorship. */
export function parseGithubRepository(input: string): { url: string; name: string } | null {
  const value = input.trim();
  if (value.length > 300 || /[\\\s]/.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !['github.com', 'www.github.com'].includes(url.hostname) || url.port || url.username || url.password || url.search || url.hash) return null;
    const match = /^\/([a-z\d](?:[a-z\d-]{0,37}[a-z\d])?)\/([a-z\d_.-]{1,100})\/?$/i.exec(url.pathname);
    if (!match || githubPages.has(match[1].toLowerCase())) return null;
    const owner = match[1], repo = match[2].replace(/\.git$/i, '');
    if (!repo || repo === '.' || repo === '..') return null;
    return { url: `https://github.com/${owner}/${repo}`, name: `${owner}/${repo}` };
  } catch {
    return null;
  }
}

export const githubRepositoryMessage = 'Enter a GitHub repository URL, such as https://github.com/username/repository.';

export function githubSubmissionError(
  required: boolean | undefined,
  attachments: readonly { type?: string; url: string }[],
  final: boolean,
): string | null {
  if (!required) return null;
  if (!attachments.length) return final ? 'A GitHub repository is required before you can turn in this coursework.' : null;
  if (attachments.length !== 1) return 'Submit exactly one GitHub repository for this coursework.';
  if (attachments[0].type !== 'LINK' || !parseGithubRepository(attachments[0].url)) return githubRepositoryMessage;
  return null;
}
