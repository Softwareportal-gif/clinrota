"use client";

// The Body Explorer's 3D view. Draws the light overview model first, then
// each visible chunk at the detail level this device can afford (low first
// for systems the overview doesn't cover); each structure shows its most
// detailed loaded copy. Meshes are matched to the catalogue by node name
// (the structure id); nodes the catalogue doesn't know are ignored.
//
// Looks: every structure gets its tissue's colour and surface (appearance.ts)
// with a slight shade of its own, lit by a soft studio environment. Devices
// on high detail also get crease shadowing (ambient occlusion) and a floor
// shadow.
import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Lightformer,
  OrbitControls,
  PerformanceMonitor,
  useGLTF,
} from "@react-three/drei";
import { EffectComposer, N8AO } from "@react-three/postprocessing";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { appearanceOf } from "@/lib/anatomy/appearance";
import { framingFor } from "@/lib/anatomy/camera";
import { OVERVIEW_SYSTEMS, type Bbox, type Catalogue, type Lod, type Structure } from "@/lib/anatomy/catalogue";
import { currentDeviceHints, preferredLod } from "@/lib/anatomy/detail";
import { visibleStructureIds, type ExplorerState } from "@/lib/anatomy/explorer-state";
import { addTissueDetail, detailFor, mainAxis } from "./tissue-detail";

const FOV = 40;
const ANIMATION_MS = 600;
const TAP_SLOP_PX = 6;
const HIGHLIGHT = "#5A3BF0";
// Small structures are framed with some of their surroundings, so the camera
// never zooms in so far that you lose your bearings.
const MIN_FRAME_M = 0.3;

// Detail ranks: a structure shows the highest-ranked copy that has loaded.
const RANK: Record<"overview" | Lod, number> = {
  overview: 0,
  low: 1,
  medium: 2,
  high: 3,
};

// What each tier draws. Devices start at the tier their detail level suggests
// and step down if they can't keep a smooth frame rate.
type Quality = "high" | "balanced" | "standard";
const QUALITY = {
  high: {
    physical: true,
    ao: true,
    floorShadow: true,
    twoOctaves: true,
    dpr: [1, 2] as [number, number],
  },
  balanced: {
    physical: false,
    ao: true,
    floorShadow: false,
    twoOctaves: false,
    dpr: [1, 1.5] as [number, number],
  },
  standard: {
    physical: false,
    ao: false,
    floorShadow: false,
    twoOctaves: false,
    dpr: [1, 1] as [number, number],
  },
};
const LOWER: Record<Quality, Quality> = {
  high: "balanced",
  balanced: "standard",
  standard: "standard",
};

// One material per structure (its own shade and fibre direction), made on
// first use and reused.
class MaterialCache {
  private cache = new Map<string, THREE.Material>();
  private axes = new Map<string, THREE.Vector3>();
  constructor(private quality: Quality) {}

  get(structure: Structure, selected: boolean, xray: boolean, object: THREE.Object3D): THREE.Material {
    const key = `${structure.id}|${selected}|${xray}`;
    let material = this.cache.get(key);
    if (!material) {
      let axis = this.axes.get(structure.id);
      if (!axis) {
        axis = mainAxis(object);
        this.axes.set(structure.id, axis);
      }
      material = this.make(structure, selected, xray, axis);
      this.cache.set(key, material);
    }
    return material;
  }

  dispose() {
    for (const material of this.cache.values()) material.dispose();
    this.cache.clear();
  }

  private make(structure: Structure, selected: boolean, xray: boolean, axis: THREE.Vector3): THREE.Material {
    const { tissue, surface, lightnessOffset } = appearanceOf(structure);
    const color = new THREE.Color(surface.colour).offsetHSL(0, 0, lightnessOffset);
    const params = {
      color,
      roughness: surface.roughness,
      emissive: new THREE.Color(selected ? HIGHLIGHT : "#000000"),
      emissiveIntensity: selected ? 0.45 : 0,
    };
    const material = QUALITY[this.quality].physical
      ? new THREE.MeshPhysicalMaterial({
          ...params,
          clearcoat: surface.clearcoat,
          clearcoatRoughness: 0.4,
          sheen: surface.sheen,
          sheenRoughness: 0.5,
          sheenColor: new THREE.Color("#ffd9d0"),
        })
      : new THREE.MeshStandardMaterial({
          ...params,
          roughness: Math.max(0.25, surface.roughness - surface.clearcoat * 0.2),
        });
    addTissueDetail(material, detailFor(tissue), axis, QUALITY[this.quality].twoOctaves);
    const opacity = tissue === "skin" && xray ? 0.2 : surface.opacity;
    if (opacity !== undefined) {
      material.transparent = true;
      material.opacity = opacity;
      material.depthWrite = false;
    }
    return material;
  }
}

