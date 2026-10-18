import type React from 'react'

export interface ConfigSection {
  id: string
  name: string
  icon: React.ComponentType<any>
  description: string
  settings: ConfigSetting[]
}

export interface ConfigSetting {
  key: string
  label: string
  type: 'text' | 'password' | 'number' | 'boolean' | 'select' | 'textarea'
  value: any
  description?: string
  options?: { value: string; label: string }[]
  required?: boolean
  sensitive?: boolean
}