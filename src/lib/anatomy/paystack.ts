// Paystack checkout for Praxxt Anatomy plans (card and mobile money, GHS).
// Needs PAYSTACK_SECRET_KEY; without it the plans page offers "Contact us".
// A payment is confirmed either when the buyer returns from Paystack or by
// Paystack's webhook, whichever comes first; confirming twice is harmless.
import { createHmac, timingSafeEqual } from "crypto";

const API = "https://api.paystack.co";

export function paystackSecret(): string | null {
  return process.env.PAYSTACK_SECRET_KEY || null;
}

export function isPaystackConfigured(): boolean {
  return paystackSecret() !== null;
}

type PaystackResponse<T> = { status: boolean; message: string; data: T };

async function call<T>(path: string, init: RequestInit, secret: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json", ...init.headers },
  });
  const body = (await res.json()) as PaystackResponse<T>;
  if (!res.ok || !body.status) throw new Error(`Paystack: ${body.message || res.status}`);
  return body.data;
}

export async function initializeCheckout(
  input: { email: string; amount: number; reference: string; callbackUrl: string; metadata: Record<string, string> },
  secret = paystackSecret()
): Promise<string> {
  if (!secret) throw new Error("Paystack is not configured");
  const data = await call<{ authorization_url: string }>(
    "/transaction/initialize",
    {
      method: "POST",
      body: JSON.stringify({
        email: input.email,
        amount: input.amount,
        currency: "GHS",
        reference: input.reference,
        callback_url: input.callbackUrl,
        channels: ["card", "mobile_money"],
        metadata: input.metadata,
      }),
    },
    secret
  );
  return data.authorization_url;
}

export type VerifiedTransaction = { status: string; amount: number; currency: string; reference: string };

export async function verifyTransaction(reference: string, secret = paystackSecret()): Promise<VerifiedTransaction> {
  if (!secret) throw new Error("Paystack is not configured");
  return call<VerifiedTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`, { method: "GET" }, secret);
}

// Paystack signs each webhook body with HMAC-SHA512 of the secret key.
export function isGenuineWebhook(rawBody: string, signature: string | null, secret = paystackSecret()): boolean {
  if (!secret || !signature) return false;
  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
