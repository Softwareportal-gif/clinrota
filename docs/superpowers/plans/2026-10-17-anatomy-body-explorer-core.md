# Praxxt Anatomy — Body Explorer Core (Steps 0–2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A hidden-by-default `/anatomy` page where an allow-listed tester can rotate, zoom and pan a full 3D human body built from Z-Anatomy, search any structure, tap to select it, see its names, and use systems, depth layers, hide, isolate and reset.

**Architecture:** An offline build pipeline converts Z-Anatomy into per-system/region glTF chunks at three detail levels plus a JSON catalogue, uploaded to Cloudflare R2. The Next.js app serves them through an authenticated route that redirects to short-lived signed URLs. The viewer is a client component (React Three Fiber) whose behaviour lives in pure, unit-tested modules (catalogue, search, visibility, reducer, camera framing); the 3D scene is a thin layer over them.

**Tech Stack:** Next.js 16 (App Router, webpack), React 19, TypeScript, three.js + @react-three/fiber + @react-three/drei, @gltf-transform/core + @gltf-transform/functions + meshoptimizer (pipeline), Blender 4.x (Z-Anatomy export, run locally), @aws-sdk/client-s3 + @aws-sdk/s3-request-presigner (R2), Vitest + @testing-library/react + jsdom (tests).

**Spec:** `docs/superpowers/specs/2026-10-17-anatomy-body-explorer-design.md` — this plan covers its build-order steps **0, 1 and 2** only. Steps 3–7 get their own plans.

## Global Constraints

- **Not published:** nothing in this plan may appear on praxxt.com. `/anatomy` and the model route return 404 unless `ANATOMY_PREVIEW=true` **and** the signed-in user's email is in `ANATOMY_PREVIEW_EMAILS` (comma-separated). Neither variable is set in Vercel. No sidebar item is added (that is spec step 6).
- **Source model:** Z-Anatomy (CC BY-SA 4.0). The viewer shows the credit line `3D model: Z-Anatomy (CC BY-SA 4.0), based on BodyParts3D` at all times.
- **Size budget:** the first view (overview chunk) is **≤ 5 MB**; other chunks target **1–5 MB** each.
- **Performance targets:** first view usable within **~5 s** on a mid-range Android over 4G; **≥ 30 fps** rotation at medium detail.
- **Systems** (exact ids): `integumentary, muscular, skeletal, cardiovascular, respiratory, nervous, digestive, urinary, reproductive, lymphatic, endocrine`.
- **Depth levels** (exact order, outermost first): `skin, muscle, organs, bone`. Layer of each system: integumentary → skin; muscular → muscle; skeletal → bone; every other system → organs.
- **Detail levels:** `low, medium, high`. Phones default to medium; for this plan, the scene loads `low` for everything visible and `medium` for the selected structure's chunk (on-demand detail and device adaptation are spec step 4).
- **Out of this plan:** study panel and card text (step 3), Cut tool and offline downloads (step 4), Save view and notes (step 5), entitlements and sidebar (step 6), standalone and sign-up (step 7). Their toolbar buttons are **not rendered**.
- Generated model files are never committed: `anatomy-source/` and `anatomy-build/` are git-ignored.
- Commits go to a feature branch `anatomy-core`; **do not push to `master`** (pushing master deploys).

## Review Focus

1. **A search with no match, a typo, or accents** ("stérnum", "xyz", "  sternum ") — expect a calm "No structures match" message, trimmed/accent-insensitive matching, and no crash. *Test in Task 6.*
2. **A model chunk that fails to load** (network drop, 404, signed URL expired) — expect a "Couldn't load this part — Retry" notice while the rest of the body and all controls keep working. *Test in Task 9.*
3. **A device without WebGL** (old phone, disabled GPU) — expect a message plus a usable searchable list of structures, since every structure must be reachable without the 3D canvas. *Test in Task 9.*
4. **Catalogue and meshes out of step** (a structure with no mesh, a mesh with no catalogue entry, a duplicate id) — expect the pipeline to fail the build with the offending ids, and the viewer to ignore unknown nodes. *Tests in Tasks 3 and 8.*
5. **Someone not allow-listed, signed out, or with the switch off** reaching `/anatomy` or a model URL — expect 404, never a file. Path tricks (`..`, encoded slashes) are rejected. *Tests in Tasks 4 and 5.*

