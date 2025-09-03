// Type declarations for jspdf-autotable
declare module 'jspdf-autotable' {
  import jsPDF from 'jspdf'

  interface AutoTableOptions {
    head?: any[][]
    body?: any[][]
    startY?: number
    margin?: { top?: number; right?: number; bottom?: number; left?: number }
    pageBreak?: 'auto' | 'avoid' | 'always'
    rowPageBreak?: 'auto' | 'avoid'
    tableWidth?: 'auto' | 'wrap' | number
    showHead?: 'everyPage' | 'firstPage' | 'never'
    showFoot?: 'everyPage' | 'lastPage' | 'never'
    theme?: 'striped' | 'grid' | 'plain'
    styles?: any
    headStyles?: any
    bodyStyles?: any
    footStyles?: any
    alternateRowStyles?: any
    columnStyles?: any
    didParseCell?: (data: any) => void
    willDrawCell?: (data: any) => void
    didDrawCell?: (data: any) => void
    didDrawPage?: (data: any) => void
    [key: string]: any
  }

  function autoTable(doc: jsPDF, options: AutoTableOptions): void
  export default autoTable
}
