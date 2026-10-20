"use server";

import { signOut } from "@/auth";

// Log out of Praxxt Anatomy, back to its own login page.
export async function logOutOfAnatomy(): Promise<void> {
  await signOut({ redirectTo: "/anatomy/login" });
}
