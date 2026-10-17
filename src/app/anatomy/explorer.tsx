"use client";

// The Body Explorer's Focus layout: the body fills the screen, with search on
// top, the Systems button top left, the selected structure's card and the
// toolbar at the bottom, and the systems & layers drawer on demand.
import { lazy, Suspense, useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { Menu } from "lucide-react";
import { parseCatalogue, type Catalogue, type Structure } from "@/lib/anatomy/catalogue";
import { explorerReducer, INITIAL_STATE } from "@/lib/anatomy/explorer-state";
import { searchStructures } from "@/lib/anatomy/search";
import { ACCENT, BORDER, CANVAS, INK, TEXT_SECONDARY } from "@/app/student/dashboard-sections/colors";
import { SearchBar } from "./search-bar";
import { StructureCard } from "./structure-card";
import { SystemsDrawer } from "./systems-drawer";
import { Toolbar } from "./toolbar";
import { systemLabel } from "./system-labels";

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
      <div className="fixed inset-0 flex items-center justify-center px-6" style={{ backgroundColor: CANVAS }}>
        {load.status === "loading" ? (
          <p role="status" className="text-sm" style={{ color: TEXT_SECONDARY }}>
            Loading the anatomy atlas…
          </p>
        ) : (
          <div className="text-center">
            <p className="text-sm" style={{ color: INK }}>
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

function ExplorerView({ catalogue, modelBaseUrl }: { catalogue: Catalogue; modelBaseUrl: string }) {
  const [state, dispatch] = useReducer(explorerReducer, INITIAL_STATE);
  const [query, setQuery] = useState("");
  const [failedChunks, setFailedChunks] = useState<Map<string, () => void>>(new Map());
  const [webgl] = useState(hasWebGL);
  const byId = useMemo(() => new Map(catalogue.structures.map((s) => [s.id, s])), [catalogue]);
  const selected = state.selectedId ? byId.get(state.selectedId) : undefined;

  const select = useCallback(
    (id: string | null) => dispatch({ type: "select", id, system: id ? byId.get(id)?.system : undefined }),
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
    <div className="fixed inset-0 overflow-hidden" style={{ backgroundColor: CANVAS }}>
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
        <div className="absolute inset-0 overflow-y-auto px-4 pb-48 pt-20">
          <div className="mx-auto max-w-md">
            <p className="text-sm font-semibold" style={{ color: INK }}>
              This device can&apos;t show the 3D body
            </p>
            <p className="mt-1 text-sm" style={{ color: TEXT_SECONDARY }}>
              You can still search the atlas and open any structure.
            </p>
            <ul aria-label="Structures" className="mt-4 divide-y rounded-2xl bg-white" style={{ border: `1px solid ${BORDER}` }}>
              {fallbackList.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    aria-label={s.name}
                    onClick={() => select(s.id)}
                    className="flex w-full cursor-pointer items-baseline justify-between gap-3 px-4 py-2.5 text-left text-sm"
                    style={{ color: INK }}
                  >
                    <span className="truncate">{s.name}</span>
                    <span className="shrink-0 text-xs" style={{ color: TEXT_SECONDARY }}>
                      {systemLabel(s.system)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start gap-2 p-3">
        <button
          type="button"
          aria-label="Systems and layers"
          aria-expanded={state.drawerOpen}
          onClick={() => dispatch({ type: "toggleDrawer" })}
          className="pointer-events-auto flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold shadow-md"
          style={{ border: `1px solid ${BORDER}`, color: INK }}
        >
          <Menu size={18} aria-hidden />
          <span className="hidden sm:inline">Systems</span>
        </button>
        <div className="pointer-events-auto mx-auto flex w-full min-w-0 max-w-md">
          <SearchBar catalogue={catalogue} query={query} onQueryChange={setQuery} onPick={pick} showResults={webgl} />
        </div>
      </div>

      {failedChunks.size > 0 && (
        <div className="pointer-events-none absolute inset-x-0 top-16 flex justify-center px-3">
          <div
            role="alert"
            className="pointer-events-auto flex items-center gap-3 rounded-full bg-white px-4 py-2 text-sm shadow-md"
            style={{ border: `1px solid ${BORDER}`, color: INK }}
          >
            Couldn&apos;t load this part
            <button type="button" onClick={retryFailed} className="cursor-pointer font-semibold" style={{ color: ACCENT }}>
              Retry
            </button>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 p-3 pb-2">
        {selected && (
          <div className="w-full max-w-sm sm:absolute sm:bottom-24 sm:right-4 sm:w-80">
            <StructureCard structure={selected} onClose={() => select(null)} />
          </div>
        )}
        <Toolbar
          hasSelection={!!selected}
          hasHiddenOrIsolated={state.hidden.length > 0 || !!state.isolatedId}
          drawerOpen={state.drawerOpen}
          onLayers={() => dispatch({ type: "toggleDrawer" })}
          onHide={() => dispatch({ type: "hideSelected" })}
          onIsolate={() => dispatch({ type: "isolateSelected" })}
          onShowAll={() => dispatch({ type: "showAll" })}
          onReset={() => dispatch({ type: "resetView" })}
        />
        <p className="text-center text-[10px]" style={{ color: TEXT_SECONDARY }}>
          {CREDIT}
        </p>
      </div>

      {state.drawerOpen && (
        <SystemsDrawer
          catalogue={catalogue}
          systems={state.systems}
          depth={state.depth}
          onToggleSystem={(system) => dispatch({ type: "toggleSystem", system })}
          onDepthChange={(depth) => dispatch({ type: "setDepth", depth })}
          onClose={() => dispatch({ type: "toggleDrawer" })}
        />
      )}
    </div>
  );
}
