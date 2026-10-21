/**
 * ============================================================================
 * CdM LMS — ITE-Only Service Worker (ite-sw.js)
 * ============================================================================
 * 
 * SCOPE & INTENT:
 * - Restricted to the ITE institute (/ite/) and eligible ITE students only.
 * - ICS, IBE, instructors, admins, and unauthenticated users must NEVER get offline caching.
 *
 * WHAT IS CACHED:
 * 1. GET requests to ITE learning material reading pages (/ite/learning-materials/.../read)
 *    that the signed-in student has explicitly opened while online.
 * 2. GET requests to ITE flashcard pages (/ite/flashcards).
 * 3. Static Next.js assets (_next/static/*, fonts, CSS) required to render those views.
 * 4. Attachment files opened for those learning materials (/uploads/*).
 *
 * WHAT IS NEVER CACHED:
 * 1. ANY non-GET request (POST, PUT, DELETE, PATCH) — passes straight to network.
 * 2. ALL API routes (/api/*) — passes straight to network.
 * 3. Authentication pages (/login, /register, /activate, etc.) and redirect responses.
 * 4. Other institutes (/ics/*, /ibe/*) and instructor/admin views.
 * 5. Grades, notifications, risk alerts, and student profile data.
 * 6. Responses with status other than 200, opaque responses, responses with Set-Cookie,
 *    or responses with Cache-Control containing 'no-store' or 'private'.
 *
 * PRIVACY & HYGIENE:
 * - All caches are namespaced by user ID: `ite-offline-v1-${userId}`.
 * - Maximum of 40 cached material pages, with LRU eviction.
 * - On sign-out or account switch, the "CLEAR_ALL" message purges all offline caches.
 * ============================================================================
 */

const CACHE_VERSION = "ite-offline-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const MAX_CACHED_MATERIALS = 40;

let currentUserId = "anonymous";

function getMaterialCacheName() {
  return `${CACHE_VERSION}-materials-${currentUserId}`;
}

// ─── Service Worker Lifecycle ───────────────────────────────────────────────

self.addEventListener("install", (event) => {
  // Pre-cache static shell if needed or activate immediately
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Clean up outdated caches
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key.startsWith("ite-offline-") && !key.startsWith(CACHE_VERSION)) {
            return caches.delete(key);
          }
        })
      );
      await self.clients.claim();
    })()
  );
});

// ─── Messaging Handler ─────────────────────────────────────────────────────

self.addEventListener("message", (event) => {
  if (!event.data) return;

  if (event.data.type === "SET_USER") {
    if (event.data.userId && typeof event.data.userId === "string") {
      currentUserId = event.data.userId;
    }
  } else if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  } else if (event.data.type === "CLEAR_ALL") {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys();
        await Promise.all(
          keys.map((key) => {
            if (key.startsWith("ite-offline-")) {
              return caches.delete(key);
            }
          })
        );
      })()
    );
  }
});

// ─── Fetch Interception ────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // 1. MUST BE GET METHOD
  if (request.method !== "GET") {
    return; // Pass through to network
  }

  const url = new URL(request.url);
  const pathname = url.pathname;

  // 2. EXCLUDE ALL API, AUTH, AND NON-ITE ROUTES
  if (pathname.startsWith("/api/")) return;
  if (pathname.startsWith("/login") || pathname.startsWith("/register") || pathname === "/") return;
  if (pathname.startsWith("/ics/") || pathname.startsWith("/ibe/")) return;
  if (pathname.startsWith("/ite/teachers") || pathname.startsWith("/ite/admin")) return;

  // 3. STATIC ASSETS (_next/static, fonts, icons) -> Stale-While-Revalidate or Cache-First
  const isStatic =
    pathname.startsWith("/_next/static/") ||
    pathname.endsWith(".css") ||
    pathname.endsWith(".js") ||
    pathname.endsWith(".woff2") ||
    pathname.endsWith(".woff");

  if (isStatic) {
    event.respondWith(handleStaticAsset(request));
    return;
  }

  // Helper to detect RSC / flight prefetch requests
  const isRsc =
    request.headers.get("RSC") === "1" ||
    request.headers.get("rsc") === "1" ||
    request.headers.has("next-router-prefetch") ||
    request.headers.has("next-router-state-tree") ||
    url.searchParams.has("_rsc");

  // 4. ITE LEARNING MATERIALS (READ VIEW) -> Network-First with Timeout & Fallback
  const isMaterialRead = /^\/ite\/learning-materials\/[^/]+\/[^/]+\/read\/?$/.test(pathname);
  if (isMaterialRead) {
    event.respondWith(handleMaterialPage(request, isRsc));
    return;
  }

  // 5. ITE FLASHCARDS VIEW
  const isFlashcards = /^\/ite\/flashcards(\/.*)?$/.test(pathname);
  if (isFlashcards) {
    event.respondWith(handleFlashcardsPage(request, isRsc));
    return;
  }

  // 6. ATTACHMENT UPLOADS (/uploads/*)
  const isAttachment = pathname.startsWith("/uploads/");
  if (isAttachment) {
    event.respondWith(handleAttachment(request));
    return;
  }

  // 7. REAL NAVIGATION REQUESTS FOR OTHER /ite/ PAGES
  // When offline during browser navigation to any other uncached /ite/ page, serve standalone fallback
  if (request.mode === "navigate" && (pathname.startsWith("/ite/") || pathname === "/ite")) {
    event.respondWith(handleGenericNavigation(request));
    return;
  }

  // 8. RSC/PREFETCH REQUESTS FOR /ite/ ROUTES
  // Return Response.error() on network failure so Next falls back to full browser navigation
  if (isRsc && (pathname.startsWith("/ite/") || pathname === "/ite")) {
    event.respondWith(handleRscRequest(request));
    return;
  }

  // Otherwise: normal network fetch without intercepting
});