---

## File Structure

```
scripts/anatomy/
  export-z-anatomy.py        Blender script: Z-Anatomy .blend → anatomy-source/ (Task 2)
  validate-source.ts         CLI: checks anatomy-source/ (Task 2)
  build.ts                   CLI: anatomy-source/ → anatomy-build/models/<version>/ (Task 3)
  upload.ts                  CLI: anatomy-build/ → R2 (Task 5)
src/lib/anatomy/
  catalogue.ts               Types, constants (systems, depth, LOD), parseCatalogue (Task 1)
  source-format.ts           Intermediate format types + validateSource (Task 2)
  pipeline.ts                buildAnatomy() used by build.ts (Task 3)
  model-storage.ts           Model path validation, signed-URL / local resolution (Task 5)
  preview-access.ts          isAnatomyPreviewEnabled(email) (Task 4)
  search.ts                  searchStructures() (Task 6)
  explorer-state.ts          Reducer + visibleStructureIds() (Task 7)
  camera.ts                  framingFor() (Task 8)
src/app/api/anatomy/model/[...path]/route.ts   Authenticated model route (Task 5)
src/app/anatomy/
  page.tsx                   Server page: auth + preview gate (Task 9)
  explorer.tsx               Client composition (Task 9)
  body-scene.tsx             R3F canvas: chunks, visibility, picking, fly-to (Task 8)
  search-bar.tsx, structure-card.tsx, systems-drawer.tsx, toolbar.tsx (Task 9)
tests/anatomy/…              Vitest tests mirroring the modules above
tests/fixtures/anatomy-source/   3-sphere fixture written by make-anatomy-fixture.ts (Task 2)
vitest.config.ts             (Task 1)
```

Modified: `package.json` (scripts, deps), `.gitignore`, `src/proxy.ts` (shared-path exception), `.env.example`.

---

### Task 0: Phone-performance spike (throwaway)

**Purpose:** Confirm before committing that a Z-Anatomy export meets the size and frame-rate targets on a real mid-range Android. Code written here is **not kept**.

- [ ] **Step 1:** Download Z-Anatomy (the `.blend` release) and open it in Blender 4.x. Note the collection structure (systems → regions) and where each object's English/Latin name and FMA id live (object name, custom properties).
- [ ] **Step 2:** Export the skeletal and muscular systems as one glTF with meshopt compression (gltf-transform CLI `optimize --compress meshopt --simplify`), at a low and a medium simplification ratio. Record file sizes.
- [ ] **Step 3:** Load each file in a bare three.js page (OrbitControls, one directional light, raycast picking) on a ~US$150 Android over 4G. Record load time and fps while rotating.
- [ ] **Step 4:** Write findings in `docs/superpowers/specs/2026-10-17-anatomy-spike-findings.md`: the name/id properties found, sizes, load time, fps, and the simplification ratios that meet ≤ 5 MB overview / ≥ 30 fps. **Gate:** if the targets can't be met, stop and take the findings to the product owner before Task 1.
- [ ] **Step 5:** Commit only the findings document.

```bash
git checkout -b anatomy-core
git add docs/superpowers/specs/2026-10-17-anatomy-spike-findings.md
git commit -m "docs: record anatomy phone-performance spike findings"
```

---

### Task 1: Test setup and catalogue model

