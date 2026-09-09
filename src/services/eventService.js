import { supabase, isSupabaseConfigured } from './supabaseClient'
import initialEvents from '../data/historicalEvents.json'

const LOCAL_STORAGE_KEY = 'barolo_events_data'

// Inicializar eventos locales si no existen
const getLocalEvents = () => {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
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
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(events))
  } catch (e) {
    console.error('Error saving to localStorage', e)
  }
}

export const eventService = {
  // Obtener todos los eventos
  async getEvents() {
    const locals = getLocalEvents()
    if (isSupabaseConfigured()) {
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
          // Usar datos de Supabase indexados por calc_code para evitar duplicados entre UUID y IDs locales
          const codeMap = new Map()
          data.forEach(remoteEv => {
            const key = remoteEv.calc_code || remoteEv.id
            codeMap.set(key, remoteEv)
          })
          // Preservar borradores temporales locales no sincronizados
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

  // Guardar o actualizar un evento
  async saveEvent(eventData) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventData.id)
    const isNew = !eventData.id || String(eventData.id).startsWith('evt-temp')
    
    // Generar código correlativo si no tiene
    if (!eventData.calc_code) {
      const allEvents = getLocalEvents()
      const maxNum = allEvents.reduce((max, ev) => {
        const match = (ev.calc_code || '').match(/CALC-(\d+)/)
        return match ? Math.max(max, parseInt(match[1], 10)) : max
      }, 75)
      eventData.calc_code = `CALC-${String(maxNum + 1).padStart(3, '0')}`
    }

    if (isSupabaseConfigured()) {
      try {
        const payload = { ...eventData }
        if (isNew || !isUuid) {
          delete payload.id // Dejar que Supabase use/genere el UUID
          // Usar upsert basado en calc_code
          const { data, error } = await supabase
            .from('events')
            .upsert([payload], { onConflict: 'calc_code' })
            .select()
            .single()
          if (error) throw error
          // Actualizar local
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
      const idx = locals.findIndex(e => e.id === eventData.id)
      if (idx !== -1) {
        locals[idx] = savedEvent
      } else {
        locals.unshift(savedEvent)
      }
    }
    saveLocalEvents(locals)
    return { success: true, event: savedEvent, source: 'local' }
  },

  // Cambiar estado de un evento (ej: Cotizado -> Contratado o Cancelado)
  async updateStatus(eventId, newStatus, reason = null) {
    if (isSupabaseConfigured()) {
      try {
        const updatePayload = { 
          status: newStatus, 
          cancellation_reason: reason,
          updated_at: new Date().toISOString()
        }
        const locals = getLocalEvents()
        const localEv = locals.find(e => e.id === eventId || e.calc_code === eventId)
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId)

        let query = supabase.from('events').update(updatePayload)
        if (isUuid) {
          query = query.eq('id', eventId)
        } else if (localEv?.calc_code) {
          query = query.eq('calc_code', localEv.calc_code)
        } else {
          query = query.eq('id', eventId)
        }

        const { data, error } = await query.select().single()
          
        if (!error && data) {
          const updatedLocals = locals.map(e => (e.id === eventId || (data.calc_code && e.calc_code === data.calc_code)) ? data : e)
          saveLocalEvents(updatedLocals)
          return { success: true, event: data, source: 'supabase' }
        }
      } catch (err) {
        console.warn('Supabase status update failed:', err)
      }
    }

    // Local
    const locals = getLocalEvents()
    const idx = locals.findIndex(e => e.id === eventId || (locals[e]?.calc_code === eventId))
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
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('events').delete().eq('id', eventId)
      } catch (err) {
        console.warn('Supabase delete failed', err)
      }
    }
    const locals = getLocalEvents().filter(e => e.id !== eventId)
    saveLocalEvents(locals)
    return { success: true }
  },

  // Reset a los datos originales
  resetToInitial() {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initialEvents))
    return initialEvents
  }
}
