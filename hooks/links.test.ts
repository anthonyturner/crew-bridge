import { expect, test } from 'claude-code/testing'

import { githubUrl, mergedPr, observatoryUrl, refIn, refLabel } from './links'

const FALLBACK = 'anthonyturner/rivals_pulse'

test('a bare number is an issue in the fallback repo', () => {
  expect(refIn('Fix #42 today', FALLBACK)).toEqual({ repo: FALLBACK, kind: 'issue', number: 42 })
  expect(refIn('Implement issue 1620', FALLBACK)).toEqual({ repo: FALLBACK, kind: 'issue', number: 1620 })
})

test('PR and pull request mentions are pull requests', () => {
  expect(refIn('Review PR #1611.', FALLBACK)?.kind).toBe('pr')
  expect(refIn('Review pull request 9', FALLBACK)).toEqual({ repo: FALLBACK, kind: 'pr', number: 9 })
})

test('a named anthonyturner repo wins over the fallback, without a trailing full stop', () => {
  expect(refIn('Implement issue #1620 in anthonyturner/rivals-pulse-web.', FALLBACK)?.repo).toBe('anthonyturner/rivals-pulse-web')
})

test('a URL carries its own repo, unless a mention comes first', () => {
  expect(refIn('See https://github.com/acme/tool.git/pull/5 for #3', FALLBACK)).toEqual({ repo: 'acme/tool', kind: 'pr', number: 5 })
  expect(refIn('Issue #3, see https://github.com/acme/tool/pull/5', FALLBACK)).toEqual({ repo: FALLBACK, kind: 'issue', number: 3 })
})

test('text naming nothing has no ref', () => {
  expect(refIn('Tidy the README', FALLBACK)).toBeUndefined()
})

test('links and labels', () => {
  const pr = { repo: 'o/r', kind: 'pr', number: 5 } as const
  const issue = { repo: 'o/r', kind: 'issue', number: 6 } as const
  expect(githubUrl(pr)).toBe('https://github.com/o/r/pull/5')
  expect(githubUrl(issue)).toBe('https://github.com/o/r/issues/6')
  expect(observatoryUrl(pr)).toBe('http://localhost:4200/p/o/r?pr=5')
  expect(observatoryUrl(issue)).toBe('http://localhost:4200/p/o/r?issue=6#issues')
  expect(refLabel(pr)).toBe('PR #5')
  expect(refLabel(issue)).toBe('Issue #6')
})

test('gh pr merge commands name their PR, flags or not', () => {
  expect(mergedPr('gh pr merge 1611 --squash')).toBe(1611)
  expect(mergedPr('gh pr merge --squash --delete-branch #77')).toBe(77)
  expect(mergedPr('gh pr view 12')).toBeUndefined()
  expect(mergedPr('gh pr merge')).toBeUndefined()
})

test('a repo of the configured owner is recognised for any owner, and prose is not', () => {
  expect(refIn('Fix issue #4 in octo-org/widgets.', 'octo-org/main')?.repo).toBe('octo-org/widgets')
  expect(refIn('Fix issue #4 and/or the other one', 'octo-org/main')?.repo).toBe('octo-org/main')
})
