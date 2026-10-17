import { randomUUID } from "crypto";
import { PrismaClient, Role } from "../src/generated/prisma/client";

// One demo program per profession added in
// migrations/20261017000000_more_discipline_templates — each with its own
// coordinator, supervisor and student, and two case entries that fill in
// that profession's extra log fields. Unlike the main seed (which only runs
// on an empty database), this runs on every demo deploy and skips any
// profession whose coordinator already exists, so it can land on a
// database that was seeded before these professions existed.

type ProfessionDemo = {
  key: string; // email prefix, e.g. "pharmacy" → pharmacy.student@praxxt.demo
  programName: string;
  degreeLevel: string;
  templateId: string;
  idPrefix: string;
  competencies: string[];
  coordinatorName: string;
  supervisor: { name: string; title: string; registrationNumber: string };
  studentName: string;
  cases: {
    title: string;
    competencyIndexes: number[];
    subjective: string;
    objectiveFindings: string;
    assessment: string;
    plan: string;
    extraFields: Record<string, string>;
  }[];
};

const VITALS = {
  vitalTempC: 36.9,
  vitalBpSystolic: 124,
  vitalBpDiastolic: 78,
  vitalPulse: 82,
  vitalRespRate: 16,
  vitalSpo2: 98,
};

const PROFESSIONS: ProfessionDemo[] = [
  {
    key: "medicine",
    programName: "MBChB Medicine",
    degreeLevel: "MBChB",
    templateId: "00000000-0000-0000-0000-000000000003",
    idPrefix: "MED",
    competencies: [
      "Takes a focused history and examination",
      "Formulates a differential diagnosis",
      "Requests and interprets basic investigations",
      "Performs venepuncture and IV cannulation",
      "Presents a patient on a ward round",
    ],
    coordinatorName: "Dr. Naledi Mokoena",
    supervisor: { name: "Dr. Daniel Okafor", title: "Consultant Physician", registrationNumber: "MDC-10482" },
    studentName: "Sara Haddad",
    cases: [
      {
        title: "Community-acquired pneumonia",
        competencyIndexes: [0, 1],
        subjective: "Four days of productive cough, fever and right-sided pleuritic chest pain.",
        objectiveFindings: "Febrile, crackles and bronchial breathing at the right base.",
        assessment: "Right lower lobe community-acquired pneumonia, CURB-65 score 1.",
        plan: "Oral antibiotics per local guideline, safety-net advice, review in 48 hours.",
        extraFields: {
          differentialDiagnosis: "Pneumonia; pulmonary embolism; acute bronchitis.",
          investigations: "Chest X-ray: right lower lobe consolidation. FBC: WCC 14.",
        },
      },
      {
        title: "New-onset type 2 diabetes",
        competencyIndexes: [2],
        subjective: "Three months of thirst, frequent urination and tiredness.",
        objectiveFindings: "BMI 31, otherwise unremarkable examination.",
        assessment: "Newly diagnosed type 2 diabetes mellitus.",
        plan: "Start metformin, lifestyle advice, refer to diabetes education.",
        extraFields: {
          differentialDiagnosis: "Type 2 diabetes; type 1 diabetes; steroid-induced hyperglycaemia.",
          investigations: "HbA1c 62 mmol/mol. Fasting glucose 9.1 mmol/L.",
        },
      },
    ],
  },
  {
    key: "physiotherapy",
    programName: "BSc Physiotherapy",
    degreeLevel: "BSc",
    templateId: "00000000-0000-0000-0000-000000000004",
    idPrefix: "PHY",
    competencies: [
      "Completes a subjective and objective assessment",
      "Uses validated outcome measures",
      "Sets treatment goals with the patient",
      "Delivers safe exercise therapy",
      "Teaches a home exercise programme",
    ],
    coordinatorName: "Ms. Ingrid Larsen",
    supervisor: { name: "Mr. Tomás Rivera", title: "Senior Physiotherapist", registrationNumber: "PT-55301" },
    studentName: "Leon Achterberg",
    cases: [
      {
        title: "Post-operative total knee replacement",
        competencyIndexes: [0, 3],
        subjective: "Day 2 after right total knee replacement, pain 4/10 on movement.",
        objectiveFindings: "Knee flexion 70°, extension lag 10°, walking with a frame.",
        assessment: "Expected early post-operative stiffness and quadriceps weakness.",
        plan: "Range-of-movement and quadriceps exercises, progress to crutches.",
        extraFields: {
          outcomeMeasures: "Timed Up and Go: 24 s. Pain on numeric rating scale: 4/10.",
          treatmentProvided: "Active-assisted knee flexion, static quads, gait re-education.",
        },
      },
      {
        title: "Chronic low back pain",
        competencyIndexes: [1, 4],
        subjective: "Six months of low back pain, worse with prolonged sitting.",
        objectiveFindings: "Reduced lumbar flexion, no neurological signs.",
        assessment: "Non-specific chronic low back pain.",
        plan: "Graded activity programme, education, review in two weeks.",
        extraFields: {
          outcomeMeasures: "Oswestry Disability Index: 32%.",
          treatmentProvided: "Pain education, core stability exercises, home programme.",
        },
      },
    ],
  },
  {
    key: "pharmacy",
    programName: "BPharm Pharmacy",
    degreeLevel: "BPharm",
    templateId: "00000000-0000-0000-0000-000000000005",
    idPrefix: "PHA",
    competencies: [
      "Takes an accurate medication history",
      "Screens prescriptions for safety",
      "Identifies drug-related problems",
      "Counsels patients on their medicines",
      "Documents pharmaceutical interventions",
    ],
    coordinatorName: "Dr. Priya Raman",
    supervisor: { name: "Mrs. Grace Nyambura", title: "Principal Clinical Pharmacist", registrationNumber: "PSC-20917" },
    studentName: "Omar Farouk",
    cases: [
      {
        title: "Medication review for postural hypotension",
        competencyIndexes: [0, 2],
        subjective: "Patient reports dizziness on standing since a new blood pressure tablet.",
        objectiveFindings: "Lying BP 132/80, standing BP 104/66.",
        assessment: "Postural hypotension, likely from the recently added doxazosin.",
        plan: "Recommended stopping doxazosin and rechecking lying and standing BP in one week.",
        extraFields: {
          medicinesReviewed: "Amlodipine 10 mg, doxazosin 4 mg, atorvastatin 20 mg.",
          interventions: "Advised prescriber to stop doxazosin; accepted.",
        },
      },
      {
        title: "Warfarin counselling at discharge",
        competencyIndexes: [3, 4],
        subjective: "Starting warfarin for atrial fibrillation, unsure how to take it.",
        objectiveFindings: "INR 2.3 on day of discharge.",
        assessment: "Needs anticoagulation counselling before discharge.",
        plan: "Counselled on dosing, monitoring, interactions and bleeding signs.",
        extraFields: {
          medicinesReviewed: "Warfarin 5 mg, bisoprolol 2.5 mg.",
          interventions: "Provided anticoagulant booklet and booked INR clinic.",
        },
      },
    ],
  },
  {
    key: "pa",
    programName: "BSc Physician Assistant Studies",
    degreeLevel: "BSc",
    templateId: "00000000-0000-0000-0000-000000000006",
    idPrefix: "PAS",
    competencies: [
      "Takes a focused history and examination",
      "Formulates a differential diagnosis",
      "Performs minor procedures safely",
      "Works within scope and escalates appropriately",
      "Communicates a management plan",
    ],
    coordinatorName: "Mr. James Whitfield",
    supervisor: { name: "Dr. Amina Bello", title: "Emergency Medicine Physician", registrationNumber: "MDC-30775" },
    studentName: "Chloe Martin",
    cases: [
      {
        title: "Forearm laceration repair",
        competencyIndexes: [2],
        subjective: "Cut forearm on broken glass an hour ago, tetanus up to date.",
        objectiveFindings: "4 cm clean laceration, no tendon or nerve involvement.",
        assessment: "Simple forearm laceration suitable for primary closure.",
        plan: "Local anaesthetic, wound irrigation, sutures out in 10 days.",
        extraFields: {
          differentialDiagnosis: "Simple laceration; exclude tendon injury and retained glass.",
          proceduresPerformed: "Local anaesthetic infiltration and five interrupted sutures.",
        },
      },
      {
        title: "Acute chest pain",
        competencyIndexes: [0, 3],
        subjective: "Central chest tightness for 40 minutes radiating to the left arm.",
        objectiveFindings: "Sweaty, BP 150/90, ECG shows ST depression in V4–V6.",
        assessment: "Suspected acute coronary syndrome.",
        plan: "Escalated to the supervising physician immediately; aspirin given per protocol.",
        extraFields: {
          differentialDiagnosis: "Acute coronary syndrome; aortic dissection; pulmonary embolism.",
          proceduresPerformed: "12-lead ECG, IV cannulation, bloods including troponin.",
        },
      },
    ],
  },
];

