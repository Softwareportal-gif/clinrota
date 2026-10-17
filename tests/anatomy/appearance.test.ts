import { describe, expect, it } from "vitest";
import type { AnatomySystem } from "@/lib/anatomy/catalogue";
import { appearanceOf, shadeOf, SURFACES, tissueOf } from "@/lib/anatomy/appearance";

const t = (system: AnatomySystem, name: string) => tissueOf({ system, name });

describe("tissueOf", () => {
  it("tells bone, cartilage and ligament apart in the skeleton", () => {
    expect(t("skeletal", "Ulna (right)")).toBe("bone");
    expect(t("skeletal", "Costal cartilage of fifth rib (left)")).toBe("cartilage");
    expect(t("skeletal", "Nucleus pulposus C6-C7")).toBe("cartilage");
    expect(t("skeletal", "Middle glenohumeral ligament (left)")).toBe("ligament");
    expect(t("skeletal", "Articular capsule of hip joint (right)")).toBe("ligament");
  });

  it("tells muscle from tendon and the translucent fascia over it", () => {
    expect(t("muscular", "Deltoid (right)")).toBe("muscle");
    expect(t("muscular", "Intermediate tendon of digastric muscle (left)")).toBe("tendon");
    expect(t("muscular", "Extensor retinaculum of wrist (right)")).toBe("tendon");
    expect(t("muscular", "Masseteric fascia (right)")).toBe("fascia");
    expect(t("muscular", "Investing abdominal fascia (left)")).toBe("fascia");
    expect(t("muscular", "Intertubercular tendon sheath (right)")).toBe("fascia");
    expect(SURFACES.fascia.opacity).toBeLessThan(0.5);
  });

  it("colours arteries red, veins blue and the heart dark red", () => {
    expect(t("cardiovascular", "Maxillary artery (left)")).toBe("artery");
    expect(t("cardiovascular", "Accessory hemi-azygos vein")).toBe("vein");
    expect(t("cardiovascular", "Sigmoid sinus (left)")).toBe("vein");
    expect(t("cardiovascular", "Inferior leaflet of right atrioventricular valve")).toBe("heart");
  });

  it("separates nerves from brain and sense organs", () => {
    expect(t("nervous", "Mandibular nerve (left)")).toBe("nerve");
    expect(t("nervous", "Choroid plexus (right)")).toBe("nerve");
    expect(t("nervous", "Cerebellum")).toBe("neural");
  });

  it("uses the system for the other organs", () => {
    expect(t("lymphatic", "Thyroid nodes (right)")).toBe("lymph");
    expect(t("integumentary", "Brachial region (left)")).toBe("skin");
    expect(t("respiratory", "Right lung")).toBe("respiratory");
    expect(t("endocrine", "Thyroid gland")).toBe("endocrine");
    expect(t("digestive", "Stomach")).toBe("digestive");
  });
});

describe("shades", () => {
  it("are stable per id and stay within [-1, 1]", () => {
    expect(shadeOf("deltoid-right")).toBe(shadeOf("deltoid-right"));
    for (const id of ["a", "deltoid-left", "ulna-right", "x".repeat(80)]) {
      expect(Math.abs(shadeOf(id))).toBeLessThanOrEqual(1);
    }
  });

  it("differ between neighbouring structures", () => {
    expect(shadeOf("deltoid-left")).not.toBe(shadeOf("deltoid-right"));
  });

  it("stay within the tissue's range", () => {
    const a = appearanceOf({ id: "deltoid-right", system: "muscular", name: "Deltoid (right)" });
    expect(a.tissue).toBe("muscle");
    expect(Math.abs(a.lightnessOffset)).toBeLessThanOrEqual(SURFACES.muscle.shadeRange);
  });
});
