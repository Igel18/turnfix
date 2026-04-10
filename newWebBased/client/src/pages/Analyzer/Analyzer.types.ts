/**
 * Analyzer – TypeScript types shared across the page and its components.
 */

export type AnalyzerSeverity = 'error' | 'warning' | 'info'
export type AnalyzerStatus = 'ok' | 'error' | 'warning' | 'info'
export type AnalyzerCategory = 'setup' | 'schedule' | 'capture' | 'squads' | 'results'

export interface AnalyzerDetail {
  id: number
  label: string
}

export interface AnalyzerCheck {
  id: string
  category: AnalyzerCategory
  severity: AnalyzerSeverity
  status: AnalyzerStatus
  affectedCount: number
  details: AnalyzerDetail[]
  /** Frontend route to navigate to when clicking the action button */
  actionRoute: string
  /** Optional identifier for a quick-action callable from the analyzer itself */
  quickActionId?: string
}

export interface AnalyzerSummary {
  errors: number
  warnings: number
  infos: number
  ok: number
  total: number
}

export interface AnalyzerResult {
  checks: AnalyzerCheck[]
  summary: AnalyzerSummary
}
