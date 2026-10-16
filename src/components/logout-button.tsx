import { signOut } from "@/auth";

export function LogoutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
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
