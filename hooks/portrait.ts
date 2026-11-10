import type { CrewStatus } from '../types'
import type { Crewmate } from './roster'

/** The status ring's colour, which doubles as the status light. */
const RING: Record<CrewStatus, string> = { working: '#4fd1ff', idle: '#7a83b3', needs: '#ffb547', done: '#5ee38f' }

/** One crewmate's animated 120×120 portrait as SVG source: head, feature and visor by shape, ring and motion by status. */
export function portrait(mate: Crewmate, status: CrewStatus): string {
  const wide = mate.badge.length > 1
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">${ring(status)}<g>${motion(status)}${head(mate)}${feature(mate)}${visor(mate, status)}</g><rect x="44" y="98" width="${wide ? 32 : 22}" height="16" rx="4" fill="#0b0e1a" stroke="${mate.color}" stroke-width="1.5"/><text x="${wide ? 60 : 55}" y="110" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="11" fill="${mate.color}">${mate.badge}</text>${corner(status)}</svg>`
}

function feature(mate: Crewmate): string {
  const c = mate.color
  switch (mate.shape) {
    case 'compass': return `<path d="M60 14 L64 26 L60 23 L56 26 Z" fill="${c}"/>`
    case 'harp': return `<path d="M38 30 Q60 6 82 30" stroke="${c}" stroke-width="3" fill="none"/>`
    case 'globe': return `<ellipse cx="60" cy="58" rx="30" ry="9" stroke="${c}" stroke-opacity=".55" stroke-width="2" fill="none"/>`
    case 'belt': return `<g fill="${c}"><circle cx="48" cy="86" r="2.5"/><circle cx="60" cy="88" r="2.5"/><circle cx="72" cy="86" r="2.5"/></g>`
    case 'prism': return `<path d="M60 18 L70 32 L50 32 Z" fill="none" stroke="${c}" stroke-width="2.5"/>`
    case 'crown': return `<path d="M44 30 L48 18 L54 26 L60 14 L66 26 L72 18 L76 30 Z" fill="${c}"/>`
    case 'wing': return `<path d="M30 58 Q18 44 24 30 Q32 46 36 50 M90 58 Q102 44 96 30 Q88 46 84 50" stroke="${c}" stroke-width="3" fill="none" stroke-linecap="round"/>`
    case 'star': return `<path d="M60 12 L63 22 L73 22 L65 28 L68 38 L60 32 L52 38 L55 28 L47 22 L57 22 Z" fill="${c}"/>`
    default: return ''
  }
}

function head(mate: Crewmate): string {
  const c = mate.color
  if (mate.shape === 'square') return `<rect x="32" y="32" width="56" height="54" rx="12" fill="#1b2142" stroke="${c}" stroke-width="3"/>`
  if (mate.shape === 'prism') return `<path d="M60 30 L90 84 L30 84 Z" fill="#1b2142" stroke="${c}" stroke-width="3" stroke-linejoin="round"/>`
  if (mate.shape === 'diamond') return `<path d="M60 28 L90 60 L60 92 L30 60 Z" fill="#1b2142" stroke="${c}" stroke-width="3" stroke-linejoin="round"/>`
  return `<circle cx="60" cy="60" r="28" fill="#1b2142" stroke="${c}" stroke-width="3"/>`
}

/** The eyes: a scan light sweeps while working; idle and waiting blink. */
function visor(mate: Crewmate, status: CrewStatus): string {
  const c = mate.color
  const y = mate.shape === 'prism' ? 66 : 58
  const scan = status === 'working'
    ? `<rect x="44" y="${y - 4}" width="8" height="8" rx="2" fill="#fff" opacity=".7"><animate attributeName="x" values="44;70;44" dur="1.4s" repeatCount="indefinite"/></rect>`
    : ''
  if (mate.shape === 'eyes') {
    const eyes = [44, 54, 64, 74].map((x, i) =>
      `<circle cx="${x + 2}" cy="${y}" r="3.2" fill="${c}"><animate attributeName="r" values="3.2;3.2;.5;3.2" keyTimes="0;.9;.95;1" dur="${3 + i * 0.4}s" repeatCount="indefinite"/></circle>`).join('')
    return eyes + scan
  }
  const blink = status === 'idle' || status === 'needs'
    ? `<animate attributeName="height" values="9;9;1;9" keyTimes="0;.92;.96;1" dur="4s" repeatCount="indefinite"/><animate attributeName="y" values="${y - 4.5};${y - 4.5};${y - 0.5};${y - 4.5}" keyTimes="0;.92;.96;1" dur="4s" repeatCount="indefinite"/>`
    : ''
  return `<rect x="42" y="${y - 4.5}" width="36" height="9" rx="4.5" fill="${c}" opacity=".9">${blink}</rect>${scan}`
}

function ring(status: CrewStatus): string {
  const col = RING[status]
  if (status === 'working') {
    return `<circle cx="60" cy="60" r="46" fill="none" stroke="${col}" stroke-opacity=".2" stroke-width="3"/><circle cx="60" cy="60" r="46" fill="none" stroke="${col}" stroke-width="3" stroke-dasharray="40 250"><animateTransform attributeName="transform" type="rotate" from="0 60 60" to="360 60 60" dur="1.6s" repeatCount="indefinite"/></circle>`
  }
  if (status === 'needs') {
    return `<circle cx="60" cy="60" r="46" fill="none" stroke="${col}" stroke-width="3.5"><animate attributeName="stroke-opacity" values="1;.15;1" dur="1s" repeatCount="indefinite"/></circle>`
  }
  return `<circle cx="60" cy="60" r="46" fill="none" stroke="${col}" stroke-opacity="${status === 'done' ? 1 : 0.45}" stroke-width="3"/>`
}

/** Idle bobs, Done nods, Needs you shakes. */
function motion(status: CrewStatus): string {
  if (status === 'idle') return `<animateTransform attributeName="transform" type="translate" values="0 0;0 -3;0 0" dur="3.2s" repeatCount="indefinite"/>`
  if (status === 'done') return `<animateTransform attributeName="transform" type="translate" values="0 0;0 4;0 0;0 0" keyTimes="0;.1;.2;1" dur="2.6s" repeatCount="indefinite"/>`
  if (status === 'needs') return `<animateTransform attributeName="transform" type="rotate" values="0 60 60;-4 60 60;4 60 60;0 60 60;0 60 60" keyTimes="0;.08;.16;.24;1" dur="2s" repeatCount="indefinite"/>`
  return ''
}

/** A tick when done, an exclamation when it needs you. */
function corner(status: CrewStatus): string {
  if (status === 'done') return `<circle cx="92" cy="28" r="10" fill="#5ee38f"/><path d="M87 28 l4 4 l7 -8" stroke="#0b0e1a" stroke-width="3" fill="none" stroke-linecap="round"/>`
  if (status === 'needs') return `<circle cx="92" cy="28" r="10" fill="#ffb547"/><rect x="90.5" y="21" width="3" height="9" rx="1.5" fill="#0b0e1a"/><circle cx="92" cy="34" r="1.8" fill="#0b0e1a"/>`
  return ''
}
