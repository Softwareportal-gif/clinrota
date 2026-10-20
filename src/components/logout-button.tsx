import { auth, signOut } from "@/auth";
import { loginPageForRole } from "@/lib/role-routes";

export function LogoutButton() {
  return (
    <form
      action={async () => {
        "use server";
        // Back to the login page this account signs in on (admin, Anatomy or clinical).
        const session = await auth();
        await signOut({ redirectTo: loginPageForRole(session?.user?.role) });
      }}
    >
      <button
        type="submit"
        className="rounded-full border border-gray-300 px-4 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
      >
        Sign out
      </button>
    </form>
  );
}
