/** The fixed crew: who can appear on the board, and how each one looks. */

type Shape = 'compass' | 'round' | 'square' | 'harp' | 'eyes' | 'globe' | 'belt' | 'prism' | 'crown' | 'wing' | 'diamond' | 'star'
type Team = 'overlay' | 'web' | 'shared'
export type Crewmate = { name: string; badge: string; role: string; color: string; shape: Shape; team: Team }

/** The lead is the session itself; everyone else is matched by name in an agent's description. Order is display order. */
export const CREW: readonly Crewmate[] = [
  { name: 'Polaris', badge: 'P', role: 'Overlay team lead', color: '#ffd36b', shape: 'compass', team: 'overlay' },
  { name: 'Vega', badge: 'D', role: 'Developer', color: '#4fd1ff', shape: 'round', team: 'overlay' },
  { name: 'Rigel', badge: 'D', role: 'Developer', color: '#6f8cff', shape: 'square', team: 'overlay' },
  { name: 'Lyra', badge: 'D', role: 'Developer', color: '#b48cff', shape: 'harp', team: 'overlay' },
  { name: 'Capella', badge: 'P', role: 'Web team lead', color: '#ffb3a1', shape: 'crown', team: 'web' },
  { name: 'Altair', badge: 'D', role: 'Web developer', color: '#5eead4', shape: 'wing', team: 'web' },
  { name: 'Deneb', badge: 'D', role: 'Web developer', color: '#c4e86b', shape: 'diamond', team: 'web' },
  { name: 'Sirius', badge: 'D', role: 'Web developer', color: '#e2ecff', shape: 'star', team: 'web' },
  { name: 'Argus', badge: 'Q', role: 'QA reviewer', color: '#5ee38f', shape: 'eyes', team: 'shared' },
  { name: 'Atlas', badge: 'PM', role: 'Product manager', color: '#ff9a52', shape: 'globe', team: 'shared' },
  { name: 'Orion', badge: 'R', role: 'Refinement', color: '#ff6b7d', shape: 'belt', team: 'shared' },
  { name: 'Iris', badge: 'UX', role: 'UX design', color: '#ff8ad8', shape: 'prism', team: 'shared' },
]

/** The crewmate called `name`, falling back to the first lead so a bad setting never leaves the board without one. */
export function crewmateNamed(name: unknown): Crewmate {
  return CREW.find(mate => mate.name === name) ?? CREW[0]!
}

/** The first crewmate other than the lead whose name appears in `text` as a word. */
export function crewmateIn(text: string, lead: Crewmate): Crewmate | undefined {
  return CREW.find(mate => mate.name !== lead.name && new RegExp(`\\b${mate.name}\\b`, 'i').test(text))
}

/** `text` with the crewmate's name taken out and the rest capitalised: "Vega implements X" reads "Implements X". */
export function withoutName(text: string, name: string): string {
  const rest = text.replace(new RegExp(`\\b${name}\\b\\s*`, 'i'), '').trim()
  return rest.charAt(0).toUpperCase() + rest.slice(1)
}
