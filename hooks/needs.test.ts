import { expect, test } from 'claude-code/testing'

import { countFrom } from './needs'

const ran = (exitCode: number, stdout: string, stderr = '') => ({ exitCode, stdout, stderr, isStdoutTruncated: false, isStderrTruncated: false })
const BEFORE = { count: 2, checkedAt: 1 }

test('a listing counts its items', () => {
  expect(countFrom(ran(0, '[{"number":1},{"number":2},{"number":3}]'), BEFORE, 9)).toEqual({ count: 3, checkedAt: 9 })
})

test('a failed run keeps the last count and says why', () => {
  expect(countFrom(ran(1, '', 'HTTP 401: Bad credentials\nmore'), BEFORE, 9)).toEqual({ count: 2, checkedAt: 9, error: 'HTTP 401: Bad credentials' })
  expect(countFrom(ran(4, ''), BEFORE, 9).error).toBe('gh exited 4')
  expect(countFrom(ran(0, 'not json'), BEFORE, 9).count).toBe(2)
})
