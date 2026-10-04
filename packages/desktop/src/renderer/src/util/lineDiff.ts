export type DiffLine =
  | { type: 'same' | 'removed' | 'added'; text: string }
  | { type: 'skipped'; count: number }

// Above this many cells the LCS table gets too slow for a click handler, so
// the changed middle is shown as a plain remove-then-add block.
const MAX_LCS_CELLS = 4_000_000

const diffMiddle = (before: string[], after: string[]): DiffLine[] => {
  const n = before.length
  const m = after.length
  if (n * m > MAX_LCS_CELLS) {
    return [
      ...before.map((text) => ({ type: 'removed' as const, text })),
      ...after.map((text) => ({ type: 'added' as const, text }))
    ]
  }

  // lcs[i * (m + 1) + j] is the LCS length of before[i:] and after[j:].
  const lcs = new Uint32Array((n + 1) * (m + 1))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i * (m + 1) + j] =
        before[i] === after[j]
          ? lcs[(i + 1) * (m + 1) + j + 1] + 1
          : Math.max(lcs[(i + 1) * (m + 1) + j], lcs[i * (m + 1) + j + 1])
    }
  }

  const lines: DiffLine[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (before[i] === after[j]) {
      lines.push({ type: 'same', text: before[i] })
      i++
      j++
    } else if (lcs[(i + 1) * (m + 1) + j] >= lcs[i * (m + 1) + j + 1]) {
      lines.push({ type: 'removed', text: before[i++] })
    } else {
      lines.push({ type: 'added', text: after[j++] })
    }
  }
  while (i < n) lines.push({ type: 'removed', text: before[i++] })
  while (j < m) lines.push({ type: 'added', text: after[j++] })
  return lines
}

export const diffLines = (before: string, after: string): DiffLine[] => {
  const a = before.split('\n')
  const b = after.split('\n')

  // Edits are usually local, so only the differing middle goes through LCS.
  let start = 0
  while (start < a.length && start < b.length && a[start] === b[start]) start++
  let endA = a.length
  let endB = b.length
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--
    endB--
  }

  return [
    ...a.slice(0, start).map((text) => ({ type: 'same' as const, text })),
    ...diffMiddle(a.slice(start, endA), b.slice(start, endB)),
    ...a.slice(endA).map((text) => ({ type: 'same' as const, text }))
  ]
}

// Folds unchanged runs, keeping `context` lines next to each change.
export const collapseUnchanged = (lines: DiffLine[], context = 3): DiffLine[] => {
  const keep = lines.map((line) => line.type !== 'same')
  lines.forEach((line, index) => {
    if (line.type === 'same') return
    for (let k = Math.max(0, index - context); k <= Math.min(lines.length - 1, index + context); k++) {
      keep[k] = true
    }
  })

  const result: DiffLine[] = []
  let skipped = 0
  lines.forEach((line, index) => {
    if (keep[index]) {
      if (skipped) result.push({ type: 'skipped', count: skipped })
      skipped = 0
      result.push(line)
    } else {
      skipped++
    }
  })
  if (skipped) result.push({ type: 'skipped', count: skipped })
  return result
}
