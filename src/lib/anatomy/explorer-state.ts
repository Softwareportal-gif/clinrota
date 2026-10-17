// What the Body Explorer is showing: which systems are on, how deep the body
// is peeled, what's hidden, isolated or selected. Pure, so the rules can be
// tested without a 3D scene; the explorer drives it with useReducer.
import { tissueOf } from "./appearance";
import { DEPTH_LEVELS, layerOf, type AnatomySystem, type Catalogue, type DepthLevel } from "./catalogue";

export type ExplorerState = {
  systems: AnatomySystem[];
  depth: DepthLevel;
  hidden: string[];
  isolatedId: string | null;
  selectedId: string | null;
  drawerOpen: boolean;
  xray: boolean; // skin drawn see-through, so what is under it shows
  fascia: boolean; // the film of fascia over the muscles, hidden by default
  resetCount: number; // the scene re-frames the camera whenever this changes
};

export const INITIAL_STATE: ExplorerState = {
  // Opens on the muscles over the skeleton, the most useful first view.
  systems: ["skeletal", "muscular", "integumentary"],
  depth: "muscle",
  hidden: [],
  isolatedId: null,
  selectedId: null,
  drawerOpen: false,
  xray: false,
  fascia: false,
  resetCount: 0,
};

export type ExplorerAction =
  // `system` (and `fascia`) describe the selected structure, so selecting it
  // turns on whatever would otherwise hide it.
  | { type: "select"; id: string | null; system?: AnatomySystem; fascia?: boolean }
  | { type: "toggleSystem"; system: AnatomySystem }
  | { type: "setDepth"; depth: DepthLevel }
  | { type: "hideSelected" }
  | { type: "isolateSelected" }
  | { type: "showAll" }
  | { type: "toggleDrawer" }
  | { type: "toggleXray" }
  | { type: "toggleFascia" }
  | { type: "resetView" };

export function explorerReducer(state: ExplorerState, action: ExplorerAction): ExplorerState {
  switch (action.type) {
    case "select": {
      const systems =
        action.system && !state.systems.includes(action.system) ? [...state.systems, action.system] : state.systems;
      return { ...state, selectedId: action.id, systems, fascia: state.fascia || !!action.fascia };
    }
    case "toggleSystem":
      return {
        ...state,
        systems: state.systems.includes(action.system)
          ? state.systems.filter((s) => s !== action.system)
          : [...state.systems, action.system],
      };
    case "setDepth":
      return { ...state, depth: action.depth };
    case "hideSelected":
      if (!state.selectedId) return state;
      return { ...state, hidden: [...state.hidden, state.selectedId], selectedId: null };
    case "isolateSelected":
      if (!state.selectedId) return state;
      return { ...state, isolatedId: state.selectedId };
    case "showAll":
      return { ...state, hidden: [], isolatedId: null };
    case "toggleDrawer":
      return { ...state, drawerOpen: !state.drawerOpen };
    case "toggleXray":
      return { ...state, xray: !state.xray };
    case "toggleFascia":
      return { ...state, fascia: !state.fascia };
    case "resetView":
      return { ...state, selectedId: null, hidden: [], isolatedId: null, resetCount: state.resetCount + 1 };
  }
}

export function visibleStructureIds(catalogue: Catalogue, state: ExplorerState): Set<string> {
  if (state.isolatedId) return new Set([state.isolatedId]);
  const depth = DEPTH_LEVELS.indexOf(state.depth);
  const hidden = new Set(state.hidden);
  return new Set(
    catalogue.structures
      .filter(
        (s) =>
          state.systems.includes(s.system) &&
          DEPTH_LEVELS.indexOf(layerOf(s.system)) >= depth &&
          !hidden.has(s.id) &&
          (state.fascia || tissueOf(s) !== "fascia")
      )
      .map((s) => s.id)
  );
}
