import { parseOpenLibraryResult } from "../books-api";

describe("parseOpenLibraryResult", () => {
  it("parses a complete Open Library doc", () => {
    const doc = {
      title: "Dune",
      author_name: ["Frank Herbert"],
      isbn: ["9780441172719"],
      number_of_pages_median: 412,
      first_publish_year: 1965,
      cover_i: 8230789,
    };
    const result = parseOpenLibraryResult(doc);
    expect(result.title).toBe("Dune");
    expect(result.author).toBe("Frank Herbert");
    expect(result.isbn).toBe("9780441172719");
    expect(result.pages).toBe(412);
    expect(result.year_published).toBe(1965);
    expect(result.cover_url).toContain("8230789");
  });

  it("handles missing fields gracefully", () => {
    const doc = {
      title: "Unknown Book",
      author_name: undefined,
      isbn: undefined,
      number_of_pages_median: undefined,
      first_publish_year: undefined,
      cover_i: undefined,
    };
    const result = parseOpenLibraryResult(doc);
    expect(result.title).toBe("Unknown Book");
    expect(result.author).toBe("Unknown");
    expect(result.isbn).toBeNull();
    expect(result.pages).toBe(0);
    expect(result.cover_url).toBeNull();
  });
});
