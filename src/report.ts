import type { Finding, Rule, Severity } from "./types.js";

const ESC = String.fromCharCode(27);

const COLORS = {
  reset: `${ESC}[0m`,
  dim: `${ESC}[2m`,
  bold: `${ESC}[1m`,
  red: `${ESC}[31m`,
  yellow: `${ESC}[33m`,
  blue: `${ESC}[34m`,
  gray: `${ESC}[90m`,
};

const SEVERITY_COLOR: Record<Severity, string> = {
  critical: COLORS.red,
  high: COLORS.red,
  medium: COLORS.yellow,
  low: COLORS.blue,
  info: COLORS.gray,
};

export function textReport(findings: Finding[], useColor: boolean): string {
  const paint = (color: string, text: string) =>
    useColor ? `${color}${text}${COLORS.reset}` : text;

  if (findings.length === 0) {
    return paint(COLORS.dim, "agentguard: no findings.");
  }

  const lines: string[] = [];
  let currentFile = "";
  for (const finding of findings) {
    if (finding.file !== currentFile) {
      currentFile = finding.file;
      lines.push("", paint(COLORS.bold, currentFile));
    }
    const tag = paint(SEVERITY_COLOR[finding.severity], finding.severity.padEnd(8));
    lines.push(
      `  ${String(finding.line).padStart(4)}:${String(finding.column).padEnd(3)} ${tag} ${finding.message} ${paint(COLORS.gray, `[${finding.ruleId}]`)}`,
    );
    if (finding.snippet) lines.push(`       ${paint(COLORS.gray, finding.snippet)}`);
    if (finding.fix) lines.push(`       ${paint(COLORS.dim, `fix: ${finding.fix.trim()}`)}`);
  }

  const counts = countBySeverity(findings);
  const summary = (["critical", "high", "medium", "low", "info"] as Severity[])
    .filter((severity) => counts[severity] > 0)
    .map((severity) => `${counts[severity]} ${severity}`)
    .join(", ");
  lines.push("", `${findings.length} finding(s): ${summary}`);
  return lines.join("\n");
}

export function countBySeverity(findings: Finding[]): Record<Severity, number> {
  const counts: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };
  for (const finding of findings) counts[finding.severity] += 1;
  return counts;
}

/** SARIF 2.1.0, so findings render in the GitHub code scanning tab. */
export function sarifReport(findings: Finding[], rules: Rule[], version: string): string {
  const used = rules.filter((rule) => findings.some((f) => f.ruleId === rule.id));
  const sarif = {
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "agentguard",
            version,
            informationUri: "https://github.com/agentguard/agentguard",
            rules: used.map((rule) => ({
              id: rule.id,
              name: rule.name,
              shortDescription: { text: rule.message },
              fullDescription: { text: rule.description ?? rule.message },
              helpUri: rule.references?.[0],
              help: { text: rule.fix ?? rule.description ?? rule.message },
              properties: {
                tags: rule.tags ?? [],
                "security-severity": securityScore(rule.severity),
              },
              defaultConfiguration: { level: sarifLevel(rule.severity) },
            })),
          },
        },
        results: findings.map((finding) => ({
          ruleId: finding.ruleId,
          level: sarifLevel(finding.severity),
          message: { text: finding.message },
          locations: [
            {
              physicalLocation: {
                artifactLocation: { uri: finding.file },
                region: {
                  startLine: finding.line,
                  startColumn: finding.column,
                  snippet: { text: finding.snippet },
                },
              },
            },
          ],
        })),
      },
    ],
  };
  return JSON.stringify(sarif, null, 2);
}

function sarifLevel(severity: Severity): string {
  if (severity === "critical" || severity === "high") return "error";
  if (severity === "medium") return "warning";
  return "note";
}

function securityScore(severity: Severity): string {
  return { critical: "9.5", high: "7.5", medium: "5.0", low: "3.0", info: "1.0" }[severity];
}
