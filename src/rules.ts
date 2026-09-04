import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { SEVERITY_ORDER, type Rule, type Severity, type TargetKind } from "./types.js";

const VALID_TARGETS: TargetKind[] = [
  "skill",
  "hook",
  "mcp",
  "plugin",
  "settings",
  "agentsmd",
  "any",
];

/** The `rules/` directory that ships with the package. */
export function bundledRulesDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "..", "rules");
}

export function loadRules(rulesDir: string): Rule[] {
  const rules: Rule[] = [];
  let entries: string[];
  try {
    entries = readdirSync(rulesDir);
  } catch {
    throw new Error(`Cannot read rules directory: ${rulesDir}`);
  }

  for (const entry of entries.sort()) {
    const dir = join(rulesDir, entry);
    if (!statSync(dir).isDirectory()) continue;
    const rulePath = join(dir, "rule.yml");
    let raw: string;
    try {
      raw = readFileSync(rulePath, "utf8");
    } catch {
      throw new Error(`${entry}: missing rule.yml`);
    }
    const parsed = parseYaml(raw) as Rule;
    validateRule(parsed, entry);
    parsed.dir = dir;
    rules.push(parsed);
  }

  const seen = new Set<string>();
  for (const rule of rules) {
    if (seen.has(rule.id)) throw new Error(`Duplicate rule id: ${rule.id}`);
    seen.add(rule.id);
  }
  return rules;
}

/**
 * Fails loudly on a malformed rule. CI runs this on every pull request, so the
 * messages are written for someone submitting their first rule.
 */
export function validateRule(rule: Rule, source: string): void {
  const bad = (msg: string) => {
    throw new Error(`${source}: ${msg}`);
  };

  if (!rule || typeof rule !== "object") bad("rule.yml did not parse to an object");
  if (!/^AG\d{3,}$/.test(rule.id ?? "")) bad("`id` must look like AG001");
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(rule.name ?? "")) bad("`name` must be kebab-case");
  if (!SEVERITY_ORDER.includes(rule.severity)) {
    bad(`\`severity\` must be one of ${SEVERITY_ORDER.join(", ")}`);
  }
  if (!rule.message || rule.message.length > 140) {
    bad("`message` is required and must be 140 characters or fewer");
  }
  if (!Array.isArray(rule.targets) || rule.targets.length === 0) {
    bad("`targets` must list at least one target kind");
  }
  for (const target of rule.targets) {
    if (!VALID_TARGETS.includes(target)) {
      bad(`unknown target \`${target}\`; valid: ${VALID_TARGETS.join(", ")}`);
    }
  }
  if (!rule.match?.any_of?.length) bad("`match.any_of` must list at least one matcher");
  for (const matcher of [...rule.match.any_of, ...(rule.match.unless ?? [])]) {
    const keys = Object.keys(matcher).filter((key) => key !== "flags");
    if (keys.length !== 1) {
      bad("each matcher needs exactly one of: regex, frontmatter, json, filename");
    }
    const key = keys[0];
    if (!["regex", "frontmatter", "json", "filename"].includes(key)) {
      bad(`unknown matcher \`${key}\``);
    }
    if (key === "regex" || key === "filename") {
      const pattern = (matcher as unknown as Record<string, string>)[key];
      try {
        new RegExp(pattern);
      } catch (err) {
        bad(`invalid ${key} pattern: ${(err as Error).message}`);
      }
    }
  }
}

export function severityRank(severity: Severity): number {
  return SEVERITY_ORDER.indexOf(severity);
}
