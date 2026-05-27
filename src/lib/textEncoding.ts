/**
 * Mojibake detection and repair utilities for the frontend.
 *
 * Provides functions to detect and repair encoding corruption (mojibake)
 * in strings, with support for Latin-1, Windows-1252, and double-encoded UTF-8.
 *
 * The repair pipeline:
 *   1. Latin-1 round-trip: encode('latin-1') → decode('utf-8')
 *   2. Windows-1252 → Latin-1 byte mapping → decode('utf-8')
 *   3. Second Latin-1 round-trip (catches cascading corruption)
 */

const MOJIBAKE_SIGNAL_RE = /(?:\u00C3[\u0080-\u00BF]|\u00C2[\u0080-\u00BF]|\u00E2[\u0080-\u00BF]{1,2}|\u00F0[\u0080-\u00BF]{1,3}|\u00EF\u00BF\u00BD)/u;
const decoder = new TextDecoder("utf-8");

/** Map of Windows-1252 Unicode codepoints (>255) back to their Latin-1 byte values. */
const CP1252_BYTE_MAP: Record<number, number> = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84,
  0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88,
  0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c,
  0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93,
  0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b,
  0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f,
};

function mojibakeScore(value: string): number {
  let score = 0;
  score += (value.match(/\u00C3[\u0080-\u00BF]/gu) ?? []).length * 3;
  score += (value.match(/\u00C2[\u0080-\u00BF]/gu) ?? []).length * 3;
  score += (value.match(/\u00E2[\u0080-\u00BF]{1,2}/gu) ?? []).length * 2;
  score += (value.match(/\u00F0[\u0080-\u00BF]{1,3}/gu) ?? []).length * 2;
  score += (value.match(/\uFFFD/gu) ?? []).length * 4;
  return score;
}

function hasMojibakeSignal(value: string): boolean {
  return MOJIBAKE_SIGNAL_RE.test(value);
}

/**
 * Repair Latin-1 mojibake via round-trip Latin-1 → UTF-8.
 * Applies up to `maxRounds` passes.
 */
function repairLatin1Mojibake(value: string, maxRounds: number = 3): string {
  let text = value;
  for (let i = 0; i < maxRounds; i++) {
    if (!hasMojibakeSignal(text)) break;
    try {
      // Encode as Latin-1 bytes, then decode as UTF-8
      const latin1Bytes = new TextEncoder().encode(text);
      const repaired = decoder.decode(latin1Bytes);
      if (repaired === text) break;
      const before = mojibakeScore(text);
      const after = mojibakeScore(repaired);
      if (after >= before) break;
      text = repaired;
    } catch {
      break;
    }
  }
  return text;
}

/**
 * Repair Windows-1252 mojibake by mapping cp1252 chars back to Latin-1 bytes
 * and then decoding as UTF-8.
 */
function repairCp1252Mojibake(value: string): string {
  if (!value) return value;
  const codePoints = Array.from(value, (ch) => ch.charCodeAt(0));
  // Map cp1252 characters to their Latin-1 byte values
  const bytes = codePoints.map((cp) => CP1252_BYTE_MAP[cp] ?? cp);
  if (bytes.some((b) => b > 255)) return value; // Contains non-Latin-1 chars
  try {
    const repaired = decoder.decode(Uint8Array.from(bytes));
    if (repaired === value) return value;
    return mojibakeScore(repaired) < mojibakeScore(value) ? repaired : value;
  } catch {
    return value;
  }
}

/**
 * Repair mojibake (encoding corruption) in a string.
 *
 * Applies both Latin-1 and Windows-1252 repair strategies.
 * Returns the original string if no repair is needed or possible.
 *
 * @param value - The potentially corrupted string.
 * @param maxRounds - Maximum number of Latin-1 round-trip passes (default: 3).
 * @returns The repaired string, or the original if no corruption detected.
 */
export function repairMojibake(value: string, maxRounds: number = 3): string {
  if (!value || !hasMojibakeSignal(value)) return value;

  const original = value;
  let text = value;

  // Strategy 1: Latin-1 round-trip
  text = repairLatin1Mojibake(text, maxRounds);

  // Strategy 2: Windows-1252 → Latin-1 → UTF-8
  text = repairCp1252Mojibake(text);

  // Strategy 3: Second Latin-1 pass (cp1252 repair may expose more)
  text = repairLatin1Mojibake(text, maxRounds);

  return text;
}

function isPlainObject(input: unknown): input is Record<string, unknown> {
  if (!input || typeof input !== "object") return false;
  const proto = Object.getPrototypeOf(input);
  return proto === Object.prototype || proto === null;
}

/**
 * Recursively repair mojibake in all string fields of a data structure.
 *
 * Handles strings, dicts, arrays, and nested combinations.
 * Other types are returned unchanged.
 *
 * @param input - The data structure to repair.
 * @param maxRounds - Maximum number of repair passes per string (default: 3).
 * @returns The data structure with all strings repaired.
 */
export function repairMojibakeDeep<T>(input: T, maxRounds: number = 3): T {
  if (typeof input === "string") return repairMojibake(input, maxRounds) as T;
  if (Array.isArray(input)) {
    return input.map((item) => repairMojibakeDeep(item, maxRounds)) as T;
  }
  if (!isPlainObject(input)) return input;

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    out[key] = repairMojibakeDeep(value, maxRounds);
  }
  return out as T;
}

/**
 * Repair mojibake in data fetched during Server-Side Rendering (SSR).
 *
 * Use this in Server Components, getServerSideProps, or any data fetching
 * that happens on the server side and doesn't go through parseJsonSafe.
 *
 * @example
 * ```ts
 * // In a Server Component or getServerSideProps
 * const data = await fetch('https://api.example.com/data').then(r => r.json());
 * const cleanData = repairMojibakeSSR(data);
 * ```
 */
export function repairMojibakeSSR<T>(data: T, maxRounds: number = 3): T {
  return repairMojibakeDeep(data, maxRounds);
}

/**
 * Read a value from localStorage and repair mojibake.
 * Returns null if the key doesn't exist or on error.
 */
export function readAndRepairLocalStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    return repairMojibake(raw);
  } catch {
    return null;
  }
}

/**
 * Read a value from sessionStorage and repair mojibake.
 * Returns null if the key doesn't exist or on error.
 */
export function readAndRepairSessionStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (raw === null) return null;
    return repairMojibake(raw);
  } catch {
    return null;
  }
}

/**
 * Parse a JSON value from localStorage and repair mojibake in all strings.
 * Returns null if the key doesn't exist, JSON is invalid, or on error.
 */
export function readAndRepairLocalStorageJSON<T = unknown>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as T;
    return repairMojibakeDeep(parsed);
  } catch {
    return null;
  }
}

/**
 * Parse a JSON value from sessionStorage and repair mojibake in all strings.
 * Returns null if the key doesn't exist, JSON is invalid, or on error.
 */
export function readAndRepairSessionStorageJSON<T = unknown>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as T;
    return repairMojibakeDeep(parsed);
  } catch {
    return null;
  }
}
