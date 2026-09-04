---
name: agentguard-review
description: Scan agent extensions for unsafe patterns and explain the findings. Use before installing a skill, plugin, hook, or MCP server from someone else, when reviewing a pull request that touches .claude/ or .grok/, or when the user asks whether an extension is safe.
when-to-use: reviewing an extension, installing a plugin, auditing skills, checking an MCP server config, "is this skill safe"
---

# Reviewing an agent extension

Run the scanner, then read the findings with judgement. The tool matches patterns; deciding what matters is your job.

## Scan

```bash
npx agentguard scan <path> --json
```

Use `--json` when you need to reason over the findings, plain output when showing the user. Add `--all` if the extension lives outside the usual `.claude/` and `.grok/` folders.

## Read the findings

Report them in this order, and say plainly which ones you would act on:

1. `critical` findings: credential theft, code execution, or persistence. Do not install until these are explained.
2. `high` findings: a strong signal of the above, or an unpinned supply chain source.
3. `medium` and below: worth mentioning once, not worth blocking on.

For each finding, open the file at the reported line and check whether the match is real. A rule fires on text; the surrounding context often changes the answer. State which findings are true and which are noise, and why.

## What the tool cannot see

It reads text. It does not run anything, does not follow remote sources, and does not know intent. So after the scan, read these yourself:

- Every hook script, in full. Hooks run without the user watching.
- Every remote source in a plugin manifest. Unpinned means the code can change after review.
- Any `env` block in an MCP config, for live credentials.

## When a finding is expected

If the flagged behaviour is the extension's actual job, for example a keychain helper reading the keychain, suggest a scoped suppression with the reason on the same line, never a blanket ignore:

```bash
# agentguard-disable-next-line AG003 (this skill's whole job is keychain setup)
security find-generic-password -a "$USER" -s "$KEY" -w
```

## Reporting back

Give the user a short verdict: what you would install, what you would not, and the one or two lines that decided it. Do not paste the full finding list unless they ask.
