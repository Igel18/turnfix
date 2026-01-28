/**
 * JuryResultsDisplay Component
 * Displays individual jury score components in compact 2-line format
 * Similar to FormulaInput but read-only and optimized for results table
 */

import type { JuryResult } from '../Results.types'

interface JuryResultsDisplayProps {
  juryResults: JuryResult[]
  finalScore: number
  disciplineName: string
  formula?: string
  startValue?: number
}

export const JuryResultsDisplay = ({ 
  juryResults, 
  finalScore,
  formula,
  startValue = 10 // Default to 10 if not provided
}: JuryResultsDisplayProps) => {

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

  // Separate starting values, field values, and final score
  const startingScores = juryResults.filter(jr => jr.isStartingScore)
  const fieldScores = juryResults.filter(jr => !jr.isStartingScore && !jr.isFinalScore)
  const finalScores = juryResults.filter(jr => jr.isFinalScore)
  
  // Use the final score from jury results if available, otherwise use the passed finalScore
  const actualFinalScore = finalScores.length > 0 && finalScores[0].performance !== null
    ? finalScores[0].performance
    : finalScore
  
  // Extract formula symbols for each field
  const getFormulaSymbol = (index: number): string => {
    if (!formula) return String.fromCharCode(65 + index) // Default to A, B, C...
    
    // Try to extract letter labels from formula (e.g., "A+B-C" → ['A', 'B', 'C'])
    const letterMatches = formula.match(/[A-Z]/g)
    if (letterMatches && letterMatches[index]) {
      return letterMatches[index]
    }
    
    // Fallback to alphabetic labels
    return String.fromCharCode(65 + index)
  }

  // Build formula display string
  const buildFormulaString = () => {
    const parts: string[] = []
    
    // Starting score (if exists)
    if (startingScores.length > 0 || startValue) {
      parts.push(`${startValue.toFixed(1)}`)
    }
    
    // Field scores
    fieldScores.forEach((jr) => {
      const value = jr.performance?.toFixed(2) || '0.00'
      // Determine if it's addition or subtraction based on field name
      if (jr.fieldName.toLowerCase().includes('abzug') || jr.fieldName.toLowerCase().includes('ausf')) {
        parts.push(`- ${value}`)
      } else {
        parts.push(`+ ${value}`)
      }
    })
    
    return parts.join(' ')
  }

  return (
    <div className="flex flex-col items-center space-y-1.5 py-2 px-1">
      {/* Line 1: Field Values with Labels */}
      <div className="flex items-center gap-2 text-xs">
        {startingScores.length > 0 && (
          <div className="flex items-center">
            <div className="flex flex-col items-center px-2 py-1 bg-blue-50 rounded border border-blue-200">
              <div className="text-[10px] text-blue-600 font-medium">
                {startingScores[0].fieldShortName || 'Ausgang'}
              </div>
              <div className="text-sm font-bold text-blue-900 font-mono">
                {startingScores[0].performance?.toFixed(2) || '0.00'}
              </div>
            </div>
          </div>
        )}
        {fieldScores.map((jr, index) => (
          <div key={jr.id} className="flex items-center">
            {(index > 0 || startingScores.length > 0) && <span className="text-gray-400 mx-1">|</span>}
            <div className="flex flex-col items-center px-2 py-1 bg-gray-50 rounded border border-gray-200">
              <div className="text-[10px] text-gray-500 font-medium">
                ({getFormulaSymbol(index)}) {jr.fieldShortName || jr.fieldName}
              </div>
              <div className="text-sm font-bold text-gray-900 font-mono">
                {jr.performance?.toFixed(2) || '-'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Line 2: Formula Calculation */}
      <div className="flex items-center gap-1.5 text-sm">
        <span className="text-gray-600 font-mono text-xs">
          ({buildFormulaString()})
        </span>
        <span className="text-gray-400">=</span>
        <div className="flex items-center gap-1 px-2 py-1 bg-green-50 rounded border border-green-200">
          <span className="text-lg font-bold text-green-700 font-mono">
            {actualFinalScore.toFixed(2)}
          </span>
          <span className="text-xs text-green-600">Pkt.</span>
        </div>
      </div>
    </div>
  )
}
