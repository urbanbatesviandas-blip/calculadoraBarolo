import { supabase, isSupabaseConfigured } from './supabaseClient'
import initialEvents from '../data/historicalEvents.json'

const LOCAL_STORAGE_KEY = 'barolo_events_data'

const isUuidString = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

// Inicializar eventos locales si no existen
const getLocalEvents = () => {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Auto-deduplicar por calc_code o ID para limpiar de raíz cualquier duplicación vieja en PC
        const seen = new Map()
        parsed.filter(e => !e.calc_code?.startsWith('SYS-') && e.cancellation_reason !== 'CONFIG_STORAGE').forEach(item => {
          const key = item.calc_code || item.id
          if (!seen.has(key) || isUuidString(item.id)) {
            seen.set(key, item)
          }
        })
        const clean = Array.from(seen.values())
        if (clean.length !== parsed.length) {
          console.log(`Auto-cleaned duplicate/system events from localStorage`)
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(clean))
          } catch (e) {}
        }
        return clean
      }
    }
  } catch (e) {
    console.warn('Error reading from localStorage', e)
  }
  // Guardar datos iniciales
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initialEvents))
  } catch (e) {}
  return initialEvents
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
  async syncPendingLocalEvents(remoteEvents = []) {
    if (!isSupabaseConfigured() || !supabase) return
    const locals = getLocalEvents()
    const remoteCodes = new Set(remoteEvents.map(e => e.calc_code).filter(Boolean))

    const pending = locals.filter(e => {
      // Si el ID es temporal local (evt-...) y su código no está en Supabase
      const isLocalId = String(e.id).startsWith('evt-') && !isUuidString(e.id)
      return isLocalId && (!e.calc_code || !remoteCodes.has(e.calc_code))
    })

    for (const localEv of pending) {
      try {
        const payload = { ...localEv }
        delete payload.id // Permitir que Supabase genere el UUID
        await supabase.from('events').upsert([payload], { onConflict: 'calc_code' })
      } catch (err) {
        console.warn('Error syncing pending local event to Supabase:', err)
      }
    }
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
        
        if (data && data.length > 0) {
          const eventsOnly = data.filter(e => !e.calc_code?.startsWith('SYS-') && e.cancellation_reason !== 'CONFIG_STORAGE')
          
          // Intentar subir borradores o eventos que pudieran haber quedado solo en este navegador
          await this.syncPendingLocalEvents(eventsOnly)

          // Usar datos de Supabase como única fuente de verdad indexada por calc_code
          const codeMap = new Map()
          eventsOnly.forEach(remoteEv => {
            const key = remoteEv.calc_code || remoteEv.id
            codeMap.set(key, remoteEv)
          })

          // Si hay algún borrador estrictamente nuevo aún no subido
          locals.forEach(localEv => {
            const key = localEv.calc_code || localEv.id
            if (!codeMap.has(key) && String(localEv.id).startsWith('evt-temp')) {
              codeMap.set(key, localEv)
            }
          })

          const merged = Array.from(codeMap.values()).sort((a, b) => 
            (b.event_date || '').localeCompare(a.event_date || '')
          )
          saveLocalEvents(merged)
          return merged
        } else {
          return locals
        }
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
        const cleanEvents = data.filter(e => !e.calc_code?.startsWith('SYS-') && e.cancellation_reason !== 'CONFIG_STORAGE')
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
        const payload = { ...eventData }
        if (isNew || !isUuid) {
          delete payload.id // Dejar que Supabase use/genere el UUID
          const { data, error } = await supabase
            .from('events')
            .upsert([payload], { onConflict: 'calc_code' })
            .select()
            .single()
          if (error) throw error
          const locals = getLocalEvents().filter(e => e.calc_code !== data.calc_code)
          saveLocalEvents([data, ...locals])
          return { success: true, event: data, source: 'supabase' }
        } else {
          const { data, error } = await supabase.from('events').update(payload).eq('id', eventData.id).select().single()
          if (error) throw error
          const locals = getLocalEvents().map(e => e.id === eventData.id ? data : e)
          saveLocalEvents(locals)
          return { success: true, event: data, source: 'supabase' }
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

// Helpers para parsear y serializar notas y comentarios embebidos
export function parseNotesAndComments(rawNotes) {
  if (!rawNotes) return { notes: '', comments: [] }
  const startTag = '<!-- PB_COMMENTS_START -->'
  const endTag = '<!-- PB_COMMENTS_END -->'
  if (rawNotes.includes(startTag) && rawNotes.includes(endTag)) {
    const parts = rawNotes.split(startTag)
    const notes = parts[0].trim()
    const commentPart = parts[1].split(endTag)[0].trim()
    try {
      const comments = JSON.parse(commentPart)
      return { notes, comments: Array.isArray(comments) ? comments : [] }
    } catch (e) {
      return { notes, comments: [] }
    }
  }
  return { notes: rawNotes, comments: [] }
}

export function serializeNotesAndComments(notes, comments) {
  const cleanNotes = (notes || '').trim()
  if (!comments || comments.length === 0) return cleanNotes
  return `${cleanNotes}\n\n<!-- PB_COMMENTS_START -->\n${JSON.stringify(comments)}\n<!-- PB_COMMENTS_END -->`
}

