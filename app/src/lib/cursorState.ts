/**
 * Shared mutable state for canvas → React communication.
 * Updated at 60fps in the Three.js render loop — plain object to avoid re-renders.
 */
export const cursorState = {
  inBiome:       false,
  biomeId:       '',
  hoveredTreeId: null as string | null,
}
