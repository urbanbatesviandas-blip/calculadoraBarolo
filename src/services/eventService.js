import { supabase, isSupabaseConfigured } from './supabaseClient'
import initialEvents from '../data/historicalEvents.json'

const LOCAL_STORAGE_KEY = 'barolo_events_v2'

const isUuidString = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

// Inicializar eventos locales si no existen
const getLocalEvents = () => {
  try {
    if (localStorage.getItem('barolo_events_data')) {
      localStorage.removeItem('barolo_events_data')
    }
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (saved !== null) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) {
        const seen = new Map()
        parsed.filter(e => !e.calc_code?.startsWith('SYS-') && e.cancellation_reason !== 'CONFIG_STORAGE').forEach(item => {
          const key = item.calc_code || item.id
          if (!seen.has(key) || isUuidString(item.id)) {
            seen.set(key, item)
          }
        })
        // Incorporar automáticamente nuevos eventos históricos oficiales (ej: LC-076) si no existían
        if (Array.isArray(initialEvents)) {
          initialEvents.filter(e => !e.calc_code?.startsWith('SYS-') && e.cancellation_reason !== 'CONFIG_STORAGE').forEach(item => {
            const key = item.calc_code || item.id
            if (!seen.has(key)) {
              seen.set(key, item)
            }
          })
        }
        const mergedList = Array.from(seen.values()).map(unpackEventMeta)
        saveLocalEvents(mergedList)
        return mergedList
      }
    }
  } catch (e) {
    console.warn('Error reading from localStorage', e)
  }

  // Si no hay datos guardados previamente, inicializar con los eventos históricos base
  try {
    if (Array.isArray(initialEvents) && initialEvents.length > 0) {
      const cleanInitial = initialEvents.filter(e => !e.calc_code?.startsWith('SYS-') && e.cancellation_reason !== 'CONFIG_STORAGE')
      saveLocalEvents(cleanInitial)
      return cleanInitial.map(unpackEventMeta)
    }
  } catch (e) {
    console.warn('Error initializing initialEvents:', e)
  }

  return []
}

const saveLocalEvents = (events) => {
  try {
    const cleanEvents = events.filter(e => !e.calc_code?.startsWith('SYS-') && e.cancellation_reason !== 'CONFIG_STORAGE')
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleanEvents))
  } catch (e) {
    console.error('Error saving to localStorage', e)
  }
}

