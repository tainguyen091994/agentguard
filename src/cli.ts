#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { bundledRulesDir, loadRules } from "./rules.js";
import { scan } from "./scan.js";
import { sarifReport, textReport } from "./report.js";
import { runFixtures } from "./test-rules.js";
import { severityAtLeast, type Severity } from "./types.js";

const USAGE = `agentguard: scan AI coding agent extensions for unsafe patterns

Usage:
  agentguard scan [path]          Scan a repo, a directory, or a single file
  agentguard test                 Run every rule against its fixtures
  agentguard rules                List the loaded rules

Options:
  --json                          Print findings as JSON
  --sarif <file>                  Also write a SARIF 2.1.0 report
  --min-severity <level>          Fail at this level or above (default: high)
  --disable <AG001,AG002>         Skip these rules
  --rules <dir>                   Use a different rule directory
  --all                           Scan every file, not only extension paths
  --no-color                      Plain output
  -h, --help                      This text
`;

interface Options {
  command: string;
  target: string;
  json: boolean;
  sarif?: string;
  minSeverity: Severity;
  disable: string[];
  rulesDir: string;
  all: boolean;
  color: boolean;
}

function parseArgs(argv: string[]): Options {
  const options: Options = {
    command: "scan",
    target: ".",
    json: false,
    minSeverity: "high",
    disable: [],
    rulesDir: bundledRulesDir(),
    all: false,
    color: process.stdout.isTTY === true && !process.env.NO_COLOR,
  };

  const positional: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "-h":
      case "--help":
        process.stdout.write(USAGE);
        process.exit(0);
        break;
      case "--json":
        options.json = true;
        break;
      case "--all":
        options.all = true;
        break;
      case "--no-color":
        options.color = false;
        break;
      case "--sarif":
        options.sarif = argv[++i];
        break;
      case "--min-severity":
        options.minSeverity = argv[++i] as Severity;
        break;
      case "--disable":
        options.disable = (argv[++i] ?? "").split(",").map((id) => id.trim()).filter(Boolean);
        break;
      case "--rules":
        options.rulesDir = resolve(argv[++i]);
        break;
      default:
        if (arg.startsWith("-")) fail(`unknown option ${arg}`);
        positional.push(arg);
    }
  }

  if (positional.length > 0 && ["scan", "test", "rules"].includes(positional[0])) {
    options.command = positional.shift()!;
  }
  if (positional.length > 0) options.target = positional[0];
  return options;
}

function fail(message: string): never {
  process.stderr.write(`agentguard: ${message}\n\n${USAGE}`);
  process.exit(2);
}

function packageVersion(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(readFileSync(resolve(here, "..", "package.json"), "utf8"));
    return String(pkg.version ?? "0.0.0");
  } catch {
    return "0.0.0";
  }
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const rules = loadRules(options.rulesDir);

  if (options.command === "rules") {
    for (const rule of rules) {
      process.stdout.write(
        `${rule.id}  ${rule.severity.padEnd(8)} ${rule.name.padEnd(32)} ${rule.targets.join(",")}\n`,
      );
    }
    process.stdout.write(`\n${rules.length} rule(s) loaded from ${options.rulesDir}\n`);
    return;
  }

  if (options.command === "test") {
    const result = runFixtures(rules);
    for (const failure of result.failed) process.stdout.write(`FAIL  ${failure}\n`);
    for (const id of result.rulesWithoutFixtures) {
      process.stdout.write(`FAIL  ${id}: no fixtures directory\n`);
    }
    const failures = result.failed.length + result.rulesWithoutFixtures.length;
    process.stdout.write(
      `\n${result.passed} fixture(s) passed, ${failures} problem(s) across ${rules.length} rule(s)\n`,
    );
    process.exit(failures === 0 ? 0 : 1);
  }

  const root = resolve(options.target);
  const findings = scan(root, { rules, disable: options.disable, all: options.all });

  if (options.sarif) {
    writeFileSync(options.sarif, sarifReport(findings, rules, packageVersion()), "utf8");
  }

  if (options.json) {
    process.stdout.write(`${JSON.stringify({ findings }, null, 2)}\n`);
  } else {
    process.stdout.write(`${textReport(findings, options.color)}\n`);
  }

  const blocking = findings.filter((finding) =>
    severityAtLeast(finding.severity, options.minSeverity),
  );
  process.exit(blocking.length > 0 ? 1 : 0);
}

try {
  main();
} catch (error) {
  process.stderr.write(`agentguard: ${(error as Error).message}\n`);
  process.exit(2);
}
