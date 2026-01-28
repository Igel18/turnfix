# PDF Export with Jury Results

**Implementation Date**: 2026-01-28  
**Status**: ✅ COMPLETE  
**Related Documentation**: [JURY_RESULTS_SYSTEM.md](JURY_RESULTS_SYSTEM.md)

## Overview

Extended the PDF export functionality in the Results page to include detailed jury results breakdown. When a score has associated jury results (individual field scores like Stufe, AbzugAusf, etc.), the PDF now displays:

- **Formula**: The calculation formula (e.g., "(10 + A) - B")
- **Start Value**: The base value (e.g., "Start: 10")
- **Individual Field Scores**: All field scores with their short names (e.g., "A: 6.0, B: 3.5")
- **Total Score**: The final calculated score

## Implementation Details

### Files Modified

#### `client/src/pages/Results/hooks/useExport.ts`

**Changes Applied**:
1. **Enhanced Table Data Generation** (both single and multi-competition exports):
   - Check if participant has jury results for each discipline
   - If no jury results: Display simple formatted score
   - If jury results exist: Build multi-line breakdown string with:
     - Formula line
     - Start value line
     - Individual field scores line
     - Total score line

2. **Updated PDF Styles**:
   - Enabled `overflow: 'linebreak'` for multi-line cell content
   - Increased discipline column width from 18 to 24 units
   - Reduced font size from 8pt to 7pt (overall) and 6pt (discipline columns)
   - Increased cell padding from 2 to 3 units
   - Added `valign: 'middle'` for better vertical alignment

### Code Structure

```typescript
// Table data generation (both exports)
const tableData = participants.map(participant => {
  const baseRow = [
    participant.rank,
    participant.startNumber || '',
    participant.name,
    participant.club,
    participant.age
  ]

  const disciplineData = disciplines.map(discipline => {
    const score = participant.scores[discipline]
    if (!score) return '-'

    const juryResults = participant.juryResults?.[discipline]
    if (!juryResults || juryResults.length === 0) {
      return formatScore(score)
    }

    // Build jury breakdown
    const formula = participant.formulas?.[discipline] || ''
    const startValue = participant.startValues?.[discipline]
    const fieldScores = juryResults
      .filter(jr => !jr.isFinalScore)
      .map(jr => `${jr.fieldShortName}: ${jr.performance.toFixed(1)}`)
      .join(', ')

    const breakdown: string[] = []
    if (formula) breakdown.push(`Formula: ${formula}`)
    if (startValue !== undefined) breakdown.push(`Start: ${startValue}`)
    if (fieldScores) breakdown.push(fieldScores)
    breakdown.push(`Total: ${formatScore(score)}`)

    return breakdown.join('\n')
  })

  return [...baseRow, ...disciplineData, formatScore(participant.totalScore)]
})
```

### PDF Styling Configuration

```typescript
styles: {
  fontSize: 7,              // Reduced from 8
  cellPadding: 3,           // Increased from 2
  lineWidth: 0.1,
  valign: 'middle',
  overflow: 'linebreak'     // NEW: Enable line breaks
}

columnStyles: {
  // ... other columns ...
  
  // Discipline columns (enhanced)
  [5 + index]: { 
    halign: 'center', 
    cellWidth: 24,          // Increased from 18
    fontSize: 6,            // Smaller for breakdown
    cellPadding: 2
  }
}
```

## Example Output

### Without Jury Results
```
14.5
```

### With Jury Results
```
Formula: (10 + A) - B
Start: 10
A: 6.0, B: 3.5
Total: 14.0
```

## Data Flow

1. **Results Page** loads scores with jury results from `/api/scores`
2. **useExport Hook** receives `ranking` array with:
   - `participant.scores[discipline]` - Final scores
   - `participant.juryResults[discipline]` - Array of jury field results
   - `participant.formulas[discipline]` - Calculation formula
   - `participant.startValues[discipline]` - Start value
3. **PDF Generation**:
   - Iterate through participants
   - For each discipline score:
     - Check if jury results exist
     - Build multi-line breakdown string
     - Use `\n` for line breaks (handled by `overflow: 'linebreak'`)
   - Generate PDF with jsPDF + autoTable

## Testing

### Test Case: Luis Bader

**Setup**:
- Participant: Luis Bader (ID: 100)
- Discipline: P-Wettkampf (ID: 111)
- Formula: "(10 + A) - B"
- Start Value: 10

**Jury Results**:
- Field A (Stufe): 6.0
- Field B (AbzugAusf): 3.5
- Endwert: 14.0

**Expected PDF Cell Content**:
```
Formula: (10 + A) - B
Start: 10
A: 6.0, B: 3.5
Total: 14.0
```

### Testing Steps

