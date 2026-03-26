export interface OpenLibraryDoc {
  title: string;
  author_name?: string[];
  isbn?: string[];
  number_of_pages_median?: number;
  first_publish_year?: number;
  cover_i?: number;
  subject?: string[];
}

export interface ParsedBook {
  title: string;
  author: string;
  isbn: string | null;
  pages: number;
  year_published: number | null;
  cover_url: string | null;
  country: string | null; // Not reliably available from Open Library; user fills manually
}

export function parseOpenLibraryResult(doc: OpenLibraryDoc): ParsedBook {
  return {
    title: doc.title,
    author: doc.author_name?.[0] ?? "Unknown",
    isbn: doc.isbn?.[0] ?? null,
    pages: doc.number_of_pages_median ?? 0,
    year_published: doc.first_publish_year ?? null,
    cover_url: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
      : null,
    country: null, // User fills manually
  };
}

export async function searchBooks(query: string): Promise<ParsedBook[]> {
  const encoded = encodeURIComponent(query);
  const url = `https://openlibrary.org/search.json?q=${encoded}&limit=10&fields=title,author_name,isbn,number_of_pages_median,first_publish_year,cover_i`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open Library API error: ${response.status}`);
  }

  const data = await response.json();
  return (data.docs ?? []).map(parseOpenLibraryResult);
}

export async function searchByISBN(isbn: string): Promise<ParsedBook | null> {
  const url = `https://openlibrary.org/search.json?isbn=${isbn}&limit=1&fields=title,author_name,isbn,number_of_pages_median,first_publish_year,cover_i`;

  const response = await fetch(url);
  if (!response.ok) return null;

  const data = await response.json();
  if (!data.docs?.length) return null;

  return parseOpenLibraryResult(data.docs[0]);
}
