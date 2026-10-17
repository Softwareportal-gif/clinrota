# Praxxt Anatomy — Part 1: Body Explorer (design)

**Status:** Design approved section by section in brainstorming, 2026-10-17. Awaiting review of this document. Nothing is built or published.
**Product context:** Phase two of Praxxt adds an anatomy and physiology simulation product in four parts, built in order: **(1) Body Explorer**, (2) Quiz & Self-test, (3) Physiology Lab, (4) Virtual Patients. This document covers Part 1 only. Parts 2–4 each get their own design later.

## 1. Purpose and decisions

An interactive, full-detail 3D human anatomy atlas that students rotate, explore and study, available **inside Praxxt** and as a **standalone product**.

Decisions made with the product owner:

| Topic | Decision |
|---|---|
| Access | Inside Praxxt (switched on per institution/program) **and** a standalone product for any school or individual |
| Depth | **Full detailed atlas** — thousands of named structures, not a reduced student set |
| Devices | **Mix of phones and laptops** — both must work well |
| Features in version 1 | Layers & systems; search & info cards; cut-through sections; saved views & notes (incl. class sharing) |
| Card content | **Open sources + expert review** (Wikipedia text, credited, refined by Praxxt's clinical experts) |
| Unreviewed cards | **Shown, clearly labelled** "Not yet reviewed"; reviewed cards carry a ✓ badge |
| Technical approach | **A 3D atlas inside the Praxxt web app** (one codebase for portal and standalone) — not a native app, not a licensed third-party atlas |
| Layout | **Focus layout plus two additions:** "Read more" study panel and a systems & layers drawer |
| Standalone launch | **Free first, paid later** — paid tier and payments added once content is reviewed and polished |

Success looks like: a student on a mid-range Android phone opens Anatomy, finds any structure by name within seconds, studies a reliable card, and saves the view with notes; a lecturer shares a view with a class; a school without Praxxt can join with a class code.

## 2. Screens and interaction

One screen with three states (mockups were reviewed in the brainstorming companion):

1. **Everyday (focus).** The body fills the screen. A search bar floats at the top; a **☰ Systems** button at the top left; a small toolbar at the bottom. Tapping a structure, or choosing it in search, selects it, flies the camera to it, and shows a short **pop-up card**: name, system, one-line summary, **"Read more ›"**.
2. **Study panel ("Read more").** Full card: location, function, clinical relevance, related structures, the student's own note, source credit and review status. Slides in from the right on laptops; rises as a full-height sheet on phones.
3. **Systems & layers drawer (☰).** Toggle whole systems on/off (skeletal, muscular, cardiovascular, respiratory, nervous, digestive, urinary, reproductive, lymphatic, endocrine, integumentary) and a **depth slider** (skin → muscle → organs → bone). Opens as a left panel on laptops, a bottom sheet on phones; closes when done.

**Toolbar:** Layers · Hide (remove the selected structure) · Isolate (show only the selection) · Cut (adjustable slicing plane) · ★ Save view.
**Navigation:** drag to rotate, pinch/scroll to zoom, two-finger drag to pan, **Reset view** returns to the front.
**Search:** matches everyday names, Latin names and synonyms ("breastbone" finds the sternum).
**Placement:** a new **Anatomy** item in the Praxxt sidebar (students, supervisors, coordinators of enabled programs); the same screen at the standalone address.

## 3. 3D models and delivery

### 3.1 Source model
**Z-Anatomy** (CC BY-SA 4.0; built on BodyParts3D), which carries thousands of structures with standard anatomical terms and ID codes. BodyParts3D (CC BY-SA) is the fallback/complement.

### 3.2 Preparation pipeline (run by us, offline, not on users' devices)
A repeatable script that:
- splits the model into **chunks by system × region** (e.g. `skeletal/upper-limb`, `cardiovascular/thorax`);
- produces each chunk at **three levels of detail** (low / medium / high), simplified and compressed (meshopt/Draco) into glTF (`.glb`);
- writes a **catalogue** (JSON) of every structure: stable ID, everyday name, Latin name, synonyms, system, region, parent/children, chunk and level, bounding box, anatomy ID codes. The catalogue drives search, the drawer, related structures, the card import, and later the quizzes (Part 2).
- versions its output (e.g. `models/v1/...`) so cached files are never stale.

### 3.3 Loading strategy
- **First view:** a low-detail whole-body overview, target **≤ ~5 MB**.
- **On demand:** zooming into a region or selecting a structure loads that region's higher-detail chunk (about 1–5 MB each); a subtle shimmer marks parts still loading.
- The complete high-detail atlas (several hundred MB) is **never downloaded at once**.

### 3.4 Device adaptation
Phones default to **medium** detail with a **"High detail"** switch; a **Data saver** setting stays on low detail. Laptops may load high detail automatically (decided from device memory/GPU hints and screen size).

### 3.5 Offline
Per system, **"Download for offline"** (size shown, e.g. "Skeletal · 24 MB") stores that system's chunks, the catalogue and its cards in browser storage via the existing service worker (Serwist). A **Downloads** list shows saved systems and removes them. Everything downloaded works with no connection.

### 3.6 Hosting
Model files live on object storage with **no download (egress) fees** — recommended **Cloudflare R2** — behind long-lived, versioned caching. The Praxxt app stays on Vercel. Files are served through **short-lived signed URLs** issued by the app, so they load only inside Praxxt and paid content can be gated later (the models themselves are openly licensed; this protects bandwidth and the paid experience).

### 3.7 Rendering
three.js (via React Three Fiber) in a client component: raycast picking for selection, visibility toggles for systems/layers/hide/isolate, clipping planes for Cut, camera fly-to for search and saved views.

## 4. Content: info cards and expert review

### 4.1 Card fields
Everyday name, Latin name, synonyms, system, region, related structures (automatic, from the catalogue) · short summary · location · function · **clinical relevance** · source & licence credit · review status (Not yet reviewed / Reviewed, by whom, when).

### 4.2 Initial import
A one-off import links each structure's anatomy ID code to the matching Wikipedia article (via Wikidata) and stores the article's opening summary, trimmed for students, as the card summary, with credit. Location, function and clinical relevance are left for experts. A spot-check sample verifies the structure ↔ article matches before launch.

### 4.3 Content editors
A new **content editor** role (Ikona's clinicians/lecturers):
- a **review queue** ordered by priority: first a core curriculum list of ~**500 structures** for nursing, midwifery and allied health, then the structures students view most;
- edit any card field, write clinical relevance, **Mark as reviewed**;
- full **version history** (who changed what, when; any change can be reverted);
- student **"Report a mistake"** submissions arrive in the same queue.

### 4.4 Display rule
Unreviewed cards show the imported text with a clear **"Not yet reviewed"** label; reviewed cards show **✓ Reviewed by Praxxt experts**.

### 4.5 Licensing
Text imported from Wikipedia, and edits derived from it, is published under **CC BY-SA 4.0**, credited on each card and on a **Credits** page (which also credits Z-Anatomy/BodyParts3D). Clinical-relevance text written from scratch by Praxxt's experts remains Praxxt's own. Edited/converted model files are also CC BY-SA and may be reused by others; the app code and platform remain proprietary.

### 4.6 Language
English at launch; card storage allows additional languages later.

## 5. Accounts and access

### 5.1 Inside Praxxt
The super admin enables **Anatomy** per institution or program (an entitlement record), so it can be included or sold as an add-on later without rework. All users of an enabled program see **Anatomy** in their sidebar with their normal login.

### 5.2 Standalone
- Same app and database, served at its own address (proposed **anatomy.praxxt.com**) with its own landing page.
- **Public sign-up** (email + password; emailed sign-in link once email is configured). A new **Individual learner** account type, not tied to a school, which can reach only Anatomy — never logbooks, placements or any school data.
- **Class licences** for schools not on Praxxt: a teacher account receives a **class code**; students join with it.

### 5.3 Plans and payments
Launch **free**. The design includes plans (free tier, e.g. full skeletal system + search; paid tier, e.g. full atlas + offline + notes) and entitlement checks from the start, so the paid tier can be switched on later. Payments, when added: **Paystack** (Ghana, Nigeria, Kenya, South Africa, Côte d'Ivoire; mobile money and cards, including international cards).

## 6. Saved views and notes

- **Saved view** stores: camera position and target, visible systems, depth, hidden/isolated structures, cut plane, highlighted structures, title, optional note. **My views** library: search, rename, open (camera flies to the view), delete. Saving works offline and syncs later, using the existing offline queue pattern.
- **Structure notes:** a private note attached to a structure, shown whenever its card opens.
- **Class sharing:** coordinators/lecturers (in Praxxt) and class-licence teachers (standalone) share a view, with their explanation, to their cohort/class; it appears under **Class views**, read-only, and can be copied to My views.
- **Highlighting** chosen structures in a contrasting colour is in version 1; **text pins** placed on the body are deferred to a later version.
- Notes are private; shared views are visible only to the target class.

## 7. Quality and testing

- **Accuracy:** expert review, labels, mapping spot-check, Credits page.
- **Performance targets:** first view usable within ~5 s on a mid-range Android over 4G; ≥ 30 fps rotation at medium detail. Test devices: ~US$150 Android phone, an older iPhone, a school laptop.
- **Automated tests:** catalogue integrity (every structure has a chunk, names and a system; no orphans); search by everyday/Latin/synonym; saved-view round trip (save → reopen identical); offline download and removal; access rules (individual learners can't reach school data; class views reach only their class; entitlement switch hides/shows Anatomy).
- **Accessibility:** search, drawer and cards fully usable by keyboard and screen reader, so every structure is reachable without the 3D canvas; colour contrast meets the site's existing standard.
- **Monitoring:** client errors and load times reported, to tune detail levels.

## 8. Build order

Each step is usable on its own and stays **behind a feature switch — not visible on praxxt.com — until the owner decides to launch**.

| Step | Scope |
|---|---|
| 0. Phone test (spike) | Throwaway prototype loading part of the real model on a real mid-range phone, to confirm performance before committing. Its code is not kept. |
| 1. Model preparation | Pipeline, chunks and levels of detail, catalogue, R2 storage, signed URLs |
| 2. Core viewer | Rotate/zoom/pan, tap-to-select, pop-up card (names), systems drawer, layers, hide/isolate, search |
| 3. Content | Wikipedia import, study panel, content editor role and review queue, Report a mistake, Credits |
| 4. Detail & offline | On-demand detail loading, device adaptation and data saver, offline downloads, Cut tool |
| 5. Views & notes | Saved views, structure notes, class sharing |
| 6. Inside Praxxt | Per-program entitlement switch, sidebar item |
| 7. Standalone | Standalone address, landing page, individual-learner sign-up, class codes (free; paid tier later) |

## 9. Out of scope for Part 1

Quizzes (Part 2), physiology simulation (Part 3), virtual patients (Part 4), text pins on the model, payments and the paid tier, languages other than English, a native mobile app.

## 10. Open items to confirm during planning

- Standalone address (`anatomy.praxxt.com` is proposed).
- Exact free-tier boundary for when payments arrive (proposed: full skeletal system + search).
- Who the first content editors are, and the source of the ~500-structure core curriculum list.
