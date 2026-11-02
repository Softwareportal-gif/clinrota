import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ROLE_HOME } from "@/lib/role-routes";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Praxxt Reason · Clinical Reasoning AI",
  description: "AI-powered clinical reasoning coach for health profession students and practitioners.",
};

export default async function ReasoningLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Back-link goes to the user's own portal home
  const backHref = ROLE_HOME[session.user.role] ?? "/";

  return (
    <div className="flex min-h-dvh flex-col bg-gray-50">
      <header className="flex items-center gap-4 border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
        <a
          href={backHref}
          className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
          aria-label="Back to portal"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="size-5"
          >
            <path
              fillRule="evenodd"
              d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
              clipRule="evenodd"
            />
          </svg>
        </a>
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-blue-600 text-white">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="size-4"
            >
              <path
                fillRule="evenodd"
                d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
                clipRule="evenodd"
              />
            </svg>
          </span>
          <div>
            <p className="text-sm font-semibold leading-tight text-gray-900">Praxxt Reason</p>
            <p className="text-xs leading-tight text-gray-500">Clinical Reasoning AI</p>
          </div>
        </div>
        <div className="ml-auto">
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
            Educational use only
          </span>
        </div>
      </header>
      {children}
    </div>
  );
}
