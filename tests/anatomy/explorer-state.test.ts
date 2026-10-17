import { describe, expect, it } from "vitest";
import type { AnatomySystem, Catalogue, Structure } from "@/lib/anatomy/catalogue";
import {
  explorerReducer,
  INITIAL_STATE,
  visibleStructureIds,
  type ExplorerAction,
  type ExplorerState,
} from "@/lib/anatomy/explorer-state";

const s = (id: string, system: AnatomySystem): Structure => ({
  id,
  name: id,
  latin: null,
  synonyms: [],
  system,
  region: "thorax",
  parentId: null,
  fmaId: null,
  chunk: `${system}/thorax`,
  bbox: [0, 0, 0, 1, 1, 1],
});

// One structure per layer: skin, muscle, organs, bone.
const catalogue: Catalogue = {
  version: "v1",
  overviewBytes: 1,
  chunks: [],
  structures: [s("skin", "integumentary"), s("pectoralis", "muscular"), s("heart", "cardiovascular"), s("sternum", "skeletal")],
};

const ALL_ON: ExplorerState = { ...INITIAL_STATE, systems: ["integumentary", "muscular", "cardiovascular", "skeletal"] };
const run = (state: ExplorerState, ...actions: ExplorerAction[]) => actions.reduce(explorerReducer, state);
const visible = (state: ExplorerState) => [...visibleStructureIds(catalogue, state)].sort();

describe("explorer state", () => {
  it("starts with skeleton and skin on, at skin depth, nothing chosen", () => {
    expect(INITIAL_STATE).toEqual({
      systems: ["skeletal", "integumentary"],
      depth: "skin",
      hidden: [],
      isolatedId: null,
      selectedId: null,
      drawerOpen: false,
      resetCount: 0,
    });
    expect(visible(INITIAL_STATE)).toEqual(["skin", "sternum"]);
  });

  it("shows only structures whose system is on", () => {
    expect(visible(run(ALL_ON, { type: "toggleSystem", system: "muscular" }))).toEqual(["heart", "skin", "sternum"]);
    expect(visible(run(INITIAL_STATE, { type: "toggleSystem", system: "muscular" }))).toEqual([
      "pectoralis",
      "skin",
      "sternum",
    ]);
  });

  it("peels layers above the chosen depth", () => {
    expect(visible(run(ALL_ON, { type: "setDepth", depth: "muscle" }))).toEqual(["heart", "pectoralis", "sternum"]);
    expect(visible(run(ALL_ON, { type: "setDepth", depth: "organs" }))).toEqual(["heart", "sternum"]);
    expect(visible(run(ALL_ON, { type: "setDepth", depth: "bone" }))).toEqual(["sternum"]);
  });

  it("hides the selection and clears it", () => {
    const state = run(ALL_ON, { type: "select", id: "heart", system: "cardiovascular" }, { type: "hideSelected" });
    expect(state.hidden).toEqual(["heart"]);
    expect(state.selectedId).toBeNull();
    expect(visible(state)).toEqual(["pectoralis", "skin", "sternum"]);
  });

  it("isolates the selection regardless of systems and depth", () => {
    const state = run(
      ALL_ON,
      { type: "select", id: "skin", system: "integumentary" },
      { type: "isolateSelected" },
      { type: "setDepth", depth: "bone" },
      { type: "toggleSystem", system: "integumentary" }
    );
    expect(state.isolatedId).toBe("skin");
    expect(visible(state)).toEqual(["skin"]);
  });

  it("shows everything hidden or isolated again", () => {
    const state = run(
      ALL_ON,
      { type: "select", id: "heart" },
      { type: "hideSelected" },
      { type: "select", id: "sternum" },
      { type: "isolateSelected" },
      { type: "showAll" }
    );
    expect(state.hidden).toEqual([]);
    expect(state.isolatedId).toBeNull();
    expect(visible(state)).toEqual(["heart", "pectoralis", "skin", "sternum"]);
  });

  it("resets the view but keeps systems and depth", () => {
    const before = run(
      ALL_ON,
      { type: "setDepth", depth: "organs" },
      { type: "select", id: "heart" },
      { type: "hideSelected" },
      { type: "select", id: "sternum" },
      { type: "isolateSelected" }
    );
    const after = run(before, { type: "resetView" });
    expect(after).toEqual({ ...before, selectedId: null, hidden: [], isolatedId: null, resetCount: before.resetCount + 1 });
  });

  it("turns a structure's system on when it is selected", () => {
    const state = run(INITIAL_STATE, { type: "select", id: "heart", system: "cardiovascular" });
    expect(state.selectedId).toBe("heart");
    expect(state.systems).toContain("cardiovascular");
  });

  it("toggles the systems drawer", () => {
    expect(run(INITIAL_STATE, { type: "toggleDrawer" }).drawerOpen).toBe(true);
    expect(run(INITIAL_STATE, { type: "toggleDrawer" }, { type: "toggleDrawer" }).drawerOpen).toBe(false);
  });

  it("never mutates the previous state", () => {
    const frozen = Object.freeze({ ...INITIAL_STATE, systems: Object.freeze([...INITIAL_STATE.systems]) }) as ExplorerState;
    expect(() => run(frozen, { type: "toggleSystem", system: "muscular" }, { type: "select", id: "x" }, { type: "hideSelected" })).not.toThrow();
  });
});
