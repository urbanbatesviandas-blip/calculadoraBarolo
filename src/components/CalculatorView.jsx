import React, { useState, useEffect, useMemo } from 'react'
import { 
  Calculator, Plus, Trash2, Save, CheckCircle2, RotateCcw, 
  Sparkles, DollarSign, Users, Calendar, MapPin, Building, AlertCircle, FileText, 
  ArrowRight, BookmarkCheck, Sliders, Lock, Eye, EyeOff, ShieldAlert, ChevronRight,
  TrendingUp, Percent, Award, Info, Scale, Check, RefreshCw, Layers, Printer, FileSpreadsheet, Search, X, MonitorPlay
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { canCreateEvent, canEditEvent, canChangeStatus, isAdmin, canViewSensitiveData } from '../services/authService'
import { calculatorConfigService, DEFAULT_MASTER_COST_CATALOG, DEFAULT_MASTER_INCOME_CATALOG } from '../services/calculatorConfigService'
import { excelExportService } from '../services/excelExportService'
import { htmlPresentationService } from '../services/htmlPresentationService'
import CommercialProposalModal from './CommercialProposalModal'

// Helper formatters
const formatARS = (val) => {
  const num = Number(val) || 0
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
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

// Lista estándar de meses en español
const MONTHS_LIST = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

// Helper para obtener fecha local en formato YYYY-MM-DD sin desfase horario
const getTodayLocalString = () => {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function CalculatorView({ initialEventData, onSaveEvent, onSwitchView, currentUser, allEvents = [], isAiDrawerOpen = false }) {
  const userCanCreate = canCreateEvent(currentUser)
  const userCanEdit = canEditEvent(currentUser)
  const userCanChange = canChangeStatus(currentUser)
  const isUserAdmin = isAdmin(currentUser)

  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false)
  const [isClientViewMode, setIsClientViewMode] = useState(false)

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
    return {
      venue: cfg?.venues?.[0]?.name || 'Espacio Barolo',
      eventType: cfg?.eventTypes?.[0] || 'Cultural',
      agreementType: cfg?.agreementTypes?.[0] || '50% - 50%',
      attendees: '',
      extraExpenses: [],
      extraIncomes: []
    }
  }

  // Solo si se pasa explícitamente un evento existente con ID para analizar/editar
  const activeInitial = (initialEventData && !initialEventData.isBlank && initialEventData.id) ? initialEventData : null

  // Fechas iniciales por defecto: DÍA ACTUAL LOCAL
  const todayLocal = getTodayLocalString()
  const initialContactDate = activeInitial?.contact_date || todayLocal
  const initialEventDate = activeInitial?.event_date || initialEventData?.event_date || todayLocal

  // ==========================================
  // ESTADOS - BLOQUE 1: DATOS GENERALES Y CLIENTE
  // ==========================================
  const [eventId, setEventId] = useState(activeInitial?.id || null)
  const [calcCode, setCalcCode] = useState(activeInitial?.calc_code || '')
  const [eventName, setEventName] = useState(activeInitial?.name || '')
  const [clientName, setClientName] = useState(activeInitial?.client_name || '')
  const [clientCuit, setClientCuit] = useState(activeInitial?.client_cuit || '')
  const [clientContact, setClientContact] = useState(activeInitial?.client_contact || '')
  const [clientEmail, setClientEmail] = useState(activeInitial?.client_email || '')
  const [contactDate, setContactDate] = useState(initialContactDate)
  const [eventDate, setEventDate] = useState(initialEventDate)
  const [eventTime, setEventTime] = useState(activeInitial?.event_time || '19:00')
  const [month, setMonth] = useState(() => {
    if (activeInitial?.month) return activeInitial.month
    const d = new Date(initialEventDate + 'T12:00:00')
    return MONTHS_LIST[d.getMonth()] || 'Enero'
  })
  const [venue, setVenue] = useState(activeInitial?.venue || templateConfig?.venues?.[0]?.name || 'Espacio Barolo')
  const [eventType, setEventType] = useState(activeInitial?.event_type || templateConfig?.eventTypes?.[0] || 'Cultural')
  const [origin, setOrigin] = useState(activeInitial?.origin || 'Externo')
  const [invoiceType, setInvoiceType] = useState(activeInitial?.invoice_type || 'Factura A')
  const [paymentMethod, setPaymentMethod] = useState(activeInitial?.payment_method || 'Transferencia')
  const [agreementType, setAgreementType] = useState(activeInitial?.agreement_type || templateConfig?.agreementTypes?.[0] || '50% - 50%')
  const [eventStatus, setEventStatus] = useState(activeInitial?.status || 'cotizado')
  const [attendees, setAttendees] = useState(activeInitial?.attendees !== undefined ? activeInitial.attendees : '')
  const [notes, setNotes] = useState(activeInitial?.notes || '')
  const [sensitiveNotes, setSensitiveNotes] = useState(activeInitial?.sensitive_notes || '')

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
  const [preventaQty, setPreventaQty] = useState(activeInitial?.preventa_qty ?? 0)
  const [preventaPrice, setPreventaPrice] = useState(activeInitial?.preventa_price ?? 0)
  const [invitacionesQty, setInvitacionesQty] = useState(activeInitial?.invitaciones_qty ?? 0)
  const [generalQty, setGeneralQty] = useState(activeInitial?.general_qty ?? 0)
  const [generalPrice, setGeneralPrice] = useState(activeInitial?.general_price ?? 0)

  // Handlers para cálculo automático y reactivo de cupos de entradas:
  // Capacidad Total = Preventa + Invitaciones Sin Cargo + Generales (Remanente)
  const handleAttendeesChange = (val) => {
    const num = val === '' ? '' : Number(val)
    setAttendees(num)
    const cap = Number(num) || 0
    const prev = Number(preventaQty) || 0
    const inv = Number(invitacionesQty) || 0
    setGeneralQty(Math.max(0, cap - prev - inv))
  }

  const handlePreventaQtyChange = (val) => {
    const num = val === '' ? '' : Number(val)
    setPreventaQty(num)
    const cap = Number(attendees) || 0
    const prev = Number(num) || 0
    const inv = Number(invitacionesQty) || 0
    if (cap > 0) {
      setGeneralQty(Math.max(0, cap - prev - inv))
    }
  }

  const handleInvitacionesQtyChange = (val) => {
    const num = val === '' ? '' : Number(val)
    setInvitacionesQty(num)
    const cap = Number(attendees) || 0
    const prev = Number(preventaQty) || 0
    const inv = Number(num) || 0
    if (cap > 0) {
      setGeneralQty(Math.max(0, cap - prev - inv))
    }
  }

  const handleGeneralQtyChange = (val) => {
    const num = val === '' ? '' : Number(val)
    setGeneralQty(num)
    const gen = Number(num) || 0
    const prev = Number(preventaQty) || 0
    const inv = Number(invitacionesQty) || 0
    if (gen + prev + inv > 0) {
      setAttendees(gen + prev + inv)
    }
  }
  const [alquilerEspacio, setAlquilerEspacio] = useState(activeInitial?.alquiler_espacio ?? 0)
  const [contratacionSalon, setContratacionSalon] = useState(activeInitial?.contratacion_salon ?? 0)
  const [comisionCatering, setComisionCatering] = useState(activeInitial?.comision_catering ?? 0)
  const [otrosIngresos, setOtrosIngresos] = useState(activeInitial?.otros_ingresos ?? 0)

  // Desglose dinámico opcional de otros ingresos adicionales
  const [extraIncomes, setExtraIncomes] = useState(() => {
    if (activeInitial?.extra_incomes && activeInitial.extra_incomes.length > 0) {
      return activeInitial.extra_incomes
    }
    return []
  })

  // ==========================================
  // ESTADOS - BLOQUE 3: COSTOS DEL EVENTO (Desglose exacto Excel)
  // ==========================================
  const [costArtistas, setCostArtistas] = useState(activeInitial?.cost_artistas ?? 0)
  const [costTecnica, setCostTecnica] = useState(activeInitial?.cost_tecnica ?? 0)
  const [costDisertantes, setCostDisertantes] = useState(activeInitial?.cost_disertantes ?? 0)
  const [costMobiliario, setCostMobiliario] = useState(activeInitial?.cost_mobiliario ?? 0)
  const [costRrhh, setCostRrhh] = useState(activeInitial?.cost_rrhh ?? 0)
  const [costCatering, setCostCatering] = useState(activeInitial?.cost_catering ?? 0)
  const [costLimpieza, setCostLimpieza] = useState(activeInitial?.cost_limpieza ?? 0)
  const [costSeguros, setCostSeguros] = useState(activeInitial?.cost_seguros ?? 0)
  const [costAlquilerEspacio, setCostAlquilerEspacio] = useState(activeInitial?.cost_alquiler_espacio ?? 0)
  const [costGastronomicos, setCostGastronomicos] = useState(activeInitial?.cost_gastronomicos ?? 0)
  const [costMarketing, setCostMarketing] = useState(activeInitial?.cost_marketing ?? 0)
  const [costSadaic, setCostSadaic] = useState(activeInitial?.cost_sadaic ?? 0)
  const [costOtrosOperativos, setCostOtrosOperativos] = useState(activeInitial?.cost_otros_operativos ?? 0)

  // Desglose dinámico opcional de otros gastos adicionales
  const [extraExpenses, setExtraExpenses] = useState(() => {
    if (activeInitial?.extra_expenses && activeInitial.extra_expenses.length > 0) {
      return activeInitial.extra_expenses
    }
    return []
  })

  // Modal de selección de rubros de ingresos del catálogo
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false)
  const [incomeModalSearch, setIncomeModalSearch] = useState('')
  const [incomeModalCategoryFilter, setIncomeModalCategoryFilter] = useState('all')

  // Rubros de ingreso seleccionados para este evento
  const [selectedIncomes, setSelectedIncomes] = useState(() => {
    if (Array.isArray(activeInitial?.event_incomes)) {
      return activeInitial.event_incomes
    }
    if (activeInitial && !activeInitial.isBlank) {
      const list = []
      const catalog = templateConfig?.masterIncomeCatalog || DEFAULT_MASTER_INCOME_CATALOG
      catalog.forEach(item => {
        const val = Number(activeInitial[item.key]) || 0
        if (val > 0) {
          list.push({
            id: item.id,
            key: item.key,
            name: item.name,
            category: item.category,
            amount: val,
            is_sensitive: Array.isArray(activeInitial.sensitive_incomes) && activeInitial.sensitive_incomes.includes(item.key)
          })
        }
      })
      return list
    }
    return []
  })

  // Helpers de gestión de rubros de ingreso del evento
  const toggleIncomeInEvent = (catalogItem) => {
    setSelectedIncomes(prev => {
      const exists = prev.some(i => i.key === catalogItem.key)
      if (exists) {
        return prev.filter(i => i.key !== catalogItem.key)
      } else {
        return [...prev, {
          id: catalogItem.id,
          key: catalogItem.key,
          name: catalogItem.name,
          category: catalogItem.category,
          amount: catalogItem.defaultAmount || 0,
          is_sensitive: false
        }]
      }
    })
  }

  const updateSelectedIncome = (key, field, val) => {
    setSelectedIncomes(prev => prev.map(i => i.key === key ? { ...i, [field]: val } : i))
  }

  const removeSelectedIncome = (key) => {
    setSelectedIncomes(prev => prev.filter(i => i.key !== key))
  }

  const toggleSelectedIncomeSensitivity = (key) => {
    setSelectedIncomes(prev => prev.map(i => i.key === key ? { ...i, is_sensitive: !i.is_sensitive } : i))
  }

  const getIncomeVal = (key) => {
    const found = selectedIncomes.find(i => i.key === key)
    if (found) return Number(found.amount) || 0
    if (key === 'alquiler_espacio') return Number(alquilerEspacio) || 0
    if (key === 'contratacion_salon') return Number(contratacionSalon) || 0
    if (key === 'comision_catering') return Number(comisionCatering) || 0
    if (key === 'otros_ingresos') return Number(otrosIngresos) || 0
    return 0
  }

  // Modal de selección de costos del catálogo
  const [isCostModalOpen, setIsCostModalOpen] = useState(false)
  const [costModalSearch, setCostModalSearch] = useState('')
  const [costModalCategoryFilter, setCostModalCategoryFilter] = useState('all')

  // Costos activos seleccionados para este evento
  const [selectedCosts, setSelectedCosts] = useState(() => {
    if (Array.isArray(activeInitial?.event_costs)) {
      return activeInitial.event_costs
    }
    if (activeInitial && !activeInitial.isBlank) {
      const list = []
      const catalog = templateConfig?.masterCostCatalog || DEFAULT_MASTER_COST_CATALOG
      catalog.forEach(item => {
        const val = Number(activeInitial[item.key]) || 0
        if (val > 0) {
          list.push({
            id: item.id,
            key: item.key,
            name: item.name,
            category: item.category,
            amount: val,
            is_sensitive: Array.isArray(activeInitial.sensitive_costs) && activeInitial.sensitive_costs.includes(item.key)
          })
        }
      })
      return list
    }
    return []
  })

  // Helpers de gestión de costos del evento
  const toggleCostInEvent = (catalogItem) => {
    setSelectedCosts(prev => {
      const exists = prev.some(c => c.key === catalogItem.key)
      if (exists) {
        return prev.filter(c => c.key !== catalogItem.key)
      } else {
        return [...prev, {
          id: catalogItem.id,
          key: catalogItem.key,
          name: catalogItem.name,
          category: catalogItem.category,
          amount: catalogItem.defaultAmount || 0,
          is_sensitive: false
        }]
      }
    })
  }

  const updateSelectedCost = (key, field, val) => {
    setSelectedCosts(prev => prev.map(c => c.key === key ? { ...c, [field]: val } : c))
  }

  const removeSelectedCost = (key) => {
    setSelectedCosts(prev => prev.filter(c => c.key !== key))
  }

  const toggleSelectedCostSensitivity = (key) => {
    setSelectedCosts(prev => prev.map(c => c.key === key ? { ...c, is_sensitive: !c.is_sensitive } : c))
  }

  const getCostVal = (key) => {
    const found = selectedCosts.find(c => c.key === key)
    return found ? (Number(found.amount) || 0) : 0
  }

  // Helper unificado para cargar cualquier objeto de evento al estado
  const loadEventDataIntoState = (data) => {
    if (!data) return
    setEventId(data.id || null)
    setCalcCode(data.calc_code || '')
    setEventName(data.name || '')
    setClientName(data.client_name || '')
    setClientCuit(data.client_cuit || '')
    setClientContact(data.client_contact || '')
    setClientEmail(data.client_email || '')
    setContactDate(data.contact_date || data.event_date || new Date().toISOString().substring(0, 10))
    setEventDate(data.event_date || new Date().toISOString().substring(0, 10))
    setEventTime(data.event_time || '19:00')
    setMonth(data.month || 'Mayo')
    setVenue(data.venue || 'Espacio Barolo')
    setEventType(data.event_type || 'Cultural')
    setOrigin(data.origin || 'Fundación')
    setInvoiceType(data.invoice_type || 'Factura A')
    setPaymentMethod(data.payment_method || 'Transferencia')
    setAgreementType(data.agreement_type || '50% - 50%')
    setEventStatus(data.status || 'contratado')
    setAttendees(data.attendees !== undefined ? Number(data.attendees) : 35)
    setNotes(data.notes || '')
    setSensitiveNotes(data.sensitive_notes || '')
    setPreventaQty(Number(data.preventa_qty) || 0)
    setPreventaPrice(Number(data.preventa_price) || 0)
    setInvitacionesQty(Number(data.invitaciones_qty) || 0)
    setGeneralQty(Number(data.general_qty) || 0)
    setGeneralPrice(Number(data.general_price) || 0)
    setAlquilerEspacio(Number(data.alquiler_espacio) || 0)
    setContratacionSalon(Number(data.contratacion_salon) || 0)
    setComisionCatering(Number(data.comision_catering) || 0)
    setOtrosIngresos(Number(data.otros_ingresos) || 0)
    setExtraIncomes(Array.isArray(data.extra_incomes) ? data.extra_incomes : [])
    setCostArtistas(Number(data.cost_artistas) || 0)
    setCostTecnica(Number(data.cost_tecnica) || 0)
    setCostDisertantes(Number(data.cost_disertantes) || 0)
    setCostMobiliario(Number(data.cost_mobiliario) || 0)
    setCostRrhh(Number(data.cost_rrhh) || 0)
    setCostCatering(Number(data.cost_catering) || 0)
    setCostLimpieza(Number(data.cost_limpieza) || 0)
    setCostSeguros(Number(data.cost_seguros) || 0)
    setCostAlquilerEspacio(Number(data.cost_alquiler_espacio) || 0)
    setCostGastronomicos(Number(data.cost_gastronomicos) || 0)
    setCostMarketing(Number(data.cost_marketing) || 0)
    setCostSadaic(Number(data.cost_sadaic) || 0)
    setCostOtrosOperativos(Number(data.cost_otros_operativos) || 0)
    setExtraExpenses(Array.isArray(data.extra_expenses) ? data.extra_expenses : [])

    if (Array.isArray(data.event_incomes)) {
      setSelectedIncomes(data.event_incomes)
    } else {
      const incCatalog = templateConfig?.masterIncomeCatalog || DEFAULT_MASTER_INCOME_CATALOG
      const incList = []
      incCatalog.forEach(item => {
        const val = Number(data[item.key]) || 0
        if (val > 0) {
          incList.push({
            id: item.id,
            key: item.key,
            name: item.name,
            category: item.category,
            amount: val,
            is_sensitive: Array.isArray(data.sensitive_incomes) && data.sensitive_incomes.includes(item.key)
          })
        }
      })
      setSelectedIncomes(incList)
    }

    if (Array.isArray(data.event_costs)) {
      setSelectedCosts(data.event_costs)
    } else {
      const catalog = templateConfig?.masterCostCatalog || DEFAULT_MASTER_COST_CATALOG
      const list = []
      catalog.forEach(item => {
        const val = Number(data[item.key]) || 0
        if (val > 0) {
          list.push({
            id: item.id,
            key: item.key,
            name: item.name,
            category: item.category,
            amount: val,
            is_sensitive: Array.isArray(data.sensitive_costs) && data.sensitive_costs.includes(item.key)
          })
        }
      })
      setSelectedCosts(list)
    }
  }

  // ==========================================
  // RESTAURAR DATOS AL ABRIR UN EVENTO O NUEVA COTIZACIÓN
  // ==========================================
  const loadCleanBlankState = (customEventDate) => {
    const today = getTodayLocalString()
    const targetEventDate = customEventDate || today
    const d = new Date(targetEventDate + 'T12:00:00')
    const mName = MONTHS_LIST[d.getMonth()] || 'Enero'

    setEventId(null)
    setCalcCode('')
    setEventName('')
    setClientName('')
    setClientCuit('')
    setClientContact('')
    setClientEmail('')
    setContactDate(today)
    setEventDate(targetEventDate)
    setEventTime('19:00')
    setMonth(mName)
    setVenue(templateConfig?.venues?.[0]?.name || 'Espacio Barolo')
    setEventType(templateConfig?.eventTypes?.[0] || 'Cultural')
    setOrigin('Externo')
    setInvoiceType('Factura A')
    setPaymentMethod('Transferencia')
    setAgreementType(templateConfig?.agreementTypes?.[0] || '50% - 50%')
    setEventStatus('cotizado')
    setAttendees('')
    setNotes('')
    setSensitiveNotes('')
    setPreventaQty(0)
    setPreventaPrice(0)
    setInvitacionesQty(0)
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
    setSelectedCosts([])
    setSelectedIncomes([])
  }

  useEffect(() => {
    if (initialEventData && initialEventData.id && !initialEventData.isBlank) {
      // El usuario abrió un evento en particular para analizar/editar
      loadEventDataIntoState(initialEventData)
    } else if (initialEventData?.isAiDraft) {
      // El usuario cargó una cotización interpretada por el Copiloto IA (WhatsApp/Texto)
      loadEventDataIntoState(initialEventData)
    } else if (initialEventData?.event_date && !initialEventData.id) {
      // El usuario hizo clic en una fecha específica del calendario para cotizar
      loadCleanBlankState(initialEventData.event_date)
    } else if (initialEventData?.isBlank) {
      // El usuario forzó explícitamente una nueva cotización en blanco
      loadCleanBlankState()
    }
  }, [initialEventData])

  // Listener para actualización en vivo desde el Copilot IA si la calculadora ya está abierta
  useEffect(() => {
    const handleAiFill = (e) => {
      if (e.detail) {
        loadEventDataIntoState(e.detail)
      }
    }
    window.addEventListener('barolo-ai-fill-calculator', handleAiFill)
    return () => window.removeEventListener('barolo-ai-fill-calculator', handleAiFill)
  }, [])

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

  // Subtotal de rubros de ingresos seleccionados del catálogo
  const subtotalSelectedIncomes = selectedIncomes.reduce((acc, i) => acc + (Number(i.amount) || 0), 0)

  // Extra incomes sum
  const totalExtraIncomes = extraIncomes.reduce((acc, i) => acc + (Number(i.amount) || 0), 0)

  // TOTAL INGRESOS
  const totalGrossIncome = totalTicketing + 
    subtotalSelectedIncomes + 
    totalExtraIncomes

  // Extra expenses sum
  const totalExtraExpenses = extraExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0)

  // Suma de Costos Dinámicos Seleccionados
  const subtotalProductor = selectedCosts
    .filter(c => c.category === 'productor')
    .reduce((acc, c) => acc + (Number(c.amount) || 0), 0)

  const subtotalBarolo = selectedCosts
    .filter(c => c.category === 'barolo')
    .reduce((acc, c) => acc + (Number(c.amount) || 0), 0)

  const totalDirectCosts = subtotalProductor
  const totalIndirectCosts = subtotalBarolo + totalExtraExpenses

  // TOTAL COSTOS
  const totalCosts = totalDirectCosts + totalIndirectCosts

  // MARGEN BRUTO OPERACIÓN
  const netMargin = totalGrossIncome - totalCosts

  // PARTICIPACIÓN Y GANANCIA NETA BAROLO
  let baroloProfit = 0
  let baroloPctLabel = '50%'
  if (agreementType === '100% Barolo' || agreementType === 'Solo Alquiler') {
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
    if (confirm('¿Deseas vaciar la calculadora para preparar una nueva cotización en blanco?')) {
      loadCleanBlankState()
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
      invitaciones_qty: Number(invitacionesQty) || 0,
      general_qty: Number(generalQty) || 0,
      general_price: Number(generalPrice) || 0,
      ticket_qty: totalTicketsVendidos,
      ticket_price: ticketAvgPrice,
      alquiler_espacio: getIncomeVal('alquiler_espacio'),
      contratacion_salon: getIncomeVal('contratacion_salon'),
      comision_catering: getIncomeVal('comision_catering'),
      otros_ingresos: getIncomeVal('otros_ingresos'),
      event_incomes: selectedIncomes,
      subtotal_incomes: subtotalSelectedIncomes,
      extra_incomes: finalExtraIncomes,
      cost_artistas: getCostVal('cost_artistas'),
      cost_tecnica: getCostVal('cost_tecnica'),
      cost_disertantes: getCostVal('cost_disertantes'),
      cost_mobiliario: getCostVal('cost_mobiliario'),
      cost_rrhh: getCostVal('cost_rrhh'),
      cost_catering: getCostVal('cost_catering'),
      cost_limpieza: getCostVal('cost_limpieza'),
      cost_seguros: getCostVal('cost_seguros'),
      cost_alquiler_espacio: getCostVal('cost_alquiler_espacio'),
      cost_gastronomicos: getCostVal('cost_gastronomicos'),
      cost_marketing: getCostVal('cost_marketing'),
      cost_sadaic: getCostVal('cost_sadaic'),
      cost_otros_operativos: getCostVal('cost_otros_operativos'),
      event_costs: selectedCosts,
      subtotal_productor: subtotalProductor,
      subtotal_barolo: subtotalBarolo,
      extra_expenses: finalExtraExpenses,
      gross_income: totalGrossIncome,
      direct_costs: totalDirectCosts,
      indirect_costs: totalIndirectCosts,
      total_costs: totalCosts,
      net_profit: netMargin,
      barolo_profit: baroloProfit,
      margin_pct: marginPct,
      has_sensitive_data: finalExtraExpenses.some(e => e.is_sensitive) || finalExtraIncomes.some(i => i.is_sensitive) || selectedCosts.some(c => c.is_sensitive) || selectedIncomes.some(i => i.is_sensitive) || Boolean(finalSensitiveNotes),
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

  const handleExportExcel = () => {
    excelExportService.exportCalculatorMatrix(buildPayload(), currentUser)
  }

  const handleExportHtmlPresentation = () => {
    htmlPresentationService.downloadPresentationHtml(buildPayload())
  }

  // Detección de solapamiento de salón en la misma fecha
  const venueConflicts = useMemo(() => {
    if (!eventDate || !venue || !Array.isArray(allEvents)) return []
    const cleanDate = eventDate.substring(0, 10)
    return allEvents.filter(e => {
      if (eventId && (e.id === eventId || e.calc_code === calcCode)) return false
      const eDate = (e.event_date || '').substring(0, 10)
      if (eDate !== cleanDate) return false
      const sameVenue = (e.venue || '').trim().toLowerCase() === venue.trim().toLowerCase()
      if (!sameVenue) return false
      return e.status === 'contratado' || e.status === 'reservado'
    })
  }, [allEvents, eventDate, venue, eventId, calcCode])

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
            <div className="flex items-center space-x-3">
              <img 
                src="/logo-barolo.png" 
                alt="Palacio Barolo" 
                className="w-[46px] h-[46px] sm:w-14 sm:h-14 object-contain drop-shadow-md" 
              />
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

          <div className="flex flex-wrap items-center gap-2">
            {/* Toggle Modo Vista Cliente / Pantalla segura para compartir */}
            <button
              type="button"
              onClick={() => setIsClientViewMode(!isClientViewMode)}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
                isClientViewMode
                  ? 'bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 text-slate-950 ring-2 ring-amber-300 shadow-amber-400/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
              title={
                isClientViewMode
                  ? 'Modo Vista Cliente ACTIVO: Costos internos y ganancia Barolo ocultos. Clic para volver a vista interna.'
                  : 'Activar Modo Vista Cliente: Oculta costos de proveedores, acuerdos % y ganancia Barolo para proyectar o compartir pantalla con el cliente.'
              }
            >
              {isClientViewMode ? (
                <EyeOff className="w-4 h-4 text-slate-950 shrink-0" />
              ) : (
                <Eye className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <span>{isClientViewMode ? '👁️ Vista Cliente: ACTIVA' : '👁️ Vista Cliente'}</span>
            </button>

            <button
              onClick={handleExportHtmlPresentation}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 transition-all shadow-md cursor-pointer group"
              title="Descargar presentación interactiva en archivo HTML dinámico para compartir o proyectar"
            >
              <MonitorPlay className="w-4 h-4 text-slate-950 group-hover:scale-110 transition-transform" />
              <span>Presentación HTML</span>
            </button>

            <button
              onClick={() => setIsProposalModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 hover:border-slate-600 transition-colors shadow-sm cursor-pointer"
              title="Abrir propuesta comercial formal para imprimir o guardar como PDF"
            >
              <FileText className="w-4 h-4 text-amber-400" />
              <span>Presupuesto PDF</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white transition-colors shadow-sm cursor-pointer"
              title="Exportar a planilla Excel oficial"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
              <span>Excel</span>
            </button>
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
                placeholder="Ej: CALC-001"
                className="w-28 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-amber-300 font-mono font-bold text-xs text-center focus:border-amber-400 outline-none"
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

      {/* Banner de Aviso de Modo Vista Cliente Activo */}
      {isClientViewMode && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 px-4 py-2.5 rounded-2xl shadow-lg border border-amber-300 flex items-center justify-between text-xs font-medium animate-in fade-in duration-200">
          <div className="flex items-center space-x-2">
            <span className="p-1 bg-slate-950 text-amber-300 rounded-lg font-bold text-xs flex items-center">
              <Eye className="w-4 h-4 mr-1 text-amber-400" />
              MODO VISTA CLIENTE ACTIVO
            </span>
            <span className="hidden sm:inline text-slate-900 font-semibold">
              Los costos de proveedores, acuerdos de participación interna, ganancia neta Barolo y análisis de equilibrio están ocultos para presentación segura.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsClientViewMode(false)}
            className="bg-slate-950 text-amber-300 hover:bg-slate-900 px-3 py-1 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer ml-3 whitespace-nowrap"
          >
            Volver a Vista Interna
          </button>
        </div>
      )}

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

      {/* Alerta de Solapamiento / Doble Reserva en Salón */}
      {venueConflicts.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-4 text-xs text-amber-950 shadow-md flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-900 text-sm flex items-center gap-1.5">
              <span>⚠️ Atención: Posible conflicto de fechas en {venue}</span>
            </p>
            <p className="text-amber-800 mt-0.5">
              Ya existe(n) {venueConflicts.length} evento(s) confirmado(s) o reservado(s) para este salón en la fecha {eventDate}:
            </p>
            <ul className="mt-1.5 space-y-1">
              {venueConflicts.map(c => (
                <li key={c.id || c.calc_code} className="font-semibold text-amber-950 bg-amber-100/80 px-2.5 py-1 rounded-lg inline-block mr-2">
                  🏛️ {c.name} ({c.status.toUpperCase()} • {c.event_time || '19:00'} hs • {c.client_name || 'Particular'})
                </li>
              ))}
            </ul>
          </div>
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
                {/* Fecha de Cotización */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Fecha de Contacto</label>
                  <label className="font-bold text-slate-700 block mb-1">Fecha de Cotización</label>
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
                    {(templateConfig?.eventTypes || ['Cultural', 'Social', 'Corporativo', 'Desfile', 'Show', 'Experiencia', 'Gastronómico']).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                    {eventType && !(templateConfig?.eventTypes || ['Cultural', 'Social', 'Corporativo', 'Desfile', 'Show', 'Experiencia', 'Gastronómico']).includes(eventType) && (
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
                    <option value="Fundación">Fundación</option>
                    <option value="Externo">Externo</option>
                    <option value="Producción Propia">Producción Propia</option>
                    <option value="Coproducción">Coproducción</option>
                    <option value="Alianza Comercial">Alianza Comercial</option>
                    {origin && !['Fundación', 'Externo', 'Producción Propia', 'Coproducción', 'Alianza Comercial'].includes(origin) && (
                      <option value={origin}>{origin}</option>
                    )}
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
                    onChange={(e) => handleAttendeesChange(e.target.value)}
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
                          onChange={(e) => handlePreventaQtyChange(e.target.value)}
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
                          {formatARSWithDecimals(subtotalPreventa)}
                        </div>
                      </td>
                    </tr>

                    {/* Invitaciones Sin Cargo */}
                    <tr className="hover:bg-slate-50/60 bg-blue-50/30">
                      <td className="py-2.5 px-2 font-bold text-slate-800">
                        <div className="flex items-center space-x-1.5">
                          <span>Invitaciones Sin Cargo</span>
                          <span className="text-[10px] bg-blue-100 text-blue-800 border border-blue-200 px-1.5 py-0.2 rounded font-bold">
                            Protocolo / Prensa
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          min="0"
                          value={invitacionesQty}
                          onChange={(e) => handleInvitacionesQtyChange(e.target.value)}
                          placeholder="0"
                          className="w-full bg-[#fef9c3] border border-[#fde047] focus:bg-white rounded-lg px-2 py-1.5 text-right font-medium outline-none"
                        />
                      </td>
                      <td className="py-2 px-2 text-right">
                        <div className="bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-right text-xs font-mono text-slate-500">
                          $0.00
                        </div>
                      </td>
                      <td className="py-2 px-2 text-right">
                        <div className="bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-slate-400">
                          $0.00
                        </div>
                      </td>
                    </tr>

                    {/* Entradas General */}
                    <tr className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-2 font-bold text-slate-800">
                        <div className="flex items-center justify-between pr-2">
                          <span>Entradas General</span>
                          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                            (Remanente cupos)
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          min="0"
                          value={generalQty}
                          onChange={(e) => handleGeneralQtyChange(e.target.value)}
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
                          {formatARSWithDecimals(subtotalGeneral)}
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
                          {formatARSWithDecimals(ticketAvgPrice)}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-right">
                        <div className="bg-[#e2e8f0] border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-900">
                          {formatARSWithDecimals(totalTicketing)}
                        </div>
                      </td>
                    </tr>

                  </tbody>
                </table>
              </div>

              {/* ======================================================= */}
              {/* SECCIÓN DINÁMICA: RUBROS DE INGRESO ADICIONALES */}
              {/* ======================================================= */}
              <div className="pt-2 border-t border-slate-200 space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-amber-200">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-serif font-bold uppercase tracking-wider text-amber-950">
                      Conceptos & Rubros de Ingreso Adicionales ({selectedIncomes.length} {selectedIncomes.length === 1 ? 'activo' : 'activos'})
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsIncomeModalOpen(true)}
                    className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow transition-all active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Gestionar / Seleccionar Ingresos</span>
                  </button>
                </div>

                {/* Si no hay rubros adicionales seleccionados */}
                {selectedIncomes.length === 0 ? (
                  <div className="bg-amber-50/40 border-2 border-dashed border-amber-200/80 rounded-2xl p-6 text-center space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-serif font-bold text-slate-800 text-xs">Sin conceptos de facturación fijos adicionales</h4>
                      <p className="text-[11px] text-slate-500 max-w-md mx-auto mt-0.5">
                        Si el evento incluye Alquiler de Espacio, Comisión Catering, Barra de Tragos, Sponsors o Merchandising, abrí el catálogo para sumarlos.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsIncomeModalOpen(true)}
                      className="inline-flex items-center space-x-1.5 bg-gradient-to-r from-amber-500 to-barolo-gold hover:from-amber-400 text-barolo-navy font-bold text-xs px-4 py-2 rounded-xl shadow transition-all active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>➕ Seleccionar Ingresos del Catálogo</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                        Detalle de Rubros Seleccionados
                      </span>
                      <span className="text-xs font-mono font-bold text-amber-900">
                        Subtotal: {formatARSWithDecimals(subtotalSelectedIncomes)}
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <tbody className="divide-y divide-slate-100">
                          {selectedIncomes.map((inc) => {
                            const isSens = Boolean(inc.is_sensitive)
                            const isVis = !isSens || canViewSensitiveData(initialEventData, currentUser)
                            const catLabel = inc.category === 'locacion' ? '🏛️ Locación' :
                              inc.category === 'gastronomia' ? '🍽️ Gastronomía / Barra' :
                              inc.category === 'produccion' ? '🎬 Producción' :
                              inc.category === 'comercial' ? '💎 Comercial / Sponsor' : '📦 Otros'
                            
                            return (
                              <tr key={inc.key} className={`hover:bg-amber-50/30 ${isSens ? 'bg-rose-50/20' : ''}`}>
                                <td className="py-2 px-2 font-medium text-slate-800">
                                  <div className="flex items-center justify-between pr-2">
                                    <div className="flex items-center space-x-2">
                                      {isSens && <Lock className="w-3 h-3 text-rose-600 flex-shrink-0" />}
                                      <span className={isSens ? 'font-bold text-rose-950' : ''}>{inc.name}</span>
                                      <span className="text-[9px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-semibold">
                                        {catLabel}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => toggleSelectedIncomeSensitivity(inc.key)}
                                      title={isSens ? 'Ingreso confidencial (visible sólo admin/autor)' : 'Marcar como confidencial'}
                                      className={`p-1 rounded transition-colors ${
                                        isSens ? 'text-rose-600 bg-rose-100' : 'text-slate-300 hover:text-slate-500'
                                      }`}
                                    >
                                      <Lock className="w-3 h-3" />
                                    </button>
                                  </div>
                                </td>
                                <td className="py-2 px-2 text-right w-44">
                                  {isVis ? (
                                    <input
                                      type="number"
                                      min="0"
                                      step="any"
                                      value={inc.amount}
                                      onChange={(e) => updateSelectedIncome(inc.key, 'amount', e.target.value)}
                                      className="w-full bg-[#fef9c3] border border-[#fde047] focus:bg-white rounded-lg px-2.5 py-1.5 text-right font-semibold outline-none"
                                    />
                                  ) : (
                                    <input
                                      type="text"
                                      disabled
                                      value="••••••"
                                      className="w-full bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-right font-mono font-bold text-slate-400 cursor-not-allowed"
                                    />
                                  )}
                                </td>
                                <td className="py-2 px-1 text-center w-10">
                                  <button
                                    type="button"
                                    onClick={() => removeSelectedIncome(inc.key)}
                                    className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
                                    title="Quitar este concepto del evento"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Gastos / Ingresos Extras Dinámicos */}
                {extraIncomes.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                        ✨ Ingresos Adicionales Extras
                      </span>
                      <span className="text-xs font-mono font-bold text-amber-950">
                        Subtotal: {formatARSWithDecimals(totalExtraIncomes)}
                      </span>
                    </div>
                    <table className="w-full text-xs text-left">
                      <tbody className="divide-y divide-slate-100">
                        {extraIncomes.map((inc) => {
                          const isVisible = canViewSensitiveData(inc, currentUser)
                          return (
                            <tr key={inc.id} className="hover:bg-slate-50/60 bg-amber-50/30">
                              <td className="py-2 px-2">
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
                                  <button
                                    type="button"
                                    onClick={() => removeExtraIncome(inc.id)}
                                    className="text-rose-500 hover:text-rose-700 p-1 rounded"
                                    title="Eliminar fila"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 mx-auto" />
                                  </button>
                                </div>
                              </td>
                              <td className="py-2 px-2 text-right w-44">
                                <input
                                  type="number"
                                  min="0"
                                  value={inc.amount}
                                  onChange={(e) => updateExtraIncome(inc.id, 'amount', e.target.value)}
                                  className="w-full bg-[#fef9c3] border border-[#fde047] rounded-lg px-2.5 py-1.5 text-right font-semibold outline-none"
                                />
                              </td>
                              <td className="w-10"></td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Botones de acción al pie de ingresos */}
                {/* Botón de acción al pie de ingresos */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsIncomeModalOpen(true)}
                      className="flex items-center space-x-1.5 text-xs text-amber-900 bg-amber-50 hover:bg-amber-100 font-bold px-3 py-1.5 rounded-xl border border-amber-300 transition-colors shadow-sm cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Seleccionar / Modificar Rubros del Catálogo</span>
                    </button>

                    <button
                      type="button"
                      onClick={addExtraIncome}
                      className="flex items-center space-x-1 text-xs text-slate-600 hover:text-slate-800 font-bold px-2.5 py-1.5 rounded-xl border border-dashed border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Ingreso Extra</span>
                    </button>
                  </div>
                </div>
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
                  {formatARSWithDecimals(totalGrossIncome)}
                </div>
              </div>

            </div>
          </div>

          {/* ======================================================================= */}
          {/* BLOQUE 3: COSTOS DEL EVENTO (O SERVICIOS INCLUIDOS EN VISTA CLIENTE)   */}
          {/* ======================================================================= */}
          {isClientViewMode ? (
            <div className="bg-white rounded-2xl shadow-luxury border border-slate-200 overflow-hidden">
              <div className="bg-[#0f172a] text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <h2 className="font-serif font-bold text-xs uppercase tracking-wider text-emerald-300">
                    3. SERVICIOS Y COBERTURA OPERATIVA INCLUIDA
                  </h2>
                </div>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-mono font-bold">
                  INCLUIDO EN PROPUESTA
                </span>
              </div>
              <div className="p-4 sm:p-5 space-y-4 text-xs">
                <p className="text-slate-600 leading-relaxed">
                  La presente propuesta contempla la cobertura operativa y técnica requerida para el correcto desarrollo del evento en el <strong>Palacio Barolo</strong>:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-900 block">Uso Exclusivo de Sala</span>
                      <span className="text-slate-500 text-[11px]">Disponibilidad del salón principal {venue} con climatización integral.</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-900 block">Técnica Base & Sonido</span>
                      <span className="text-slate-500 text-[11px]">Sonorización ambiental, microfonía y soporte técnico durante la jornada.</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-900 block">Personal y Control de Accesos</span>
                      <span className="text-slate-500 text-[11px]">Recepción de invitados y supervisión de seguridad en hall y accesos.</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start space-x-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-900 block">Limpieza Integral</span>
                      <span className="text-slate-500 text-[11px]">Acondicionamiento higiénico integral previo y posterior a la jornada.</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-900 text-xs flex items-center justify-between">
                  <span className="italic">Todos los honorarios y servicios operativos quedan cubiertos e integrados en el valor global cotizado.</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-luxury border border-slate-200 overflow-hidden">
              {/* Header del bloque con botón directo para abrir catálogo */}
              <div className="bg-[#0f172a] text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-rose-400" />
                  <h2 className="font-serif font-bold text-xs uppercase tracking-wider text-rose-300">
                    3. COSTOS DEL EVENTO ({selectedCosts.length} {selectedCosts.length === 1 ? 'rubro activo' : 'rubros activos'})
                  </h2>
                </div>
              
              <button
                type="button"
                onClick={() => setIsCostModalOpen(true)}
                className="flex items-center space-x-1.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Gestionar / Seleccionar Costos</span>
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-5">

              {/* Si no hay ningún costo seleccionado, mostrar panel limpio */}
              {selectedCosts.length === 0 ? (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
                    <Layers className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-slate-800 text-sm">Sin costos cargados para este evento</h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                      Cada evento es único. Abrí el catálogo para seleccionar únicamente los rubros (del Productor o del Barolo) que aplican a esta cotización.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCostModalOpen(true)}
                    className="inline-flex items-center space-x-2 bg-gradient-to-r from-amber-500 to-barolo-gold hover:from-amber-400 hover:to-amber-300 text-barolo-navy font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>➕ Seleccionar Costos del Catálogo</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  
                  {/* Costos del Productor */}
                  {selectedCosts.some(c => c.category === 'productor') && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between pb-1 border-b border-blue-100">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 flex items-center space-x-1">
                          <span>👤 Costos del Productor / Terceros</span>
                        </span>
                        <span className="text-xs font-mono font-bold text-blue-900">
                          Subtotal: {formatARSWithDecimals(subtotalProductor)}
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <tbody className="divide-y divide-slate-100">
                            {selectedCosts.filter(c => c.category === 'productor').map((c) => {
                              const isSens = Boolean(c.is_sensitive)
                              const isVis = !isSens || canViewSensitiveData(initialEventData, currentUser)
                              return (
                                <tr key={c.key} className={`hover:bg-blue-50/30 ${isSens ? 'bg-rose-50/20' : ''}`}>
                                  <td className="py-2 px-2 font-medium text-slate-800">
                                    <div className="flex items-center justify-between pr-2">
                                      <div className="flex items-center space-x-1.5">
                                        {isSens && <Lock className="w-3 h-3 text-rose-600 flex-shrink-0" />}
                                        <span className={isSens ? 'font-bold text-rose-950' : ''}>{c.name}</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => toggleSelectedCostSensitivity(c.key)}
                                        title={isSens ? 'Costo confidencial (visible sólo admin/autor)' : 'Marcar como confidencial'}
                                        className={`p-1 rounded transition-colors ${
                                          isSens ? 'text-rose-600 bg-rose-100' : 'text-slate-300 hover:text-slate-500'
                                        }`}
                                      >
                                        <Lock className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </td>
                                  <td className="py-2 px-2 text-right w-44">
                                    {isVis ? (
                                      <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={c.amount}
                                        onChange={(e) => updateSelectedCost(c.key, 'amount', e.target.value)}
                                        className="w-full bg-[#fef9c3] border border-[#fde047] focus:bg-white rounded-lg px-2.5 py-1.5 text-right font-semibold outline-none"
                                      />
                                    ) : (
                                      <input
                                        type="text"
                                        disabled
                                        value="••••••"
                                        className="w-full bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-right font-mono font-bold text-slate-400 cursor-not-allowed"
                                      />
                                    )}
                                  </td>
                                  <td className="py-2 px-1 text-center w-10">
                                    <button
                                      type="button"
                                      onClick={() => removeSelectedCost(c.key)}
                                      className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
                                      title="Quitar este costo del evento"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Costos del Palacio Barolo */}
                  {selectedCosts.some(c => c.category === 'barolo') && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between pb-1 border-b border-amber-200">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 flex items-center space-x-1">
                          <span>🏛️ Costos del Palacio Barolo</span>
                        </span>
                        <span className="text-xs font-mono font-bold text-amber-950">
                          Subtotal: {formatARSWithDecimals(subtotalBarolo)}
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <tbody className="divide-y divide-slate-100">
                            {selectedCosts.filter(c => c.category === 'barolo').map((c) => {
                              const isSens = Boolean(c.is_sensitive)
                              const isVis = !isSens || canViewSensitiveData(initialEventData, currentUser)
                              return (
                                <tr key={c.key} className={`hover:bg-amber-50/30 ${isSens ? 'bg-rose-50/20' : ''}`}>
                                  <td className="py-2 px-2 font-medium text-slate-800">
                                    <div className="flex items-center justify-between pr-2">
                                      <div className="flex items-center space-x-1.5">
                                        {isSens && <Lock className="w-3 h-3 text-rose-600 flex-shrink-0" />}
                                        <span className={isSens ? 'font-bold text-rose-950' : ''}>{c.name}</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => toggleSelectedCostSensitivity(c.key)}
                                        title={isSens ? 'Costo confidencial (visible sólo admin/autor)' : 'Marcar como confidencial'}
                                        className={`p-1 rounded transition-colors ${
                                          isSens ? 'text-rose-600 bg-rose-100' : 'text-slate-300 hover:text-slate-500'
                                        }`}
                                      >
                                        <Lock className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </td>
                                  <td className="py-2 px-2 text-right w-44">
                                    {isVis ? (
                                      <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={c.amount}
                                        onChange={(e) => updateSelectedCost(c.key, 'amount', e.target.value)}
                                        className="w-full bg-[#fef9c3] border border-[#fde047] focus:bg-white rounded-lg px-2.5 py-1.5 text-right font-semibold outline-none"
                                      />
                                    ) : (
                                      <input
                                        type="text"
                                        disabled
                                        value="••••••"
                                        className="w-full bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-right font-mono font-bold text-slate-400 cursor-not-allowed"
                                      />
                                    )}
                                  </td>
                                  <td className="py-2 px-1 text-center w-10">
                                    <button
                                      type="button"
                                      onClick={() => removeSelectedCost(c.key)}
                                      className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
                                      title="Quitar este costo del evento"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Gastos Adicionales Extras */}
                  {extraExpenses.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between pb-1 border-b border-rose-200">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
                          📦 Gastos Extras Adicionales
                        </span>
                        <span className="text-xs font-mono font-bold text-rose-900">
                          Subtotal: {formatARSWithDecimals(totalExtraExpenses)}
                        </span>
                      </div>
                      <table className="w-full text-xs text-left">
                        <tbody className="divide-y divide-slate-100">
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
                                <td className="py-2 px-2 text-right w-44">
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={exp.amount}
                                    onChange={(e) => updateExtraExpense(exp.id, 'amount', e.target.value)}
                                    className="w-full bg-[#fef9c3] border border-[#fde047] rounded-lg px-2.5 py-1.5 text-right font-semibold outline-none"
                                  />
                                </td>
                                <td className="w-10"></td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                </div>
              )}

              {/* Botones de acción al pie de costos */}
              {/* Botón de acción al pie de costos */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsCostModalOpen(true)}
                    className="flex items-center space-x-1.5 text-xs text-amber-900 bg-amber-50 hover:bg-amber-100 font-bold px-3 py-1.5 rounded-xl border border-amber-300 transition-colors shadow-sm cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Seleccionar / Modificar Rubros del Catálogo</span>
                  </button>

                  <button
                    type="button"
                    onClick={addExtraExpense}
                    className="flex items-center space-x-1 text-xs text-slate-600 hover:text-slate-800 font-bold px-2.5 py-1.5 rounded-xl border border-dashed border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Gasto Extra</span>
                  </button>
                </div>
              </div>

              {/* TOTAL COSTOS (BARRA RESALTADA) */}
              <div className="bg-gradient-to-r from-rose-500 via-rose-600 to-rose-500 text-white font-bold p-3.5 rounded-xl flex items-center justify-between shadow-md">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">👉</span>
                  <span className="font-serif uppercase tracking-wider text-xs sm:text-sm font-black">
                    TOTAL COSTOS DEL EVENTO:
                  </span>
                </div>
                <div className="text-base sm:text-xl font-mono font-black tracking-tight">
                  {formatARSWithDecimals(totalCosts)}
                </div>
              </div>

            </div>
          </div>
        )}

        </div>

        {/* ------------------------------------------------------------------------- */}
        {/* COLUMNA DERECHA (5 cols): BLOQUES 4, 5 Y 6 (RESULTADO, BREAK-EVEN, MARGEN) */}
        {/* ------------------------------------------------------------------------- */}
        <div className="lg:col-span-5 space-y-6">

          {/* ======================================================================= */}
          {/* BLOQUE 4: RESULTADO ECONÓMICO (O RESUMEN DE INVERSIÓN VISTA CLIENTE)     */}
          {/* ======================================================================= */}
          {isClientViewMode ? (
            <div className="bg-white rounded-2xl shadow-luxury border border-slate-200 overflow-hidden">
              <div className="bg-[#0f172a] text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-amber-400" />
                  <h2 className="font-serif font-bold text-xs uppercase tracking-wider text-amber-300">
                    4. RESUMEN DE INVERSIÓN COMERCIAL
                  </h2>
                </div>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2.5 py-0.5 rounded-full font-mono font-bold">
                  PRESUPUESTO CLIENTE
                </span>
              </div>

              <div className="p-4 sm:p-5 space-y-4 text-xs">
                {/* Tarjeta destacada Inversión Total */}
                <div className="bg-gradient-to-br from-barolo-navy via-slate-900 to-barolo-navy-dark text-white rounded-2xl p-5 shadow-xl border border-amber-500/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-serif uppercase tracking-wider text-xs font-bold text-amber-300">
                      TOTAL INVERSIÓN PRESUPUESTADA:
                    </span>
                    <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2.5 py-0.5 rounded-full font-mono font-bold border border-amber-400/30">
                      {invoiceType}
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-mono font-black text-amber-400 my-2">
                    {formatARSWithDecimals(totalGrossIncome)}
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Importe global cotizado para la contratación integral del espacio y servicios en el Palacio Barolo.
                  </p>
                </div>

                {/* Síntesis de Conceptos Presupuestados */}
                <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-900 text-xs">Síntesis de Conceptos Cotizados:</h4>
                  
                  {Number(alquilerEspacio) > 0 && (
                    <div className="flex justify-between items-center text-slate-700 py-1.5 border-b border-slate-200/60">
                      <span>Uso Exclusivo de Espacio ({venue})</span>
                      <span className="font-mono font-bold text-slate-900">{formatARSWithDecimals(alquilerEspacio)}</span>
                    </div>
                  )}

                  {totalEntradasCalculadas > 0 && (
                    <div className="flex justify-between items-center text-slate-700 py-1.5 border-b border-slate-200/60">
                      <span>Localidades / Tickets ({ticketQty || 0} pax a {formatARS(ticketPrice)})</span>
                      <span className="font-mono font-bold text-slate-900">{formatARSWithDecimals(totalEntradasCalculadas)}</span>
                    </div>
                  )}

                  {totalExtraIncomes > 0 && (
                    <div className="flex justify-between items-center text-slate-700 py-1.5 border-b border-slate-200/60">
                      <span>Servicios Especiales / Extras</span>
                      <span className="font-mono font-bold text-slate-900">{formatARSWithDecimals(totalExtraIncomes)}</span>
                    </div>
                  )}
                </div>

                {/* Condiciones Comerciales y Formas de Pago */}
                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                  <h4 className="font-bold text-amber-950 text-xs flex items-center space-x-1.5">
                    <Info className="w-4 h-4 text-amber-700" />
                    <span>Condiciones Comerciales de Contratación:</span>
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-slate-700 text-[11px]">
                    <li><strong>Reserva de fecha:</strong> 30% del valor total contra confirmación.</li>
                    <li><strong>Saldo cancelatorio:</strong> 70% restante hasta 7 días corridos antes del evento.</li>
                    <li><strong>Medios de pago:</strong> Transferencia bancaria directa / e-Cheq / Factura legal.</li>
                    <li><strong>Vigencia de la oferta:</strong> 15 días corridos a partir de su emisión.</li>
                  </ul>
                </div>

                {/* Acciones Rápidas para el Cliente */}
                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => setIsProposalModalOpen(true)}
                    className="flex-1 flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-3 rounded-xl shadow transition-colors cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-amber-400" />
                    <span>Presupuesto Formal PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportHtmlPresentation}
                    className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs py-2.5 px-3 rounded-xl shadow transition-all cursor-pointer"
                  >
                    <MonitorPlay className="w-4 h-4 text-slate-950" />
                    <span>Presentación HTML</span>
                  </button>
                </div>

              </div>
            </div>
          ) : (
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
                    {formatARSWithDecimals(totalGrossIncome)}
                  </span>
                </div>

                {/* Total Costos del Evento */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-600 font-medium">Total Costos del Evento</span>
                  <span className="font-mono font-bold text-rose-700 text-sm">
                    - {formatARSWithDecimals(totalCosts)}
                  </span>
                </div>

                {/* Margen Bruto Operación */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-100 border border-slate-300 font-bold">
                  <span className="text-slate-800">Margen Bruto Operación</span>
                  <span className={`font-mono text-sm ${netMargin >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                    {formatARSWithDecimals(netMargin)}
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
        )}

          {/* ======================================================================= */}
          {/* BLOQUES 5 Y 6 (SÓLO VISIBLES EN VISTA INTERNA DEL EQUIPO)               */}
          {/* ======================================================================= */}
          {!isClientViewMode && (
            <>
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
                    {formatARSWithDecimals(totalCosts)}
                  </span>
                </div>

                {/* Ingreso Promedio x Entrada */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-600 font-medium">Ingreso Promedio x Entrada</span>
                  <span className="font-mono font-bold text-slate-800">
                    {formatARSWithDecimals(ticketAvgPrice)}
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
                    {formatARSWithDecimals(gananciaNetaXAsistente)}
                  </span>
                </div>

                {/* Costo Promedio x Asistente */}
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Costo Promedio x Asistente</span>
                  <span className="font-mono font-black text-slate-700 text-sm">
                    {formatARSWithDecimals(costoPromedioXAsistente)}
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
            </>
          )}

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

            {/* Notas Confidenciales (Restringido - Oculto en Modo Vista Cliente) */}
            {canViewSensitiveData(initialEventData, currentUser) && !isClientViewMode && (
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
      <div className={`fixed bottom-4 left-4 right-4 sm:left-8 ${isAiDrawerOpen ? 'lg:left-72 lg:right-[435px]' : 'lg:left-72 sm:right-8'} z-30 bg-[#0f172a]/95 backdrop-blur-md text-white px-4 sm:px-6 py-3 rounded-2xl shadow-2xl border border-slate-700 flex flex-col md:flex-row items-center justify-between gap-3 transition-all duration-300 ease-in-out`}>
        
        {/* Métricas rápidas */}
        {isClientViewMode ? (
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="px-2.5 py-1 bg-amber-400 text-barolo-navy font-bold rounded-lg text-xs flex items-center space-x-1.5 shadow-sm">
              <Eye className="w-3.5 h-3.5" />
              <span>VISTA CLIENTE ACTIVA</span>
            </span>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Inversión Presupuestada</span>
              <span className="font-mono font-black text-amber-400 text-base sm:text-lg">
                {formatARS(totalGrossIncome)}
              </span>
            </div>
          </div>
        ) : (
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
        )}

        {/* Botones de acción */}
        <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
          {/* Toggle Vista Cliente en barra flotante */}
          <button
            type="button"
            onClick={() => setIsClientViewMode(!isClientViewMode)}
            className={`flex items-center space-x-1 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ${
              isClientViewMode 
                ? 'bg-amber-400 text-barolo-navy font-black ring-2 ring-amber-300' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
            title={isClientViewMode ? "Desactivar modo Vista Cliente" : "Activar modo Vista Cliente (oculta costos internos)"}
          >
            {isClientViewMode ? <EyeOff className="w-3.5 h-3.5 text-barolo-navy" /> : <Eye className="w-3.5 h-3.5 text-amber-400" />}
            <span className="hidden sm:inline">{isClientViewMode ? 'Cliente Activo' : 'Vista Cliente'}</span>
          </button>

          <button
            onClick={handleExportHtmlPresentation}
            className="flex items-center space-x-1 px-3 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 transition-all shadow-sm cursor-pointer"
            title="Descargar archivo HTML dinámico e interactivo de la cotización para presentar"
          >
            <MonitorPlay className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">HTML</span>
          </button>

          <button
            onClick={() => setIsProposalModalOpen(true)}
            className="flex items-center space-x-1 px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shadow-sm cursor-pointer"
            title="Ver propuesta comercial imprimible / PDF"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">PDF</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center space-x-1 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white transition-colors shadow-sm cursor-pointer"
            title="Descargar Excel oficial de la cotización"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
            <span className="hidden sm:inline">Excel</span>
          </button>

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

      {/* Modal de Propuesta Comercial Formal Imprimible / PDF */}
      {isProposalModalOpen && (
        <CommercialProposalModal
          event={buildPayload()}
          currentUser={currentUser}
          onClose={() => setIsProposalModalOpen(false)}
        />
      )}

            {/* MODAL DE SELECCIÓN DE INGRESOS DEL CATÁLOGO */}
      {isIncomeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header del Modal */}
            <div className="bg-barolo-navy text-white px-5 py-4 flex items-center justify-between border-b border-barolo-gold/40 flex-shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-barolo-gold to-amber-500 flex items-center justify-center text-barolo-navy font-bold shadow">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-sm sm:text-base text-white">
                    Catálogo de Ingresos del Evento
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Marcá únicamente los conceptos de facturación que aplican a esta cotización
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsIncomeModalOpen(false)}
                className="p-1.5 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Barra de Búsqueda y Filtros */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-2 flex-shrink-0">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar concepto por nombre..."
                  value={incomeModalSearch}
                  onChange={(e) => setIncomeModalSearch(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div className="flex items-center space-x-1.5 text-xs overflow-x-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setIncomeModalCategoryFilter('all')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    incomeModalCategoryFilter === 'all'
                      ? 'bg-barolo-navy text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setIncomeModalCategoryFilter('locacion')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    incomeModalCategoryFilter === 'locacion'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  🏛️ Salón
                </button>
                <button
                  type="button"
                  onClick={() => setIncomeModalCategoryFilter('gastronomia')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    incomeModalCategoryFilter === 'gastronomia'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  🍽️ Barra/Catering
                </button>
                <button
                  type="button"
                  onClick={() => setIncomeModalCategoryFilter('comercial')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    incomeModalCategoryFilter === 'comercial'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100'
                  }`}
                >
                  💎 Comercial
                </button>
              </div>
            </div>

            {/* Listado de Rubros del Catálogo */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 divide-y divide-slate-100">
              {(templateConfig?.masterIncomeCatalog || DEFAULT_MASTER_INCOME_CATALOG)
                .filter(item => item.enabled !== false)
                .filter(item => incomeModalCategoryFilter === 'all' || item.category === incomeModalCategoryFilter)
                .filter(item => !incomeModalSearch || item.name.toLowerCase().includes(incomeModalSearch.toLowerCase()))
                .map(item => {
                  const isChecked = selectedIncomes.some(i => i.key === item.key)
                  const currentIncome = selectedIncomes.find(i => i.key === item.key)
                  const catBadge = item.category === 'locacion' ? '🏛️ Salón / Locación' :
                    item.category === 'gastronomia' ? '🍽️ Barra / Catering' :
                    item.category === 'produccion' ? '🎬 Canon Producción' :
                    item.category === 'comercial' ? '💎 Sponsor / Merchandising' : '📦 Otros Ingresos'

                  return (
                    <div
                      key={item.key}
                      className={`py-2.5 px-3 rounded-xl flex items-center justify-between gap-3 transition-colors ${
                        isChecked ? 'bg-amber-50/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleIncomeInEvent(item)}
                          className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-400 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <p className={`text-xs font-bold truncate ${isChecked ? 'text-slate-900' : 'text-slate-700'}`}>
                            {item.name}
                          </p>
                          <span className="inline-block text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900">
                            {catBadge}
                          </span>
                        </div>
                      </div>

                      {/* Input de monto cuando está marcado */}
                      {isChecked && (
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleSelectedIncomeSensitivity(item.key)}
                            title={currentIncome?.is_sensitive ? 'Ingreso confidencial' : 'Hacer confidencial'}
                            className={`p-1.5 rounded-lg ${
                              currentIncome?.is_sensitive ? 'bg-rose-100 text-rose-600' : 'text-slate-300 hover:text-slate-500'
                            }`}
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </button>
                          <div className="relative w-32 sm:w-36">
                            <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-mono">$</span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={currentIncome?.amount ?? 0}
                              onChange={(e) => updateSelectedIncome(item.key, 'amount', e.target.value)}
                              placeholder="0"
                              className="w-full bg-white border border-amber-300 focus:border-amber-500 rounded-lg pl-6 pr-2.5 py-1 text-xs text-right font-semibold text-slate-900 outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>

            {/* Footer del Modal */}
            <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
              <span className="text-xs text-slate-600 font-medium">
                <strong>{selectedIncomes.length}</strong> {selectedIncomes.length === 1 ? 'rubro seleccionado' : 'rubros seleccionados'}
              </span>

              <button
                type="button"
                onClick={() => setIsIncomeModalOpen(false)}
                className="bg-barolo-navy hover:bg-barolo-navy-light text-white text-xs font-bold px-5 py-2 rounded-xl shadow transition-all active:scale-95 cursor-pointer"
              >
                Aplicar al Evento
              </button>
            </div>

          </div>
        </div>
      )}

      
      {/* MODAL DE SELECCIÓN DE COSTOS DEL CATÁLOGO */}
      {isCostModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header del Modal */}
            <div className="bg-barolo-navy text-white px-5 py-4 flex items-center justify-between border-b border-barolo-gold/40 flex-shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-barolo-gold to-amber-500 flex items-center justify-center text-barolo-navy font-bold shadow">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-sm sm:text-base text-white">
                    Catálogo de Costos del Evento
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Marcá únicamente los costos que aplican a esta cotización
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCostModalOpen(false)}
                className="p-1.5 text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Barra de Búsqueda y Filtros */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-2 flex-shrink-0">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar rubro por nombre..."
                  value={costModalSearch}
                  onChange={(e) => setCostModalSearch(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div className="flex items-center space-x-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setCostModalCategoryFilter('all')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    costModalCategoryFilter === 'all'
                      ? 'bg-barolo-navy text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setCostModalCategoryFilter('productor')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    costModalCategoryFilter === 'productor'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100'
                  }`}
                >
                  👤 Productor
                </button>
                <button
                  type="button"
                  onClick={() => setCostModalCategoryFilter('barolo')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    costModalCategoryFilter === 'barolo'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
                  }`}
                >
                  🏛️ Barolo
                </button>
              </div>
            </div>

            {/* Listado de Rubros del Catálogo */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 divide-y divide-slate-100">
              {(templateConfig?.masterCostCatalog || DEFAULT_MASTER_COST_CATALOG)
                .filter(item => item.enabled !== false)
                .filter(item => costModalCategoryFilter === 'all' || item.category === costModalCategoryFilter)
                .filter(item => !costModalSearch || item.name.toLowerCase().includes(costModalSearch.toLowerCase()))
                .map(item => {
                  const isChecked = selectedCosts.some(c => c.key === item.key)
                  const currentCost = selectedCosts.find(c => c.key === item.key)
                  const isBarolo = item.category === 'barolo'

                  return (
                    <div
                      key={item.key}
                      className={`py-2.5 px-3 rounded-xl flex items-center justify-between gap-3 transition-colors ${
                        isChecked ? 'bg-amber-50/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCostInEvent(item)}
                          className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-400 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <p className={`text-xs font-bold truncate ${isChecked ? 'text-slate-900' : 'text-slate-700'}`}>
                            {item.name}
                          </p>
                          <span className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded ${
                            isBarolo ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'
                          }`}>
                            {isBarolo ? '🏛️ Costo Barolo' : '👤 Costo Productor'}
                          </span>
                        </div>
                      </div>

                      {/* Input de monto cuando está marcado */}
                      {isChecked && (
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleSelectedCostSensitivity(item.key)}
                            title={currentCost?.is_sensitive ? 'Costo confidencial' : 'Hacer confidencial'}
                            className={`p-1.5 rounded-lg ${
                              currentCost?.is_sensitive ? 'bg-rose-100 text-rose-600' : 'text-slate-300 hover:text-slate-500'
                            }`}
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </button>
                          <div className="relative w-32 sm:w-36">
                            <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-mono">$</span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={currentCost?.amount ?? 0}
                              onChange={(e) => updateSelectedCost(item.key, 'amount', e.target.value)}
                              placeholder="0"
                              className="w-full bg-white border border-amber-300 focus:border-amber-500 rounded-lg pl-6 pr-2.5 py-1 text-xs text-right font-semibold text-slate-900 outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>

            {/* Footer del Modal */}
            <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
              <span className="text-xs text-slate-600 font-medium">
                <strong>{selectedCosts.length}</strong> {selectedCosts.length === 1 ? 'rubro seleccionado' : 'rubros seleccionados'}
              </span>

              <button
                type="button"
                onClick={() => setIsCostModalOpen(false)}
                className="bg-barolo-navy hover:bg-barolo-navy-light text-white text-xs font-bold px-5 py-2 rounded-xl shadow transition-all active:scale-95 cursor-pointer"
              >
                Aplicar al Evento
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}