const DOC_TYPES = ["Immunization Record", "BLS/CPR Certification", "Background Check", "Indemnity Insurance"];

export async function seedProfessionDemos(prisma: PrismaClient, passwordHash: string): Promise<void> {
  // The demo institution is whichever one the demo super admin belongs to;
  // a database without it isn't a demo database, so nothing is added.
  const superAdmin = await prisma.user.findUnique({ where: { email: "superadmin@praxxt.demo" } });
  if (!superAdmin) {
    console.log("No demo super admin found; skipping profession demos.");
    return;
  }
  const institutionId = superAdmin.institutionId;

  for (const p of PROFESSIONS) {
    const coordinatorEmail = `${p.key}.coordinator@praxxt.demo`;
    if (await prisma.user.findUnique({ where: { email: coordinatorEmail } })) continue;

    await prisma.$transaction(async (tx) => {
      const site =
        (await tx.clinicalSite.findFirst({ where: { institutionId }, orderBy: { createdAt: "asc" } })) ??
        (await tx.clinicalSite.create({
          data: { institutionId, name: "Demo Teaching Hospital", maxStudentCapacity: 40 },
        }));

      const program = await tx.program.create({
        data: {
          institutionId,
          name: p.programName,
          degreeLevel: p.degreeLevel,
          disciplineTemplateId: p.templateId,
          defaultMinCases: 20,
          defaultMinHours: 120,
        },
      });
      const cohort = await tx.cohort.create({
        data: {
          programId: program.id,
          name: "Year 3",
          academicYear: "2026/2027",
          term: "Semester 1",
          startDate: new Date("2026-09-01"),
          endDate: new Date("2026-12-19"),
        },
      });
      const competencies: { id: string }[] = [];
      for (const name of p.competencies) {
        const c = await tx.competency.create({ data: { programId: program.id, name } });
        await tx.programCompetencyRequirement.create({
          data: { programId: program.id, competencyId: c.id, minOccurrences: 3 },
        });
        competencies.push(c);
      }
      await tx.scoringConfig.create({ data: { programId: program.id } });
      await tx.requiredDocumentType.createMany({
        data: DOC_TYPES.map((name) => ({ programId: program.id, name })),
      });

      const common = { institutionId, passwordHash, emailVerified: new Date() };
      await tx.user.create({
        data: {
          ...common,
          role: Role.COORDINATOR,
          name: p.coordinatorName,
          email: coordinatorEmail,
          coordinatorProfile: { create: { programId: program.id } },
        },
      });
      const supervisor = await tx.user.create({
        data: {
          ...common,
          role: Role.SUPERVISOR,
          name: p.supervisor.name,
          email: `${p.key}.supervisor@praxxt.demo`,
          supervisorProfile: {
            create: { professionalTitle: p.supervisor.title, registrationNumber: p.supervisor.registrationNumber },
          },
        },
        include: { supervisorProfile: true },
      });
      const student = await tx.user.create({
        data: {
          ...common,
          role: Role.STUDENT,
          name: p.studentName,
          email: `${p.key}.student@praxxt.demo`,
          studentProfile: {
            create: { studentIdNumber: `DEMO-${p.idPrefix}-2026-001`, programId: program.id, cohortId: cohort.id },
          },
        },
        include: { studentProfile: true },
      });

      const rotation = await tx.rotation.create({
        data: {
          studentId: student.studentProfile!.id,
          programId: program.id,
          cohortId: cohort.id,
          clinicalSiteId: site.id,
          supervisorId: supervisor.supervisorProfile!.id,
          startDate: new Date("2026-09-01"),
          endDate: new Date("2026-12-01"),
          status: "ACTIVE",
        },
      });

      // First case is already signed off (so the student's progress and CV
      // have something in them); the second waits in the supervisor's queue.
      for (const [i, c] of p.cases.entries()) {
        const approved = i === 0;
        const occurredAt = new Date(approved ? "2026-09-15T10:00:00Z" : "2026-10-08T14:00:00Z");
        const entry = await tx.logEntry.create({
          data: {
            id: randomUUID(),
            studentId: student.studentProfile!.id,
            rotationId: rotation.id,
            status: approved ? "APPROVED" : "SUBMITTED",
            caseTitle: c.title,
            occurredAt,
            studentRole: "DIRECT_SUPERVISION",
            supervisorAssessedRole: approved ? "DIRECT_SUPERVISION" : null,
            subjective: c.subjective,
            ...VITALS,
            objectiveFindings: c.objectiveFindings,
            assessment: c.assessment,
            plan: c.plan,
            extraFields: c.extraFields,
            submittedAt: new Date(occurredAt.getTime() + 2 * 60 * 60 * 1000),
            competencies: { create: c.competencyIndexes.map((ci) => ({ competencyId: competencies[ci].id })) },
          },
        });
        if (approved) {
          await tx.supervisorReview.create({
            data: {
              id: randomUUID(),
              logEntryId: entry.id,
              supervisorId: supervisor.id,
              decision: "APPROVED",
              comments: "Clear, well-reasoned entry.",
              attested: true,
            },
          });
        }
      }
    });
    console.log(`  Added ${p.programName}: ${p.key}.coordinator / .supervisor / .student @praxxt.demo`);
  }
}
