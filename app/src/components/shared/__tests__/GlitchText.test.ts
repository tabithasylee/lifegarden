// app/src/components/shared/__tests__/GlitchText.test.ts
import { describe, it, expect } from 'vitest'
import { resolveChar, NOISE_CHARS } from '../GlitchText'

describe('resolveChar', () => {
  it('returns a noise char when elapsed < resolveAt', () => {
    for (let i = 0; i < 20; i++) {
      const result = resolveChar('A', 500, 100)
      expect(NOISE_CHARS).toContain(result)
    }
  })

  it('returns the correct char when elapsed >= resolveAt', () => {
    expect(resolveChar('A', 100, 500)).toBe('A')
    expect(resolveChar('Z', 0, 0)).toBe('Z')
  })

  it('returns space unchanged at any time', () => {
    expect(resolveChar(' ', 999, 1)).toBe(' ')
  })
})
