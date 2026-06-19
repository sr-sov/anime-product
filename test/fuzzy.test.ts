import { describe, it, expect } from 'vitest'
import {
  fuzzyMatch,
  fuzzyTest,
  fuzzyRank,
  highlightSegments,
} from '~/composables/useFuzzy'

describe('fuzzyMatch', () => {
  it('returns score 0 and no indices for an empty query (keeps natural order)', () => {
    const r = fuzzyMatch('', 'Attack on Titan')
    expect(r.score).toBe(0)
    expect(r.indices).toEqual([])
  })

  it('matches a contiguous prefix and reports the indices', () => {
    const r = fuzzyMatch('att', 'Attack on Titan')
    expect(r.score).toBeGreaterThan(0)
    expect(r.indices).toEqual([0, 1, 2])
  })

  it('matches a subsequence across word boundaries', () => {
    const r = fuzzyMatch('aot', 'Attack on Titan')
    // A=0, then the 'o' of "on" (boundary), then 'T' of "Titan" (boundary).
    expect(r.indices).toEqual([0, 7, 10])
    expect(r.score).toBeGreaterThan(0)
  })

  it('fails when a query char is missing or out of order', () => {
    expect(fuzzyMatch('xyz', 'Attack on Titan').score).toBe(-Infinity)
    expect(fuzzyMatch('nat', 'Attack on Titan').score).toBe(-Infinity)
  })

  it('fails fast when the query is longer than the target', () => {
    expect(fuzzyMatch('attacking', 'Attack').score).toBe(-Infinity)
  })

  it('is case-insensitive', () => {
    expect(fuzzyTest('NARUTO', 'Naruto')).toBe(true)
    expect(fuzzyTest('naruto', 'NARUTO')).toBe(true)
  })

  it('ranks a contiguous match above a scattered one', () => {
    const contiguous = fuzzyMatch('death', 'Death Note').score
    const scattered = fuzzyMatch('death', 'Dragon Eats Apples Through Hills').score
    expect(contiguous).toBeGreaterThan(scattered)
  })

  it('ranks a word-start match above a mid-word match', () => {
    const start = fuzzyMatch('cow', 'Cowboy Bebop').score
    const mid = fuzzyMatch('cow', 'Scowling Faces').score
    expect(start).toBeGreaterThan(mid)
  })

  it('prefers shorter targets when otherwise equal', () => {
    const short = fuzzyMatch('one', 'One').score
    const long = fuzzyMatch('one', 'One Piece: The Very Long Saga Continues').score
    expect(short).toBeGreaterThan(long)
  })
})

describe('fuzzyRank', () => {
  const titles = [
    'Attack on Titan',
    'Death Note',
    'Naruto',
    'One Piece',
    'Fullmetal Alchemist',
  ]

  it('keeps only matches and orders them by score', () => {
    const ranked = fuzzyRank('na', titles, (t) => t)
    const names = ranked.map((r) => r.item)
    expect(names).toContain('Naruto')
    expect(names).not.toContain('Death Note')
    // "Naruto" (starts with Na) should outrank a scattered "na".
    expect(names[0]).toBe('Naruto')
  })

  it('is stable for equal scores (preserves input order)', () => {
    // Empty query: every item matches with score 0, original order preserved.
    const ranked = fuzzyRank('', titles, (t) => t)
    expect(ranked.map((r) => r.item)).toEqual(titles)
  })

  it('returns an empty array when nothing matches', () => {
    expect(fuzzyRank('zzz', titles, (t) => t)).toEqual([])
  })

  it('exposes highlight indices for the matched item', () => {
    const ranked = fuzzyRank('dn', ['Death Note'], (t) => t)
    expect(ranked[0]!.indices).toEqual([0, 6]) // D...N
  })
})

describe('highlightSegments', () => {
  it('returns a single plain segment when there are no indices', () => {
    expect(highlightSegments('Naruto', [])).toEqual([{ text: 'Naruto', match: false }])
  })

  it('splits matched and unmatched runs in order', () => {
    // Highlight indices 0,1,2 of "Attack" -> "Att" matched, "ack" plain.
    const segs = highlightSegments('Attack', [0, 1, 2])
    expect(segs).toEqual([
      { text: 'Att', match: true },
      { text: 'ack', match: false },
    ])
  })

  it('handles a leading-plain then matched run', () => {
    const segs = highlightSegments('xAt', [1, 2])
    expect(segs).toEqual([
      { text: 'x', match: false },
      { text: 'At', match: true },
    ])
  })

  it('reconstructs the original string exactly', () => {
    const target = 'Cowboy Bebop'
    const indices = [0, 1, 2]
    const joined = highlightSegments(target, indices)
      .map((s) => s.text)
      .join('')
    expect(joined).toBe(target)
  })
})
