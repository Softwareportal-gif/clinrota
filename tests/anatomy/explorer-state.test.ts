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

const ALL_ON: ExplorerState = {
  ...INITIAL_STATE,
  systems: ["integumentary", "muscular", "cardiovascular", "skeletal"],
  depth: "skin",
};
const run = (state: ExplorerState, ...actions: ExplorerAction[]) => actions.reduce(explorerReducer, state);
const visible = (state: ExplorerState) => [...visibleStructureIds(catalogue, state)].sort();

describe("explorer state", () => {
  it("starts on the muscles over the skeleton, nothing chosen", () => {
    expect(INITIAL_STATE).toEqual({
      systems: ["skeletal", "muscular", "integumentary"],
      depth: "muscle",
      hidden: [],
      isolatedId: null,
      selectedId: null,
      faded: [],
      xray: false,
      fascia: false,
      resetCount: 0,
    });
    expect(visible(INITIAL_STATE)).toEqual(["pectoralis", "sternum"]);
  });

  it("shows only structures whose system is on", () => {
    expect(visible(run(ALL_ON, { type: "toggleSystem", system: "muscular" }))).toEqual(["heart", "skin", "sternum"]);
    expect(visible(run(INITIAL_STATE, { type: "toggleSystem", system: "muscular" }))).toEqual(["sternum"]);
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
    expect(after).toEqual({
      ...before,
      selectedId: null,
      hidden: [],
      isolatedId: null,
      faded: [],
      resetCount: before.resetCount + 1,
    });
  });

  it("turns a structure's system on when it is selected", () => {
    const state = run(INITIAL_STATE, { type: "select", id: "heart", system: "cardiovascular" });
    expect(state.selectedId).toBe("heart");
    expect(state.systems).toContain("cardiovascular");
  });

  it("hides fascia unless asked for", () => {
    const withFascia: Catalogue = { ...catalogue, structures: [...catalogue.structures, s("fascia-lata", "muscular")] };
    withFascia.structures[4] = { ...withFascia.structures[4], name: "Fascia lata (left)" };
    const ids = (state: ExplorerState) => [...visibleStructureIds(withFascia, state)].sort();
    expect(ids(ALL_ON)).not.toContain("fascia-lata");
    expect(ids(run(ALL_ON, { type: "toggleFascia" }))).toContain("fascia-lata");
  });

  it("shows fascia when a fascia is selected", () => {
    expect(run(INITIAL_STATE, { type: "select", id: "fascia-lata", system: "muscular", fascia: true }).fascia).toBe(true);
  });

  it("toggles see-through skin", () => {
    expect(run(INITIAL_STATE, { type: "toggleXray" }).xray).toBe(true);
    expect(run(INITIAL_STATE, { type: "toggleXray" }, { type: "toggleXray" }).xray).toBe(false);
  });

  it("fades the selection in and out without hiding it", () => {
    const faded = run(ALL_ON, { type: "select", id: "heart" }, { type: "fadeSelected" });
    expect(faded.faded).toEqual(["heart"]);
    expect(faded.selectedId).toBe("heart");
    expect(visible(faded)).toContain("heart");
    expect(run(faded, { type: "fadeSelected" }).faded).toEqual([]);
  });

  it("clears fading with Show all and Reset view", () => {
    const faded = run(ALL_ON, { type: "select", id: "heart" }, { type: "fadeSelected" });
    expect(run(faded, { type: "showAll" }).faded).toEqual([]);
    expect(run(faded, { type: "resetView" }).faded).toEqual([]);
  });

  it("never mutates the previous state", () => {
    const frozen = Object.freeze({ ...INITIAL_STATE, systems: Object.freeze([...INITIAL_STATE.systems]) }) as ExplorerState;
    expect(() => run(frozen, { type: "toggleSystem", system: "muscular" }, { type: "select", id: "x" }, { type: "hideSelected" })).not.toThrow();
  });
});
