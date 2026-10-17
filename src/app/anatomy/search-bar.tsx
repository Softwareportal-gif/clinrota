"use client";

import { useId, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { Catalogue, Structure } from "@/lib/anatomy/catalogue";
import { searchStructures } from "@/lib/anatomy/search";
import { BORDER, TEXT_PRIMARY, TEXT_SECONDARY } from "@/app/student/dashboard-sections/colors";
import { systemLabel } from "./system-labels";

// Floating search box: everyday names, Latin names and synonyms. Arrow keys
// move through the results, Enter picks one (the first by default), Escape
// clears. `showResults` is off when the page lists the results itself.
export function SearchBar({
  catalogue,
  query,
  onQueryChange,
  onPick,
  showResults = true,
}: {
  catalogue: Catalogue;
  query: string;
  onQueryChange: (query: string) => void;
  onPick: (structure: Structure) => void;
  showResults?: boolean;
}) {
  const id = useId();
  const [active, setActive] = useState(0);
  const results = useMemo(() => searchStructures(catalogue, query, 8), [catalogue, query]);
  const open = showResults && query.trim().length > 0;

  function pick(structure: Structure | undefined) {
    if (!structure) return;
    onPick(structure);
    onQueryChange("");
    setActive(0);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(results[active] ?? results[0]);
    } else if (e.key === "Escape") {
      onQueryChange("");
      setActive(0);
    }
  }

  return (
    <div className="relative min-w-0 flex-1">
      <label htmlFor={`${id}-input`} className="sr-only">
        Search anatomy
      </label>
      <div
        className="flex h-11 items-center gap-2 rounded-full bg-white px-4 shadow-md"
        style={{ border: `1px solid ${BORDER}` }}
      >
        <Search size={18} aria-hidden style={{ color: TEXT_SECONDARY }} />
        <input
          id={`${id}-input`}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-results`}
          aria-autocomplete="list"
          aria-activedescendant={open && results[active] ? `${id}-option-${active}` : undefined}
          type="text"
          autoComplete="off"
          placeholder="Search anatomy, e.g. breastbone"
          value={query}
          onChange={(e) => {
            onQueryChange(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          style={{ color: TEXT_PRIMARY }}
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => onQueryChange("")}
            className="cursor-pointer rounded-full p-1"
          >
            <X size={16} aria-hidden style={{ color: TEXT_SECONDARY }} />
          </button>
        )}
      </div>
      {open && (
        <ul
          id={`${id}-results`}
          role="listbox"
          aria-label="Matching structures"
          className="absolute inset-x-0 top-12 z-20 max-h-80 overflow-y-auto rounded-2xl bg-white py-1 shadow-lg"
          style={{ border: `1px solid ${BORDER}` }}
        >
          {results.length === 0 ? (
            <li className="px-4 py-3 text-sm" style={{ color: TEXT_SECONDARY }}>
              No structures match
            </li>
          ) : (
            results.map((structure, i) => (
              <li
                key={structure.id}
                id={`${id}-option-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(structure)}
                onMouseEnter={() => setActive(i)}
                className="flex cursor-pointer items-baseline justify-between gap-3 px-4 py-2 text-sm"
                style={{ backgroundColor: i === active ? "#F1EEFF" : undefined, color: TEXT_PRIMARY }}
              >
                <span className="truncate">{structure.name}</span>
                <span className="shrink-0 text-xs" style={{ color: TEXT_SECONDARY }}>
                  {systemLabel(structure.system)}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
