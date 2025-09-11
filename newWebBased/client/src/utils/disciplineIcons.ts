// Function to convert Qt resource path to web-accessible path
export const getWebIconPath = (qtIconPath: string): string => {
  if (!qtIconPath || qtIconPath === '') return '/assets/icons/default.png'
  
  // Convert Qt resource path (:/icons/balken.png) to web path (/assets/icons/balken.png)
  const iconFileName = qtIconPath.replace(':/icons/', '')
  return `/assets/icons/${iconFileName}`
}

// Function to get icon path for a discipline
export const getDisciplineIcon = (disciplineName: string, iconPath?: string): string => {
  if (iconPath) {
    return getWebIconPath(iconPath)
  }
  
  // Fallback mapping based on discipline name
  const nameToIcon: Record<string, string> = {
    'Balken': '/assets/icons/balken.png',
    'Schwebebalken': '/assets/icons/balken.png',
    'Boden': '/assets/icons/boden.png',
    'Sprung': '/assets/icons/sprung.png',
    'Stufenbarren': '/assets/icons/barren.png',
    'Barren': '/assets/icons/barren.png',
    'Reck': '/assets/icons/reck.png',
    'Pferd': '/assets/icons/pferd.png',
    'Ringe': '/assets/icons/ringe.png',
    'Minitrampolin': '/assets/icons/minitrampolin.png',
    'Gerätebahn A': '/assets/icons/geraetebahn.png',
    'Gerätebahn B': '/assets/icons/geraetebahn.png',
  }
  
  return nameToIcon[disciplineName] || '/assets/icons/default.png'
}

// Function to get discipline short name for PDF headers
export const getDisciplineShortName = (disciplineName: string, disciplineData?: any): string => {
  // Debug logging when enabled
  if (typeof window !== 'undefined' && (window as any).DEBUG) {
    console.log('getDisciplineShortName called with:', { disciplineName, disciplineData })
  }
  
  // Use the actual short name from discipline data if available
  if (disciplineData?.var_kurz1) {
    console.log(`Using var_kurz1: ${disciplineData.var_kurz1} for ${disciplineName}`)
    return disciplineData.var_kurz1
  }
  
  // Fallback mapping based on discipline name
  const shortNameMap: Record<string, string> = {
    'Balken': 'BALK',
    'Schwebebalken': 'BALK', 
    'Boden': 'BODEN',
    'Sprung': 'SPRU',
    'Stufenbarren': 'STBARR',
    'Barren': 'BARR',
    'Reck': 'RECK',
    'Pferd': 'PFERD',
    'Seitpferd': 'PFERD',
    'Ringe': 'RINGE',
    'Minitrampolin': 'MINITR',
    'Gerätebahn A': 'GERA',
    'Gerätebahn B': 'GERB',
  }
  
  const result = shortNameMap[disciplineName] || disciplineName.substring(0, 5).toUpperCase()
  console.log(`Using fallback: ${result} for ${disciplineName}`)
  return result
}

// Function to convert image to base64 for PDF embedding
export const getImageAsBase64 = async (imagePath: string): Promise<string> => {
  try {
    const response = await fetch(imagePath)
    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('Error loading image:', error)
    return ''
  }
}

// Function specifically for PDF export (returns icon path for embedding)
export const getDisciplineIconForPDF = (disciplineName: string, iconPath?: string): string => {
  if (iconPath) {
    return getWebIconPath(iconPath)
  }
  
  return getDisciplineIcon(disciplineName)
}
