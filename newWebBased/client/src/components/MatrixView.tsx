import React, { ReactNode } from 'react'

/**
 * MatrixView - A reusable component for displaying data in a matrix/grid layout
 * Similar to Meldematrix, with rows and columns forming a table
 */

export interface MatrixColumn {
  id: string | number
  label: string
  subLabel?: string // Optional second line in header
  minWidth?: string // CSS width value (e.g., '120px', '10rem')
}

export interface MatrixRow {
  id: string | number
  label: string
  data?: Record<string | number, any> // Data for each column, keyed by column id
  className?: string // Optional CSS class for the row
  isHighlighted?: boolean // Optional flag for special styling (e.g., totals row)
}

export interface MatrixCellProps {
  rowId: string | number
  columnId: string | number
  data: any
  isEditing?: boolean
}

interface MatrixViewProps {
  // Data structure
  columns: MatrixColumn[]
  rows: MatrixRow[]
  
  // Cell rendering
  renderCell: (props: MatrixCellProps) => ReactNode
  
  // Styling options
  stickyFirstColumn?: boolean // Make first column sticky
  stickyHeader?: boolean // Make header row sticky
  className?: string
  
  // Cell behavior
  onCellClick?: (rowId: string | number, columnId: string | number) => void
  editingCell?: { rowId: string | number; columnId: string | number } | null
  
  // Empty state
  emptyMessage?: string
}

/**
 * MatrixView Component
 * 
 * Usage Example:
 * ```tsx
 * <MatrixView
 *   columns={[
 *     { id: 1, label: 'Boden', subLabel: 'Floor' },
 *     { id: 2, label: 'Sprung', subLabel: 'Vault' }
 *   ]}
 *   rows={[
 *     { id: 'm', label: 'Riege m', data: { 1: 'completed', 2: 'in-progress' } },
 *     { id: 'w', label: 'Riege w', data: { 1: 'pending', 2: 'pending' } }
 *   ]}
 *   renderCell={({ data, isEditing }) => (
 *     <span className="badge">{data}</span>
 *   )}
 *   stickyFirstColumn={true}
 *   stickyHeader={true}
 * />
 * ```
 */
export default function MatrixView({
  columns,
  rows,
  renderCell,
  stickyFirstColumn = true,
  stickyHeader = true,
  className = '',
  onCellClick,
  editingCell = null,
  emptyMessage = 'No data available'
}: MatrixViewProps) {
  
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-8">
        <div className="text-center text-gray-500">
          <p>{emptyMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg border overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          {/* Header */}
          <thead>
            <tr className={`bg-gray-50 ${stickyHeader ? 'sticky top-0 z-20' : ''}`}>
              {/* First column header (row labels) */}
              <th 
                className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 ${
                  stickyFirstColumn ? 'sticky left-0 bg-gray-50 z-30' : ''
                }`}
              >
                {/* Empty or could be a label like "Squad" */}
              </th>
              
              {/* Column headers */}
              {columns.map((column) => (
                <th 
                  key={column.id} 
                  className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200"
                  style={{ minWidth: column.minWidth || '120px' }}
                >
                  <div className="font-semibold">{column.label}</div>
                  {column.subLabel && (
                    <div className="text-[10px] font-normal text-gray-400">
                      {column.subLabel}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.map((row, index) => (
              <tr 
                key={row.id} 
                className={`transition-colors ${
                  row.className || ''
                } ${
                  row.isHighlighted 
                    ? 'bg-gray-100 font-semibold' 
                    : index % 2 === 0 
                      ? 'bg-white hover:bg-gray-50' 
                      : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                {/* First column (row label) */}
                <td 
                  className={`px-4 py-3 whitespace-nowrap text-sm ${
                    row.isHighlighted ? 'font-bold' : 'font-medium'
                  } text-gray-900 border-r border-gray-200 ${
                    stickyFirstColumn ? `sticky left-0 z-10 ${row.isHighlighted ? 'bg-gray-100' : index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'}` : ''
                  }`}
                >
                  {row.label}
                </td>
                
                {/* Data cells */}
                {columns.map((column) => {
                  const cellData = row.data?.[column.id]
                  const isEditing = editingCell?.rowId === row.id && editingCell?.columnId === column.id
                  const hasCellClick = !!onCellClick
                  
                  return (
                    <td 
                      key={column.id} 
                      className={`px-3 py-3 text-center border-r border-gray-200 ${
                        hasCellClick && !isEditing ? 'cursor-pointer' : ''
                      }`}
                      onClick={() => {
                        if (hasCellClick && !isEditing) {
                          onCellClick(row.id, column.id)
                        }
                      }}
                    >
                      {cellData !== undefined ? (
                        renderCell({
                          rowId: row.id,
                          columnId: column.id,
                          data: cellData,
                          isEditing
                        })
                      ) : (
                        <span className="text-gray-300 text-xs">-</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/**
 * Helper component for rendering status badges in matrix cells
 */
export function MatrixStatusBadge({ 
  label, 
  colorClass, 
  style 
}: { 
  label: string
  colorClass?: string
  style?: React.CSSProperties 
}) {
  return (
    <span 
      className={`inline-block w-full px-2 py-1.5 rounded text-xs font-medium transition-all hover:shadow-md ${
        colorClass || 'bg-gray-100 text-gray-800 border border-gray-200'
      }`}
      style={style}
    >
      {label}
    </span>
  )
}

/**
 * Helper component for rendering count cells in matrix
 */
export function MatrixCountCell({ 
  count, 
  showZero = false 
}: { 
  count: number
  showZero?: boolean 
}) {
  if (count === 0 && !showZero) {
    return <span className="text-gray-300 text-xs">-</span>
  }
  
  return (
    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
      {count}
    </span>
  )
}
