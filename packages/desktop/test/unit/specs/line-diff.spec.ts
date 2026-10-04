import { describe, it, expect } from 'vitest'
import { collapseUnchanged, diffLines } from '@/util/lineDiff'

describe('diffLines', () => {
  it('reports identical text as unchanged', () => {
    expect(diffLines('a\nb', 'a\nb')).toEqual([
      { type: 'same', text: 'a' },
      { type: 'same', text: 'b' }
    ])
  })

  it('marks removed and added lines around unchanged ones', () => {
    expect(diffLines('a\nb\nc\nd', 'a\nB\nc\nd\ne')).toEqual([
      { type: 'same', text: 'a' },
      { type: 'removed', text: 'b' },
      { type: 'added', text: 'B' },
      { type: 'same', text: 'c' },
      { type: 'same', text: 'd' },
      { type: 'added', text: 'e' }
    ])
  })

  it('keeps lines common to both sides in the middle of a change', () => {
    const types = diffLines('x\nkeep\ny', 'p\nkeep\nq').map((l) => l.type)
    expect(types).toEqual(['removed', 'added', 'same', 'removed', 'added'])
  })
})

describe('collapseUnchanged', () => {
  it('folds unchanged runs beyond the context window', () => {
    const before = Array.from({ length: 20 }, (_, i) => `line ${i}`).join('\n')
    const after = before.replace('line 10', 'changed')
    const collapsed = collapseUnchanged(diffLines(before, after), 2)
    expect(collapsed).toEqual([
      { type: 'skipped', count: 8 },
      { type: 'same', text: 'line 8' },
      { type: 'same', text: 'line 9' },
      { type: 'removed', text: 'line 10' },
      { type: 'added', text: 'changed' },
      { type: 'same', text: 'line 11' },
      { type: 'same', text: 'line 12' },
      { type: 'skipped', count: 7 }
    ])
  })
})
