import { describe, it, expect } from 'vitest'
import { useFormat } from '~/composables/useFormat'

const { score, year, compact, episodes } = useFormat()

describe('useFormat', () => {
  it('formats scores to two decimals, em dash when missing', () => {
    expect(score(8.736)).toBe('8.74')
    expect(score(null)).toBe('—')
    expect(score(undefined)).toBe('—')
  })

  it('prefers the explicit year, falls back to aired, then to em dash', () => {
    expect(year({ year: 2011, aired: null } as never)).toBe('2011')
    expect(
      year({ year: null, aired: { prop: { from: { year: 2009 } } } } as never),
    ).toBe('2009')
    expect(
      year({ year: null, aired: { prop: { from: { year: null } } } } as never),
    ).toBe('—')
  })

  it('compacts large counts and handles missing values', () => {
    expect(compact(1_200_000)).toBe('1.2M')
    expect(compact(950)).toBe('950')
    expect(compact(null)).toBe('—')
  })

  it('pluralises episode counts', () => {
    expect(episodes(24)).toBe('24 eps')
    expect(episodes(1)).toBe('1 ep')
    expect(episodes(null)).toBe('? eps')
  })
})
