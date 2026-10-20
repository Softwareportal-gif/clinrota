"use client";

import { useState, useTransition } from "react";
import { addWards, removeWard, renameWard } from "./ward-actions";

type Ward = { id: string; name: string };

function WardRow({ siteId, ward }: { siteId: string; ward: Ward }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(ward.name);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      const result = await renameWard(siteId, ward.id, name);
      if (result.ok) {
        setEditing(false);
        setError(null);
      } else setError(result.error);
    });
  const remove = () => {
    if (!window.confirm(`Remove ${ward.name}?`)) return;
    start(async () => {
      const result = await removeWard(siteId, ward.id);
      if (!result.ok) setError(result.error);
    });
  };

  return (
    <li className="py-2.5">
      <div className="flex items-center justify-between gap-3">
        {editing ? (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            aria-label={`New name for ${ward.name}`}
            className="min-w-0 flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm"
          />
        ) : (
          <span className="text-sm text-gray-900">{ward.name}</span>
        )}
        <div className="flex shrink-0 gap-3 text-xs font-medium">
          {editing ? (
            <>
              <button type="button" onClick={save} disabled={pending} className="text-blue-600 hover:underline disabled:opacity-60">
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setName(ward.name);
                  setError(null);
                }}
                className="text-gray-500 hover:underline"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setEditing(true)} className="text-blue-600 hover:underline">
                Rename
              </button>
              <button type="button" onClick={remove} disabled={pending} className="text-red-600 hover:underline disabled:opacity-60">
                Remove
              </button>
            </>
          )}
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </li>
  );
}

// The site's wards: students pick one first when they log a case, and
// rotations can be placed on one.
export function WardsSection({ siteId, wards }: { siteId: string; wards: Ward[] }) {
  const [input, setInput] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const result = await addWards(siteId, input);
      if (result.ok) {
        setInput("");
        setMessage({ ok: true, text: result.message ?? "Added." });
      } else setMessage({ ok: false, text: result.error });
    });
  };

  return (
    <section className="rounded-md border border-gray-200 bg-white p-4">
      <p className="text-sm font-medium text-gray-700">Wards</p>
      <p className="mt-1 text-xs text-gray-500">
        Students choose one of these first when they log a case here (or type another). Rotations can also be placed on a ward.
      </p>
      {wards.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">No wards yet. Add the wards students are placed on.</p>
      ) : (
        <ul className="mt-2 divide-y divide-gray-100">
          {wards.map((w) => (
            <WardRow key={w.id} siteId={siteId} ward={w} />
          ))}
        </ul>
      )}
      <form onSubmit={add} className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor="newWards" className="block text-xs text-gray-500">
            Add wards (separate several with commas)
          </label>
          <input
            id="newWards"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. Labour Ward, Surgical Ward, OPD"
            className="mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        <button type="submit" disabled={pending || !input.trim()} className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60">
          {pending ? "Adding…" : "Add"}
        </button>
      </form>
      {message && <p className={`mt-2 text-xs ${message.ok ? "text-green-700" : "text-red-600"}`}>{message.text}</p>}
    </section>
  );
}
