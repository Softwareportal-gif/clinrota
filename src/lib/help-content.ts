import type { FaqItem } from "@/lib/faq";

// Help beyond signing in (that's LOGIN_ACCESS_FAQ in faq.ts), grouped by
// who it's for. Shown on the /help page and used by Beatrice's no-AI mode
// (src/lib/faq-assistant.ts), so every answer must describe what Praxxt
// actually does today.

export type HelpSection = { id: string; title: string; items: FaqItem[] };

export const USING_PRAXXT_SECTIONS: HelpSection[] = [
  {
    id: "students",
    title: "For students",
    items: [
      {
        question: "How do I log a clinical case?",
        answer:
          "Go to Clinical Log in the menu. Choose the placement and case category, then work through the four steps (Subjective, Objective with vitals, Assessment and Plan) and submit it. Your supervisor is notified and reviews it. Don't include the patient's name, ID number or contact details; use age range, sex and clinical details only.",
        keywords: ["log", "logbook", "case", "entry", "soap", "record", "patient", "submit", "add", "new"],
      },
      {
        question: "What do the case statuses mean?",
        answer:
          "Draft: saved but not sent yet. Submitted: waiting for your supervisor. Approved: signed off. Needs revision: your supervisor asked for changes, so open the case, read their comments, edit it and resubmit. Rejected: not accepted, and their comment explains why. You can see all your cases under My Logbook.",
        keywords: ["status", "draft", "submitted", "approved", "revision", "rejected", "pending", "edit", "resubmit", "logbook", "entry", "feedback", "comment", "returned", "sent back"],
      },
      {
        question: "Can I use Praxxt without internet?",
        answer:
          "Yes. Cases and timesheets you enter while offline are saved on your device and sent automatically when you're back online. The indicator at the top of the page shows \"All synced\" once everything has been sent, or how many items are still waiting.",
        keywords: ["offline", "internet", "network", "data", "connection", "sync", "synced", "pending", "signal"],
      },
      {
        question: "How do I upload my compliance documents?",
        answer:
          "Go to Required Documents. For each document your program requires (for example your immunization record or BLS/CPR certificate), upload a PDF, JPG or PNG up to 4MB with its issue and expiry dates. Your coordinator reviews it, and Praxxt warns you before it expires.",
        keywords: ["upload", "document", "compliance", "immunization", "vaccine", "bls", "cpr", "certificate", "background", "insurance", "expiry", "expired", "file"],
      },
      {
        question: "How do I download my CV?",
        answer:
          "Open My Profile (or the profile card on your dashboard) and choose Download my CV. It's a PDF built only from supervisor-approved information: your placements, verified skills and approved cases.",
        keywords: ["cv", "resume", "download", "pdf", "portfolio", "profile"],
      },
      {
        question: "Where can I see my placements?",
        answer:
          "Go to My Placements to see your current and past rotations, with the site, supervisor, dates and your progress.",
        keywords: ["placement", "rotation", "site", "hospital", "ward", "posting", "schedule", "supervisor"],
      },
      {
        question: "How do I record my hours?",
        answer:
          "Go to Timesheets in the menu. Pick the placement and shift date, then enter your clock-in and clock-out times or the hours worked. Your supervisor approves each timesheet.",
        keywords: ["hours", "timesheet", "time", "shift", "clock", "attendance"],
      },
      {
        question: "How do rotation preferences work?",
        answer:
          "When your coordinator opens a preference cycle, go to Rotation Preferences, shortlist the sites you'd like, put them in order and submit before the deadline. You can't change them after submitting.",
        keywords: ["preference", "preferred", "prefer", "choose", "choice", "rank", "shortlist", "cycle", "deadline", "select", "hospital", "want"],
      },
    ],
  },
  {
    id: "supervisors",
    title: "For supervisors",
    items: [
      {
        question: "How do I review a student's case?",
        answer:
          "Open Pending review and select the case. Read it, choose the supervision level the student actually needed, then approve it (ticking the attestation), send it back for revision, or reject it. Revisions and rejections need a comment.",
        keywords: ["review", "approve", "sign", "signoff", "reject", "revision", "pending", "attest", "verify"],
      },
      {
        question: "How do I complete a student's evaluation?",
        answer:
          "On your Pending review page, find the student under Competency evaluations and open it. Rate each item using your program's evaluation tool (some tools let you mark an item \"Not assessed\"), add comments, then choose Save draft or Mark as final. Once it's final, only a coordinator can change it.",
        keywords: ["evaluation", "evaluate", "assess", "assessment", "rubric", "rating", "score", "grade", "competency", "final"],
      },
      {
        question: "How do I approve timesheets?",
        answer: "Go to Timesheets in the menu and approve or reject each student's submitted hours.",
        keywords: ["timesheet", "hours", "approve", "attendance"],
      },
    ],
  },
  {
    id: "coordinators",
    title: "For coordinators",
    items: [
      {
        question: "How do I add students?",
        answer:
          "Go to Students, then Import students, and download the template. Fill in first name, last name, email, level (e.g. Level 100) and, optionally, the school's student ID. One file can hold every level. Upload it, create any missing levels when Praxxt offers, confirm, then send invitations from the student list.",
        keywords: ["add", "import", "upload", "student", "csv", "spreadsheet", "excel", "enrol", "enroll", "register", "invite", "bulk"],
      },
      {
        question: "What are cohorts?",
        answer:
          "Cohorts are your class groups, usually year levels such as Level 100 to Level 400. Create several at once on the Cohorts page (e.g. \"Level 100, Level 200, Level 300\") or let the student import create them. You can filter students and assign rotations by cohort.",
        keywords: ["cohort", "level", "year", "class", "group", "intake", "semester"],
      },
      {
        question: "How do I assign rotations?",
        answer:
          "Go to Assign rotations. Pick one student, or filter to a level and select all, then choose the clinical site, supervisor and dates once. Every selected student gets that placement. You're warned first about missing documents or expiring site agreements.",
        keywords: ["assign", "rotation", "placement", "posting", "schedule", "allocate", "bulk", "site", "send", "put", "whole", "level", "students"],
      },
      {
        question: "How do I review compliance documents?",
        answer:
          "Go to Compliance to see each student's documents, and open the review queue to approve or reject uploaded ones. A rejection needs a reason, which the student can see.",
        keywords: ["compliance", "document", "review", "approve", "reject", "verify", "immunization", "expired", "missing"],
      },
      {
        question: "How are rotation scores calculated?",
        answer:
          "On your dashboard, choose Calculate next to a rotation. The score combines the supervisor's evaluation with logbook measures (case coverage, approval rate, timeliness and completeness), weighted as set in Scoring settings. You can override a score if you give a reason.",
        keywords: ["score", "grade", "calculate", "result", "pass", "fail", "weight", "override", "mark"],
      },
      {
        question: "How do I add a supervisor?",
        answer:
          "From Clinical sites, open a site that uses ward supervision and invite the supervisor by name and email. For other supervisor accounts, email hello@praxxt.com and the Praxxt team will set them up.",
        keywords: ["supervisor", "preceptor", "add", "invite", "mentor", "instructor"],
      },
    ],
  },
  {
    id: "about",
    title: "About Praxxt",
    items: [
      {
        question: "What is Praxxt?",
        answer:
          "Praxxt is a clinical education platform that replaces paper logbooks. Students log cases and hours, supervisors sign them off and evaluate students, and coordinators manage placements, compliance documents and results, all in one place.",
        keywords: ["praxxt", "about", "platform", "purpose", "logbook", "paper", "overview"],
      },
      {
        question: "Which professions does Praxxt support?",
        answer:
          "Nursing, midwifery, medicine, physiotherapy, pharmacy and physician assistant programs. Each has its own evaluation tool and logbook fields, for example AMSAT for midwifery, Mini-CEX for medicine and physician assistants, and MTCCP for physiotherapy.",
        keywords: ["profession", "discipline", "nursing", "midwifery", "medicine", "physiotherapy", "pharmacy", "physician", "assistant", "program", "course"],
      },
      {
        question: "Who can I message in Praxxt?",
        answer:
          "Open Messages and choose New message. Students can message their coordinators and supervisors; supervisors their students and those students' coordinators; coordinators anyone in their program. Don't include patient names or ID numbers.",
        keywords: ["message", "chat", "contact", "talk", "send", "inbox", "conversation"],
      },
      {
        question: "Is there a Praxxt app for my phone?",
        answer:
          "Praxxt works in your phone's web browser. You can also add it to your home screen from the browser menu (\"Add to Home screen\" or \"Install app\") so it opens like an app.",
        keywords: ["app", "mobile", "phone", "android", "iphone", "install", "tablet"],
      },
      {
        question: "Is my data secure?",
        answer:
          "Yes. Everyone sees only what their role needs (students their own records, supervisors their own students, coordinators their own program), and uploaded documents are private to the student and their coordinator.",
        keywords: ["secure", "security", "privacy", "private", "safe", "confidential", "protect", "gdpr"],
      },
      {
        question: "How can my school start using Praxxt?",
        answer:
          "Use \"Book a demo\" on the Praxxt homepage, or email hello@praxxt.com, and we'll arrange a walkthrough for your program.",
        keywords: ["demo", "price", "pricing", "cost", "buy", "subscribe", "school", "institution", "start", "join", "sales", "trial"],
      },
      {
        question: "How do I get more help?",
        answer:
          "If you're signed in, create a support ticket from the Help page and the Praxxt team will get back to you. You can also email hello@praxxt.com.",
        keywords: ["help", "support", "ticket", "problem", "issue", "bug", "error", "contact", "stuck", "broken"],
      },
    ],
  },
];
