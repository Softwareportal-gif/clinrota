"use client";

// The Body Explorer: the body fills a dark studio, with where-you-are and
// search along the top, the study panel for the selected structure on the
// left (a bottom sheet on phones), view tools on the right and the body
// systems bar along the bottom.
import { lazy, Suspense, useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { parseCatalogue, type Catalogue, type Structure } from "@/lib/anatomy/catalogue";
import { tissueOf } from "@/lib/anatomy/appearance";
import type { StructureContent } from "@/lib/anatomy/content";
import { explorerReducer, INITIAL_STATE } from "@/lib/anatomy/explorer-state";
import { searchStructures } from "@/lib/anatomy/search";
import { SearchBar } from "./search-bar";
import { SideRail } from "./side-rail";
import { StudyPanel, type ContentState } from "./study-panel";
import { SystemsBar } from "./systems-bar";
import { systemLabel } from "./system-labels";
import { ACCENT, PANEL, PANEL_BORDER, STUDIO_BACKDROP, TEXT, TEXT_MUTED } from "./theme";
import { TopBar } from "./top-bar";

// three.js is large; only load it once there's something to draw.
const BodyScene = lazy(() => import("./body-scene").then((m) => ({ default: m.BodyScene })));

const CREDIT =
  "3D model: Z-Anatomy, the open source atlas of anatomy (CC BY-SA 4.0), based on BodyParts3D, The Database Center for Life Science (CC BY-SA 2.1 Japan)";

type Load = { status: "loading" } | { status: "error" } | { status: "ready"; catalogue: Catalogue };

function hasWebGL() {
  if (typeof document === "undefined") return true;
  const canvas = document.createElement("canvas");
  const gl = (canvas.getContext("webgl2") ?? canvas.getContext("webgl")) as WebGLRenderingContext | null;
  if (!gl) return false;
  gl.getExtension?.("WEBGL_lose_context")?.loseContext();
  return true;
}

export function Explorer({ modelBaseUrl }: { modelBaseUrl: string }) {
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`${modelBaseUrl}/catalogue.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`catalogue: ${res.status}`);
        return res.json();
      })
      .then((json) => !cancelled && setLoad({ status: "ready", catalogue: parseCatalogue(json) }))
      .catch(() => !cancelled && setLoad({ status: "error" }));
    return () => {
      cancelled = true;
    };
  }, [modelBaseUrl, attempt]);

  if (load.status !== "ready") {
    return (
      <div className="fixed inset-0 flex items-center justify-center px-6" style={{ background: STUDIO_BACKDROP }}>
        {load.status === "loading" ? (
          <p role="status" className="text-sm" style={{ color: TEXT_MUTED }}>
            Loading the anatomy atlas…
          </p>
        ) : (
          <div className="text-center">
            <p className="text-sm" style={{ color: TEXT }}>
              Couldn&apos;t load the anatomy atlas.
            </p>
            <button
              type="button"
              onClick={() => {
                setLoad({ status: "loading" });
                setAttempt((n) => n + 1);
              }}
              className="mt-3 cursor-pointer rounded-full px-5 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: ACCENT }}
            >
              Retry
            </button>
          </div>
        )}
      </div>
    );
  }

  return <ExplorerView catalogue={load.catalogue} modelBaseUrl={modelBaseUrl} />;
}

// Loads the selected structure's study card, keeping ones already seen.
function useStructureContent(modelBaseUrl: string, id: string | null): ContentState | null {
  const [cards, setCards] = useState<Map<string, StructureContent | "none">>(() => new Map());
  const [failed, setFailed] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const loaded = id ? cards.has(id) : true;

  useEffect(() => {
    if (!id || loaded) return;
    let cancelled = false;
    fetch(`${modelBaseUrl}/content/${id}.json`)
      .then(async (res) => {
        if (res.status === 404) return "none" as const;
        if (!res.ok) throw new Error(`content: ${res.status}`);
        return (await res.json()) as StructureContent;
      })
      .then((content) => {
        if (cancelled) return;
        setCards((prev) => new Map(prev).set(id, content));
        setFailed(null);
      })
      .catch(() => !cancelled && setFailed(id));
    return () => {
      cancelled = true;
    };
  }, [modelBaseUrl, id, loaded, attempt]);

  if (!id) return null;
  const cached = cards.get(id);
  if (cached === "none") return { status: "none" };
  if (cached) return { status: "ready", content: cached };
  if (failed === id) return { status: "error", retry: () => setAttempt((n) => n + 1) };
  return { status: "loading" };
}

function ExplorerView({ catalogue, modelBaseUrl }: { catalogue: Catalogue; modelBaseUrl: string }) {
  const [state, dispatch] = useReducer(explorerReducer, INITIAL_STATE);
  const [query, setQuery] = useState("");
  const [failedChunks, setFailedChunks] = useState<Map<string, () => void>>(new Map());
  const [webgl] = useState(hasWebGL);
  const byId = useMemo(() => new Map(catalogue.structures.map((s) => [s.id, s])), [catalogue]);
  const selected = state.selectedId ? byId.get(state.selectedId) : undefined;
  const content = useStructureContent(modelBaseUrl, state.selectedId);

  const select = useCallback(
    (id: string | null) => {
      const structure = id ? byId.get(id) : undefined;
      dispatch({
        type: "select",
        id,
        system: structure?.system,
        fascia: structure ? tissueOf(structure) === "fascia" : false,
      });
    },
    [byId]
  );
  const pick = useCallback((structure: Structure) => select(structure.id), [select]);
  const onLoadError = useCallback((chunkId: string, retry: () => void) => {
    setFailedChunks((prev) => new Map(prev).set(chunkId, retry));
  }, []);

  function retryFailed() {
    for (const retry of failedChunks.values()) retry();
    setFailedChunks(new Map());
  }

  const fallbackList = useMemo(() => {
    if (webgl) return [];
    if (query.trim()) return searchStructures(catalogue, query, 50);
    return [...catalogue.structures].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 100);
  }, [webgl, catalogue, query]);

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: STUDIO_BACKDROP }}>
      {webgl ? (
        <div className="absolute inset-0">
          <Suspense fallback={null}>
            <BodyScene
              catalogue={catalogue}
              modelBaseUrl={modelBaseUrl}
              state={state}
              onSelect={select}
              onLoadError={onLoadError}
            />
          </Suspense>
        </div>
      ) : (
        <div className="absolute inset-0 overflow-y-auto px-4 pb-48 pt-28">
          <div className="mx-auto max-w-md">
            <p className="text-sm font-semibold" style={{ color: TEXT }}>
              This device can&apos;t show the 3D body
            </p>
            <p className="mt-1 text-sm" style={{ color: TEXT_MUTED }}>
              You can still search the atlas and open any structure.
            </p>
            <ul
              aria-label="Structures"
              className="mt-4 divide-y divide-white/10 rounded-2xl"
              style={{ backgroundColor: PANEL, border: `1px solid ${PANEL_BORDER}` }}
            >
              {fallbackList.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    aria-label={s.name}
                    onClick={() => select(s.id)}
                    className="flex w-full cursor-pointer items-baseline justify-between gap-3 px-4 py-2.5 text-left text-sm"
                    style={{ color: TEXT }}
                  >
                    <span className="truncate">{s.name}</span>
                    <span className="shrink-0 text-xs" style={{ color: TEXT_MUTED }}>
                      {systemLabel(s.system)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <TopBar
        structure={selected}
        search={<SearchBar catalogue={catalogue} query={query} onQueryChange={setQuery} onPick={pick} showResults={webgl} />}
      />

      {failedChunks.size > 0 && (
        <div className="pointer-events-none absolute inset-x-0 top-28 flex justify-center px-3 sm:top-20">
          <div
            role="alert"
            className="pointer-events-auto flex items-center gap-3 rounded-full px-4 py-2 text-sm backdrop-blur-md"
            style={{ backgroundColor: PANEL, border: `1px solid ${PANEL_BORDER}`, color: TEXT }}
          >
            Couldn&apos;t load this part
            <button type="button" onClick={retryFailed} className="cursor-pointer font-semibold" style={{ color: ACCENT }}>
              Retry
            </button>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute right-3 top-28 sm:right-5 sm:top-20">
        <SideRail
          xray={state.xray}
          fascia={state.fascia}
          canShowAll={state.hidden.length > 0 || !!state.isolatedId || state.faded.length > 0}
          onToggleXray={() => dispatch({ type: "toggleXray" })}
          onToggleFascia={() => dispatch({ type: "toggleFascia" })}
          onShowAll={() => dispatch({ type: "showAll" })}
          onReset={() => dispatch({ type: "resetView" })}
        />
      </div>

      {selected && content && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 lg:bottom-28 lg:left-5 lg:right-auto lg:top-20 lg:w-[400px]">
          <StudyPanel
            key={selected.id}
            structure={selected}
            content={content}
            isolated={state.isolatedId === selected.id}
            faded={state.faded.includes(selected.id)}
            onIsolate={() => dispatch(state.isolatedId === selected.id ? { type: "showAll" } : { type: "isolateSelected" })}
            onHide={() => dispatch({ type: "hideSelected" })}
            onFade={() => dispatch({ type: "fadeSelected" })}
            onClose={() => select(null)}
          />
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 px-3 pb-2">
        <SystemsBar
          catalogue={catalogue}
          systems={state.systems}
          depth={state.depth}
          onToggleSystem={(system) => dispatch({ type: "toggleSystem", system })}
          onDepthChange={(depth) => dispatch({ type: "setDepth", depth })}
        />
        <p className="pointer-events-auto text-center text-[10px]" style={{ color: TEXT_MUTED }}>
          {CREDIT}
        </p>
      </div>
    </div>
  );
}