**Files:**
- Create: `vitest.config.ts`, `src/lib/anatomy/catalogue.ts`, `tests/anatomy/catalogue.test.ts`
- Modify: `package.json` (add `"test": "vitest run"`, dev deps `vitest @testing-library/react @testing-library/jest-dom jsdom @vitejs/plugin-react`), `.gitignore` (add `anatomy-source/`, `anatomy-build/`)

**Interfaces — Produces:**
```ts
export const SYSTEMS = ["integumentary","muscular","skeletal","cardiovascular","respiratory","nervous","digestive","urinary","reproductive","lymphatic","endocrine"] as const;
export type AnatomySystem = (typeof SYSTEMS)[number];
export const DEPTH_LEVELS = ["skin","muscle","organs","bone"] as const;
export type DepthLevel = (typeof DEPTH_LEVELS)[number];
export const LODS = ["low","medium","high"] as const;
export type Lod = (typeof LODS)[number];
export function layerOf(system: AnatomySystem): DepthLevel;
export type Bbox = [number, number, number, number, number, number]; // minX,minY,minZ,maxX,maxY,maxZ
export type Structure = { id: string; name: string; latin: string | null; synonyms: string[]; system: AnatomySystem; region: string; parentId: string | null; fmaId: string | null; chunk: string; bbox: Bbox };
export type Chunk = { id: string; system: AnatomySystem; region: string; bytes: Record<Lod, number> }; // id = "<system>/<region>"
export type Catalogue = { version: string; overviewBytes: number; structures: Structure[]; chunks: Chunk[] };
export function parseCatalogue(json: unknown): Catalogue; // throws Error("Invalid catalogue: <reason>")
```

- [ ] **Step 1: Write failing tests** in `tests/anatomy/catalogue.test.ts`:
  - `layerOf("integumentary") === "skin"`, `layerOf("muscular") === "muscle"`, `layerOf("skeletal") === "bone"`, `layerOf("nervous") === "organs"`.
  - `parseCatalogue(valid)` returns the object for a minimal valid catalogue (one structure, one chunk).
  - `parseCatalogue` throws `/Invalid catalogue/` for: unknown system `"bones"`, a structure whose `chunk` is not in `chunks`, a duplicate structure id, a bbox of length 5.
- [ ] **Step 2:** Run `npx vitest run tests/anatomy/catalogue.test.ts` — expect FAIL (module not found).
- [ ] **Step 3:** Add `vitest.config.ts` (`environment: "jsdom"`, `@vitejs/plugin-react`, alias `@` → `src`) and implement `catalogue.ts`. Hand-rolled checks are fine; no schema library.
- [ ] **Step 4:** Run `npm test` — expect PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(anatomy): catalogue model and test setup"`

---

### Task 2: Source format, validator and Z-Anatomy export

**Files:**
- Create: `src/lib/anatomy/source-format.ts`, `scripts/anatomy/validate-source.ts`, `scripts/anatomy/export-z-anatomy.py`, `tests/anatomy/source-format.test.ts`, `tests/fixtures/make-anatomy-fixture.ts` (writes `tests/fixtures/anatomy-source/`: three UV-sphere meshes, 32×16 segments, ids `sternum`, `deltoid`, `heart`, plus `structures.csv` — committed output)
- Modify: `package.json` (`"anatomy:validate": "tsx scripts/anatomy/validate-source.ts"`)

**Interfaces:**
- Consumes: `SYSTEMS`, `AnatomySystem` (Task 1).
- Produces — the intermediate format the pipeline reads:
  - `anatomy-source/structures.csv`, header exactly `id,name,latin,synonyms,system,region,parent_id,fma_id`; `synonyms` are `|`-separated; empty cell = null.
  - `anatomy-source/meshes/<id>.glb` — one mesh per structure, in metres, Y up, body facing +Z.
  ```ts
  export type SourceRow = { id: string; name: string; latin: string | null; synonyms: string[]; system: AnatomySystem; region: string; parentId: string | null; fmaId: string | null };
  export function parseStructuresCsv(csv: string): SourceRow[];
  export function validateSource(rows: SourceRow[], meshIds: string[]): string[]; // list of error messages, [] = valid
  ```

