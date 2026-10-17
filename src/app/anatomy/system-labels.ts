import type { AnatomySystem, DepthLevel } from "@/lib/anatomy/catalogue";

export const systemLabel = (system: AnatomySystem) => system[0].toUpperCase() + system.slice(1);
export const depthLabel = (depth: DepthLevel) => depth[0].toUpperCase() + depth.slice(1);

// The main tissue colour of each system in the 3D scene (appearance.ts), so
// the drawer doubles as a legend.
export const SYSTEM_COLOURS: Record<AnatomySystem, string> = {
  integumentary: "#E3BB9E",
  muscular: "#A9372F",
  skeletal: "#E6D7B9",
  cardiovascular: "#C7302A",
  respiratory: "#DE9C99",
  nervous: "#EFC74A",
  digestive: "#D88B6B",
  urinary: "#B65A4C",
  reproductive: "#C97FA5",
  lymphatic: "#8CBF4E",
  endocrine: "#9A7FD0",
};
