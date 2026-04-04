/**
 * TDD Unit Tests — statusColorUtils
 * Points 78-80 / Unified Status UI Refactoring
 *
 * Tests the canonical getStatusColor utility that all three status pages share.
 */

import { describe, it, expect } from 'vitest'
import { getStatusColor, STATUS_TABLE_STYLES } from '../statusColorUtils'

describe('getStatusColor', () => {

  describe('null / empty input', () => {
    it('returns gray fallback for null', () => {
      const result = getStatusColor(null)
      expect(result.className).toContain('bg-gray-100')
      expect(result.style).toEqual({})
    })

    it('returns gray fallback for empty string', () => {
      const result = getStatusColor('')
      expect(result.className).toContain('bg-gray-100')
      expect(result.style).toEqual({})
    })
  })

  describe('curly-brace format {r,g,b}', () => {
    it('parses {255,0,0} as red', () => {
      const result = getStatusColor('{255,0,0}')
      expect(result.className).toBe('border')
      expect(result.style.borderColor).toBe('rgb(255, 0, 0)')
    })

    it('parses {4,172,39} as green (progress complete color)', () => {
      const result = getStatusColor('{4,172,39}')
      expect(result.className).toBe('border')
      expect(result.style.borderColor).toBe('rgb(4, 172, 39)')
    })

    it('parses {249,105,5} as orange (in-progress color)', () => {
      const result = getStatusColor('{249,105,5}')
      expect(result.className).toBe('border')
      expect(result.style.borderColor).toBe('rgb(249, 105, 5)')
    })

    it('parses {200,200,200} as light gray (not started)', () => {
      const result = getStatusColor('{200,200,200}')
      expect(result.className).toBe('border')
      expect(result.style.backgroundColor).toBeTruthy()
    })
  })

  describe('rgb() format', () => {
    it('parses rgb(0,128,255)', () => {
      const result = getStatusColor('rgb(0,128,255)')
      expect(result.className).toBe('border')
      expect(result.style.borderColor).toBe('rgb(0, 128, 255)')
    })

    it('parses rgb(0, 128, 255) with spaces', () => {
      const result = getStatusColor('rgb(0, 128, 255)')
      expect(result.className).toBe('border')
      expect(result.style.borderColor).toBe('rgb(0, 128, 255)')
    })
  })

  describe('hex format', () => {
    it('parses #ff0000', () => {
      const result = getStatusColor('#ff0000')
      expect(result.className).toBe('border')
      expect(result.style.borderColor).toBe('rgb(255, 0, 0)')
    })

    it('parses #00cc44 (green)', () => {
      const result = getStatusColor('#00cc44')
      expect(result.className).toBe('border')
      expect(result.style.borderColor).toBe('rgb(0, 204, 68)')
    })
  })

  describe('comma-separated fallback r,g,b', () => {
    it('parses 255,255,0', () => {
      const result = getStatusColor('255,255,0')
      expect(result.className).toBe('border')
      expect(result.style.borderColor).toBe('rgb(255, 255, 0)')
    })
  })

  describe('brightness logic', () => {
    it('dark color gives a light background and dark text', () => {
      // Pure black: brightness = 0
      const result = getStatusColor('#000000')
      const bg = result.style.backgroundColor as string
      // The lightest possible expansion → definitely lighter than black
      expect(bg).toMatch(/^rgb\(/)
      // Parse background channels
      const [br, bg_, bb] = bg.replace('rgb(', '').replace(')', '').split(',').map(Number)
      expect(br + bg_ + bb).toBeGreaterThan(300) // much lighter than 0
    })

    it('light color keeps original background', () => {
      // White: brightness = 255 — background should be close to original
      const result = getStatusColor('#ffffff')
      const bg = result.style.backgroundColor as string
      const [br] = bg.replace('rgb(', '').replace(')', '').split(',').map(Number)
      expect(br).toBe(255)
    })
  })

  describe('invalid input', () => {
    it('returns gray fallback for garbage string', () => {
      const result = getStatusColor('not a color at all!!!')
      expect(result.className).toContain('bg-gray-100')
    })

    it('returns gray fallback for out-of-range values {999,0,0}', () => {
      // 999 is out of 0-255 range
      const result = getStatusColor('{999,0,0}')
      expect(result.className).toContain('bg-gray-100')
    })
  })

})

describe('STATUS_TABLE_STYLES', () => {

  it('defines consistent cell padding', () => {
    expect(STATUS_TABLE_STYLES.cell).toContain('px-4')
    expect(STATUS_TABLE_STYLES.cell).toContain('py-3')
  })

  it('defines consistent header style', () => {
    expect(STATUS_TABLE_STYLES.header).toContain('bg-gray-50')
    expect(STATUS_TABLE_STYLES.header).toContain('text-xs')
    expect(STATUS_TABLE_STYLES.header).toContain('uppercase')
  })

  it('defines row hover', () => {
    expect(STATUS_TABLE_STYLES.row).toContain('hover:bg-gray-50')
  })

  it('defines status badge base style', () => {
    expect(STATUS_TABLE_STYLES.badge).toContain('px-2.5')
    expect(STATUS_TABLE_STYLES.badge).toContain('rounded-full')
    expect(STATUS_TABLE_STYLES.badge).toContain('text-xs')
    expect(STATUS_TABLE_STYLES.badge).toContain('font-medium')
  })

})