- [ ] **Step 1: Write failing tests:** `parseStructuresCsv` reads the fixture into 3 rows with `synonyms` split on `|`; `validateSource` returns `[]` for the fixture and returns one message each, naming the id, for: a row with no mesh (`"missing mesh: <id>"`), a mesh with no row (`"mesh without row: <id>"`), a duplicate id (`"duplicate id: <id>"`), an unknown system (`"unknown system 'x' for <id>"`), a `parent_id` that doesn't exist (`"unknown parent '<p>' for <id>"`), an id not matching `/^[a-z0-9-]+$/` (`"invalid id: <id>"`).
- [ ] **Step 2:** Run `npx vitest run tests/anatomy/source-format.test.ts` — expect FAIL.
- [ ] **Step 3:** Implement `source-format.ts` (use `papaparse`, already a dependency) and `validate-source.ts` (reads a directory argument, prints errors, exits 1 if any).
- [ ] **Step 4:** Run tests — expect PASS.
- [ ] **Step 5:** Write `export-z-anatomy.py` (run with `blender Z-Anatomy.blend --background --python scripts/anatomy/export-z-anatomy.py -- <outDir>`): walk system collections → region collections → mesh objects; slugify a stable id from the Latin/English name (deduplicate with `-2`, `-3`); map Z-Anatomy collection names to the exact `SYSTEMS` ids (mapping table in the script, from Task 0 findings); export each object alone to `meshes/<id>.glb`; write `structures.csv`.
- [ ] **Step 6:** Run the export, then `npm run anatomy:validate -- anatomy-source` — expect `0 errors` (fix the mapping table until it is).
- [ ] **Step 7: Commit** — `git commit -m "feat(anatomy): source format, validator and Z-Anatomy export"`

---

### Task 3: Build pipeline

**Files:**
- Create: `src/lib/anatomy/pipeline.ts`, `scripts/anatomy/build.ts`, `tests/anatomy/pipeline.test.ts`
- Modify: `package.json` (`"anatomy:build": "tsx scripts/anatomy/build.ts"`; dev deps `@gltf-transform/core @gltf-transform/functions @gltf-transform/extensions meshoptimizer`)

**Interfaces:**
- Consumes: `parseStructuresCsv`, `validateSource` (Task 2); `Catalogue`, `LODS`, `layerOf` (Task 1).
- Produces:
  ```ts
  export const SIMPLIFY_RATIO: Record<Lod, number> = { low: 0.1, medium: 0.35, high: 1 }; // overwrite with Task 0 findings
  export const OVERVIEW_SYSTEMS: AnatomySystem[] = ["integumentary", "skeletal"];
  export const OVERVIEW_RATIO = 0.05;
  export async function buildAnatomy(opts: { sourceDir: string; outDir: string; version: string }): Promise<Catalogue>;
  ```
  Output layout: `<outDir>/models/<version>/chunks/<system>/<region>/<lod>.glb` (each structure is a node named exactly its `id`), `<outDir>/models/<version>/overview.glb`, `<outDir>/models/<version>/catalogue.json`.

- [ ] **Step 1: Write failing tests** (run `buildAnatomy` on the fixture into a temp dir):
  - writes `catalogue.json` that `parseCatalogue` accepts, with 3 structures, `version` as passed, and each structure's `chunk` equal to `"<system>/<region>"`;
  - writes one `.glb` per chunk per LOD and `overview.glb`;
  - each chunk `.glb` contains exactly the node names of that chunk's structures;
  - triangle count of `low` < `medium` ≤ `high` for a chunk (the fixture spheres have enough triangles to simplify);
  - every `chunks[].bytes[lod]` equals the written file size, and `overviewBytes` equals `overview.glb`'s size;
  - `buildAnatomy` rejects with the validator's messages when the source is invalid (e.g. delete one fixture mesh in the temp copy).
