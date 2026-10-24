import { describe, it, expect } from 'vitest'
import {
  needsWrappedLayout,
  buildWrappedTable,
  WRAPPED_COLUMNS
} from '@/pages/Results/utils/resultsPdfLayout'

describe('needsWrappedLayout', () => {
  const landscapeA4Width = 297

  it('keeps the single-row layout while all columns fit on the page', () => {
    expect(needsWrappedLayout(0, landscapeA4Width)).toBe(false)
    expect(needsWrappedLayout(5, landscapeA4Width)).toBe(false)
  })

  it('wraps the disciplines below the person when they do not fit', () => {
    expect(needsWrappedLayout(6, landscapeA4Width)).toBe(true)
    expect(needsWrappedLayout(10, landscapeA4Width)).toBe(true)
  })
})

describe('buildWrappedTable', () => {
  const headers = ['Platz', 'Start-Nr.', 'Name', 'Verein', 'Alter', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'Gesamt']
  const row = (rank: number) => [rank, 7, 'Anna', 'TV', 12, 's1', 's2', 's3', 's4', 's5', 's6', '50.00']

  it('puts person data (incl. total) in the first row and the discipline scores in the row below', () => {
    const { head, body, rowKinds } = buildWrappedTable(headers, [row(1)])

    expect(head[0]).toEqual(['Platz', 'Start-Nr.', 'Name', 'Verein', 'Alter', 'Gesamt'])
    expect(head[1]).toEqual(['D1', 'D2', 'D3', 'D4', 'D5', 'D6'])
    expect(body).toEqual([
      [1, 7, 'Anna', 'TV', 12, '50.00'],
      ['s1', 's2', 's3', 's4', 's5', 's6']
    ])
    expect(rowKinds).toEqual(['person', 'detail'])
  })

  it('splits more disciplines than columns into further detail rows, padded to full width', () => {
    const wideHeaders = [...headers.slice(0, 5), 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'Gesamt']
    const wideRow = [1, 7, 'Anna', 'TV', 12, 's1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', '60.00']
    const { head, body, rowKinds } = buildWrappedTable(wideHeaders, [wideRow])

    expect(head).toHaveLength(3)
    expect(head[2]).toEqual(['D7', 'D8', '', '', '', ''])
    expect(body[2]).toEqual(['s7', 's8', '', '', '', ''])
    expect(rowKinds).toEqual(['person', 'detail', 'detail'])
    body.forEach(r => expect(r).toHaveLength(WRAPPED_COLUMNS))
  })

  it('keeps one block per participant in order', () => {
    const { body, rowKinds } = buildWrappedTable(headers, [row(1), row(2)])
    expect(body.map(r => r[0])).toEqual([1, 's1', 2, 's1'])
    expect(rowKinds).toEqual(['person', 'detail', 'person', 'detail'])
  })
})
