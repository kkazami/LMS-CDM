import { Octokit } from '@octokit/rest';
import { db } from '@/lib/db';
import { decryptGithubToken } from './token-vault';

// In-memory TTL cache
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getFromCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value as T;
}

function setInCache<T>(key: string, value: T, ttlSeconds: number): void {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export function invalidateRepoCache(owner: string, repo: string): void {
  const prefix = `repo:${owner.toLowerCase()}:${repo.toLowerCase()}`;
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

/**
 * Returns an authenticated Octokit instance for the given LMS user.
 */
export async function getOctokitForUser(userId: string): Promise<Octokit> {
  const record = await db.githubToken.findUnique({
    where: { userId },
  });

  if (!record) {
    throw new Error('User has not connected a GitHub account.');
  }

  const token = decryptGithubToken(record.encryptedToken);

  // Update lastUsedAt asynchronously
  db.githubToken
    .update({
      where: { userId },
      data: { lastUsedAt: new Date() },
    })
    .catch((err) => console.error('Failed to update githubToken lastUsedAt:', err));

  return new Octokit({ auth: token });
}

/**
 * Fetches repository metadata with 5-minute TTL cache.
 */
export async function getRepoMetadata(userId: string, owner: string, repo: string) {
  const cacheKey = `repo:${owner.toLowerCase()}:${repo.toLowerCase()}:meta`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  const octokit = await getOctokitForUser(userId);
  const { data } = await octokit.repos.get({ owner, repo });

  const result = {
    name: data.name,
    fullName: data.full_name,
    description: data.description,
    language: data.language,
    stars: data.stargazers_count,
    forks: data.forks_count,
    defaultBranch: data.default_branch,
    updatedAt: data.updated_at,
    private: data.private,
    htmlUrl: data.html_url,
  };

  setInCache(cacheKey, result, 300); // 5 minutes
  return result;
}

/**
 * Fetches file contents with base64 decoding and 10-minute TTL cache.
 */
export async function getFileContents(
  userId: string,
  owner: string,
  repo: string,
  path: string,
  ref?: string
) {
  const refKey = ref || 'default';
  const cacheKey = `repo:${owner.toLowerCase()}:${repo.toLowerCase()}:file:${refKey}:${path}`;
  const cached = getFromCache<{ content: string; sha: string; size: number; encoding: string }>(cacheKey);
  if (cached) return cached;

  const octokit = await getOctokitForUser(userId);
  const { data } = await octokit.repos.getContent({
    owner,
    repo,
    path,
    ref,
  });

  if (Array.isArray(data) || !('content' in data)) {
    throw new Error(`Path ${path} is a directory, not a file.`);
  }

  const content = Buffer.from(data.content, 'base64').toString('utf8');
  const result = {
    content,
    sha: data.sha,
    size: data.size,
    encoding: 'utf-8',
  };

  setInCache(cacheKey, result, 600); // 10 minutes
  return result;
}

/**
 * Fetches recursive repository tree by commit SHA with 10-minute TTL cache.
 */
export async function getFileTree(
  userId: string,
  owner: string,
  repo: string,
  sha: string
) {
  const cacheKey = `repo:${owner.toLowerCase()}:${repo.toLowerCase()}:tree:${sha}`;
  const cached = getFromCache<Array<{ path?: string; mode?: string; type?: string; sha?: string; size?: number }>>(cacheKey);
  if (cached) return cached;

  const octokit = await getOctokitForUser(userId);
  const { data } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: sha,
    recursive: '1',
  });

  setInCache(cacheKey, data.tree, 600);
  return data.tree;
}

/**
 * Fetches commit history with 2-minute TTL cache.
 */
export async function getCommitHistory(
  userId: string,
  owner: string,
  repo: string,
  branch?: string,
  perPage = 30
) {
  const cacheKey = `repo:${owner.toLowerCase()}:${repo.toLowerCase()}:commits:${branch || 'default'}:${perPage}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  const octokit = await getOctokitForUser(userId);
  const { data } = await octokit.repos.listCommits({
    owner,
    repo,
    sha: branch,
    per_page: perPage,
  });

  const result = data.map((c) => ({
    sha: c.sha,
    message: c.commit.message,
    author: c.commit.author?.name || c.author?.login || 'Unknown',
    date: c.commit.author?.date,
    url: c.html_url,
  }));

  setInCache(cacheKey, result, 120); // 2 minutes
  return result;
}

/**
 * Fetches CI workflow runs with 1-minute TTL cache.
 */
export async function getCiStatus(
  userId: string,
  owner: string,
  repo: string,
  perPage = 5
) {
  const cacheKey = `repo:${owner.toLowerCase()}:${repo.toLowerCase()}:actions:${perPage}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  const octokit = await getOctokitForUser(userId);
  const { data } = await octokit.actions.listWorkflowRunsForRepo({
    owner,
    repo,
    per_page: perPage,
  });

  const result = data.workflow_runs.map((r) => ({
    id: r.id,
    name: r.name,
    status: r.status,
    conclusion: r.conclusion,
    url: r.html_url,
    createdAt: r.created_at,
    headSha: r.head_sha,
  }));

  setInCache(cacheKey, result, 60); // 1 minute
  return result;
}

/**
 * Checks remaining rate limit for the connected user.
 */
export async function checkRateLimit(userId: string) {
  const octokit = await getOctokitForUser(userId);
  const { data } = await octokit.rateLimit.get();
  return {
    limit: data.rate.limit,
    remaining: data.rate.remaining,
    reset: data.rate.reset,
    used: data.rate.used,
  };
}