function atLeast(bbox: Bbox, size: number): Bbox {
  const out = [...bbox] as Bbox;
  for (let k = 0; k < 3; k++) {
    const grow = Math.max(0, size - (bbox[k + 3] - bbox[k])) / 2;
    out[k] -= grow;
    out[k + 3] += grow;
  }
  return out;
}

function unionBbox(structures: Structure[]): Bbox {
  const box: Bbox = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (const { bbox } of structures) {
    for (let k = 0; k < 3; k++) {
      box[k] = Math.min(box[k], bbox[k]);
      box[k + 3] = Math.max(box[k + 3], bbox[k + 3]);
    }
  }
  return structures.length ? box : [-0.3, 0, -0.2, 0.3, 1.8, 0.2];
}

// The structure objects in a loaded model, keyed by id.
function structureObjects(root: THREE.Object3D, known: Map<string, Structure>) {
  const found = new Map<string, THREE.Object3D>();
  root.traverse((object) => {
    if (known.has(object.name) && !found.has(object.name)) found.set(object.name, object);
  });
  // Hidden until applyVisibility colours them, so nothing flashes in the
  // loader's default grey; meshes outside any known structure stay hidden.
  const structures = new Set(found.values());
  root.traverse((object) => {
    if (structures.has(object)) object.visible = false;
    else if (object instanceof THREE.Mesh) {
      let owned = false;
      for (let p = object.parent; p && !owned; p = p.parent) owned = structures.has(p);
      if (!owned) object.visible = false;
    }
  });
  return found;
}

type Registry = {
  objects: Map<string, Map<string, THREE.Object3D>>; // model url → id → object
  ranks: Map<string, number>; // model url → detail rank
};

function applyVisibility(
  registry: Registry,
  visible: Set<string>,
  state: ExplorerState,
  byId: Map<string, Structure>,
  materials: MaterialCache,
) {
  const best = new Map<string, number>();
  for (const [url, objects] of registry.objects) {
    const rank = registry.ranks.get(url)!;
    for (const id of objects.keys()) best.set(id, Math.max(best.get(id) ?? -1, rank));
  }
  for (const [url, objects] of registry.objects) {
    const rank = registry.ranks.get(url)!;
    for (const [id, object] of objects) {
      object.visible = visible.has(id) && best.get(id) === rank;
      if (!object.visible) continue;
      const material = materials.get(byId.get(id)!, id === state.selectedId, state.xray, object);
      object.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = material;
          // See-through skin and fascia draw after everything under them.
          child.renderOrder = material.transparent ? 1 : 0;
        }
      });
    }
  }
}

type SceneProps = {
  catalogue: Catalogue;
  modelBaseUrl: string;
  state: ExplorerState;
  onSelect: (id: string | null) => void;
  onLoadError: (chunkId: string, retry: () => void) => void;
};

