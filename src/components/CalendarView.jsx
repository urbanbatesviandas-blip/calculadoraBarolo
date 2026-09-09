import React, { useState, useMemo } from 'react'
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  isSameMonth, isSameDay, addDays, parseISO 
} from 'date-fns'
import { es } from 'date-fns/locale'
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, 
  MapPin, DollarSign, Users, TrendingUp, Sparkles, CheckCircle2, Clock, AlertCircle, XCircle 
} from 'lucide-react'

export default function CalendarView({ events, onSelectEvent, onNewEventAtDate }) {
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 8, 1)) // Septiembre 2026
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedVenue, setSelectedVenue] = useState('all')

  // Navegación de mes
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const todayMonth = () => setCurrentMonth(new Date())

  // Filtrado de eventos
  const filteredEvents = useMemo(() => {
    return events.filter(ev => {
      if (selectedStatus !== 'all' && ev.status !== selectedStatus) return false
      if (selectedVenue !== 'all' && !ev.venue.toLowerCase().includes(selectedVenue.toLowerCase())) return false
      return true
    })
  }, [events, selectedStatus, selectedVenue])

  // Agrupar eventos por fecha (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map = {}
    filteredEvents.forEach(ev => {
      const d = ev.event_date ? ev.event_date.substring(0, 10) : ''
      if (d) {
        if (!map[d]) map[d] = []
        map[d].push(ev)
      }
    })
    return map
  }, [filteredEvents])

  // Métricas del mes visible
  const monthStats = useMemo(() => {
    const monthStr = format(currentMonth, 'yyyy-MM')
    const inMonth = filteredEvents.filter(e => e.event_date && e.event_date.startsWith(monthStr))
    
    const count = inMonth.length
    const confirmed = inMonth.filter(e => e.status === 'contratado').length
    const reserved = inMonth.filter(e => e.status === 'reservado').length
    const quoted = inMonth.filter(e => e.status === 'cotizado').length
    const canceled = inMonth.filter(e => e.status === 'cancelado').length
    
    const grossTotal = inMonth
      .filter(e => e.status !== 'cancelado')
      .reduce((acc, e) => acc + (Number(e.gross_income) || 0), 0)
      
    const baroloTotal = inMonth
      .filter(e => e.status !== 'cancelado')
      .reduce((acc, e) => acc + (Number(e.barolo_profit) || 0), 0)

    return { count, confirmed, reserved, quoted, canceled, grossTotal, baroloTotal }
  }, [filteredEvents, currentMonth])

  // Generar cuadrícula de días del calendario
  const renderCalendarDays = () => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }) // Lunes
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })

    const days = []
    let day = startDate

    while (day <= endDate) {
      days.push(day)
      day = addDays(day, 1)
    }

    return days.map((dayItem, idx) => {
      const dateKey = format(dayItem, 'yyyy-MM-dd')
      const dayEvents = eventsByDate[dateKey] || []
      const isCurrentMonth = isSameMonth(dayItem, monthStart)
      const isToday = isSameDay(dayItem, new Date())

      return (
        <div
          key={idx}
          className={`min-h-[125px] border-b border-r border-slate-200 p-2 flex flex-col transition-colors ${
            !isCurrentMonth ? 'bg-slate-50/70 text-slate-400' : 'bg-white text-slate-800'
          } ${isToday ? 'ring-2 ring-amber-400 ring-inset bg-amber-50/30' : ''}`}
        >
          <div className="flex items-center justify-between mb-1">
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                isToday 
                  ? 'bg-barolo-navy text-amber-300 font-bold' 
                  : isCurrentMonth ? 'text-slate-700' : 'text-slate-400'
              }`}
            >
              {format(dayItem, 'd')}
            </span>

            {isCurrentMonth && (
              <button
                onClick={() => onNewEventAtDate(dateKey)}
                className="opacity-0 hover:opacity-100 group-hover:opacity-100 text-slate-400 hover:text-barolo-navy text-xs px-1 rounded transition-opacity"
                title="Nueva cotización en este día"
              >
                +
              </button>
            )}
          </div>

          {/* Event Pills */}
          <div className="flex-1 space-y-1 overflow-y-auto max-h-[105px] pr-0.5">
            {dayEvents.map(ev => {
              let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-300'
              let dotColor = 'bg-slate-400'

              if (ev.status === 'contratado') {
                badgeStyle = 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100 shadow-sm'
                dotColor = 'bg-emerald-500'
              } else if (ev.status === 'reservado') {
                badgeStyle = 'bg-blue-50 text-blue-900 border-blue-300 hover:bg-blue-100 shadow-sm'
                dotColor = 'bg-blue-500'
              } else if (ev.status === 'cotizado') {
                badgeStyle = 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 shadow-sm'
                dotColor = 'bg-amber-500'
              } else if (ev.status === 'cancelado') {
                badgeStyle = 'bg-rose-50 text-rose-800 border-rose-200 line-through opacity-75 hover:bg-rose-100'
                dotColor = 'bg-rose-400'
              }

              return (
                <div
                  key={ev.id}
                  onClick={() => onSelectEvent(ev)}
                  className={`cursor-pointer text-xs p-1.5 rounded-lg border flex items-center space-x-1.5 transition-transform transform hover:scale-[1.02] ${badgeStyle}`}
                  title={`${ev.name} | ${ev.venue} | Facturación: $${Number(ev.gross_income).toLocaleString('es-AR')}`}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`}></span>
                  <span className="font-semibold truncate flex-1">{ev.name}</span>
                  <span className="text-[10px] font-mono opacity-80 hidden sm:inline flex-shrink-0">
                    ${(Number(ev.gross_income) / 1000).toFixed(0)}k
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )
    })
  }

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Month Stats */}
      <div className="bg-white rounded-2xl shadow-luxury p-5 border border-slate-200/80">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Controls: Prev, Next, Month Title */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
              <button
                onClick={prevMonth}
                className="p-2 hover:bg-white rounded-lg text-slate-700 hover:text-barolo-navy transition-colors"
                title="Mes anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={todayMonth}
                className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-white rounded-lg transition-colors"
              >
                Hoy
              </button>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-white rounded-lg text-slate-700 hover:text-barolo-navy transition-colors"
                title="Mes siguiente"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <h2 className="text-xl sm:text-2xl font-serif font-bold text-barolo-navy capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </h2>
          </div>

          {/* Quick Month Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-2.5 text-center">
              <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">Contratados</span>
              <span className="text-lg font-bold text-emerald-900">{monthStats.confirmed}</span>
            </div>

            <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-2.5 text-center">
              <span className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider block">Reservados</span>
              <span className="text-lg font-bold text-blue-900">{monthStats.reserved}</span>
            </div>

            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-2.5 text-center">
              <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block">Cotizados</span>
              <span className="text-lg font-bold text-amber-900">{monthStats.quoted}</span>
            </div>

            <div className="bg-barolo-gold-soft border border-barolo-gold/40 rounded-xl p-2.5 text-center">
              <span className="text-[11px] font-semibold text-barolo-gold-dark uppercase tracking-wider block">Ganancia Barolo</span>
              <span className="text-base font-bold text-barolo-navy">
                ${(monthStats.baroloTotal).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </div>

        {/* Filters and Status Legend */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          
          {/* Status Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center">
              <Filter className="w-3.5 h-3.5 mr-1" /> Estado:
            </span>
            <button
              onClick={() => setSelectedStatus('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                selectedStatus === 'all' ? 'bg-barolo-navy text-white border-barolo-navy shadow' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Todos ({events.length})
            </button>
            <button
              onClick={() => setSelectedStatus('contratado')}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                selectedStatus === 'contratado' ? 'bg-emerald-600 text-white border-emerald-600 shadow' : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              🟢 Contratado
            </button>
            <button
              onClick={() => setSelectedStatus('reservado')}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                selectedStatus === 'reservado' ? 'bg-blue-600 text-white border-blue-600 shadow' : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
              }`}
            >
              🔵 Reservado
            </button>
            <button
              onClick={() => setSelectedStatus('cotizado')}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                selectedStatus === 'cotizado' ? 'bg-amber-500 text-white border-amber-500 shadow' : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
            >
              🟡 Cotizado
            </button>
            <button
              onClick={() => setSelectedStatus('cancelado')}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                selectedStatus === 'cancelado' ? 'bg-rose-600 text-white border-rose-600 shadow' : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
              }`}
            >
              🔴 Cancelado
            </button>
          </div>

          {/* Venue Selector */}
          <div className="flex items-center space-x-2">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedVenue}
              onChange={(e) => setSelectedVenue(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="all">Todos los Salones / Espacios</option>
              <option value="Salón 1923">Salón 1923</option>
              <option value="Espacio Barolo">Espacio Barolo</option>
              <option value="Terraza">Terraza del piso 13</option>
              <option value="Cielos">EB + Cielos</option>
            </select>
          </div>

        </div>
      </div>

      {/* Main Calendar Grid */}
      <div className="bg-white rounded-2xl shadow-luxury border border-slate-200 overflow-hidden">
        
        {/* Days Header (Lun - Dom) */}
        <div className="grid grid-cols-7 bg-barolo-navy text-white text-center py-2.5 text-xs font-bold uppercase tracking-wider border-b border-barolo-gold/40">
          <div>Lunes</div>
          <div>Martes</div>
          <div>Miércoles</div>
          <div>Jueves</div>
          <div>Viernes</div>
          <div>Sábado</div>
          <div>Domingo</div>
        </div>

        {/* Days Matrix */}
        <div className="grid grid-cols-7">
          {renderCalendarDays()}
        </div>
      </div>

      {/* Quick Tips Footer */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>Hacé clic en cualquier evento del calendario para ver su <strong>gráfico de rentabilidad detallada</strong> (ingresos, costos directos e indirectos, margen y ganancia Barolo).</span>
        </div>
        <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">Palacio Barolo CRM</span>
      </div>

    </div>
  )
}
