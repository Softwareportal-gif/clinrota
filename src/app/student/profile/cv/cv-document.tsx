import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { ENTRUSTMENT_LEVEL_VALUE } from "@/lib/entrustment";
import { CV_LEVEL_LABELS, type StudentCvData } from "@/lib/student-cv";

const DARK = "#17153B";
const ACCENT = "#5A3BF0";
const ACCENT_SOFT = "#C8BFFF";
const CANVAS = "#F8F7FF";
const TEXT = "#17153B";
const MUTED = "#5E5C7A";
const RULE = "#ECEBF5";

const PAGE_X = 44;
const PAGE_TOP = 40;
const SKILLS_KEPT_TOGETHER = 14;

const styles = StyleSheet.create({
  page: {
    paddingTop: PAGE_TOP,
    paddingBottom: 60,
    paddingHorizontal: PAGE_X,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: TEXT,
    lineHeight: 1.45,
  },

  // Header band bleeds to the page edges on page 1 only (it's in the flow,
  // not `fixed`), so later pages start with normal top padding.
  header: {
    marginTop: -PAGE_TOP,
    marginHorizontal: -PAGE_X,
    paddingTop: 34,
    paddingBottom: 26,
    paddingHorizontal: PAGE_X,
    backgroundColor: DARK,
  },
  name: { fontSize: 26, lineHeight: 1.15, fontFamily: "Helvetica-Bold", color: "#FFFFFF", letterSpacing: 0.3 },
  headline: { fontSize: 11, color: ACCENT_SOFT, marginTop: 4 },
  contactRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 12 },
  contactItem: { fontSize: 9, color: "#EFECFF", marginRight: 18 },
  contactLabel: { fontFamily: "Helvetica-Bold", color: ACCENT_SOFT },

  stats: { flexDirection: "row", marginTop: 18 },
  stat: { flex: 1, backgroundColor: CANVAS, borderRadius: 4, paddingVertical: 9, paddingHorizontal: 10, marginRight: 8 },
  statLast: { marginRight: 0 },
  statValue: { fontSize: 16, lineHeight: 1.1, fontFamily: "Helvetica-Bold", color: DARK },
  statLabel: { fontSize: 7.5, color: MUTED, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.6 },

  section: { marginTop: 20 },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  sectionAccent: { width: 14, height: 2.5, backgroundColor: ACCENT, marginRight: 7 },
  sectionTitle: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: DARK, textTransform: "uppercase", letterSpacing: 1.2 },
  sectionRule: { flex: 1, height: 0.75, backgroundColor: RULE, marginLeft: 8 },

  twoCol: { flexDirection: "row" },
  col: { flex: 1 },
  colGap: { width: 24 },

  strong: { fontFamily: "Helvetica-Bold", fontSize: 10.5, color: TEXT },
  muted: { color: MUTED, fontSize: 9 },

  chips: { flexDirection: "row", flexWrap: "wrap" },
  chip: {
    fontSize: 8.5,
    color: DARK,
    backgroundColor: CANVAS,
    borderRadius: 9,
    paddingVertical: 2.5,
    paddingHorizontal: 8,
    marginRight: 5,
    marginBottom: 5,
  },

  // Timeline: a dot per placement on a continuous left rule.
  timelineItem: { flexDirection: "row" },
  rail: { width: 16, alignItems: "center" },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: ACCENT, marginTop: 3.5 },
  dotCurrent: { backgroundColor: "#FFFFFF", borderWidth: 2, borderColor: ACCENT },
  line: { width: 1, flexGrow: 1, backgroundColor: RULE, marginTop: 2 },
  timelineBody: { flex: 1, paddingBottom: 12, paddingLeft: 4 },
  placementTop: { flexDirection: "row", justifyContent: "space-between" },
  placementTitle: { fontFamily: "Helvetica-Bold", fontSize: 10.5, flex: 1, paddingRight: 10 },
  dates: { fontSize: 8.5, color: ACCENT, fontFamily: "Helvetica-Bold" },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 4 },
  badge: {
    fontSize: 8,
    color: ACCENT,
    borderWidth: 0.75,
    borderColor: ACCENT_SOFT,
    borderRadius: 3,
    paddingVertical: 1.5,
    paddingHorizontal: 5,
    marginRight: 5,
  },

  skillHeader: { flexDirection: "row", paddingBottom: 4, borderBottomWidth: 0.75, borderBottomColor: RULE },
  skillRow: { flexDirection: "row", alignItems: "center", paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: "#F1F0F8" },
  skillName: { flex: 3.2, paddingRight: 8 },
  skillCases: { width: 38, textAlign: "center" },
  skillLevel: { flex: 2.4, flexDirection: "row", alignItems: "center" },
  th: { fontSize: 7.5, color: MUTED, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.6 },
  meter: { flexDirection: "row", marginRight: 7 },
  pip: { width: 6, height: 6, borderRadius: 3, marginRight: 2.5, backgroundColor: "#E2E0F0" },
  pipOn: { backgroundColor: ACCENT },
  levelText: { fontSize: 8.5, color: MUTED },

  // Separate absolutely-positioned pieces: a fixed flex-row View holding a
  // `render` Text didn't paint at all in @react-pdf.
  footerRule: { position: "absolute", bottom: 40, left: PAGE_X, right: PAGE_X, height: 0.5, backgroundColor: RULE },
  footerLeft: { position: "absolute", bottom: 26, left: PAGE_X, fontSize: 7.5, color: MUTED },
});

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtMonth(d: Date) {
  const date = new Date(d);
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function fmtHours(h: number) {
  return Number.isInteger(h) ? `${h}` : h.toFixed(1);
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader} wrap={false}>
      <View style={styles.sectionAccent} />
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionRule} />
    </View>
  );
}