export function BodyScene(props: SceneProps) {
  const [lod] = useState<Lod>(() => preferredLod(currentDeviceHints()));
  const [quality, setQuality] = useState<Quality>(lod === "high" ? "high" : lod === "medium" ? "balanced" : "standard");
  return (
    <Canvas
      frameloop="demand"
      dpr={QUALITY[quality].dpr}
      camera={{ fov: FOV, near: 0.01, far: 50, position: [0, 1, 3] }}
      style={{ touchAction: "none" }}
      onCreated={({ gl }) => {
        // Neutral keeps tissue colours true; the default (ACES) muddies reds.
        gl.toneMapping = THREE.NeutralToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
    >
      <PerformanceMonitor flipflops={2} onDecline={() => setQuality((q) => LOWER[q])} />
      <StudioLighting />
      <SceneContent {...props} lod={lod} quality={quality} />
    </Canvas>
  );
}

// A soft photo-studio light: a large key panel above and in front, fill from
// the sides, a rim from behind, baked once into an environment map (nothing
// is downloaded), plus one gentle directional light for definition.
function StudioLighting() {
  return (
    <>
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={3} position={[0, 4, 4]} scale={[6, 4, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[-5, 1.5, 1]} rotation-y={Math.PI / 2} scale={[4, 3, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[5, 1.5, 1]} rotation-y={-Math.PI / 2} scale={[4, 3, 1]} />
        <Lightformer form="rect" intensity={1.6} position={[0, 2, -5]} scale={[6, 3, 1]} />
        <Lightformer form="circle" intensity={0.4} position={[0, -4, 0]} rotation-x={-Math.PI / 2} scale={6} />
      </Environment>
      <directionalLight position={[1.5, 3, 2.5]} intensity={0.8} />
    </>
  );
}

function SceneContent({
  catalogue,
  modelBaseUrl,
  state,
  onSelect,
  onLoadError,
  lod,
  quality,
}: SceneProps & { lod: Lod; quality: Quality }) {
  const invalidate = useThree((s) => s.invalidate);
  const byId = useMemo(() => new Map(catalogue.structures.map((s) => [s.id, s])), [catalogue]);
  const visible = useMemo(() => visibleStructureIds(catalogue, state), [catalogue, state]);
  const materials = useMemo(() => new MaterialCache(quality), [quality]);
  useEffect(() => () => materials.dispose(), [materials]);
  const body = useMemo(() => unionBbox(catalogue.structures), [catalogue]);
  const registry = useRef<Registry>({ objects: new Map(), ranks: new Map() });
  const [loadedCount, setLoadedCount] = useState(0);

  const chunkUrls = useMemo(() => {
    const visibleChunks = new Set<string>();
    for (const id of visible) {
      const s = byId.get(id);
      if (s) visibleChunks.add(s.chunk);
    }
    const selected = state.selectedId ? byId.get(state.selectedId) : undefined;
    const urls: { chunkId: string; url: string; rank: number }[] = [];
    const add = (chunkId: string, level: Lod) =>
      urls.push({
        chunkId,
        url: `${modelBaseUrl}/chunks/${chunkId}/${level}.glb`,
        rank: RANK[level],
      });
    for (const chunk of catalogue.chunks) {
      if (!visibleChunks.has(chunk.id)) continue;
      // The overview already shows these systems roughly; others get a quick
      // low-detail pass while the full level loads.
      if (lod !== "low" && !OVERVIEW_SYSTEMS.includes(chunk.system)) add(chunk.id, "low");
      add(chunk.id, chunk.id === selected?.chunk && lod === "low" ? "medium" : lod);
    }
    return urls;
  }, [catalogue, byId, visible, state.selectedId, modelBaseUrl, lod]);

  const register = useCallback((url: string, rank: number, objects: Map<string, THREE.Object3D> | null) => {
    if (objects) {
      registry.current.objects.set(url, objects);
      registry.current.ranks.set(url, rank);
    } else {
      registry.current.objects.delete(url);
      registry.current.ranks.delete(url);
    }
    setLoadedCount((n) => n + 1);
  }, []);

  // Show each visible structure's best loaded copy; hide everything else.
  useEffect(() => {
    applyVisibility(registry.current, visible, state, byId, materials);
    invalidate();
  }, [visible, state, loadedCount, byId, materials, invalidate]);

  return (
    <>
      <Suspense fallback={null}>
        <Model url={`${modelBaseUrl}/overview.glb`} rank={RANK.overview} known={byId} register={register} />
      </Suspense>
      {chunkUrls.map(({ chunkId, url, rank }) => (
        <ChunkBoundary key={url} url={url} chunkId={chunkId} onLoadError={onLoadError}>
          <Suspense fallback={null}>
            <Model url={url} rank={rank} known={byId} register={register} />
          </Suspense>
        </ChunkBoundary>
      ))}
      {QUALITY[quality].floorShadow && (
        /* Re-baked whenever what's on screen changes, not every frame. */
        <ContactShadows
          key={`${loadedCount}-${visible.size}`}
          frames={1}
          position={[0, body[1] - 0.002, 0]}
          scale={2.4}
          blur={2.5}
          far={1.2}
          opacity={0.35}
          resolution={512}
        />
      )}
      {QUALITY[quality].ao && (
        <EffectComposer multisampling={quality === "high" ? 4 : 0}>
          <N8AO
            aoRadius={0.05}
            distanceFalloff={0.6}
            intensity={2.4}
            quality={quality === "high" ? "medium" : "performance"}
            halfRes={quality !== "high"}
          />
        </EffectComposer>
      )}
      <TapPicker registry={registry} visible={visible} onSelect={onSelect} />
      <CameraRig catalogue={catalogue} byId={byId} selectedId={state.selectedId} resetCount={state.resetCount} />
    </>
  );
}

function Model({
  url,
  rank,
  known,
  register,
}: {
  url: string;
  rank: number;
  known: Map<string, Structure>;
  register: (url: string, rank: number, objects: Map<string, THREE.Object3D> | null) => void;
}) {
  const { scene } = useGLTF(url, false, true);
  useEffect(() => {
    register(url, rank, structureObjects(scene, known));
    return () => register(url, rank, null);
  }, [scene, url, rank, known, register]);
  return <primitive object={scene} />;
}

type BoundaryProps = {
  url: string;
  chunkId: string;
  onLoadError: SceneProps["onLoadError"];
  children: ReactNode;
};

// A chunk that fails to load is reported once, with a retry, and never takes
// the rest of the scene down with it.
class ChunkBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onLoadError(this.props.chunkId, () => {
      useGLTF.clear(this.props.url);
      this.setState({ failed: false });
    });
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// A tap (pointer down and up without dragging) selects the nearest visible
// structure, or clears the selection on empty space. Drags belong to the
// orbit controls.
function TapPicker({
  registry,
  visible,
  onSelect,
}: {
  registry: React.RefObject<Registry>;
  visible: Set<string>;
  onSelect: (id: string | null) => void;
}) {
  const { gl, camera } = useThree();
  const latest = useRef({ visible, onSelect });
  useEffect(() => {
    latest.current = { visible, onSelect };
  }, [visible, onSelect]);

  useEffect(() => {
    const el = gl.domElement;
    const raycaster = new THREE.Raycaster();
    let down: { x: number; y: number; id: number } | null = null;

    const onDown = (e: PointerEvent) => {
      down = e.isPrimary ? { x: e.clientX, y: e.clientY, id: e.pointerId } : null;
    };
    const onUp = (e: PointerEvent) => {
      if (!down || down.id !== e.pointerId) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved > TAP_SLOP_PX) return;

      const rect = el.getBoundingClientRect();
      const pointer = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const candidates: { id: string; object: THREE.Object3D }[] = [];
      for (const objects of registry.current.objects.values()) {
        for (const [id, object] of objects) {
          if (object.visible && latest.current.visible.has(id)) candidates.push({ id, object });
        }
      }
      let nearest: { id: string; distance: number } | null = null;
      for (const { id, object } of candidates) {
        const hit = raycaster.intersectObject(object, true)[0];
        if (hit && (!nearest || hit.distance < nearest.distance)) nearest = { id, distance: hit.distance };
      }
      latest.current.onSelect(nearest?.id ?? null);
    };
    const onCancel = () => {
      down = null;
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onCancel);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onCancel);
    };
  }, [gl, camera, registry]);

  return null;
}

// Orbit controls, plus a 600 ms glide to frame the selection (keeping the
// current viewing angle) or, on reset, the whole body from the front.
function CameraRig({
  catalogue,
  byId,
  selectedId,
  resetCount,
}: {
  catalogue: Catalogue;
  byId: Map<string, Structure>;
  selectedId: string | null;
  resetCount: number;
}) {
  const { camera, size, invalidate } = useThree();
  const controls = useRef<OrbitControlsImpl>(null);
  const body = useMemo(() => unionBbox(catalogue.structures), [catalogue]);
  const flight = useRef<{
    start: number;
    fromPos: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toPos: THREE.Vector3;
    toTarget: THREE.Vector3;
  } | null>(null);
  const framedOnce = useRef(false);

  const flyTo = useCallback(
    (bbox: Bbox, keepAngle: boolean, instant: boolean) => {
      const perspective = camera as THREE.PerspectiveCamera;
      const framing = framingFor(atLeast(bbox, MIN_FRAME_M), perspective.fov, size.width / Math.max(size.height, 1));
      const toTarget = new THREE.Vector3(...framing.target);
      let toPos = new THREE.Vector3(...framing.position);
      const current = controls.current?.target ?? new THREE.Vector3();
      if (keepAngle) {
        const distance = toPos.distanceTo(toTarget);
        const direction = camera.position.clone().sub(current).normalize();
        toPos = toTarget.clone().add(direction.multiplyScalar(distance));
      }
      if (instant) {
        camera.position.copy(toPos);
        controls.current?.target.copy(toTarget);
        controls.current?.update();
      } else {
        flight.current = {
          start: performance.now(),
          fromPos: camera.position.clone(),
          fromTarget: current.clone(),
          toPos,
          toTarget,
        };
      }
      invalidate();
    },
    [camera, size, invalidate],
  );

  useEffect(() => {
    if (framedOnce.current) return;
    framedOnce.current = true;
    flyTo(body, false, true);
  }, [body, flyTo]);

  useEffect(() => {
    const selected = selectedId ? byId.get(selectedId) : undefined;
    if (selected) flyTo(selected.bbox, true, false);
  }, [selectedId, byId, flyTo]);

  useEffect(() => {
    if (resetCount > 0) flyTo(body, false, false);
  }, [resetCount, body, flyTo]);

  useFrame(() => {
    const f = flight.current;
    if (!f || !controls.current) return;
    const t = Math.min((performance.now() - f.start) / ANIMATION_MS, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    camera.position.lerpVectors(f.fromPos, f.toPos, eased);
    controls.current.target.lerpVectors(f.fromTarget, f.toTarget, eased);
    controls.current.update();
    if (t < 1) invalidate();
    else flight.current = null;
  });

  return <OrbitControls ref={controls} makeDefault enableDamping zoomToCursor minDistance={0.05} maxDistance={8} />;
}
