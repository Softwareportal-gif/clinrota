// How each structure looks: its tissue (bone, muscle, tendon, artery...) read
// from its system and name, the tissue's colour and surface, and a small
// per-structure shade so neighbouring muscles and bones can be told apart.
import type { Structure } from "./catalogue";

export const TISSUES = [
  "bone",
  "cartilage",
  "ligament",
  "muscle",
  "tendon",
  "fascia",
  "artery",
  "vein",
  "heart",
  "nerve",
  "neural",
  "lymph",
  "skin",
  "respiratory",
  "digestive",
  "urinary",
  "reproductive",
  "endocrine",
] as const;
export type Tissue = (typeof TISSUES)[number];

export type Surface = {
  colour: string; // sRGB hex
  roughness: number;
  clearcoat: number; // wet or glossy tissue
  sheen: number; // satin sheen of muscle and skin
  shadeRange: number; // how far each structure's lightness may vary
  opacity?: number; // thin translucent sheets (fascia) let what's under them show
};

export const SURFACES: Record<Tissue, Surface> = {
  bone: { colour: "#E6D7B9", roughness: 0.62, clearcoat: 0.1, sheen: 0, shadeRange: 0.05 },
  cartilage: { colour: "#DCE5E2", roughness: 0.32, clearcoat: 0.5, sheen: 0, shadeRange: 0.03 },
  ligament: { colour: "#DAD7CB", roughness: 0.38, clearcoat: 0.4, sheen: 0, shadeRange: 0.03 },
  muscle: { colour: "#A9372F", roughness: 0.52, clearcoat: 0.12, sheen: 0.55, shadeRange: 0.07 },
  tendon: { colour: "#E9E5DA", roughness: 0.3, clearcoat: 0.45, sheen: 0, shadeRange: 0.03 },
  fascia: { colour: "#F3EEE4", roughness: 0.3, clearcoat: 0.5, sheen: 0, shadeRange: 0.02, opacity: 0.22 },
  artery: { colour: "#C7302A", roughness: 0.35, clearcoat: 0.5, sheen: 0, shadeRange: 0.03 },
  vein: { colour: "#3D5DA8", roughness: 0.35, clearcoat: 0.5, sheen: 0, shadeRange: 0.03 },
  heart: { colour: "#9B2B2C", roughness: 0.45, clearcoat: 0.35, sheen: 0.3, shadeRange: 0.04 },
  nerve: { colour: "#EFC74A", roughness: 0.45, clearcoat: 0.2, sheen: 0, shadeRange: 0.03 },
  neural: { colour: "#E3C2B8", roughness: 0.5, clearcoat: 0.2, sheen: 0.2, shadeRange: 0.04 },
  lymph: { colour: "#8CBF4E", roughness: 0.45, clearcoat: 0.3, sheen: 0, shadeRange: 0.03 },
  skin: { colour: "#E3BB9E", roughness: 0.6, clearcoat: 0.05, sheen: 0.3, shadeRange: 0.02 },
  respiratory: { colour: "#DE9C99", roughness: 0.5, clearcoat: 0.3, sheen: 0.2, shadeRange: 0.04 },
  digestive: { colour: "#D88B6B", roughness: 0.45, clearcoat: 0.35, sheen: 0.1, shadeRange: 0.05 },
  urinary: { colour: "#B65A4C", roughness: 0.45, clearcoat: 0.35, sheen: 0, shadeRange: 0.04 },
  reproductive: { colour: "#C97FA5", roughness: 0.45, clearcoat: 0.3, sheen: 0, shadeRange: 0.04 },
  endocrine: { colour: "#9A7FD0", roughness: 0.45, clearcoat: 0.3, sheen: 0, shadeRange: 0.04 },
};

const CARTILAGE = /cartilage|menisc|articular disc|intervertebral disc|nucleus pulposus|anulus|annulus|labrum|symphysis/;
const LIGAMENT = /ligament|capsule|membrane/;
// Sheets wrapping muscles and tendons: drawn as a translucent film.
const FASCIA = /fascia|aponeuro|sheath|bursa/;
const TENDON = /tendon|retinacul|septum|ligament/;
const VEIN = /vein|venous|vena|sinus|azygos/;
const HEART = /heart|atri(um|al)|ventric|valve|leaflet|cusp|papillary|chorda|myocard|pericard/;
const NERVE = /nerve|plexus|ganglion|ramus|branch/;
const LIVER_LIKE = /liver|hepat|spleen|kidney|renal/;

export function tissueOf(structure: Pick<Structure, "system" | "name">): Tissue {
  const name = structure.name.toLowerCase();
  switch (structure.system) {
    case "skeletal":
      if (CARTILAGE.test(name)) return "cartilage";
      if (LIGAMENT.test(name)) return "ligament";
      return "bone";
    case "muscular":
      if (FASCIA.test(name)) return "fascia";
      return TENDON.test(name) ? "tendon" : "muscle";
    case "cardiovascular":
      if (HEART.test(name)) return "heart";
      if (VEIN.test(name)) return "vein";
      return "artery";
    case "nervous":
      return NERVE.test(name) ? "nerve" : "neural";
    case "lymphatic":
      return "lymph";
    case "integumentary":
      return "skin";
    case "digestive":
      return LIVER_LIKE.test(name) ? "urinary" : "digestive"; // liver and spleen share the dark red-brown
    default:
      return structure.system;
  }
}

// A stable number in [-1, 1] from the id, so a structure's shade never changes.
export function shadeOf(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) / 0xffffffff) * 2 - 1;
}

export function appearanceOf(structure: Pick<Structure, "id" | "system" | "name">) {
  const tissue = tissueOf(structure);
  const surface = SURFACES[tissue];
  return { tissue, surface, lightnessOffset: shadeOf(structure.id) * surface.shadeRange };
}
