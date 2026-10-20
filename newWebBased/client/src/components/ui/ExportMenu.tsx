import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowDownTrayIcon,
  ChevronDownIcon,
  DocumentTextIcon,
  TableCellsIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline'

export interface ExportMenuItem {
  key: string
  label: string
  onClick: () => void
  icon?: React.ComponentType<{ className?: string }>
}

interface ExportMenuProps {
  onExportCSV?: () => void
  onExportPDF?: () => void
  onPrint?: () => void
  /** Page specific formats, e.g. labels */
  extraItems?: ExportMenuItem[]
  /** Opens a page specific export dialog instead of the dropdown */
  onOpenWizard?: () => void
}

/** Builds the standard item list; order is fixed: CSV, PDF, Print, page specific. */
export function buildExportItems(
  t: (key: string) => string,
  { onExportCSV, onExportPDF, onPrint, extraItems = [] }: ExportMenuProps
): ExportMenuItem[] {
  const items: ExportMenuItem[] = []
  if (onExportCSV) items.push({ key: 'csv', label: t('common.exportCsv'), onClick: onExportCSV, icon: TableCellsIcon })
  if (onExportPDF) items.push({ key: 'pdf', label: t('common.exportPdf'), onClick: onExportPDF, icon: DocumentTextIcon })
  if (onPrint) items.push({ key: 'print', label: t('common.print'), onClick: onPrint, icon: PrinterIcon })
  return [...items, ...extraItems]
}

export const ExportMenu: React.FC<ExportMenuProps> = (props) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const items = buildExportItems(t, props)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  if (items.length === 0 && !props.onOpenWizard) return null
  const popup = props.onOpenWizard ? 'dialog' : 'menu'

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => (props.onOpenWizard ? props.onOpenWizard() : setOpen(o => !o))}
        aria-haspopup={popup}
        aria-expanded={props.onOpenWizard ? undefined : open}
        data-testid="action-export"
        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
        {t('common.export')}
        {!props.onOpenWizard && <ChevronDownIcon className="h-4 w-4 ml-2" />}
      </button>
      {open && !props.onOpenWizard && (
        <div role="menu" className="absolute right-0 z-30 mt-1 w-48 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
          {items.map(({ key, label, onClick, icon: Icon }) => (
            <button
              key={key}
              type="button"
              role="menuitem"
              onClick={() => { setOpen(false); onClick() }}
              className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {Icon && <Icon className="h-4 w-4 mr-2" />}
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
