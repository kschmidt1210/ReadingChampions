"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Check, X, BookOpen } from "lucide-react";

interface SeriesPickerProps {
  value: string;
  onChange: (name: string) => void;
  seasonSeries: string[];
  detectedSeries: string | null;
  disabled?: boolean;
}

export function SeriesPicker({
  value,
  onChange,
  seasonSeries,
  detectedSeries,
  disabled,
}: SeriesPickerProps) {
  const [inputValue, setInputValue] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const allSuggestions = (() => {
    const seen = new Set<string>();
    const items: Array<{ name: string; source: "detected" | "season" }> = [];

    if (detectedSeries && !seen.has(detectedSeries.toLowerCase())) {
      seen.add(detectedSeries.toLowerCase());
      items.push({ name: detectedSeries, source: "detected" });
    }
    for (const s of seasonSeries) {
      if (!seen.has(s.toLowerCase())) {
        seen.add(s.toLowerCase());
        items.push({ name: s, source: "season" });
      }
    }
    return items;
  })();

  const filtered = inputValue.trim()
    ? allSuggestions.filter((s) =>
        s.name.toLowerCase().includes(inputValue.toLowerCase())
      )
    : allSuggestions;

  const handleSelect = useCallback(
    (name: string) => {
      setInputValue(name);
      onChange(name);
      setOpen(false);
      setHighlightIndex(-1);
    },
    [onChange]
  );

  const commit = useCallback(
    (text: string) => {
      const trimmed = text.trim().replace(/\s+/g, " ");
      setInputValue(trimmed);
      onChange(trimmed);
    },
    [onChange]
  );

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputValue(e.target.value);
    setOpen(true);
    setHighlightIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || filtered.length === 0) {
      if (e.key === "Enter") {
        e.preventDefault();
        commit(inputValue);
        setOpen(false);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIndex >= 0 && highlightIndex < filtered.length) {
        handleSelect(filtered[highlightIndex].name);
      } else {
        commit(inputValue);
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlightIndex(-1);
    }
  }

  function handleBlur(e: React.FocusEvent) {
    if (containerRef.current?.contains(e.relatedTarget as Node)) return;
    commit(inputValue);
    setOpen(false);
    setHighlightIndex(-1);
  }

  function handleClear() {
    setInputValue("");
    onChange("");
    inputRef.current?.focus();
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="e.g., Lord of the Rings"
          disabled={disabled}
          className={inputValue ? "pr-8" : ""}
        />
        {inputValue && !disabled && (
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && !disabled && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
          {filtered.some((s) => s.source === "detected") && (
            <div className="px-2.5 py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wider">
              Detected from Open Library
            </div>
          )}
          {filtered
            .filter((s) => s.source === "detected")
            .map((s, i) => {
              const idx = filtered.indexOf(s);
              return (
                <button
                  key={`det-${s.name}`}
                  type="button"
                  tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(s.name)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                    idx === highlightIndex
                      ? "bg-indigo-50 text-indigo-900"
                      : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                  <span className="flex-1">{s.name}</span>
                  {s.name.toLowerCase() ===
                    inputValue.trim().toLowerCase() && (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  )}
                </button>
              );
            })}
          {filtered.some((s) => s.source === "season") && (
            <div className="px-2.5 py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wider border-t border-gray-100">
              Used this season
            </div>
          )}
          {filtered
            .filter((s) => s.source === "season")
            .map((s) => {
              const idx = filtered.indexOf(s);
              return (
                <button
                  key={`season-${s.name}`}
                  type="button"
                  tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(s.name)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                    idx === highlightIndex
                      ? "bg-indigo-50 text-indigo-900"
                      : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                  <span className="flex-1">{s.name}</span>
                  {s.name.toLowerCase() ===
                    inputValue.trim().toLowerCase() && (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  )}
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}
