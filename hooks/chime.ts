import type { CoreEngineInterface } from 'claude-code'

type ChimeDollar = Pick<CoreEngineInterface, 'audio'>

/** Plays the "you are needed" chime when the setting allows. A failed play is only a missed sound. */
export function chime($: ChimeDollar, enabled: boolean) {
  if (enabled) void $.audio.play({ asset: 'assets/chime.wav' }, { gain: 0.6 }).catch(() => undefined)
}
