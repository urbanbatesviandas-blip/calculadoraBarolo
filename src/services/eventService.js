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
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .order('event_date', { ascending: false })
          
        if (error) {
          console.warn('Supabase query error, falling back to local:', error.message)
          return getLocalEvents()
        }
        
        if (data && data.length > 0) {
          return data
        } else {
          // Si Supabase está vacío, podemos migrar los locales
          return getLocalEvents()
        }
      } catch (err) {
        console.error('Supabase fetch failed:', err)
        return getLocalEvents()
      }
    }
    return getLocalEvents()
  },

  // Guardar o actualizar un evento
  async saveEvent(eventData) {
    const isNew = !eventData.id || eventData.id.startsWith('evt-temp') || !eventData.id.includes('-')
    
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
        if (isNew) {
          delete payload.id // Dejar que Supabase genere el UUID
          const { data, error } = await supabase.from('events').insert([payload]).select().single()
          if (error) throw error
          // Actualizar local también
          const locals = getLocalEvents()
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
        const { data, error } = await supabase
          .from('events')
          .update(updatePayload)
          .eq('id', eventId)
          .select()
          .single()
          
        if (!error && data) {
          const locals = getLocalEvents().map(e => e.id === eventId ? data : e)
          saveLocalEvents(locals)
          return { success: true, event: data, source: 'supabase' }
        }
      } catch (err) {
        console.warn('Supabase status update failed:', err)
      }
    }

    // Local
    const locals = getLocalEvents()
    const idx = locals.findIndex(e => e.id === eventId)
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
