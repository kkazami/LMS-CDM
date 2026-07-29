# Interactive Activities — Developer Guide

> **Scope:** ICS-exclusive feature suite (BSIT & BSCpE programs only).
> 3D hardware simulations and multi-language CodeLab with auto-grading.

## Directory Structure

```
features/interactive-activities/
├── shared/                          # Shared infrastructure for all activity modules
│   ├── types.ts                     # TypeScript interfaces (ActivitySubmission, ActivityTemplate)
│   ├── schemas.ts                   # Zod validation schemas (API boundary enforcement)
│   ├── hooks/
│   │   ├── useActivitySubmission.ts # Client hook for POSTing submission payloads
│   │   └── useGLTFModel.ts          # 3D model loader with Draco support
│   └── components/
│       ├── GLTFLoadingSkeleton.tsx   # Loading UI for 3D models
│       └── GLTFErrorBoundary.tsx    # Error boundary for WebGL/Three.js failures
├── pc-build/                        # PC Building Simulator (Sprint 1)
├── arduino/                         # Arduino & IoT Lab (Sprint 2)
├── server-rack/                     # Server Rack Builder (Sprint 3)
├── logic-gate/                      # Logic Gate Sandbox (Sprint 4)
└── codelab/                         # CodeLab — multi-language code editor (Sprint 5)
```

## Eligibility Guard

All Interactive Activities features are gated to ICS users only. The guard lives in:

```
apps/web/src/lib/activity-eligibility.ts
```

### Three guard functions:

| Function | Context | Returns |
|---|---|---|
| `isEligibleForActivities(session)` | Server components, API routes | `Promise<boolean>` |
| `isEligibleInstituteCode(code)` | Client components (when institute code is known from route) | `boolean` |
| `checkActivityEligibility()` | API route handlers (reads session from cookie) | `{ eligible, session, role } \| null` |

### Where it's enforced:

1. **Route layer:** `app/(dashboard)/[institute]/activities/layout.tsx`
   — Ineligible users are redirected to `/{institute}` (their dashboard root)

2. **API layer:** `app/api/activities/submit/route.ts`
   — Returns 403 for ineligible users, even if they hit the API directly

3. **Sidebar:** `components/layout/Sidebar.tsx`
   — The "Interactive Labs" nav entry is **absent from the DOM** for ineligible users
   — Controlled via `isEligibleForActivities` prop computed in the dashboard layout

### Modifying eligibility:

If the LMS adds a `Program` model in the future, update the `ELIGIBLE_INSTITUTE_CODE`
constant and the `isEligibleForActivities()` function in `activity-eligibility.ts`.
All consumers import from this single module, so changes propagate automatically.

## Submission API

**Endpoint:** `POST /api/activities/submit`

**Security layers:**
1. Valid session required (401 if missing)
2. ICS eligibility required (403 if wrong institute)
3. Zod schema validation (400 if payload is invalid)
4. `studentId` must match the authenticated user (403 if spoofed)

**Request body:** Must conform to the `ActivitySubmission` interface in `shared/types.ts`.

**Response (201):**
```json
{
  "message": "Submission recorded successfully.",
  "submission": {
    "id": "cuid...",
    "score": 85,
    "maxScore": 100,
    "passed": true,
    "submittedAt": "2026-07-21T12:00:00.000Z"
  }
}
```

## 3D Asset Pipeline

### Model storage
- Development: `apps/web/public/models/`
- All models should be **Draco-compressed** `.glb` files
- Asset metadata tracked in the `ActivityAsset` database table

### Loading models
```tsx
import { useGLTFModel } from "@/features/interactive-activities/shared/hooks/useGLTFModel";

function MyModel() {
  const { scene, isLoading, error } = useGLTFModel("/models/my-model.glb");
  if (!scene) return null; // Always check — scene is null before load completes
  return <primitive object={scene} />;
}
```

### Error handling
Wrap any Canvas in the `GLTFErrorBoundary`:
```tsx
import GLTFErrorBoundary from "@/features/interactive-activities/shared/components/GLTFErrorBoundary";
import GLTFLoadingSkeleton from "@/features/interactive-activities/shared/components/GLTFLoadingSkeleton";

<GLTFErrorBoundary>
  <Suspense fallback={<GLTFLoadingSkeleton />}>
    <Canvas>
      <MyModel />
    </Canvas>
  </Suspense>
</GLTFErrorBoundary>
```

### Low-spec device fallback
Activity modules must provide a 2D diagram fallback path for devices that can't
run WebGL. Check `typeof window !== 'undefined' && !!document.createElement('canvas').getContext('webgl2')`
before mounting the Canvas. Implementation details in Sprint 9.

## Judge0 (Code Execution Sandbox)

For the CodeLab module. Local dev setup:

```bash
docker compose -f docker/docker-compose.judge0.yml up -d
```

Test it:
```bash
# Submit code
curl -X POST http://localhost:2358/submissions \
  -H "Content-Type: application/json" \
  -d '{"source_code":"print(\"hello\")", "language_id": 71}'

# Get result (replace TOKEN)
curl http://localhost:2358/submissions/<TOKEN>?fields=stdout,stderr,status
```

Auth is disabled for local dev. Production deployment needs proper auth tokens.

## Database Tables (Sprint 0)

| Table | Purpose |
|---|---|
| `ActivityTemplate` | Instructor-defined problem templates with randomization variables |
| `ActivitySubmission` | Student submission records with score/state/timing |
| `ActivityAsset` | Registry of 3D model assets (path, version, compression) |
| `ActivitySession` | Tracks in-progress attempts before submission |

All JSON fields (variables, faultPool, stateCheck, errorLog) are stored as
serialized strings in SQLite. Parse with `JSON.parse()` on read.

## Conventions for Future Sprints

1. **Every activity module** should live in its own subdirectory under `features/interactive-activities/`
2. **Every activity** must emit an `ActivitySubmission` payload via the `useActivitySubmission()` hook
3. **Every 3D scene** must use `useGLTFModel()` for loading — don't roll your own loader
4. **Every 3D component** must be wrapped in `GLTFErrorBoundary` with a `GLTFLoadingSkeleton` fallback
5. **Eligibility** is inherited from the route layout — individual pages don't check it
6. **No `any` types** — use the interfaces in `shared/types.ts`
7. **JSON fields** in the DB are `string` columns — always `JSON.stringify()` on write, `JSON.parse()` on read