function LevelMeter({ value }: { value: number }) {
  return (
    <View style={styles.meter}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={i <= value ? [styles.pip, styles.pipOn] : styles.pip} />
      ))}
    </View>
  );
}

export function StudentCvDocument({ data }: { data: StudentCvData }) {
  const generated = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const interests = (data.areasOfInterest ?? "")
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  // Zero-value boxes ("0 approved cases") undersell a newer student, so only
  // non-zero stats show, and the strip only once something is approved.
  const stats = [
    { n: data.totalApprovedHours, value: fmtHours(data.totalApprovedHours), label: "Approved hours" },
    { n: data.totalApprovedCases, value: `${data.totalApprovedCases}`, label: "Approved cases" },
    { n: data.placements.length, value: `${data.placements.length}`, label: data.placements.length === 1 ? "Placement" : "Placements" },
    { n: data.skills.length, value: `${data.skills.length}`, label: data.skills.length === 1 ? "Clinical skill" : "Clinical skills" },
  ].filter((s) => s.n > 0);
  const showStats = data.totalApprovedHours > 0 || data.totalApprovedCases > 0;
  const hasClinicalRecord = data.placements.length > 0;

  return (
    <Document title={`${data.name} — Curriculum Vitae`} author={data.name} subject="Curriculum Vitae" creator="Praxxt">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.name}>{data.name}</Text>
          <Text style={styles.headline}>
            {data.programName} Student · {data.institutionName}
          </Text>
          <View style={styles.contactRow}>
            <Text style={styles.contactItem}>
              <Text style={styles.contactLabel}>Email </Text>
              {data.email}
            </Text>
            {data.phone && (
              <Text style={styles.contactItem}>
                <Text style={styles.contactLabel}>Phone </Text>
                {data.phone}
              </Text>
            )}
          </View>
        </View>

        {showStats && (
          <View style={styles.stats} wrap={false}>
            {stats.map((s, i) => (
              <View key={s.label} style={i === stats.length - 1 ? [styles.stat, styles.statLast] : styles.stat}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}

        {data.personalStatement && (
          <View style={styles.section}>
            <SectionHeader title="Professional Profile" />
            <Text>{data.personalStatement}</Text>
          </View>
        )}

        <View style={[styles.section, styles.twoCol]} wrap={false}>
          <View style={styles.col}>
            <SectionHeader title="Education" />
            <Text style={styles.strong}>{data.programName}</Text>
            <Text style={styles.muted}>{data.institutionName}</Text>
            {data.cohortLabel && <Text style={styles.muted}>{data.cohortLabel}</Text>}
          </View>
          {interests.length > 0 && (
            <>
              <View style={styles.colGap} />
              <View style={styles.col}>
                <SectionHeader title="Areas of Interest" />
                <View style={styles.chips}>
                  {interests.map((interest) => (
                    <Text key={interest} style={styles.chip}>
                      {interest}
                    </Text>
                  ))}
                </View>
              </View>
            </>
          )}
        </View>

        {/* Empty sections are omitted rather than given placeholder text: the
            reader is an employer, not the student using the app. */}
        {hasClinicalRecord && (
          <View style={styles.section}>
            <SectionHeader title="Clinical Placements" />
            {data.placements.map((p, i) => (
              <View key={p.id} style={styles.timelineItem} wrap={false}>
                <View style={styles.rail}>
                  <View style={p.isCurrent ? [styles.dot, styles.dotCurrent] : styles.dot} />
                  {i < data.placements.length - 1 && <View style={styles.line} />}
                </View>
                <View style={styles.timelineBody}>
                  <View style={styles.placementTop}>
                    <Text style={styles.placementTitle}>
                      {p.siteName}
                      {p.departmentName ? ` — ${p.departmentName}` : ""}
                    </Text>
                    <Text style={styles.dates}>
                      {fmtMonth(p.startDate)} – {p.isCurrent ? "Present" : fmtMonth(p.endDate)}
                    </Text>
                  </View>
                  <Text style={styles.muted}>
                    {[p.location, `Supervisor: ${p.supervisorName}`].filter(Boolean).join("  ·  ")}
                  </Text>
                  {(p.approvedHours > 0 || p.approvedCases > 0) && (
                    <View style={styles.badgeRow}>
                      {p.approvedHours > 0 && <Text style={styles.badge}>{fmtHours(p.approvedHours)} approved hours</Text>}
                      {p.approvedCases > 0 && <Text style={styles.badge}>{plural(p.approvedCases, "approved case")}</Text>}
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {data.skills.length > 0 && (
          // A table that fits on one page moves whole rather than splitting
          // with its header stranded; a longer one has to flow across pages.
          <View style={styles.section} wrap={data.skills.length > SKILLS_KEPT_TOGETHER}>
            <SectionHeader title="Clinical Skills" />
            <View style={styles.skillHeader} wrap={false}>
              <Text style={[styles.skillName, styles.th]}>Skill</Text>
              <Text style={[styles.skillCases, styles.th]}>Cases</Text>
              <Text style={[styles.skillLevel, styles.th]}>Highest level performed</Text>
            </View>
            {data.skills.map((s) => (
              <View key={s.name} style={styles.skillRow} wrap={false}>
                <Text style={styles.skillName}>{s.name}</Text>
                <Text style={styles.skillCases}>{s.approvedCases}</Text>
                <View style={styles.skillLevel}>
                  <LevelMeter value={ENTRUSTMENT_LEVEL_VALUE[s.highestLevel]} />
                  <Text style={styles.levelText}>{CV_LEVEL_LABELS[s.highestLevel]}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footerRule} fixed />
        <Text style={styles.footerLeft} fixed>
          Placements, hours and skills verified by clinical supervisors on Praxxt · Generated {generated}
        </Text>
      </Page>
    </Document>
  );
}
