"""Export Z-Anatomy to the intermediate anatomy-source/ format.

Run inside Blender (4.x):
    blender Z-Anatomy.blend --background --python scripts/anatomy/export-z-anatomy.py -- <outDir>

Writes <outDir>/meshes/<id>.glb (one mesh per structure, Y up) and
<outDir>/structures.csv with the header
    id,name,latin,synonyms,system,region,parent_id,fma_id
then prints any top-level collection it could not map to a Praxxt system,
so the mapping below can be completed. Validate the result with
    npm run anatomy:validate -- <outDir>

The collection names, custom-property names and unit scale below must be
confirmed against the downloaded file (plan Task 0); the script refuses to
guess and reports what it skipped.
"""

import csv
import os
import re
import sys

import bpy

# Top-level Z-Anatomy collection name (lower-case substring) -> Praxxt system.
# Checked in order; the first match wins.
SYSTEM_MAP = [
    ("skelet", "skeletal"),
    ("bone", "skeletal"),
    ("muscul", "muscular"),
    ("muscle", "muscular"),
    ("cardio", "cardiovascular"),
    ("vascular", "cardiovascular"),
    ("lymph", "lymphatic"),
    ("nerv", "nervous"),
    ("respir", "respiratory"),
    ("digest", "digestive"),
    ("urin", "urinary"),
    ("reproduct", "reproductive"),
    ("genital", "reproductive"),
    ("endocrin", "endocrine"),
    ("integument", "integumentary"),
    ("skin", "integumentary"),
]

PROP_LATIN = "latin"  # custom property holding the Latin name, if present
PROP_FMA = "FMA"  # custom property holding the FMA id, if present
UNIT_SCALE = 1.0  # multiply to get metres (confirm in Task 0)


def slugify(text):
    text = text.lower()
    text = re.sub(r"\.(l|left)$", "-left", text)
    text = re.sub(r"\.(r|right)$", "-right", text)
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def display_name(obj_name):
    name = re.sub(r"\.(l|r)$", lambda m: " (left)" if m.group(1) == "l" else " (right)", obj_name)
    return re.sub(r"\.\d{3}$", "", name).strip()


def system_for(collection_name):
    lowered = collection_name.lower()
    for needle, system in SYSTEM_MAP:
        if needle in lowered:
            return system
    return None


def walk(collection, system, region, rows, taken, out_dir):
    for obj in collection.objects:
        if obj.type != "MESH":
            continue
        base = slugify(obj.name) or "structure"
        sid, n = base, 2
        while sid in taken:
            sid, n = f"{base}-{n}", n + 1
        taken.add(sid)

        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.export_scene.gltf(
            filepath=os.path.join(out_dir, "meshes", f"{sid}.glb"),
            export_format="GLB",
            use_selection=True,
            export_apply=True,
            export_yup=True,
            export_materials="NONE",
        )
        rows.append(
            {
                "id": sid,
                "name": display_name(obj.name),
                "latin": str(obj.get(PROP_LATIN, "")),
                "synonyms": "",
                "system": system,
                "region": region,
                "parent_id": "",
                "fma_id": str(obj.get(PROP_FMA, "")),
            }
        )
    for child in collection.children:
        walk(child, system, region, rows, taken, out_dir)


def main():
    out_dir = sys.argv[sys.argv.index("--") + 1]
    os.makedirs(os.path.join(out_dir, "meshes"), exist_ok=True)
    if UNIT_SCALE != 1.0:
        bpy.context.scene.unit_settings.scale_length = UNIT_SCALE

    rows, taken, unmapped = [], set(), []
    for top in bpy.context.scene.collection.children:
        system = system_for(top.name)
        if not system:
            unmapped.append(top.name)
            continue
        for region_collection in top.children or [top]:
            walk(region_collection, system, slugify(region_collection.name) or "general", rows, taken, out_dir)

    with open(os.path.join(out_dir, "structures.csv"), "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["id", "name", "latin", "synonyms", "system", "region", "parent_id", "fma_id"])
        writer.writeheader()
        writer.writerows(rows)

    print(f"Exported {len(rows)} structures to {out_dir}")
    for name in unmapped:
        print(f"UNMAPPED top-level collection (add to SYSTEM_MAP or ignore): {name}")


main()
