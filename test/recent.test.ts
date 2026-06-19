import { describe, it, expect } from 'vitest'
import { addToRecentList, type RecentItem } from '~/composables/useRecent'

function item(id: number, title = `Title ${id}`): RecentItem {
  return { mal_id: id, title, image: null, score: null, type: 'TV', year: '2020' }
}

describe('addToRecentList', () => {
  it('prepends a new item (most-recent-first)', () => {
    const list = [item(1), item(2)]
    const next = addToRecentList(list, item(3))
    expect(next.map((r) => r.mal_id)).toEqual([3, 1, 2])
  })

  it('de-duplicates by mal_id, moving the repeat to the front', () => {
    const list = [item(1), item(2), item(3)]
    const next = addToRecentList(list, item(3))
    expect(next.map((r) => r.mal_id)).toEqual([3, 1, 2])
    expect(next).toHaveLength(3)
  })

  it('caps the list at the maximum length', () => {
    const list = [item(1), item(2), item(3)]
    const next = addToRecentList(list, item(99), 3)
    expect(next.map((r) => r.mal_id)).toEqual([99, 1, 2])
    expect(next).toHaveLength(3)
  })

  it('does not mutate the input list', () => {
    const list = [item(1), item(2)]
    addToRecentList(list, item(3))
    expect(list.map((r) => r.mal_id)).toEqual([1, 2])
  })

  it('updates stored fields when re-adding the same id', () => {
    const list = [item(1, 'Old title')]
    const next = addToRecentList(list, item(1, 'New title'))
    expect(next).toHaveLength(1)
    expect(next[0]!.title).toBe('New title')
  })
})
