import type { DefaultSession } from "next-auth";
import type { Role } from "@/generated/prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
  }
}

// `next-auth/jwt` only re-exports this interface; it must be augmented at
// its actual declaration site (`@auth/core/jwt`) for the merge to apply.
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
}
