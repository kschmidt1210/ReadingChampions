import { getFirstLetter } from "../title-utils";

describe("getFirstLetter", () => {
  it("returns uppercase first letter for normal titles", () => {
    expect(getFirstLetter("Harry Potter")).toBe("H");
    expect(getFirstLetter("dune")).toBe("D");
  });

  it("strips leading articles", () => {
    expect(getFirstLetter("The Great Gatsby")).toBe("G");
    expect(getFirstLetter("A Farewell to Arms")).toBe("F");
    expect(getFirstLetter("An Ocean of Minutes")).toBe("O");
  });

  it("handles case-insensitive article stripping", () => {
    expect(getFirstLetter("the catcher in the rye")).toBe("C");
    expect(getFirstLetter("THE SHINING")).toBe("S");
  });

  it("returns empty string for empty/whitespace input", () => {
    expect(getFirstLetter("")).toBe("");
    expect(getFirstLetter("   ")).toBe("");
  });

  describe("numeric titles", () => {
    it("converts single-digit leading numbers", () => {
      expect(getFirstLetter("1984")).toBe("O"); // one thousand...
      expect(getFirstLetter("2001: A Space Odyssey")).toBe("T"); // two thousand...
      expect(getFirstLetter("3 Body Problem")).toBe("T"); // three
      expect(getFirstLetter("4 Hour Work Week")).toBe("F"); // four
      expect(getFirstLetter("5 People You Meet in Heaven")).toBe("F"); // five
      expect(getFirstLetter("6 of Crows")).toBe("S"); // six
      expect(getFirstLetter("7 Habits")).toBe("S"); // seven
      expect(getFirstLetter("8 Rules")).toBe("E"); // eight
      expect(getFirstLetter("9 Stories")).toBe("N"); // nine
    });

    it("converts teen numbers (10-19)", () => {
      expect(getFirstLetter("10 Things I Hate About You")).toBe("T"); // ten
      expect(getFirstLetter("11/22/63")).toBe("E"); // eleven
      expect(getFirstLetter("12 Angry Men")).toBe("T"); // twelve
      expect(getFirstLetter("13 Reasons Why")).toBe("T"); // thirteen
      expect(getFirstLetter("14 Days")).toBe("F"); // fourteen
      expect(getFirstLetter("15 Minutes")).toBe("F"); // fifteen
      expect(getFirstLetter("16 Candles")).toBe("S"); // sixteen
      expect(getFirstLetter("17 Again")).toBe("S"); // seventeen
      expect(getFirstLetter("18 Below")).toBe("E"); // eighteen
      expect(getFirstLetter("19 Minutes")).toBe("N"); // nineteen
    });

    it("converts two-digit numbers >= 20", () => {
      expect(getFirstLetter("20 Thousand Leagues")).toBe("T"); // twenty
      expect(getFirstLetter("30 Days of Night")).toBe("T"); // thirty
      expect(getFirstLetter("40 Rules of Love")).toBe("F"); // forty
      expect(getFirstLetter("50 Shades of Grey")).toBe("F"); // fifty
      expect(getFirstLetter("84 Charing Cross Road")).toBe("E"); // eighty
      expect(getFirstLetter("99 Nights")).toBe("N"); // ninety
    });

    it("converts numbers with commas", () => {
      expect(getFirstLetter("20,000 Leagues Under the Sea")).toBe("T"); // twenty
      expect(getFirstLetter("100,000 Stars")).toBe("O"); // one hundred
    });

    it("converts larger numbers", () => {
      expect(getFirstLetter("100 Years of Solitude")).toBe("O"); // one hundred
      expect(getFirstLetter("451 Fahrenheit")).toBe("F"); // four hundred
      expect(getFirstLetter("1000 Splendid Suns")).toBe("O"); // one thousand
    });

    it("strips articles before checking numbers", () => {
      expect(getFirstLetter("The 39 Steps")).toBe("T"); // thirty
    });
  });
});
