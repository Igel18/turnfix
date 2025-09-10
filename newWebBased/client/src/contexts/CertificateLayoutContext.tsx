import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface CertificateLayout {
  int_layoutid: number
  var_name: string
  txt_comment: string | null
  fieldCount?: number
  createdAt?: string
  fields?: LayoutField[]
}

interface LayoutField {
  int_layout_felderid: number
  int_layoutid: number
  int_typ: number
  var_font: string | null
  rel_x: number
  rel_y: number
  rel_w: number
  rel_h: number
  var_text: string | null
  var_spaltenwert: string | null
}

interface CertificateLayoutContextType {
  selectedLayout: CertificateLayout | null
  setSelectedLayout: (layout: CertificateLayout | null) => void
  clearLayoutSelection: () => void
}

const CertificateLayoutContext = createContext<CertificateLayoutContextType | undefined>(undefined)

export function CertificateLayoutProvider({ children }: { children: ReactNode }) {
  const [selectedLayoutState, setSelectedLayoutState] = useState<CertificateLayout | null>(null)

  // Load persisted layout selection on mount
  useEffect(() => {
    try {
      const savedLayout = localStorage.getItem('turnfix-selected-certificate-layout')
      
      if (savedLayout) {
        setSelectedLayoutState(JSON.parse(savedLayout))
      }
    } catch (error) {
      console.error('Error loading persisted certificate layout selection:', error)
      // Clear invalid data
      localStorage.removeItem('turnfix-selected-certificate-layout')
    }
  }, [])

  // Persist layout selection to localStorage
  const setSelectedLayout = (layout: CertificateLayout | null) => {
    setSelectedLayoutState(layout)
    if (layout) {
      localStorage.setItem('turnfix-selected-certificate-layout', JSON.stringify(layout))
      console.log('📋 Certificate Layout Selected:', layout.var_name)
    } else {
      localStorage.removeItem('turnfix-selected-certificate-layout')
      console.log('📋 Certificate Layout Selection Cleared')
    }
  }

  // Clear layout selection
  const clearLayoutSelection = () => {
    setSelectedLayout(null)
  }

  const value: CertificateLayoutContextType = {
    selectedLayout: selectedLayoutState,
    setSelectedLayout,
    clearLayoutSelection
  }

  return (
    <CertificateLayoutContext.Provider value={value}>
      {children}
    </CertificateLayoutContext.Provider>
  )
}

export function useCertificateLayout() {
  const context = useContext(CertificateLayoutContext)
  if (context === undefined) {
    throw new Error('useCertificateLayout must be used within a CertificateLayoutProvider')
  }
  return context
}

export default CertificateLayoutContext
