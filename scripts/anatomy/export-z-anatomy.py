"""Export Z-Anatomy to the intermediate anatomy-source/ format.

Run inside Blender (tested with 5.4) with embedded scripts disabled:
    blender --background --factory-startup --disable-autoexec <Startup.blend> \
        --python scripts/anatomy/export-z-anatomy.py -- <outDir>

Writes <outDir>/meshes/<id>.glb (one mesh per structure, metres, Y up, body
facing +Z) and <outDir>/structures.csv with the header
    id,name,latin,synonyms,system,region,parent_id,fma_id
Validate the result with  npm run anatomy:validate -- <outDir>

What the Task 0 survey found in Z-Anatomy's Startup.blend, and what this
script does about it:
- Systems are numbered top-level collections ("1: Skeletal system", ...).
  SYSTEM_MAP maps them; "8: Visceral systems" is split by name (VISCERAL_RULES).
- Objects sit flat in each collection; ".g"/".j" objects are empty heading
  labels, not parents. So the region is worked out from where the structure
  sits in the body (region_for), which is also what chunked loading needs.
- Names are English, ".l"/".r" mark left/right; there are no Latin names or
  FMA ids. Overlays (".i" bony landmarks, muscle insertions) are skipped.
- Vessels and nerves are bevelled curves: every object is exported from its
  evaluated mesh, so curves and modifiers come out as triangles.
"""

import csv
import json
import os
import re
import struct
import sys

import bpy
import numpy as np

# Numbered collection (after "N: ") -> Praxxt system, or "visceral" to split
# by name. Collections not listed are skipped.
SYSTEM_MAP = {
    "Skeletal system": "skeletal",
    "Joints": "skeletal",
    "Muscular system": "muscular",
    "Cardiovascular system": "cardiovascular",
    "Lymphoid organs": "lymphatic",
    "Nervous system & Sense organs": "nervous",
    "Visceral systems": "visceral",
    "Regions of human body": "integumentary",
}

# First match wins; anything else in the visceral collection is digestive.
VISCERAL_RULES = [
    ("endocrine", r"thyroid|parathyroid|adrenal|suprarenal|pituitary|hypophys|pineal|endocrine|islet"),
    ("urinary", r"kidney|renal|ureter|urinary|bladder|urethra|nephr"),
    ("reproductive", r"testis|testic|epididym|ovar|uter|vagin|vulva|prostat|penis|penile|scrot|seminal|ductus deferens|clitor|labium|fallopian|mammary|breast|spermatic"),
    ("respiratory", r"lung|bronch|trache|laryn|pleura|nasal|nose|pharyn|epiglott|alveol|lobe of .* lung"),
]

SKIP_SUFFIXES = {"g", "j", "i"}  # heading labels and bony-landmark overlays

