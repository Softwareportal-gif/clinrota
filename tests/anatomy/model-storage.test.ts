// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { modelResponseFor, modelStorage, validModelPath } from "@/lib/anatomy/model-storage";

describe("validModelPath", () => {
  it.each([
    [["v1", "catalogue.json"], "v1/catalogue.json"],
    [["v1", "overview.glb"], "v1/overview.glb"],
    [["v12", "chunks", "skeletal", "upper-limb", "medium.glb"], "v12/chunks/skeletal/upper-limb/medium.glb"],
    [["v1", "content", "rectus-femoris-muscle-right.json"], "v1/content/rectus-femoris-muscle-right.json"],
  ])("accepts %j", (segments, expected) => {
    expect(validModelPath(segments)).toBe(expected);
  });

  it.each([
    [[".."]],
    [["v1", "..", "x.glb"]],
    [["v1", "chunks", "skeletal", "a%2Fb", "low.glb"]],
    [["v1", "chunks", "skeletal", "a/b", "low.glb"]],
    [["v1", "chunks", "skeletal", "upper-limb", "ultra.glb"]],
    [["v1", "chunks", "brain", "head", "low.glb"]],
    [["latest", "catalogue.json"]],
    [["v1", "catalogue.txt"]],
    [["v1", "overview.gltf"]],
    [["v1", "content", "..json"]],
    [["v1", "content", "Sternum.json"]],
    [["v1", "content", "sternum.glb"]],
    [["v1", "chunks", "skeletal", "upper-limb", "low.glb", "extra"]],
    [[]],
  ])("rejects %j", (segments) => {
    expect(validModelPath(segments)).toBeNull();
  });
});

describe("modelResponseFor without R2", () => {
  let dir: string | undefined;
  afterEach(() => {
    vi.unstubAllEnvs();
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  function localBuild() {
    dir = mkdtempSync(path.join(os.tmpdir(), "anatomy-models-"));
    mkdirSync(path.join(dir, "models", "v1"), { recursive: true });
    writeFileSync(path.join(dir, "models", "v1", "catalogue.json"), '{"version":"v1"}');
    vi.stubEnv("R2_ACCOUNT_ID", "");
    vi.stubEnv("ANATOMY_BUILD_DIR", dir);
  }

  it("serves the local build, revalidated each time", async () => {
    localBuild();
    const res = await modelResponseFor("v1/catalogue.json");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/json");
    expect(res.headers.get("Cache-Control")).toBe("private, no-cache");
    expect(await res.text()).toBe('{"version":"v1"}');
  });

  it("404s for a file the build doesn't have", async () => {
    localBuild();
    expect((await modelResponseFor("v1/overview.glb")).status).toBe(404);
  });
});

describe("modelStorage", () => {
  afterEach(() => vi.unstubAllEnvs());

  function r2Env() {
    vi.stubEnv("R2_ACCOUNT_ID", "acct");
    vi.stubEnv("R2_ACCESS_KEY_ID", "key");
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "secret");
    vi.stubEnv("R2_BUCKET", "praxxt-anatomy");
  }

  it("prefers R2 over the Blob store when both are set", () => {
    r2Env();
    vi.stubEnv("BLOB_READ_WRITE_TOKEN_STORE_ID", "store_x");
    expect(modelStorage()).toBe("r2");
  });

  it("uses the Blob store without R2", () => {
    vi.stubEnv("R2_ACCOUNT_ID", "");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN_STORE_ID", "store_x");
    expect(modelStorage()).toBe("blob");
  });

  it("falls back to the local build", () => {
    vi.stubEnv("R2_ACCOUNT_ID", "");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    vi.stubEnv("BLOB_STORE_ID", "");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN_STORE_ID", "");
    expect(modelStorage()).toBe("local");
  });
});
