import React, { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import CalendarView from './components/CalendarView'
import CalculatorView from './components/CalculatorView'
import DashboardView from './components/DashboardView'
import EventsListView from './components/EventsListView'
import EventDrilldownModal from './components/EventDrilldownModal'
import SettingsModal from './components/SettingsModal'
import { eventService } from './services/eventService'

export default function App() {
  const [currentView, setCurrentView] = useState('calendar') // 'calendar', 'calculator', 'dashboard', 'list'
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [calculatorEvent, setCalculatorEvent] = useState(null)
  const [calendarTargetDate, setCalendarTargetDate] = useState(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState(null)

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

  useEffect(() => {
    loadEvents()
  }, [])

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
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
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-amber-200 selection:text-amber-900">
      
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
        onNewEvent={() => {
          setCalculatorEvent(null)
          setCurrentView('calculator')
        }}
        eventsCount={events.length}
        quotesCount={quotesCount}
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
              />
            )}

            {currentView === 'calculator' && (
              <CalculatorView
                initialEventData={calculatorEvent}
                onSaveEvent={handleSaveEvent}
                onSwitchView={setCurrentView}
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
              />
            )}
          </>
        )}
      </main>

      {/* Event Drilldown Modal (Rentabilidad x Evento) */}
      {selectedEvent && (
        <EventDrilldownModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onUpdateStatus={handleUpdateStatus}
          onEditInCalculator={handleEditInCalculator}
        />
      )}

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
