import React, { useState, useEffect, useMemo } from 'react'
import Navbar from './components/Navbar'
import CalendarView from './components/CalendarView'
import CalculatorView from './components/CalculatorView'
import DashboardView from './components/DashboardView'
import EventsListView from './components/EventsListView'
import EventDrilldownModal from './components/EventDrilldownModal'
import EventComparisonModal from './components/EventComparisonModal'
import CalculatorConfigView from './components/CalculatorConfigView'
import UserManagementView from './components/UserManagementView'
import UserManualView from './components/UserManualView'
import RescueConsoleView from './components/RescueConsoleView'
import DocumentPreviewModal from './components/DocumentPreviewModal'
import LoginView from './components/LoginView'
import AdminSidebar from './components/AdminSidebar'
import AiAssistantDrawer from './components/AiAssistantDrawer'
import { eventService } from './services/eventService'
import { supabase, isSupabaseConfigured } from './services/supabaseClient'
import { authService, canCreateEvent, canDeleteEvent } from './services/authService'
import { excelExportService } from './services/excelExportService'
import { htmlComparisonService } from './services/htmlComparisonService'
import { Scale, X, FileSpreadsheet, ArrowRight, MonitorPlay } from 'lucide-react'

export default function App() {
  const [currentView, setCurrentView] = useState(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase()
      const hash = window.location.hash.toLowerCase()
      if (path.includes('rescue') || path.includes('rescute') || hash.includes('rescue') || hash.includes('rescute')) {
        return 'rescue'
      }
      if (path.includes('manual')) {
        return 'manual'
      }
    }
    return 'calendar'
  }) // 'calendar', 'calculator', 'dashboard', 'list', 'calculator_config', 'users', 'manual', 'rescue'
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [calculatorEvent, setCalculatorEvent] = useState(null)
  const [calendarTargetDate, setCalendarTargetDate] = useState(null)
  const [isComparisonOpen, setIsComparisonOpen] = useState(false)
  const [isComparisonPreviewOpen, setIsComparisonPreviewOpen] = useState(false)
  const [comparisonEventIds, setComparisonEventIds] = useState([])
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser())
  const [isAdminSidebarOpen, setIsAdminSidebarOpen] = useState(false)
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)
  const [isSyncing, setIsSyncing] = useState(false)

  // Cargar eventos al iniciar
  const loadEvents = async (silent = false) => {
    if (!silent) {
      setLoading(true)
    }
    try {
      const data = await eventService.getEvents()
      setEvents(data)
    } catch (err) {
      console.error('Failed to load events:', err)
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }

  // Sincronización manual de eventos (limpiando caché local)
  const handleForceSync = async () => {
    setIsSyncing(true)
    try {
      const res = await eventService.forceSyncFromSupabase()
      if (res.success) {
        setEvents(res.events)
        showToast(`☁️ ¡Eventos sincronizados! (${res.count} eventos al día)`)
      } else {
        await loadEvents(true)
        showToast('☁️ Datos actualizados.')
      }
    } catch (err) {
      console.error('Sync failed:', err)
      showToast('⚠️ Error al actualizar datos')
    } finally {
      setIsSyncing(false)
    }
  }

  useEffect(() => {
    if (currentUser) {
      loadEvents()
    }

    // Sincronizar en segundo plano de manera silenciosa cuando la pestaña vuelve a ser visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && currentUser) {
        loadEvents(true) // silent: no muestra spinner ni interrumpe lo que está haciendo el usuario
      }
    }
    window.addEventListener('visibilitychange', handleVisibilityChange)

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
          if (currentUser) {
            loadEvents(true) // silent: actualiza los datos en segundo plano sin parpadear la pantalla
          }
        })
        .subscribe()
    }

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange)
      if (unsubscribeAuth) unsubscribeAuth()
      if (channel && supabase) {
        supabase.removeChannel(channel)
      }
    }
  }, [currentUser])

  // Listener de cambios de URL para soportar rutas directas como /rescue
  useEffect(() => {
    const handleLocationCheck = () => {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname.toLowerCase()
        const hash = window.location.hash.toLowerCase()
        if (path.includes('rescue') || path.includes('rescute') || hash.includes('rescue') || hash.includes('rescute')) {
          setCurrentView('rescue')
        }
      }
    }
    window.addEventListener('popstate', handleLocationCheck)
    window.addEventListener('hashchange', handleLocationCheck)
    return () => {
      window.removeEventListener('popstate', handleLocationCheck)
      window.removeEventListener('hashchange', handleLocationCheck)
    }
  }, [])

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Cerrar sesión
  const handleLogout = async () => {
    await authService.logout()
    setCurrentUser(null)
    showToast('Sesión cerrada correctamente.')
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

  const comparisonEvents = useMemo(() => {
    return events.filter(e => comparisonEventIds.includes(e.id))
  }, [events, comparisonEventIds])

  // Exportar todas las tablas a Excel
  const handleExportAllExcel = () => {
    excelExportService.exportAllEvents(events)
    showToast('📊 Descargando histórico completo de eventos en Excel...')
  }

  // Exportar mes actual a Excel
  const handleExportMonthExcel = () => {
    excelExportService.exportMonthEvents(events, new Date())
    showToast('📅 Descargando eventos del mes actual en Excel...')
  }

  // Guardar evento (crear o actualizar)
  const handleSaveEvent = async (eventData) => {
    const res = await eventService.saveEvent(eventData)
    if (res.success) {
      await loadEvents()
      showToast(
        eventData.status === 'cotizado' ? '📝 ¡Cotización guardada exitosamente!' :
        eventData.status === 'reservado' ? '🔵 ¡Fecha guardada como Reservada!' :
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
    setCalculatorEvent({ event_date: dateStr, isBlank: true, _ts: Date.now() })
    setCurrentView('calculator')
  }

  // Cargar cotización procesada por el Copiloto IA (WhatsApp/Texto)
  const handleAiFillCalculator = (quoteData) => {
    const draft = {
      ...quoteData,
      isAiDraft: true,
      _ts: Date.now()
    }
    setCalculatorEvent(draft)
    setCurrentView('calculator')
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('barolo-ai-fill-calculator', { detail: draft }))
    }, 60)
    showToast('✨ ¡Cotización cargada en el Cotizador desde el Copilot IA!')
  }

  const quotesCount = events.filter(e => e.status === 'cotizado').length

  // Si estamos en la consola secreta de rescate del programador (/rescue)
  if (currentView === 'rescue') {
    return (
      <RescueConsoleView
        onExitToApp={() => {
          if (typeof window !== 'undefined') {
            window.history.pushState({}, '', '/')
          }
          setCurrentView('calendar')
        }}
      />
    )
  }

  // Si no hay usuario autenticado, mostrar pantalla de ingreso directo
  if (!currentUser) {
    return (
      <LoginView 
        onLoginSuccess={(u) => {
          setCurrentUser(u)
          showToast(`¡Bienvenido/a al Palacio Barolo, ${u.name}!`)
        }} 
      />
    )
  }

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
        onOpenComparison={() => setIsComparisonOpen(true)}
        comparisonCount={comparisonEventIds.length}
        currentUser={currentUser}
        onLogout={handleLogout}
        onNewEvent={() => {
          setCalculatorEvent({ isBlank: true, _ts: Date.now() })
          setCurrentView('calculator')
        }}
        eventsCount={events.length}
        quotesCount={quotesCount}
        onForceSync={handleForceSync}
        isSyncing={isSyncing}
        onExportAllExcel={handleExportAllExcel}
        onExportMonthExcel={handleExportMonthExcel}
        onToggleAdminSidebar={() => setIsAdminSidebarOpen(true)}
        onToggleAiAssistant={() => setIsAiDrawerOpen(prev => !prev)}
        isAiDrawerOpen={isAiDrawerOpen}
      />

      {/* Main Content Area */}
      <main className={`flex-1 w-full transition-all duration-300 ease-in-out p-4 sm:p-6 lg:p-8 ${isAiDrawerOpen ? 'copilot-open-layout' : 'max-w-7xl mx-auto'}`}>
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

            <div className={currentView === 'calculator' ? 'block' : 'hidden'}>
              <CalculatorView
                initialEventData={calculatorEvent}
                onSaveEvent={handleSaveEvent}
                onSwitchView={setCurrentView}
                currentUser={currentUser}
                allEvents={events}
                isAiDrawerOpen={isAiDrawerOpen}
              />
            </div>

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

            {currentView === 'calculator_config' && (
              <CalculatorConfigView
                currentUser={currentUser}
                onNavigateToCalculator={() => {
                  setCalculatorEvent({ isBlank: true, _ts: Date.now() })
                  setCurrentView('calculator')
                }}
              />
            )}

            {currentView === 'users' && (
              <UserManagementView
                currentUser={currentUser}
                onBack={() => setCurrentView('calendar')}
              />
            )}

            {currentView === 'manual' && (
              <UserManualView
                currentUser={currentUser}
                onBack={() => setCurrentView('calendar')}
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
              className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-500 to-barolo-gold hover:from-amber-400 hover:to-amber-300 text-barolo-navy px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <span>{comparisonEvents.length < 2 ? 'Elegí 2 o más' : 'Comparar ahora'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsComparisonPreviewOpen(true)}
              disabled={comparisonEvents.length < 2}
              className="flex items-center space-x-1 bg-barolo-gold hover:bg-barolo-gold-light text-barolo-navy px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm border border-barolo-gold-dark/30"
              title="Vista previa interactiva de la comparativa en HTML"
            >
              <MonitorPlay className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">HTML</span>
            </button>

            <button
              onClick={() => excelExportService.exportComparison(comparisonEvents)}
              disabled={comparisonEvents.length < 2}
              className="flex items-center space-x-1 bg-emerald-700/80 hover:bg-emerald-600 text-white px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Descargar comparativa en Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Excel</span>
            </button>

            <button
              onClick={handleClearComparison}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
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

      {/* Event Comparison Modal */}
      <EventComparisonModal
        isOpen={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
        events={comparisonEvents}
        onRemoveEvent={(id) => handleToggleComparison({ id })}
      />

      {/* Admin Lateral Sidebar (Menú del Engranaje ⚙️) */}
      <AdminSidebar
        isOpen={isAdminSidebarOpen}
        onClose={() => setIsAdminSidebarOpen(false)}
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* 🪄 Copiloto IA del Palacio Barolo (Gemini Assistant Drawer) */}
      {currentUser && (
        <AiAssistantDrawer
          isOpen={isAiDrawerOpen}
          onClose={() => setIsAiDrawerOpen(false)}
          onToggle={() => setIsAiDrawerOpen(prev => !prev)}
          events={events}
          currentView={currentView}
          onFillCalculator={handleAiFillCalculator}
        />
      )}

      {/* Modal de Vista Previa de Comparativa */}
      {isComparisonPreviewOpen && comparisonEvents.length >= 2 && (
        <DocumentPreviewModal
          isOpen={isComparisonPreviewOpen}
          onClose={() => setIsComparisonPreviewOpen(false)}
          title={`Comparativa de ${comparisonEvents.length} Eventos`}
          subtitle="Matriz interactiva de facturación, estructura de costos y rentabilidad"
          htmlContent={htmlComparisonService.generateComparisonHtml(comparisonEvents)}
          filename={`Comparativa_Palacio_Barolo_${comparisonEvents.length}_Eventos_${new Date().toISOString().slice(0, 10)}.html`}
          badge="Comparativa Interactiva"
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} Palacio Barolo — Sistema de Gestión Comercial, Calendario & Rentabilidad de Eventos.</p>
      </footer>

    </div>
  )
}
