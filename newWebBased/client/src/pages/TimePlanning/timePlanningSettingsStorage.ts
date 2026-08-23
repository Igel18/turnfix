import type { TimeSettings } from './TimePlanning.types'
import { DEFAULT_TIME_SETTINGS } from './TimePlanning.types'

const TIME_SETTINGS_KEY = (id: string) => `time-planning-settings-${id}`
const ROTATION_ROUND_KEY = (id: string) => `time-planning-rotation-round-${id}`

export function loadTimeSettingsFromStorage(id: string): TimeSettings {
  try {
    const raw = localStorage.getItem(TIME_SETTINGS_KEY(id))
    if (raw) {
      return { ...DEFAULT_TIME_SETTINGS, ...JSON.parse(raw) }
    }
  } catch {
    // ignore localStorage errors
  }
  return DEFAULT_TIME_SETTINGS
}

export function saveTimeSettingsToStorage(id: string, settings: TimeSettings) {
  try {
    localStorage.setItem(TIME_SETTINGS_KEY(id), JSON.stringify(settings))
  } catch {
    // ignore localStorage errors
  }
}

export function loadRotationRoundFromStorage(id: string): number {
  try {
    const raw = localStorage.getItem(ROTATION_ROUND_KEY(id))
    if (!raw) {
      return 1
    }

    const parsed = Number(raw)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
  } catch {
    return 1
  }
}

export function saveRotationRoundToStorage(id: string, round: number) {
  try {
    localStorage.setItem(ROTATION_ROUND_KEY(id), String(round))
  } catch {
    // ignore localStorage errors
  }
}
