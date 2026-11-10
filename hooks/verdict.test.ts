import { expect, test } from 'claude-code/testing'

import { verdictIn } from './verdict'

test('an approval reads as approved', () => {
  expect(verdictIn('Verdict: APPROVE')).toBe('approved')
  expect(verdictIn('QA approval posted.')).toBe('approved')
})

test('requested changes win, even beside the word approve', () => {
  expect(verdictIn('Not approved: request changes on the toast')).toBe('changes')
  expect(verdictIn('Verdict: REQUEST_CHANGES')).toBe('changes')
  expect(verdictIn('Changes requested.')).toBe('changes')
})

test('a report with no verdict, or none at all, has none', () => {
  expect(verdictIn('Done.')).toBeUndefined()
  expect(verdictIn(undefined)).toBeUndefined()
  expect(verdictIn('')).toBeUndefined()
})
