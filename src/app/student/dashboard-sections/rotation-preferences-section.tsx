"use client";

import { useState, useTransition } from "react";
import {
  addPreference,
  removePreference,
  movePreference,
  submitPreferences,
  type ActionResult,
} from "../preferences/actions";
import { INK, ACCENT, TEXT_SECONDARY, BORDER } from "./colors";
import type { PreferenceStudentStatus } from "@/lib/preference-cycle";

type ShortlistItem = { id: string; clinicalSiteId: string; siteName: string; location: string | null; rank: number };
type AvailableSite = { id: string; name: string; location: string | null };

const STATUS_PILL: Record<PreferenceStudentStatus, { bg: string; color: string; label: string }> = {
  NO_CYCLE: { bg: "#F1F0F8", color: TEXT_SECONDARY, label: "No cycle" },
  DRAFT: { bg: "#FDF1DC", color: "#92620A", label: "Draft" },
  SUBMITTED: { bg: "#E4F3EA", color: "#1F6B3D", label: "Submitted" },
  LOCKED: { bg: "#F1F0F8", color: TEXT_SECONDARY, label: "Locked" },
};

export function RotationPreferencesSection({
  cycleId,
  status,
  minSelections,
  maxSelections,
  deadlineLabel,
  submittedAtLabel,
  shortlist,
  availableSites,
  showHeading = true,
}: {
  cycleId: string | null;
  status: PreferenceStudentStatus;
  minSelections: number;
  maxSelections: number;
  deadlineLabel: string | null;
  submittedAtLabel: string | null;
  shortlist: ShortlistItem[];
  availableSites: AvailableSite[];
  showHeading?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<ActionResult>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result?.error) setError(result.error);
    });
  }

  const canEdit = status === "DRAFT" && cycleId;
  const canSubmit = canEdit && shortlist.length >= minSelections;
  const pill = STATUS_PILL[status];
  const percent = maxSelections === 0 ? 0 : Math.min(100, (shortlist.length / maxSelections) * 100);

  return (
    <section className="rounded-2xl bg-white p-6" style={{ border: `1px solid ${BORDER}` }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {showHeading && (
          <h2 className="text-base font-bold" style={{ color: INK }}>
            Rotation Preferences
          </h2>
        )}
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold"
          style={{ background: deadlineLabel && status === "DRAFT" ? "#EFECFF" : pill.bg, color: deadlineLabel && status === "DRAFT" ? ACCENT : pill.color }}
        >
          {deadlineLabel && status === "DRAFT" ? `Due ${deadlineLabel}` : pill.label}
        </span>
      </div>

      {status === "NO_CYCLE" ? (
        <p className="mt-3 text-sm" style={{ color: TEXT_SECONDARY }}>
          No open preference cycle right now — check back once your coordinator opens one for your
          next term.
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm" style={{ color: TEXT_SECONDARY }}>
            Rank {minSelections === maxSelections ? minSelections : `${minSelections}–${maxSelections}`}{" "}
            sites in the order you&apos;d prefer them.
            {submittedAtLabel && ` Submitted ${submittedAtLabel}.`}
            {status === "LOCKED" && !submittedAtLabel && " This window has closed."}
          </p>

          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: TEXT_SECONDARY }}>
                Your shortlist
              </h3>
              {shortlist.length === 0 ? (
                <p className="mt-3 text-sm" style={{ color: TEXT_SECONDARY }}>
                  Nothing shortlisted yet — add sites from the list on the right.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {shortlist.map((item, i) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 rounded-xl px-3 py-2"
                      style={{ border: `1px solid ${BORDER}` }}
                    >
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: INK }}
                      >
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold" style={{ color: "#17153B" }}>{item.siteName}</p>
                        {item.location && <p className="truncate text-xs" style={{ color: TEXT_SECONDARY }}>{item.location}</p>}
                      </div>
                      {canEdit && (
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            disabled={isPending || i === 0}
                            onClick={() => run(() => movePreference(item.id, "up"))}
                            aria-label="Move up"
                            className="rounded p-1 hover:bg-gray-100 disabled:opacity-30"
                            style={{ color: TEXT_SECONDARY }}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            disabled={isPending || i === shortlist.length - 1}
                            onClick={() => run(() => movePreference(item.id, "down"))}
                            aria-label="Move down"
                            className="rounded p-1 hover:bg-gray-100 disabled:opacity-30"
                            style={{ color: TEXT_SECONDARY }}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => run(() => removePreference(item.id))}
                            aria-label="Remove"
                            className="rounded p-1 hover:bg-red-50 disabled:opacity-30"
                            style={{ color: "#B23B2E" }}
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "#E8E6F4" }}>
                <div className="h-full rounded-full" style={{ width: `${percent}%`, background: ACCENT }} />
              </div>
              <p className="mt-1.5 text-xs" style={{ color: TEXT_SECONDARY }}>
                {shortlist.length} of {maxSelections} sites selected
              </p>

              {canEdit && (
                <button
                  type="button"
                  disabled={isPending || !canSubmit}
                  onClick={() => cycleId && run(() => submitPreferences(cycleId))}
                  className="mt-4 rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                  style={{ backgroundColor: ACCENT }}
                >
                  Submit preferences
                </button>
              )}
              {error && <p className="mt-2 text-xs" style={{ color: "#B23B2E" }}>{error}</p>}
            </div>

            {canEdit && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: TEXT_SECONDARY }}>
                  Available sites
                </h3>
                {availableSites.length === 0 ? (
                  <p className="mt-3 text-sm" style={{ color: TEXT_SECONDARY }}>
                    {shortlist.length >= maxSelections
                      ? "You've reached the maximum — remove one to add another."
                      : "No more sites to add."}
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {availableSites.map((site) => (
                      <li
                        key={site.id}
                        className="flex items-center justify-between gap-3 rounded-xl px-3 py-2"
                        style={{ border: `1px solid ${BORDER}` }}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold" style={{ color: "#17153B" }}>{site.name}</p>
                          {site.location && <p className="truncate text-xs" style={{ color: TEXT_SECONDARY }}>{site.location}</p>}
                        </div>
                        <button
                          type="button"
                          disabled={isPending || shortlist.length >= maxSelections}
                          onClick={() => cycleId && run(() => addPreference(cycleId, site.id, undefined, new FormData()))}
                          className="shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold disabled:opacity-30"
                          style={{ border: `1px solid ${BORDER}`, color: INK }}
                        >
                          + Add
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
