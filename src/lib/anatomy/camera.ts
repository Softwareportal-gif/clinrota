// Where to put the camera so a structure (or the whole body) fills the view.
import type { Bbox } from "./catalogue";

// Camera in front of the box (+Z, the way the body faces), aimed at its
// centre, just far enough back that the box times `margin` fits both the
// vertical and the horizontal field of view.
export function framingFor(
  bbox: Bbox,
  fovDeg: number,
  aspect: number,
  margin = 1.4
): { position: [number, number, number]; target: [number, number, number] } {
  const [minX, minY, minZ, maxX, maxY, maxZ] = bbox;
  const target: [number, number, number] = [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2];
  const tanV = Math.tan(((fovDeg / 2) * Math.PI) / 180);
  const tanH = tanV * aspect;
  const halfHeight = ((maxY - minY) * margin) / 2;
  const halfWidth = ((maxX - minX) * margin) / 2;
  const distance = Math.max(halfHeight / tanV, halfWidth / tanH) + (maxZ - minZ) / 2;
  return { position: [target[0], target[1], target[2] + distance], target };
}
