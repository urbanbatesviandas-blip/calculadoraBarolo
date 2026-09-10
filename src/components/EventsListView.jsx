import React, { useState, useMemo } from 'react'
import { 
  Search, Filter, Calendar, MapPin, DollarSign, Users, 
  ArrowUpDown, ExternalLink, CheckCircle, Clock, AlertTriangle, XCircle, Trash2, Calculator,
  Scale, FileSpreadsheet, Check, Lock
} from 'lucide-react'
import { canEditEvent, canDeleteEvent } from '../services/authService'
import { excelExportService } from '../services/excelExportService'

export default function EventsListView({ 
  events, 
  onSelectEvent, 
  onEditInCalculator, 
  onDeleteEvent,
  currentUser,
  comparisonEventIds = [],
  onToggleComparison,
  onOpenComparison
}) {
  const userCanDelete = canDeleteEvent(currentUser)
  const userCanEdit = canEditEvent(currentUser)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('all') // 'all', 'contratado', 'reservado', 'cotizado', 'cancelado'
  const [venueFilter, setVenueFilter] = useState('all')
  const todayLocal = useMemo(() => {
    const d = new Date()
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }, [])

  const [sortField, setSortField] = useState('contact_date') // 'contact_date', 'date', 'id', 'name', 'client', 'venue', 'income', 'costs', 'profit', 'status'
  const [sortOrder, setSortOrder] = useState('desc') // 'asc', 'desc'

  // Alternar ordenamiento por columna
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder(['contact_date', 'date', 'income', 'costs', 'profit'].includes(field) ? 'desc' : 'asc')
    }
  }

  // Filtrar y ordenar eventos
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
      let comparison = 0
      if (sortField === 'contact_date') {
        const dateA = a.contact_date || a.created_at?.substring(0, 10) || a.event_date || ''
        const dateB = b.contact_date || b.created_at?.substring(0, 10) || b.event_date || ''
        comparison = dateA.localeCompare(dateB)
        if (comparison === 0) {
          comparison = (a.event_date || '').localeCompare(b.event_date || '')
        }
      } else if (sortField === 'date') {
        comparison = (a.event_date || '').localeCompare(b.event_date || '')
      } else if (sortField === 'id') {
        const numA = parseInt((a.calc_code || '').replace(/\D/g, ''), 10) || 0
        const numB = parseInt((b.calc_code || '').replace(/\D/g, ''), 10) || 0
        comparison = numA - numB
      } else if (sortField === 'name') {
        comparison = (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' })
      } else if (sortField === 'client') {
        comparison = (a.client_name || '').localeCompare(b.client_name || '', 'es', { sensitivity: 'base' })
      } else if (sortField === 'venue') {
        comparison = (a.venue || '').localeCompare(b.venue || '', 'es', { sensitivity: 'base' })
      } else if (sortField === 'income') {
        comparison = (Number(a.gross_income) || 0) - (Number(b.gross_income) || 0)
      } else if (sortField === 'costs') {
        const costA = Number(a.total_costs) || (Number(a.direct_costs) + Number(a.indirect_costs)) || 0
        const costB = Number(b.total_costs) || (Number(b.direct_costs) + Number(b.indirect_costs)) || 0
        comparison = costA - costB
      } else if (sortField === 'profit') {
        comparison = (Number(a.barolo_profit) || 0) - (Number(b.barolo_profit) || 0)
      } else if (sortField === 'status') {
        const statusMap = { cotizado: 1, reservado: 2, contratado: 3, cancelado: 4 }
        comparison = (statusMap[a.status] || 5) - (statusMap[b.status] || 5)
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [events, activeTab, venueFilter, searchTerm, sortField, sortOrder])

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
              Eventos & Historial Comercial
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
              value={`${sortField}_${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('_')
                setSortField(field)
                setSortOrder(order)
              }}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-700 focus:ring-2 focus:ring-amber-400"
            >
              <option value="date_desc">📅 Fecha: Más recientes primero</option>
              <option value="date_asc">📅 Fecha: Más antiguos primero</option>
              <option value="contact_date_desc">📅 Cotización: Más recientes primero (Hoy arriba)</option>
              <option value="contact_date_asc">📅 Cotización: Más antiguas primero</option>
              <option value="date_desc">🎉 Fecha Evento: Más próximas primero</option>
              <option value="date_asc">🎉 Fecha Evento: Más lejanas/antiguas primero</option>
              <option value="id_asc">🔢 Código: CALC ascendente (001 → 999)</option>
              <option value="id_desc">🔢 Código: CALC descendente (999 → 001)</option>
              <option value="name_asc">🔤 Nombre Evento: A → Z</option>
              <option value="name_desc">🔤 Nombre Evento: Z → A</option>
              <option value="client_asc">👤 Cliente: A → Z</option>
              <option value="client_desc">👤 Cliente: Z → A</option>
              <option value="venue_asc">🏛️ Salón / Espacio: A → Z</option>
              <option value="income_desc">💰 Mayor Facturación ($)</option>
              <option value="income_asc">📉 Menor Facturación ($)</option>
              <option value="profit_desc">⭐ Mayor Ganancia Barolo ($)</option>
              <option value="profit_asc">⭐ Menor Ganancia Barolo ($)</option>
              <option value="costs_desc">💸 Mayor Costo Total ($)</option>
              <option value="status_asc">🚦 Estado: Cotizaciones primero</option>
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

          {/* Quick Actions: Export list & Open Comparison */}
          <div className="flex items-center space-x-2">
            {comparisonEventIds.length >= 2 && (
              <button
                onClick={onOpenComparison}
                className="flex items-center space-x-1.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md active:scale-95"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Comparar ({comparisonEventIds.length})</span>
              </button>
            )}

            <button
              onClick={() => excelExportService.exportAllEvents(filteredEvents)}
              className="flex items-center space-x-1.5 bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 border border-emerald-500/40 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95"
              title="Descargar en Excel los eventos filtrados actualmente"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
              <span>Excel ({filteredEvents.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl shadow-luxury border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-barolo-navy text-white text-[11px] uppercase tracking-wider font-bold border-b border-barolo-gold/40">
              <tr>
                <th className="py-3 px-3 text-center w-10 select-none" title="Seleccionar para Comparativa">
                  <Scale className="w-3.5 h-3.5 mx-auto opacity-70" />
                </th>

                <th
                  onClick={() => handleSort('name')}
                  className={`py-3 px-4 cursor-pointer hover:bg-barolo-navy-dark transition-colors select-none ${sortField === 'name' ? 'text-amber-300' : ''}`}
                  title="Ordenar por Nombre de Evento o Cliente"
                >
                  <div className="flex items-center space-x-1">
                    <span>Evento / Cliente</span>
                    <span className="text-[10px]">{sortField === 'name' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : <ArrowUpDown className="w-3 h-3 opacity-30 inline" />}</span>
                  </div>
                </th>

                <th
                  onClick={() => handleSort('contact_date')}
                  className={`py-3 px-3 cursor-pointer hover:bg-barolo-navy-dark transition-colors select-none ${sortField === 'contact_date' ? 'text-amber-300' : ''}`}
                  title="Ordenar por Fecha de Cotización (Día actual arriba)"
                >
                  <div className="flex items-center space-x-1">
                    <span>F. Cotización</span>
                    <span className="text-[10px]">{sortField === 'contact_date' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : <ArrowUpDown className="w-3 h-3 opacity-30 inline" />}</span>
                  </div>
                </th>

                <th
                  onClick={() => handleSort('date')}
                  className={`py-3 px-3 cursor-pointer hover:bg-barolo-navy-dark transition-colors select-none ${sortField === 'date' ? 'text-amber-300' : ''}`}
                  title="Ordenar por Fecha del Evento"
                >
                  <div className="flex items-center space-x-1">
                    <span>F. Evento</span>
                    <span className="text-[10px]">{sortField === 'date' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : <ArrowUpDown className="w-3 h-3 opacity-30 inline" />}</span>
                  </div>
                </th>

                <th
                  onClick={() => handleSort('venue')}
                  className={`py-3 px-4 cursor-pointer hover:bg-barolo-navy-dark transition-colors select-none ${sortField === 'venue' ? 'text-amber-300' : ''}`}
                  title="Ordenar por Salón / Espacio"
                >
                  <div className="flex items-center space-x-1">
                    <span>Lugar</span>
                    <span className="text-[10px]">{sortField === 'venue' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : <ArrowUpDown className="w-3 h-3 opacity-30 inline" />}</span>
                  </div>
                </th>

                <th
                  onClick={() => handleSort('id')}
                  className={`py-3 px-3 cursor-pointer hover:bg-barolo-navy-dark transition-colors select-none text-center ${sortField === 'id' ? 'text-amber-300' : ''}`}
                  title="Ordenar por Código ID"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>ID</span>
                    <span className="text-[10px]">{sortField === 'id' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : <ArrowUpDown className="w-3 h-3 opacity-30 inline" />}</span>
                  </div>
                </th>

                <th
                  onClick={() => handleSort('income')}
                  className={`py-3 px-4 text-right cursor-pointer hover:bg-barolo-navy-dark transition-colors select-none ${sortField === 'income' ? 'text-amber-300' : ''}`}
                  title="Ordenar por Facturación Bruta"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Facturación ($)</span>
                    <span className="text-[10px]">{sortField === 'income' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : <ArrowUpDown className="w-3 h-3 opacity-30 inline" />}</span>
                  </div>
                </th>

                <th
                  onClick={() => handleSort('costs')}
                  className={`py-3 px-4 text-right cursor-pointer hover:bg-barolo-navy-dark transition-colors select-none ${sortField === 'costs' ? 'text-amber-300' : ''}`}
                  title="Ordenar por Costos Totales"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Costos ($)</span>
                    <span className="text-[10px]">{sortField === 'costs' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : <ArrowUpDown className="w-3 h-3 opacity-30 inline" />}</span>
                  </div>
                </th>

                <th
                  onClick={() => handleSort('profit')}
                  className={`py-3 px-4 text-right cursor-pointer hover:bg-barolo-navy-dark transition-colors select-none ${sortField === 'profit' ? 'text-amber-300' : ''}`}
                  title="Ordenar por Ganancia Barolo"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Ganancia Barolo ($)</span>
                    <span className="text-[10px]">{sortField === 'profit' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : <ArrowUpDown className="w-3 h-3 opacity-30 inline" />}</span>
                  </div>
                </th>

                <th
                  onClick={() => handleSort('status')}
                  className={`py-3 px-4 text-center cursor-pointer hover:bg-barolo-navy-dark transition-colors select-none ${sortField === 'status' ? 'text-amber-300' : ''}`}
                  title="Ordenar por Estado"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Estado</span>
                    <span className="text-[10px]">{sortField === 'status' ? (sortOrder === 'asc' ? ' ▲' : ' ▼') : <ArrowUpDown className="w-3 h-3 opacity-30 inline" />}</span>
                  </div>
                </th>

                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEvents.map((ev) => {
                const gross = Number(ev.gross_income) || 0
                const costs = Number(ev.total_costs) || (Number(ev.direct_costs) + Number(ev.indirect_costs))
                const profit = Number(ev.barolo_profit) || 0
                const isCompared = comparisonEventIds.includes(ev.id)

                return (
                  <tr
                    key={ev.id}
                    className={`hover:bg-amber-50/40 transition-colors cursor-pointer ${isCompared ? 'bg-purple-50/50' : ''}`}
                    onClick={() => onSelectEvent(ev)}
                  >
                    {/* Checkbox Comparar */}
                    <td className="py-3.5 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isCompared}
                        onChange={() => onToggleComparison && onToggleComparison(ev)}
                        className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-400 cursor-pointer accent-purple-600"
                        title={isCompared ? "Quitar de la comparativa" : "Seleccionar para comparar"}
                      />
                    </td>

                    {/* Col 2: Evento / Cliente */}
                    <td className="py-3.5 px-4 min-w-[220px]">
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5 flex-wrap">
                        <span>{ev.name}</span>
                        {(ev.has_sensitive_data || ev.sensitive_notes || ev.extra_expenses?.some(e => e.is_sensitive) || ev.extra_incomes?.some(i => i.is_sensitive)) && (
                          <span title="Contiene rubros confidenciales o notas privadas" className="inline-flex items-center text-amber-600 bg-amber-50 px-1 py-0.5 rounded border border-amber-200 text-[10px] font-semibold">
                            <Lock className="w-2.5 h-2.5 mr-0.5" /> Privado
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-barolo-navy/80 font-semibold flex items-center gap-1 mt-0.5">
                        <span>👤 {ev.client_name || 'Particular'}</span>
                        <span className="text-slate-400 font-normal">• {ev.event_type}</span>
                      </div>
                    </td>

                    {/* Col 3: Fecha Cotización */}
                    <td className="py-3.5 px-3 whitespace-nowrap font-medium text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="font-mono text-xs">{ev.contact_date || ev.created_at?.substring(0, 10) || ev.event_date || '-'}</span>
                      </div>
                      {(ev.contact_date === todayLocal || (!ev.contact_date && ev.event_date === todayLocal)) && (
                        <span className="inline-block mt-0.5 px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full border border-emerald-300">
                          HOY
                        </span>
                      )}
                    </td>

                    {/* Col 4: Fecha Evento */}
                    <td className="py-3.5 px-3 whitespace-nowrap font-medium text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-barolo-navy shrink-0" />
                        <span className="font-mono text-xs">{ev.event_date || '-'}</span>
                      </div>
                    </td>

                    {/* Col 4: Salón / Espacio */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-600">
                      {ev.venue}
                    </td>

                    {/* Col 5: Código ID secundario */}
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <span className="font-mono text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {ev.calc_code || 'CALC'}
                      </span>
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
                          onClick={() => excelExportService.exportSingleEvent(ev, currentUser)}
                          className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                          title="Descargar Ficha en Excel"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                        </button>

                        {userCanEdit && (
                          <button
                            onClick={() => onEditInCalculator(ev)}
                            className="p-1 text-slate-400 hover:text-barolo-gold-dark hover:bg-amber-50 rounded"
                            title="Abrir en Cotizador"
                          >
                            <Calculator className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {userCanDelete && (
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
                        )}
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
