"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveLogStepCore } from "../actions";
import { submitWithFallback } from "@/lib/offline/submit-with-fallback";
import { offlineDb } from "@/lib/offline/db";
import { DeidentifyNotice } from "@/components/deidentify-notice";
import { LogWizardSteps } from "@/components/log-wizard-steps";
import { VITAL_RANGES } from "@/lib/log-entry-constants";
import type { SaveLogStepPayload } from "@/lib/offline/payloads";
import type { ExtraLogField } from "@/lib/discipline-template";

type StepKey = "subjective" | "objective" | "assessment" | "plan";

export type FieldsState = {
  subjective: string;
  vitalTempC: string;
  vitalBpSystolic: string;
  vitalBpDiastolic: string;
  vitalPulse: string;
  vitalRespRate: string;
  vitalSpo2: string;
  objectiveFindings: string;
  assessment: string;
  plan: string;
};

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

// Single client-driven page for all four SOAP steps — deliberately not
// separate routes. A brand-new entry created while offline has never been
// fetched by the server, so navigating to a never-visited URL (e.g. its
// own "/objective" route) cannot work with no network; keeping every step
// as client-side state on one page sidesteps that entirely.
export function LogWizard({
  logEntryId,
  userId,
  initialFields,
  extraLogFields = [],
}: {
  logEntryId: string;
  userId: string;
  initialFields: FieldsState | null;
  // Discipline-specific fields appended to the Plan step (e.g.
  // physiotherapy's ICF fields), read from the rotation's Program's
  // DisciplineTemplate. Empty for LCJR/generic-fallback — renders nothing.
  extraLogFields?: ExtraLogField[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(initialFields === null);
  const [notFound, setNotFound] = useState(false);
  const [fields, setFields] = useState<FieldsState>(initialFields ?? EMPTY_FIELDS);
  const [extraFields, setExtraFields] = useState<Record<string, string>>({});
  const [step, setStep] = useState<StepKey>("subjective");
  const [error, setError] = useState<string | null>(null);
  const [queuedMessage, setQueuedMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [finished, setFinished] = useState(false);

  // Server had nothing for this id (offline-created, not yet synced, or a
  // page reload before sync completed) — reconstruct from the local queue.
  useEffect(() => {
    if (initialFields !== null) return;
    let cancelled = false;
    (async () => {
      const allForUser = await offlineDb.pendingWrites.where("userId").equals(userId).toArray();
      const createWrite = allForUser.find(
        (w) => w.opType === "create-log-entry" && w.id === logEntryId
      );
      const stepWrites = allForUser
        .filter(
          (w) =>
            w.opType === "save-log-step" &&
            (w.payload as unknown as SaveLogStepPayload).logEntryId === logEntryId
        )
        .sort((a, b) => a.createdAt - b.createdAt);

      if (!createWrite && stepWrites.length === 0) {
        if (!cancelled) {
          setNotFound(true);
          setLoading(false);
        }
        return;
      }

      const next = { ...EMPTY_FIELDS };
      for (const w of stepWrites) {
        const p = w.payload as unknown as SaveLogStepPayload;
        if (p.step === "subjective") next.subjective = p.subjective;
        else if (p.step === "objective") {
          next.vitalTempC = p.vitalTempC?.toString() ?? "";
          next.vitalBpSystolic = p.vitalBpSystolic?.toString() ?? "";
          next.vitalBpDiastolic = p.vitalBpDiastolic?.toString() ?? "";
          next.vitalPulse = p.vitalPulse?.toString() ?? "";
          next.vitalRespRate = p.vitalRespRate?.toString() ?? "";
          next.vitalSpo2 = p.vitalSpo2?.toString() ?? "";
          next.objectiveFindings = p.objectiveFindings;
        } else if (p.step === "assessment") next.assessment = p.assessment;
        else if (p.step === "plan") next.plan = p.plan;
      }
      const latestPlanWrite = [...stepWrites]
        .reverse()
        .map((w) => w.payload as unknown as SaveLogStepPayload)
        .find((p): p is Extract<SaveLogStepPayload, { step: "plan" }> => p.step === "plan");
      if (!cancelled) {
        setFields(next);
        if (latestPlanWrite?.extraFields) setExtraFields(latestPlanWrite.extraFields);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialFields, logEntryId, userId]);

  async function saveStep(payload: SaveLogStepPayload): Promise<boolean> {
    setError(null);
    setQueuedMessage(null);
    setIsPending(true);
    const opId = crypto.randomUUID();
    const outcome = await submitWithFallback({
      id: opId,
      userId,
      opType: "save-log-step",
      payload,
      action: () => saveLogStepCore(payload),
    });
    setIsPending(false);

    if (outcome.synced && outcome.result.error) {
      setError(outcome.result.error);
      return false;
    }
    if (!outcome.synced) {
      setQueuedMessage(
        "You're offline — saved on this device and will sync automatically once you're back online."
      );
    }
    return true;
  }

  // Client-side navigation needs to fetch the target route's RSC payload —
  // if we're still offline that fetch has nowhere to go, so we don't rely
  // on it. Navigate automatically only when we're actually online; offline,
  // show a plain confirmation with a manual link instead of a silent no-op.
  function finishAndReturn() {
    setFinished(true);
    if (typeof navigator !== "undefined" && navigator.onLine) {
      router.push("/student/logbook");
    }
  }

  if (finished) {
    return (
      <div className="space-y-3 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
        <p>Saved.</p>
        {queuedMessage && <p className="text-amber-700">{queuedMessage}</p>}
        <a href="/student/logbook" className="font-medium text-blue-600 hover:underline">
          Go to My logbook →
        </a>
      </div>
    );
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Loading…</p>;
  }
  if (notFound) {
    return (
      <p className="text-sm text-gray-500">
        This entry isn&apos;t available. If you created it while offline on a different device,
        it will appear here once that device syncs.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <LogWizardSteps current={step} />

      {step === "subjective" && (
        <div className="space-y-4">
          <DeidentifyNotice />
          <div>
            <label htmlFor="subjective" className="block text-sm font-medium text-gray-700">
              Patient-reported complaint / history
            </label>
            <textarea
              id="subjective"
              rows={7}
              value={fields.subjective}
              onChange={(e) => setFields((f) => ({ ...f, subjective: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {queuedMessage && <p className="text-sm text-amber-700">{queuedMessage}</p>}
          <button
            type="button"
            disabled={isPending}
            onClick={async () => {
              const ok = await saveStep({
                step: "subjective",
                logEntryId,
                subjective: fields.subjective,
              });
              if (ok) setStep("objective");
            }}
            className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {isPending ? "Saving..." : "Save & continue"}
          </button>
        </div>
      )}

      {step === "objective" && (
        <div className="space-y-5">
          <DeidentifyNotice />
          <div className="grid grid-cols-2 gap-4">
            <VitalInput
              label={VITAL_RANGES.tempC.label}
              range={VITAL_RANGES.tempC}
              value={fields.vitalTempC}
              onChange={(v) => setFields((f) => ({ ...f, vitalTempC: v }))}
            />
            <VitalInput
              label={VITAL_RANGES.bpSystolic.label}
              range={VITAL_RANGES.bpSystolic}
              value={fields.vitalBpSystolic}
              onChange={(v) => setFields((f) => ({ ...f, vitalBpSystolic: v }))}
            />
            <VitalInput
              label={VITAL_RANGES.bpDiastolic.label}
              range={VITAL_RANGES.bpDiastolic}
              value={fields.vitalBpDiastolic}
              onChange={(v) => setFields((f) => ({ ...f, vitalBpDiastolic: v }))}
            />
            <VitalInput
              label={VITAL_RANGES.pulse.label}
              range={VITAL_RANGES.pulse}
              value={fields.vitalPulse}
              onChange={(v) => setFields((f) => ({ ...f, vitalPulse: v }))}
            />
            <VitalInput
              label={VITAL_RANGES.respRate.label}
              range={VITAL_RANGES.respRate}
              value={fields.vitalRespRate}
              onChange={(v) => setFields((f) => ({ ...f, vitalRespRate: v }))}
            />
            <VitalInput
              label={VITAL_RANGES.spo2.label}
              range={VITAL_RANGES.spo2}
              value={fields.vitalSpo2}
              onChange={(v) => setFields((f) => ({ ...f, vitalSpo2: v }))}
            />
          </div>
          <div>
            <label htmlFor="objectiveFindings" className="block text-sm font-medium text-gray-700">
              Other findings
            </label>
            <textarea
              id="objectiveFindings"
              rows={5}
              value={fields.objectiveFindings}
              onChange={(e) => setFields((f) => ({ ...f, objectiveFindings: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {queuedMessage && <p className="text-sm text-amber-700">{queuedMessage}</p>}
          <button
            type="button"
            disabled={isPending}
            onClick={async () => {
              const toNum = (v: string) => (v === "" ? null : Number(v));
              const ok = await saveStep({
                step: "objective",
                logEntryId,
                vitalTempC: toNum(fields.vitalTempC),
                vitalBpSystolic: toNum(fields.vitalBpSystolic),
                vitalBpDiastolic: toNum(fields.vitalBpDiastolic),
                vitalPulse: toNum(fields.vitalPulse),
                vitalRespRate: toNum(fields.vitalRespRate),
                vitalSpo2: toNum(fields.vitalSpo2),
                objectiveFindings: fields.objectiveFindings,
              });
              if (ok) setStep("assessment");
            }}
            className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {isPending ? "Saving..." : "Save & continue"}
          </button>
        </div>
      )}

      {step === "assessment" && (
        <div className="space-y-4">
          <div>
            <label htmlFor="assessment" className="block text-sm font-medium text-gray-700">
              Working diagnosis / differential and reasoning
            </label>
            <textarea
              id="assessment"
              rows={7}
              value={fields.assessment}
              onChange={(e) => setFields((f) => ({ ...f, assessment: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {queuedMessage && <p className="text-sm text-amber-700">{queuedMessage}</p>}
          <button
            type="button"
            disabled={isPending}
            onClick={async () => {
              const ok = await saveStep({
                step: "assessment",
                logEntryId,
                assessment: fields.assessment,
              });
              if (ok) setStep("plan");
            }}
            className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {isPending ? "Saving..." : "Save & continue"}
          </button>
        </div>
      )}

      {step === "plan" && (
        <div className="space-y-4">
          <div>
            <label htmlFor="plan" className="block text-sm font-medium text-gray-700">
              Management plan, interventions performed/observed, follow-up
            </label>
            <textarea
              id="plan"
              rows={7}
              value={fields.plan}
              onChange={(e) => setFields((f) => ({ ...f, plan: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
            />
          </div>
          {extraLogFields.length > 0 && (
            <div className="space-y-4 border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Additional details
              </p>
              {extraLogFields.map((field) => (
                <div key={field.key}>
                  <label
                    htmlFor={`extra-${field.key}`}
                    className="block text-sm font-medium text-gray-700"
                  >
                    {field.label}
                  </label>
                  {field.type === "textarea" ? (
                    <textarea
                      id={`extra-${field.key}`}
                      rows={4}
                      value={extraFields[field.key] ?? ""}
                      onChange={(e) =>
                        setExtraFields((f) => ({ ...f, [field.key]: e.target.value }))
                      }
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
                    />
                  ) : (
                    <input
                      id={`extra-${field.key}`}
                      type="text"
                      value={extraFields[field.key] ?? ""}
                      onChange={(e) =>
                        setExtraFields((f) => ({ ...f, [field.key]: e.target.value }))
                      }
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {queuedMessage && <p className="text-sm text-amber-700">{queuedMessage}</p>}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={isPending}
              onClick={async () => {
                const ok = await saveStep({
                  step: "plan",
                  logEntryId,
                  plan: fields.plan,
                  intent: "draft",
                  extraFields: extraLogFields.length > 0 ? extraFields : undefined,
                });
                if (ok) finishAndReturn();
              }}
              className="rounded-md border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 disabled:opacity-60"
            >
              Save as draft
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={async () => {
                const ok = await saveStep({
                  step: "plan",
                  logEntryId,
                  plan: fields.plan,
                  intent: "submit",
                  extraFields: extraLogFields.length > 0 ? extraFields : undefined,
                });
                if (ok) finishAndReturn();
              }}
              className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {isPending ? "Submitting..." : "Submit for review"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function VitalInput({
  label,
  range,
  value,
  onChange,
}: {
  label: string;
  range: { min: number; max: number; step: number };
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        type="number"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base"
      />
    </div>
  );
}
