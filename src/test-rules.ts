import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { classify, toPosix } from "./discover.js";
import { applyRule } from "./scan.js";
import type { Rule, ScanTarget } from "./types.js";

export interface FixtureResult {
  passed: number;
  failed: string[];
  rulesWithoutFixtures: string[];
}

/**
 * Every rule ships fixtures. Files named `bad*` must trigger the rule, files
 * named `good*` must not. This is the whole contract for a rule contribution.
 */
export function runFixtures(rules: Rule[]): FixtureResult {
  const result: FixtureResult = { passed: 0, failed: [], rulesWithoutFixtures: [] };

  for (const rule of rules) {
    const fixturesDir = join(rule.dir ?? "", "fixtures");
    let entries: string[];
    try {
      entries = readdirSync(fixturesDir).filter((name) =>
        statSync(join(fixturesDir, name)).isFile(),
      );
    } catch {
      result.rulesWithoutFixtures.push(rule.id);
      continue;
    }

    const bad = entries.filter((name) => basename(name).startsWith("bad"));
    const good = entries.filter((name) => basename(name).startsWith("good"));

    if (bad.length === 0) {
      result.failed.push(`${rule.id}: needs at least one fixture named bad*`);
    }
    if (good.length === 0) {
      result.failed.push(`${rule.id}: needs at least one fixture named good*`);
    }

    for (const name of entries) {
      const target = fixtureTarget(rule, join(fixturesDir, name));
      const findings = applyRule(rule, target);
      const shouldFire = basename(name).startsWith("bad");
      if (shouldFire && findings.length === 0) {
        result.failed.push(`${rule.id}: ${name} should trigger the rule but did not`);
      } else if (!shouldFire && findings.length > 0) {
        result.failed.push(
          `${rule.id}: ${name} should be clean but reported line ${findings[0].line}`,
        );
      } else {
        result.passed += 1;
      }
    }
  }

  return result;
}

/**
 * A fixture named `bad__<name>` is scanned as if it lived at
 * `.claude/skills/example/<name>`. Rules that match on the path need that;
 * everything else can use plain `bad.md` / `good.md`.
 */
function fixtureTarget(rule: Rule, path: string): ScanTarget {
  const content = readFileSync(path, "utf8");
  const name = basename(path);
  const marker = name.indexOf("__");
  const relPath =
    marker >= 0 ? `.claude/skills/example/${name.slice(marker + 2)}` : toPosix(path);
  const declared = rule.targets[0];
  const kind = declared === "any" ? classify(relPath, content) : declared;
  return { absPath: path, relPath, kind, content };
}
