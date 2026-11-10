export type CrewStatus = 'working' | 'idle' | 'needs' | 'done'
/** The issue or pull request a run works on, read from the prompt that spawned it. */
export type CrewRef = { repo: string; kind: 'issue' | 'pr'; number: number }
/** A QA review's outcome, read from the reviewer's final report. */
export type CrewVerdict = 'approved' | 'changes'
/** One running agent of a crewmate; a crewmate can run several at once (two Argus reviews). */
export type CrewRun = { agentId: string; task: string; since: number; ref?: CrewRef }
export type CrewMember = { status: CrewStatus; task: string; since: number; runs: CrewRun[]; ref?: CrewRef; verdict?: CrewVerdict }
export type CrewBoard = Record<string, CrewMember>
/** One line of the activity log; the log keeps the newest few, newest first. */
export type CrewLogEntry = { at: number; text: string }
/** Open `needs-tony` issues, as last counted; `error` says why the last count failed. */
export type CrewNeeds = { count: number; checkedAt: number; error?: string }
/** Finished runs per crewmate and merges, for the current local day and ISO week. Persisted in `$.store`. */
export type CrewScore = {
  day: string
  week: string
  today: Record<string, number>
  thisWeek: Record<string, number>
  mergesToday: number
  mergesWeek: number
}

// Each atom is declared in the module that owns it (board, activity, needs, scoreboard, pane),
// with a shape tag: change the tag when that value's fields change, so what an earlier version stored is declined.
declare module 'claude-code' {
  interface PluginState {
    'crew-bridge': {
      board: Shaped<CrewBoard>
      tick: Shaped<number>
      log: Shaped<CrewLogEntry[]>
      needs: Shaped<CrewNeeds>
      score: Shaped<CrewScore>
    }
  }
}
