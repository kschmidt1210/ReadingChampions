"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Search, Loader2, BookOpen } from "lucide-react";
import type { ParsedBook } from "@/lib/books-api";
import { extractSeriesFromSubjects } from "@/lib/books-api";

export function BookSearch({
  onSelect,
}: {
  onSelect: (book: ParsedBook) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ParsedBook[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=8&fields=title,author_name,isbn,number_of_pages_median,first_publish_year,cover_i,subject`
      );
      const data = await res.json();
      const parsed: ParsedBook[] = (data.docs ?? []).map((doc: any) => ({
        title: doc.title,
        author: doc.author_name?.[0] ?? "Unknown",
        isbn: doc.isbn?.[0] ?? null,
        pages: doc.number_of_pages_median ?? 0,
        year_published: doc.first_publish_year ?? null,
        cover_url: doc.cover_i
          ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
          : null,
        country: null,
        series_name: extractSeriesFromSubjects(doc.subject),
      }));
      setResults(parsed);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);
  function handleChange(value: string) {
    setQuery(value);
    if (timer) clearTimeout(timer);
    setTimer(setTimeout(() => search(value), 400));
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Search by title or ISBN..."
          className="pl-10"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-indigo-500" />
        )}
      </div>
      {results.length > 0 && (
        <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 max-h-64 overflow-y-auto shadow-sm">
          {results.map((book, i) => (
            <button
              key={`${book.isbn}-${i}`}
              onClick={() => {
                onSelect(book);
                setQuery(book.title);
                setResults([]);
              }}
              className="w-full flex items-start gap-3 p-3 text-left hover:bg-indigo-50/50 transition-colors"
            >
              {book.cover_url ? (
                <img
                  src={book.cover_url}
                  alt=""
                  className="w-10 h-14 object-cover rounded-lg shadow-sm"
                />
              ) : (
                <div className="w-10 h-14 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-indigo-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate text-gray-900">
                  {book.title}
                </div>
                <div className="text-xs text-gray-500">{book.author}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {book.pages > 0 ? `${book.pages} pages` : "Pages unknown"}
                  {book.year_published ? ` \u00B7 ${book.year_published}` : ""}
                  {book.series_name && (
                    <span className="text-violet-500">
                      {" "}
                      &middot; {book.series_name}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
