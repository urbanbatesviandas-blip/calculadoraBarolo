import React, { useState, useEffect, useMemo } from 'react'
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  isSameMonth, isSameDay, addDays, parseISO 
} from 'date-fns'
import { es } from 'date-fns/locale'
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, 
  MapPin, DollarSign, Users, TrendingUp, Sparkles, CheckCircle2, Clock, AlertCircle, XCircle, 
  Calculator, ArrowRight, Eye, Check
} from 'lucide-react'

export default function CalendarView({ 
  events = [], 
  targetDate = null, 
  onSelectEvent, 
  onNewEventAtDate,
  onEditInCalculator,
  onUpdateStatus,
  onClearTargetDate
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 8, 1)) // Septiembre 2026
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedVenue, setSelectedVenue] = useState('all')
  const [highlightDay, setHighlightDay] = useState(null)

  // Auto-navegar a la fecha de una cotización/evento recién guardado
  useEffect(() => {
    if (targetDate) {
      const cleanDate = targetDate.substring(0, 10)
      const parts = cleanDate.split('-')
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10)
        const m = parseInt(parts[1], 10) - 1
        if (!isNaN(y) && !isNaN(m)) {
          setCurrentMonth(new Date(y, m, 1))
          setHighlightDay(cleanDate)
          setSelectedStatus('all') // Resetear filtro de estado para asegurar visibilidad
          setSelectedVenue('all')  // Resetear filtro de lugar para asegurar visibilidad
          
          const timer = setTimeout(() => {
            setHighlightDay(null)
            if (onClearTargetDate) onClearTargetDate()
          }, 8000)
          return () => clearTimeout(timer)
        }
      }
    }
  }, [targetDate])

  // Saltar a fecha específica
  const handleJumpToDate = (dateStr) => {
    if (!dateStr) return
    const cleanDate = dateStr.substring(0, 10)
    const parts = cleanDate.split('-')
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10)
      const m = parseInt(parts[1], 10) - 1
      if (!isNaN(y) && !isNaN(m)) {
        setCurrentMonth(new Date(y, m, 1))
        setHighlightDay(cleanDate)
        setSelectedStatus('all')
        setSelectedVenue('all')
      }
    }
  }

  // Navegación de mes
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const todayMonth = () => setCurrentMonth(new Date(2026, 8, 1))

  // Lista de meses que tienen eventos registrados
  const availableMonths = useMemo(() => {
    const map = new Map()
    events.forEach(e => {
      if (e.event_date && e.event_date.length >= 7) {
        const ym = e.event_date.substring(0, 7)
        map.set(ym, (map.get(ym) || 0) + 1)
      }
    })
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [events])

  // Cotizaciones activas en proceso (Pipeline)
  const activeQuotes = useMemo(() => {
    return events
      .filter(e => e.status === 'cotizado')
      .sort((a, b) => (b.event_date || '').localeCompare(a.event_date || ''))
  }, [events])

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
      const isHighlighted = highlightDay === dateKey

      return (
        <div
          key={idx}
          className={`min-h-[135px] border-b border-r border-slate-200 p-2 flex flex-col transition-all duration-300 ${
            !isCurrentMonth ? 'bg-slate-50/70 text-slate-400' : 'bg-white text-slate-800'
          } ${isToday ? 'ring-2 ring-amber-400 ring-inset bg-amber-50/30' : ''} ${
            isHighlighted ? 'ring-4 ring-amber-500 ring-inset bg-amber-100/70 shadow-xl scale-[1.01] z-10' : ''
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center space-x-1 ${
                isHighlighted
                  ? 'bg-amber-600 text-white font-extrabold animate-pulse'
                  : isToday 
                    ? 'bg-barolo-navy text-amber-300 font-bold' 
                    : isCurrentMonth ? 'text-slate-700' : 'text-slate-400'
              }`}
            >
              <span>{format(dayItem, 'd')}</span>
              {isHighlighted && <span className="text-[10px] uppercase tracking-wider ml-1">⭐ ¡NUEVO!</span>}
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
          <div className="flex-1 space-y-1 overflow-y-auto max-h-[110px] pr-0.5">
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
                badgeStyle = 'bg-amber-100 text-amber-950 border-amber-400 hover:bg-amber-200 shadow-md ring-1 ring-amber-400/50'
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
                  <span className="text-[10px] font-mono opacity-90 hidden sm:inline flex-shrink-0">
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
          
          {/* Controls: Prev, Next, Month Title & Quick Month Dropdown */}
          <div className="flex flex-wrap items-center gap-3">
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

            {/* Quick Month Dropdown */}
            {availableMonths.length > 0 && (
              <div className="flex items-center space-x-1.5">
                <span className="text-[11px] text-slate-400 font-semibold hidden xl:inline">Ir a:</span>
                <select
                  value={format(currentMonth, 'yyyy-MM')}
                  onChange={(e) => handleJumpToDate(`${e.target.value}-01`)}
                  className="text-xs bg-amber-50/60 border border-amber-300 hover:border-amber-400 rounded-xl px-2.5 py-1.5 font-bold text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  {availableMonths.map(([ym, count]) => {
                    const [y, m] = ym.split('-')
                    const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1)
                    const label = format(dateObj, 'MMMM yyyy', { locale: es })
                    return (
                      <option key={ym} value={ym}>
                        {label.charAt(0).toUpperCase() + label.slice(1)} ({count} {count === 1 ? 'evento' : 'eventos'})
                      </option>
                    )
                  })}
                </select>
              </div>
            )}
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

      {/* ========================================================================= */}
      {/* SECCIÓN PIPELINE: COTIZACIONES ACTIVAS EN PROCESO */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl shadow-luxury border border-amber-300/80 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 animate-ping"></span>
            <span className="w-3 h-3 rounded-full bg-amber-500 -ml-5.5"></span>
            <h3 className="font-serif font-bold text-barolo-navy text-base">
              Cotizaciones en Proceso (Pipeline Activo)
            </h3>
            <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono">
              {activeQuotes.length}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Hacé clic en <strong>"Ver en Calendario"</strong> para saltar directo a su mes y fecha, o <strong>"Retocar"</strong> para abrir la calculadora.
          </p>
        </div>

        {activeQuotes.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No hay cotizaciones pendientes en este momento. Hacé clic en <strong>"+ Nueva Cotización"</strong> para crear una.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {activeQuotes.map((q) => {
              const gross = Number(q.gross_income) || 0
              const profit = Number(q.barolo_profit) || 0
              return (
                <div
                  key={q.id}
                  className="bg-amber-50/40 hover:bg-amber-50 border border-amber-200/90 rounded-xl p-3.5 flex flex-col justify-between space-y-3 transition-all hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-mono font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded text-[11px]">
                        {q.calc_code || 'CALC'}
                      </span>
                      <span className="font-semibold text-slate-600 flex items-center">
                        <CalendarIcon className="w-3 h-3 mr-1 text-amber-600" />
                        {q.event_date}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-sm truncate" title={q.name}>
                      {q.name}
                    </h4>
                    <p className="text-xs text-slate-500 truncate">
                      {q.client_name || 'Particular'} • {q.venue}
                    </p>

                    <div className="mt-2.5 pt-2 border-t border-amber-200/60 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-semibold">Facturación</span>
                        <span className="font-bold text-slate-800">
                          ${gross.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-emerald-700 block uppercase font-semibold">Ganancia Barolo</span>
                        <span className="font-bold text-emerald-700">
                          ${profit.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 pt-2 border-t border-amber-200/60">
                    <button
                      onClick={() => handleJumpToDate(q.event_date)}
                      className="flex-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center space-x-1"
                      title="Mover el calendario a esta fecha"
                    >
                      <CalendarIcon className="w-3 h-3" />
                      <span>Ver en Calendario</span>
                    </button>

                    <button
                      onClick={() => onEditInCalculator && onEditInCalculator(q)}
                      className="bg-amber-500 hover:bg-amber-400 text-barolo-navy px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center"
                      title="Abrir en Calculadora Madre"
                    >
                      <Calculator className="w-3 h-3 mr-1" />
                      <span>Retocar</span>
                    </button>

                    <button
                      onClick={() => onUpdateStatus && onUpdateStatus(q.id, 'contratado')}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center"
                      title="Confirmar evento (pasa a verde Contratado)"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
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
