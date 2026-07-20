import { describe, it, expect } from 'vitest'
import { clampLayoutLayer, getDefaultLayoutLayer, getNextLayoutLayer, MAX_LAYOUT_LAYER } from '../../utils/layoutLayerUtils'

describe('LayoutDesigner layer helpers', () => {
  it('clamps layers to the supported range', () => {
    expect(clampLayoutLayer(-4)).toBe(0)
    expect(clampLayoutLayer(0)).toBe(0)
    expect(clampLayoutLayer(7)).toBe(7)
    expect(clampLayoutLayer(99)).toBe(MAX_LAYOUT_LAYER)
  })

  it('computes the next layer from the highest existing layer', () => {
    expect(getNextLayoutLayer([])).toBe(0)
    expect(getNextLayoutLayer([{ int_layer: 0 } as any, { int_layer: 4 } as any])).toBe(5)
  })

  it('uses the selected field layer as the default for new fields', () => {
    expect(getDefaultLayoutLayer(null)).toBe(0)
    expect(getDefaultLayoutLayer({ int_layer: 7 } as any)).toBe(7)
    expect(getDefaultLayoutLayer({ int_layer: 99 } as any)).toBe(MAX_LAYOUT_LAYER)
  })
})