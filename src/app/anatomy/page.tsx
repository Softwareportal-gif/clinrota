import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAnatomyPreviewEnabled } from "@/lib/anatomy/preview-access";
import { Explorer } from "./explorer";

export const metadata: Metadata = { title: "Body Explorer · Praxxt" };

// Unpublished: only signed-in users on the preview list see it; everyone
// else signed in gets a 404, as if it didn't exist.
export default async function AnatomyPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/anatomy");
  if (!isAnatomyPreviewEnabled(session.user.email)) notFound();

  return <Explorer modelBaseUrl="/api/anatomy/model/v1" />;
}
