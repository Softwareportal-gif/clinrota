"use client";

// The Body Explorer's 3D view. Loads the light overview model first, then the
// low-detail chunk of every system on screen and the medium-detail chunk of
// the selected structure; each structure shows its most detailed loaded copy.
// Meshes are matched to the catalogue by node name (the structure id); nodes
// the catalogue doesn't know are ignored.
import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { framingFor } from "@/lib/anatomy/camera";
import type { AnatomySystem, Bbox, Catalogue, Structure } from "@/lib/anatomy/catalogue";
import { visibleStructureIds, type ExplorerState } from "@/lib/anatomy/explorer-state";
import { SYSTEM_COLOURS } from "./system-labels";

const FOV = 50;
const ANIMATION_MS = 600;
const TAP_SLOP_PX = 6;
const HIGHLIGHT = "#5A3BF0";
// Small structures are framed with some of their surroundings, so the camera
// never zooms in so far that you lose your bearings.
const MIN_FRAME_M = 0.3;

// Detail ranks: a structure shows the highest-ranked copy that has loaded.
const RANK = { overview: 0, low: 1, medium: 2 } as const;

function makeMaterials() {
  const base = {} as Record<AnatomySystem, THREE.MeshStandardMaterial>;
  const selected = {} as Record<AnatomySystem, THREE.MeshStandardMaterial>;
  for (const [system, colour] of Object.entries(SYSTEM_COLOURS) as [AnatomySystem, string][]) {
    const skin = system === "integumentary";
    base[system] = new THREE.MeshStandardMaterial({
      color: colour,
      roughness: 0.7,
      transparent: skin,
      opacity: skin ? 0.45 : 1,
      depthWrite: !skin,
    });
    selected[system] = base[system].clone();
    selected[system].emissive = new THREE.Color(HIGHLIGHT);
    selected[system].emissiveIntensity = 0.6;
  }
  return { base, selected };
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

type Materials = ReturnType<typeof makeMaterials>;

type Registry = {
  objects: Map<string, Map<string, THREE.Object3D>>; // model url → id → object
  ranks: Map<string, number>; // model url → detail rank
};

function applyVisibility(
  registry: Registry,
  visible: Set<string>,
  selectedId: string | null,
  byId: Map<string, Structure>,
  materials: Materials
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
      const { system } = byId.get(id)!;
      const material = id === selectedId ? materials.selected[system] : materials.base[system];
      object.traverse((child) => {
        if (child instanceof THREE.Mesh) child.material = material;
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
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ fov: FOV, near: 0.01, far: 50, position: [0, 1, 3] }}
      style={{ touchAction: "none" }}
    >
      <hemisphereLight args={["#ffffff", "#8a8a9a", 1.1]} />
      <directionalLight position={[2, 3, 4]} intensity={1.4} />
      <directionalLight position={[-3, 2, -3]} intensity={0.6} />
      <SceneContent {...props} />
    </Canvas>
  );
}

function SceneContent({ catalogue, modelBaseUrl, state, onSelect, onLoadError }: SceneProps) {
  const invalidate = useThree((s) => s.invalidate);
  const byId = useMemo(() => new Map(catalogue.structures.map((s) => [s.id, s])), [catalogue]);
  const visible = useMemo(() => visibleStructureIds(catalogue, state), [catalogue, state]);
  const materials = useMemo(() => makeMaterials(), []);
  const registry = useRef<Registry>({ objects: new Map(), ranks: new Map() });
  const [loadedCount, setLoadedCount] = useState(0);

  const chunkUrls = useMemo(() => {
    const visibleChunks = new Set<string>();
    for (const id of visible) {
      const s = byId.get(id);
      if (s) visibleChunks.add(s.chunk);
    }
    const urls: { chunkId: string; url: string; rank: number }[] = catalogue.chunks
      .filter((c) => visibleChunks.has(c.id))
      .map((c) => ({ chunkId: c.id, url: `${modelBaseUrl}/chunks/${c.id}/low.glb`, rank: RANK.low }));
    const selected = state.selectedId ? byId.get(state.selectedId) : undefined;
    if (selected) {
      urls.push({ chunkId: selected.chunk, url: `${modelBaseUrl}/chunks/${selected.chunk}/medium.glb`, rank: RANK.medium });
    }
    return urls;
  }, [catalogue, byId, visible, state.selectedId, modelBaseUrl]);

  const register = useCallback(
    (url: string, rank: number, objects: Map<string, THREE.Object3D> | null) => {
      if (objects) {
        registry.current.objects.set(url, objects);
        registry.current.ranks.set(url, rank);
      } else {
        registry.current.objects.delete(url);
        registry.current.ranks.delete(url);
      }
      setLoadedCount((n) => n + 1);
    },
    []
  );

  // Show each visible structure's best loaded copy; hide everything else.
  useEffect(() => {
    applyVisibility(registry.current, visible, state.selectedId, byId, materials);
    invalidate();
  }, [visible, state.selectedId, loadedCount, byId, materials, invalidate]);

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

type BoundaryProps = { url: string; chunkId: string; onLoadError: SceneProps["onLoadError"]; children: ReactNode };

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
        -((e.clientY - rect.top) / rect.height) * 2 + 1
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
    [camera, size, invalidate]
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

  return <OrbitControls ref={controls} makeDefault enableDamping minDistance={0.05} maxDistance={8} />;
}
