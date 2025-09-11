// Utility for handling icons in PDF exports
import { getDisciplineIcon } from './disciplineIcons'

export interface IconData {
  base64: string
  width: number
  height: number
}

// Preload images and convert to base64 for PDF embedding
export const preloadIconsForPDF = async (disciplines: Array<{name: string, iconPath?: string}>): Promise<Map<string, IconData>> => {
  const iconCache = new Map<string, IconData>()
  
  for (const discipline of disciplines) {
    if (discipline.iconPath) {
      try {
        const iconPath = getDisciplineIcon(discipline.name, discipline.iconPath)
        const iconData = await loadImageAsBase64(iconPath)
        if (iconData) {
          iconCache.set(discipline.name, iconData)
        }
      } catch (error) {
        console.error(`Error loading icon for ${discipline.name}:`, error)
      }
    }
  }
  
  return iconCache
}

// Load a single image and convert to base64 with dimensions
const loadImageAsBase64 = (imagePath: string): Promise<IconData | null> => {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = function() {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (ctx) {
          canvas.width = img.width
          canvas.height = img.height
          ctx.drawImage(img, 0, 0)
          const base64 = canvas.toDataURL('image/png')
          resolve({
            base64,
            width: img.width,
            height: img.height
          })
        } else {
          resolve(null)
        }
      } catch (error) {
        console.error('Error converting image to base64:', error)
        resolve(null)
      }
    }
    img.onerror = () => {
      console.error('Error loading image:', imagePath)
      resolve(null)
    }
    img.src = imagePath
  })
}

// Add icon to PDF at specified coordinates
export const addIconToPDF = (doc: any, iconData: IconData, x: number, y: number, size: number = 8) => {
  try {
    doc.addImage(iconData.base64, 'PNG', x, y, size, size)
  } catch (error) {
    console.error('Error adding icon to PDF:', error)
  }
}
