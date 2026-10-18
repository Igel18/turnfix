import { describe, expect, it } from 'vitest'
import type { ConfigSection } from '@/pages/Configuration/Configuration.types'
import { buildConfigurationPayload } from '@/pages/Configuration/configurationPayload'

const section = (id: string, settings: ConfigSection['settings']): ConfigSection => ({
  id,
  name: id,
  description: id,
  icon: () => null,
  settings,
})

describe('buildConfigurationPayload', () => {
  it('maps participant-label settings into printing and preserves the separate score capture section', () => {
    const sections = [
      section('printing', [{ key: 'default_page_size', label: 'Page size', type: 'text', value: 'A4' }]),
      section('participant-labels', [{ key: 'label_rows', label: 'Rows', type: 'number', value: 16 }]),
      section('scoreCapture', [{ key: 'useJuryResults', label: 'Jury results', type: 'boolean', value: true }]),
      section('database', [{ key: 'db_name', label: 'Database', type: 'text', value: 'turnfix' }]),
    ]

    expect(buildConfigurationPayload(sections)).toEqual({
      printing: { default_page_size: 'A4', label_rows: 16 },
      scoreCapture: { useJuryResults: true },
      database: { db_name: 'turnfix' },
    })
  })
})