- [ ] **Step 2:** Run `npx vitest run tests/anatomy/pipeline.test.ts` — expect FAIL.
- [ ] **Step 3:** Implement `buildAnatomy` with gltf-transform: per chunk, merge its structures' meshes into one document (one node per structure), then per LOD `weld` → `simplify({ ratio })` (meshoptimizer) → `quantize` → `EXTMeshoptCompression`; bbox from each structure's mesh positions; overview = `OVERVIEW_SYSTEMS` structures at `OVERVIEW_RATIO`.
- [ ] **Step 4:** Run tests — expect PASS.
- [ ] **Step 5:** Run `npm run anatomy:build -- --source anatomy-source --out anatomy-build --version v1` on the real export. Verify: `overview.glb` ≤ 5 MB; report the largest chunk per LOD; any chunk > 5 MB at `medium` is split by sub-region in the export mapping and the build re-run.
- [ ] **Step 6: Commit** — `git commit -m "feat(anatomy): build pipeline for chunks, detail levels and catalogue"`

---

### Task 4: Preview gate

**Files:**
- Create: `src/lib/anatomy/preview-access.ts`, `tests/anatomy/preview-access.test.ts`, `tests/proxy-shared-paths.test.ts`
- Modify: `src/proxy.ts` (extract `export function isSharedPath(pathname: string): boolean` covering `/help`, `/help/*`, `/anatomy`, `/anatomy/*`, and use it where `isHelpPage` is used today)

**Interfaces — Produces:**
```ts
export function isAnatomyPreviewEnabled(email: string | null | undefined): boolean; // ANATOMY_PREVIEW === "true" && email (case-insensitive, trimmed) in ANATOMY_PREVIEW_EMAILS
```

- [ ] **Step 1: Write failing tests:** `isAnatomyPreviewEnabled` is false when `ANATOMY_PREVIEW` is unset, `"false"`, or the email isn't listed; true for `" Tester@Example.com "` when the list is `"tester@example.com, other@x.com"`. `isSharedPath` is true for `/help`, `/help/tickets`, `/anatomy`, `/anatomy/x`; false for `/anatomyx`, `/student`, `/`.
- [ ] **Step 2:** Run tests — expect FAIL.
- [ ] **Step 3:** Implement both.
- [ ] **Step 4:** Run `npm test` — expect PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(anatomy): preview gate and shared /anatomy path"`

---

### Task 5: Model storage and the authenticated model route

**Files:**
- Create: `src/lib/anatomy/model-storage.ts`, `scripts/anatomy/upload.ts`, `src/app/api/anatomy/model/[...path]/route.ts`, `tests/anatomy/model-storage.test.ts`
- Modify: `package.json` (deps `@aws-sdk/client-s3 @aws-sdk/s3-request-presigner`; `"anatomy:upload": "tsx scripts/anatomy/upload.ts"`), `.env.example` (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `ANATOMY_PREVIEW`, `ANATOMY_PREVIEW_EMAILS` with placeholder values)

**Interfaces:**
- Consumes: `isAnatomyPreviewEnabled` (Task 4).
- Produces:
  ```ts
  export function validModelPath(segments: string[]): string | null; // "v1/chunks/skeletal/upper-limb/low.glb" or null
  export async function modelResponseFor(path: string): Promise<Response>; // 302 to a signed URL (R2 configured) or the file body from anatomy-build/ (local dev)
  export const SIGNED_URL_SECONDS = 600;
  ```
  Route: `GET /api/anatomy/model/<path>` → 404 unless signed in and `isAnatomyPreviewEnabled(email)`; 404 for an invalid path; else `modelResponseFor`.

