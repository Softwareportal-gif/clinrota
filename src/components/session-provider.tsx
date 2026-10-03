"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

// A thin client boundary so the root layout itself can stay a server
// component (and pages that don't need per-request data can stay
// statically rendered) while AssistantWidget still gets sign-in state via
// useSession() rather than the layout calling auth() directly — that
// would force every route in the app to render dynamically.
export function AuthSessionProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
