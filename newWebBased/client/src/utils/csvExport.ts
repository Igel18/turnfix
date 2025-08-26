export interface CSVExportOptions {
  filename: string
  headers: string[]
  data: Record<string, any>[]
  dateFields?: string[]
  numberFields?: string[]
}

export const exportToCSV = ({
  filename,
  headers,
  data,
  dateFields = [],
  numberFields = []
}: CSVExportOptions) => {
  if (data.length === 0) {
    alert('No data to export')
    return
  }

  // Create CSV content
  const csvContent = [
    // Headers
    headers.join(','),
    // Data rows
    ...data.map(row => 
      headers.map(header => {
        const value = row[header]
        
        if (value === null || value === undefined) {
          return ''
        }
        
        // Handle dates
        if (dateFields.includes(header) && value) {
          const date = new Date(value)
          return isNaN(date.getTime()) ? value : date.toLocaleDateString()
        }
        
        // Handle numbers
        if (numberFields.includes(header) && typeof value === 'number') {
          return value.toString()
        }
        
        // Handle strings - escape commas and quotes
        const stringValue = value.toString()
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        
        return stringValue
      }).join(',')
    )
  ].join('\n')

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

// Common field mappings for different entities
export const getParticipantCSVData = (participants: any[]) => ({
  filename: 'participants',
  headers: ['int_teilnehmerid', 'var_vorname', 'var_nachname', 'dat_geburtstag', 'geschlecht_name', 'verein_name', 'int_startpassnummer'],
  data: participants,
  dateFields: ['dat_geburtstag'],
  numberFields: ['int_teilnehmerid', 'int_startpassnummer']
})

export const getEventCSVData = (events: any[]) => ({
  filename: 'events',
  headers: ['int_eventid', 'var_eventname', 'dat_eventstartdate', 'dat_eventenddate', 'var_location', 'var_description', 'participant_count', 'score_count'],
  data: events,
  dateFields: ['dat_eventstartdate', 'dat_eventenddate'],
  numberFields: ['int_eventid', 'participant_count', 'score_count']
})

export const getClubCSVData = (clubs: any[]) => ({
  filename: 'clubs',
  headers: ['int_vereineid', 'var_name', 'var_short_name', 'var_location', 'participant_count'],
  data: clubs,
  numberFields: ['int_vereineid', 'participant_count']
})

export const getDisciplineCSVData = (disciplines: any[]) => ({
  filename: 'disciplines',
  headers: ['id', 'name', 'short_name', 'apparatus', 'gender_text', 'age_range', 'active'],
  data: disciplines,
  numberFields: ['id']
})

export const getCompetitionCSVData = (competitions: any[]) => ({
  filename: 'competitions',
  headers: ['id', 'name', 'number', 'round', 'event_id', 'participant_count', 'discipline_count'],
  data: competitions,
  numberFields: ['id', 'round', 'event_id', 'participant_count', 'discipline_count']
})

export default exportToCSV
