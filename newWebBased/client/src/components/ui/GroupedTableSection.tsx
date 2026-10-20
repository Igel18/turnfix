import type { ReactNode } from 'react'

interface GroupedTableSectionProps {
  title?: ReactNode
  description?: ReactNode
  children: ReactNode
  className?: string
  testId?: string
}

export default function GroupedTableSection({
  title,
  description,
  children,
  className = '',
  testId,
}: GroupedTableSectionProps) {
  return (
    <section
      className={`border border-gray-200 rounded-lg overflow-hidden bg-white ${className}`.trim()}
      data-testid={testId}
    >
      {title !== undefined && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          {description !== undefined && (
            <p className="text-blue-100 text-sm">{description}</p>
          )}
        </div>
      )}
      <div className="overflow-x-auto">{children}</div>
    </section>
  )
}
