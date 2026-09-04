import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep, basename, extname } from "node:path";
import type { ScanTarget, TargetKind } from "./types.js";

/**
 * Directories worth scanning by default. Anything else is noise: a repo full of
 * application code has no agent extensions in `src/`.
 */
const EXTENSION_DIRS = [
  ".claude",
  ".claude-plugin",
  ".grok",
  ".grok-plugin",
  ".cursor",
  ".codex",
  "skills",
  "plugins",
  "agents",
  "commands",
  "hooks",
];

const ROOT_FILES = [
  ".mcp.json",
  "mcp.json",
  "plugin.json",
  "marketplace.json",
  "CLAUDE.md",
  "CLAUDE.local.md",
  "Claude.md",
  "AGENTS.md",
  "GROK.md",
];

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "target",
  ".venv",
  "venv",
  "__pycache__",
  ".next",
  "coverage",
]);

const MAX_BYTES = 512 * 1024;

const TEXT_EXTENSIONS = new Set([
  ".md",
  ".markdown",
  ".json",
  ".jsonc",
  ".yml",
  ".yaml",
  ".toml",
  ".sh",
  ".bash",
  ".zsh",
  ".ps1",
  ".py",
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".txt",
  "",
]);

export interface DiscoverOptions {
  /** Scan every file under the root, not only known extension locations. */
  all?: boolean;
}

export function discover(root: string, options: DiscoverOptions = {}): ScanTarget[] {
  const targets: ScanTarget[] = [];
  const rootStat = statSync(root);

  if (rootStat.isFile()) {
    const target = readTarget(root, basename(root));
    return target ? [target] : [];
  }

  if (options.all) {
    walk(root, root, targets);
    return targets;
  }

  for (const name of ROOT_FILES) {
    const candidate = join(root, name);
    if (exists(candidate)) {
      const target = readTarget(candidate, name);
      if (target) targets.push(target);
    }
  }
  for (const dir of EXTENSION_DIRS) {
    const candidate = join(root, dir);
    if (exists(candidate) && statSync(candidate).isDirectory()) {
      walk(candidate, root, targets);
    }
  }
  return targets;
}

function exists(path: string): boolean {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

function walk(dir: string, root: string, out: ScanTarget[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(join(dir, entry.name), root, out);
      continue;
    }
    if (!entry.isFile()) continue;
    const abs = join(dir, entry.name);
    const rel = toPosix(relative(root, abs));
    const target = readTarget(abs, rel);
    if (target) out.push(target);
  }
}

function readTarget(abs: string, rel: string): ScanTarget | null {
  const ext = extname(abs).toLowerCase();
  if (!TEXT_EXTENSIONS.has(ext) && !looksLikeSecretFile(rel)) return null;
  let stat;
  try {
    stat = statSync(abs);
  } catch {
    return null;
  }
  if (stat.size > MAX_BYTES) return null;
  let content: string;
  try {
    content = readFileSync(abs, "utf8");
  } catch {
    return null;
  }
  return { absPath: abs, relPath: rel, kind: classify(rel, content), content };
}

function looksLikeSecretFile(rel: string): boolean {
  const name = basename(rel).toLowerCase();
  return (
    name === ".env" ||
    name.startsWith(".env.") ||
    name.endsWith(".pem") ||
    name.endsWith(".key") ||
    name === "id_rsa" ||
    name === "id_ed25519"
  );
}

/**
 * Decides which rules apply to a file. Classification is by path shape, because
 * Claude Code and Grok Build lay their extensions out the same way.
 */
export function classify(rel: string, content: string): TargetKind {
  const path = rel.toLowerCase();
  const name = basename(path);

  if (name === "skill.md") return "skill";
  if (/(^|\/)(claude|claude\.local|agents|grok)\.md$/.test(path)) return "agentsmd";
  if (/(^|\/)hooks?\//.test(path)) return "hook";
  if (/\.(sh|bash|zsh|ps1)$/.test(path)) return "hook";
  if (name === "settings.json" || name === "settings.local.json") return "settings";
  if (name === ".mcp.json" || name === "mcp.json") return "mcp";
  if (name.endsWith(".json") && /"mcpservers"\s*:/i.test(content)) return "mcp";
  if (name === "marketplace.json" || name === "plugin.json") return "plugin";
  if (/(^|\/)\.(claude|grok)-plugin\//.test(path) && name.endsWith(".json")) return "plugin";
  if (name === "known_marketplaces.json") return "plugin";
  return "any";
}

export function toPosix(path: string): string {
  return path.split(sep).join("/");
}
