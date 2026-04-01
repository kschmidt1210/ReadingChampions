"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, X, Trophy } from "lucide-react";

interface GenrePickerProps {
  value: string;
  onChange: (genreName: string, genreId: string | null) => void;
  genres: Array<{ id: string; name: string }>;
  disabled?: boolean;
}

export function GenrePicker({ value, onChange, genres, disabled }: GenrePickerProps) {
  const [inputValue, setInputValue] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const filtered = genres.filter((g) =>
    g.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  const matchedChallengeGenre = genres.find(
    (g) => g.name.toLowerCase() === inputValue.trim().toLowerCase()
  );

  const handleSelect = useCallback(
    (genre: { id: string; name: string }) => {
      setInputValue(genre.name);
      onChange(genre.name, genre.id);
      setOpen(false);
      setHighlightIndex(-1);
    },
    [onChange]
  );

  const commitCustom = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) {
        onChange("", null);
        return;
      }
      const match = genres.find(
        (g) => g.name.toLowerCase() === trimmed.toLowerCase()
      );
      onChange(match ? match.name : trimmed, match?.id ?? null);
    },
    [genres, onChange]
  );

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setInputValue(val);
    setOpen(true);
    setHighlightIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || filtered.length === 0) {
      if (e.key === "Enter") {
        e.preventDefault();
        commitCustom(inputValue);
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
        handleSelect(filtered[highlightIndex]);
      } else {
        commitCustom(inputValue);
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlightIndex(-1);
    }
  }

  function handleBlur(e: React.FocusEvent) {
    if (containerRef.current?.contains(e.relatedTarget as Node)) return;
    commitCustom(inputValue);
    setOpen(false);
    setHighlightIndex(-1);
  }

  function handleClear() {
    setInputValue("");
    onChange("", null);
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
          placeholder="Type or select a genre..."
          disabled={disabled}
          className={matchedChallengeGenre ? "pr-16" : inputValue ? "pr-8" : ""}
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
        {matchedChallengeGenre && !disabled && (
          <Badge
            variant="secondary"
            className="absolute right-8 top-1/2 -translate-y-1/2 text-[0.6rem] py-0 px-1.5 bg-emerald-50 text-emerald-700 border-emerald-200/60 pointer-events-none"
          >
            <Trophy className="h-2.5 w-2.5 mr-0.5" />
            Challenge
          </Badge>
        )}
      </div>

      {open && !disabled && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
          <div className="px-2.5 py-1.5 text-[0.65rem] font-medium text-gray-400 uppercase tracking-wider">
            Genre Challenge
          </div>
          {filtered.map((genre, i) => (
            <button
              key={genre.id}
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(genre)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                i === highlightIndex
                  ? "bg-indigo-50 text-indigo-900"
                  : "hover:bg-gray-50 text-gray-700"
              }`}
            >
              <Trophy className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span className="flex-1">{genre.name}</span>
              {genre.name.toLowerCase() === inputValue.trim().toLowerCase() && (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
