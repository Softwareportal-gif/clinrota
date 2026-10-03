import { requireRole } from "@/lib/require-role";
import { getStudentProfileByUserId } from "@/lib/student";
import { SyncStatusIndicator } from "@/components/sync-status-indicator";
import { LogoutButton } from "@/components/logout-button";
import { StudentSidebarNav } from "./sidebar-nav";
import { CORAL, CREAM, DARK_GREEN, TEAL } from "./dashboard-sections/colors";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("STUDENT");
  const studentProfile = await getStudentProfileByUserId(session.user.id);
  const initial = session.user.name?.trim().charAt(0).toUpperCase() || "S";
  const subLabel = studentProfile.cohort
    ? `${studentProfile.cohort.name} · ${studentProfile.cohort.academicYear}`
    : studentProfile.program.name;

  return (
    <div style={{ width: "100%", minHeight: "100vh", display: "flex", alignItems: "flex-start", background: CREAM }}>
      {/* SIDEBAR */}
      <nav
        aria-label="Student portal navigation"
        style={{
          width: 232,
          flex: "0 0 232px",
          minHeight: "100vh",
          boxSizing: "border-box",
          background: DARK_GREEN,
          padding: "28px 18px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 10px 26px 10px" }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              background: TEAL,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flex: "0 0 34px",
            }}
          >
            <span style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 16 }}>CR</span>
          </div>
          <div>
            <div style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 16, lineHeight: 1.1 }}>ClinRota</div>
            <div style={{ color: "#9FC3BB", fontSize: 11, letterSpacing: "0.03em", textTransform: "uppercase" }}>
              Student Portal
            </div>
          </div>
        </div>

        <StudentSidebarNav />

        <div style={{ marginTop: "auto", padding: "14px 12px", borderTop: "1px solid rgba(255,255,255,0.12)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: CORAL,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: 13,
                flex: "0 0 30px",
              }}
            >
              {initial}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: "#FFFFFF", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {session.user.name}
              </div>
              <div style={{ color: "#9FC3BB", fontSize: 11 }}>{subLabel}</div>
            </div>
          </div>
        </div>
      </nav>

      {/* MAIN */}
      <main style={{ flex: "1 1 auto", minWidth: 0, padding: "36px 44px 56px 44px", display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 16 }}>
          <SyncStatusIndicator userId={session.user.id} />
          <LogoutButton />
        </div>
        {children}
      </main>
    </div>
  );
}
