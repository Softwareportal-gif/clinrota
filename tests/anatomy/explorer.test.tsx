import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import type { Catalogue, Structure } from "@/lib/anatomy/catalogue";
import type { StructureContent } from "@/lib/anatomy/content";
import { Explorer } from "@/app/anatomy/explorer";

type SceneProps = {
  onSelect: (id: string | null) => void;
  onLoadError: (chunkId: string, retry: () => void) => void;
};
const scene: { props: SceneProps | null } = { props: null };

vi.mock("@/app/anatomy/body-scene", () => ({
  BodyScene: (props: SceneProps) => {
    scene.props = props;
    return <div data-testid="body-scene" />;
  },
}));

const s = (id: string, name: string, extra: Partial<Structure>): Structure => ({
  id,
  name,
  latin: null,
  synonyms: [],
  system: "skeletal",
  region: "thorax",
  parentId: null,
  fmaId: null,
  chunk: "skeletal/thorax",
  bbox: [0, 0, 0, 1, 1, 1],
  ...extra,
});

const CATALOGUE: Catalogue = {
  version: "v1",
  overviewBytes: 10,
  chunks: [
    { id: "skeletal/thorax", system: "skeletal", region: "thorax", bytes: { low: 1, medium: 2, high: 3 } },
    { id: "muscular/lower-limb", system: "muscular", region: "lower-limb", bytes: { low: 1, medium: 2, high: 3 } },
  ],
  structures: [
    s("sternum", "Sternum", { synonyms: ["Breastbone"] }),
    s("rectus-femoris-muscle-right", "Rectus femoris muscle (right)", {
      system: "muscular",
      region: "lower-limb",
      chunk: "muscular/lower-limb",
    }),
  ],
};

const RECTUS: StructureContent = {
  id: "rectus-femoris-muscle-right",
  sourceTitle: "Rectus femoris muscle",
  exact: true,
  summary: ["The rectus femoris is one of the four quadriceps muscles."],
  facts: [
    { label: "Origin", value: "Anterior inferior iliac spine" },
    { label: "Innervation", value: "Femoral nerve" },
  ],
  factsFrom: null,
  sections: [
    { heading: "Structure", blocks: [{ kind: "paragraph", text: "It is bipennate." }] },
    { heading: "Function", blocks: [{ kind: "paragraph", text: "It extends the knee." }] },
    { heading: "Clinical significance", blocks: [{ kind: "paragraph", text: "Strains are common in sprinters." }] },
  ],
  reviewed: false,
  credit: {
    text: "Text adapted from Wikipedia via Z-Anatomy",
    licence: "CC BY-SA 4.0",
    url: "https://en.wikipedia.org/wiki/Rectus_femoris_muscle",
  },
};

let getContext: MockInstance;

function respond(url: string) {
  if (url.endsWith("/catalogue.json")) return new Response(JSON.stringify(CATALOGUE));
  if (url.endsWith("/content/rectus-femoris-muscle-right.json")) return new Response(JSON.stringify(RECTUS));
  return new Response("not found", { status: 404 });
}

beforeEach(() => {
  scene.props = null;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => respond(url))
  );
  getContext = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({} as never);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function renderExplorer() {
  render(<Explorer modelBaseUrl="/api/anatomy/model/v1" />);
  return screen.findByRole("combobox", { name: "Search anatomy" });
}

function search(box: HTMLElement, text: string) {
  fireEvent.change(box, { target: { value: text } });
}