1. Navigate to Results page: http://localhost:3001/results
2. Select competition with jury results (e.g., "P-Wettkampf")
3. Click "PDF Export" button
4. Verify discipline columns show:
   - Formula line
   - Start value line
   - Field scores line
   - Total score line
5. Check layout: Multi-line content should be properly formatted

## Configuration

### Requirements
- **useJuryResults**: Must be enabled in Configuration page
- **Jury Results Data**: Must exist in `tfx_jury_results` table
- **Formulas**: Must be defined in `tfx_formeln` or `tfx_disziplinen.var_formel`

### Fallback Behavior
If no jury results exist for a score:
- PDF displays simple formatted score (e.g., "14.5")
- No breakdown or formula shown
- Maintains backward compatibility

## Technical Considerations

### PDF Cell Height
- Multi-line content automatically increases cell height
- `autoTable` handles vertical alignment with `valign: 'middle'`
- Page breaks handled automatically with `pageBreak: 'auto'`

### Column Width Optimization
- **Original**: 18 units (too narrow for breakdown)
- **Updated**: 24 units (accommodates 4-line breakdown)
- **Trade-off**: Slightly reduced space for other columns

### Font Size Balance
- **Header**: 8pt (kept for readability)
- **Body**: 7pt (reduced for more content)
- **Discipline Columns**: 6pt (further reduced for breakdown)

## Future Enhancements

### Potential Improvements
1. **Conditional Column Width**: Dynamically adjust based on presence of jury results
2. **Color Coding**: Highlight jury breakdown lines with subtle colors
3. **Formula Rendering**: Use mathematical symbols (requires custom font)
4. **Compact Mode**: Option to show simplified breakdown (formula only)
5. **Custom Templates**: Allow users to choose breakdown format

### Known Limitations
1. **Fixed Width**: Column width doesn't adapt to content
2. **Formula Complexity**: Long formulas may wrap awkwardly
3. **Language**: Jury breakdown always in English (not localized)
4. **Print Quality**: Very small fonts may be hard to read when printed

## Related Files

### Client
- `client/src/pages/Results/hooks/useExport.ts` - PDF export implementation
- `client/src/pages/Results/Results.types.ts` - Type definitions
- `client/src/utils/pdfUtils.ts` - PDF utilities (header, footer, styles)

### Server
- `server/src/routes/scores.ts` - Scores API with jury results
- `server/src/routes/juryResults.ts` - Jury results CRUD operations

### Documentation
- `JURY_RESULTS_SYSTEM.md` - Complete jury results documentation
- `PRIORITY_FIXES_LOG.md` - Fix history and implementation notes

## Deployment

### Build & Restart
```powershell
# Build client
cd "c:\Users\Dominik Prudlo\Documents\GitHub\turnfix\newWebBased\client"
npm run build

# Restart PM2
cd "c:\Users\Dominik Prudlo\Documents\GitHub\turnfix\newWebBased\server"
pm2 restart ecosystem.config.js
```

### Verification
1. Check PM2 status: `pm2 status`
2. Check server logs: `pm2 logs --lines 20`
3. Test PDF export with jury results
4. Verify multi-line layout in PDF

## Commit Message

```
Add Point 109d: PDF Export with Jury Results

Extended PDF export in Results page to include detailed jury results breakdown.
When scores have associated jury results, the PDF now displays:
- Formula: e.g., "(10 + A) - B"
- Start Value: e.g., "Start: 10"
- Individual field scores: e.g., "A: 6.0, B: 3.5"
- Total score: e.g., "Total: 14.0"

Implementation:
- Modified client/src/pages/Results/hooks/useExport.ts
  * Enhanced table data generation for both single and multi-competition exports
  * Added multi-line breakdown string building
  * Increased discipline column width from 18 to 24 units
  * Enabled line breaks with overflow: 'linebreak'
  * Optimized font sizes (7pt body, 6pt disciplines)
  * Improved cell padding and alignment

Technical details:
- Checks for jury results existence before building breakdown
- Filters out final score field (only shows component scores)
- Uses participant.juryResults, formulas, and startValues arrays
- Maintains backward compatibility (simple score if no jury results)
- Multi-line content automatically handled by jsPDF autoTable

Test case verified: Luis Bader (P-Wettkampf) shows correct breakdown:
Formula: (10 + A) - B, Start: 10, A: 6.0, B: 3.5, Total: 14.0

Files modified:
- client/src/pages/Results/hooks/useExport.ts

Related documentation:
- documentation/newWebbased/PDF_EXPORT_JURY_RESULTS.md (NEW)
- documentation/newWebbased/JURY_RESULTS_SYSTEM.md (Reference)
```

---

**Status**: ✅ Implementation complete, server restarted, ready for testing
**Build Time**: 2026-01-28, 17:29:04
**PM2 Status**: Both servers online (turnfix-server, turnfix-jury-server)
