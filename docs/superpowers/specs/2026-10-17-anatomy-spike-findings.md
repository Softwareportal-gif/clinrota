# Anatomy Body Explorer: model findings (Task 0)

Source: `Z-Anatomy_Template.zip` → `Z-Anatomy.zip` → `Z-Anatomy/Startup.blend` (305 MB, dated 2023-05-02), surveyed with Blender 5.4 Alpha with embedded scripts disabled (the file carries a `z-anatomy.py` script, which was skipped).

## Licence and credit

The bundled `License.txt` asks for both sources to be credited:

- "BodyParts3D - The Database Center for Life Science - CC-BY-SA 2.1 Japan"
- "Z-Anatomy - The open source atlas of anatomy - CC-BY-SA 4.0"

The explorer's credit line now names both (the plan's shorter line left out BodyParts3D's licence).

## How the file is organised

- 7,184 objects: 4,569 meshes, 951 curves, 1,660 text labels, plus lights and a camera. About 4.1 million triangles. Metric, scale 1, body about 1.8 m tall, Z up, facing −Y.
- Systems are numbered top-level collections: `1: Skeletal system`, `2: Muscular insertions`, `3: Joints`, `4: Muscular system`, `5: Cardiovascular system`, `6: Lymphoid organs`, `7: Nervous system & Sense organs`, `8: Visceral systems`, `9: Regions of human body`. There are also reference lines, cross-section planes and a "Bonus collection" of alternate copies.
- Objects sit flat in each collection. Names ending `.g` / `.j` are empty heading labels (no triangles, hidden from render), **not** parents, so the file has no usable region tree.
- Names are English. `.l` / `.r` mark left and right. Parentheses mark sub-parts. `.i` marks bony-landmark overlays. There are **no Latin names or FMA ids** in object properties.
- Vessels and nerves are mostly bevelled **curves** (the cardiovascular collection has 654 curves and 60 meshes).
- There are about 1,600 embedded text blocks named after structures: likely descriptions, worth reviewing for the info cards (step 3).

## What the export does about it

`scripts/anatomy/export-z-anatomy.py`:

- **System mapping:**
  - Skeletal and Joints → skeletal
  - Muscular → muscular
  - Cardiovascular → cardiovascular
  - Lymphoid organs → lymphatic
  - Nervous & sense organs → nervous
  - Regions of human body → integumentary (the skin surface)
  - Visceral → split by name into respiratory, digestive, urinary, reproductive and endocrine
- **Skipped:** muscle insertions, `.i` landmarks, heading labels, text, the Bonus copies and the reference/cross-section objects.
- **Region:** taken from the structure's position in the body: head-neck, thorax, abdomen, pelvis, upper-limb or lower-limb.
- **Meshes:** each object is written from its evaluated mesh, so curves and modifiers become triangles. A minimal GLB writer is used because it's fast (≈70 s for the whole atlas).

The result: **3,169 structures**, and `npm run anatomy:validate` reports 0 errors.

## Build sizes (`anatomy:build`, simplify ratios low 0.1 / medium 0.35 / high 1)

| | Size |
|---|---|
| Build time | 64 s |
| Chunks | 48 (system × region) |
| Overview (skin + skeleton at 0.05) | **1.42 MB** (target ≤ 5 MB ✓) |
| First view: overview + skeleton and skin at low | **3.3 MB** |
| catalogue.json | 1.0 MB (compresses well in transit) |
| Low, all chunks | 10.8 MB; largest 1.27 MB |
| Medium, all chunks | 27.2 MB; largest 3.59 MB (cardiovascular/head-neck), so no chunk > 5 MB and no split needed |
| High, all chunks | 62.5 MB; largest 8.37 MB (laptops only) |

## Still to measure

- First-view load time on a mid-range Android over 4G (target ≈ 5 s).
- Frame rate while rotating at medium detail (target ≥ 30 fps).

## Known rough edges

- **Visceral split by name is approximate.** A few organs may land in a neighbouring system (e.g. one urinary structure was placed in the thorax region by position). Expert review in step 3 should check the mapping.
- **Region boundaries are approximate.** They are fixed heights (head-neck above 1.45 m, upper limb beyond 19 cm from the midline). This only affects which chunk a structure loads with, not what students see.
