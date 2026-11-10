import type { CrewVerdict } from '../types'

export const VERDICT: Record<CrewVerdict, { text: string; color: string }> = {
  approved: { text: 'Approved', color: '#5ee38f' },
  changes: { text: 'Changes requested', color: '#ffb547' },
}

/** A QA report's verdict. Changes are checked first, since "not approved" also says approve. */
export function verdictIn(report: string | undefined): CrewVerdict | undefined {
  if (!report) return undefined
  if (/request(?:ing|ed)?[\s_-]+changes|changes[\s_-]+requested/i.test(report)) return 'changes'
  if (/\bapprov(?:e|ed|es|al)\b/i.test(report)) return 'approved'
  return undefined
}