# Everyday names for search ("breastbone" finds the sternum). Z-Anatomy has
# none, so they're added here by pattern on the structure's name.
SYNONYM_RULES = [
    (r"\bsternum\b", ["Breastbone"]),
    (r"\bclavicle\b", ["Collarbone"]),
    (r"\bscapula\b", ["Shoulder blade"]),
    (r"\bpatella\b", ["Kneecap"]),
    (r"\bfemur\b", ["Thigh bone"]),
    (r"\btibia\b", ["Shin bone"]),
    (r"\bfibula\b", ["Calf bone"]),
    (r"\bhumerus\b", ["Upper arm bone"]),
    (r"\b(radius|ulna)\b", ["Forearm bone"]),
    (r"\bmandible\b", ["Jawbone", "Lower jaw"]),
    (r"\bmaxilla\b", ["Upper jaw"]),
    (r"\bzygomatic bone\b", ["Cheekbone"]),
    (r"\bcoccyx\b", ["Tailbone"]),
    (r"\bcalcaneus\b", ["Heel bone"]),
    (r"\bvertebra", ["Backbone", "Spine"]),
    (r"\b(cranium|skull)\b", ["Skull"]),
    (r"\bphalan", ["Finger or toe bone"]),
    (r"\blarynx\b", ["Voice box"]),
    (r"\btrachea\b", ["Windpipe"]),
    (r"\b(oesophagus|esophagus)\b", ["Gullet", "Food pipe"]),
    (r"\bpharynx\b", ["Throat"]),
    (r"\btympanic membrane\b", ["Eardrum"]),
    (r"\bauricle\b", ["Outer ear"]),
    (r"\bcalcaneal tendon\b", ["Achilles tendon"]),
    (r"\bgluteus maximus\b", ["Buttock muscle"]),
    (r"\bbiceps brachii\b", ["Biceps"]),
    (r"\btriceps brachii\b", ["Triceps"]),
    (r"\b(rectus femoris|vastus)\b", ["Quadriceps", "Quads"]),
    (r"\b(biceps femoris|semitendinosus|semimembranosus)\b", ["Hamstring"]),
    (r"\bgastrocnemius\b", ["Calf muscle"]),
    (r"\bpectoralis major\b", ["Chest muscle", "Pecs"]),
    (r"\blatissimus dorsi\b", ["Lats"]),
    (r"\bdeltoid\b", ["Shoulder muscle"]),
    (r"\brectus abdominis\b", ["Abs", "Six-pack"]),
    (r"\bhepar\b|\bliver\b", ["Liver"]),
    (r"\bcerebrum\b", ["Brain"]),
]


def synonyms_for(name):
    lowered = name.lower()
    found = []
    for pattern, names in SYNONYM_RULES:
        if re.search(pattern, lowered):
            found += [n for n in names if n.lower() not in lowered and n not in found]
    return "|".join(found)


def system_for(collection_name, object_name):
    title = re.sub(r"^\d+:\s*", "", collection_name)
    system = SYSTEM_MAP.get(title)
    if system != "visceral":
        return system
    lowered = object_name.lower()
    for target, pattern in VISCERAL_RULES:
        if re.search(pattern, lowered):
            return target
    return "digestive"


def region_for(centre):
    """Body region from a structure's centre, in Blender coordinates (Z up)."""
    x, _, z = centre
    if z > 1.45:
        return "head-neck"
    if abs(x) > 0.19 and z > 0.75:
        return "upper-limb"
    if z < 0.78 and abs(x) > 0.05:
        return "lower-limb"
    if z > 1.12:
        return "thorax"
    if z > 0.95:
        return "abdomen"
    return "pelvis"


def split_name(obj_name):
    """('Brachial nodes', 'right') from 'Brachial nodes.r'."""
    base, _, suffix = obj_name.strip().rpartition(".")
    if not base:
        return obj_name.strip(), None, ""
    side = {"l": "left", "r": "right"}.get(suffix[-1:]) if re.fullmatch(r"[a-z]*\d*[lr]?", suffix) else None
    return base.strip(), side, suffix


