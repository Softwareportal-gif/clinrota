import type { AnatomySystem, DepthLevel } from "@/lib/anatomy/catalogue";

export const systemLabel = (system: AnatomySystem) => system[0].toUpperCase() + system.slice(1);
export const depthLabel = (depth: DepthLevel) => depth[0].toUpperCase() + depth.slice(1);

// Matches the 3D scene's colours, so the drawer doubles as a legend.
export const SYSTEM_COLOURS: Record<AnatomySystem, string> = {
  integumentary: "#E3B79A",
  muscular: "#B5544B",
  skeletal: "#EDE3CF",
  cardiovascular: "#C0392B",
  respiratory: "#E7A1A8",
  nervous: "#E6C84F",
  digestive: "#D98E5F",
  urinary: "#C9A227",
  reproductive: "#C77DA3",
  lymphatic: "#7FB77E",
  endocrine: "#8E7CC3",
};
