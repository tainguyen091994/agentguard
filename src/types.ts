export type Severity = "critical" | "high" | "medium" | "low" | "info";

export const SEVERITY_ORDER: Severity[] = ["info", "low", "medium", "high", "critical"];

/**
 * What kind of extension file a rule applies to.
 * `any` means the rule runs against every discovered file.
 */
export type TargetKind =
  | "skill"
  | "hook"
  | "mcp"
  | "plugin"
  | "settings"
  | "agentsmd"
  | "any";

export interface RegexMatcher {
  /** JavaScript regular expression, matched against the raw file text. */
  regex: string;
  /** Regex flags. `g` and `m` are always added. Use `i` for case-insensitive. */
  flags?: string;
}

export interface FrontmatterMatcher {
  frontmatter: {
    /** YAML frontmatter key, e.g. `allowed-tools`. */
    field: string;
    /** Match when the field is present (default) or absent. */
    present?: boolean;
    /** Match only when the field value also matches this regex. */
    regex?: string;
  };
}

export interface JsonMatcher {
  json: {
    /** Dot path into the parsed JSON. `*` matches any object key or array index. */
    path: string;
    /** Match when the path resolves (default) or does not resolve. */
    present?: boolean;
    /** Match only when the resolved value, stringified, matches this regex. */
    regex?: string;
    /** Match only when the resolved value's parent object lacks this key. */
    sibling_missing?: string;
  };
}

export interface FilenameMatcher {
  /** Regex matched against the path relative to the scan root. */
  filename: string;
}

export type Matcher =
  | RegexMatcher
  | FrontmatterMatcher
  | JsonMatcher
  | FilenameMatcher;

export interface Rule {
  /** Stable identifier, e.g. `AG001`. Never reused. */
  id: string;
  /** Kebab-case short name, e.g. `hook-curl-pipe-shell`. */
  name: string;
  severity: Severity;
  /** One line shown on the finding. Say what is wrong, not what to do. */
  message: string;
  /** Longer prose: why this pattern is dangerous. */
  description?: string;
  targets: TargetKind[];
  match: {
    /** The rule fires when any of these match. */
    any_of: Matcher[];
    /** ...unless one of these also matches. Used to cut false positives. */
    unless?: Matcher[];
  };
  /** What the author should do instead. */
  fix?: string;
  references?: string[];
  tags?: string[];
  /** Directory the rule was loaded from. Set by the loader. */
  dir?: string;
}

export interface Finding {
  ruleId: string;
  ruleName: string;
  severity: Severity;
  message: string;
  /** Path relative to the scan root, POSIX separators. */
  file: string;
  line: number;
  column: number;
  snippet: string;
  fix?: string;
  references?: string[];
}

export interface ScanTarget {
  /** Absolute path on disk. */
  absPath: string;
  /** Path relative to the scan root, POSIX separators. */
  relPath: string;
  kind: TargetKind;
  content: string;
}

export function severityAtLeast(value: Severity, floor: Severity): boolean {
  return SEVERITY_ORDER.indexOf(value) >= SEVERITY_ORDER.indexOf(floor);
}
