import React, { useState, useEffect, useMemo } from 'react'
import { 
  Calculator, Plus, Trash2, Save, CheckCircle2, RotateCcw, 
  Sparkles, DollarSign, Users, Calendar, MapPin, Building, AlertCircle, FileText, 
  ArrowRight, BookmarkCheck, Sliders, Lock, EyeOff, ShieldAlert, ChevronRight,
  TrendingUp, Percent, Award, Info, Scale, Check, RefreshCw, Layers
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { canCreateEvent, canEditEvent, canChangeStatus, isAdmin, canViewSensitiveData } from '../services/authService'
import { calculatorConfigService } from '../services/calculatorConfigService'

// Helper formatters
const formatARS = (val) => {
  const num = Number(val) || 0
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(num)
}

const formatARSWithDecimals = (val) => {
  const num = Number(val) || 0
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(num)
}

const formatNumber = (val) => {
  const num = Number(val) || 0
  return new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(num)
}

const formatPct = (val) => {
  const num = Number(val) || 0
  return `${num.toFixed(1)}%`
}

const MONTHS_LIST = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export default function CalculatorView({ initialEventData, onSaveEvent, onSwitchView, currentUser }) {
  const userCanCreate = canCreateEvent(currentUser)
  const userCanEdit = canEditEvent(currentUser)
  const userCanChange = canChangeStatus(currentUser)
  const isUserAdmin = isAdmin(currentUser)

  // Configuración de plantilla maestra del Administrador
  const [templateConfig, setTemplateConfig] = useState(() => calculatorConfigService.getConfig())

  useEffect(() => {
    const handleConfigChange = (e) => {
      if (e.detail) {
        setTemplateConfig(e.detail)
      }
    }
    window.addEventListener('barolo-calc-config-updated', handleConfigChange)
    return () => window.removeEventListener('barolo-calc-config-updated', handleConfigChange)
  }, [])

  // Helper para generar el estado inicial a partir de la configuración maestra
  const getCleanStateFromConfig = (cfg) => {
    const defaultExps = (cfg?.defaultExpenses || [])
      .filter(e => e.enabled !== false && e.concept?.trim())
      .map((e, idx) => ({ 
        id: `exp-init-${idx + 1}-${Date.now()}`, 
        concept: e.concept, 
        amount: Number(e.defaultAmount) || 0 
      }))
      
    const defaultIncs = (cfg?.defaultIncomes || [])
      .filter(i => i.enabled !== false && i.concept?.trim())
      .map((i, idx) => ({ 
        id: `inc-init-${idx + 1}-${Date.now()}`, 
        concept: i.concept, 
        amount: Number(i.defaultAmount) || 0 
      }))

    return {
      venue: cfg?.venues?.[0]?.name || 'Espacio Barolo',
      eventType: cfg?.eventTypes?.[0] || 'Social',
      agreementType: cfg?.agreementTypes?.[0] || '50% - 50%',
      attendees: cfg?.defaultAttendees || 35,
      extraExpenses: defaultExps.length > 0 ? defaultExps : [{ id: 'exp-1', concept: '', amount: 0 }],
      extraIncomes: defaultIncs.length > 0 ? defaultIncs : [{ id: 'inc-1', concept: '', amount: 0 }]
    }
  }

  // ==========================================
  // ESTADOS - BLOQUE 1: DATOS GENERALES Y CLIENTE
  // ==========================================
  const [eventId, setEventId] = useState(initialEventData?.id || null)
  const [calcCode, setCalcCode] = useState(initialEventData?.calc_code || '')
  const [eventName, setEventName] = useState(initialEventData?.name || '')
  const [clientName, setClientName] = useState(initialEventData?.client_name || '')
  const [clientCuit, setClientCuit] = useState(initialEventData?.client_cuit || '')
  const [clientContact, setClientContact] = useState(initialEventData?.client_contact || '')
  const [clientEmail, setClientEmail] = useState(initialEventData?.client_email || '')
  const [contactDate, setContactDate] = useState(initialEventData?.contact_date || new Date().toISOString().substring(0, 10))
  const [eventDate, setEventDate] = useState(initialEventData?.event_date || new Date().toISOString().substring(0, 10))
  const [eventTime, setEventTime] = useState(initialEventData?.event_time || '19:00')
  const [month, setMonth] = useState(() => {
    if (initialEventData?.month) return initialEventData.month
    const d = new Date()
    return MONTHS_LIST[d.getMonth()] || 'Enero'
  })
  const [venue, setVenue] = useState(initialEventData?.venue || templateConfig.venues?.[0]?.name || 'Espacio Barolo')
  const [eventType, setEventType] = useState(initialEventData?.event_type || templateConfig.eventTypes?.[0] || 'Social')
  const [origin, setOrigin] = useState(initialEventData?.origin || 'Externo')
  const [invoiceType, setInvoiceType] = useState(initialEventData?.invoice_type || 'Factura A')
  const [paymentMethod, setPaymentMethod] = useState(initialEventData?.payment_method || 'Transferencia')
  const [agreementType, setAgreementType] = useState(initialEventData?.agreement_type || templateConfig.agreementTypes?.[0] || '50% - 50%')
  const [eventStatus, setEventStatus] = useState(initialEventData?.status || 'cotizado')
  const [attendees, setAttendees] = useState(initialEventData?.attendees || templateConfig.defaultAttendees || 35)
  const [notes, setNotes] = useState(initialEventData?.notes || '')
  const [sensitiveNotes, setSensitiveNotes] = useState(initialEventData?.sensitive_notes || '')

  // Sincronizar mes automáticamente al cambiar fecha de evento si el usuario no lo forzó manualmente
  const handleDateChange = (newDate) => {
    setEventDate(newDate)
    if (newDate) {
      try {
        const parts = newDate.split('-')
        if (parts.length === 3) {
          const mIdx = parseInt(parts[1], 10) - 1
          if (mIdx >= 0 && mIdx < 12) {
            setMonth(MONTHS_LIST[mIdx])
          }
        }
      } catch (e) {}
    }
  }

  // ==========================================
  // ESTADOS - BLOQUE 2: DETALLE DE INGRESOS
  // ==========================================
  const [preventaQty, setPreventaQty] = useState(0)
  const [preventaPrice, setPreventaPrice] = useState(0)
  const [generalQty, setGeneralQty] = useState(0)
  const [generalPrice, setGeneralPrice] = useState(0)
  const [alquilerEspacio, setAlquilerEspacio] = useState(0)
  const [contratacionSalon, setContratacionSalon] = useState(0)
  const [comisionCatering, setComisionCatering] = useState(0)
  const [otrosIngresos, setOtrosIngresos] = useState(0)

  // Desglose dinámico opcional de otros ingresos adicionales
  const [extraIncomes, setExtraIncomes] = useState(() => {
    if (initialEventData?.extra_incomes && initialEventData.extra_incomes.length > 0) {
      return initialEventData.extra_incomes
    }
    return []
  })

  // ==========================================
  // ESTADOS - BLOQUE 3: COSTOS DEL EVENTO (Desglose exacto Excel)
  // ==========================================
  const [costArtistas, setCostArtistas] = useState(0)
  const [costTecnica, setCostTecnica] = useState(0)
  const [costDisertantes, setCostDisertantes] = useState(0)
  const [costMobiliario, setCostMobiliario] = useState(0)
  const [costRrhh, setCostRrhh] = useState(0)
  const [costCatering, setCostCatering] = useState(0)
  const [costLimpieza, setCostLimpieza] = useState(0)
  const [costSeguros, setCostSeguros] = useState(0)
  const [costAlquilerEspacio, setCostAlquilerEspacio] = useState(0)
  const [costGastronomicos, setCostGastronomicos] = useState(0)
  const [costMarketing, setCostMarketing] = useState(0)
  const [costSadaic, setCostSadaic] = useState(0)
  const [costOtrosOperativos, setCostOtrosOperativos] = useState(0)

  // Desglose dinámico opcional de otros gastos adicionales
  const [extraExpenses, setExtraExpenses] = useState(() => {
    if (initialEventData?.extra_expenses && initialEventData.extra_expenses.length > 0) {
      return initialEventData.extra_expenses
    }
    return []
  })

  // ==========================================
  // RESTAURAR DATOS AL ABRIR UN EVENTO
  // ==========================================
  useEffect(() => {
    if (initialEventData) {
      setEventId(initialEventData.id || null)
      setCalcCode(initialEventData.calc_code || '')
      setEventName(initialEventData.name || '')
      setClientName(initialEventData.client_name || '')
      setClientCuit(initialEventData.client_cuit || '')
      setClientContact(initialEventData.client_contact || '')
      setClientEmail(initialEventData.client_email || '')
      setContactDate(initialEventData.contact_date || initialEventData.event_date || new Date().toISOString().substring(0, 10))
      setEventDate(initialEventData.event_date || new Date().toISOString().substring(0, 10))
      setEventTime(initialEventData.event_time || '19:00')
      setMonth(initialEventData.month || 'Enero')
      setVenue(initialEventData.venue || 'Espacio Barolo')
      setEventType(initialEventData.event_type || 'Social')
      setOrigin(initialEventData.origin || 'Externo')
      setInvoiceType(initialEventData.invoice_type || 'Factura A')
      setPaymentMethod(initialEventData.payment_method || 'Transferencia')
      setAgreementType(initialEventData.agreement_type || '50% - 50%')
      setEventStatus(initialEventData.status || 'cotizado')
      setAttendees(Number(initialEventData.attendees) || 35)
      setNotes(initialEventData.notes || '')
      setSensitiveNotes(initialEventData.sensitive_notes || '')

      // 1. Ingresos
      setPreventaQty(Number(initialEventData.preventa_qty) || 0)
      setPreventaPrice(Number(initialEventData.preventa_price) || 0)
      setGeneralQty(Number(initialEventData.general_qty) || 0)
      setGeneralPrice(Number(initialEventData.general_price) || 0)
      setAlquilerEspacio(Number(initialEventData.alquiler_espacio) || 0)
      setContratacionSalon(Number(initialEventData.contratacion_salon) || 0)
      setComisionCatering(Number(initialEventData.comision_catering) || 0)
      setOtrosIngresos(Number(initialEventData.otros_ingresos) || 0)

      if (initialEventData.extra_incomes && Array.isArray(initialEventData.extra_incomes)) {
        setExtraIncomes(initialEventData.extra_incomes)
      } else {
        setExtraIncomes([])
      }

      // 2. Costos
      setCostArtistas(Number(initialEventData.cost_artistas) || 0)
      setCostTecnica(Number(initialEventData.cost_tecnica) || 0)
      setCostDisertantes(Number(initialEventData.cost_disertantes) || 0)
      setCostMobiliario(Number(initialEventData.cost_mobiliario) || 0)
      setCostRrhh(Number(initialEventData.cost_rrhh) || 0)
      setCostCatering(Number(initialEventData.cost_catering) || 0)
      setCostLimpieza(Number(initialEventData.cost_limpieza) || 0)
      setCostSeguros(Number(initialEventData.cost_seguros) || 0)
      setCostAlquilerEspacio(Number(initialEventData.cost_alquiler_espacio) || 0)
      setCostGastronomicos(Number(initialEventData.cost_gastronomicos) || 0)
      setCostMarketing(Number(initialEventData.cost_marketing) || 0)
      setCostSadaic(Number(initialEventData.cost_sadaic) || 0)
      setCostOtrosOperativos(Number(initialEventData.cost_otros_operativos) || 0)

      if (initialEventData.extra_expenses && Array.isArray(initialEventData.extra_expenses)) {
        setExtraExpenses(initialEventData.extra_expenses)
      } else {
        setExtraExpenses([])
      }
    } else {
      const cfg = calculatorConfigService.getConfig()
      const clean = getCleanStateFromConfig(cfg)
      setEventId(null)
      setCalcCode('')
      setEventName('')
      setClientName('')
      setClientCuit('')
      setClientContact('')
      setClientEmail('')
      const today = new Date().toISOString().substring(0, 10)
      setContactDate(today)
      setEventDate(today)
      setEventTime('19:00')
      const d = new Date()
      setMonth(MONTHS_LIST[d.getMonth()] || 'Enero')
      setVenue(clean.venue)
      setEventType(clean.eventType)
      setOrigin('Externo')
      setInvoiceType('Factura A')
      setPaymentMethod('Transferencia')
      setAgreementType(clean.agreementType)
      setEventStatus('cotizado')
      setAttendees(clean.attendees)
      setNotes('')
      setSensitiveNotes('')
      setPreventaQty(0)
      setPreventaPrice(0)
      setGeneralQty(0)
      setGeneralPrice(0)
      setAlquilerEspacio(0)
      setContratacionSalon(0)
      setComisionCatering(0)
      setOtrosIngresos(0)
      setExtraIncomes([])
      setCostArtistas(0)
      setCostTecnica(0)
      setCostDisertantes(0)
      setCostMobiliario(0)
      setCostRrhh(0)
      setCostCatering(0)
      setCostLimpieza(0)
      setCostSeguros(0)
      setCostAlquilerEspacio(0)
      setCostGastronomicos(0)
      setCostMarketing(0)
      setCostSadaic(0)
      setCostOtrosOperativos(0)
      setExtraExpenses([])
    }
  }, [initialEventData])

  // ==========================================
  // GESTIÓN DE FILAS DINÁMICAS EXTRAS
  // ==========================================
  const addExtraIncome = () => {
    setExtraIncomes(prev => [...prev, { id: `inc-${Date.now()}`, concept: '', amount: 0 }])
  }
  const removeExtraIncome = (id) => {
    setExtraIncomes(prev => prev.filter(i => i.id !== id))
  }
  const updateExtraIncome = (id, field, value) => {
    setExtraIncomes(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i))
  }
  const toggleIncomeSensitive = (id) => {
    setExtraIncomes(prev => prev.map(inc => {
      if (inc.id === id) {
        const nextSensitive = !inc.is_sensitive
        return {
          ...inc,
          is_sensitive: nextSensitive,
          author_id: nextSensitive ? (inc.author_id || currentUser?.id) : null,
          author_name: nextSensitive ? (inc.author_name || currentUser?.displayName || currentUser?.name) : null,
          author_email: nextSensitive ? (inc.author_email || currentUser?.email) : null
        }
      }
      return inc
    }))
  }

  const addExtraExpense = () => {
    setExtraExpenses(prev => [...prev, { id: `exp-${Date.now()}`, concept: '', amount: 0 }])
  }
  const removeExtraExpense = (id) => {
    setExtraExpenses(prev => prev.filter(e => e.id !== id))
  }
  const updateExtraExpense = (id, field, value) => {
    setExtraExpenses(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e))
  }
  const toggleExpenseSensitive = (id) => {
    setExtraExpenses(prev => prev.map(exp => {
      if (exp.id === id) {
        const nextSensitive = !exp.is_sensitive
        return {
          ...exp,
          is_sensitive: nextSensitive,
          author_id: nextSensitive ? (exp.author_id || currentUser?.id) : null,
          author_name: nextSensitive ? (exp.author_name || currentUser?.displayName || currentUser?.name) : null,
          author_email: nextSensitive ? (exp.author_email || currentUser?.email) : null
        }
      }
      return exp
    }))
  }

  // ==========================================
  // CÁLCULOS REACTIVOS EN VIVO (100% IDÉNTICOS AL EXCEL)
  // ==========================================
  const subtotalPreventa = (Number(preventaQty) || 0) * (Number(preventaPrice) || 0)
  const subtotalGeneral = (Number(generalQty) || 0) * (Number(generalPrice) || 0)
  const totalTicketsVendidos = (Number(preventaQty) || 0) + (Number(generalQty) || 0)
  const totalTicketing = subtotalPreventa + subtotalGeneral

  // Ingreso Prom. x Entrada
  const ticketAvgPrice = totalTicketsVendidos > 0 
    ? (totalTicketing / totalTicketsVendidos) 
    : (Number(generalPrice) || Number(preventaPrice) || 0)

  // Extra incomes sum
  const totalExtraIncomes = extraIncomes.reduce((acc, i) => acc + (Number(i.amount) || 0), 0)

  // TOTAL INGRESOS
  const totalGrossIncome = totalTicketing + 
    (Number(alquilerEspacio) || 0) + 
    (Number(contratacionSalon) || 0) + 
    (Number(comisionCatering) || 0) + 
    (Number(otrosIngresos) || 0) + 
    totalExtraIncomes

  // Extra expenses sum
  const totalExtraExpenses = extraExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0)

  // Suma Rubro por Rubro de Costos
  const totalDirectCosts = 
    (Number(costArtistas) || 0) + 
    (Number(costTecnica) || 0) + 
    (Number(costDisertantes) || 0) + 
    (Number(costMobiliario) || 0) + 
    (Number(costCatering) || 0) + 
    (Number(costGastronomicos) || 0)

  const totalIndirectCosts = 
    (Number(costRrhh) || 0) + 
    (Number(costLimpieza) || 0) + 
    (Number(costSeguros) || 0) + 
    (Number(costAlquilerEspacio) || 0) + 
    (Number(costMarketing) || 0) + 
    (Number(costSadaic) || 0) + 
    (Number(costOtrosOperativos) || 0) + 
    totalExtraExpenses

  // TOTAL COSTOS
  const totalCosts = totalDirectCosts + totalIndirectCosts

  // MARGEN BRUTO OPERACIÓN
  const netMargin = totalGrossIncome - totalCosts

  // PARTICIPACIÓN Y GANANCIA NETA BAROLO
  let baroloProfit = 0
  let baroloPctLabel = '50%'
  if (agreementType === '100% Barolo') {
    baroloProfit = netMargin
    baroloPctLabel = '100%'
  } else if (agreementType === '50% - 50%') {
    baroloProfit = netMargin * 0.50
    baroloPctLabel = '50%'
  } else if (agreementType === '70% Barolo - 30% Productor') {
    baroloProfit = netMargin * 0.70
    baroloPctLabel = '70%'
  } else if (agreementType === '30% Barolo - 70% Productor') {
    baroloProfit = netMargin * 0.30
    baroloPctLabel = '30%'
  } else if (agreementType === 'Solo Alquiler') {
    baroloProfit = (Number(alquilerEspacio) || 0) + (Number(contratacionSalon) || 0)
    baroloPctLabel = 'Fijo Alquiler'
  } else {
    baroloProfit = netMargin * 0.50
    baroloPctLabel = '50%'
  }

  // Margen % sobre Ingresos
  const marginPct = totalGrossIncome > 0 ? ((baroloProfit / totalGrossIncome) * 100) : 0

  // PUNTO DE EQUILIBRIO (BREAK-EVEN)
  // Entradas necesarias para cubrir costos fijos
  const breakEvenTickets = ticketAvgPrice > 0 ? Math.ceil(totalCosts / ticketAvgPrice) : 0
  const totalCupos = Number(attendees) || 0
  const breakEvenPct = totalCupos > 0 ? ((breakEvenTickets / totalCupos) * 100) : 0

  // Semáforo de Riesgo Break-Even
  const breakEvenBadge = useMemo(() => {
    if (totalCosts === 0) {
      return { label: '🟢 SIN COSTOS', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' }
    }
    if (breakEvenPct <= 70) {
      return { label: '🟢 EXCELENTE (Cubre con < 70% cupos)', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' }
    }
    if (breakEvenPct <= 90) {
      return { label: '🟡 MODERADO (Requiere entre 70% y 90% cupos)', color: 'bg-amber-100 text-amber-900 border-amber-300' }
    }
    return { label: '🔴 RIESGO ALTO (Requiere > 90% cupos)', color: 'bg-rose-100 text-rose-800 border-rose-300' }
  }, [breakEvenPct, totalCosts])

  // MARGEN Y EVALUACIÓN
  const gananciaNetaXAsistente = totalCupos > 0 ? (baroloProfit / totalCupos) : 0
  const costoPromedioXAsistente = totalCupos > 0 ? (totalCosts / totalCupos) : 0
  const relacionIngresoCosto = totalCosts > 0 ? (totalGrossIncome / totalCosts) : (totalGrossIncome > 0 ? 99 : 0)

  // Mensaje de recomendación ejecutiva
  const adviceMessage = useMemo(() => {
    if (baroloProfit < 0) {
      return '⚠️ ATENCIÓN: El evento proyecta un margen negativo para Barolo. Se sugiere incrementar el valor de entradas, ampliar cupos o renegociar costos de producción.'
    }
    if (breakEvenPct > 90) {
      return '⚠️ RIESGO COMERCIAL ELEVADO: El punto de equilibrio supera el 90% de ocupación. Requiere asegurar preventas firmes antes de confirmar fecha.'
    }
    if (marginPct >= 30) {
      return '⭐ EXCELENTE RENTABILIDAD: Margen superior al 30% con excelente retorno sobre costo. Operación altamente recomendada para confirmación.'
    }
    return '✅ VIABILIDAD ECONÓMICA APROBADA: Parámetros dentro de los rangos históricos promedio de Barolo. Relación ingreso/costo saludable.'
  }, [baroloProfit, breakEvenPct, marginPct])

  // Limpiar calculadora
  const handleReset = () => {
    if (confirm('¿Deseas vaciar la calculadora para preparar una nueva cotización?')) {
      const cfg = calculatorConfigService.getConfig()
      const clean = getCleanStateFromConfig(cfg)
      setEventId(null)
      setCalcCode('')
      setEventName('')
      setClientName('')
      setClientCuit('')
      setClientContact('')
      setClientEmail('')
      const today = new Date().toISOString().substring(0, 10)
      setContactDate(today)
      setEventDate(today)
      setEventTime('19:00')
      const d = new Date()
      setMonth(MONTHS_LIST[d.getMonth()] || 'Enero')
      setVenue(clean.venue)
      setEventType(clean.eventType)
      setOrigin('Externo')
      setInvoiceType('Factura A')
      setPaymentMethod('Transferencia')
      setAgreementType(clean.agreementType)
      setEventStatus('cotizado')
      setAttendees(clean.attendees)
      setNotes('')
      setSensitiveNotes('')
      setPreventaQty(0)
      setPreventaPrice(0)
      setGeneralQty(0)
      setGeneralPrice(0)
      setAlquilerEspacio(0)
      setContratacionSalon(0)
      setComisionCatering(0)
      setOtrosIngresos(0)
      setExtraIncomes([])
      setCostArtistas(0)
      setCostTecnica(0)
      setCostDisertantes(0)
      setCostMobiliario(0)
      setCostRrhh(0)
      setCostCatering(0)
      setCostLimpieza(0)
      setCostSeguros(0)
      setCostAlquilerEspacio(0)
      setCostGastronomicos(0)
      setCostMarketing(0)
      setCostSadaic(0)
      setCostOtrosOperativos(0)
      setExtraExpenses([])
    }
  }

  // Generador del payload para persistencia
  const buildPayload = (overrideStatus) => {
    const finalStatus = overrideStatus || eventStatus || 'cotizado'
    const defaultPrefix = finalStatus === 'cotizado' ? 'Cotización' : finalStatus === 'reservado' ? 'Reserva' : 'Evento'
    const finalName = eventName.trim() || `${defaultPrefix} ${eventType} - ${clientName || 'Cliente'}`

    const finalExtraExpenses = extraExpenses.map(exp => {
      if (exp.is_sensitive && !canViewSensitiveData(exp, currentUser) && initialEventData?.extra_expenses) {
        const orig = initialEventData.extra_expenses.find(o => o.id === exp.id)
        if (orig) return orig
      }
      return exp
    }).filter(e => e.concept || Number(e.amount) > 0)

    const finalExtraIncomes = extraIncomes.map(inc => {
      if (inc.is_sensitive && !canViewSensitiveData(inc, currentUser) && initialEventData?.extra_incomes) {
        const orig = initialEventData.extra_incomes.find(o => o.id === inc.id)
        if (orig) return orig
      }
      return inc
    }).filter(i => i.concept || Number(i.amount) > 0)

    const finalSensitiveNotes = (!eventId || canViewSensitiveData(initialEventData, currentUser))
      ? sensitiveNotes.trim()
      : (initialEventData?.sensitive_notes || '')

    return {
      id: eventId || undefined,
      calc_code: calcCode || undefined,
      name: finalName,
      client_name: clientName || 'Cliente Particular',
      client_cuit: clientCuit,
      client_contact: clientContact,
      client_email: clientEmail,
      contact_date: contactDate,
      event_date: eventDate,
      event_time: eventTime,
      month: month,
      venue,
      event_type: eventType,
      origin,
      invoice_type: invoiceType,
      payment_method: paymentMethod,
      status: finalStatus,
      agreement_type: agreementType,
      attendees: Number(attendees) || 35,
      preventa_qty: Number(preventaQty) || 0,
      preventa_price: Number(preventaPrice) || 0,
      general_qty: Number(generalQty) || 0,
      general_price: Number(generalPrice) || 0,
      ticket_qty: totalTicketsVendidos,
      ticket_price: ticketAvgPrice,
      alquiler_espacio: Number(alquilerEspacio) || 0,
      contratacion_salon: Number(contratacionSalon) || 0,
      comision_catering: Number(comisionCatering) || 0,
      otros_ingresos: Number(otrosIngresos) || 0,
      extra_incomes: finalExtraIncomes,
      cost_artistas: Number(costArtistas) || 0,
      cost_tecnica: Number(costTecnica) || 0,
      cost_disertantes: Number(costDisertantes) || 0,
      cost_mobiliario: Number(costMobiliario) || 0,
      cost_rrhh: Number(costRrhh) || 0,
      cost_catering: Number(costCatering) || 0,
      cost_limpieza: Number(costLimpieza) || 0,
      cost_seguros: Number(costSeguros) || 0,
      cost_alquiler_espacio: Number(costAlquilerEspacio) || 0,
      cost_gastronomicos: Number(costGastronomicos) || 0,
      cost_marketing: Number(costMarketing) || 0,
      cost_sadaic: Number(costSadaic) || 0,
      cost_otros_operativos: Number(costOtrosOperativos) || 0,
      extra_expenses: finalExtraExpenses,
      gross_income: totalGrossIncome,
      direct_costs: totalDirectCosts,
      indirect_costs: totalIndirectCosts,
      total_costs: totalCosts,
      net_profit: netMargin,
      barolo_profit: baroloProfit,
      margin_pct: marginPct,
      has_sensitive_data: finalExtraExpenses.some(e => e.is_sensitive) || finalExtraIncomes.some(i => i.is_sensitive) || Boolean(finalSensitiveNotes),
      sensitive_notes: finalSensitiveNotes || undefined,
      created_by_user_id: eventId ? (initialEventData?.created_by_user_id || currentUser?.id) : currentUser?.id,
      created_by_name: eventId ? (initialEventData?.created_by_name || currentUser?.displayName || currentUser?.name) : (currentUser?.displayName || currentUser?.name),
      created_by_email: eventId ? (initialEventData?.created_by_email || currentUser?.email) : currentUser?.email,
      notes: notes.trim() || (
        finalStatus === 'cotizado' ? 'Cotización guardada en el sistema.' :
        finalStatus === 'reservado' ? 'Fecha reservada. En espera de confirmación definitiva.' :
        'Evento confirmado y cerrado.'
      )
    }
  }

  const handleSaveAsQuote = () => {
    const payload = buildPayload('cotizado')
    setEventStatus('cotizado')
    onSaveEvent(payload, 'cotizado')
  }

  const handleSaveAsReserved = () => {
    const payload = buildPayload('reservado')
    setEventStatus('reservado')
    onSaveEvent(payload, 'reservado')
  }

  const handleConfirmAndSave = () => {
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } })
    const payload = buildPayload('contratado')
    setEventStatus('contratado')
    onSaveEvent(payload, 'contratado')
  }

  return (
    <div className="space-y-6 pb-32">
      
      {/* ========================================================================= */}
      {/* HEADER BANNER EJECUTIVO PALACIO BAROLO */}
      {/* ========================================================================= */}
      <div className="bg-[#0f172a] text-white rounded-2xl shadow-xl border border-slate-800 p-5 sm:p-6 relative overflow-hidden">
        {/* Glow de fondo decorativo */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute left-1/3 -bottom-20 w-80 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="text-2xl sm:text-3xl">🏛️</span>
              <div>
                <h1 className="text-lg sm:text-2xl font-serif font-bold tracking-tight text-white flex items-center gap-2">
                  <span>PALACIO BAROLO</span>
                  <span className="hidden sm:inline text-amber-400 font-light">—</span>
                  <span className="text-amber-400 font-sans text-xs sm:text-base font-semibold uppercase tracking-wider">
                    Calculadora y Cotizador Integral de Eventos
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Matriz oficial de liquidación, balance proyectado, simulación de costos y análisis de rentabilidad
                </p>
              </div>
            </div>
          </div>

          {/* Sub-bar / Acciones rápidas de guardado */}
          <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
            <button
              onClick={handleReset}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white transition-all border border-slate-700"
              title="Limpiar campos para nueva cotización"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpiar</span>
            </button>

            {(userCanCreate || userCanEdit) && (
              <button
                onClick={handleSaveAsQuote}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl font-bold text-xs bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-lg shadow-amber-400/20 transition-all cursor-pointer"
                title="Guardar como Cotización preliminar"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>📝 Cotización</span>
              </button>
            )}

            {userCanChange && (
              <>
                <button
                  onClick={handleSaveAsReserved}
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl font-bold text-xs bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/25 transition-all cursor-pointer"
                  title="Guardar como Fecha Reservada"
                >
                  <BookmarkCheck className="w-3.5 h-3.5" />
                  <span>🔵 Reservado</span>
                </button>

                <button
                  onClick={handleConfirmAndSave}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/30 transition-all cursor-pointer"
                  title="Confirmar en firme como Evento Contratado"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>💾 Confirmar Evento</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Sub-bar con Estado, N° de Calculadora y Leyenda de Celdas */}
        <div className="relative z-10 mt-5 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {/* Selector de Estado */}
            <div className="flex items-center space-x-2">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">ESTADO:</span>
              <select
                value={eventStatus}
                onChange={(e) => setEventStatus(e.target.value)}
                className={`font-bold px-3 py-1 rounded-lg text-xs border cursor-pointer outline-none transition-all ${
                  eventStatus === 'contratado' ? 'bg-emerald-600 text-white border-emerald-500' :
                  eventStatus === 'reservado' ? 'bg-sky-600 text-white border-sky-500' :
                  'bg-amber-400 text-slate-950 border-amber-300'
                }`}
              >
                <option value="cotizado" className="bg-white text-slate-900">🟡 Cotizado</option>
                <option value="reservado" className="bg-white text-slate-900">🔵 Reservado</option>
                <option value="contratado" className="bg-white text-slate-900">🟢 Confirmado</option>
              </select>
            </div>

            {/* N° Calculadora */}
            <div className="flex items-center space-x-2">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">N° CALCULADORA:</span>
              <input
                type="text"
                value={calcCode}
                onChange={(e) => setCalcCode(e.target.value)}
                placeholder="Ej: LC-076"
                className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-amber-300 font-mono font-bold text-xs text-center focus:border-amber-400 outline-none"
              />
            </div>
          </div>

          {/* Leyenda Oficial Excel */}
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-300 bg-slate-900/80 px-3.5 py-1.5 rounded-xl border border-slate-800">
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-[#fef08a] border border-amber-400 shadow-sm inline-block"></span>
              <span><strong>Celdas Amarillas</strong> = Datos a completar</span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-[#f1f5f9] border border-slate-400 shadow-sm inline-block"></span>
              <span><strong>Celdas Grises</strong> = Fórmulas automáticas</span>
            </span>
          </div>

        </div>
      </div>

      {/* Cartel flotante de aviso si se está editando */}
      {eventId && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-amber-950 shadow-sm">
          <div className="flex items-center space-x-2">
            <span className="font-bold">📝 Editando registro cargado:</span>
            <span className="font-mono bg-amber-200/70 px-2 py-0.5 rounded font-bold">{calcCode || 'ID: ' + eventId}</span>
            <span>— {eventName || clientName || 'Sin título'}</span>
          </div>
          <button
            onClick={handleReset}
            className="text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer"
          >
            Volver a calculadora en blanco
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MATRIZ DE 6 BLOQUES — GRID 2 COLUMNAS (7 / 5) RESPONSIVE */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ------------------------------------------------------------------------- */}
        {/* COLUMNA IZQUIERDA (7 cols): BLOQUES 1, 2 Y 3 (DATOS, INGRESOS Y COSTOS)  */}
        {/* ------------------------------------------------------------------------- */}
        <div className="lg:col-span-7 space-y-6">

          {/* ======================================================================= */}
          {/* BLOQUE 1: DATOS GENERALES Y CLIENTE */}
          {/* ======================================================================= */}
          <div className="bg-white rounded-2xl shadow-luxury border border-slate-200 overflow-hidden">
            {/* Header del bloque */}
            <div className="bg-[#0f172a] text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Building className="w-4 h-4 text-amber-400" />
                <h2 className="font-serif font-bold text-xs uppercase tracking-wider text-amber-300">
                  1. DATOS GENERALES Y CLIENTE
                </h2>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">MATRIZ REGISTRO</span>
            </div>

            {/* Tabla de campos */}
            <div className="p-4 sm:p-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                
                {/* Nombre del Evento */}
                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">Nombre del Evento</label>
                  <input
                    type="text"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder="Ej: Experiencia Dante Alighieri & Maridaje"
                    className="w-full bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white border border-[#fde047] focus:border-amber-500 rounded-lg px-3 py-2 text-slate-900 font-medium outline-none transition-colors"
                  />
                </div>

                {/* Cliente / Referente */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nombre del Cliente / Referente</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ej: Camila Ocampo"
                    className="w-full bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white border border-[#fde047] focus:border-amber-500 rounded-lg px-3 py-2 text-slate-900 font-medium outline-none transition-colors"
                  />
                </div>

                {/* CUIT / Identificación */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">CUIT / Identificación</label>
                  <input
                    type="text"
                    value={clientCuit}
                    onChange={(e) => setClientCuit(e.target.value)}
                    placeholder="20-XXXXXXXX-X"
                    className="w-full bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white border border-[#fde047] focus:border-amber-500 rounded-lg px-3 py-2 text-slate-900 font-medium outline-none transition-colors"
                  />
                </div>

                {/* Datos de Contacto (Tel / WP) */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Datos de Contacto (Tel / WP)</label>
                  <input
                    type="text"
                    value={clientContact}
                    onChange={(e) => setClientContact(e.target.value)}
                    placeholder="+54 9 11 ..."
                    className="w-full bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white border border-[#fde047] focus:border-amber-500 rounded-lg px-3 py-2 text-slate-900 font-medium outline-none transition-colors"
                  />
                </div>

                {/* Correo Electrónico */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="cliente@ejemplo.com"
                    className="w-full bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white border border-[#fde047] focus:border-amber-500 rounded-lg px-3 py-2 text-slate-900 font-medium outline-none transition-colors"
                  />
                </div>

                {/* Fecha de Contacto */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Fecha de Contacto</label>
                  <input
                    type="date"
                    value={contactDate}
                    onChange={(e) => setContactDate(e.target.value)}
                    className="w-full bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white border border-[#fde047] focus:border-amber-500 rounded-lg px-3 py-2 text-slate-900 font-medium outline-none transition-colors"
                  />
                </div>

                {/* Fecha del Evento */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Fecha del Evento</label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white border border-[#fde047] focus:border-amber-500 rounded-lg px-3 py-2 text-slate-900 font-medium outline-none transition-colors"
                  />
                </div>

                {/* Mes (Imputación) */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mes (Imputación)</label>
                  <select
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="w-full bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white border border-[#fde047] focus:border-amber-500 rounded-lg px-3 py-2 text-slate-900 font-medium outline-none transition-colors"
                  >
                    {MONTHS_LIST.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* Lugar */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Lugar</label>
                  <select
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    className="w-full bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white border border-[#fde047] focus:border-amber-500 rounded-lg px-3 py-2 text-slate-900 font-medium outline-none transition-colors"
                  >
                    {(templateConfig?.venues || []).map((v) => (
                      <option key={v.id || v.name} value={v.name}>{v.name}</option>
                    ))}
                    {venue && !(templateConfig?.venues || []).some(v => v.name === venue) && (
                      <option value={venue}>{venue}</option>
                    )}
                  </select>
                </div>

                {/* Tipo de Evento */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tipo de Evento</label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="w-full bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white border border-[#fde047] focus:border-amber-500 rounded-lg px-3 py-2 text-slate-900 font-medium outline-none transition-colors"
                  >
                    {(templateConfig?.eventTypes || ['Social', 'Corporativo', 'Desfile', 'Show', 'Experiencia']).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                    {eventType && !(templateConfig?.eventTypes || []).includes(eventType) && (
                      <option value={eventType}>{eventType}</option>
                    )}
                  </select>
                </div>

                {/* Origen */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Origen</label>
                  <select
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    className="w-full bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white border border-[#fde047] focus:border-amber-500 rounded-lg px-3 py-2 text-slate-900 font-medium outline-none transition-colors"
                  >
                    <option value="Externo">Externo</option>
                    <option value="Producción Propia">Producción Propia</option>
                    <option value="Coproducción">Coproducción</option>
                    <option value="Alianza Comercial">Alianza Comercial</option>
                  </select>
                </div>

                {/* Tipo de Facturación */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tipo de Facturación</label>
                  <select
                    value={invoiceType}
                    onChange={(e) => setInvoiceType(e.target.value)}
                    className="w-full bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white border border-[#fde047] focus:border-amber-500 rounded-lg px-3 py-2 text-slate-900 font-medium outline-none transition-colors"
                  >
                    <option value="Factura A">Factura A (Responsable Inscripto)</option>
                    <option value="Factura B">Factura B (Consumidor Final / Exento)</option>
                    <option value="Factura C">Factura C (Monotributo)</option>
                    <option value="Sin Factura">Sin Factura / Recibo Interno</option>
                  </select>
                </div>

                {/* Método de Pago */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Método de Pago</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white border border-[#fde047] focus:border-amber-500 rounded-lg px-3 py-2 text-slate-900 font-medium outline-none transition-colors"
                  >
                    <option value="Transferencia">Transferencia Bancaria</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Tarjeta de Crédito">Tarjeta de Crédito</option>
                    <option value="Mixto">Mixto (Seña + Saldo)</option>
                  </select>
                </div>

                {/* Cantidad de Personas / Cupos */}
                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700 block mb-1">
                    Cantidad de Personas / Cupos Totales
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={attendees}
                    onChange={(e) => setAttendees(e.target.value)}
                    className="w-full bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white border border-[#fde047] focus:border-amber-500 rounded-lg px-3 py-2 text-slate-900 font-bold text-right outline-none transition-colors"
                  />
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Define la capacidad máxima proyectada y base de cálculo del Punto de Equilibrio.
                  </p>
                </div>

              </div>
            </div>
          </div>

          {/* ======================================================================= */}
          {/* BLOQUE 2: DETALLE DE INGRESOS */}
          {/* ======================================================================= */}
          <div className="bg-white rounded-2xl shadow-luxury border border-slate-200 overflow-hidden">
            {/* Header del bloque */}
            <div className="bg-[#0f172a] text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-amber-400" />
                <h2 className="font-serif font-bold text-xs uppercase tracking-wider text-amber-300">
                  2. DETALLE DE INGRESOS
                </h2>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">TICKETING & CONCEPTOS</span>
            </div>

            {/* Tabla de Ingresos */}
            <div className="p-4 sm:p-5 space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                      <th className="py-2 px-2">Rubro / Detalle</th>
                      <th className="py-2 px-2 text-right w-24">Cantidad</th>
                      <th className="py-2 px-2 text-right w-28">Precio Unitario</th>
                      <th className="py-2 px-2 text-right w-32">Subtotal ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    
                    {/* Entradas Preventa */}
                    <tr className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-2 font-bold text-slate-800">Entradas Preventa</td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          min="0"
                          value={preventaQty}
                          onChange={(e) => setPreventaQty(e.target.value)}
                          className="w-full bg-[#fef9c3] border border-[#fde047] focus:bg-white rounded-lg px-2 py-1.5 text-right font-medium outline-none"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          min="0"
                          step="500"
                          value={preventaPrice}
                          onChange={(e) => setPreventaPrice(e.target.value)}
                          className="w-full bg-[#fef9c3] border border-[#fde047] focus:bg-white rounded-lg px-2 py-1.5 text-right font-medium outline-none"
                        />
                      </td>
                      <td className="py-2 px-2 text-right">
                        <div className="bg-[#f1f5f9] border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-slate-800">
                          {formatARS(subtotalPreventa)}
                        </div>
                      </td>
                    </tr>

                    {/* Entradas General */}
                    <tr className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-2 font-bold text-slate-800">Entradas General</td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          min="0"
                          value={generalQty}
                          onChange={(e) => setGeneralQty(e.target.value)}
                          className="w-full bg-[#fef9c3] border border-[#fde047] focus:bg-white rounded-lg px-2 py-1.5 text-right font-medium outline-none"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          min="0"
                          step="500"
                          value={generalPrice}
                          onChange={(e) => setGeneralPrice(e.target.value)}
                          className="w-full bg-[#fef9c3] border border-[#fde047] focus:bg-white rounded-lg px-2 py-1.5 text-right font-medium outline-none"
                        />
                      </td>
                      <td className="py-2 px-2 text-right">
                        <div className="bg-[#f1f5f9] border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-slate-800">
                          {formatARS(subtotalGeneral)}
                        </div>
                      </td>
                    </tr>

                    {/* Total Entradas Vendidas (Fórmulas automáticas) */}
                    <tr className="bg-slate-50 font-bold text-slate-800 border-t border-slate-200">
                      <td className="py-2.5 px-2">
                        Total Entradas Vendidas
                      </td>
                      <td className="py-2 px-2 text-right">
                        <div className="bg-[#e2e8f0] border border-slate-300 rounded-lg px-2 py-1.5 text-center font-bold">
                          {totalTicketsVendidos}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-right">
                        <div className="bg-[#f1f5f9] border border-slate-200 rounded-lg px-2 py-1.5 text-right text-[11px]" title="Ingreso Promedio por Entrada">
                          {formatARS(ticketAvgPrice)}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-right">
                        <div className="bg-[#e2e8f0] border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-900">
                          {formatARS(totalTicketing)}
                        </div>
                      </td>
                    </tr>

                    {/* Alquiler del Espacio ($) */}
                    <tr className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-2 font-bold text-slate-800" colSpan={2}>
                        Alquiler del Espacio ($)
                      </td>
                      <td className="py-2 px-2 text-slate-400 text-right italic text-[11px]">—</td>
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={alquilerEspacio}
                          onChange={(e) => setAlquilerEspacio(e.target.value)}
                          className="w-full bg-[#fef9c3] border border-[#fde047] focus:bg-white rounded-lg px-2.5 py-1.5 text-right font-semibold outline-none"
                        />
                      </td>
                    </tr>

                    {/* Contratación Salón ($) */}
                    <tr className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-2 font-bold text-slate-800" colSpan={2}>
                        Contratación Salón ($)
                      </td>
                      <td className="py-2 px-2 text-slate-400 text-right italic text-[11px]">—</td>
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={contratacionSalon}
                          onChange={(e) => setContratacionSalon(e.target.value)}
                          className="w-full bg-[#fef9c3] border border-[#fde047] focus:bg-white rounded-lg px-2.5 py-1.5 text-right font-semibold outline-none"
                        />
                      </td>
                    </tr>

                    {/* Comisión Catering ($) */}
                    <tr className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-2 font-bold text-slate-800" colSpan={2}>
                        Comisión Catering ($)
                      </td>
                      <td className="py-2 px-2 text-slate-400 text-right italic text-[11px]">—</td>
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={comisionCatering}
                          onChange={(e) => setComisionCatering(e.target.value)}
                          className="w-full bg-[#fef9c3] border border-[#fde047] focus:bg-white rounded-lg px-2.5 py-1.5 text-right font-semibold outline-none"
                        />
                      </td>
                    </tr>

                    {/* Otros Ingresos Fijos ($) */}
                    <tr className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-2 font-bold text-slate-800" colSpan={2}>
                        Otros Ingresos ($)
                      </td>
                      <td className="py-2 px-2 text-slate-400 text-right italic text-[11px]">—</td>
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={otrosIngresos}
                          onChange={(e) => setOtrosIngresos(e.target.value)}
                          className="w-full bg-[#fef9c3] border border-[#fde047] focus:bg-white rounded-lg px-2.5 py-1.5 text-right font-semibold outline-none"
                        />
                      </td>
                    </tr>

                    {/* Filas dinámicas extras de ingresos si se configuran */}
                    {extraIncomes.map((inc) => {
                      const isVisible = canViewSensitiveData(inc, currentUser)
                      return (
                        <tr key={inc.id} className="hover:bg-slate-50/60 bg-amber-50/30">
                          <td className="py-2 px-2" colSpan={2}>
                            <div className="flex items-center space-x-1.5">
                              <input
                                type="text"
                                value={isVisible ? inc.concept : '••••••'}
                                disabled={!isVisible}
                                onChange={(e) => updateExtraIncome(inc.id, 'concept', e.target.value)}
                                placeholder="Concepto de ingreso extra..."
                                className="w-full bg-[#fef9c3] border border-[#fde047] rounded-lg px-2.5 py-1 text-xs outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => toggleIncomeSensitive(inc.id)}
                                title={inc.is_sensitive ? 'Ítem confidencial' : 'Hacer confidencial'}
                                className={`p-1 rounded ${inc.is_sensitive ? 'text-amber-600 bg-amber-100' : 'text-slate-400 hover:text-slate-600'}`}
                              >
                                <Lock className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeExtraIncome(inc.id)}
                              className="text-rose-500 hover:text-rose-700 p-1 rounded"
                              title="Eliminar fila"
                            >
                              <Trash2 className="w-3.5 h-3.5 mx-auto" />
                            </button>
                          </td>
                          <td className="py-2 px-2 text-right">
                            <input
                              type="number"
                              min="0"
                              value={inc.amount}
                              onChange={(e) => updateExtraIncome(inc.id, 'amount', e.target.value)}
                              className="w-full bg-[#fef9c3] border border-[#fde047] rounded-lg px-2.5 py-1.5 text-right font-semibold outline-none"
                            />
                          </td>
                        </tr>
                      )
                    })}

                  </tbody>
                </table>
              </div>

              {/* Botón para agregar ingreso dinámico */}
              <div className="flex justify-start">
                <button
                  type="button"
                  onClick={addExtraIncome}
                  className="flex items-center space-x-1 text-xs text-amber-700 hover:text-amber-900 font-bold px-2.5 py-1 rounded-lg border border-dashed border-amber-300 hover:bg-amber-50 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Agregar Otro Ingreso Adicional</span>
                </button>
              </div>

              {/* TOTAL INGRESOS (BARRA DORADA RESALTADA) */}
              <div className="bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 text-slate-950 font-bold p-3.5 rounded-xl flex items-center justify-between shadow-md">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">👉</span>
                  <span className="font-serif uppercase tracking-wider text-xs sm:text-sm font-black">
                    TOTAL INGRESOS:
                  </span>
                </div>
                <div className="text-base sm:text-xl font-mono font-black tracking-tight">
                  {formatARS(totalGrossIncome)}
                </div>
              </div>

            </div>
          </div>

          {/* ======================================================================= */}
          {/* BLOQUE 3: COSTOS DEL EVENTO */}
          {/* ======================================================================= */}
          <div className="bg-white rounded-2xl shadow-luxury border border-slate-200 overflow-hidden">
            {/* Header del bloque */}
            <div className="bg-[#0f172a] text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-rose-400" />
                <h2 className="font-serif font-bold text-xs uppercase tracking-wider text-rose-300">
                  3. COSTOS DEL EVENTO
                </h2>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">DESGLOSE RUBRO POR RUBRO</span>
            </div>

            {/* Tabla de Costos */}
            <div className="p-4 sm:p-5 space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                      <th className="py-2 px-2">Rubro / Detalle de Gasto</th>
                      <th className="py-2 px-2 text-right w-40">Importe ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    
                    {/* Honorarios Artistas */}
                    <tr className="hover:bg-slate-50/60">
                      <td className="py-2 px-2 font-medium text-slate-800">Honorarios Artistas</td>
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={costArtistas}
                          onChange={(e) => setCostArtistas(e.target.value)}
                          className="w-full bg-[#fef9c3] border border-[#fde047] focus:bg-white rounded-lg px-2.5 py-1.5 text-right font-semibold outline-none"
                        />
                      </td>
                    </tr>

                    {/* Honorarios Técnica / Sonido */}
                    <tr className="hover:bg-slate-50/60">
                      <td className="py-2 px-2 font-medium text-slate-800">Honorarios Técnica / Sonido</td>
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={costTecnica}
                          onChange={(e) => setCostTecnica(e.target.value)}
                          className="w-full bg-[#fef9c3] border border-[#fde047] focus:bg-white rounded-lg px-2.5 py-1.5 text-right font-semibold outline-none"
                        />
                      </td>
                    </tr>

                    {/* Honorarios Disertantes */}
                    <tr className="hover:bg-slate-50/60">
                      <td className="py-2 px-2 font-medium text-slate-800">Honorarios Disertantes</td>
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={costDisertantes}
                          onChange={(e) => setCostDisertantes(e.target.value)}
                          className="w-full bg-[#fef9c3] border border-[#fde047] focus:bg-white rounded-lg px-2.5 py-1.5 text-right font-semibold outline-none"
                        />
                      </td>
                    </tr>

                    {/* Mobiliario / Ambientación */}
                    <tr className="hover:bg-slate-50/60">
                      <td className="py-2 px-2 font-medium text-slate-800">Mobiliario / Ambientación</td>
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={costMobiliario}
                          onChange={(e) => setCostMobiliario(e.target.value)}
                          className="w-full bg-[#fef9c3] border border-[#fde047] focus:bg-white rounded-lg px-2.5 py-1.5 text-right font-semibold outline-none"
                        />
                      </td>
                    </tr>

                    {/* RRHH LS y Salón */}
                    <tr className="hover:bg-slate-50/60">
                      <td className="py-2 px-2 font-medium text-slate-800">RRHH LS y Salón</td>
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={costRrhh}
                          onChange={(e) => setCostRrhh(e.target.value)}
                          className="w-full bg-[#fef9c3] border border-[#fde047] focus:bg-white rounded-lg px-2.5 py-1.5 text-right font-semibold outline-none"
                        />
                      </td>
                    </tr>

                    {/* Catering / Gastronomía */}
                    <tr className="hover:bg-slate-50/60">
                      <td className="py-2 px-2 font-medium text-slate-800">Catering / Gastronomía</td>
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={costCatering}
                          onChange={(e) => setCostCatering(e.target.value)}
                          className="w-full bg-[#fef9c3] border border-[#fde047] focus:bg-white rounded-lg px-2.5 py-1.5 text-right font-semibold outline-none"
                        />
                      </td>
                    </tr>

                    {/* Limpieza */}
                    <tr className="hover:bg-slate-50/60">
                      <td className="py-2 px-2 font-medium text-slate-800">Limpieza</td>
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={costLimpieza}
                          onChange={(e) => setCostLimpieza(e.target.value)}
                          className="w-full bg-[#fef9c3] border border-[#fde047] focus:bg-white rounded-lg px-2.5 py-1.5 text-right font-semibold outline-none"
                        />
                      </td>
                    </tr>

                    {/* Seguros */}
                    <tr className="hover:bg-slate-50/60">
                      <td className="py-2 px-2 font-medium text-slate-800">Seguros</td>
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={costSeguros}
                          onChange={(e) => setCostSeguros(e.target.value)}
                          className="w-full bg-[#fef9c3] border border-[#fde047] focus:bg-white rounded-lg px-2.5 py-1.5 text-right font-semibold outline-none"
                        />
                      </td>
                    </tr>

                    {/* Alquiler de Espacio (costo) */}
                    <tr className="hover:bg-slate-50/60">
                      <td className="py-2 px-2 font-medium text-slate-800">Alquiler de Espacio (costo)</td>
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={costAlquilerEspacio}
                          onChange={(e) => setCostAlquilerEspacio(e.target.value)}
                          className="w-full bg-[#fef9c3] border border-[#fde047] focus:bg-white rounded-lg px-2.5 py-1.5 text-right font-semibold outline-none"
                        />
                      </td>
                    </tr>

                    {/* Costos Gastronómicos / Insumos */}
                    <tr className="hover:bg-slate-50/60">
                      <td className="py-2 px-2 font-medium text-slate-800">Costos Gastronómicos / Insumos</td>
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={costGastronomicos}
                          onChange={(e) => setCostGastronomicos(e.target.value)}
                          className="w-full bg-[#fef9c3] border border-[#fde047] focus:bg-white rounded-lg px-2.5 py-1.5 text-right font-semibold outline-none"
                        />
                      </td>
                    </tr>

                    {/* Publicidad / Marketing */}
                    <tr className="hover:bg-slate-50/60">
                      <td className="py-2 px-2 font-medium text-slate-800">Publicidad / Marketing</td>
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={costMarketing}
                          onChange={(e) => setCostMarketing(e.target.value)}
                          className="w-full bg-[#fef9c3] border border-[#fde047] focus:bg-white rounded-lg px-2.5 py-1.5 text-right font-semibold outline-none"
                        />
                      </td>
                    </tr>

                    {/* SADAIC / AADI Capif */}
                    <tr className="hover:bg-slate-50/60">
                      <td className="py-2 px-2 font-medium text-slate-800">SADAIC / AADI Capif</td>
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={costSadaic}
                          onChange={(e) => setCostSadaic(e.target.value)}
                          className="w-full bg-[#fef9c3] border border-[#fde047] focus:bg-white rounded-lg px-2.5 py-1.5 text-right font-semibold outline-none"
                        />
                      </td>
                    </tr>

                    {/* Otros Costos Operativos */}
                    <tr className="hover:bg-slate-50/60">
                      <td className="py-2 px-2 font-medium text-slate-800">Otros Costos Operativos</td>
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={costOtrosOperativos}
                          onChange={(e) => setCostOtrosOperativos(e.target.value)}
                          className="w-full bg-[#fef9c3] border border-[#fde047] focus:bg-white rounded-lg px-2.5 py-1.5 text-right font-semibold outline-none"
                        />
                      </td>
                    </tr>

                    {/* Filas dinámicas extras de gastos */}
                    {extraExpenses.map((exp) => {
                      const isVisible = canViewSensitiveData(exp, currentUser)
                      return (
                        <tr key={exp.id} className="hover:bg-slate-50/60 bg-rose-50/30">
                          <td className="py-2 px-2">
                            <div className="flex items-center space-x-1.5">
                              <input
                                type="text"
                                value={isVisible ? exp.concept : '••••••'}
                                disabled={!isVisible}
                                onChange={(e) => updateExtraExpense(exp.id, 'concept', e.target.value)}
                                placeholder="Concepto de gasto adicional..."
                                className="w-full bg-[#fef9c3] border border-[#fde047] rounded-lg px-2.5 py-1 text-xs outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => toggleExpenseSensitive(exp.id)}
                                title={exp.is_sensitive ? 'Gasto confidencial' : 'Hacer confidencial'}
                                className={`p-1 rounded ${exp.is_sensitive ? 'text-rose-600 bg-rose-100' : 'text-slate-400 hover:text-slate-600'}`}
                              >
                                <Lock className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeExtraExpense(exp.id)}
                                className="text-rose-500 hover:text-rose-700 p-1 rounded"
                                title="Eliminar fila"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="py-2 px-2 text-right">
                            <input
                              type="number"
                              min="0"
                              value={exp.amount}
                              onChange={(e) => updateExtraExpense(exp.id, 'amount', e.target.value)}
                              className="w-full bg-[#fef9c3] border border-[#fde047] rounded-lg px-2.5 py-1.5 text-right font-semibold outline-none"
                            />
                          </td>
                        </tr>
                      )
                    })}

                  </tbody>
                </table>
              </div>

              {/* Botón para agregar gasto dinámico */}
              <div className="flex justify-start">
                <button
                  type="button"
                  onClick={addExtraExpense}
                  className="flex items-center space-x-1 text-xs text-rose-700 hover:text-rose-900 font-bold px-2.5 py-1 rounded-lg border border-dashed border-rose-300 hover:bg-rose-50 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Agregar Otro Gasto / Rubro Operativo</span>
                </button>
              </div>

              {/* TOTAL COSTOS (BARRA ROJA RESALTADA) */}
              <div className="bg-gradient-to-r from-rose-500 via-rose-600 to-rose-500 text-white font-bold p-3.5 rounded-xl flex items-center justify-between shadow-md">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">👉</span>
                  <span className="font-serif uppercase tracking-wider text-xs sm:text-sm font-black">
                    TOTAL COSTOS:
                  </span>
                </div>
                <div className="text-base sm:text-xl font-mono font-black tracking-tight">
                  {formatARS(totalCosts)}
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* ------------------------------------------------------------------------- */}
        {/* COLUMNA DERECHA (5 cols): BLOQUES 4, 5 Y 6 (RESULTADO, BREAK-EVEN, MARGEN) */}
        {/* ------------------------------------------------------------------------- */}
        <div className="lg:col-span-5 space-y-6">

          {/* ======================================================================= */}
          {/* BLOQUE 4: RESULTADO ECONÓMICO Y LIQUIDACIÓN */}
          {/* ======================================================================= */}
          <div className="bg-white rounded-2xl shadow-luxury border border-slate-200 overflow-hidden">
            {/* Header del bloque */}
            <div className="bg-[#0f172a] text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Scale className="w-4 h-4 text-emerald-400" />
                <h2 className="font-serif font-bold text-xs uppercase tracking-wider text-emerald-300">
                  4. RESULTADO ECONÓMICO Y LIQUIDACIÓN
                </h2>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">BALANCE Y REPARTO</span>
            </div>

            <div className="p-4 sm:p-5 space-y-4 text-xs">
              
              {/* Tipo de Acuerdo */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Tipo de Acuerdo</label>
                <select
                  value={agreementType}
                  onChange={(e) => setAgreementType(e.target.value)}
                  className="w-full bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white border border-[#fde047] rounded-lg px-3 py-2 text-slate-900 font-bold outline-none cursor-pointer"
                >
                  {(templateConfig?.agreementTypes || [
                    '50% - 50%',
                    '100% Barolo',
                    '70% Barolo - 30% Productor',
                    '30% Barolo - 70% Productor',
                    'Solo Alquiler'
                  ]).map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                  {agreementType && !(templateConfig?.agreementTypes || []).includes(agreementType) && (
                    <option value={agreementType}>{agreementType}</option>
                  )}
                </select>
              </div>

              {/* Matriz de Fórmulas Automáticas de Liquidación */}
              <div className="space-y-2 pt-1">
                
                {/* Total Ingresos Brutos */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-600 font-medium">Total Ingresos Brutos</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {formatARS(totalGrossIncome)}
                  </span>
                </div>

                {/* Total Costos del Evento */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-600 font-medium">Total Costos del Evento</span>
                  <span className="font-mono font-bold text-rose-700 text-sm">
                    - {formatARS(totalCosts)}
                  </span>
                </div>

                {/* Margen Bruto Operación */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-100 border border-slate-300 font-bold">
                  <span className="text-slate-800">Margen Bruto Operación</span>
                  <span className={`font-mono text-sm ${netMargin >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                    {formatARS(netMargin)}
                  </span>
                </div>

                {/* % Participación Barolo */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-600 font-medium">% Participación Barolo</span>
                  <span className="font-mono font-bold text-slate-800">
                    {baroloPctLabel}
                  </span>
                </div>

              </div>

              {/* TARJETA DESTACADA: GANANCIA NETA FINAL BAROLO */}
              <div className="mt-4 bg-gradient-to-br from-emerald-600 to-emerald-800 text-white rounded-xl p-4 shadow-lg border border-emerald-500">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-1.5">
                    <Award className="w-4 h-4 text-emerald-200" />
                    <span className="font-serif uppercase tracking-wider text-xs font-bold text-emerald-100">
                      ⭐ GANANCIA NETA FINAL BAROLO:
                    </span>
                  </div>
                  <span className="text-[10px] bg-emerald-900/60 px-2 py-0.5 rounded font-mono font-semibold text-emerald-200">
                    {formatPct(marginPct)} s/ Ingresos
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-mono font-black tracking-tight text-white mt-2">
                  {formatARSWithDecimals(baroloProfit)}
                </div>
                <div className="text-[11px] text-emerald-100/80 mt-1 flex items-center justify-between">
                  <span>Margen líquido después de cobertura total de costos</span>
                  <span className="font-bold">{baroloProfit >= 0 ? 'Excedente Neto' : 'Déficit'}</span>
                </div>
              </div>

            </div>
          </div>

          {/* ======================================================================= */}
          {/* BLOQUE 5: PUNTO DE EQUILIBRIO (BREAK-EVEN) */}
          {/* ======================================================================= */}
          <div className="bg-white rounded-2xl shadow-luxury border border-slate-200 overflow-hidden">
            {/* Header del bloque */}
            <div className="bg-[#0f172a] text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-sky-400" />
                <h2 className="font-serif font-bold text-xs uppercase tracking-wider text-sky-300">
                  5. PUNTO DE EQUILIBRIO (BREAK-EVEN)
                </h2>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">ANÁLISIS DE RIESGO</span>
            </div>

            <div className="p-4 sm:p-5 space-y-3 text-xs">
              
              <div className="space-y-2">
                
                {/* Costos Fijos a Cubrir */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-600 font-medium">Costos Fijos a Cubrir ($)</span>
                  <span className="font-mono font-bold text-slate-800">
                    {formatARS(totalCosts)}
                  </span>
                </div>

                {/* Ingreso Promedio x Entrada */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-600 font-medium">Ingreso Promedio x Entrada</span>
                  <span className="font-mono font-bold text-slate-800">
                    {formatARS(ticketAvgPrice)}
                  </span>
                </div>

                {/* Entradas Necesarias (PE) */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-sky-50 border border-sky-200">
                  <span className="font-bold text-sky-950">Entradas Necesarias (PE)</span>
                  <span className="font-mono font-black text-sky-900 text-sm">
                    {breakEvenTickets} personas
                  </span>
                </div>

                {/* Capacidad / Cupos Totales */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-600 font-medium">Capacidad / Cupos Totales</span>
                  <span className="font-mono font-bold text-slate-800">
                    {totalCupos} personas
                  </span>
                </div>

                {/* % Ocupación p/ Equilibrio */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-100 border border-slate-300 font-bold">
                  <span className="text-slate-800">% Ocupación p/ Equilibrio</span>
                  <span className="font-mono font-black text-slate-950 text-sm">
                    {formatPct(breakEvenPct)}
                  </span>
                </div>

              </div>

              {/* Semáforo Badge Oficial */}
              <div className={`mt-3 p-3 rounded-xl border text-center font-bold text-xs tracking-wide shadow-sm flex items-center justify-center space-x-2 ${breakEvenBadge.color}`}>
                <span>{breakEvenBadge.label}</span>
              </div>

            </div>
          </div>

          {/* ======================================================================= */}
          {/* BLOQUE 6: MARGEN Y EVALUACIÓN */}
          {/* ======================================================================= */}
          <div className="bg-white rounded-2xl shadow-luxury border border-slate-200 overflow-hidden">
            {/* Header del bloque */}
            <div className="bg-[#0f172a] text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Percent className="w-4 h-4 text-amber-400" />
                <h2 className="font-serif font-bold text-xs uppercase tracking-wider text-amber-300">
                  6. MARGEN Y EVALUACIÓN
                </h2>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">KPIS CLAVE</span>
            </div>

            <div className="p-4 sm:p-5 space-y-3 text-xs">
              
              <div className="grid grid-cols-2 gap-2.5">
                
                {/* Margen s/ Ingresos */}
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Margen s/ Ingresos</span>
                  <span className="font-mono font-black text-slate-900 text-sm">
                    {formatPct(marginPct)}
                  </span>
                </div>

                {/* Relación Ingreso / Costo */}
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Relación Ingreso / Costo</span>
                  <span className="font-mono font-black text-slate-900 text-sm">
                    {relacionIngresoCosto > 0 ? `${relacionIngresoCosto.toFixed(2)}x` : '0.00x'}
                  </span>
                </div>

                {/* Ganancia Neta x Asistente */}
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Ganancia Neta x Asistente</span>
                  <span className="font-mono font-black text-emerald-700 text-sm">
                    {formatARS(gananciaNetaXAsistente)}
                  </span>
                </div>

                {/* Costo Promedio x Asistente */}
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Costo Promedio x Asistente</span>
                  <span className="font-mono font-black text-slate-700 text-sm">
                    {formatARS(costoPromedioXAsistente)}
                  </span>
                </div>

              </div>

              {/* Dictamen / Consejo Estratégico */}
              <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-700 leading-relaxed space-y-1">
                <div className="flex items-center space-x-1.5 font-bold text-slate-900 text-xs">
                  <Info className="w-3.5 h-3.5 text-barolo-navy" />
                  <span>Evaluación Comercial Barolo:</span>
                </div>
                <p className="italic text-slate-600">
                  {adviceMessage}
                </p>
              </div>

            </div>
          </div>

          {/* ======================================================================= */}
          {/* NOTAS OPERATIVAS Y NOTAS CONFIDENCIALES */}
          {/* ======================================================================= */}
          <div className="bg-white rounded-2xl shadow-luxury border border-slate-200 p-4 sm:p-5 space-y-4">
            
            {/* Observaciones Operativas */}
            <div>
              <label className="font-bold text-slate-700 text-xs block mb-1">
                Observaciones Generales / Notas del Evento
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Detalles sobre armado, catering, horarios especiales o requerimientos de producción..."
                className="w-full bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white border border-[#fde047] focus:border-amber-500 rounded-lg p-2.5 text-xs text-slate-900 outline-none transition-colors"
              />
            </div>

            {/* Notas Confidenciales (Restringido) */}
            {canViewSensitiveData(initialEventData, currentUser) && (
              <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl space-y-1.5">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-900">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  <span>Notas Confidenciales / Sensibles (Privadas)</span>
                </div>
                <textarea
                  rows={2}
                  value={sensitiveNotes}
                  onChange={(e) => setSensitiveNotes(e.target.value)}
                  placeholder="Acuerdos privados, comisiones reservadas o información estratégica no visible para el cliente..."
                  className="w-full bg-white border border-amber-300 rounded-lg p-2 text-xs text-slate-900 outline-none"
                />
              </div>
            )}

          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* BARRA INFERIOR FLOTANTE (STICKY TOTALS & ACTIONS)                         */}
      {/* ========================================================================= */}
      <div className="fixed bottom-4 left-4 right-4 sm:left-8 sm:right-8 lg:left-72 z-30 bg-[#0f172a]/95 backdrop-blur-md text-white px-4 sm:px-6 py-3 rounded-2xl shadow-2xl border border-slate-700 flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Métricas rápidas */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Ingresos Totales</span>
            <span className="font-mono font-bold text-amber-400 text-sm sm:text-base">
              {formatARS(totalGrossIncome)}
            </span>
          </div>

          <div className="hidden sm:block w-px h-8 bg-slate-700"></div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Costos Totales</span>
            <span className="font-mono font-bold text-rose-400 text-sm sm:text-base">
              {formatARS(totalCosts)}
            </span>
          </div>

          <div className="hidden sm:block w-px h-8 bg-slate-700"></div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Ganancia Barolo</span>
            <span className="font-mono font-bold text-emerald-400 text-sm sm:text-base">
              {formatARS(baroloProfit)}
            </span>
          </div>

          <div className="hidden md:block w-px h-8 bg-slate-700"></div>

          <div className="hidden md:block">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">P. Equilibrio</span>
            <span className="font-mono font-bold text-sky-400 text-xs">
              {breakEvenTickets} tickets ({formatPct(breakEvenPct)})
            </span>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
          {(userCanCreate || userCanEdit) && (
            <button
              onClick={handleSaveAsQuote}
              className="flex-1 md:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 transition-colors shadow-sm cursor-pointer"
            >
              📝 Cotización
            </button>
          )}

          {userCanChange && (
            <>
              <button
                onClick={handleSaveAsReserved}
                className="flex-1 md:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-white transition-colors shadow-sm cursor-pointer"
              >
                🔵 Reservar
              </button>

              <button
                onClick={handleConfirmAndSave}
                className="flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-white transition-colors shadow-md cursor-pointer flex items-center justify-center space-x-1"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar</span>
              </button>
            </>
          )}
        </div>

      </div>

    </div>
  )
}
