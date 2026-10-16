import { requireRole } from "@/lib/require-role";
import { INK, TEXT_SECONDARY, BORDER } from "../dashboard-sections/colors";

export default async function StudentMessagesPage() {
  await requireRole("STUDENT");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: INK }}>Messages</h1>
        <p className="mt-1 text-sm" style={{ color: TEXT_SECONDARY }}>
          Direct messaging with your coordinator and preceptors.
        </p>
      </div>

      <div
        className="rounded-2xl border border-dashed px-6 py-12 text-center text-sm"
        style={{ borderColor: BORDER, color: TEXT_SECONDARY }}
      >
        Coming soon — we&apos;re building in-app messaging. For now, reach your coordinator or preceptor
        through the contact details on your placement.
      </div>
    </div>
  );
}
