/**
 * Resilient Client Fetcher with Exponential Backoff Retry and Abort Timeout.
 */

export interface FetchOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
}

export async function fetchWithRetry<T = unknown>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const {
    timeoutMs = 10000,
    retries = 3,
    retryDelayMs = 500,
    headers = {},
    ...fetchConfig
  } = options;

  let attempt = 0;

  while (attempt <= retries) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...fetchConfig,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        // Do not retry 4xx client errors (e.g. 401, 403, 404)
        if (response.status >= 400 && response.status < 500) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Request failed with status ${response.status}`);
        }

        // Retry 5xx server errors
        if (attempt < retries) {
          throw new Error(`Server error ${response.status}`);
        }

        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server error ${response.status}`);
      }

      return (await response.json()) as T;
    } catch (error: any) {
      clearTimeout(timer);

      if (attempt >= retries || (error.name === 'AbortError' && attempt > 0)) {
        throw error;
      }

      attempt++;
      const delay = retryDelayMs * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error('Maximum retries exceeded');
}
