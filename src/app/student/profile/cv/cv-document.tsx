import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { CV_LEVEL_LABELS, type StudentCvData } from "@/lib/student-cv";

const TEAL = "#0E6F63";
const TEXT = "#1E2A27";
const MUTED = "#5B6B67";
const RULE = "#D9D3C6";

const styles = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 56, paddingHorizontal: 44, fontSize: 10, fontFamily: "Helvetica", color: TEXT, lineHeight: 1.4 },
  // Explicit lineHeight: the page-level 1.4 otherwise sizes this line box
  // for 10pt body text and the next line overlaps the name.
  name: { fontSize: 22, lineHeight: 1.2, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  headline: { fontSize: 11, color: TEAL, marginBottom: 4 },
  contact: { fontSize: 9, color: MUTED },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: TEAL,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 18,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottom: `0.75pt solid ${RULE}`,
  },
  paragraph: { marginBottom: 4 },
  itemRow: { flexDirection: "row", justifyContent: "space-between" },
  itemTitle: { fontFamily: "Helvetica-Bold", fontSize: 10.5 },
  // flex: 1 only inside the row layout — in a column it collapses to 0 height.
  itemTitleInRow: { flex: 1, paddingRight: 8 },
  itemDates: { fontSize: 9, color: MUTED },
  itemSub: { fontSize: 9, color: MUTED, marginTop: 1 },
  item: { marginBottom: 10 },
  summary: { fontSize: 9.5, marginBottom: 8 },
  skillHeader: { flexDirection: "row", borderBottom: `0.75pt solid ${RULE}`, paddingBottom: 3, marginBottom: 2 },
  skillRow: { flexDirection: "row", paddingVertical: 3, borderBottom: `0.5pt solid #EEEAE1` },
  skillName: { flex: 3, paddingRight: 6 },
  skillCases: { flex: 1, textAlign: "right", paddingRight: 10 },
  skillLevel: { flex: 2 },
  headerCell: { fontSize: 8, color: MUTED, fontFamily: "Helvetica-Bold" },
  footer: { position: "absolute", bottom: 24, left: 44, right: 44, fontSize: 7.5, color: MUTED, textAlign: "center" },
});

function fmtMonth(d: Date) {
  return new Date(d).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function fmtHours(h: number) {
  return Number.isInteger(h) ? `${h}` : h.toFixed(1);
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function StudentCvDocument({ data }: { data: StudentCvData }) {
  const generated = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const contact = [data.email, data.phone].filter(Boolean).join("  ·  ");

  return (
    <Document title={`${data.name} — CV`} author={data.name} creator="Praxxt">
      <Page size="A4" style={styles.page}>
        <Text style={styles.name}>{data.name}</Text>
        <Text style={styles.headline}>
          {data.programName} student · {data.institutionName}
        </Text>
        <Text style={styles.contact}>{contact}</Text>

        {data.personalStatement && (
          <>
            <Text style={styles.sectionTitle}>Profile</Text>
            <Text style={styles.paragraph}>{data.personalStatement}</Text>
          </>
        )}

        {data.areasOfInterest && (
          <>
            <Text style={styles.sectionTitle}>Areas of interest</Text>
            <Text style={styles.paragraph}>{data.areasOfInterest}</Text>
          </>
        )}

        <Text style={styles.sectionTitle}>Education</Text>
        <View style={styles.item}>
          <Text style={styles.itemTitle}>{data.programName}</Text>
          <Text style={styles.itemSub}>
            {data.institutionName}
            {data.cohortLabel ? `  ·  ${data.cohortLabel}` : ""}
          </Text>
        </View>

        {/* Empty sections are omitted rather than given placeholder text: the
            reader is an employer, not the student using the app. */}
        {data.placements.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Clinical placements</Text>
            {(data.totalApprovedHours > 0 || data.totalApprovedCases > 0) && (
              <Text style={styles.summary}>
                {fmtHours(data.totalApprovedHours)} supervisor-approved clinical hours and{" "}
                {plural(data.totalApprovedCases, "approved case")} across{" "}
                {plural(data.placements.length, "placement")}.
              </Text>
            )}
            {data.placements.map((p) => (
              <View key={p.id} style={styles.item} wrap={false}>
                <View style={styles.itemRow}>
                  <Text style={[styles.itemTitle, styles.itemTitleInRow]}>
                    {p.siteName}
                    {p.departmentName ? ` — ${p.departmentName}` : ""}
                  </Text>
                  <Text style={styles.itemDates}>
                    {fmtMonth(p.startDate)} – {p.isCurrent ? "Present" : fmtMonth(p.endDate)}
                  </Text>
                </View>
                <Text style={styles.itemSub}>
                  {[
                    p.location,
                    `Preceptor: ${p.preceptorName}`,
                    p.approvedHours > 0 ? `${fmtHours(p.approvedHours)} approved hours` : null,
                    p.approvedCases > 0 ? plural(p.approvedCases, "approved case") : null,
                  ]
                    .filter(Boolean)
                    .join("  ·  ")}
                </Text>
              </View>
            ))}
          </>
        )}

        {data.skills.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Clinical skills</Text>
            <View style={styles.skillHeader} wrap={false}>
              <Text style={[styles.skillName, styles.headerCell]}>SKILL</Text>
              <Text style={[styles.skillCases, styles.headerCell]}>CASES</Text>
              <Text style={[styles.skillLevel, styles.headerCell]}>HIGHEST LEVEL PERFORMED</Text>
            </View>
            {data.skills.map((s) => (
              <View key={s.name} style={styles.skillRow} wrap={false}>
                <Text style={styles.skillName}>{s.name}</Text>
                <Text style={styles.skillCases}>{s.approvedCases}</Text>
                <Text style={styles.skillLevel}>{CV_LEVEL_LABELS[s.highestLevel]}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.footer} fixed>
          Clinical placements, hours and skills on this CV are supervisor-verified records from Praxxt · Generated {generated}
        </Text>
      </Page>
    </Document>
  );
}