- [ ] **Step 1: Write failing tests:** `validModelPath` accepts `["v1","catalogue.json"]`, `["v1","overview.glb"]`, `["v1","chunks","skeletal","upper-limb","medium.glb"]`; returns `null` for `[".."]`, `["v1","..","x.glb"]`, `["v1","chunks","skeletal","a%2Fb","low.glb"]`, an unknown LOD `"ultra.glb"`, an unknown system, a non-`v<n>` version, and any extension other than `.glb`/`catalogue.json`.
- [ ] **Step 2:** Run tests — expect FAIL.
- [ ] **Step 3:** Implement: R2 via the S3 client at `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`, presigned `GetObject` for `SIGNED_URL_SECONDS`; without R2 env vars, stream from `anatomy-build/models/<path>` with `Content-Type: model/gltf-binary` (or `application/json`) and `Cache-Control: private, max-age=31536000, immutable` (paths are versioned). `upload.ts` uploads `anatomy-build/models/<version>/**` with the same content types.
- [ ] **Step 4:** Run tests — expect PASS. Then, with the dev server and `ANATOMY_PREVIEW` unset, `curl -s -o /dev/null -w "%{http_code}"` on `/api/anatomy/model/v1/catalogue.json` while signed in → `404`.
- [ ] **Step 5: Commit** — `git commit -m "feat(anatomy): versioned model storage and authenticated model route"`

---

### Task 6: Search

**Files:** Create `src/lib/anatomy/search.ts`, `tests/anatomy/search.test.ts`

**Interfaces:**
- Consumes: `Catalogue`, `Structure` (Task 1).
- Produces: `export function searchStructures(catalogue: Catalogue, query: string, limit = 10): Structure[];`
  Ranking: exact name/Latin/synonym match → name starts with query → any word starts with query → substring; ties broken by shorter name, then alphabetical. Matching is case- and accent-insensitive and ignores surrounding/duplicate spaces.

- [ ] **Step 1: Write failing tests** with a fixture catalogue (sternum [synonym "breastbone", latin "sternum"], sternocleidomastoid, manubrium of sternum, femur [latin "os femoris"]):
  - `"sternum"` → first result id `sternum`, then `manubrium-of-sternum`, then `sternocleidomastoid`;
  - `"breastbone"` → `sternum`; `"os femoris"` → `femur`; `"  STÉRNUM "` → `sternum` first;
  - `"xyz"` → `[]`; `""` and `"   "` → `[]`;
  - `limit` 1 returns one result.
- [ ] **Step 2:** Run — expect FAIL. **Step 3:** Implement (normalise with `normalize("NFD")` and strip combining marks; precompute normalised fields once per catalogue in a `WeakMap`). **Step 4:** Run — expect PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(anatomy): structure search"`

---

### Task 7: Explorer state and visibility

**Files:** Create `src/lib/anatomy/explorer-state.ts`, `tests/anatomy/explorer-state.test.ts`

**Interfaces:**
- Consumes: `Catalogue`, `AnatomySystem`, `DepthLevel`, `DEPTH_LEVELS`, `layerOf` (Task 1).
- Produces:
  ```ts
  export type ExplorerState = { systems: AnatomySystem[]; depth: DepthLevel; hidden: string[]; isolatedId: string | null; selectedId: string | null; drawerOpen: boolean; resetCount: number };
  export const INITIAL_STATE: ExplorerState; // systems ["skeletal","integumentary"], depth "skin", nothing hidden/isolated/selected, drawer closed, resetCount 0
  export type ExplorerAction =
    | { type: "select"; id: string | null } | { type: "toggleSystem"; system: AnatomySystem } | { type: "setDepth"; depth: DepthLevel }
    | { type: "hideSelected" } | { type: "isolateSelected" } | { type: "showAll" } | { type: "toggleDrawer" } | { type: "resetView" };
  export function explorerReducer(state: ExplorerState, action: ExplorerAction): ExplorerState;
  export function visibleStructureIds(catalogue: Catalogue, state: ExplorerState): Set<string>;
  ```
  Rules: a structure is visible when its system is on, its system's layer is at or below the chosen depth (depth `"muscle"` peels away `skin`; `"bone"` shows only `bone`), and it isn't hidden. When `isolatedId` is set, only that structure is visible, regardless of systems and depth. `hideSelected` adds the selection to `hidden` and clears the selection. `showAll` clears `hidden` and `isolatedId`. `resetView` keeps systems and depth, clears selection, hidden and isolation, and increments `resetCount` (the scene re-frames the camera when it changes). Selecting a structure whose system is off turns that system on.

