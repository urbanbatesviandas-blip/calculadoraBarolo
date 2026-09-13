import { supabase, isSupabaseConfigured } from './supabaseClient'
import initialEvents from '../data/historicalEvents.json'

const LOCAL_STORAGE_KEY = 'barolo_events_v3'
const VAULT_STORAGE_KEY = 'barolo_recovery_vault_v1'
const SNAPSHOT_STORAGE_KEY = 'barolo_auto_snapshots_v1'

const isUuidString = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

// Helper para filtrar datos válidos activos (excluye registros de sistema y eventos con soft-delete)
const isNotDeleted = (e) => {
  if (!e) return false
  if (e.calc_code?.startsWith('SYS-')) return false
  if (e.cancellation_reason === 'CONFIG_STORAGE') return false
  if (e.cancellation_reason === 'SOFT_DELETED') return false
  if (e.is_deleted === true) return false
  return true
}

// Bóveda de eventos eliminados para recuperación por programadores / administradores
const saveToDeletedVault = (deletedEvent) => {
  try {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY)
    const list = raw ? JSON.parse(raw) : []
    const updated = [deletedEvent, ...list.filter(item => (item.id !== deletedEvent.id && item.calc_code !== deletedEvent.calc_code))].slice(0, 100)
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(updated))
  } catch (err) {
    console.warn('Silent vault save warning:', err)
  }
}

const getDeletedVault = () => {
  try {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    return []
  }
}

// Bóveda de Snapshots automáticos en segundo plano
const updateSilentSnapshot = (currentEvents) => {
  try {
    const active = currentEvents.filter(isNotDeleted)
    const snapshot = {
      id: `snap-${Date.now()}`,
      timestamp: new Date().toISOString(),
      count: active.length,
      events: active
    }
    const raw = localStorage.getItem(SNAPSHOT_STORAGE_KEY)
    const list = raw ? JSON.parse(raw) : []
    const updated = [snapshot, ...list].slice(0, 20)
    localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(updated))

    if (isSupabaseConfigured() && supabase) {
      supabase.from('events').upsert({
        calc_code: 'SYS-BACKUP-SNAPSHOT',
        name: 'Sistema - Snapshot Automático de Seguridad',
        notes: JSON.stringify({
          updatedAt: snapshot.timestamp,
          count: snapshot.count,
          data: snapshot.events
        }),
        event_date: new Date().toISOString().slice(0, 10),
        status: 'sistema'
      }, { onConflict: 'calc_code' }).then(() => {}).catch(() => {})
    }
  } catch (err) {
    console.warn('Silent snapshot warning:', err)
  }
}