def slugify(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def write_glb(path, positions, indices):
    """A minimal glTF 2.0 binary: one node, one mesh, positions + indices."""
    pos = positions.astype("<f4").tobytes()
    idx = indices.astype("<u4").tobytes()
    lo, hi = positions.min(axis=0).tolist(), positions.max(axis=0).tolist()
    gltf = {
        "asset": {"version": "2.0", "generator": "praxxt export-z-anatomy"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": os.path.basename(path)[:-4]}],
        "meshes": [{"primitives": [{"attributes": {"POSITION": 0}, "indices": 1}]}],
        "buffers": [{"byteLength": len(pos) + len(idx)}],
        "bufferViews": [
            {"buffer": 0, "byteOffset": 0, "byteLength": len(pos), "target": 34962},
            {"buffer": 0, "byteOffset": len(pos), "byteLength": len(idx), "target": 34963},
        ],
        "accessors": [
            {"bufferView": 0, "componentType": 5126, "count": len(positions), "type": "VEC3", "min": lo, "max": hi},
            {"bufferView": 1, "componentType": 5125, "count": len(indices), "type": "SCALAR"},
        ],
    }
    js = json.dumps(gltf, separators=(",", ":")).encode()
    js += b" " * (-len(js) % 4)
    binary = pos + idx
    binary += b"\0" * (-len(binary) % 4)
    total = 12 + 8 + len(js) + 8 + len(binary)
    with open(path, "wb") as f:
        f.write(struct.pack("<III", 0x46546C67, 2, total))
        f.write(struct.pack("<II", len(js), 0x4E4F534A) + js)
        f.write(struct.pack("<II", len(binary), 0x004E4942) + binary)


def evaluated_triangles(obj, depsgraph):
    """World-space vertices (Blender coords) and triangle indices, or None."""
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    try:
        mesh.calc_loop_triangles()
        if not mesh.loop_triangles:
            return None
        co = np.empty(len(mesh.vertices) * 3, dtype=np.float64)
        mesh.vertices.foreach_get("co", co)
        co = co.reshape(-1, 3)
        tri = np.empty(len(mesh.loop_triangles) * 3, dtype=np.int64)
        mesh.loop_triangles.foreach_get("vertices", tri)
        m = np.array(evaluated.matrix_world)
        world = co @ m[:3, :3].T + m[:3, 3]
        # Mirrored objects (one side of the body is a negative-scale copy of
        # the other) flip each triangle's facing when the transform is baked
        # in; turn them back so faces point outward, or the viewer culls them
        # and the structure looks hollow.
        if np.linalg.det(m[:3, :3]) < 0:
            tri = tri.reshape(-1, 3)[:, ::-1].reshape(-1)
        return world, tri
    finally:
        evaluated.to_mesh_clear()


def main():
    out_dir = sys.argv[sys.argv.index("--") + 1]
    os.makedirs(os.path.join(out_dir, "meshes"), exist_ok=True)
    depsgraph = bpy.context.evaluated_depsgraph_get()

    rows, taken, skipped, seen = [], set(), {}, set()
    for top in bpy.context.scene.collection.children:
        if not re.match(r"^\d+:", top.name):
            continue
        for obj in top.all_objects:
            if obj.type not in {"MESH", "CURVE", "SURFACE"} or obj.name in seen:
                continue
            seen.add(obj.name)
            name, side, suffix = split_name(obj.name)
            system = system_for(top.name, obj.name)
            if not system or suffix in SKIP_SUFFIXES:
                skipped[top.name] = skipped.get(top.name, 0) + 1
                continue
            geometry = evaluated_triangles(obj, depsgraph)
            if geometry is None:
                skipped[top.name] = skipped.get(top.name, 0) + 1
                continue
            world, tri = geometry
            centre = (world.min(axis=0) + world.max(axis=0)) / 2

            display = name.strip("() ").strip()
            if side:
                display = f"{display} ({side})"
            base = slugify(display) or "structure"
            sid, n = base, 2
            while sid in taken:
                sid, n = f"{base}-{n}", n + 1
            taken.add(sid)

            # Blender is Z up with the body facing -Y; glTF is Y up, facing +Z.
            gltf_positions = np.stack([world[:, 0], world[:, 2], -world[:, 1]], axis=1)
            write_glb(os.path.join(out_dir, "meshes", f"{sid}.glb"), gltf_positions, tri)
            rows.append(
                {
                    "id": sid,
                    "name": display,
                    "latin": "",
                    "synonyms": synonyms_for(display),
                    "system": system,
                    "region": region_for(centre),
                    "parent_id": "",
                    "fma_id": "",
                }
            )

    with open(os.path.join(out_dir, "structures.csv"), "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["id", "name", "latin", "synonyms", "system", "region", "parent_id", "fma_id"])
        writer.writeheader()
        writer.writerows(rows)

    print(f"Exported {len(rows)} structures to {out_dir}")
    counts = {}
    for r in rows:
        key = f"{r['system']}/{r['region']}"
        counts[key] = counts.get(key, 0) + 1
    for key in sorted(counts):
        print(f"  {key}: {counts[key]}")
    print("Skipped per collection:", skipped)


main()
