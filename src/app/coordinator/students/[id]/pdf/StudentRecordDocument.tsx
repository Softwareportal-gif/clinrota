import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { StudentRecordData } from "@/lib/student-record";
import { COVERAGE_STATUS_LABELS } from "@/lib/coverage-status";
import { DOC_STATUS_LABELS, isCompliant } from "@/lib/compliance-status";
import { STATUS_LABELS } from "@/lib/log-entry-constants";
import type { LogEntryStatus } from "@/generated/prisma/client";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#1f2937" },
  h1: { fontSize: 16, fontWeight: 700, marginBottom: 2 },
  subtitle: { fontSize: 9, color: "#6b7280", marginBottom: 16 },
  h2: { fontSize: 11, fontWeight: 700, marginTop: 16, marginBottom: 6, borderBottom: "1pt solid #e5e7eb", paddingBottom: 3 },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 4 },
  infoItem: { width: "50%", marginBottom: 4 },
  infoLabel: { fontSize: 8, color: "#9ca3af" },
  infoValue: { fontSize: 10 },
  table: { display: "flex", width: "auto" },
  tableRow: { flexDirection: "row", borderBottom: "0.5pt solid #e5e7eb", paddingVertical: 4 },
  tableHeaderRow: { flexDirection: "row", borderBottom: "1pt solid #9ca3af", paddingVertical: 4, fontWeight: 700 },
  cell: { flex: 1, paddingRight: 4 },
  small: { fontSize: 8, color: "#6b7280" },
  card: { marginBottom: 8, padding: 8, border: "0.5pt solid #e5e7eb" },
  emptyNote: { fontSize: 9, color: "#9ca3af", fontStyle: "italic" },
});

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString();
}
function fmtPercent(n: number | null) {
  return n === null ? "—" : `${n.toFixed(1)}%`;
}

export function StudentRecordDocument({ data }: { data: StudentRecordData }) {
  const { student, rotations, logbookCounts, totalLogEntries, coverage, compliance } = data;
  const compliantCount = compliance.filter((c) => isCompliant(c.status)).length;

  return (
    <Document title={`${student.user.name} — Rotation Summary`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>{student.user.name}</Text>
        <Text style={styles.subtitle}>
          Rotation summary · Generated {new Date().toLocaleDateString()}
        </Text>

        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>STUDENT ID</Text>
            <Text style={styles.infoValue}>{student.studentIdNumber}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>PROGRAM</Text>
            <Text style={styles.infoValue}>{student.program.name}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>COHORT</Text>
            <Text style={styles.infoValue}>
              {student.cohort
                ? `${student.cohort.name} · ${student.cohort.academicYear} ${student.cohort.term}`
                : "—"}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>EMAIL</Text>
            <Text style={styles.infoValue}>{student.user.email}</Text>
          </View>
        </View>

        <Text style={styles.h2}>Placement / rotation history</Text>
        {rotations.length === 0 ? (
          <Text style={styles.emptyNote}>No rotations assigned.</Text>
        ) : (
          rotations.map((rotation) => (
            <View key={rotation.id} style={styles.card} wrap={false}>
              <Text style={{ fontWeight: 700 }}>
                {rotation.clinicalSite.name}
                {rotation.siteDepartment ? ` — ${rotation.siteDepartment.name}` : ""} ({rotation.status})
              </Text>
              <Text style={styles.small}>
                {fmtDate(rotation.startDate)} – {fmtDate(rotation.endDate)} · Supervisor:{" "}
                {rotation.supervisor.user.name}
              </Text>
              <Text style={{ marginTop: 3 }}>
                Hours: {rotation.hours.completedHours.toFixed(1)}
                {rotation.hours.requiredHours !== null ? ` / ${rotation.hours.requiredHours} required` : " logged"}
                {"   ·   "}Evaluation: {fmtPercent(rotation.evaluationPercent)}
                {"   ·   "}Score:{" "}
                {rotation.rotationScore
                  ? `${rotation.rotationScore.finalScore.toFixed(1)}% (${rotation.rotationScore.passed ? "Pass" : "Fail"}${rotation.rotationScore.isOverridden ? ", overridden" : ""})`
                  : "not yet calculated"}
              </Text>
            </View>
          ))
        )}

        <Text style={styles.h2}>Logbook summary — {totalLogEntries} entries</Text>
        <View style={styles.tableRow}>
          {(Object.keys(logbookCounts) as LogEntryStatus[]).map((status) => (
            <Text key={status} style={styles.cell}>
              {STATUS_LABELS[status]}: {logbookCounts[status]}
            </Text>
          ))}
        </View>

        <Text style={styles.h2}>Competency coverage — {fmtPercent(coverage.percent)} met</Text>
        {coverage.items.length === 0 ? (
          <Text style={styles.emptyNote}>No required competencies configured.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={styles.cell}>Competency</Text>
              <Text style={styles.cell}>Highest level</Text>
              <Text style={styles.cell}>Status</Text>
            </View>
            {coverage.items.map((item) => (
              <View key={item.competencyId} style={styles.tableRow}>
                <Text style={styles.cell}>{item.competencyName}</Text>
                <Text style={styles.cell}>
                  {item.highestLevelValue ?? "—"} / {item.minLevelValue} req.
                </Text>
                <Text style={styles.cell}>{COVERAGE_STATUS_LABELS[item.status]}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.h2}>
          Compliance status — {compliantCount} / {compliance.length} verified
        </Text>
        {compliance.length === 0 ? (
          <Text style={styles.emptyNote}>No required document types configured.</Text>
        ) : (
          <View style={styles.table}>
            {compliance.map((doc) => (
              <View key={doc.requiredDocumentTypeId} style={styles.tableRow}>
                <Text style={styles.cell}>{doc.name}</Text>
                <Text style={styles.cell}>{DOC_STATUS_LABELS[doc.status]}</Text>
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}