- [ ] **Step 1: Write failing tests** for each rule above (one test per rule, fixture catalogue with one structure per layer).
- [ ] **Step 2:** Run — FAIL. **Step 3:** Implement (pure; return new objects). **Step 4:** Run — PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(anatomy): explorer state and visibility rules"`

---

### Task 8: 3D scene

**Files:** Create `src/lib/anatomy/camera.ts`, `src/app/anatomy/body-scene.tsx`, `tests/anatomy/camera.test.ts`; Modify `package.json` (deps `three @react-three/fiber @react-three/drei`, dev dep `@types/three`)

**Interfaces:**
- Consumes: `Catalogue`, `Bbox`, `Lod` (Task 1); `visibleStructureIds`, `ExplorerState` (Task 7).
- Produces:
  ```ts
  export function framingFor(bbox: Bbox, fovDeg: number, aspect: number, margin = 1.4): { position: [number, number, number]; target: [number, number, number] };
  export function BodyScene(props: { catalogue: Catalogue; modelBaseUrl: string /* e.g. "/api/anatomy/model/v1" */; state: ExplorerState; onSelect: (id: string | null) => void; onLoadError: (chunkId: string, retry: () => void) => void }): JSX.Element;
  ```
  Behaviour: loads `${modelBaseUrl}/overview.glb`, plus the `low` chunk (`${modelBaseUrl}/chunks/<chunk>/<lod>.glb`) of each visible system's chunks (from `catalogue.chunks`), plus the `medium` chunk containing `state.selectedId`. Meshes are matched to structures by node name; **nodes whose name isn't in the catalogue are ignored**. Each structure's `visible` follows `visibleStructureIds`; the selected structure gets a violet emissive highlight (`#5A3BF0`); tapping (pointer down/up without a drag) picks the nearest visible mesh and calls `onSelect(id)`; tapping empty space calls `onSelect(null)`. Camera: OrbitControls (rotate, zoom, pan); on selection change or `resetCount` change, animate to `framingFor` (selection's bbox, or the whole-body bbox on reset) over 600 ms. A failed chunk load calls `onLoadError` once with a retry function; it never throws to React.

