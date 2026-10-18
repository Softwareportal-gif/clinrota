// @vitest-environment node
import { createHmac } from "crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { initializeCheckout, isGenuineWebhook, verifyTransaction } from "@/lib/anatomy/paystack";

afterEach(() => vi.unstubAllGlobals());

describe("isGenuineWebhook", () => {
  const body = JSON.stringify({ event: "charge.success", data: { reference: "ref-1" } });
  const sign = (secret: string) => createHmac("sha512", secret).update(body).digest("hex");

  it("accepts a body signed with our secret", () => {
    expect(isGenuineWebhook(body, sign("sk_test_abc"), "sk_test_abc")).toBe(true);
  });

  it("rejects a wrong or missing signature, or no secret", () => {
    expect(isGenuineWebhook(body, sign("someone-else"), "sk_test_abc")).toBe(false);
    expect(isGenuineWebhook(body, null, "sk_test_abc")).toBe(false);
    expect(isGenuineWebhook(body, sign("sk_test_abc"), null)).toBe(false);
  });
});

describe("Paystack API calls", () => {
  it("starts a GHS checkout for card and mobile money and returns the payment page", async () => {
    const fetchMock = vi.fn(async () => Response.json({ status: true, message: "ok", data: { authorization_url: "https://checkout.paystack.com/x" } }));
    vi.stubGlobal("fetch", fetchMock);
    const url = await initializeCheckout(
      { email: "a@b.c", amount: 15000, reference: "ref-1", callbackUrl: "https://praxxt.com/anatomy/plans/confirm", metadata: { plan: "STUDENT" } },
      "sk_test_abc"
    );
    expect(url).toBe("https://checkout.paystack.com/x");
    const [endpoint, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(endpoint).toBe("https://api.paystack.co/transaction/initialize");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk_test_abc");
    expect(JSON.parse(init.body as string)).toMatchObject({ amount: 15000, currency: "GHS", reference: "ref-1", channels: ["card", "mobile_money"] });
  });

  it("verifies a transaction by reference", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ status: true, message: "ok", data: { status: "success", amount: 15000, currency: "GHS", reference: "ref-1" } }))
    );
    await expect(verifyTransaction("ref-1", "sk_test_abc")).resolves.toMatchObject({ status: "success", amount: 15000 });
  });

  it("reports Paystack's error message", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ status: false, message: "Invalid key", data: null }, { status: 401 })));
    await expect(verifyTransaction("ref-1", "sk_bad")).rejects.toThrow("Paystack: Invalid key");
  });
});
