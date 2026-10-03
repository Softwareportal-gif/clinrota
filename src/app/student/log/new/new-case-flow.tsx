"use client";

import { useState } from "react";
import { createLogEntryCore } from "./actions";
import { createWardAssignmentCore, endWardAssignmentCore } from "./ward-assignment-actions";
import { submitWithFallback } from "@/lib/offline/submit-with-fallback";
import type { CreateLogEntryPayload, CreateWardAssignmentPayload, EndWardAssignmentPayload } from "@/lib/offline/payloads";
import type { EntrustmentLevel } from "@/generated/prisma/client";
import { ENTRUSTMENT_LEVEL_ORDER, ENTRUSTMENT_LEVEL_LABELS } from "@/lib/entrustment";
import { LogWizard, type FieldsState } from "../[id]/edit/log-wizard";
import type { ExtraLogField } from "@/lib/discipline-template";

type EligibleWardSupervisor = { supervisorProfileId: string; name: string };
type ActiveWardAssignment = { id: string; wardName: string; wardSupervisorName: string };

type Rotation = {
  id: string;
  clinicalSite: { name: string };
  siteDepartment: { name: string } | null;
  supervisor: { user: { name: string } };
  wardSupervisionEnabled: boolean;
  eligibleWardSupervisors: EligibleWardSupervisor[];
  activeWardAssignment: ActiveWardAssignment | null;
};

type Competency = { id: string; name: string };

const EMPTY_FIELDS: FieldsState = {
  subjective: "",
  vitalTempC: "",
  vitalBpSystolic: "",
  vitalBpDiastolic: "",
  vitalPulse: "",
  vitalRespRate: "",
  vitalSpo2: "",
  objectiveFindings: "",
  assessment: "",
  plan: "",
};

