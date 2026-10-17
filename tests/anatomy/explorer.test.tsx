import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import type { Catalogue, Structure } from "@/lib/anatomy/catalogue";
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
    { id: "muscular/upper-limb", system: "muscular", region: "upper-limb", bytes: { low: 1, medium: 2, high: 3 } },
  ],
  structures: [
    s("sternum", "Sternum", { latin: "Sternum", synonyms: ["Breastbone"] }),
    s("deltoid", "Deltoid", {
      latin: "Musculus deltoideus",
      system: "muscular",
      region: "upper-limb",
      chunk: "muscular/upper-limb",
    }),
  ],
};

let getContext: MockInstance;

beforeEach(() => {
  scene.props = null;
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(CATALOGUE), { headers: { "Content-Type": "application/json" } }))
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
    expect(screen.getByText(/Z-Anatomy \(CC BY-SA 4\.0\), based on BodyParts3D/)).toBeInTheDocument();
  });

  it("offers a retry when the catalogue can't load", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("nope", { status: 500 }));
    render(<Explorer modelBaseUrl="/m" />);
    expect(await screen.findByText(/Couldn.t load the anatomy atlas/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("combobox", { name: "Search anatomy" })).toBeInTheDocument();
  });

  it("selects a structure by synonym with Enter and shows its card", async () => {
    const box = await renderExplorer();
    search(box, "breastbone");
    fireEvent.keyDown(box, { key: "Enter" });
    const card = screen.getByRole("region", { name: "Selected structure" });
    expect(within(card).getByRole("heading", { name: "Sternum" })).toBeInTheDocument();
    expect(within(card).getByText("Sternum", { selector: "p" })).toBeInTheDocument();
    expect(within(card).getByText("Skeletal")).toBeInTheDocument();
  });

  it("says when nothing matches and clears the search with Escape", async () => {
    const box = await renderExplorer();
    search(box, "xyz");
    expect(screen.getByText("No structures match")).toBeInTheDocument();
    fireEvent.keyDown(box, { key: "Escape" });
    expect(box).toHaveValue("");
    expect(screen.queryByText("No structures match")).not.toBeInTheDocument();
  });

  it("selects a structure tapped in the 3D view", async () => {
    await renderExplorer();
    await screen.findByTestId("body-scene");
    act(() => scene.props!.onSelect("deltoid"));
    expect(screen.getByRole("heading", { name: "Deltoid" })).toBeInTheDocument();
    act(() => scene.props!.onSelect(null));
    expect(screen.queryByRole("region", { name: "Selected structure" })).not.toBeInTheDocument();
  });

  it("toggles systems and lists the depth levels in the drawer", async () => {
    await renderExplorer();
    fireEvent.click(screen.getByRole("button", { name: "Systems and layers" }));
    const drawer = screen.getByRole("dialog", { name: "Systems and layers" });
    const muscular = within(drawer).getByRole("switch", { name: /Muscular/ });
    expect(muscular).toHaveAttribute("aria-checked", "false");
    fireEvent.click(muscular);
    expect(muscular).toHaveAttribute("aria-checked", "true");
    const levels = within(within(drawer).getByRole("list", { name: "Depth levels" })).getAllByRole("listitem");
    expect(levels.map((li) => li.textContent)).toEqual(["Skin", "Muscle", "Organs", "Bone"]);
    const slider = within(drawer).getByRole("slider", { name: "Depth" });
    fireEvent.change(slider, { target: { value: "2" } });
    expect(slider).toHaveAttribute("aria-valuetext", "Organs");
  });

  it("enables Hide and Isolate only with a selection", async () => {
    const box = await renderExplorer();
    expect(screen.getByRole("button", { name: "Hide" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Isolate" })).toBeDisabled();
    search(box, "sternum");
    fireEvent.keyDown(box, { key: "Enter" });
    expect(screen.getByRole("button", { name: "Hide" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Isolate" })).toBeEnabled();
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
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    search(box, "deltoid");
    fireEvent.keyDown(box, { key: "Enter" });
    expect(screen.getByRole("heading", { name: "Deltoid" })).toBeInTheDocument();
  });

  it("falls back to a list of structures without WebGL", async () => {
    getContext.mockReturnValue(null);
    await renderExplorer();
    expect(screen.getByText(/This device can.t show the 3D body/)).toBeInTheDocument();
    expect(screen.queryByTestId("body-scene")).not.toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Structures" });
    fireEvent.click(within(list).getByRole("button", { name: "Deltoid" }));
    expect(screen.getByRole("heading", { name: "Deltoid" })).toBeInTheDocument();
  });

  it("names every control and puts the search box near the top of the tab order", async () => {
    const box = await renderExplorer();
    const controls = [...document.querySelectorAll<HTMLElement>("button, input, a, [tabindex]")];
    for (const control of controls) {
      const labelled = control.id ? document.querySelector(`label[for="${control.id}"]`)?.textContent : null;
      const name = control.getAttribute("aria-label") ?? labelled ?? control.textContent;
      expect(name?.trim(), control.outerHTML).toBeTruthy();
      expect(Number(control.getAttribute("tabindex") ?? 0)).toBeLessThanOrEqual(0);
    }
    const tabbable = controls.filter((c) => c.getAttribute("tabindex") !== "-1" && !(c as HTMLButtonElement).disabled);
    expect(tabbable.indexOf(box)).toBeLessThanOrEqual(1);
  });
});
