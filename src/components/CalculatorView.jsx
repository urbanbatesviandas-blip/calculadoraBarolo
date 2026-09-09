import React, { useState, useEffect, useMemo } from 'react'
import { 
  Calculator, Plus, Trash2, Save, CheckCircle2, RotateCcw, 
  Sparkles, DollarSign, Users, Calendar, MapPin, Building, AlertCircle, FileText, ArrowRight, BookmarkCheck 
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { canCreateEvent, canEditEvent, canChangeStatus } from '../services/authService'

export default function CalculatorView({ initialEventData, onSaveEvent, onSwitchView, currentUser }) {
  const userCanCreate = canCreateEvent(currentUser)
  const userCanEdit = canEditEvent(currentUser)
  const userCanChange = canChangeStatus(currentUser)

  // Estado general
  const [eventId, setEventId] = useState(initialEventData?.id || null)
  const [calcCode, setCalcCode] = useState(initialEventData?.calc_code || '')
  const [eventName, setEventName] = useState(initialEventData?.name || '')
  const [clientName, setClientName] = useState(initialEventData?.client_name || '')
  const [clientCuit, setClientCuit] = useState(initialEventData?.client_cuit || '')
  const [clientContact, setClientContact] = useState(initialEventData?.client_contact || '')
  const [eventDate, setEventDate] = useState(initialEventData?.event_date || new Date().toISOString().substring(0, 10))
  const [eventTime, setEventTime] = useState(initialEventData?.event_time || '19:00')
  const [venue, setVenue] = useState(initialEventData?.venue || 'Espacio Barolo')
  const [eventType, setEventType] = useState(initialEventData?.event_type || 'Social')
  const [origin, setOrigin] = useState(initialEventData?.origin || 'Externo')
  const [agreementType, setAgreementType] = useState(initialEventData?.agreement_type || '50% - 50%')
  const [eventStatus, setEventStatus] = useState(initialEventData?.status || 'cotizado')
  const [attendees, setAttendees] = useState(initialEventData?.attendees || 25)
  const [notes, setNotes] = useState(initialEventData?.notes || '')

  // Entradas (Ticketing)
  const [preventaQty, setPreventaQty] = useState(0)
  const [preventaPrice, setPreventaPrice] = useState(0)
  const [generalQty, setGeneralQty] = useState(0)
  const [generalPrice, setGeneralPrice] = useState(0)
  const [alquilerEspacio, setAlquilerEspacio] = useState(0)
  const [contratacionSalon, setContratacionSalon] = useState(0)

  // Desglose Dinámico de Otros Ingresos
  const [extraIncomes, setExtraIncomes] = useState([
    { id: 'inc-1', concept: '', amount: 0 }
  ])

  // Costos Directos
  const [costArtistas, setCostArtistas] = useState(0)
  const [costTecnica, setCostTecnica] = useState(0)
  const [costDisertantes, setCostDisertantes] = useState(0)
  const [costCatering, setCostCatering] = useState(0)
  const [costMobiliario, setCostMobiliario] = useState(0)
  const [costGastronomicos, setCostGastronomicos] = useState(0)

  // Costos Indirectos / Operativos
  const [costRrhh, setCostRrhh] = useState(0)
  const [costLimpieza, setCostLimpieza] = useState(0)
  const [costSeguros, setCostSeguros] = useState(0)
  const [costAlquilerEspacio, setCostAlquilerEspacio] = useState(0)
  const [costMarketing, setCostMarketing] = useState(0)
  const [costSadaic, setCostSadaic] = useState(0)

  // Desglose Dinámico de Otros Gastos
  const [extraExpenses, setExtraExpenses] = useState([
    { id: 'exp-1', concept: '', amount: 0 }
  ])

  // Cargar y restaurar datos completos cuando se abre un evento
  useEffect(() => {
    if (initialEventData) {
      setEventId(initialEventData.id || null)
      setCalcCode(initialEventData.calc_code || '')
      setEventName(initialEventData.name || '')
      setClientName(initialEventData.client_name || '')
      setClientCuit(initialEventData.client_cuit || '')
      setClientContact(initialEventData.client_contact || '')
      setEventDate(initialEventData.event_date || new Date().toISOString().substring(0, 10))
      setEventTime(initialEventData.event_time || '19:00')
      setVenue(initialEventData.venue || 'Espacio Barolo')
      setEventType(initialEventData.event_type || 'Social')
      setOrigin(initialEventData.origin || 'Externo')
      setAgreementType(initialEventData.agreement_type || '50% - 50%')
      setEventStatus(initialEventData.status || 'cotizado')
      setAttendees(Number(initialEventData.attendees) || 25)
      setNotes(initialEventData.notes || '')

      // 1. Restaurar Entradas y Alquileres
      if (initialEventData.preventa_qty !== undefined || initialEventData.general_qty !== undefined) {
        setPreventaQty(Number(initialEventData.preventa_qty) || 0)
        setPreventaPrice(Number(initialEventData.preventa_price) || 0)
        setGeneralQty(Number(initialEventData.general_qty) || 0)
        setGeneralPrice(Number(initialEventData.general_price) || 0)
        setAlquilerEspacio(Number(initialEventData.alquiler_espacio) || 0)
        setContratacionSalon(Number(initialEventData.contratacion_salon) || 0)
      } else if (Number(initialEventData.ticket_qty) > 0 && Number(initialEventData.ticket_price) > 0) {
        setPreventaQty(0)
        setPreventaPrice(0)
        setGeneralQty(Number(initialEventData.ticket_qty) || 0)
        setGeneralPrice(Number(initialEventData.ticket_price) || 0)
        setAlquilerEspacio(0)
        setContratacionSalon(0)
      } else {
        setPreventaQty(0)
        setPreventaPrice(0)
        setGeneralQty(0)
        setGeneralPrice(0)
        setAlquilerEspacio(Number(initialEventData.gross_income) || 0)
        setContratacionSalon(0)
      }

      // 2. Restaurar Otros Ingresos
      if (initialEventData.extra_incomes && initialEventData.extra_incomes.length > 0) {
        setExtraIncomes(initialEventData.extra_incomes)
      } else {
        setExtraIncomes([{ id: 'inc-1', concept: '', amount: 0 }])
      }

      // 3. Restaurar Costos Directos
      if (initialEventData.cost_artistas !== undefined) {
        setCostArtistas(Number(initialEventData.cost_artistas) || 0)
        setCostTecnica(Number(initialEventData.cost_tecnica) || 0)
        setCostDisertantes(Number(initialEventData.cost_disertantes) || 0)
        setCostCatering(Number(initialEventData.cost_catering) || 0)
        setCostMobiliario(Number(initialEventData.cost_mobiliario) || 0)
        setCostGastronomicos(Number(initialEventData.cost_gastronomicos) || 0)
      } else if (Number(initialEventData.direct_costs) > 0) {
        const dc = Number(initialEventData.direct_costs)
        setCostArtistas(Math.round(dc * 0.55))
        setCostTecnica(Math.round(dc * 0.25))
        setCostDisertantes(0)
        setCostCatering(Math.round(dc * 0.15))
        setCostMobiliario(0)
        setCostGastronomicos(Math.round(dc * 0.05))
      } else {
        setCostArtistas(0)
        setCostTecnica(0)
        setCostDisertantes(0)
        setCostCatering(0)
        setCostMobiliario(0)
        setCostGastronomicos(0)
      }

      // 4. Restaurar Costos Indirectos
      if (initialEventData.cost_limpieza !== undefined) {
        setCostRrhh(Number(initialEventData.cost_rrhh) || 0)
        setCostLimpieza(Number(initialEventData.cost_limpieza) || 0)
        setCostSeguros(Number(initialEventData.cost_seguros) || 0)
        setCostAlquilerEspacio(Number(initialEventData.cost_alquiler_espacio) || 0)
        setCostMarketing(Number(initialEventData.cost_marketing) || 0)
        setCostSadaic(Number(initialEventData.cost_sadaic) || 0)
      } else if (Number(initialEventData.indirect_costs) > 0) {
        const ic = Number(initialEventData.indirect_costs)
        setCostRrhh(Math.round(ic * 0.35))
        setCostLimpieza(Math.round(ic * 0.25))
        setCostSeguros(Math.round(ic * 0.25))
        setCostAlquilerEspacio(0)
        setCostMarketing(0)
        setCostSadaic(Math.round(ic * 0.15))
      } else {
        setCostRrhh(0)
        setCostLimpieza(0)
        setCostSeguros(0)
        setCostAlquilerEspacio(0)
        setCostMarketing(0)
        setCostSadaic(0)
      }

      // 5. Restaurar Otros Gastos
      if (initialEventData.extra_expenses && initialEventData.extra_expenses.length > 0) {
        setExtraExpenses(initialEventData.extra_expenses)
      } else {
        setExtraExpenses([{ id: 'exp-1', concept: '', amount: 0 }])
      }
    } else {
      // Estado limpio para nueva cotización
      setEventId(null)
      setCalcCode('')
      setEventName('')
      setClientName('')
      setClientCuit('')
      setClientContact('')
      setEventDate(new Date().toISOString().substring(0, 10))
      setEventTime('19:00')
      setVenue('Espacio Barolo')
      setEventType('Social')
      setOrigin('Externo')
      setAgreementType('50% - 50%')
      setEventStatus('cotizado')
      setAttendees(25)
      setNotes('')
      setPreventaQty(0)
      setPreventaPrice(0)
      setGeneralQty(0)
      setGeneralPrice(0)
      setAlquilerEspacio(0)
      setContratacionSalon(0)
      setExtraIncomes([{ id: 'inc-1', concept: '', amount: 0 }])
      setCostArtistas(0)
      setCostTecnica(0)
      setCostDisertantes(0)
      setCostCatering(0)
      setCostMobiliario(0)
      setCostGastronomicos(0)
      setCostRrhh(0)
      setCostLimpieza(0)
      setCostSeguros(0)
      setCostAlquilerEspacio(0)
      setCostMarketing(0)
      setCostSadaic(0)
      setExtraExpenses([{ id: 'exp-1', concept: '', amount: 0 }])
    }
  }, [initialEventData])

  // Funciones para agregar/quitar filas dinámicas
  const addExtraIncome = () => {
    setExtraIncomes([...extraIncomes, { id: `inc-${Date.now()}`, concept: '', amount: 0 }])
  }
  const removeExtraIncome = (id) => {
    setExtraIncomes(extraIncomes.filter(i => i.id !== id))
  }
  const updateExtraIncome = (id, field, value) => {
    setExtraIncomes(extraIncomes.map(i => i.id === id ? { ...i, [field]: value } : i))
  }

  const addExtraExpense = () => {
    setExtraExpenses([...extraExpenses, { id: `exp-${Date.now()}`, concept: '', amount: 0 }])
  }
  const removeExtraExpense = (id) => {
    setExtraExpenses(extraExpenses.filter(e => e.id !== id))
  }
  const updateExtraExpense = (id, field, value) => {
    setExtraExpenses(extraExpenses.map(e => e.id === id ? { ...e, [field]: value } : e))
  }

  // Cálculos reactivos en vivo
  const subtotalPreventa = preventaQty * preventaPrice
  const subtotalGeneral = generalQty * generalPrice
  const totalTicketing = subtotalPreventa + subtotalGeneral
  const totalExtraIncomes = extraIncomes.reduce((acc, i) => acc + (Number(i.amount) || 0), 0)

  const totalGrossIncome = totalTicketing + Number(alquilerEspacio) + Number(contratacionSalon) + totalExtraIncomes

  // Suma de Costos Directos
  const totalDirectCosts = 
    Number(costArtistas) + 
    Number(costTecnica) + 
    Number(costDisertantes) + 
    Number(costCatering) + 
    Number(costMobiliario) + 
    Number(costGastronomicos)

  // Suma de Costos Indirectos
  const totalExtraExpenses = extraExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0)
  const totalIndirectCosts = 
    Number(costRrhh) + 
    Number(costLimpieza) + 
    Number(costSeguros) + 
    Number(costAlquilerEspacio) + 
    Number(costMarketing) + 
    Number(costSadaic) + 
    totalExtraExpenses

  const totalCosts = totalDirectCosts + totalIndirectCosts
  const netMargin = totalGrossIncome - totalCosts

  // Participación Barolo
  let baroloProfit = 0
  if (agreementType === '100% Barolo') {
    baroloProfit = netMargin
  } else if (agreementType === '50% - 50%') {
    baroloProfit = netMargin * 0.50
  } else if (agreementType === '70% Barolo - 30% Productor') {
    baroloProfit = netMargin * 0.70
  } else if (agreementType === '30% Barolo - 70% Productor') {
    baroloProfit = netMargin * 0.30
  } else if (agreementType === 'Solo Alquiler') {
    baroloProfit = Number(alquilerEspacio) + Number(contratacionSalon)
  } else {
    baroloProfit = netMargin * 0.50
  }

  const marginPct = totalGrossIncome > 0 ? ((baroloProfit / totalGrossIncome) * 100) : 0

  // Punto de equilibrio (Entradas necesarias para cubrir costos fijos)
  const ticketAvgPrice = (preventaQty + generalQty) > 0 
    ? (totalTicketing / (preventaQty + generalQty)) 
    : 35000
  const breakEvenTickets = ticketAvgPrice > 0 ? Math.ceil(totalCosts / ticketAvgPrice) : 0

  // Limpiar
  const handleReset = () => {
    if (confirm('¿Deseas vaciar la calculadora para preparar una nueva cotización?')) {
      setEventId(null)
      setCalcCode('')
      setEventName('')
      setClientName('')
      setClientCuit('')
      setClientContact('')
      setAttendees(25)
      setNotes('')
      setEventStatus('cotizado')
      setPreventaQty(0)
      setPreventaPrice(0)
      setGeneralQty(0)
      setGeneralPrice(0)
      setAlquilerEspacio(0)
      setContratacionSalon(0)
      setExtraIncomes([{ id: 'inc-1', concept: '', amount: 0 }])
      setCostArtistas(0)
      setCostTecnica(0)
      setCostDisertantes(0)
      setCostCatering(0)
      setCostMobiliario(0)
      setCostGastronomicos(0)
      setCostRrhh(0)
      setCostLimpieza(0)
      setCostSeguros(0)
      setCostAlquilerEspacio(0)
      setCostMarketing(0)
      setCostSadaic(0)
      setExtraExpenses([{ id: 'exp-1', concept: '', amount: 0 }])
    }
  }

  // Generador unificado de payload
  const buildPayload = (overrideStatus) => {
    const finalStatus = overrideStatus || eventStatus || 'cotizado'
    const defaultPrefix = finalStatus === 'cotizado' ? 'Cotización' : finalStatus === 'reservado' ? 'Reserva' : 'Evento'
    const finalName = eventName.trim() || `${defaultPrefix} ${eventType} - ${clientName || 'Cliente'}`
    return {
      id: eventId || undefined,
      calc_code: calcCode || undefined,
      name: finalName,
      client_name: clientName || 'Cliente Particular',
      client_cuit: clientCuit,
      client_contact: clientContact,
      event_date: eventDate,
      event_time: eventTime,
      venue,
      event_type: eventType,
      origin,
      status: finalStatus,
      agreement_type: agreementType,
      attendees: Number(attendees) || 25,
      preventa_qty: Number(preventaQty) || 0,
      preventa_price: Number(preventaPrice) || 0,
      general_qty: Number(generalQty) || 0,
      general_price: Number(generalPrice) || 0,
      ticket_qty: preventaQty + generalQty,
      ticket_price: ticketAvgPrice,
      alquiler_espacio: Number(alquilerEspacio) || 0,
      contratacion_salon: Number(contratacionSalon) || 0,
      extra_incomes: extraIncomes.filter(i => i.concept || Number(i.amount) > 0),
      cost_artistas: Number(costArtistas) || 0,
      cost_tecnica: Number(costTecnica) || 0,
      cost_disertantes: Number(costDisertantes) || 0,
      cost_catering: Number(costCatering) || 0,
      cost_mobiliario: Number(costMobiliario) || 0,
      cost_gastronomicos: Number(costGastronomicos) || 0,
      cost_rrhh: Number(costRrhh) || 0,
      cost_limpieza: Number(costLimpieza) || 0,
      cost_seguros: Number(costSeguros) || 0,
      cost_alquiler_espacio: Number(costAlquilerEspacio) || 0,
      cost_marketing: Number(costMarketing) || 0,
      cost_sadaic: Number(costSadaic) || 0,
      extra_expenses: extraExpenses.filter(e => e.concept || Number(e.amount) > 0),
      gross_income: totalGrossIncome,
      direct_costs: totalDirectCosts,
      indirect_costs: totalIndirectCosts,
      total_costs: totalCosts,
      net_profit: netMargin,
      barolo_profit: baroloProfit,
      margin_pct: marginPct,
      payment_method: 'Transferencia',
      invoice_type: 'Factura A',
      notes: notes.trim() || (
        finalStatus === 'cotizado' ? 'Cotización guardada en el sistema.' :
        finalStatus === 'reservado' ? 'Fecha reservada. En espera de seña o confirmación definitiva.' :
        'Evento confirmado y cerrado.'
      )
    }
  }

  // Guardar como Cotización
  const handleSaveAsQuote = () => {
    const payload = buildPayload('cotizado')
    setEventStatus('cotizado')
    onSaveEvent(payload, 'cotizado')
  }

  // Guardar como Reservado
  const handleSaveAsReserved = () => {
    const payload = buildPayload('reservado')
    setEventStatus('reservado')
    onSaveEvent(payload, 'reservado')
  }

  // Guardar como Evento Confirmado (Contratado)
  const handleConfirmAndSave = () => {
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } })
    const payload = buildPayload('contratado')
    setEventStatus('contratado')
    onSaveEvent(payload, 'contratado')
  }

  return (
    <div className="space-y-6 pb-28">
      
      {/* Title Header */}
      <div className="bg-white rounded-2xl p-5 shadow-luxury border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Calculator className="w-6 h-6 text-barolo-navy" />
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-barolo-navy">
              Calculadora Madre & Cotizador Integral (En Vivo)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Modificá cualquiera de las celdas amarillas para ver los márgenes y el punto de equilibrio en tiempo real.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            title="Limpiar campos"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Limpiar</span>
          </button>

          {(userCanCreate || userCanEdit) && (
            <button
              onClick={handleSaveAsQuote}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl font-bold text-xs bg-amber-400 hover:bg-amber-300 text-barolo-navy shadow-md shadow-amber-400/20 transition-all"
              title="Guardar como Cotización (en análisis)"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>📝 Cotización</span>
            </button>
          )}

          {userCanChange && (
            <>
              <button
                onClick={handleSaveAsReserved}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl font-bold text-xs bg-sky-500 hover:bg-sky-400 text-white shadow-md shadow-sky-500/25 transition-all"
                title="Guardar como Reservado (bloqueo de fecha)"
              >
                <BookmarkCheck className="w-3.5 h-3.5" />
                <span>🔵 Reservado</span>
              </button>

              <button
                onClick={handleConfirmAndSave}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all"
                title="Confirmar en firme como Evento Contratado"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>💾 Confirmar Evento</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Banner de Modo Edición si se está modificando un evento existente */}
      {eventId && (
        <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center space-x-2 text-slate-800">
            <span className={`text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
              eventStatus === 'contratado' ? 'bg-emerald-600' :
              eventStatus === 'reservado' ? 'bg-sky-600' : 'bg-amber-500'
            }`}>
              {eventStatus === 'contratado' ? 'Contratado' : eventStatus === 'reservado' ? 'Reservado' : 'Cotización'}
            </span>
            <span className="font-bold text-xs">
              Editando: <strong className="font-mono text-barolo-navy">{calcCode || 'Registro'}</strong> — {eventName || clientName || 'Sin título'}
            </span>
          </div>
          <button
            onClick={handleReset}
            className="text-xs text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer"
          >
            Descartar y crear nueva cotización en blanco
          </button>
        </div>
      )}

      {/* Main Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ========================================================================= */}
        {/* PANEL 1: DATOS GENERALES Y CLIENTE */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl p-5 shadow-luxury border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-serif font-bold text-barolo-navy text-sm uppercase tracking-wider flex items-center">
              <Building className="w-4 h-4 mr-1.5 text-barolo-gold" />
              1. Datos Generales & Cliente
            </h3>
            {calcCode && (
              <span className="text-[11px] font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                {calcCode}
              </span>
            )}
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Nombre del Evento</label>
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="Ej: Jam de Dibujo (Edición Especial)"
                className="w-full bg-amber-50/70 border border-amber-300/80 rounded-xl px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Cliente / Referente</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ej: Camila Ocampo"
                  className="w-full bg-amber-50/70 border border-amber-300/80 rounded-xl px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">CUIT / DNI</label>
                <input
                  type="text"
                  value={clientCuit}
                  onChange={(e) => setClientCuit(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Fecha Estimada</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full bg-amber-50/70 border border-amber-300/80 rounded-xl px-3 py-2 text-slate-800 font-medium"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Horario</label>
                <input
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Salón / Espacio</label>
                <select
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="w-full bg-amber-50/70 border border-amber-300/80 rounded-xl px-3 py-2 text-slate-800 font-medium"
                >
                  <option value="Espacio Barolo">Espacio Barolo</option>
                  <option value="Salón 1923">Salón 1923</option>
                  <option value="Terraza del piso 13">Terraza del piso 13</option>
                  <option value="EB + Cielos">EB + Cielos</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tipo de Evento</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full bg-amber-50/70 border border-amber-300/80 rounded-xl px-3 py-2 text-slate-800 font-medium"
                >
                  <option value="Social">Social</option>
                  <option value="Corporativo">Corporativo</option>
                  <option value="Desfile">Desfile</option>
                  <option value="Show">Show / Concierto</option>
                  <option value="Experiencia">Experiencia</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Asistentes Esperados</label>
                <input
                  type="number"
                  value={attendees}
                  onChange={(e) => setAttendees(e.target.value)}
                  className="w-full bg-amber-50/70 border border-amber-300/80 rounded-xl px-3 py-2 text-slate-800 font-medium text-right"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tipo de Acuerdo</label>
                <select
                  value={agreementType}
                  onChange={(e) => setAgreementType(e.target.value)}
                  className="w-full bg-amber-50/70 border border-amber-300/80 rounded-xl px-3 py-2 text-slate-800 font-medium"
                >
                  <option value="50% - 50%">50% - 50%</option>
                  <option value="100% Barolo">100% Barolo</option>
                  <option value="70% Barolo - 30% Productor">70% Barolo - 30% Productor</option>
                  <option value="30% Barolo - 70% Productor">30% Barolo - 70% Productor</option>
                  <option value="Solo Alquiler">Solo Alquiler</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Estado Comercial</label>
              <select
                value={eventStatus}
                onChange={(e) => setEventStatus(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2 font-bold transition-colors ${
                  eventStatus === 'contratado' ? 'bg-emerald-50 text-emerald-900 border-emerald-300' :
                  eventStatus === 'reservado' ? 'bg-sky-50 text-sky-900 border-sky-300' :
                  'bg-amber-50 text-amber-950 border-amber-300'
                }`}
              >
                <option value="cotizado">🟡 Cotizado (Propuesta en análisis)</option>
                <option value="reservado">🔵 Reservado (Fecha bloqueada / Seña)</option>
                <option value="contratado">🟢 Contratado (Confirmado en firme)</option>
              </select>
            </div>

          </div>
        </div>

        {/* ========================================================================= */}
        {/* PANEL 2: INGRESOS & TICKETING */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl p-5 shadow-luxury border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-serif font-bold text-barolo-navy text-sm uppercase tracking-wider flex items-center">
              <DollarSign className="w-4 h-4 mr-1.5 text-barolo-gold" />
              2. Ingresos & Desglose
            </h3>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Total: ${totalGrossIncome.toLocaleString('es-AR')}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Preventa */}
            <div className="grid grid-cols-3 gap-2 items-center bg-slate-50 p-2 rounded-xl">
              <div>
                <span className="font-semibold text-slate-700 block">Preventa (Cant)</span>
                <input
                  type="number"
                  value={preventaQty}
                  onChange={(e) => setPreventaQty(Number(e.target.value))}
                  className="w-full bg-amber-50 border border-amber-300 rounded-lg px-2 py-1 text-right font-medium"
                />
              </div>
              <div>
                <span className="font-semibold text-slate-700 block">Precio ($)</span>
                <input
                  type="number"
                  value={preventaPrice}
                  onChange={(e) => setPreventaPrice(Number(e.target.value))}
                  className="w-full bg-amber-50 border border-amber-300 rounded-lg px-2 py-1 text-right font-medium"
                />
              </div>
              <div className="text-right">
                <span className="text-slate-500 block text-[10px]">Subtotal</span>
                <span className="font-bold text-slate-800">${subtotalPreventa.toLocaleString('es-AR')}</span>
              </div>
            </div>

            {/* General */}
            <div className="grid grid-cols-3 gap-2 items-center bg-slate-50 p-2 rounded-xl">
              <div>
                <span className="font-semibold text-slate-700 block">General (Cant)</span>
                <input
                  type="number"
                  value={generalQty}
                  onChange={(e) => setGeneralQty(Number(e.target.value))}
                  className="w-full bg-amber-50 border border-amber-300 rounded-lg px-2 py-1 text-right font-medium"
                />
              </div>
              <div>
                <span className="font-semibold text-slate-700 block">Precio ($)</span>
                <input
                  type="number"
                  value={generalPrice}
                  onChange={(e) => setGeneralPrice(Number(e.target.value))}
                  className="w-full bg-amber-50 border border-amber-300 rounded-lg px-2 py-1 text-right font-medium"
                />
              </div>
              <div className="text-right">
                <span className="text-slate-500 block text-[10px]">Subtotal</span>
                <span className="font-bold text-slate-800">${subtotalGeneral.toLocaleString('es-AR')}</span>
              </div>
            </div>

            {/* Alquiler Base */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Alquiler del Espacio ($)</label>
                <input
                  type="number"
                  value={alquilerEspacio}
                  onChange={(e) => setAlquilerEspacio(Number(e.target.value))}
                  className="w-full bg-amber-50/70 border border-amber-300/80 rounded-xl px-3 py-1.5 text-right font-medium"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Contratación Salón ($)</label>
                <input
                  type="number"
                  value={contratacionSalon}
                  onChange={(e) => setContratacionSalon(Number(e.target.value))}
                  className="w-full bg-amber-50/70 border border-amber-300/80 rounded-xl px-3 py-1.5 text-right font-medium"
                />
              </div>
            </div>

            {/* 📦 CUADRO DINÁMICO DE OTROS INGRESOS */}
            <div className="pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="font-serif font-bold text-barolo-navy text-xs flex items-center">
                  📦 Desglose de Otros Ingresos
                </span>
                <button
                  type="button"
                  onClick={addExtraIncome}
                  className="flex items-center space-x-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200"
                >
                  <Plus className="w-3 h-3" />
                  <span>Agregar Ítem</span>
                </button>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {extraIncomes.map((item) => (
                  <div key={item.id} className="flex items-center space-x-1.5">
                    <input
                      type="text"
                      placeholder="Concepto (ej: Sponsor Santander)"
                      value={item.concept}
                      onChange={(e) => updateExtraIncome(item.id, 'concept', e.target.value)}
                      className="flex-1 bg-amber-50/70 border border-amber-300/80 rounded-lg px-2 py-1 text-xs font-medium"
                    />
                    <input
                      type="number"
                      placeholder="Monto ($)"
                      value={item.amount || ''}
                      onChange={(e) => updateExtraIncome(item.id, 'amount', Number(e.target.value))}
                      className="w-24 bg-amber-50/70 border border-amber-300/80 rounded-lg px-2 py-1 text-xs text-right font-medium"
                    />
                    {extraIncomes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeExtraIncome(item.id)}
                        className="text-rose-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* ========================================================================= */}
        {/* PANEL 3: COSTOS DIRECTOS E INDIRECTOS */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl p-5 shadow-luxury border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-serif font-bold text-barolo-navy text-sm uppercase tracking-wider flex items-center">
              <FileText className="w-4 h-4 mr-1.5 text-barolo-gold" />
              3. Costos Directos & Indirectos
            </h3>
            <span className="text-xs font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              Total: ${totalCosts.toLocaleString('es-AR')}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Costos Directos */}
            <div className="bg-amber-50/30 p-2.5 rounded-xl border border-amber-200/70">
              <span className="font-bold text-amber-900 block mb-2 text-[11px]">Costos Directos (Operación y Artistas):</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-600 block text-[10px]">Artistas ($)</label>
                  <input
                    type="number"
                    value={costArtistas}
                    onChange={(e) => setCostArtistas(Number(e.target.value))}
                    className="w-full bg-amber-50 border border-amber-300 rounded-lg px-2 py-1 text-right font-medium"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block text-[10px]">Técnica / Sonido ($)</label>
                  <input
                    type="number"
                    value={costTecnica}
                    onChange={(e) => setCostTecnica(Number(e.target.value))}
                    className="w-full bg-amber-50 border border-amber-300 rounded-lg px-2 py-1 text-right font-medium"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block text-[10px]">Catering ($)</label>
                  <input
                    type="number"
                    value={costCatering}
                    onChange={(e) => setCostCatering(Number(e.target.value))}
                    className="w-full bg-amber-50 border border-amber-300 rounded-lg px-2 py-1 text-right font-medium"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block text-[10px]">Insumos / Gastronomía ($)</label>
                  <input
                    type="number"
                    value={costGastronomicos}
                    onChange={(e) => setCostGastronomicos(Number(e.target.value))}
                    className="w-full bg-amber-50 border border-amber-300 rounded-lg px-2 py-1 text-right font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Costos Indirectos */}
            <div className="bg-rose-50/30 p-2.5 rounded-xl border border-rose-200/70">
              <span className="font-bold text-rose-900 block mb-2 text-[11px]">Costos Indirectos & Salón:</span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-slate-600 block text-[10px]">Limpieza ($)</label>
                  <input
                    type="number"
                    value={costLimpieza}
                    onChange={(e) => setCostLimpieza(Number(e.target.value))}
                    className="w-full bg-amber-50 border border-amber-300 rounded-lg px-2 py-1 text-right font-medium"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block text-[10px]">Seguros ($)</label>
                  <input
                    type="number"
                    value={costSeguros}
                    onChange={(e) => setCostSeguros(Number(e.target.value))}
                    className="w-full bg-amber-50 border border-amber-300 rounded-lg px-2 py-1 text-right font-medium"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block text-[10px]">RRHH Salón ($)</label>
                  <input
                    type="number"
                    value={costRrhh}
                    onChange={(e) => setCostRrhh(Number(e.target.value))}
                    className="w-full bg-amber-50 border border-amber-300 rounded-lg px-2 py-1 text-right font-medium"
                  />
                </div>
              </div>
            </div>

            {/* 🏷️ CUADRO DINÁMICO DE OTROS GASTOS */}
            <div className="pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="font-serif font-bold text-barolo-navy text-xs flex items-center">
                  🏷️ Desglose de Otros Gastos
                </span>
                <button
                  type="button"
                  onClick={addExtraExpense}
                  className="flex items-center space-x-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded-lg border border-rose-200"
                >
                  <Plus className="w-3 h-3" />
                  <span>Agregar Ítem</span>
                </button>
              </div>

              <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                {extraExpenses.map((item) => (
                  <div key={item.id} className="flex items-center space-x-1.5">
                    <input
                      type="text"
                      placeholder="Concepto (ej: Seguridad Privada)"
                      value={item.concept}
                      onChange={(e) => updateExtraExpense(item.id, 'concept', e.target.value)}
                      className="flex-1 bg-amber-50/70 border border-amber-300/80 rounded-lg px-2 py-1 text-xs font-medium"
                    />
                    <input
                      type="number"
                      placeholder="Monto ($)"
                      value={item.amount || ''}
                      onChange={(e) => updateExtraExpense(item.id, 'amount', Number(e.target.value))}
                      className="w-24 bg-amber-50/70 border border-amber-300/80 rounded-lg px-2 py-1 text-xs text-right font-medium"
                    />
                    {extraExpenses.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeExtraExpense(item.id)}
                        className="text-rose-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Punto de Equilibrio Indicator */}
      <div className="bg-gradient-to-r from-amber-50 to-barolo-gold-soft border border-barolo-gold/50 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-barolo-gold text-barolo-navy font-bold flex items-center justify-center flex-shrink-0">
            🎯
          </div>
          <div>
            <span className="font-bold text-barolo-navy block">Punto de Equilibrio (Break-Even en Vivo):</span>
            <span className="text-slate-600">
              Se necesitan vender <strong>{breakEvenTickets} entradas</strong> al precio promedio de ${ticketAvgPrice.toLocaleString('es-AR')} para cubrir los costos totales del evento.
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-slate-500 block text-[10px]">Ocupación de equilibrio</span>
          <span className="font-bold text-barolo-navy text-sm">
            {attendees > 0 ? ((breakEvenTickets / attendees) * 100).toFixed(0) : 0}% de capacidad
          </span>
        </div>
      </div>

      {/* Recuadro para Notas Comerciales e Información Adicional */}
      <div className="bg-white rounded-2xl p-5 shadow-luxury border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 pb-2.5">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-barolo-gold" />
            <h3 className="font-serif font-bold text-barolo-navy text-sm uppercase tracking-wider">
              Notas Comerciales & Información Adicional
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            Requerimientos especiales, horarios de armado, detalles de catering, acuerdos de palabra, etc.
          </span>
        </div>

        <div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Escribí aquí cualquier información adicional relevante para este evento (ej: horario de prueba de sonido, requerimientos técnicos específicos, condiciones o seña pactada, restricciones del salón, acuerdos con el productor)..."
            rows={3}
            className="w-full bg-amber-50/40 border border-amber-300/80 rounded-xl p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 focus:outline-none transition-all resize-y font-medium leading-relaxed"
          />
        </div>
      </div>

      {/* FLOATING ACTION BAR AT THE BOTTOM */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-barolo-navy text-white shadow-2xl border-t border-barolo-gold/40 p-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Real-time calculated KPIs */}
          <div className="flex flex-wrap items-center justify-around gap-4 sm:gap-8 w-full md:w-auto">
            
            <div>
              <span className="text-[10px] text-slate-300 uppercase tracking-wider block">Ingresos Brutos</span>
              <span className="text-base font-bold text-white">
                ${totalGrossIncome.toLocaleString('es-AR')}
              </span>
            </div>

            <div className="w-px h-8 bg-white/20 hidden sm:block"></div>

            <div>
              <span className="text-[10px] text-slate-300 uppercase tracking-wider block">Costos Totales</span>
              <span className="text-base font-bold text-rose-300">
                ${totalCosts.toLocaleString('es-AR')}
              </span>
            </div>

            <div className="w-px h-8 bg-white/20 hidden sm:block"></div>

            <div>
              <span className="text-[10px] text-amber-300 uppercase tracking-wider block font-bold">Ganancia Barolo</span>
              <div className="flex items-center space-x-1.5">
                <span className="text-xl font-extrabold text-emerald-400">
                  ${baroloProfit.toLocaleString('es-AR')}
                </span>
                <span className="text-xs bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500 font-bold">
                  {marginPct.toFixed(1)}%
                </span>
              </div>
            </div>

          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
            {(userCanCreate || userCanEdit) && (
              <button
                onClick={handleSaveAsQuote}
                className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-barolo-navy shadow-lg shadow-amber-500/20 transition-all transform hover:scale-105"
                title="Guardar propuesta comercial en estado Cotizado"
              >
                <FileText className="w-4 h-4" />
                <span>📝 GUARDAR COTIZACIÓN</span>
              </button>
            )}

            {userCanChange && (
              <>
                <button
                  onClick={handleSaveAsReserved}
                  className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-lg shadow-sky-600/30 transition-all transform hover:scale-105"
                  title="Guardar y bloquear fecha en estado Reservado"
                >
                  <BookmarkCheck className="w-4 h-4" />
                  <span>🔵 RESERVAR FECHA</span>
                </button>

                <button
                  onClick={handleConfirmAndSave}
                  className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-lg shadow-emerald-700/30 transition-all transform hover:scale-105"
                  title="Confirmar definitivamente y pasar a Evento Contratado"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>💾 CONFIRMAR EVENTO</span>
                </button>
              </>
            )}

            {!userCanCreate && !userCanEdit && !userCanChange && (
              <span className="text-xs text-amber-300 font-semibold italic bg-white/10 px-3 py-1.5 rounded-xl border border-white/20">
                Modo Solo Lectura: simulación activa, guardado deshabilitado.
              </span>
            )}
          </div>

        </div>
      </div>

    </div>
  )
}
