/**
 * Type definitions for the Events page.
 */

export interface Event {
  int_eventid: number
  var_eventname: string
  dat_eventstartdate: string
  dat_eventenddate: string
  var_location: string
  var_description?: string
  participant_count: number
  score_count: number
  club_count?: number
  status: 'upcoming' | 'active' | 'completed'
}

export interface Venue {
  int_wettkampforteid: number
  var_name: string
  var_adresse?: string
  var_plz?: string
  var_ort?: string
}

export interface EventFormData {
  var_eventname: string
  dat_eventstartdate: string
  dat_eventenddate: string
  var_location: string
  var_description: string
}

export interface ImportEventData {
  eventName: string
  startDate: string
  endDate: string
  locationId: string
  description: string
}

export interface ImportProgress {
  step: string
  progress: number
}

export const EMPTY_FORM_DATA: EventFormData = {
  var_eventname: '',
  dat_eventstartdate: '',
  dat_eventenddate: '',
  var_location: '',
  var_description: ''
}

export const EMPTY_IMPORT_DATA: ImportEventData = {
  eventName: '',
  startDate: '',
  endDate: '',
  locationId: '',
  description: ''
}