// Step 0 (rotation/category/title/level) and the SOAP wizard live on this
// one page/URL throughout — no client-side navigation between them. A
// brand-new entry's id has never been fetched by the server, so
// `router.push` to a fresh dynamic route fails outright with no network;
// switching phases via local state instead sidesteps that entirely.
export function NewCaseFlow({
  rotations,
  competencies,
  userId,
  extraLogFields = [],
}: {
  rotations: Rotation[];
  competencies: Competency[];
  userId: string;
  extraLogFields?: ExtraLogField[];
}) {
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [queuedMessage, setQueuedMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const singleRotation = rotations.length === 1 ? rotations[0] : null;

  const [selectedRotationId, setSelectedRotationId] = useState(singleRotation?.id ?? "");
  // Overrides the server-loaded activeWardAssignment once the student
  // creates or ends one this session, without a full page reload.
  const [wardOverrides, setWardOverrides] = useState<Record<string, ActiveWardAssignment | null>>({});
  const [wardName, setWardName] = useState("");
  const [wardSupervisorId, setWardSupervisorId] = useState("");
  const [wardError, setWardError] = useState<string | null>(null);
  const [wardPending, setWardPending] = useState(false);

  const selectedRotation = rotations.find((r) => r.id === selectedRotationId) ?? null;
  const activeWardAssignment =
    selectedRotation && selectedRotationId in wardOverrides
      ? wardOverrides[selectedRotationId]
      : (selectedRotation?.activeWardAssignment ?? null);
  const needsWardSelection = !!selectedRotation?.wardSupervisionEnabled && !activeWardAssignment;

  if (createdId) {
    return (
      <LogWizard
        logEntryId={createdId}
        userId={userId}
        initialFields={EMPTY_FIELDS}
        extraLogFields={extraLogFields}
      />
    );
  }

  async function handleCreateWardAssignment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRotation) return;
    setWardError(null);
    setWardPending(true);

    const id = crypto.randomUUID();
    const payload: CreateWardAssignmentPayload = {
      id,
      rotationId: selectedRotation.id,
      wardName,
      wardSupervisorId,
    };
    const outcome = await submitWithFallback({
      id,
      userId,
      opType: "create-ward-assignment",
      payload,
      action: () => createWardAssignmentCore(payload),
    });

    setWardPending(false);

    if (outcome.synced && outcome.result.error) {
      setWardError(outcome.result.error);
      return;
    }

    const supervisorName =
      selectedRotation.eligibleWardSupervisors.find((s) => s.supervisorProfileId === wardSupervisorId)?.name ?? "";
    setWardOverrides((prev) => ({
      ...prev,
      [selectedRotation.id]: { id, wardName: wardName.trim(), wardSupervisorName: supervisorName },
    }));
    setWardName("");
    setWardSupervisorId("");
  }

  async function handleSwitchWard() {
    if (!selectedRotation || !activeWardAssignment) return;
    const id = activeWardAssignment.id;
    const payload: EndWardAssignmentPayload = { wardAssignmentId: id };
    await submitWithFallback({
      id: `end-${id}`,
      userId,
      opType: "end-ward-assignment",
      payload,
      action: () => endWardAssignmentCore(payload),
    });
    setWardOverrides((prev) => ({ ...prev, [selectedRotation.id]: null }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setQueuedMessage(null);
    setIsPending(true);

    const formData = new FormData(e.currentTarget);
    const id = crypto.randomUUID();
    const payload: CreateLogEntryPayload = {
      id,
      rotationId: String(formData.get("rotationId") ?? ""),
      competencyId: String(formData.get("competencyId") ?? ""),
      caseTitle: String(formData.get("caseTitle") ?? ""),
      studentRole: formData.get("studentRole") as EntrustmentLevel,
      occurredAt: new Date().toISOString(),
      wardAssignmentId: activeWardAssignment?.id,
    };

    const outcome = await submitWithFallback({
      id,
      userId,
      opType: "create-log-entry",
      payload,
      action: () => createLogEntryCore(payload),
    });

    setIsPending(false);

    if (outcome.synced && outcome.result.error) {
      setError(outcome.result.error);
      return;
    }
    if (!outcome.synced) {
      setQueuedMessage("You're offline — starting this entry locally.");
    }
    setCreatedId(id);
  }

  return (
    <div className="max-w-lg space-y-5">
      {singleRotation ? (
        <div>
          <p className="text-sm font-medium text-gray-700">Rotation</p>
          <p className="mt-1 text-sm text-gray-600">
            {singleRotation.clinicalSite.name}
            {singleRotation.siteDepartment ? ` — ${singleRotation.siteDepartment.name}` : ""},
            supervised by {singleRotation.supervisor.user.name}
          </p>
        </div>
      ) : (
        <div>
          <label htmlFor="rotationId" className="block text-sm font-medium text-gray-700">
            Rotation
          </label>
          <select
            id="rotationId"
            name="rotationId"
            required
            value={selectedRotationId}
            onChange={(e) => setSelectedRotationId(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
          >
            <option value="" disabled>
              Select a rotation
            </option>
            {rotations.map((r) => (
              <option key={r.id} value={r.id}>
                {r.clinicalSite.name}
                {r.siteDepartment ? ` — ${r.siteDepartment.name}` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedRotation && activeWardAssignment && (
        <div className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
          <p className="text-gray-700">
            Current ward: <span className="font-medium">{activeWardAssignment.wardName}</span>,
            supervised by {activeWardAssignment.wardSupervisorName}
          </p>
          <button
            type="button"
            onClick={handleSwitchWard}
            className="shrink-0 text-xs font-medium text-blue-600 hover:underline"
          >
            I&apos;ve moved to a new ward
          </button>
        </div>
      )}

      {selectedRotation && needsWardSelection && (
        <form onSubmit={handleCreateWardAssignment} className="space-y-3 rounded-md border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">
            This site uses ward supervision — select your ward before logging a case.
          </p>
          <div>
            <label htmlFor="wardName" className="block text-xs font-medium text-gray-700">
              Ward
            </label>
            <input
              id="wardName"
              type="text"
              required
              value={wardName}
              onChange={(e) => setWardName(e.target.value)}
              placeholder="e.g. Labour Ward"
              className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label htmlFor="wardSupervisorId" className="block text-xs font-medium text-gray-700">
              Ward supervisor
            </label>
            <select
              id="wardSupervisorId"
              required
              value={wardSupervisorId}
              onChange={(e) => setWardSupervisorId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            >
              <option value="" disabled>
                Select...
              </option>
              {selectedRotation.eligibleWardSupervisors.map((s) => (
                <option key={s.supervisorProfileId} value={s.supervisorProfileId}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          {wardError && <p className="text-sm text-red-600">{wardError}</p>}
          <button
            type="submit"
            disabled={wardPending || !wardName.trim() || !wardSupervisorId}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {wardPending ? "Saving..." : "Confirm ward"}
          </button>
        </form>
      )}

      <form
        onSubmit={handleSubmit}
        className={`space-y-5 ${!selectedRotation || needsWardSelection ? "pointer-events-none opacity-40" : ""}`}
        inert={!selectedRotation || needsWardSelection ? true : undefined}
      >
        <input type="hidden" name="rotationId" value={selectedRotationId} />

        <div>
          <label htmlFor="competencyId" className="block text-sm font-medium text-gray-700">
            Case type / category
          </label>
          <select
            id="competencyId"
            name="competencyId"
            required
            defaultValue=""
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
          >
            <option value="" disabled>
              Select a category
            </option>
            {competencies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="caseTitle" className="block text-sm font-medium text-gray-700">
            Brief description
          </label>
          <input
            id="caseTitle"
            name="caseTitle"
            type="text"
            required
            placeholder="e.g. Post-operative wound dressing"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
          />
        </div>

        <fieldset>
          <legend className="block text-sm font-medium text-gray-700">
            Your level of supervision for this case
          </legend>
          <div className="mt-2 space-y-2">
            {ENTRUSTMENT_LEVEL_ORDER.map((level) => (
              <label key={level} className="flex items-center gap-2 text-sm text-gray-700">
                <input type="radio" name="studentRole" value={level} required />
                {ENTRUSTMENT_LEVEL_LABELS[level]}
              </label>
            ))}
          </div>
        </fieldset>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {queuedMessage && <p className="text-sm text-amber-700">{queuedMessage}</p>}

        <button
          type="submit"
          disabled={isPending || !selectedRotation || needsWardSelection}
          className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {isPending ? "Starting..." : "Start entry"}
        </button>
      </form>
    </div>
  );
}
