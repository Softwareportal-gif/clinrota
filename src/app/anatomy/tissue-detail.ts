// Fine surface detail for tissue, computed in the shader so nothing extra is
// downloaded: a bumpy relief from 3D noise in world space (porous bone,
// spongy lung, fine skin grain), stretched along a direction for muscle
// fibres, plus a gentle colour mottling. Our meshes have no texture
// coordinates, so the noise is sampled from position instead.
import * as THREE from "three";
import type { Tissue } from "@/lib/anatomy/appearance";

export type Detail = {
  scale: number; // noise frequency, per metre
  bump: number; // relief strength
  tint: number; // colour mottling, as a fraction of the base colour
  fibre: boolean; // stretch the noise along the structure's long axis
};

const DETAIL: Record<Tissue, Detail> = {
  muscle: { scale: 900, bump: 0.22, tint: 0.07, fibre: true },
  heart: { scale: 700, bump: 0.14, tint: 0.06, fibre: true },
  tendon: { scale: 900, bump: 0.08, tint: 0.03, fibre: true },
  ligament: { scale: 800, bump: 0.08, tint: 0.03, fibre: true },
  fascia: { scale: 600, bump: 0.04, tint: 0.02, fibre: false },
  bone: { scale: 110, bump: 0.05, tint: 0.06, fibre: false },
  cartilage: { scale: 160, bump: 0.02, tint: 0.03, fibre: false },
  artery: { scale: 400, bump: 0.03, tint: 0.05, fibre: false },
  vein: { scale: 400, bump: 0.03, tint: 0.05, fibre: false },
  nerve: { scale: 900, bump: 0.08, tint: 0.04, fibre: true },
  neural: { scale: 90, bump: 0.08, tint: 0.05, fibre: false },
  lymph: { scale: 300, bump: 0.08, tint: 0.06, fibre: false },
  skin: { scale: 700, bump: 0.05, tint: 0.04, fibre: false },
  respiratory: { scale: 60, bump: 0.07, tint: 0.1, fibre: false },
  digestive: { scale: 90, bump: 0.06, tint: 0.07, fibre: false },
  urinary: { scale: 180, bump: 0.08, tint: 0.07, fibre: false },
  reproductive: { scale: 180, bump: 0.08, tint: 0.07, fibre: false },
  endocrine: { scale: 220, bump: 0.08, tint: 0.07, fibre: false },
};

// Phones sample one octave of noise instead of two.
export function detailFor(tissue: Tissue): Detail {
  return DETAIL[tissue];
}

const NOISE = /* glsl */ `
varying vec3 vTissuePos;
uniform float uTissueScale;
uniform float uTissueBump;
uniform float uTissueTint;
uniform float uTissueFibre;
uniform vec3 uTissueFibreDir;

// Ashima Arts 3D simplex noise (MIT).
vec4 tdPermute(vec4 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
vec4 tdTaylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float tdNoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
  i = mod(i, 289.0);
  vec4 p = tdPermute(tdPermute(tdPermute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0 / 7.0;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = tdTaylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

// Position in noise space: scaled, and squashed along the fibre direction so
// the noise runs as long thin streaks.
vec3 tdSpace(vec3 p) {
  vec3 q = p * uTissueScale;
  if (uTissueFibre > 0.5) {
    float along = dot(q, uTissueFibreDir);
    q += uTissueFibreDir * along * (0.06 - 1.0);
  }
  return q;
}

float tdField(vec3 q) {
  float n = tdNoise(q);
  #ifdef TISSUE_TWO_OCTAVES
  n = n * 0.7 + tdNoise(q * 2.3) * 0.3;
  #endif
  return n;
}
`;

// Adds the detail to a standard or physical material. Every material shares
// one compiled shader; only the uniforms differ.
export function addTissueDetail(
  material: THREE.MeshStandardMaterial,
  detail: Detail,
  fibreDir: THREE.Vector3,
  twoOctaves: boolean,
) {
  material.defines = {
    ...material.defines,
    ...(twoOctaves ? { TISSUE_TWO_OCTAVES: "" } : {}),
  };
  material.customProgramCacheKey = () => `tissue-detail-${twoOctaves ? 2 : 1}`;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTissueScale = { value: detail.scale };
    shader.uniforms.uTissueBump = { value: detail.bump };
    shader.uniforms.uTissueTint = { value: detail.tint };
    shader.uniforms.uTissueFibre = { value: detail.fibre ? 1 : 0 };
    shader.uniforms.uTissueFibreDir = { value: fibreDir.clone().normalize() };

    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vTissuePos;")
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvTissuePos = (modelMatrix * vec4(transformed, 1.0)).xyz;",
      );

    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${NOISE}`)
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        diffuseColor.rgb *= 1.0 + uTissueTint * tdNoise(vTissuePos * uTissueScale * 0.18);`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        {
          vec3 q = tdSpace(vTissuePos);
          float e = 0.35;
          float n0 = tdField(q);
          vec3 grad = vec3(tdField(q + vec3(e, 0.0, 0.0)) - n0, tdField(q + vec3(0.0, e, 0.0)) - n0, tdField(q + vec3(0.0, 0.0, e)) - n0) / e;
          vec3 g = (viewMatrix * vec4(grad, 0.0)).xyz;
          // Fade the relief out where it's finer than a pixel (it would only
          // shimmer as grain) and back in as the camera comes closer.
          float fade = clamp(1.6 - 2.0 * length(fwidth(q)), 0.0, 1.0);
          normal = normalize(normal - uTissueBump * fade * (g - dot(g, normal) * normal));
        }`,
      );
  };
}

// The direction a structure runs: the main axis of its vertices (for muscle
// fibres). Sampled, so it stays quick on big meshes.
export function mainAxis(object: THREE.Object3D): THREE.Vector3 {
  const points: THREE.Vector3[] = [];
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const position = child.geometry.getAttribute("position");
    if (!position) return;
    const step = Math.max(1, Math.floor(position.count / 400));
    for (let i = 0; i < position.count; i += step) {
      points.push(new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(child.matrixWorld));
    }
  });
  if (points.length < 3) return new THREE.Vector3(0, 1, 0);
  const mean = points.reduce((m, p) => m.add(p), new THREE.Vector3()).divideScalar(points.length);
  // Covariance, then power iteration for its largest eigenvector.
  let xx = 0,
    xy = 0,
    xz = 0,
    yy = 0,
    yz = 0,
    zz = 0;
  for (const p of points) {
    const x = p.x - mean.x,
      y = p.y - mean.y,
      z = p.z - mean.z;
    xx += x * x;
    xy += x * y;
    xz += x * z;
    yy += y * y;
    yz += y * z;
    zz += z * z;
  }
  let v = new THREE.Vector3(0.3, 1, 0.2).normalize();
  for (let i = 0; i < 12; i++) {
    v = new THREE.Vector3(
      xx * v.x + xy * v.y + xz * v.z,
      xy * v.x + yy * v.y + yz * v.z,
      xz * v.x + yz * v.y + zz * v.z,
    );
    if (v.lengthSq() === 0) return new THREE.Vector3(0, 1, 0);
    v.normalize();
  }
  return v;
}
