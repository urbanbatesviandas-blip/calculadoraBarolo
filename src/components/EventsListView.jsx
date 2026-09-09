import React, { useState, useMemo } from 'react'
import { 
  Search, Filter, Calendar, MapPin, DollarSign, Users, 
  ArrowUpDown, ExternalLink, CheckCircle, Clock, AlertTriangle, XCircle, Trash2, Calculator 
} from 'lucide-react'

export default function EventsListView({ events, onSelectEvent, onEditInCalculator, onDeleteEvent }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('all') // 'all', 'contratado', 'reservado', 'cotizado', 'cancelado'
  const [venueFilter, setVenueFilter] = useState('all')
  const [sortBy, setSortBy] = useState('date_desc')

  // Filtrar eventos
  const filteredEvents = useMemo(() => {
    return events.filter(ev => {
      // Tab filter
      if (activeTab !== 'all' && ev.status !== activeTab) return false
      
      // Venue filter
      if (venueFilter !== 'all' && !ev.venue.toLowerCase().includes(venueFilter.toLowerCase())) return false

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const matchName = (ev.name || '').toLowerCase().includes(q)
        const matchClient = (ev.client_name || '').toLowerCase().includes(q)
        const matchCode = (ev.calc_code || '').toLowerCase().includes(q)
        const matchVenue = (ev.venue || '').toLowerCase().includes(q)
        if (!matchName && !matchClient && !matchCode && !matchVenue) return false
      }

      return true
    }).sort((a, b) => {
      if (sortBy === 'date_desc') return (b.event_date || '').localeCompare(a.event_date || '')
      if (sortBy === 'date_asc') return (a.event_date || '').localeCompare(b.event_date || '')
      if (sortBy === 'income_desc') return (Number(b.gross_income) || 0) - (Number(a.gross_income) || 0)
      if (sortBy === 'profit_desc') return (Number(b.barolo_profit) || 0) - (Number(a.barolo_profit) || 0)
      return 0
    })
  }, [events, activeTab, venueFilter, searchTerm, sortBy])

  const counts = useMemo(() => {
    return {
      all: events.length,
      contratado: events.filter(e => e.status === 'contratado').length,
      reservado: events.filter(e => e.status === 'reservado').length,
      cotizado: events.filter(e => e.status === 'cotizado').length,
      cancelado: events.filter(e => e.status === 'cancelado').length,
    }
  }, [events])

  return (
    <div className="space-y-6">
      
      {/* Top Header & Search */}
      <div className="bg-white rounded-2xl p-5 shadow-luxury border border-slate-200">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-barolo-navy">
              Pipeline Comercial & Registro de Eventos
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Visualizá, buscá y administrá todos los presupuestos, cotizaciones y eventos oficiales del Barolo.
            </p>
          </div>

          <div className="flex items-center space-x-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por evento, cliente, código..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
              />
            </div>

            {/* Sort Select */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-700 focus:ring-2 focus:ring-amber-400"
            >
              <option value="date_desc">Más recientes primero</option>
              <option value="date_asc">Más antiguos primero</option>
              <option value="income_desc">Mayor facturación</option>
              <option value="profit_desc">Mayor ganancia Barolo</option>
            </select>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'all' ? 'bg-white text-barolo-navy shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({counts.all})
            </button>

            <button
              onClick={() => setActiveTab('cotizado')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
                activeTab === 'cotizado' ? 'bg-amber-500 text-white shadow-sm' : 'text-amber-800 hover:bg-amber-100/60'
              }`}
            >
              <span>🟡 Cotizaciones ({counts.cotizado})</span>
            </button>

            <button
              onClick={() => setActiveTab('reservado')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
                activeTab === 'reservado' ? 'bg-blue-600 text-white shadow-sm' : 'text-blue-800 hover:bg-blue-100/60'
              }`}
            >
              <span>🔵 Reservados ({counts.reservado})</span>
            </button>

            <button
              onClick={() => setActiveTab('contratado')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
                activeTab === 'contratado' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-800 hover:bg-emerald-100/60'
              }`}
            >
              <span>🟢 Contratados ({counts.contratado})</span>
            </button>

            <button
              onClick={() => setActiveTab('cancelado')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
                activeTab === 'cancelado' ? 'bg-rose-600 text-white shadow-sm' : 'text-rose-800 hover:bg-rose-100/60'
              }`}
            >
              <span>🔴 Cancelados ({counts.cancelado})</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500">Filtrar Salón:</span>
            <select
              value={venueFilter}
              onChange={(e) => setVenueFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700"
            >
              <option value="all">Todos los Salones</option>
              <option value="Salón 1923">Salón 1923</option>
              <option value="Espacio Barolo">Espacio Barolo</option>
              <option value="Terraza">Terraza del piso 13</option>
              <option value="Cielos">EB + Cielos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl shadow-luxury border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-barolo-navy text-white text-[11px] uppercase tracking-wider font-bold border-b border-barolo-gold/40">
              <tr>
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Evento / Cliente</th>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Lugar</th>
                <th className="py-3 px-4 text-right">Facturación ($)</th>
                <th className="py-3 px-4 text-right">Costos ($)</th>
                <th className="py-3 px-4 text-right">Ganancia Barolo ($)</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEvents.map((ev) => {
                const gross = Number(ev.gross_income) || 0
                const costs = Number(ev.total_costs) || (Number(ev.direct_costs) + Number(ev.indirect_costs))
                const profit = Number(ev.barolo_profit) || 0

                return (
                  <tr
                    key={ev.id}
                    className="hover:bg-amber-50/40 transition-colors cursor-pointer"
                    onClick={() => onSelectEvent(ev)}
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-500 whitespace-nowrap">
                      {ev.calc_code || 'CALC-000'}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-xs">{ev.name}</div>
                      <div className="text-[11px] text-slate-400">{ev.client_name || 'Particular'} • {ev.event_type}</div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-600">
                      {ev.event_date}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-600">
                      {ev.venue}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                      ${gross.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-rose-700 whitespace-nowrap">
                      ${costs.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-700 whitespace-nowrap">
                      ${profit.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {ev.status === 'contratado' && (
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] px-2.5 py-1 rounded-full font-bold inline-flex items-center">
                          <CheckCircle className="w-3 h-3 mr-1" /> Contratado
                        </span>
                      )}
                      {ev.status === 'reservado' && (
                        <span className="bg-blue-100 text-blue-800 border border-blue-300 text-[10px] px-2.5 py-1 rounded-full font-bold inline-flex items-center">
                          <Clock className="w-3 h-3 mr-1" /> Reservado
                        </span>
                      )}
                      {ev.status === 'cotizado' && (
                        <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] px-2.5 py-1 rounded-full font-bold inline-flex items-center">
                          <AlertTriangle className="w-3 h-3 mr-1" /> En proceso
                        </span>
                      )}
                      {ev.status === 'cancelado' && (
                        <span className="bg-rose-100 text-rose-800 border border-rose-200 text-[10px] px-2.5 py-1 rounded-full font-bold inline-flex items-center line-through">
                          <XCircle className="w-3 h-3 mr-1" /> Cancelado
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => onSelectEvent(ev)}
                          className="p-1 text-slate-400 hover:text-barolo-navy hover:bg-slate-100 rounded"
                          title="Ver Gráfico de Rentabilidad"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onEditInCalculator(ev)}
                          className="p-1 text-slate-400 hover:text-barolo-gold-dark hover:bg-amber-50 rounded"
                          title="Abrir en Calculadora"
                        >
                          <Calculator className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`¿Deseas eliminar '${ev.name}'?`)) {
                              onDeleteEvent(ev.id)
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                          title="Eliminar evento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {filteredEvents.length === 0 && (
          <div className="py-12 text-center text-slate-400 text-xs">
            No se encontraron eventos con los filtros seleccionados.
          </div>
        )}
      </div>

    </div>
  )
}
