# Crew Bridge

A Claude Code mod that puts your agent crew beside the chat. Each crewmate has an
animated portrait whose ring lights up as it works, and the pane shows what each one is
doing, how long it has been at it, the issue or pull request it is on, and a short log
of what just happened.

The crew is a fixed cast of star callsigns: two team leads (Polaris for the overlay,
Capella for the website), their developers, and the shared roles (Argus for QA, Atlas
for product, Orion for refinement, Iris for UX). The session itself is the lead; every
other crewmate is recognised by its name in the description of an agent the lead starts.

## Screenshots

_Screenshots to come._

## Features

- **Live status per crewmate**: Working (with time on task, and a count when one
  crewmate runs several agents at once), Done (fades back to idle after ten minutes),
  Needs you, or Idle.
- **Animated portraits**: each crewmate has its own head, feature and colour; the ring
  spins while working, pulses when you are needed and turns green when done.
- **Issue and PR links**: a run's first issue or pull request mention, from its
  description or prompt, links to GitHub and to a local Observatory dashboard.
- **QA verdicts**: when Argus finishes, its report is read for Approved or Changes
  requested, shown in green or amber.
- **Needs-you count**: every five minutes the open `needs-tony` issues in the configured
  repository are counted with `gh`; while any are open and the lead is not busy, the lead
  shows Needs you.
- **Scoreboard**: finished runs per crewmate and merged pull requests (`gh pr merge`),
  for today and this ISO week, kept across sessions.
- **Activity log**: the last six starts, finishes, merges and questions.
- **Optional chime** when the lead asks you a question or more needs-you items open.
- **`/crew`** reopens the pane.

## Install

At the prompt of a terminal Claude Code session:

```
/plugin install crew-bridge --marketplace anthonyturner/crew-bridge
```

Answer `y` to add the marketplace, then pick a scope. From a shell:

```
claude plugin install crew-bridge --marketplace anthonyturner/crew-bridge
```

The repository is private: installing needs read access on GitHub and a git credential
for github.com on your machine (an SSH key, or `gh auth login` then `gh auth setup-git`).

To run it from a local clone instead, for one session:

```
claude --plugin-dir path/to/crew-bridge
```

or name the folder in `CLAUDE_CODE_PLUGIN_DIRS` (in the environment or the `env` block of
your user `settings.json`) so every session loads it. An interactive session loaded this
way reloads the mod on every save.

## Settings

Set in the config menu, or under `pluginConfigs` → `crew-bridge` in settings.

| Setting | Default | What it does |
| --- | --- | --- |
| `chime` | `false` | Plays a soft chime when the lead asks you a question or more needs-tony items open. |
| `lead` | `Polaris` | This session's lead: `Polaris` or `Capella`. The lead's team always shows; the other team shows once it has activity. |
| `repo` | `anthonyturner/rivals_pulse` | `owner/repo` whose `needs-tony` issues are counted, and the repository of a bare `#123` when a prompt names none. |

The needs-you count needs the GitHub CLI (`gh`) installed and signed in.

## How it works

The mod is one hooks module (`hooks/register.tsx`) that only wires Claude Code events to
small modules beside it:

| Module | Job |
| --- | --- |
| `roster.ts` | The crew: names, roles, colours, shapes; finding a crewmate named in text. |
| `settings.ts` | Reads the `userConfig` options, falling back to defaults. |
| `board.ts` | Pure board transitions (lead status, run start and end, Done fade, needs-you) and the pane's rows, plus the board's state. |
| `links.ts` | Parses issue and PR mentions and `gh pr merge` commands; builds GitHub and Observatory links. |
| `verdict.ts` | Reads a QA report's verdict. |
| `activity.ts` | The activity log. |
| `scoreboard.ts` | Day and week tallies, rolled over by date and kept in `$.store` across sessions. |
| `needs.ts` | Counts open `needs-tony` issues with `gh`. |
| `chime.ts` | Plays the chime. |
| `portrait.ts` | Draws a crewmate's animated SVG portrait. |
| `format.ts` | Times and counts as the pane says them. |
| `pane.tsx` | Draws the pane and keeps its times current. |

Events it hooks: `session.start` (opens the pane, starts the timers), `prompt.submit` and
`classic.Stop` (the lead's own status), `AskUserQuestion` calls (Needs you), `agent.spawn`
and `classic.SubagentStop` (crewmate runs), `Bash` calls (merges) and `ui.render` (the
pane). Every panel update is best-effort: if one fails, the event it watched carries on.

The values kept in `$.state` are declared in `types/index.d.ts`.

## Developing

Load the folder with `claude --plugin-dir` as above; the engine then writes
`.claude-plugin/types/` and a top-level `tsconfig.json` (both ignored by git), so the
checks below run with no setup:

```
claude plugin validate .
npx -y -p typescript@5.6.3 tsc -p . --noEmit
claude plugin test .
```

Tests sit beside the modules as `*.test.ts(x)`: pure unit tests for the board, links,
verdicts, needs count and scoreboard, and end-to-end tests that drive the hooks through
the engine's test kit.