// Inicializar eventos locales si no existen
const getLocalEvents = () => {
  try {
    if (localStorage.getItem('barolo_events_data')) localStorage.removeItem('barolo_events_data')
    if (localStorage.getItem('barolo_events_v2')) localStorage.removeItem('barolo_events_v2')
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (saved !== null) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) {
        const seen = new Map()
        parsed.filter(isNotDeleted).forEach(item => {
          const key = item.calc_code || item.id
          if (!seen.has(key) || isUuidString(item.id)) {
            seen.set(key, item)
          }
        })
        // Incorporar automáticamente nuevos eventos históricos oficiales (ej: LC-076) si no existían
        if (Array.isArray(initialEvents)) {
          initialEvents.filter(isNotDeleted).forEach(item => {
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
      const cleanInitial = initialEvents.filter(isNotDeleted)
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
    const cleanEvents = events.filter(isNotDeleted)
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleanEvents))
    updateSilentSnapshot(cleanEvents)
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
            .filter(isNotDeleted)
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
          .filter(isNotDeleted)
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
        if (eventData.invitaciones_qty !== undefined) extendedMeta.invitaciones_qty = eventData.invitaciones_qty
        if (eventData.event_costs) extendedMeta.event_costs = eventData.event_costs
        if (eventData.event_incomes) extendedMeta.event_incomes = eventData.event_incomes

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
  // Eliminar evento (SOFT DELETE seguro: nunca destruye datos, resguarda en bóveda de recuperación)
  async deleteEvent(eventId) {
    const locals = getLocalEvents()
    const target = locals.find(e => e.id === eventId || e.calc_code === eventId)

    // Resguardar copia completa en la bóveda silenciosa de recuperación
    if (target) {
      saveToDeletedVault({
        ...target,
        deleted_at: new Date().toISOString()
      })
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const isUuid = isUuidString(eventId)
        let query = supabase.from('events').update({
          cancellation_reason: 'SOFT_DELETED',
          updated_at: new Date().toISOString()
        })

        if (isUuid) {
          query = query.eq('id', eventId)
        } else if (String(eventId).startsWith('CALC-') || String(eventId).startsWith('LC-')) {
          query = query.eq('calc_code', eventId)
        } else if (target?.calc_code) {
          query = query.eq('calc_code', target.calc_code)
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
        console.warn('Supabase soft-delete fallback to vault:', err)
      }
    }

    const localsRemaining = locals.filter(e => e.id !== eventId && e.calc_code !== eventId)
    saveLocalEvents(localsRemaining)
    return { success: true }
  },

  // Restaurar un evento eliminado desde la bóveda o Supabase
  async restoreDeletedEvent(identifier) {
    const vault = getDeletedVault()
    const target = vault.find(e => e.id === identifier || e.calc_code === identifier)

    if (isSupabaseConfigured() && supabase) {
      try {
        const isUuid = isUuidString(identifier)
        let query = supabase.from('events').update({
          cancellation_reason: null,
          updated_at: new Date().toISOString()
        })
        if (isUuid) {
          query = query.eq('id', identifier)
        } else {
          query = query.eq('calc_code', identifier)
        }
        await query
      } catch (err) {
        console.warn('Supabase restore warning:', err)
      }
    }

    if (target) {
      const restored = {
        ...target,
        cancellation_reason: null,
        updated_at: new Date().toISOString()
      }
      delete restored.deleted_at

      const updatedVault = vault.filter(e => e.id !== identifier && e.calc_code !== identifier)
      localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(updatedVault))

      await this.saveEvent(restored)
      return { success: true, restored }
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const isUuid = isUuidString(identifier)
        let query = supabase.from('events').select('*')
        if (isUuid) query = query.eq('id', identifier)
        else query = query.eq('calc_code', identifier)
        const { data } = await query.single()
        if (data) {
          const restored = unpackEventMeta({ ...data, cancellation_reason: null })
          await this.saveEvent(restored)
          return { success: true, restored }
        }
      } catch (e) {}
    }

    return { success: false, error: `Evento ${identifier} no encontrado en la bóveda de recuperación` }
  },

  // Obtener copias de seguridad automáticas
  getSnapshots() {
    try {
      const raw = localStorage.getItem(SNAPSHOT_STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch (e) {
      return []
    }
  },

  // Restaurar un snapshot de seguridad completo
  async restoreSnapshot(snapshotId) {
    try {
      const snaps = this.getSnapshots()
      const target = snapshotId ? snaps.find(s => s.id === snapshotId) : snaps[0]
      if (!target || !Array.isArray(target.events) || target.events.length === 0) {
        return { success: false, error: 'Snapshot no encontrado o sin eventos válidos' }
      }

      saveLocalEvents(target.events)

      if (isSupabaseConfigured() && supabase) {
        for (const ev of target.events) {
          await this.saveEvent(ev).catch(() => {})
        }
      }

      return { success: true, count: target.events.length, snapshot: target }
    } catch (err) {
      return { success: false, error: err.message }
    }
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
    invitaciones_qty: e.invitaciones_qty !== undefined ? Number(e.invitaciones_qty) : (Number(meta.invitaciones_qty) || 0),
    event_costs: Array.isArray(e.event_costs) ? e.event_costs : (Array.isArray(meta.event_costs) ? meta.event_costs : undefined),
    event_incomes: Array.isArray(e.event_incomes) ? e.event_incomes : (Array.isArray(meta.event_incomes) ? meta.event_incomes : undefined),
    comments: comments
  }
}

export function serializeNotesAndComments(notes, comments) {
  const cleanNotes = (notes || '').trim()
  if (!comments || comments.length === 0) return cleanNotes
  return `${cleanNotes}\n\n<!-- PB_COMMENTS_START -->\n${JSON.stringify(comments)}\n<!-- PB_COMMENTS_END -->`
}

// =========================================================================
// BÓVEDA SILENCIOSA DE RESCATE PARA DESARROLLADORES / ADMINISTRADORES
// =========================================================================
if (typeof window !== 'undefined') {
  window.baroloRescue = {
    help: () => {
      console.log(`%c
======================================================
🛡️  PALACIO BAROLO - CONSOLA DE RESCATE (ADMIN/DEV)
======================================================
Comandos disponibles para recuperar datos:

1. baroloRescue.listDeleted()
   Muestra la tabla de todos los eventos eliminados (Soft-Delete)
   con sus códigos (ej: CALC-005), fechas y nombre del cliente.

2. baroloRescue.restoreEvent('CALC-005')
   Restaura de inmediato el evento indicado a la grilla activa.

3. baroloRescue.listSnapshots()
   Muestra el historial de puntos de restauración automáticos (Snapshots).

4. baroloRescue.restoreSnapshot('id_snapshot')
   Restaura la base de datos completa al estado de dicho snapshot.
   (Si se omite el ID, restaura el último snapshot guardado).
======================================================`, 'color: #38bdf8; font-family: monospace; font-size: 12px;')
      return 'Consola de rescate activa. Ejecute baroloRescue.listDeleted() para comenzar.'
    },

    listDeleted: () => {
      const vault = getDeletedVault()
      console.log(`%c[Barolo Rescue] ${vault.length} evento(s) en la bóveda de recuperación:`, 'color: #10b981; font-weight: bold;')
      if (vault.length === 0) {
        console.info('La bóveda está limpia. No hay eventos eliminados recientemente.')
        return []
      }
      console.table(vault.map(e => ({
        Codigo: e.calc_code || e.id,
        Cliente_o_Evento: e.name || e.client_name,
        Fecha_Evento: e.event_date,
        Estado_Original: e.status,
        Eliminado_El: e.deleted_at || 'Reciente'
      })))
      return vault
    },

    restoreEvent: async (identifier) => {
      if (!identifier) {
        console.warn('Debe indicar el código o ID del evento. Ejemplo: baroloRescue.restoreEvent("CALC-005")')
        return null
      }
      console.log(`%c[Barolo Rescue] Restaurando ${identifier}...`, 'color: #3b82f6; font-weight: bold;')
      const res = await eventService.restoreDeletedEvent(identifier)
      if (res.success) {
        console.log(`%c[Barolo Rescue] Evento ${res.restored?.calc_code || identifier} restaurado exitosamente! Recargue la página para actualizar las vistas.`, 'color: #10b981; font-weight: bold;')
        return res.restored
      } else {
        console.error('[Barolo Rescue] Error:', res.error)
        return null
      }
    },

    listSnapshots: () => {
      const snaps = eventService.getSnapshots()
      console.log(`%c[Barolo Rescue] ${snaps.length} puntos de restauración automáticos disponibles:`, 'color: #10b981; font-weight: bold;')
      if (snaps.length === 0) {
        console.info('No hay snapshots registrados todavía.')
        return []
      }
      console.table(snaps.map(s => ({
        ID: s.id,
        Fecha_Hora: s.timestamp,
        Cantidad_Eventos: s.count
      })))
      return snaps
    },

    restoreSnapshot: async (snapshotId) => {
      console.log(`%c[Barolo Rescue] Restaurando punto de guardado ${snapshotId || '(último disponible)'}...`, 'color: #f59e0b; font-weight: bold;')
      const res = await eventService.restoreSnapshot(snapshotId)
      if (res.success) {
        console.log(`%c[Barolo Rescue] ¡Restauración exitosa! Se recuperaron ${res.count} eventos. Recargue la página para aplicar los cambios.`, 'color: #10b981; font-weight: bold;')
        return res
      } else {
        console.error('[Barolo Rescue] Error al restaurar snapshot:', res.error)
        return null
      }
    }
  }
}


