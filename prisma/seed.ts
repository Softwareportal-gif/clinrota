import "dotenv/config";
import { randomUUID } from "crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";
import { LCJR_FLAT } from "../src/lib/lcjr";
import { LCJR_TEMPLATE_ID } from "../src/lib/discipline-template";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const DEMO_PASSWORD = "Password123!";

async function main() {
  // Deploy builds call this with SEED_ONLY_IF_EMPTY so demo data lands once
  // on a fresh database and every later build is a no-op.
  if (process.env.SEED_ONLY_IF_EMPTY === "true" && (await prisma.user.count()) > 0) {
    console.log("Database already has users; skipping demo seed.");
    return;
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // ── Institution ────────────────────────────────────────────────────────
  const institution = await prisma.institution.create({
    data: {
      name: "Accra College of Health Sciences",
      location: "Accra, Greater Accra Region, Ghana",
    },
  });

  // ── Programs ────────────────────────────────────────────────────────────
  const nursingProgram = await prisma.program.create({
    data: {
      institutionId: institution.id,
      name: "BSc Nursing",
      degreeLevel: "BSc",
      defaultMinCases: 30,
      defaultMinHours: 160,
      disciplineTemplateId: LCJR_TEMPLATE_ID,
    },
  });

  const midwiferyProgram = await prisma.program.create({
    data: {
      institutionId: institution.id,
      name: "Diploma in Midwifery",
      degreeLevel: "Diploma",
      defaultMinCases: 20,
      defaultMinHours: 120,
      disciplineTemplateId: LCJR_TEMPLATE_ID,
    },
  });

  // ── Cohorts ─────────────────────────────────────────────────────────────
  const nursingCohort = await prisma.cohort.create({
    data: {
      programId: nursingProgram.id,
      name: "Level 300",
      academicYear: "2026/2027",
      term: "Semester 1",
      startDate: new Date("2026-09-01"),
      endDate: new Date("2026-12-19"),
    },
  });

  const midwiferyCohort = await prisma.cohort.create({
    data: {
      programId: midwiferyProgram.id,
      name: "Level 200",
      academicYear: "2026/2027",
      term: "Semester 1",
      startDate: new Date("2026-09-01"),
      endDate: new Date("2026-12-19"),
    },
  });

  // ── Competencies ────────────────────────────────────────────────────────
  const nursingCompetencies = await Promise.all(
    [
      "Performs a comprehensive head-to-toe assessment",
      "Demonstrates aseptic technique during wound care",
      "Administers medication safely (5 rights)",
      "Performs venipuncture / IV cannulation",
      "Documents nursing care accurately",
    ].map((name) =>
      prisma.competency.create({
        data: { programId: nursingProgram.id, name },
      })
    )
  );

  const midwiferyCompetencies = await Promise.all(
    [
      "Performs a focused maternal assessment",
      "Conducts active management of third stage of labour",
      "Performs a normal vaginal delivery",
      "Provides essential newborn care",
      "Counsels on family planning methods",
    ].map((name) =>
      prisma.competency.create({
        data: { programId: midwiferyProgram.id, name },
      })
    )
  );

  await Promise.all(
    nursingCompetencies.map((c) =>
      prisma.programCompetencyRequirement.create({
        data: { programId: nursingProgram.id, competencyId: c.id, minOccurrences: 3 },
      })
    )
  );
  await Promise.all(
    midwiferyCompetencies.map((c) =>
      prisma.programCompetencyRequirement.create({
        data: { programId: midwiferyProgram.id, competencyId: c.id, minOccurrences: 3 },
      })
    )
  );

  // ── Scoring configs (defaults, per spec Section 5) ─────────────────────
  await prisma.scoringConfig.create({ data: { programId: nursingProgram.id } });
  await prisma.scoringConfig.create({ data: { programId: midwiferyProgram.id } });

  // ── Required compliance document types (coordinator-managed per program) ─
  const REQUIRED_DOC_TYPE_NAMES = [
    "Immunization Record",
    "BLS/CPR Certification",
    "Background Check",
    "Indemnity Insurance",
    "Professional Body Registration",
  ];
  const nursingDocTypes = Object.fromEntries(
    await Promise.all(
      REQUIRED_DOC_TYPE_NAMES.map(async (name) => [
        name,
        await prisma.requiredDocumentType.create({ data: { programId: nursingProgram.id, name } }),
      ])
    )
  ) as Record<string, { id: string }>;
  const midwiferyDocTypes = Object.fromEntries(
    await Promise.all(
      REQUIRED_DOC_TYPE_NAMES.map(async (name) => [
        name,
        await prisma.requiredDocumentType.create({
          data: { programId: midwiferyProgram.id, name },
        }),
      ])
    )
  ) as Record<string, { id: string }>;

  // ── Clinical sites ──────────────────────────────────────────────────────
  const site = await prisma.clinicalSite.create({
    data: {
      institutionId: institution.id,
      name: "Korle Bu Teaching Hospital",
      location: "Korle Bu, Accra",
      contactName: "Mrs. Abena Owusu",
      contactPhone: "+233 24 000 0000",
      contactEmail: "clinicalunit@kbth.example.gov.gh",
      mouStartDate: new Date("2026-01-01"),
      mouEndDate: new Date("2027-12-31"),
      maxStudentCapacity: 40,
    },
  });

  // A second site whose affiliation agreement is expiring soon, to exercise
  // the coordinator's contract-expiry flag without touching any rotation.
  // Also the ward-supervision demo site — kept separate from Korle Bu's
  // rotations/entries above so that feature's data doesn't entangle with
  // the pre-existing golden-path fixtures.
  const ridgeHospital = await prisma.clinicalSite.create({
    data: {
      institutionId: institution.id,
      name: "Ridge Regional Hospital",
      location: "Ridge, Accra",
      contactName: "Mr. Samuel Tetteh",
      contactPhone: "+233 24 555 1212",
      contactEmail: "affiliations@ridgehospital.example.gov.gh",
      mouStartDate: new Date("2024-11-01"),
      mouEndDate: new Date("2026-11-01"), // ~6 weeks out from seed date — expiring soon
      maxStudentCapacity: 15,
      wardSupervisionEnabled: true,
    },
  });

  const maternityWard = await prisma.siteDepartment.create({
    data: { clinicalSiteId: site.id, name: "Maternity Ward" },
  });
  const medicalWard = await prisma.siteDepartment.create({
    data: { clinicalSiteId: site.id, name: "General Medical Ward" },
  });

  await prisma.siteCapacityWindow.create({
    data: {
      siteDepartmentId: maternityWard.id,
      startDate: new Date("2026-09-01"),
      endDate: new Date("2026-12-19"),
      maxStudents: 8,
    },
  });
  await prisma.siteCapacityWindow.create({
    data: {
      siteDepartmentId: medicalWard.id,
      startDate: new Date("2026-09-01"),
      endDate: new Date("2026-12-19"),
      maxStudents: 10,
    },
  });

  // ── Users ───────────────────────────────────────────────────────────────
  const superAdmin = await prisma.user.create({
    data: {
      institutionId: institution.id,
      role: Role.SUPER_ADMIN,
      name: "System Administrator",
      email: "superadmin@praxxt.demo",
      passwordHash,
      emailVerified: new Date(),
    },
  });

  const coordinatorUser = await prisma.user.create({
    data: {
      institutionId: institution.id,
      role: Role.COORDINATOR,
      name: "Dr. Kofi Mensah",
      email: "coordinator@praxxt.demo",
      passwordHash,
      emailVerified: new Date(),
      coordinatorProfile: {
        create: { programId: nursingProgram.id },
      },
    },
  });

  const coordinatorUser2 = await prisma.user.create({
    data: {
      institutionId: institution.id,
      role: Role.COORDINATOR,
      name: "Ms. Adjoa Darko",
      email: "coordinator2@praxxt.demo",
      passwordHash,
      emailVerified: new Date(),
      coordinatorProfile: {
        create: { programId: midwiferyProgram.id },
      },
    },
  });

  const supervisorUser1 = await prisma.user.create({
    data: {
      institutionId: institution.id,
      role: Role.SUPERVISOR,
      name: "Mrs. Efua Asante",
      email: "supervisor1@praxxt.demo",
      passwordHash,
      emailVerified: new Date(),
      supervisorProfile: {
        create: { registrationNumber: "NMC-RN-10234", professionalTitle: "RGN, Ward Sister" },
      },
    },
    include: { supervisorProfile: true },
  });

  const supervisorUser2 = await prisma.user.create({
    data: {
      institutionId: institution.id,
      role: Role.SUPERVISOR,
      name: "Mr. Yaw Boateng",
      email: "supervisor2@praxxt.demo",
      passwordHash,
      emailVerified: new Date(),
      supervisorProfile: {
        create: { registrationNumber: "NMC-RM-88231", professionalTitle: "Midwife Specialist" },
      },
    },
    include: { supervisorProfile: true },
  });

  const studentUser1 = await prisma.user.create({
    data: {
      institutionId: institution.id,
      role: Role.STUDENT,
      name: "Ama Serwaa",
      email: "student1@praxxt.demo",
      passwordHash,
      emailVerified: new Date(),
      studentProfile: {
        create: {
          studentIdNumber: "ACHS-NUR-2026-001",
          programId: nursingProgram.id,
          cohortId: nursingCohort.id,
          phone: "+233 20 111 2222",
        },
      },
    },
    include: { studentProfile: true },
  });

  const studentUser2 = await prisma.user.create({
    data: {
      institutionId: institution.id,
      role: Role.STUDENT,
      name: "Kwabena Owusu",
      email: "student2@praxxt.demo",
      passwordHash,
      emailVerified: new Date(),
      studentProfile: {
        create: {
          studentIdNumber: "ACHS-MID-2026-014",
          programId: midwiferyProgram.id,
          cohortId: midwiferyCohort.id,
          phone: "+233 20 333 4444",
        },
      },
    },
    include: { studentProfile: true },
  });

  // ── Rotations ───────────────────────────────────────────────────────────
  const rotation1 = await prisma.rotation.create({
    data: {
      studentId: studentUser1.studentProfile!.id,
      programId: nursingProgram.id,
      cohortId: nursingCohort.id,
      clinicalSiteId: site.id,
      siteDepartmentId: medicalWard.id,
      supervisorId: supervisorUser1.supervisorProfile!.id,
      startDate: new Date("2026-09-01"),
      endDate: new Date("2026-11-01"),
      status: "ACTIVE",
    },
  });

  const rotation2 = await prisma.rotation.create({
    data: {
      studentId: studentUser2.studentProfile!.id,
      programId: midwiferyProgram.id,
      cohortId: midwiferyCohort.id,
      clinicalSiteId: site.id,
      siteDepartmentId: maternityWard.id,
      supervisorId: supervisorUser2.supervisorProfile!.id,
      startDate: new Date("2026-09-01"),
      endDate: new Date("2026-11-01"),
      status: "ACTIVE",
    },
  });

  // ── Sample log entries (SOAP) ───────────────────────────────────────────
  const approvedEntry = await prisma.logEntry.create({
    data: {
      id: randomUUID(),
      studentId: studentUser1.studentProfile!.id,
      rotationId: rotation1.id,
      status: "APPROVED",
      caseTitle: "Post-operative wound dressing",
      occurredAt: new Date("2026-09-10T09:30:00Z"),
      studentRole: "UNSUPERVISED",
      supervisorAssessedRole: "UNSUPERVISED",
      subjective: "Patient reports mild pain (3/10) at surgical site, no fever.",
      vitalTempC: 37.1,
      vitalBpSystolic: 118,
      vitalBpDiastolic: 76,
      vitalPulse: 78,
      vitalRespRate: 18,
      vitalSpo2: 98,
      objectiveFindings: "Wound clean, dry, edges approximated, no discharge or erythema.",
      assessment: "Post-operative wound healing well, no signs of infection.",
      plan: "Continued daily aseptic dressing change, monitor for signs of infection, reassess in 48 hours.",
      submittedAt: new Date("2026-09-10T11:00:00Z"),
      competencies: {
        create: [{ competencyId: nursingCompetencies[1].id }],
      },
    },
  });

  await prisma.supervisorReview.create({
    data: {
      id: randomUUID(),
      logEntryId: approvedEntry.id,
      supervisorId: supervisorUser1.id,
      decision: "APPROVED",
      comments: "Well documented, technique observed was correct.",
      attested: true,
    },
  });

  await prisma.logEntry.create({
    data: {
      id: randomUUID(),
      studentId: studentUser1.studentProfile!.id,
      rotationId: rotation1.id,
      status: "SUBMITTED",
      caseTitle: "Peripheral IV cannulation",
      occurredAt: new Date("2026-09-14T14:00:00Z"),
      studentRole: "DIRECT_SUPERVISION",
      subjective: "Patient reports anxiety about needle insertion, no known allergies.",
      vitalTempC: 36.8,
      vitalBpSystolic: 122,
      vitalBpDiastolic: 80,
      vitalPulse: 84,
      vitalRespRate: 16,
      vitalSpo2: 99,
      objectiveFindings: "22G cannula sited to left forearm on first attempt, no swelling.",
      assessment: "Successful IV access for scheduled antibiotic administration.",
      plan: "Monitor cannula site every shift, remove per hospital policy at 72 hours.",
      submittedAt: new Date("2026-09-14T16:00:00Z"),
      competencies: {
        create: [{ competencyId: nursingCompetencies[3].id }],
      },
    },
  });

  await prisma.logEntry.create({
    data: {
      id: randomUUID(),
      studentId: studentUser1.studentProfile!.id,
      rotationId: rotation1.id,
      status: "DRAFT",
      caseTitle: "Medication administration round",
      occurredAt: new Date("2026-09-18T08:00:00Z"),
      studentRole: "OBSERVATION_ONLY",
      subjective: "",
      objectiveFindings: "",
      assessment: "",
      plan: "",
    },
  });

  const midwiferyEntry = await prisma.logEntry.create({
    data: {
      id: randomUUID(),
      studentId: studentUser2.studentProfile!.id,
      rotationId: rotation2.id,
      status: "NEEDS_REVISION",
      caseTitle: "Normal vaginal delivery",
      occurredAt: new Date("2026-09-12T02:15:00Z"),
      studentRole: "DIRECT_SUPERVISION",
      // Demonstrates the self-report vs. supervisor-assessed gap: the
      // student felt closely supervised, the supervisor judged otherwise.
      supervisorAssessedRole: "INDIRECT_SUPERVISION",
      subjective: "G2P1, spontaneous onset of labour at 39+2 weeks, no complications reported.",
      vitalTempC: 36.9,
      vitalBpSystolic: 110,
      vitalBpDiastolic: 70,
      vitalPulse: 88,
      vitalRespRate: 18,
      vitalSpo2: 98,
      objectiveFindings: "Full dilation reached, spontaneous rupture of membranes, clear liquor.",
      assessment: "Normal progression of labour, active second stage.",
      plan: "Continued monitoring, active management of third stage, essential newborn care.",
      submittedAt: new Date("2026-09-13T10:00:00Z"),
      competencies: {
        create: [
          { competencyId: midwiferyCompetencies[2].id },
          { competencyId: midwiferyCompetencies[1].id },
        ],
      },
    },
  });

  await prisma.supervisorReview.create({
    data: {
      id: randomUUID(),
      logEntryId: midwiferyEntry.id,
      supervisorId: supervisorUser2.id,
      decision: "NEEDS_REVISION",
      comments: "Please add Apgar scores and time of placental delivery to the Objective section.",
      attested: false,
    },
  });

  // ── Competency evaluation (Lasater Clinical Judgment Rubric) ────────────
  // 11 sub-dimension ratings, 1 (Beginning) – 4 (Exemplary). Mostly
  // "Accomplished", one "Developing" (skill still building with IV
  // cannulation) and two "Exemplary", matching the overall comment below.
  const LCJR_DEMO_LEVELS: Record<string, number> = {
    FOCUSED_OBSERVATION: 3,
    RECOGNIZING_DEVIATIONS: 3,
    INFORMATION_SEEKING: 3,
    PRIORITIZING_DATA: 3,
    MAKING_SENSE_OF_DATA: 3,
    CALM_CONFIDENT_MANNER: 4,
    CLEAR_COMMUNICATION: 3,
    WELL_PLANNED_INTERVENTION: 3,
    BEING_SKILLFUL: 2,
    EVALUATION_SELF_ANALYSIS: 3,
    COMMITMENT_TO_IMPROVEMENT: 4,
  };

  await prisma.competencyEvaluation.create({
    data: {
      rotationId: rotation1.id,
      studentId: studentUser1.studentProfile!.id,
      supervisorId: supervisorUser1.id,
      status: "SUBMITTED",
      overallComments: "Consistent, safe practice. Continue building confidence with IV therapy.",
      ratings: {
        create: LCJR_FLAT.map(({ dimension, subDimension }) => ({
          dimension,
          subDimension,
          level: LCJR_DEMO_LEVELS[subDimension] ?? 3,
        })),
      },
    },
  });

  // ── Timesheets ──────────────────────────────────────────────────────────
  await prisma.timesheetEntry.create({
    data: {
      id: randomUUID(),
      studentId: studentUser1.studentProfile!.id,
      rotationId: rotation1.id,
      shiftDate: new Date("2026-09-10"),
      clockIn: new Date("2026-09-10T07:00:00Z"),
      clockOut: new Date("2026-09-10T15:00:00Z"),
      hours: 8,
      status: "APPROVED",
      approvedById: supervisorUser1.id,
      approvedAt: new Date("2026-09-10T15:30:00Z"),
    },
  });
  await prisma.timesheetEntry.create({
    data: {
      id: randomUUID(),
      studentId: studentUser1.studentProfile!.id,
      rotationId: rotation1.id,
      shiftDate: new Date("2026-09-17"),
      clockIn: new Date("2026-09-17T07:00:00Z"),
      clockOut: new Date("2026-09-17T15:00:00Z"),
      hours: 8,
      status: "PENDING",
    },
  });

  // ── Compliance documents ────────────────────────────────────────────────
  // Ama Serwaa (nursing) — deliberately messy, to exercise every flag state:
  // verified-but-expiring-soon, pending, expired-despite-verified, and two
  // required types left entirely missing.
  await prisma.complianceDocument.create({
    data: {
      studentId: studentUser1.studentProfile!.id,
      requiredDocumentTypeId: nursingDocTypes["BLS/CPR Certification"].id,
      fileUrl: "/uploads/demo/bls-cpr-ama-serwaa.pdf",
      issueDate: new Date("2025-10-01"),
      expiryDate: new Date("2026-10-01"), // expiring soon
      verificationStatus: "VERIFIED",
      verifiedById: coordinatorUser.id,
      verifiedAt: new Date("2026-09-02"),
    },
  });
  await prisma.complianceDocument.create({
    data: {
      studentId: studentUser1.studentProfile!.id,
      requiredDocumentTypeId: nursingDocTypes["Immunization Record"].id,
      fileUrl: "/uploads/demo/immunization-ama-serwaa.pdf",
      issueDate: new Date("2024-01-15"),
      verificationStatus: "PENDING_VERIFICATION",
    },
  });
  await prisma.complianceDocument.create({
    data: {
      studentId: studentUser1.studentProfile!.id,
      requiredDocumentTypeId: nursingDocTypes["Background Check"].id,
      fileUrl: "/uploads/demo/background-check-ama-serwaa.pdf",
      issueDate: new Date("2025-06-01"),
      expiryDate: new Date("2026-07-01"), // already expired, despite being verified
      verificationStatus: "VERIFIED",
      verifiedById: coordinatorUser.id,
      verifiedAt: new Date("2025-06-05"),
    },
  });
  // Indemnity Insurance and Professional Body Registration left unset —
  // shows as "Missing" on the compliance grid.

  // Kwabena Owusu (midwifery) — fully compliant, for contrast: every
  // required type verified with a comfortably future expiry date.
  for (const [name, expiryYear] of [
    ["Immunization Record", 2027],
    ["BLS/CPR Certification", 2027],
    ["Background Check", 2028],
    ["Indemnity Insurance", 2027],
    ["Professional Body Registration", 2028],
  ] as const) {
    await prisma.complianceDocument.create({
      data: {
        studentId: studentUser2.studentProfile!.id,
        requiredDocumentTypeId: midwiferyDocTypes[name].id,
        fileUrl: `/uploads/demo/${name.toLowerCase().replace(/[^a-z]+/g, "-")}-kwabena-owusu.pdf`,
        issueDate: new Date("2025-09-01"),
        expiryDate: new Date(`${expiryYear}-06-01`),
        verificationStatus: "VERIFIED",
        verifiedById: coordinatorUser2.id,
        verifiedAt: new Date("2025-09-05"),
      },
    });
  }

  // ── Notifications ───────────────────────────────────────────────────────
  await prisma.notification.create({
    data: {
      userId: supervisorUser1.id,
      type: "PENDING_REVIEW",
      title: "1 entry awaiting your review",
      body: "Ama Serwaa submitted a new SOAP entry: Peripheral IV cannulation.",
      relatedEntityType: "LogEntry",
    },
  });
  await prisma.notification.create({
    data: {
      userId: studentUser2.id,
      type: "ENTRY_NEEDS_REVISION",
      title: "Your entry needs revision",
      body: "Mr. Yaw Boateng requested changes to: Normal vaginal delivery.",
      relatedEntityType: "LogEntry",
      relatedEntityId: midwiferyEntry.id,
    },
  });
  await prisma.notification.create({
    data: {
      userId: studentUser1.id,
      type: "DOCUMENT_EXPIRING",
      title: "Your BLS/CPR certification expires soon",
      body: "Your BLS/CPR Certification expires on 2026-10-01. Please arrange renewal.",
      relatedEntityType: "ComplianceDocument",
    },
  });

  // ── Ward-level sub-supervisor demo (Ridge Regional Hospital) ────────────
  // Two ward supervisors eligible at Ridge, a third nursing student with an
  // active rotation there, and no WardAssignment yet — so the mandatory
  // ward-selection gate is exercised live on this student's first entry
  // rather than pre-seeded away.
  const wardSupervisorUser1 = await prisma.user.create({
    data: {
      institutionId: institution.id,
      role: Role.SUPERVISOR,
      name: "Mrs. Grace Amponsah",
      email: "wardsupervisor1@praxxt.demo",
      passwordHash,
      emailVerified: new Date(),
      supervisorProfile: {
        create: { registrationNumber: "NMC-RN-55210", professionalTitle: "Ward Sister, Surgical" },
      },
    },
    include: { supervisorProfile: true },
  });

  const wardSupervisorUser2 = await prisma.user.create({
    data: {
      institutionId: institution.id,
      role: Role.SUPERVISOR,
      name: "Mr. Isaac Nkrumah",
      email: "wardsupervisor2@praxxt.demo",
      passwordHash,
      emailVerified: new Date(),
      supervisorProfile: {
        create: { registrationNumber: "NMC-RN-55211", professionalTitle: "Ward Sister, Medical" },
      },
    },
    include: { supervisorProfile: true },
  });

  await prisma.wardSupervisorEligibility.createMany({
    data: [
      { clinicalSiteId: ridgeHospital.id, supervisorProfileId: wardSupervisorUser1.supervisorProfile!.id },
      { clinicalSiteId: ridgeHospital.id, supervisorProfileId: wardSupervisorUser2.supervisorProfile!.id },
    ],
  });

  const studentUser3 = await prisma.user.create({
    data: {
      institutionId: institution.id,
      role: Role.STUDENT,
      name: "Efua Boateng",
      email: "student3@praxxt.demo",
      passwordHash,
      emailVerified: new Date(),
      studentProfile: {
        create: {
          studentIdNumber: "ACHS-NUR-2026-002",
          programId: nursingProgram.id,
          cohortId: nursingCohort.id,
          phone: "+233 20 555 6666",
        },
      },
    },
    include: { studentProfile: true },
  });

  await prisma.rotation.create({
    data: {
      studentId: studentUser3.studentProfile!.id,
      programId: nursingProgram.id,
      cohortId: nursingCohort.id,
      clinicalSiteId: ridgeHospital.id,
      supervisorId: supervisorUser1.supervisorProfile!.id,
      startDate: new Date("2026-09-01"),
      endDate: new Date("2026-11-01"),
      status: "ACTIVE",
    },
  });

  console.log("\nSeed complete.\n");
  console.log("Demo accounts (all use the same password):");
  console.log(`  Password: ${DEMO_PASSWORD}\n`);
  console.log(`  Super Admin:  ${superAdmin.email}`);
  console.log(`  Coordinator:  ${coordinatorUser.email} (BSc Nursing)`);
  console.log(`  Coordinator:  ${coordinatorUser2.email} (Diploma in Midwifery)`);
  console.log(`  Supervisor:   ${supervisorUser1.email}`);
  console.log(`  Supervisor:   ${supervisorUser2.email}`);
  console.log(`  Student:      ${studentUser1.email}`);
  console.log(`  Student:      ${studentUser2.email}`);
  console.log(`  Ward supervisor: ${wardSupervisorUser1.email} (Ridge Regional Hospital)`);
  console.log(`  Ward supervisor: ${wardSupervisorUser2.email} (Ridge Regional Hospital)`);
  console.log(`  Student (ward demo): ${studentUser3.email} — active rotation at Ridge Regional Hospital`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