export const eventService = {
  // Sincronizar eventos locales creados fuera de línea hacia Supabase
  async syncPendingLocalEvents() {
    return
  },

  // Obtener todos los eventos (con sincronización transparente)
  async getEvents() {
    const locals = getLocalEvents()
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .order('event_date', { ascending: false })
          
        if (error) {
          console.warn('Supabase query error, falling back to local:', error.message)
          return locals
        }
        
        if (data) {
          const eventsOnly = data
            .filter(e => !e.calc_code?.startsWith('SYS-') && e.cancellation_reason !== 'CONFIG_STORAGE')
            .map(unpackEventMeta)
          const sorted = eventsOnly.sort((a, b) => 
            (b.event_date || '').localeCompare(a.event_date || '')
          )
          saveLocalEvents(sorted)
          return sorted
        }
        return locals
      } catch (err) {
        console.error('Supabase fetch failed, using local storage:', err)
        return locals
      }
    }
    return locals
  },

  // Forzar resincronización pura desde Supabase (limpia cualquier caché local desfasada)
  async forceSyncFromSupabase() {
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Supabase no está conectado' }
    }
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: false })

      if (error) throw error
      if (data && data.length > 0) {
        const cleanEvents = data
          .filter(e => !e.calc_code?.startsWith('SYS-') && e.cancellation_reason !== 'CONFIG_STORAGE')
          .map(unpackEventMeta)
        saveLocalEvents(cleanEvents)
        return { success: true, count: cleanEvents.length, events: cleanEvents }
      }
      return { success: false, error: 'No se encontraron datos en Supabase' }
    } catch (e) {
      console.error('Error in forceSyncFromSupabase:', e)
      return { success: false, error: e.message }
    }
  },

  // Guardar o actualizar un evento
  async saveEvent(eventData) {
    const isUuid = isUuidString(eventData.id)
    const isNew = !eventData.id || String(eventData.id).startsWith('evt-temp') || String(eventData.id).startsWith('evt-')
    
    // Generar código correlativo si no tiene
    if (!eventData.calc_code) {
      const allEvents = getLocalEvents()
      const maxNum = allEvents.reduce((max, ev) => {
        const match = (ev.calc_code || '').match(/CALC-(\d+)/)
        return match ? Math.max(max, parseInt(match[1], 10)) : max
      }, 75)
      eventData.calc_code = `CALC-${String(maxNum + 1).padStart(3, '0')}`
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const payload = {}
        const SUPABASE_EVENT_COLUMNS = new Set([
          'id', 'calc_code', 'name', 'client_name', 'client_cuit', 'client_contact',
          'event_date', 'event_time', 'month', 'venue', 'event_type', 'origin',
          'status', 'agreement_type', 'attendees', 'preventa_qty', 'preventa_price',
          'general_qty', 'general_price', 'alquiler_espacio', 'contratacion_salon',
          'extra_incomes', 'ticket_qty', 'ticket_price', 'gross_income',
          'cost_artistas', 'cost_tecnica', 'cost_disertantes', 'cost_catering',
          'cost_mobiliario', 'cost_gastronomicos', 'cost_rrhh', 'cost_limpieza',
          'cost_seguros', 'cost_alquiler_espacio', 'cost_marketing', 'cost_sadaic',
          'extra_expenses', 'direct_costs', 'indirect_costs', 'total_costs',
          'net_profit', 'barolo_profit', 'margin_pct', 'payment_method',
          'invoice_type', 'cancellation_reason', 'notes', 'created_by',
          'created_at', 'updated_at'
        ])

        Object.keys(eventData).forEach(key => {
          if (SUPABASE_EVENT_COLUMNS.has(key)) {
            payload[key] = eventData[key]
          }
        })

        // Empaquetar metadatos extendidos en notes si no son columnas nativas
        const extendedMeta = {}
        if (eventData.client_email) extendedMeta.client_email = eventData.client_email
        if (eventData.contact_date) extendedMeta.contact_date = eventData.contact_date
        if (eventData.comision_catering) extendedMeta.comision_catering = eventData.comision_catering
        if (eventData.sensitive_notes) extendedMeta.sensitive_notes = eventData.sensitive_notes

        if (Object.keys(extendedMeta).length > 0) {
          const currentNotes = payload.notes || ''
          const metaTagStart = '<!-- PB_EXT_META_START -->'
          const metaTagEnd = '<!-- PB_EXT_META_END -->'
          let cleanNotes = currentNotes
          if (cleanNotes.includes(metaTagStart) && cleanNotes.includes(metaTagEnd)) {
            const p1 = cleanNotes.split(metaTagStart)
            const p2 = p1[1].split(metaTagEnd)
            cleanNotes = (p1[0] + (p2[1] || '')).trim()
          }
          payload.notes = `${cleanNotes}\n\n${metaTagStart}\n${JSON.stringify(extendedMeta)}\n${metaTagEnd}`.trim()
        }

        if (isNew || !isUuid) {
          delete payload.id // Dejar que Supabase use/genere el UUID
          const { data, error } = await supabase
            .from('events')
            .upsert([payload], { onConflict: 'calc_code' })
            .select()
            .single()
          if (error) throw error
          const merged = unpackEventMeta({ ...eventData, ...data })
          const locals = getLocalEvents().filter(e => e.calc_code !== data.calc_code)
          saveLocalEvents([merged, ...locals])
          return { success: true, event: merged, source: 'supabase' }
        } else {
          const { data, error } = await supabase.from('events').update(payload).eq('id', eventData.id).select().single()
          if (error) throw error
          const merged = unpackEventMeta({ ...eventData, ...data })
          const locals = getLocalEvents().map(e => e.id === eventData.id ? merged : e)
          saveLocalEvents(locals)
          return { success: true, event: merged, source: 'supabase' }
        }
      } catch (err) {
        console.warn('Supabase save failed, saving to local storage:', err.message)
      }
    }

    // Modo Local
    const locals = getLocalEvents()
    let savedEvent
    if (isNew) {
      savedEvent = {
        ...eventData,
        id: `evt-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      locals.unshift(savedEvent)
    } else {
      savedEvent = {
        ...eventData,
        updated_at: new Date().toISOString()
      }
      const idx = locals.findIndex(e => e.id === eventData.id || (e.calc_code && e.calc_code === eventData.calc_code))
      if (idx !== -1) {
        locals[idx] = savedEvent
      } else {
        locals.unshift(savedEvent)
      }
    }
    saveLocalEvents(locals)
    return { success: true, event: savedEvent, source: 'local' }
  },

  // Cambiar estado de un evento (ej: Cotizado -> Reservado -> Contratado o Cancelado)
  async updateStatus(eventId, newStatus, reason = null) {
    const updatePayload = { 
      status: newStatus, 
      cancellation_reason: reason,
      updated_at: new Date().toISOString()
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const locals = getLocalEvents()
        const localEv = locals.find(e => e.id === eventId || e.calc_code === eventId)
        const isUuid = isUuidString(eventId)

        let query = supabase.from('events').update(updatePayload)
        if (isUuid) {
          query = query.eq('id', eventId)
        } else if (String(eventId).startsWith('CALC-') || String(eventId).startsWith('LC-')) {
          query = query.eq('calc_code', eventId)
        } else if (localEv?.calc_code) {
          query = query.eq('calc_code', localEv.calc_code)
        } else {
          const match = String(eventId).match(/evt-0*(\d+)/)
          if (match) {
            query = query.eq('calc_code', `CALC-${match[1].padStart(3, '0')}`)
          } else {
            query = query.eq('id', eventId)
          }
        }

        const { data, error } = await query.select().single()
          
        if (!error && data) {
          const updatedLocals = locals.map(e => 
            (e.id === eventId || (data.calc_code && e.calc_code === data.calc_code)) ? data : e
          )
          saveLocalEvents(updatedLocals)
          return { success: true, event: data, source: 'supabase' }
        } else if (error) {
          console.error('Supabase status update error:', error.message)
        }
      } catch (err) {
        console.warn('Supabase status update exception:', err)
      }
    }

    // Local fallback
    const locals = getLocalEvents()
    const idx = locals.findIndex(e => e.id === eventId || e.calc_code === eventId)
    if (idx !== -1) {
      locals[idx].status = newStatus
      if (reason) locals[idx].cancellation_reason = reason
      locals[idx].updated_at = new Date().toISOString()
      saveLocalEvents(locals)
      return { success: true, event: locals[idx], source: 'local' }
    }
    return { success: false, error: 'Evento no encontrado' }
  },

  // Eliminar evento
  async deleteEvent(eventId) {
    if (isSupabaseConfigured() && supabase) {
      try {
        const locals = getLocalEvents()
        const localEv = locals.find(e => e.id === eventId || e.calc_code === eventId)
        const isUuid = isUuidString(eventId)

        let query = supabase.from('events').delete()
        if (isUuid) {
          query = query.eq('id', eventId)
        } else if (String(eventId).startsWith('CALC-')) {
          query = query.eq('calc_code', eventId)
        } else if (localEv?.calc_code) {
          query = query.eq('calc_code', localEv.calc_code)
        } else {
          const match = String(eventId).match(/evt-0*(\d+)/)
          if (match) {
            query = query.eq('calc_code', `CALC-${match[1].padStart(3, '0')}`)
          } else {
            query = query.eq('id', eventId)
          }
        }
        await query
      } catch (err) {
        console.warn('Supabase delete failed', err)
      }
    }
    const locals = getLocalEvents().filter(e => e.id !== eventId && e.calc_code !== eventId)
    saveLocalEvents(locals)
    return { success: true }
  },

  // Reset a los datos originales
  resetToInitial() {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initialEvents))
    return initialEvents
  },

  // Agregar comentario al hilo del evento
  async addComment(eventId, comment) {
    const events = await this.getEvents()
    const target = events.find(e => e.id === eventId || e.calc_code === eventId)
    if (!target) return { success: false, error: 'Evento no encontrado' }

    const { notes, comments } = parseNotesAndComments(target.notes)
    const newComments = [...comments, comment]
    const updatedNotes = serializeNotesAndComments(notes, newComments)

    const updatedEvent = { ...target, notes: updatedNotes }
    return await this.saveEvent(updatedEvent)
  },

  // Eliminar comentario
  async deleteComment(eventId, commentId) {
    const events = await this.getEvents()
    const target = events.find(e => e.id === eventId || e.calc_code === eventId)
    if (!target) return { success: false, error: 'Evento no encontrado' }

    const { notes, comments } = parseNotesAndComments(target.notes)
    const newComments = comments.filter(c => c.id !== commentId)
    const updatedNotes = serializeNotesAndComments(notes, newComments)

    const updatedEvent = { ...target, notes: updatedNotes }
    return await this.saveEvent(updatedEvent)
  }
}

// Helpers para parsear y serializar notas, comentarios y metadatos extendidos
export function parseNotesAndComments(rawNotes) {
  if (!rawNotes) return { notes: '', comments: [], meta: {} }
  let text = String(rawNotes)
  let meta = {}

  // Parse Extended Metadata
  const metaStart = '<!-- PB_EXT_META_START -->'
  const metaEnd = '<!-- PB_EXT_META_END -->'
  if (text.includes(metaStart) && text.includes(metaEnd)) {
    const parts = text.split(metaStart)
    const before = parts[0]
    const rest = parts[1].split(metaEnd)
    try {
      meta = JSON.parse(rest[0].trim())
    } catch (e) {}
    text = (before + (rest[1] || '')).trim()
  }

  // Parse Comments
  const startTag = '<!-- PB_COMMENTS_START -->'
  const endTag = '<!-- PB_COMMENTS_END -->'
  let comments = []
  if (text.includes(startTag) && text.includes(endTag)) {
    const parts = text.split(startTag)
    const before = parts[0]
    const rest = parts[1].split(endTag)
    try {
      comments = JSON.parse(rest[0].trim())
    } catch (e) {}
    text = before.trim()
  }

  return { notes: text, comments: Array.isArray(comments) ? comments : [], meta }
}

export function unpackEventMeta(e) {
  if (!e) return e
  const { notes, comments, meta } = parseNotesAndComments(e.notes)
  return {
    ...e,
    notes,
    client_email: e.client_email || meta.client_email || '',
    contact_date: e.contact_date || meta.contact_date || '',
    comision_catering: e.comision_catering !== undefined ? Number(e.comision_catering) : (Number(meta.comision_catering) || 0),
    sensitive_notes: e.sensitive_notes || meta.sensitive_notes || '',
    comments: comments
  }
}

export function serializeNotesAndComments(notes, comments) {
  const cleanNotes = (notes || '').trim()
  if (!comments || comments.length === 0) return cleanNotes
  return `${cleanNotes}\n\n<!-- PB_COMMENTS_START -->\n${JSON.stringify(comments)}\n<!-- PB_COMMENTS_END -->`
}

