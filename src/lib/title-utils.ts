// Maps digit 0-9 to the first letter of its English word
// 0=Zero 1=One 2=Two 3=Three 4=Four 5=Five 6=Six 7=Seven 8=Eight 9=Nine
const DIGIT_LETTER = "ZOTTFFSSEN";

// Maps teen numbers 10-19 to the first letter of their English word
// 10=Ten 11=Eleven 12=Twelve 13=Thirteen 14=Fourteen 15=Fifteen
// 16=Sixteen 17=Seventeen 18=Eighteen 19=Nineteen
const TEEN_LETTER = "TETTFFSSEN";

/**
 * Converts a leading number in a string to the first letter of its English
 * word form. For numbers >= 20, the first digit determines the letter since
 * "two"/"twenty"/"two hundred" all start with the same letter.
 *
 * Examples: "50" → F (fifty), "20,000" → T (twenty), "1984" → O (one thousand)
 */
function leadingNumberToLetter(str: string): string {
  const match = str.match(/^[\d,]+/);
  if (!match) return "";
  const n = parseInt(match[0].replace(/,/g, ""), 10);
  if (isNaN(n) || n < 0) return "";
  if (n <= 9) return DIGIT_LETTER[n];
  if (n <= 19) return TEEN_LETTER[n - 10];
  return DIGIT_LETTER[parseInt(match[0].replace(/,/g, "")[0], 10)];
}

/**
 * Extracts the relevant first letter (A-Z) from a book title for the
 * alphabet challenge. Strips leading articles ("The", "A", "An") and
 * converts leading numbers to their English word equivalent.
 */
export function getFirstLetter(title: string): string {
  const stripped = title.replace(/^(the|a|an)\s+/i, "").trim();
  if (!stripped) return "";
  const first = stripped.charAt(0);
  if (first >= "0" && first <= "9") {
    return leadingNumberToLetter(stripped);
  }
  return first.toUpperCase();
}