describe("Explorer", () => {
  it("loads the catalogue from the model base URL", async () => {
    await renderExplorer();
    expect(fetch).toHaveBeenCalledWith("/api/anatomy/model/v1/catalogue.json");
    expect(await screen.findByTestId("body-scene")).toBeInTheDocument();
    expect(screen.getByText(/Z-Anatomy.*\(CC BY-SA 4\.0\).*BodyParts3D.*\(CC BY-SA 2\.1 Japan\)/)).toBeInTheDocument();
  });

  it("offers a retry when the catalogue can't load", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("nope", { status: 500 }));
    render(<Explorer modelBaseUrl="/m" />);
    expect(await screen.findByText(/Couldn.t load the anatomy atlas/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("combobox", { name: "Search anatomy" })).toBeInTheDocument();
  });

  it("shows where you are in the breadcrumb", async () => {
    const box = await renderExplorer();
    const crumbs = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(crumbs).toHaveTextContent("Praxxt Anatomy");
    search(box, "rectus");
    fireEvent.keyDown(box, { key: "Enter" });
    expect(crumbs).toHaveTextContent(/Muscular system.*Lower limb.*Rectus femoris muscle \(right\)/);
  });

  it("opens the study panel with quick facts, a summary and the review label", async () => {
    const box = await renderExplorer();
    search(box, "rectus");
    fireEvent.keyDown(box, { key: "Enter" });
    const panel = screen.getByRole("region", { name: "Study panel" });
    expect(within(panel).getByRole("heading", { name: "Rectus femoris muscle (right)" })).toBeInTheDocument();
    expect(await within(panel).findByText("Anterior inferior iliac spine")).toBeInTheDocument();
    expect(within(panel).getByText("Femoral nerve")).toBeInTheDocument();
    expect(within(panel).getByText(/one of the four quadriceps muscles/)).toBeInTheDocument();
    expect(within(panel).getByText(/Not yet reviewed/)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/anatomy/model/v1/content/rectus-femoris-muscle-right.json");
  });

  it("sorts the card into Anatomy, Function, Clinical and Credits tabs", async () => {
    const box = await renderExplorer();
    search(box, "rectus");
    fireEvent.keyDown(box, { key: "Enter" });
    const panel = screen.getByRole("region", { name: "Study panel" });
    await within(panel).findByText("Femoral nerve");
    const tabs = within(panel)
      .getAllByRole("tab")
      .map((t) => t.textContent);
    expect(tabs).toEqual(["Overview", "Anatomy", "Function", "Clinical", "Credits"]);
    fireEvent.click(within(panel).getByRole("tab", { name: "Clinical" }));
    expect(within(panel).getByText("Strains are common in sprinters.")).toBeInTheDocument();
    fireEvent.click(within(panel).getByRole("tab", { name: "Credits" }));
    expect(within(panel).getByRole("link", { name: "Rectus femoris muscle" })).toHaveAttribute(
      "href",
      "https://en.wikipedia.org/wiki/Rectus_femoris_muscle"
    );
  });

  it("says when a structure has no description yet", async () => {
    const box = await renderExplorer();
    search(box, "breastbone");
    fireEvent.keyDown(box, { key: "Enter" });
    const panel = screen.getByRole("region", { name: "Study panel" });
    expect(await within(panel).findByText(/No description for this structure yet/)).toBeInTheDocument();
  });

  it("isolates, fades and hides from the study panel", async () => {
    const box = await renderExplorer();
    search(box, "sternum");
    fireEvent.keyDown(box, { key: "Enter" });
    const panel = screen.getByRole("region", { name: "Study panel" });
    fireEvent.click(within(panel).getByRole("button", { name: "Fade" }));
    expect(within(panel).getByRole("button", { name: "Unfade" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Show all" })).toBeEnabled();
    fireEvent.click(within(panel).getByRole("button", { name: "Isolate" }));
    expect(within(panel).getByRole("button", { name: "Isolated" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(within(panel).getByRole("button", { name: "Hide" }));
    expect(screen.queryByRole("region", { name: "Study panel" })).not.toBeInTheDocument();
  });

  it("says when nothing matches and clears the search with Escape", async () => {
    const box = await renderExplorer();
    search(box, "xyz");
    expect(screen.getByText("No structures match")).toBeInTheDocument();
    fireEvent.keyDown(box, { key: "Escape" });
    expect(box).toHaveValue("");
  });

  it("selects a structure tapped in the 3D view and closes on empty space", async () => {
    await renderExplorer();
    await screen.findByTestId("body-scene");
    act(() => scene.props!.onSelect("sternum"));
    expect(screen.getByRole("heading", { name: "Sternum" })).toBeInTheDocument();
    act(() => scene.props!.onSelect(null));
    expect(screen.queryByRole("region", { name: "Study panel" })).not.toBeInTheDocument();
  });

  it("switches body systems and depth from the bottom bar", async () => {
    await renderExplorer();
    const systems = screen.getByRole("list", { name: "Body systems" });
    const cardio = within(systems).getByRole("switch", { name: /Cardiovascular/ });
    expect(cardio).toHaveAttribute("aria-checked", "false");
    fireEvent.click(cardio);
    expect(cardio).toHaveAttribute("aria-checked", "true");
    const depth = screen.getByRole("radiogroup", { name: "Depth" });
    expect(
      within(depth)
        .getAllByRole("radio")
        .map((r) => r.textContent)
    ).toEqual(["Skin", "Muscle", "Organs", "Bone"]);
    fireEvent.click(within(depth).getByRole("radio", { name: "Organs" }));
    expect(within(depth).getByRole("radio", { name: "Organs" })).toHaveAttribute("aria-checked", "true");
  });

  it("toggles X-ray skin and fascia from the view tools", async () => {
    await renderExplorer();
    const tools = screen.getByRole("toolbar", { name: "View tools" });
    fireEvent.click(within(tools).getByRole("button", { name: "X-ray skin" }));
    expect(within(tools).getByRole("button", { name: "X-ray skin" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(within(tools).getByRole("button", { name: "Fascia" }));
    expect(within(tools).getByRole("button", { name: "Fascia" })).toHaveAttribute("aria-pressed", "true");
    expect(within(tools).getByRole("button", { name: "Show all" })).toBeDisabled();
  });

  it("reports a part that failed to load, retries it, and keeps search working", async () => {
    const box = await renderExplorer();
    await screen.findByTestId("body-scene");
    const retry = vi.fn();
    act(() => scene.props!.onLoadError("skeletal/thorax", retry));
    const notice = screen.getByRole("alert");
    expect(notice).toHaveTextContent(/Couldn.t load this part/);
    fireEvent.click(within(notice).getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalledOnce();
    search(box, "sternum");
    fireEvent.keyDown(box, { key: "Enter" });
    expect(screen.getByRole("heading", { name: "Sternum" })).toBeInTheDocument();
  });

  it("falls back to a list of structures without WebGL", async () => {
    getContext.mockReturnValue(null);
    await renderExplorer();
    expect(screen.getByText(/This device can.t show the 3D body/)).toBeInTheDocument();
    expect(screen.queryByTestId("body-scene")).not.toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("list", { name: "Structures" })).getByRole("button", { name: "Sternum" }));
    expect(screen.getByRole("heading", { name: "Sternum" })).toBeInTheDocument();
  });

  it("names every control and puts the search box first in the tab order", async () => {
    const box = await renderExplorer();
    const controls = [...document.querySelectorAll<HTMLElement>("button, input, a, [tabindex]")];
    for (const control of controls) {
      const labelled = control.id ? document.querySelector(`label[for="${control.id}"]`)?.textContent : null;
      const name = control.getAttribute("aria-label") ?? labelled ?? control.textContent;
      expect(name?.trim(), control.outerHTML).toBeTruthy();
      expect(Number(control.getAttribute("tabindex") ?? 0)).toBeLessThanOrEqual(0);
    }
    const tabbable = controls.filter((c) => c.getAttribute("tabindex") !== "-1" && !(c as HTMLButtonElement).disabled);
    expect(tabbable.indexOf(box)).toBe(0);
  });
});
