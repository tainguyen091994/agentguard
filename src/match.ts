import { parse as parseYaml } from "yaml";
import type { Matcher, ScanTarget } from "./types.js";

export interface MatchHit {
  /** 1-based line number in the file. */
  line: number;
  /** 1-based column. */
  column: number;
  snippet: string;
}

export function runMatcher(matcher: Matcher, target: ScanTarget): MatchHit[] {
  if ("regex" in matcher) return matchRegex(matcher.regex, matcher.flags, target);
  if ("filename" in matcher) return matchFilename(matcher.filename, target);
  if ("frontmatter" in matcher) return matchFrontmatter(matcher, target);
  if ("json" in matcher) return matchJson(matcher, target);
  return [];
}

function matchRegex(
  pattern: string,
  flags: string | undefined,
  target: ScanTarget,
): MatchHit[] {
  const re = new RegExp(pattern, uniqueFlags(`gm${flags ?? ""}`));
  const hits: MatchHit[] = [];
  for (const match of target.content.matchAll(re)) {
    if (match.index === undefined) continue;
    hits.push(hitAt(target.content, match.index));
    if (hits.length >= 50) break;
  }
  return hits;
}

function matchFilename(pattern: string, target: ScanTarget): MatchHit[] {
  return new RegExp(pattern).test(target.relPath)
    ? [{ line: 1, column: 1, snippet: target.relPath }]
    : [];
}

function matchFrontmatter(
  matcher: Extract<Matcher, { frontmatter: unknown }>,
  target: ScanTarget,
): MatchHit[] {
  const { field, present = true, regex } = matcher.frontmatter;
  const block = frontmatterBlock(target.content);
  const data = block ? safeYaml(block.text) : null;
  const has = !!data && Object.prototype.hasOwnProperty.call(data, field);

  if (!present) {
    return has ? [] : [{ line: 1, column: 1, snippet: `frontmatter is missing \`${field}\`` }];
  }
  if (!has) return [];

  const value = String((data as Record<string, unknown>)[field] ?? "");
  if (regex && !new RegExp(regex).test(value)) return [];

  const index = target.content.indexOf(`${field}:`);
  const hit = index >= 0 ? hitAt(target.content, index) : { line: 1, column: 1, snippet: field };
  return [hit];
}

function matchJson(
  matcher: Extract<Matcher, { json: unknown }>,
  target: ScanTarget,
): MatchHit[] {
  const { path, present = true, regex, sibling_missing } = matcher.json;
  const data = safeJson(target.content);
  if (data === undefined) return [];

  const resolved = resolveJsonPath(data, path.split("."));
  if (!present) {
    return resolved.length === 0
      ? [{ line: 1, column: 1, snippet: `no value at \`${path}\`` }]
      : [];
  }

  const hits: MatchHit[] = [];
  for (const entry of resolved) {
    const text = typeof entry.value === "string" ? entry.value : JSON.stringify(entry.value);
    if (regex && !new RegExp(regex).test(text ?? "")) continue;
    if (sibling_missing) {
      const parent = entry.parent;
      const hasSibling =
        parent !== null &&
        typeof parent === "object" &&
        Object.prototype.hasOwnProperty.call(parent, sibling_missing);
      if (hasSibling) continue;
    }
    hits.push(locateKey(target.content, entry.key, text));
  }
  return hits;
}

interface JsonEntry {
  key: string;
  value: unknown;
  parent: unknown;
}

/** Resolves a dot path where `*` matches any object key or array index. */
export function resolveJsonPath(root: unknown, segments: string[]): JsonEntry[] {
  let current: JsonEntry[] = [{ key: "$", value: root, parent: null }];
  for (const segment of segments) {
    const next: JsonEntry[] = [];
    for (const entry of current) {
      const value = entry.value;
      if (value === null || typeof value !== "object") continue;
      if (segment === "*") {
        for (const [key, child] of Object.entries(value)) {
          next.push({ key, value: child, parent: value });
        }
      } else if (Object.prototype.hasOwnProperty.call(value, segment)) {
        next.push({
          key: segment,
          value: (value as Record<string, unknown>)[segment],
          parent: value,
        });
      }
    }
    current = next;
    if (current.length === 0) return [];
  }
  return current;
}

export function frontmatterBlock(content: string): { text: string; endLine: number } | null {
  if (!content.startsWith("---")) return null;
  const end = content.indexOf("\n---", 3);
  if (end < 0) return null;
  const text = content.slice(content.indexOf("\n") + 1, end);
  return { text, endLine: text.split("\n").length + 2 };
}

function safeYaml(text: string): Record<string, unknown> | null {
  try {
    const parsed = parseYaml(text);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(stripJsonComments(text));
  } catch {
    return undefined;
  }
}

/** `.mcp.json` and `settings.json` are often written with comments. */
function stripJsonComments(text: string): string {
  return text.replace(/^\s*\/\/.*$/gm, "");
}

function locateKey(content: string, key: string, value: string | undefined): MatchHit {
  const byValue = value ? content.indexOf(value) : -1;
  const byKey = content.indexOf(`"${key}"`);
  const index = byValue >= 0 ? byValue : byKey >= 0 ? byKey : 0;
  return hitAt(content, index);
}

function hitAt(content: string, index: number): MatchHit {
  const before = content.slice(0, index);
  const line = before.split("\n").length;
  const lineStart = before.lastIndexOf("\n") + 1;
  const lineEnd = content.indexOf("\n", index);
  const raw = content.slice(lineStart, lineEnd < 0 ? content.length : lineEnd);
  return {
    line,
    column: index - lineStart + 1,
    snippet: truncate(raw.trim(), 160),
  };
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

function uniqueFlags(flags: string): string {
  return [...new Set(flags.split(""))].join("");
}
