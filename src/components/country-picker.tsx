"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Check, X, Globe } from "lucide-react";
import { COUNTRIES } from "@/lib/countries";

interface CountryPickerProps {
  value: string;
  onChange: (country: string) => void;
  disabled?: boolean;
}

export function CountryPicker({ value, onChange, disabled }: CountryPickerProps) {
  const [inputValue, setInputValue] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const filtered = useMemo(() => {
    const q = inputValue.toLowerCase().trim();
    if (!q) return [...COUNTRIES];
    return COUNTRIES.filter((c) => c.toLowerCase().includes(q));
  }, [inputValue]);

  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex]);

  const handleSelect = useCallback(
    (name: string) => {
      setInputValue(name);
      onChange(name);
      setOpen(false);
      setHighlightIndex(-1);
    },
    [onChange],
  );

  const commit = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      const match = COUNTRIES.find(
        (c) => c.toLowerCase() === trimmed.toLowerCase(),
      );
      const final = match ?? trimmed;
      setInputValue(final);
      onChange(final);
    },
    [onChange],
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
        handleSelect(filtered[highlightIndex]);
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
          placeholder="Search countries..."
          disabled={disabled}
          className={inputValue ? "pr-8" : ""}
        />
        {inputValue && !disabled && (
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && !disabled && filtered.length > 0 && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-card shadow-lg max-h-48 overflow-y-auto"
        >
          {filtered.map((name, i) => (
            <button
              key={name}
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(name)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                i === highlightIndex
                  ? "bg-indigo-50 text-indigo-900"
                  : "hover:bg-muted text-foreground"
              }`}
            >
              <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="flex-1">{name}</span>
              {name.toLowerCase() === inputValue.trim().toLowerCase() && (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
