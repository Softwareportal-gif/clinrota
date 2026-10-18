import { isGenuineWebhook } from "@/lib/anatomy/paystack";
import { confirmPayment } from "@/lib/anatomy/subscriptions";

// Paystack's server-to-server notice of a payment. Only bodies signed with
// our secret key are trusted, and the payment is re-verified with Paystack
// before a plan is given (confirmPayment is idempotent).
export async function POST(request: Request) {
  const raw = await request.text();
  if (!isGenuineWebhook(raw, request.headers.get("x-paystack-signature"))) {
    return new Response("Invalid signature", { status: 401 });
  }
  let event: { event?: string; data?: { reference?: string } };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  if (event.event === "charge.success" && event.data?.reference?.startsWith("praxxt-anatomy-")) {
    await confirmPayment(event.data.reference);
  }
  return new Response("ok");
}
