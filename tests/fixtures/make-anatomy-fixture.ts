// Writes tests/fixtures/anatomy-source/: a tiny stand-in for the Z-Anatomy
// export (three UV spheres and their structures.csv), in the intermediate
// format the anatomy pipeline reads. Run with:
//   npx tsx tests/fixtures/make-anatomy-fixture.ts
// The output is committed so tests don't regenerate it.
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { Document, NodeIO } from "@gltf-transform/core";

const OUT = path.join(__dirname, "anatomy-source");

const SPHERES = [
  { id: "sternum", centre: [0, 1.3, 0.1], radius: 0.05 },
  { id: "deltoid", centre: [0.2, 1.45, 0], radius: 0.06 },
  { id: "heart", centre: [-0.03, 1.25, 0.05], radius: 0.07 },
];

const CSV = `id,name,latin,synonyms,system,region,parent_id,fma_id
sternum,Sternum,Sternum,Breastbone,skeletal,thorax,,7485
deltoid,Deltoid,Musculus deltoideus,Deltoid muscle|Deltoideus,muscular,upper-limb,,32521
heart,Heart,Cor,,cardiovascular,thorax,,7088
`;

function uvSphere(centre: number[], radius: number, segments = 32, rings = 16) {
  const positions: number[] = [];
  for (let r = 0; r <= rings; r++) {
    const phi = (r / rings) * Math.PI;
    for (let s = 0; s <= segments; s++) {
      const theta = (s / segments) * 2 * Math.PI;
      positions.push(
        centre[0] + radius * Math.sin(phi) * Math.cos(theta),
        centre[1] + radius * Math.cos(phi),
        centre[2] + radius * Math.sin(phi) * Math.sin(theta)
      );
    }
  }
  const indices: number[] = [];
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < segments; s++) {
      const a = r * (segments + 1) + s;
      const b = a + segments + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  return { positions: new Float32Array(positions), indices: new Uint32Array(indices) };
}

async function main() {
  mkdirSync(path.join(OUT, "meshes"), { recursive: true });
  const io = new NodeIO();
  for (const { id, centre, radius } of SPHERES) {
    const { positions, indices } = uvSphere(centre, radius);
    const doc = new Document();
    const buffer = doc.createBuffer();
    const prim = doc
      .createPrimitive()
      .setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(positions).setBuffer(buffer))
      .setIndices(doc.createAccessor().setType("SCALAR").setArray(indices).setBuffer(buffer));
    const node = doc.createNode(id).setMesh(doc.createMesh(id).addPrimitive(prim));
    doc.createScene().addChild(node);
    writeFileSync(path.join(OUT, "meshes", `${id}.glb`), await io.writeBinary(doc));
  }
  writeFileSync(path.join(OUT, "structures.csv"), CSV);
  console.log(`wrote ${SPHERES.length} meshes to ${OUT}`);
}

main();