- [ ] **Step 1: Write failing tests** for `framingFor`: for bbox `[-1,0,-1, 1,2,1]`, fov 50°, aspect 1, the target is `[0,1,0]`; the camera sits on +Z (`x` and `y` equal the target's) at a distance at which the whole bbox × margin fits the vertical field of view; a wider aspect never moves the camera further than aspect 1.
- [ ] **Step 2:** Run — FAIL. **Step 3:** Implement `framingFor`, then `BodyScene` (drei `useGLTF` with the meshopt decoder; chunk loading inside `Suspense` + an error boundary per chunk that reports via `onLoadError`). **Step 4:** Run `npm test` — PASS.
- [ ] **Step 5: Verify in the browser** (dev server, `ANATOMY_PREVIEW=true`, your email allow-listed, `anatomy-build/` present): the body appears within ~5 s on a throttled "Fast 4G" profile; drag/pinch/pan work; tapping the sternum highlights it; turning systems off hides them. Record fps from the browser's performance overlay on a mid-range Android: ≥ 30 fps.
- [ ] **Step 6: Commit** — `git commit -m "feat(anatomy): 3D body scene (three@<v>, @react-three/fiber@<v>, @react-three/drei@<v>)"`

---

### Task 9: Explorer UI

**Files:**
- Create: `src/app/anatomy/page.tsx`, `src/app/anatomy/explorer.tsx`, `search-bar.tsx`, `structure-card.tsx`, `systems-drawer.tsx`, `toolbar.tsx`, `tests/anatomy/explorer.test.tsx`

**Interfaces:**
- Consumes: everything above; `BodyScene` is mocked in tests (`vi.mock("@/app/anatomy/body-scene")`).
- Produces: `export function Explorer(props: { modelBaseUrl: string }): JSX.Element` — fetches `${modelBaseUrl}/catalogue.json` and `parseCatalogue`s it (loading state; error state "Couldn't load the anatomy atlas — Retry"), holds `useReducer(explorerReducer, INITIAL_STATE)`, renders the Focus layout from spec §2: floating `SearchBar` (top), `☰ Systems` button (top left), `StructureCard` (pop-up: name, Latin name, system; no "Read more" until step 3), `Toolbar` (Layers [opens drawer], Hide, Isolate, Show all, Reset view — no Cut or Save), `SystemsDrawer` (one toggle per system with its count, depth slider labelled skin/muscle/organs/bone), the Z-Anatomy credit line, and `BodyScene`. Brand colours from `src/app/student/dashboard-sections/colors.ts`; works at 375 px wide.

  Page `src/app/anatomy/page.tsx`: signed out → redirect to `/login?callbackUrl=/anatomy`; signed in but `isAnatomyPreviewEnabled` false → `notFound()`; otherwise renders `<Explorer modelBaseUrl="/api/anatomy/model/v1" />` full-screen (no portal sidebar).

- [ ] **Step 1: Write failing tests** (Testing Library, catalogue fetched from a mocked `fetch`):
  - typing "breastbone" and pressing Enter selects `sternum` and the card shows "Sternum", its Latin name and "Skeletal";
  - "xyz" shows "No structures match"; Escape clears the search;
  - toggling Muscular in the drawer dispatches and the drawer's switch reflects it; the depth slider exposes the four labels in order;
  - Hide and Isolate are disabled with nothing selected and enabled after selecting;
  - **chunk load failure:** when the mocked `BodyScene` calls `onLoadError("skeletal/thorax", retry)`, a "Couldn't load this part — Retry" notice appears, clicking Retry calls `retry`, and search still works;
  - **no WebGL:** when `document.createElement("canvas").getContext("webgl2")` and `"webgl"` both return null, a "This device can't show the 3D body" message and a searchable list of structures appear instead of `BodyScene`; picking from the list shows the card;
  - every control has an accessible name; the search box is reachable with Tab from the top of the page.
- [ ] **Step 2:** Run — FAIL. **Step 3:** Implement the components. **Step 4:** Run `npm test` — PASS; `npx tsc --noEmit` and `npx eslint src/app/anatomy src/lib/anatomy` — clean.
- [ ] **Step 5: Verify in the browser** at desktop and 375 px: the three states from the approved mockup (everyday, drawer open; the study panel is step 3); keyboard-only search → select → Hide → Show all → Reset view.
- [ ] **Step 6: Commit** — `git commit -m "feat(anatomy): Body Explorer UI (focus layout, search, card, drawer, toolbar)"`

---

### Task 10: Final checks (no deploy)

- [ ] **Step 1:** `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build` — all pass.
- [ ] **Step 2:** Confirm the gate: with `ANATOMY_PREVIEW` unset, `/anatomy` and `/api/anatomy/model/v1/catalogue.json` return 404 for a signed-in user; no new sidebar item anywhere.
- [ ] **Step 3:** On the real mid-range Android: first view ≤ ~5 s on 4G, ≥ 30 fps at medium detail; note results in the spike-findings document.
- [ ] **Step 4:** Commit any notes; leave the branch `anatomy-core` unmerged and unpushed for the product owner's review.
