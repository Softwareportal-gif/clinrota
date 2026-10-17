// What the Body Explorer is showing: which systems are on, how deep the body
// is peeled, what's hidden, isolated or selected. Pure, so the rules can be
// tested without a 3D scene; the explorer drives it with useReducer.
import { DEPTH_LEVELS, layerOf, type AnatomySystem, type Catalogue, type DepthLevel } from "./catalogue";

export type ExplorerState = {
  systems: AnatomySystem[];
  depth: DepthLevel;
  hidden: string[];
  isolatedId: string | null;
  selectedId: string | null;
  drawerOpen: boolean;
  resetCount: number; // the scene re-frames the camera whenever this changes
};

export const INITIAL_STATE: ExplorerState = {
  systems: ["skeletal", "integumentary"],
  depth: "skin",
  hidden: [],
  isolatedId: null,
  selectedId: null,
  drawerOpen: false,
  resetCount: 0,
};

export type ExplorerAction =
  // `system` is the selected structure's, so selecting it can turn it on.
  | { type: "select"; id: string | null; system?: AnatomySystem }
  | { type: "toggleSystem"; system: AnatomySystem }
  | { type: "setDepth"; depth: DepthLevel }
  | { type: "hideSelected" }
  | { type: "isolateSelected" }
  | { type: "showAll" }
  | { type: "toggleDrawer" }
  | { type: "resetView" };

export function explorerReducer(state: ExplorerState, action: ExplorerAction): ExplorerState {
  switch (action.type) {
    case "select": {
      const systems =
        action.system && !state.systems.includes(action.system) ? [...state.systems, action.system] : state.systems;
      return { ...state, selectedId: action.id, systems };
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
        (s) => state.systems.includes(s.system) && DEPTH_LEVELS.indexOf(layerOf(s.system)) >= depth && !hidden.has(s.id)
      )
      .map((s) => s.id)
  );
}
