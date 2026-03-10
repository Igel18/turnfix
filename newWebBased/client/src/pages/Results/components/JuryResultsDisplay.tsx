/**
 * JuryResultsDisplay Component
 * Displays individual jury score components in compact 2-line format
 * 
 * REFACTORED: Now uses centralized FormulaDisplay component
 * IMPORTANT: Re-calculates finalScore from juryResults instead of trusting stored value
 */

import { FormulaDisplay } from '@/components/formula/FormulaDisplay'
import { buildFieldSymbolsMap, calculateFormula, detectFormulaType, type FormulaField } from '@/utils/formulaUtils'
import type { JuryResult } from '../Results.types'

interface JuryResultsDisplayProps {
  juryResults: JuryResult[]
  finalScore: number
  formula?: string
}

export const JuryResultsDisplay = ({ 
  juryResults, 
  finalScore,
  formula
}: JuryResultsDisplayProps) => {

  // DEBUG: Always log what we receive
  console.log('🎯 [JuryResultsDisplay] Received props:', {
    juryResultsCount: juryResults?.length || 0,
    finalScore,
    formula,
    juryResults
  })

  if (!juryResults || juryResults.length === 0) {
    // Simple display without formula
    return (
      <div className="flex flex-col items-center space-y-1 py-2">
        <div className="text-2xl font-bold text-gray-900">
          {finalScore.toFixed(2)}
        </div>
        <div className="text-xs text-gray-500">Pkt.</div>
      </div>
    )
  }

  // Build field symbols map using centralized utility
  const formulaType = formula ? detectFormulaType(formula) : 'none'
  let fieldsMap = buildFieldSymbolsMap(juryResults, formula)
  let fields: FormulaField[] = Object.values(fieldsMap)

  // Variable-type formulas (e.g. "1*x") correspond to builtInFormula scoring mode,
  // where the score is a single value — NOT broken down into individual fields.
  // If old jury results exist from a previous linked formula, they are stale
  // and must NOT be displayed as individual fields.
  // This matches Score Capture and Jury Portal behavior, which don't show
  // field-level data for builtInFormula mode (they use resolveScoringInputMode).
  if (formulaType === 'variable') {
    // Clear fields: variable-type formulas have no linked field breakdown
    fields = []
  }

  console.log('📊 [JuryResultsDisplay] Fields mapped:', { fieldsMap, fields })

  // IMPORTANT: Re-calculate finalScore from jury results instead of using stored value
  // This ensures correct calculation even if DB has wrong value
  let actualFinalScore = finalScore // Fallback to prop value

  console.log('🔍 [JuryResultsDisplay] Checking if should recalculate:', { 
    hasFormula: !!formula, 
    formulaType,
    fieldsLength: fields.length,
    willRecalculate: !!(formula && formulaType === 'letter' && fields.length > 0)
  })

  if (formula && formulaType === 'letter' && fields.length > 0) {
    // Build values map for calculation
    const valuesMap: Record<string, number> = {}
    fields.forEach(field => {
      if (field.value !== null) {
        valuesMap[field.symbol] = field.value
      }
    })

    console.log('🧮 [JuryResultsDisplay] Calculating with:', { formula, valuesMap })

    // Calculate fresh score using centralized formula utility
    const calculatedScore = calculateFormula(formula, valuesMap)
    
    console.log('✅ [JuryResultsDisplay] Calculation result:', { calculatedScore, originalScore: finalScore })
    
    if (calculatedScore !== null) {
      actualFinalScore = calculatedScore
      
      if (Math.abs(calculatedScore - finalScore) > 0.01) {
        console.warn('⚠️ [JuryResultsDisplay] SCORE MISMATCH!', {
          calculated: calculatedScore,
          stored: finalScore,
          difference: calculatedScore - finalScore
        })
      }
    }
  } else {
    console.log('❌ [JuryResultsDisplay] Cannot recalculate - missing formula or fields')
  }

  console.log('🎬 [JuryResultsDisplay] Final score to display:', actualFinalScore)

  return (
    <FormulaDisplay
      formula={undefined}
      fields={fields}
      finalScore={actualFinalScore}
      mode="compact"
    />
  )
}
