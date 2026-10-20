import type { ConfigSection } from './Configuration.types'

export type ConfigurationPayload = Record<string, any>

export const buildConfigurationPayload = (sections: ConfigSection[]): ConfigurationPayload =>
  sections.reduce<ConfigurationPayload>((payload, section) => {
    const sectionSettings = section.settings.reduce<ConfigurationPayload>((settings, setting) => {
      settings[setting.key] = setting.value
      return settings
    }, {})

    if (section.id === 'participant-labels') {
      payload.printing = { ...payload.printing, ...sectionSettings }
    } else {
      payload[section.id] = sectionSettings
    }

    return payload
  }, {})