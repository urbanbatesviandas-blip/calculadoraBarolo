import React, { useState, useMemo } from 'react'
import { 
  TrendingUp, TrendingDown, DollarSign, Users, Award, 
  Calendar, CheckCircle2, Clock, XCircle, AlertCircle, BarChart3, PieChart, Layers 
} from 'lucide-react'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { format, parseISO, startOfWeek, endOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

export default function DashboardView({ events, onSelectEvent }) {
  const [period, setPeriod] = useState('monthly') // 'weekly', 'monthly', 'all'
  const [venueFilter, setVenueFilter] = useState('all')

  // Filtrar eventos por lugar si aplica
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (venueFilter !== 'all' && !e.venue.toLowerCase().includes(venueFilter.toLowerCase())) return false
      return true
    })
  }, [events, venueFilter])

  // Métricas Totales
  const kpis = useMemo(() => {
    const validEvents = filteredEvents.filter(e => e.status !== 'cancelado')
    
    const grossIncome = validEvents.reduce((acc, e) => acc + (Number(e.gross_income) || 0), 0)
    const directCosts = validEvents.reduce((acc, e) => acc + (Number(e.direct_costs) || 0), 0)
    const indirectCosts = validEvents.reduce((acc, e) => acc + (Number(e.indirect_costs) || 0), 0)
    const totalCosts = validEvents.reduce((acc, e) => acc + (Number(e.total_costs) || (Number(e.direct_costs) + Number(e.indirect_costs))), 0)
    const baroloProfit = validEvents.reduce((acc, e) => acc + (Number(e.barolo_profit) || 0), 0)
    const attendees = validEvents.reduce((acc, e) => acc + (Number(e.attendees) || 0), 0)

    const marginAvg = grossIncome > 0 ? ((baroloProfit / grossIncome) * 100) : 0

    // Pipeline stats
    const totalQuotes = filteredEvents.length
    const confirmedCount = filteredEvents.filter(e => e.status === 'contratado').length
    const reservedCount = filteredEvents.filter(e => e.status === 'reservado').length
    const quotedCount = filteredEvents.filter(e => e.status === 'cotizado').length
    const canceledCount = filteredEvents.filter(e => e.status === 'cancelado').length

    const conversionRate = (confirmedCount + reservedCount) > 0 && totalQuotes > 0
      ? (((confirmedCount + reservedCount) / totalQuotes) * 100).toFixed(1)
      : '0'

    return {
      grossIncome,
      directCosts,
      indirectCosts,
      totalCosts,
      baroloProfit,
      marginAvg,
      attendees,
      totalQuotes,
      confirmedCount,
      reservedCount,
      quotedCount,
      canceledCount,
      conversionRate
    }
  }, [filteredEvents])

  // Datos para Gráfico Temporal (Mensual o Semanal)
  const timeSeriesData = useMemo(() => {
    const groups = {}

    // Ordenar cronológicamente
    const sorted = [...filteredEvents].sort((a, b) => (a.event_date || '').localeCompare(b.event_date || ''))

    sorted.forEach(ev => {
      if (!ev.event_date || ev.status === 'cancelado') return

      let key = ''
      if (period === 'weekly') {
        try {
          const d = parseISO(ev.event_date)
          const sw = startOfWeek(d, { weekStartsOn: 1 })
          key = `Sem ${format(sw, 'dd/MM')}`
        } catch {
          key = 'Otras'
        }
      } else {
        // Mensual
        key = ev.event_date.substring(0, 7) // '2024-05'
      }

      if (!groups[key]) {
        groups[key] = { label: key, gross: 0, direct: 0, indirect: 0, profit: 0, count: 0 }
      }

      groups[key].gross += Number(ev.gross_income) || 0
      groups[key].direct += Number(ev.direct_costs) || 0
      groups[key].indirect += Number(ev.indirect_costs) || 0
      groups[key].profit += Number(ev.barolo_profit) || 0
      groups[key].count += 1
    })

    // Limitar a los últimos 10 períodos para legibilidad
    const entries = Object.values(groups).slice(-10)

    const labels = entries.map(e => e.label)
    const grossValues = entries.map(e => e.gross)
    const directValues = entries.map(e => e.direct)
    const indirectValues = entries.map(e => e.indirect)
    const profitValues = entries.map(e => e.profit)

    return {
      labels,
      datasets: [
        {
          label: 'Facturación ($)',
          data: grossValues,
          backgroundColor: 'rgba(27, 42, 74, 0.85)',
          borderRadius: 6,
        },
        {
          label: 'Costos Directos ($)',
          data: directValues,
          backgroundColor: 'rgba(245, 158, 11, 0.85)',
          borderRadius: 6,
        },
        {
          label: 'Costos Indirectos ($)',
          data: indirectValues,
          backgroundColor: 'rgba(239, 68, 68, 0.85)',
          borderRadius: 6,
        },
        {
          label: 'Ganancia Barolo ($)',
          data: profitValues,
          backgroundColor: 'rgba(16, 185, 129, 0.95)',
          borderRadius: 6,
        }
      ]
    }
  }, [filteredEvents, period])

  // Datos para Gráfico de Embudo Comercial (Cotizados vs Contratados vs Cancelados)
  const funnelData = {
    labels: ['🟢 Contratados (Ganados)', '🔵 Reservados (En curso)', '🟡 Cotizados (En proceso)', '🔴 Cancelados / Caídos'],
    datasets: [
      {
        data: [kpis.confirmedCount, kpis.reservedCount, kpis.quotedCount, kpis.canceledCount],
        backgroundColor: [
          '#10B981', // Emerald
          '#3B82F6', // Blue
          '#F59E0B', // Amber
          '#EF4444'  // Red
        ],
        borderWidth: 2,
        borderColor: '#FFFFFF',
      }
    ]
  }

  // Datos por Espacio / Salón
  const venueStatsData = useMemo(() => {
    const venues = {}
    filteredEvents.filter(e => e.status !== 'cancelado').forEach(ev => {
      const v = ev.venue || 'Otro'
      if (!venues[v]) venues[v] = { income: 0, profit: 0, count: 0 }
      venues[v].income += Number(ev.gross_income) || 0
      venues[v].profit += Number(ev.barolo_profit) || 0
      venues[v].count += 1
    })

    const labels = Object.keys(venues)
    const incomeData = labels.map(l => venues[l].income)
    const profitData = labels.map(l => venues[l].profit)

    return {
      labels,
      datasets: [
        {
          label: 'Facturación ($)',
          data: incomeData,
          backgroundColor: 'rgba(27, 42, 74, 0.9)',
          borderRadius: 6,
        },
        {
          label: 'Ganancia Barolo ($)',
          data: profitData,
          backgroundColor: 'rgba(197, 160, 89, 0.95)',
          borderRadius: 6,
        }
      ]
    }
  }, [filteredEvents])

  return (
    <div className="space-y-6">

      {/* Header with Granularity Switcher */}
      <div className="bg-white rounded-2xl p-5 shadow-luxury border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-6 h-6 text-barolo-navy" />
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-barolo-navy">
              Dashboard de Rentabilidad & Métricas Comerciales
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Análisis consolidado de ganancias, pérdidas, costos directos e indirectos del Palacio Barolo.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Period Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setPeriod('weekly')}
              className={`px-3 py-1.5 rounded-lg transition-all ${period === 'weekly' ? 'bg-barolo-navy text-white shadow' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Semanal
            </button>
            <button
              onClick={() => setPeriod('monthly')}
              className={`px-3 py-1.5 rounded-lg transition-all ${period === 'monthly' ? 'bg-barolo-navy text-white shadow' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Mensual
            </button>
          </div>

          {/* Venue Filter */}
          <select
            value={venueFilter}
            onChange={(e) => setVenueFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-700 focus:ring-2 focus:ring-amber-400"
          >
            <option value="all">Todos los Salones</option>
            <option value="Salón 1923">Salón 1923</option>
            <option value="Espacio Barolo">Espacio Barolo</option>
            <option value="Terraza">Terraza del piso 13</option>
            <option value="Cielos">EB + Cielos</option>
          </select>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Facturación Bruta</span>
          <span className="text-lg font-bold text-barolo-navy">
            ${(kpis.grossIncome / 1000000).toFixed(2)}M
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">${kpis.grossIncome.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
        </div>

        <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200 shadow-sm">
          <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block">Costos Directos</span>
          <span className="text-lg font-bold text-amber-700">
            ${(kpis.directCosts / 1000000).toFixed(2)}M
          </span>
          <span className="text-[10px] text-amber-600 block mt-0.5">
            {kpis.grossIncome > 0 ? ((kpis.directCosts / kpis.grossIncome) * 100).toFixed(1) : 0}% de facturación
          </span>
        </div>

        <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-200 shadow-sm">
          <span className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider block">Costos Indirectos</span>
          <span className="text-lg font-bold text-rose-700">
            ${(kpis.indirectCosts / 1000000).toFixed(2)}M
          </span>
          <span className="text-[10px] text-rose-600 block mt-0.5">Operación, seguros, salón</span>
        </div>

        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-300 shadow-sm">
          <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">Ganancia Barolo</span>
          <span className="text-lg font-bold text-emerald-900">
            ${(kpis.baroloProfit / 1000000).toFixed(2)}M
          </span>
          <span className="text-[10px] text-emerald-700 block mt-0.5 font-semibold">
            Margen Prom: {kpis.marginAvg.toFixed(1)}%
          </span>
        </div>

        <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-200 shadow-sm">
          <span className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider block">Asistentes Totales</span>
          <span className="text-lg font-bold text-blue-900">
            {kpis.attendees.toLocaleString('es-AR')}
          </span>
          <span className="text-[10px] text-blue-600 block mt-0.5">personas registradas</span>
        </div>

        <div className="bg-barolo-gold-soft p-4 rounded-2xl border border-barolo-gold/40 shadow-sm">
          <span className="text-[11px] font-semibold text-barolo-gold-dark uppercase tracking-wider block">Efectividad Comercial</span>
          <span className="text-lg font-bold text-barolo-navy">
            {kpis.conversionRate}%
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            {kpis.confirmedCount} ganados / {kpis.totalQuotes} total
          </span>
        </div>

      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Chart 1: Time Series Evolution (Ingresos vs Costos vs Ganancia) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-luxury">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif font-bold text-barolo-navy text-base">
                Evolución de Rentabilidad ({period === 'weekly' ? 'Semanal' : 'Mensual'})
              </h3>
              <p className="text-xs text-slate-500">
                Comparativa de Facturación vs Costos Directos vs Indirectos vs Ganancia Neta Barolo
              </p>
            </div>
            <span className="text-xs bg-slate-100 px-2.5 py-1 rounded-lg text-slate-600 font-medium">
              Últimos períodos
            </span>
          </div>

          <div className="h-72 w-full">
            <Bar 
              data={timeSeriesData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'top', labels: { boxWidth: 12, font: { family: 'Segoe UI', size: 11 } } },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => ` ${ctx.dataset.label}: $${Number(ctx.raw).toLocaleString('es-AR')}`
                    }
                  }
                },
                scales: {
                  y: {
                    ticks: { callback: (val) => `$${(val / 1000).toLocaleString('es-AR')}k` },
                    grid: { color: 'rgba(226, 232, 240, 0.7)' }
                  },
                  x: { grid: { display: false } }
                }
              }} 
            />
          </div>
        </div>

        {/* Chart 2: Funnel Comercial (Cotizados vs Contratados vs Cancelados) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-luxury flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <PieChart className="w-4 h-4 text-barolo-navy" />
              <h3 className="font-serif font-bold text-barolo-navy text-base">
                Embudo Comercial de Cotizaciones
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Distribución de propuestas: Contratadas, Reservadas, En Negociación y Caídas.
            </p>

            <div className="h-52 w-full flex items-center justify-center">
              <Doughnut
                data={funnelData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 10, font: { family: 'Segoe UI', size: 10 } } }
                  },
                  cutout: '65%'
                }}
              />
            </div>
          </div>

          {/* Breakdown summary */}
          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
            <div className="bg-emerald-50 p-2 rounded-xl text-center">
              <span className="text-slate-500 block text-[10px]">Tasa de Cierre</span>
              <span className="font-bold text-emerald-800 text-sm">{kpis.conversionRate}%</span>
            </div>
            <div className="bg-rose-50 p-2 rounded-xl text-center">
              <span className="text-slate-500 block text-[10px]">Tasa de Cancelación</span>
              <span className="font-bold text-rose-800 text-sm">
                {kpis.totalQuotes > 0 ? ((kpis.canceledCount / kpis.totalQuotes) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Chart 3: Distribución por Espacio / Salón */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-luxury">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-serif font-bold text-barolo-navy text-base">
              Rendimiento Económico por Espacio / Salón
            </h3>
            <p className="text-xs text-slate-500">
              Facturación bruta vs Ganancia neta retenida por el Palacio Barolo según la locación
            </p>
          </div>
          <span className="text-xs font-semibold text-barolo-gold-dark bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
            Espacio Barolo • Salón 1923 • Terraza
          </span>
        </div>

        <div className="h-64 w-full">
          <Bar 
            data={venueStatsData} 
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: 'top', labels: { boxWidth: 12, font: { family: 'Segoe UI', size: 11 } } },
                tooltip: {
                  callbacks: {
                    label: (ctx) => ` ${ctx.dataset.label}: $${Number(ctx.raw).toLocaleString('es-AR')}`
                  }
                }
              },
              scales: {
                y: {
                  ticks: { callback: (val) => `$${(val / 1000).toLocaleString('es-AR')}k` },
                  grid: { color: 'rgba(226, 232, 240, 0.7)' }
                },
                x: { grid: { display: false } }
              }
            }} 
          />
        </div>
      </div>

    </div>
  )
}
