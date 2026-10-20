import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Wordmark } from "@/components/wordmark";
import { manrope } from "@/fonts/manrope";
import { AdminLoginForm } from "./admin-login-form";

export const metadata: Metadata = { title: "Admin sign-in · Praxxt", robots: { index: false, follow: false } };

// The owner's admin console has its own plain sign-in, apart from the
// clinical platform's /login and Praxxt Anatomy's /anatomy/login. It sits
// outside the (console) group so the console's layout (which requires a
// super admin) doesn't wrap it.
export default async function AdminLoginPage() {
  const session = await auth();
  if (session?.user?.role === "SUPER_ADMIN") redirect("/admin");

  return (
    <main
      className={`${manrope.className} flex min-h-screen items-center justify-center px-4 py-12`}
      style={{ background: "radial-gradient(ellipse at 50% 0%, #2A2468, #13112E 60%)" }}
    >
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex items-center justify-center gap-3">
          <Wordmark size={30} tone="onDark" />
          <span className="rounded-md border border-white/20 px-2 py-0.5 text-xs font-bold uppercase tracking-[0.12em] text-white/80">Admin</span>
        </div>
        <div className="rounded-2xl bg-white p-7 shadow-[0_30px_80px_rgba(0,0,0,.35)] sm:p-8">
          <h1 className="text-xl font-extrabold tracking-[-0.02em] text-[#17153B]">Sign in to the admin console</h1>
          <p className="mb-6 mt-1 text-sm text-[#5E5C7A]">Manage schools, support tickets and Praxxt Anatomy.</p>
          <AdminLoginForm />
        </div>
        <p className="mt-6 text-center text-xs text-white/50">For Praxxt staff only.</p>
      </div>
    </main>
  );
}