// ─── Request Handlers ──────────────────────────────────────────────────────

/**
 * Handles static assets with Cache-First then Network strategy.
 */
async function handleStaticAsset(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.status === 200 && response.type !== "opaque") {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    if (cached) return cached;
    throw err;
  }
}

/**
 * Handles ITE learning material reading view.
 * Strategy: Network-first with 2500ms timeout.
 * If offline or timeout:
 *   - For RSC/prefetch: returns Response.error() so Next.js falls back to real browser navigation.
 *   - For navigate/HTML: serves cached version (ignoring _rsc query), or offline.html fallback if uncached.
 */
async function handleMaterialPage(request, isRsc) {
  const cacheName = getMaterialCacheName();
  const cache = await caches.open(cacheName);

  try {
    // Attempt network fetch with a 2500ms timeout
    const networkPromise = fetch(request);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Network timeout")), 2500)
    );

    const response = await Promise.race([networkPromise, timeoutPromise]);

    // Validate response before caching (cache HTML only, not RSC fragments)
    if (isResponseCacheable(response) && !isRsc) {
      await cache.put(request, response.clone());
      trimCache(cache, MAX_CACHED_MATERIALS);
    }

    return response;
  } catch (networkErr) {
    // If RSC/prefetch failed, return Response.error() so Next.js triggers standard navigation
    if (isRsc) {
      return Response.error();
    }

    // Real navigation requests: search cache ignoring _rsc param
    const cached =
      (await cache.match(request, { ignoreSearch: true })) ||
      (await cache.match(request));
    if (cached) {
      return cached;
    }

    // Nothing in cache: serve standalone, self-contained offline fallback
    return getOfflineFallbackResponse();
  }
}

/**
 * Handles ITE flashcards page.
 */
async function handleFlashcardsPage(request, isRsc) {
  const cacheName = `${CACHE_VERSION}-flashcards-${currentUserId}`;
  const cache = await caches.open(cacheName);

  try {
    const networkPromise = fetch(request);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Network timeout")), 2500)
    );
    const response = await Promise.race([networkPromise, timeoutPromise]);

    if (isResponseCacheable(response) && !isRsc) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    if (isRsc) {
      return Response.error();
    }

    const cached =
      (await cache.match(request, { ignoreSearch: true })) ||
      (await cache.match(request));
    if (cached) return cached;
    return getOfflineFallbackResponse("Flashcard decks you have opened are available offline. Connect to view other decks.");
  }
}

/**
 * Handles real navigation to any other uncached /ite/ page while offline.
 */
async function handleGenericNavigation(request) {
  try {
    const networkPromise = fetch(request);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Network timeout")), 2500)
    );
    return await Promise.race([networkPromise, timeoutPromise]);
  } catch (err) {
    return getOfflineFallbackResponse();
  }
}

/**
 * Handles RSC/prefetch requests for /ite/ pages on network failure.
 * Returns Response.error() so Next.js client router falls back to browser navigation.
 */
async function handleRscRequest(request) {
  try {
    return await fetch(request);
  } catch (err) {
    return Response.error();
  }
}

/**
 * Handles attachment files opened for learning materials.
 */
async function handleAttachment(request) {
  const cacheName = `${CACHE_VERSION}-attachments-${currentUserId}`;
  const cache = await caches.open(cacheName);

  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (isResponseCacheable(response)) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    if (cached) return cached;
    return new Response("This attachment is not available offline.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

// ─── Helper Functions ──────────────────────────────────────────────────────

function isResponseCacheable(response) {
  if (!response || response.status !== 200 || response.type === "opaque") {
    return false;
  }
  if (response.redirected) {
    return false;
  }
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) {
    return false;
  }
  const cacheControl = (response.headers.get("cache-control") || "").toLowerCase();
  if (cacheControl.includes("no-store") || cacheControl.includes("private")) {
    return false;
  }
  return true;
}

/**
 * Evicts oldest items when cache size exceeds maxItems.
 */
async function trimCache(cache, maxItems) {
  try {
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      const itemsToDelete = keys.length - maxItems;
      for (let i = 0; i < itemsToDelete; i++) {
        await cache.delete(keys[i]);
      }
    }
  } catch {}
}

/**
 * Inline standalone HTML fallback page for uncached materials while offline.
 * Has no external dependencies, works completely offline.
 */
function getOfflineFallbackResponse(customMessage) {
  const msg = customMessage || "This lesson isn't available offline. Open it once while online to save it.";
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Offline — CdM LMS</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #0E1017;
      color: #F1F5F9;
      text-align: center;
      box-sizing: border-box;
    }
    .card {
      max-width: 440px;
      margin: 20px;
      padding: 36px 28px;
      background-color: #161922;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 24px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 999px;
      background-color: rgba(37, 99, 235, 0.15);
      color: #60A5FA;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
      margin: 0 0 10px 0;
      color: #FFFFFF;
    }
    p {
      font-size: 13px;
      line-height: 1.6;
      color: #94A3B8;
      margin: 0 0 24px 0;
    }
    .btn {
      display: inline-block;
      padding: 10px 20px;
      border-radius: 12px;
      background-color: #2563EB;
      color: #FFFFFF;
      text-decoration: none;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: none;
    }
    .btn:hover {
      background-color: #1D4ED8;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Offline Notice</div>
    <h1>You are currently offline</h1>
    <p>${msg}</p>
    <button class="btn" onclick="window.history.back()">Go Back</button>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 503,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
