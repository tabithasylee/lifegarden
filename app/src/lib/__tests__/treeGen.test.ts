// app/src/lib/__tests__/treeGen.test.ts
import { describe, it, expect } from 'vitest'
import { buildTreeGeometry } from '../treeGen'

describe('buildTreeGeometry', () => {
  it('returns lines and tips objects', () => {
    const { lineVerts, tips } = buildTreeGeometry('test-id', 1.0)
    expect(lineVerts.length).toBeGreaterThan(0)
    expect(tips.length).toBeGreaterThan(0)
  })

  it('line verts count is divisible by 6 (pairs of x,y,z per segment)', () => {
    const { lineVerts } = buildTreeGeometry('test-id', 1.0)
    expect(lineVerts.length % 6).toBe(0)
  })

  it('same id produces same geometry (deterministic)', () => {
    const a = buildTreeGeometry('proj-abc', 1.0)
    const b = buildTreeGeometry('proj-abc', 1.0)
    expect(a.lineVerts).toEqual(b.lineVerts)
    expect(a.tips).toEqual(b.tips)
  })

  it('scale parameter affects branch length', () => {
    const small = buildTreeGeometry('x', 0.5)
    const large = buildTreeGeometry('x', 2.0)
    const maxSmall = Math.max(...small.tips.map(t => Math.abs(t.y)))
    const maxLarge = Math.max(...large.tips.map(t => Math.abs(t.y)))
    expect(maxLarge).toBeGreaterThan(maxSmall)
  })
})
