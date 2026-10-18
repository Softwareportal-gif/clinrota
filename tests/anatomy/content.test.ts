import { describe, expect, it } from "vitest";
import { buildContent, cleanWikitext, factsFor, matchDescription, parseDescription, parseInfobox } from "@/lib/anatomy/content";

const STERNUM = `

STERNUM


The sternum or breastbone is a long flat bone located in the central part of the chest.

It connects to the ribs via cartilage.


== Structure ==

The sternum consists of three main parts, listed from the top:

-Manubrium
-Body (gladiolus)

=== Shape ===

Shaped roughly like a necktie.

== Clinical significance ==

A sternal fracture is rare.

== References ==

Gray's Anatomy.
`;

describe("parseDescription", () => {
  it("splits a description into title, summary and sections, dropping reference sections", () => {
    const d = parseDescription(STERNUM);
    expect(d.title).toBe("Sternum");
    expect(d.summary).toEqual([
      "The sternum or breastbone is a long flat bone located in the central part of the chest.",
      "It connects to the ribs via cartilage.",
    ]);
    expect(d.sections.map((s) => s.heading)).toEqual(["Structure", "Clinical significance"]);
    expect(d.sections[0].blocks).toEqual([
      { kind: "paragraph", text: "The sternum consists of three main parts, listed from the top:" },
      { kind: "list", items: ["Manubrium", "Body (gladiolus)"] },
      { kind: "subheading", text: "Shape" },
      { kind: "paragraph", text: "Shaped roughly like a necktie." },
    ]);
  });
});

describe("sentence spacing", () => {
  it("restores the space missing between run-together sentences", () => {
    const d = parseDescription("TITLE\n\nIt helps skiing.The muscle is common.");
    expect(d.summary).toEqual(["It helps skiing. The muscle is common."]);
  });
});

describe("matchDescription", () => {
  const names = ["Sternum", "Costal cartilage", "Rectus femoris muscle", "(Abdominal part of pectoralis major muscle)"];

  it("matches a structure to its own description, ignoring side and parentheses", () => {
    expect(matchDescription("Rectus femoris muscle (right)", names)).toEqual({ name: "Rectus femoris muscle", exact: true });
    expect(matchDescription("Abdominal part of pectoralis major muscle (left)", names)).toEqual({
      name: "(Abdominal part of pectoralis major muscle)",
      exact: true,
    });
  });

  it("falls back to the general description a sub-part's name contains", () => {
    expect(matchDescription("Costal cartilage of first rib (right)", names)).toEqual({ name: "Costal cartilage", exact: false });
  });

  it("finds nothing when no description fits", () => {
    expect(matchDescription("Spleen", names)).toBeNull();
  });
});

describe("Wikipedia infoboxes", () => {
  it("cleans links, templates, references and markup", () => {
    expect(cleanWikitext("[[Anterior inferior iliac spine|AIIS]] and [[ilium]]<ref>Gray</ref> {{citation needed}}")).toBe(
      "AIIS and ilium"
    );
    expect(cleanWikitext("'''Femoral nerve''' (L2-L4)<br />branches")).toBe("Femoral nerve (L2-L4); branches");
  });

  it("reads the labelled facts of a muscle infobox", () => {
    const wikitext = `{{Infobox muscle
| Name = Rectus femoris
| origin = [[Anterior inferior iliac spine]] and the exterior surface of the bony ridge
| insertion = [[Patellar ligament]] to the [[tibial tuberosity]]
| blood = [[Lateral circumflex femoral artery]]
| nerve = [[Femoral nerve]]
| action = [[Knee]] extension; [[hip]] flexion
| antagonist = [[Hamstring]]
}}
'''Rectus femoris''' is one of the four quadriceps muscles.`;
    expect(parseInfobox(wikitext)).toEqual([
      { label: "Origin", value: "Anterior inferior iliac spine and the exterior surface of the bony ridge" },
      { label: "Insertion", value: "Patellar ligament to the tibial tuberosity" },
      { label: "Action", value: "Knee extension; hip flexion" },
      { label: "Innervation", value: "Femoral nerve" },
      { label: "Arterial supply", value: "Lateral circumflex femoral artery" },
      { label: "Antagonist", value: "Hamstring" },
    ]);
  });

  it("reads a nerve's spinal roots as one fact", () => {
    const wikitext = `{{Infobox nerve
| Innervates = [[Anterior compartment of thigh]]
| BranchFrom = L2
| BranchTo = L4
}}`;
    expect(parseInfobox(wikitext)).toEqual([
      { label: "Innervates", value: "Anterior compartment of thigh" },
      { label: "Roots", value: "L2–L4" },
    ]);
  });

  it("tidies a full stop before a list separator", () => {
    expect(cleanWikitext("coracoid process.<br />Long head")).toBe("coracoid process; Long head");
  });

  it("returns no facts when there is no infobox", () => {
    expect(parseInfobox("Just prose.")).toEqual([]);
  });
});

describe("factsFor", () => {
  const facts = { "Deltoid muscle": [{ label: "Origin", value: "Clavicle" }], "Biceps brachii": [] };

  it("uses a structure's own facts", () => {
    expect(factsFor("Deltoid muscle (left)", facts)).toEqual({ from: "Deltoid muscle", exact: true, facts: facts["Deltoid muscle"] });
  });

  it("falls back to the whole muscle's facts for one of its parts", () => {
    expect(factsFor("Acromial part of deltoid muscle (right)", facts)).toEqual({
      from: "Deltoid muscle",
      exact: false,
      facts: facts["Deltoid muscle"],
    });
  });

  it("has none when nothing fits", () => {
    expect(factsFor("Spleen", facts)).toBeNull();
  });
});

describe("buildContent", () => {
  it("assembles a card with its source, credit and review status", () => {
    const card = buildContent({
      id: "sternum",
      name: "Sternum",
      text: STERNUM,
      match: { name: "Sternum", exact: true },
      facts: [{ label: "Articulations", value: "Clavicle" }],
    });
    expect(card).toMatchObject({
      id: "sternum",
      sourceTitle: "Sternum",
      exact: true,
      facts: [{ label: "Articulations", value: "Clavicle" }],
      reviewed: false,
      credit: { text: "Text adapted from Wikipedia via Z-Anatomy", licence: "CC BY-SA 4.0" },
    });
    expect(card.credit.url).toBe("https://en.wikipedia.org/wiki/Sternum");
    expect(card.summary[0]).toMatch(/^The sternum/);
  });
});
