/**
 * useCertificates Hook
 * Point 123: Separation of Concerns
 * 
 * Manages certificate generation logic including:
 * - Loading certificate layouts from API
 * - Generating PDF certificates with field mapping
 * - Image loading and error handling
 * - Paper format management
 */

import { useState, useCallback } from 'react'
import jsPDF from 'jspdf'
import { apiGet } from '@/utils/api'
import { debugLog, isDebugEnabled } from '@/utils/debug'
import { resolveImageUrl, isLocalFilePath } from '@/utils/imageUrlUtils'
import type { CertificateLayout, PaperFormat, Participant } from '../Results.types'

const PAPER_FORMATS = {
  A4: { width: 595, height: 842, name: 'A4 (210 × 297 mm)' },
  A3: { width: 842, height: 1191, name: 'A3 (297 × 420 mm)' },
  A5: { width: 420, height: 595, name: 'A5 (148 × 210 mm)' },
  Letter: { width: 612, height: 792, name: 'Letter (8.5 × 11 in)' },
  Legal: { width: 612, height: 1008, name: 'Legal (8.5 × 14 in)' },
  Tabloid: { width: 792, height: 1224, name: 'Tabloid (11 × 17 in)' }
}

interface Competition {
  id: number
  name: string
  number?: string
}

export const useCertificates = () => {
  const [certificateLayouts, setCertificateLayouts] = useState<CertificateLayout[]>([])
  const [isPrintingCertificates, setIsPrintingCertificates] = useState(false)

  /**
   * Fetch available certificate layouts from API
   */
  const fetchCertificateLayouts = useCallback(async () => {
    try {
      const layouts = await apiGet('/layouts') as CertificateLayout[]
      debugLog('Fetched certificate layouts:', layouts)
      setCertificateLayouts(layouts)
    } catch (error) {
      console.error('Error fetching certificate layouts:', error)
      setCertificateLayouts([])
    }
  }, [])

  /**
   * Load image as base64 data URL
   * For local file paths, use server API endpoint
   * Returns null if image cannot be loaded (caller will draw placeholder)
   */
  const loadImageAsBase64 = async (rawUrl: string): Promise<{ dataUrl: string; format: string } | null> => {
    // Resolve the URL using the shared utility (handles bare filenames, etc.)
    const url = resolveImageUrl(rawUrl);
    debugLog(`Loading image: raw="${rawUrl}" → resolved="${url}"`);

    // Check if this is a local Windows path (starts with drive letter or UNC)
    if (isLocalFilePath(url)) {
      try {
        debugLog(`Loading local image via API: ${url}`);
        const response = await apiGet(`/layouts/image?path=${encodeURIComponent(url)}`);
        
        if (response && typeof response === 'object' && 'dataUrl' in response) {
          const dataUrl = response.dataUrl as string;
          const format = dataUrl.includes('image/jpeg') ? 'JPEG' : 'PNG';
          return { dataUrl, format };
        } else {
          console.warn(`⚠ Invalid API response for image: ${url}`);
          return null;
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`⚠ Local image not available: ${url} (${errorMsg})`);
        return null;
      }
    }
    
    // For server-relative or HTTP(S) URLs, use fetch to get the raw bytes
    // This avoids the unreliable canvas.toDataURL() approach which can
    // produce corrupt or oversized re-encoded PNGs.
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`⚠ Image fetch failed (${response.status}): ${url}`);
        return null;
      }

      const contentType = response.headers.get('content-type') || 'image/png';
      const blob = await response.blob();
      
      if (blob.size === 0) {
        console.warn(`⚠ Image is empty: ${url}`);
        return null;
      }

      // Determine jsPDF format from content-type
      const format = contentType.includes('jpeg') || contentType.includes('jpg') ? 'JPEG' : 'PNG';

      // Convert blob to data URL via FileReader (preserves original bytes)
      const dataUrl = await new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });

      if (!dataUrl) {
        console.warn(`⚠ Failed to convert image blob to data URL: ${url}`);
        return null;
      }

      debugLog(`Image loaded: ${url} (${blob.size} bytes, ${format})`);
      return { dataUrl, format };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`⚠ Failed to fetch image: ${url} (${errorMsg})`);
      return null;
    }
  };

  /**
   * Map database field value to actual participant/competition data
   * Type 0 fields contain a number (0-15) that maps to specific data fields
   */
  const mapFieldValue = (
    fieldValue: string | null,
    participant: Participant,
    competitionName: string
  ): string => {
    if (!fieldValue) return ''

    // Check if this is a database field number (Type 0)
    if (/^\d+$/.test(fieldValue)) {
      const fieldNum = parseInt(fieldValue)
      switch (fieldNum) {
        case 0: return competitionName // Event name (using competition as event)
        case 1: return new Date().toLocaleDateString('de-DE') // Event date
        case 2: return 'Sporthalle' // Location (TODO: get from event data)
        case 3: return participant.name // Participant name
        case 4: return participant.club // Club name
        case 5: return `${participant.rank}.` // Place/Rank with dot
        case 6: return participant.totalScore.toFixed(3) // Score/Points
        case 7: return competitionName // Competition name
        case 8: return `${competitionName} (Einzel)` // Competition + designation
        case 9: return 'Turngau' // Gau (District)
        case 10: return 'Turnerbund' // Verband (Association)
        case 11: return 'Deutschland' // Land (State)
        case 12: return participant.rank <= 3 ? 'Siegerurkunde' : 'Teilnahmeurkunde' // Certificate type
        case 13: return participant.totalScore.toFixed(3) // Score (alternative)
        case 14: return participant.name // Team members (single participant)
        case 15: return `WK-${participant.competitionId}` // Competition number
        default: return `Feld ${fieldNum}`
      }
    }

    // For template placeholders like {participant.name} (future compatibility)
    const mapping: Record<string, string> = {
      '{participant.name}': participant.name,
      '{participant.club}': participant.club,
      '{participant.rank}': participant.rank.toString(),
      '{participant.age}': participant.age.toString(),
      '{participant.totalScore}': participant.totalScore.toFixed(2),
      '{competition.name}': competitionName,
      '{date}': new Date().toLocaleDateString('de-DE')
    }

    return mapping[fieldValue] || fieldValue
  }

  /**
   * Generate certificates PDF for selected participants
   */
  const generateCertificates = useCallback(async (
    participants: Participant[],
    selectedLayout: CertificateLayout | null,
    selectedPaperFormat: PaperFormat,
    competitions: Competition[],
    selectedCompetition: string | null,
    eventName: string
  ) => {
    if (!selectedLayout) {
      alert('Please select a certificate layout')
      return
    }

    if (participants.length === 0) {
      alert('No participants selected for certificates')
      return
    }

    setIsPrintingCertificates(true)

    try {
      // CRITICAL: Fetch fresh layout data from API to avoid using stale localStorage data
      debugLog('Fetching fresh layout data from API for layout ID:', selectedLayout.int_layoutid)
      const freshLayout = await apiGet(`/layouts/${selectedLayout.int_layoutid}`) as CertificateLayout
      
      if (!freshLayout) {
        throw new Error('Could not load layout from server')
      }
      
      debugLog('Using fresh layout data:', freshLayout)
      debugLog('Generating certificates for participants:', participants.length)
      debugLog('Paper format:', selectedPaperFormat)

      const format = PAPER_FORMATS[selectedPaperFormat]
      const doc = new jsPDF({
        orientation: format.width > format.height ? 'landscape' : 'portrait',
        unit: 'pt',
        format: [format.width, format.height]
      })

      const pageWidth = format.width
      const pageHeight = format.height

      for (let i = 0; i < participants.length; i++) {
        const participant = participants[i]
        
        if (i > 0) {
          doc.addPage()
        }

        debugLog(`Processing certificate ${i + 1}/${participants.length} for:`, participant.name)

        // Get competition name for this participant
        const competitionName = participant.competitionName || 
          competitions.find(c => c.id === participant.competitionId)?.name || 
          eventName

        // Sort fields by layer (background first) - using FRESH layout data
        const sortedFields = [...(freshLayout.fields || [])].sort((a, b) => a.int_layer - b.int_layer)

        console.log(`Processing ${sortedFields.length} fields for participant ${i + 1}:`, participant.name);

        // Find the maximum coordinates to understand the scale
        const maxX = Math.max(...sortedFields.map(f => f.rel_x + f.rel_w))
        const maxY = Math.max(...sortedFields.map(f => f.rel_y + f.rel_h))
        
        // The database coordinates are stored at designer canvas scale (2480×3508 for A4 at 300 DPI)
        const designerCanvasWidth = 2480
        const designerCanvasHeight = 3508
        
        // Calculate scaling: database -> designer -> PDF
        const dbToDesignerX = designerCanvasWidth / maxX
        const dbToDesignerY = designerCanvasHeight / maxY
        const designerToPdfX = pageWidth / designerCanvasWidth
        const designerToPdfY = pageHeight / designerCanvasHeight
        const scaleX = dbToDesignerX * designerToPdfX
        const scaleY = dbToDesignerY * designerToPdfY
        
        console.log(`Coordinate scaling: dbMax=(${maxX.toFixed(1)}, ${maxY.toFixed(1)}), scale=(${scaleX.toFixed(4)}, ${scaleY.toFixed(4)})`);

        for (const field of sortedFields) {
          try {
            // Calculate PDF coordinates using the combined scaling
            const x = Math.max(0, field.rel_x * scaleX)
            const y = Math.max(0, field.rel_y * scaleY)
            const width = Math.max(1, field.rel_w * scaleX)
            const height = Math.max(1, field.rel_h * scaleY)

            console.log(`Field ${field.int_layout_felderid} (type ${field.int_typ}):`, { x: x.toFixed(1), y: y.toFixed(1), width: width.toFixed(1), height: height.toFixed(1), value: field.var_value });

            // Skip fields outside page
            if (x >= pageWidth || y >= pageHeight || width <= 0 || height <= 0) {
              console.log(`Skipping field ${field.int_layout_felderid} - outside page bounds`)
              continue
            }

            // Debug visualization
            if (isDebugEnabled()) {
              doc.setDrawColor(255, 0, 0)
              doc.setLineWidth(0.5)
              doc.rect(x, y, width, height)
              doc.setFontSize(6)
              doc.setTextColor(255, 0, 0)
              doc.text(`${field.int_typ}:${field.int_layout_felderid}`, x, y - 2)
            }

            switch (field.int_typ) {
            case 0: // Text field (dynamic - with mapping)
            case 1: // Text field (static or dynamic)
              if (field.var_value && width > 0 && height > 0) {
                const mappedValue = mapFieldValue(field.var_value, participant, competitionName)
                
                // Font size calculation from old code
                const fontParts = field.var_font?.split(',') || ['helvetica', '12']
                let fontSize = parseInt(fontParts[1]) || 12
                // Scale font size based on field height if available
                if (height > 10) {
                  fontSize = Math.min(fontSize, height * 0.6)
                }
                fontSize = Math.max(8, Math.min(72, fontSize))
                
                console.log(`Text field ${field.int_layout_felderid}: "${field.var_value}" → "${mappedValue}" (fontSize: ${fontSize})`);
                
                // Map font to jsPDF supported fonts
                let fontFamily = 'helvetica';
                if (field.var_font) {
                  const fontLower = field.var_font.toLowerCase();
                  if (fontLower.includes('times') || fontLower.includes('serif')) {
                    fontFamily = 'times';
                  } else if (fontLower.includes('courier') || fontLower.includes('mono')) {
                    fontFamily = 'courier';
                  }
                }
                
                doc.setFont(fontFamily, 'normal')
                doc.setFontSize(fontSize)
                doc.setTextColor(0, 0, 0)
                
                // Calculate text position - jsPDF text baseline is at the bottom of the text
                // To center text vertically: middle of field + small offset for baseline
                const textY = y + (height + fontSize) / 2
                
                const align = field.int_align === 1 ? 'center' : field.int_align === 2 ? 'right' : 'left'
                let textX = x
                if (align === 'center') textX = x + width / 2
                if (align === 'right') textX = x + width
                
                console.log(`Field ${field.int_layout_felderid} alignment: int_align=${field.int_align}, computed="${align}", textX=${textX.toFixed(1)}, x=${x.toFixed(1)}, width=${width.toFixed(1)}`);
                
                doc.text(mappedValue, textX, textY, { 
                  align: align as any,
                  maxWidth: width > 0 ? width : undefined
                })
                debugLog(`Added text: "${mappedValue}" at (${textX}, ${textY}) with font ${fontFamily}, size ${fontSize}, align ${align}`)
              }
              break
              
            case 2: // Image field
              if (field.var_value && width > 0 && height > 0) {
                const imageResult = await loadImageAsBase64(field.var_value)
                if (imageResult) {
                  // Image loaded successfully — use detected format (JPEG/PNG)
                  doc.addImage(imageResult.dataUrl, imageResult.format, x, y, width, height)
                  debugLog(`✓ Added image: ${field.var_value} (${imageResult.format})`)
                } else {
                  // Image not available - draw placeholder
                  doc.setDrawColor(200, 200, 200)
                  doc.setFillColor(250, 250, 250)
                  doc.rect(x, y, width, height, 'FD')
                  doc.setDrawColor(180, 180, 180)
                  doc.line(x, y, x + width, y + height)
                  doc.line(x + width, y, x, y + height)
                  doc.setFontSize(Math.max(8, height * 20))
                  doc.setTextColor(150, 150, 150)
                  doc.text('Bild nicht verfügbar', x + width / 2, y + height / 2, { align: 'center' })
                  debugLog(`⚠ Drew placeholder for missing image: ${field.var_value}`)
                }
              } else {
                // Draw placeholder for empty image field
                doc.setDrawColor(200, 200, 200)
                doc.setLineWidth(1)
                doc.rect(x, y, width, height)
                doc.setFontSize(8)
                doc.setTextColor(150, 150, 150)
                doc.text('Kein Bild', x + width / 2, y + height / 2, { align: 'center' })
              }
              break
              
            case 3: // Line field
              debugLog(`Line field at (${x}, ${y}) to (${x + width}, ${y + height / 2})`)
              doc.setDrawColor(0, 0, 0)
              doc.setLineWidth(1)
              if (width > 0) {
                doc.line(x, y + height / 2, x + width, y + height / 2)
              }
              break
              
            default:
              debugLog(`Unknown field type: ${field.int_typ}`)
          }
          } catch (fieldError) {
            // Log error but continue with next field
            const errorMsg = fieldError instanceof Error ? fieldError.message : 'Unknown error';
            console.warn(`⚠ Error processing field ${field.int_layout_felderid} (type ${field.int_typ}):`, errorMsg);
            
            // Draw placeholder for failed field (especially for images)
            if (field.int_typ === 2) {
              const x = field.rel_x;
              const y = field.rel_y;
              const width = field.rel_w;
              const height = field.rel_h;
              
              // Draw placeholder - make it look like a missing image frame
              doc.setDrawColor(200, 200, 200);
              doc.setFillColor(250, 250, 250);
              doc.setLineWidth(1);
              doc.rect(x, y, width, height, 'FD'); // Fill and Draw
              
              // Draw diagonal lines to indicate missing image
              doc.setDrawColor(220, 220, 220);
              doc.line(x, y, x + width, y + height);
              doc.line(x + width, y, x, y + height);
              
              // Add text
              doc.setFontSize(Math.min(height * 0.15, 10));
              doc.setTextColor(180, 180, 180);
              doc.text('Bild nicht', x + width / 2, y + height / 2 - 5, { align: 'center' });
              doc.text('verfügbar', x + width / 2, y + height / 2 + 5, { align: 'center' });
            }
          }
        }
      }

      // Generate filename
      const selectedCompForFilename = competitions.find(c => c.id?.toString() === selectedCompetition)
      const compNameForFilename = selectedCompForFilename 
        ? `${selectedCompForFilename.name}${selectedCompForFilename.number ? `_Nr_${selectedCompForFilename.number}` : ''}`.replace(/[^a-z0-9_]/gi, '_') 
        : 'all'
      const fileName = `certificates_${compNameForFilename}_${new Date().toISOString().split('T')[0]}.pdf`
      
      // Save PDF
      doc.save(fileName)
      debugLog('Certificate PDF generated successfully:', fileName)
      
    } catch (error) {
      console.error('Error generating certificates:', error)
      alert('Error generating certificates')
    } finally {
      setIsPrintingCertificates(false)
    }
  }, [])

  return {
    certificateLayouts,
    isPrintingCertificates,
    fetchCertificateLayouts,
    generateCertificates,
    PAPER_FORMATS
  }
}
