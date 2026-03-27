"use client";

import { useState, useMemo } from "react";
import { FlaggedEntryCard } from "@/components/flagged-entry-card";

type FlagFilter = "unresolved" | "resolved" | "all";

const FILTER_OPTIONS: { value: FlagFilter; label: string }[] = [
  { value: "unresolved", label: "Unresolved" },
  { value: "resolved", label: "Resolved" },
  { value: "all", label: "All" },
];

export function FlaggedList({
  unresolvedFlags,
  resolvedFlags,
}: {
  unresolvedFlags: any[];
  resolvedFlags: any[];
}) {
  const [filter, setFilter] = useState<FlagFilter>("unresolved");
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  const flags = useMemo(() => {
    let list: any[];
    switch (filter) {
      case "unresolved":
        list = unresolvedFlags;
        break;
      case "resolved":
        list = resolvedFlags;
        break;
      case "all":
        list = [...unresolvedFlags, ...resolvedFlags];
        break;
    }
    return list.filter((f) => !removedIds.has(f.id));
  }, [filter, unresolvedFlags, resolvedFlags, removedIds]);

  function handleRemoved(flagId: string) {
    setRemovedIds((prev) => new Set([...prev, flagId]));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Flagged Entries</h2>
        <div className="flex gap-1 rounded-lg bg-gray-100 p-0.5">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                filter === opt.value
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {flags.length === 0 ? (
        <p className="text-gray-400 text-center py-8">
          {filter === "unresolved"
            ? "No flagged entries. All clear!"
            : filter === "resolved"
              ? "No resolved entries yet."
              : "No flagged entries found."}
        </p>
      ) : (
        <div className="space-y-3">
          {flags.map((flag: any) => (
            <FlaggedEntryCard
              key={flag.id}
              flag={flag}
              onRemoved={handleRemoved}
            />
          ))}
        </div>
      )}
    </div>
  );
}
