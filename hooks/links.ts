import type { CrewRef } from '../types'

const URL_REF = /github\.com\/([\w.-]+\/[\w.-]+)\/(issues|pull)\/(\d+)/i
const TEXT_REF = /\b(issues?|prs?|pull requests?)\s*#?(\d{1,6})\b|#(\d{1,6})\b/i
const MERGE = /\bgh\s+pr\s+merge\s+(?:-\S+\s+)*#?(\d+)\b/

/**
 * The first issue or pull request `text` names. A GitHub URL carries its own repo;
 * a bare `#123` or `PR 123` is in the `<owner>/<repo>` the text mentions (owner: `fallback`'s owner), else `fallback`.
 */
export function refIn(text: string, fallback: string): CrewRef | undefined {
  const url = URL_REF.exec(text)
  const mention = TEXT_REF.exec(text)
  if (url && (!mention || url.index <= mention.index)) {
    return { repo: url[1]!.replace(/\.git$/, ''), kind: /^pull$/i.test(url[2]!) ? 'pr' : 'issue', number: Number(url[3]) }
  }
  if (!mention) return undefined
  const owner = fallback.split('/')[0] ?? ''
  const named = owner ? repoOf(owner).exec(text) : null
  // A sentence's full stop is not part of the repo name.
  const repo = named ? `${owner}/${named[1]!.replace(/\.git$/, '').replace(/\.+$/, '')}` : fallback
  const isPr = mention[1] !== undefined && /^p/i.test(mention[1])
  return { repo, kind: isPr ? 'pr' : 'issue', number: Number(mention[2] ?? mention[3]) }
}

/** Matches `<owner>/<repo>` for the configured owner only, so prose such as "and/or" is never read as a repo. */
function repoOf(owner: string): RegExp {
  return new RegExp(`\\b${owner.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\/([\\w.-]+)`, 'i')
}

/** The PR number of a `gh pr merge <n>` command, if it is one. */
export function mergedPr(command: string): number | undefined {
  const match = MERGE.exec(command)
  return match ? Number(match[1]) : undefined
}

export function githubUrl(ref: CrewRef): string {
  return `https://github.com/${ref.repo}/${ref.kind === 'pr' ? 'pull' : 'issues'}/${ref.number}`
}

/** The same item in the local Observatory dashboard. */
export function observatoryUrl(ref: CrewRef): string {
  return ref.kind === 'pr'
    ? `http://localhost:4200/p/${ref.repo}?pr=${ref.number}`
    : `http://localhost:4200/p/${ref.repo}?issue=${ref.number}#issues`
}

export function refLabel(ref: CrewRef): string {
  return `${ref.kind === 'pr' ? 'PR' : 'Issue'} #${ref.number}`
}
