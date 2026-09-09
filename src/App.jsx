import React, { useState, useEffect, useMemo } from 'react'
import Navbar from './components/Navbar'
import CalendarView from './components/CalendarView'
import CalculatorView from './components/CalculatorView'
import DashboardView from './components/DashboardView'
import EventsListView from './components/EventsListView'
import EventDrilldownModal from './components/EventDrilldownModal'
import SettingsModal from './components/SettingsModal'
import LoginModal from './components/LoginModal'
import EventComparisonModal from './components/EventComparisonModal'
import { eventService } from './services/eventService'
import { supabase, isSupabaseConfigured } from './services/supabaseClient'
import { authService, canCreateEvent, canDeleteEvent } from './services/authService'
import { excelExportService } from './services/excelExportService'
import { Scale, X, FileSpreadsheet, ArrowRight } from 'lucide-react'

export default function App() {
  const [currentView, setCurrentView] = useState('calendar') // 'calendar', 'calculator', 'dashboard', 'list'
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [calculatorEvent, setCalculatorEvent] = useState(null)
  const [calendarTargetDate, setCalendarTargetDate] = useState(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [isComparisonOpen, setIsComparisonOpen] = useState(false)
  const [comparisonEventIds, setComparisonEventIds] = useState([])
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser())
  const [toastMessage, setToastMessage] = useState(null)
  const [isSyncing, setIsSyncing] = useState(false)

  // Cargar eventos al iniciar
  const loadEvents = async () => {
    setLoading(true)
    try {
      const data = await eventService.getEvents()
      setEvents(data)
    } catch (err) {
      console.error('Failed to load events:', err)
    } finally {
      setLoading(false)
    }
  }

  // Forzar sincronización manual desde la Nube (limpiando caché local)
  const handleForceSync = async () => {
    setIsSyncing(true)
    try {
      const res = await eventService.forceSyncFromSupabase()
      if (res.success) {
        setEvents(res.events)
        showToast(`☁️ ¡Sincronizado con Supabase! (${res.count} eventos al día)`)
      } else {
        await loadEvents()
        showToast('☁️ Datos actualizados desde la Nube.')
      }
    } catch (err) {
      console.error('Sync failed:', err)
      showToast('⚠️ Error al sincronizar con la nube')
    } finally {
      setIsSyncing(false)
    }
  }

  useEffect(() => {
    loadEvents()

    // Sincronizar automáticamente cuando el usuario regresa a la app en celular o PC
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('App resumed, reloading events...')
        loadEvents()
      }
    }
    window.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleVisibilityChange)

    // Listener de cambios de autenticación
    const unsubscribeAuth = authService.onAuthStateChanged((user) => {
      setCurrentUser(user)
    })

    // Suscripción Realtime para sincronizar automáticamente celular, PC y otros dispositivos
    let channel = null
    if (isSupabaseConfigured() && supabase) {
      channel = supabase
        .channel('public:events_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, (payload) => {
          console.log('⚡ Realtime update:', payload.eventType)
          loadEvents()
        })
        .subscribe()
    }

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleVisibilityChange)
      if (unsubscribeAuth) unsubscribeAuth()
      if (channel && supabase) {
        supabase.removeChannel(channel)
      }
    }
  }, [])

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Alternar selección de eventos para la comparativa
  const handleToggleComparison = (event) => {
    setComparisonEventIds(prev => {
      const exists = prev.includes(event.id)
      if (exists) {
        return prev.filter(id => id !== event.id)
      } else {
        if (prev.length >= 6) {
          showToast('⚠️ Podés comparar hasta un máximo de 6 eventos a la vez.')
          return prev
        }
        showToast(`⚖️ Agregado a la comparativa: ${event.name}`)
        return [...prev, event.id]
      }
    })
  }

  const handleClearComparison = () => {
    setComparisonEventIds([])
    showToast('Comparativa vaciada.')
  }

  // Lista de eventos seleccionados para comparar
  const comparisonEvents = useMemo(() => {
    return events.filter(e => comparisonEventIds.includes(e.id))
  }, [events, comparisonEventIds])

  // Manejo de descargas Excel
  const handleExportAllExcel = () => {
    if (events.length === 0) {
      showToast('⚠️ No hay eventos para exportar')
      return
    }
    excelExportService.exportAllEvents(events)
    showToast(`📥 Exportando los ${events.length} eventos a Excel...`)
  }

  const handleExportMonthExcel = () => {
    if (events.length === 0) {
      showToast('⚠️ No hay eventos para exportar')
      return
    }
    const monthStr = calendarTargetDate ? calendarTargetDate.substring(0, 7) : '2026-09'
    excelExportService.exportMonthEvents(events, monthStr)
    showToast(`📥 Exportando planilla del mes ${monthStr} a Excel...`)
  }

  // Guardar evento desde la Calculadora
  const handleSaveEvent = async (eventData, targetStatus) => {
    const res = await eventService.saveEvent(eventData)
    if (res.success) {
      await loadEvents()
      setCalculatorEvent(null)
      if (eventData.event_date) {
        setCalendarTargetDate(eventData.event_date)
      }
      showToast(
        targetStatus === 'cotizado' ? '📝 ¡Cotización guardada con éxito!' :
        targetStatus === 'reservado' ? '🔵 ¡Fecha guardada como Reservada!' :
        '💾 ¡Evento contratado confirmado!'
      )
      setCurrentView('calendar')
    }
  }

  // Actualizar estado de un evento (ej: Cotizado -> Contratado o Reservado)
  const handleUpdateStatus = async (eventId, newStatus, reason = null) => {
    const res = await eventService.updateStatus(eventId, newStatus, reason)
    if (res.success) {
      await loadEvents()
      if (selectedEvent && selectedEvent.id === eventId) {
        setSelectedEvent(res.event)
      }
      showToast(
        newStatus === 'contratado' ? '🎉 ¡Evento confirmado y pasado a Contratado oficial!' :
        newStatus === 'reservado' ? '🔵 ¡Fecha bloqueada como Reservado!' :
        newStatus === 'cancelado' ? '❌ Evento marcado como Cancelado.' :
        'Evento actualizado.'
      )
    }
  }

  // Eliminar evento
  const handleDeleteEvent = async (eventId) => {
    const res = await eventService.deleteEvent(eventId)
    if (res.success) {
      await loadEvents()
      // Si estaba en comparativa, removerlo
      setComparisonEventIds(prev => prev.filter(id => id !== eventId))
      showToast('Evento eliminado.')
    }
  }

  // Abrir evento en la Calculadora
  const handleEditInCalculator = (event) => {
    setCalculatorEvent(event)
    setSelectedEvent(null)
    setCurrentView('calculator')
  }

  // Crear nuevo evento en fecha específica del calendario
  const handleNewEventAtDate = (dateStr) => {
    setCalculatorEvent({ event_date: dateStr })
    setCurrentView('calculator')
  }

  const quotesCount = events.filter(e => e.status === 'cotizado').length

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-amber-200 selection:text-amber-900 pb-16">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-24 right-6 z-50 bg-barolo-navy text-white px-5 py-3 rounded-2xl shadow-2xl border border-barolo-gold/50 flex items-center space-x-2 animate-bounce text-xs font-bold">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation */}
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenLogin={() => setIsLoginOpen(true)}
        onOpenComparison={() => setIsComparisonOpen(true)}
        comparisonCount={comparisonEventIds.length}
        currentUser={currentUser}
        onNewEvent={() => {
          setCalculatorEvent(null)
          setCurrentView('calculator')
        }}
        eventsCount={events.length}
        quotesCount={quotesCount}
        onForceSync={handleForceSync}
        isSyncing={isSyncing}
        onExportAllExcel={handleExportAllExcel}
        onExportMonthExcel={handleExportMonthExcel}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-semibold text-slate-500">Cargando eventos del Palacio Barolo...</p>
          </div>
        ) : (
          <>
            {currentView === 'calendar' && (
              <CalendarView
                events={events}
                targetDate={calendarTargetDate}
                onSelectEvent={(ev) => setSelectedEvent(ev)}
                onNewEventAtDate={handleNewEventAtDate}
                onEditInCalculator={handleEditInCalculator}
                onUpdateStatus={handleUpdateStatus}
                onClearTargetDate={() => setCalendarTargetDate(null)}
                currentUser={currentUser}
                comparisonEventIds={comparisonEventIds}
                onToggleComparison={handleToggleComparison}
              />
            )}

            {currentView === 'calculator' && (
              <CalculatorView
                initialEventData={calculatorEvent}
                onSaveEvent={handleSaveEvent}
                onSwitchView={setCurrentView}
                currentUser={currentUser}
              />
            )}

            {currentView === 'dashboard' && (
              <DashboardView
                events={events}
                onSelectEvent={(ev) => setSelectedEvent(ev)}
              />
            )}

            {currentView === 'list' && (
              <EventsListView
                events={events}
                onSelectEvent={(ev) => setSelectedEvent(ev)}
                onEditInCalculator={handleEditInCalculator}
                onDeleteEvent={handleDeleteEvent}
                currentUser={currentUser}
                comparisonEventIds={comparisonEventIds}
                onToggleComparison={handleToggleComparison}
                onOpenComparison={() => setIsComparisonOpen(true)}
              />
            )}
          </>
        )}
      </main>

      {/* Barra Flotante de Comparativa Activa */}
      {comparisonEvents.length > 0 && (
        <aside aria-label="Bandeja de Comparativa de Eventos" className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40 bg-barolo-navy/95 backdrop-blur-md text-white border border-amber-400/60 rounded-2xl shadow-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 max-w-4xl w-[94%] animate-in slide-in-from-bottom-5">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <Scale className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                  Comparativa de Eventos
                </span>
                <span className="bg-white/20 text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {comparisonEvents.length} / 6
                </span>
              </div>
              <div className="flex items-center space-x-1.5 overflow-x-auto max-w-xs sm:max-w-md py-1">
                {comparisonEvents.map(e => (
                  <span key={e.id} className="inline-flex items-center space-x-1 bg-white/10 hover:bg-white/20 text-[11px] px-2 py-0.5 rounded-lg font-medium text-slate-200">
                    <span className="truncate max-w-[90px]">{e.name}</span>
                    <button onClick={() => handleToggleComparison(e)} className="hover:text-rose-400" title="Quitar">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            <button
              onClick={() => setIsComparisonOpen(true)}
              disabled={comparisonEvents.length < 2}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-500 to-barolo-gold hover:from-amber-400 hover:to-amber-300 text-barolo-navy px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>{comparisonEvents.length < 2 ? 'Elegí 2 o más' : 'Comparar ahora'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => excelExportService.exportComparison(comparisonEvents)}
              disabled={comparisonEvents.length < 2}
              className="flex items-center space-x-1 bg-emerald-700/80 hover:bg-emerald-600 text-white px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title="Descargar comparativa en Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Excel</span>
            </button>

            <button
              onClick={handleClearComparison}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              title="Limpiar selección"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}

      {/* Event Drilldown Modal (Rentabilidad x Evento) */}
      {selectedEvent && (
        <EventDrilldownModal
          event={selectedEvent}
          currentUser={currentUser}
          onClose={() => setSelectedEvent(null)}
          onUpdateStatus={handleUpdateStatus}
          onEditInCalculator={handleEditInCalculator}
        />
      )}

      {/* Login & User Management Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onUserChange={(u) => {
          setCurrentUser(u)
          showToast(`👤 Perfil activo: ${u.displayName} (${u.roleBadge?.title || u.role})`)
        }}
      />

      {/* Event Comparison Modal */}
      <EventComparisonModal
        isOpen={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
        events={comparisonEvents}
        onRemoveEvent={(id) => handleToggleComparison({ id })}
      />

      {/* Settings Modal (Supabase Cloud Config) */}
      {isSettingsOpen && (
        <SettingsModal
          onClose={() => setIsSettingsOpen(false)}
          onConfigSaved={() => {
            loadEvents()
            showToast('Conexión con Supabase actualizada')
          }}
          onResetData={() => {
            eventService.resetToInitial()
            loadEvents()
            showToast('Datos restablecidos a los 81 eventos originales')
          }}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} Palacio Barolo — Sistema de Gestión Comercial, Calendario & Rentabilidad de Eventos.</p>
      </footer>

    </div>
  )
}
