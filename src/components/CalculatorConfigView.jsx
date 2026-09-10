import React, { useState, useEffect } from 'react'
import { 
  Sliders, Plus, Trash2, Save, RotateCcw, ArrowRight, 
  Sparkles, CheckCircle2, ShieldAlert, DollarSign, Building, 
  Handshake, Tag, HelpCircle, Eye, AlertTriangle 
} from 'lucide-react'
import { calculatorConfigService, DEFAULT_CALCULATOR_CONFIG, DEFAULT_MASTER_COST_CATALOG, DEFAULT_MASTER_INCOME_CATALOG } from '../services/calculatorConfigService'
import { isAdmin } from '../services/authService'

export default function CalculatorConfigView({ currentUser, onNavigateToCalculator }) {
  const isUserAdmin = isAdmin(currentUser)

  const [activeTab, setActiveTab] = useState('expenses') // 'expenses', 'incomes', 'venues', 'agreements'
  const [config, setConfig] = useState(() => calculatorConfigService.getConfig())
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Cargar configuración activa
  useEffect(() => {
    const loaded = calculatorConfigService.getConfig()
    setConfig(loaded)
  }, [])

  // Si no es admin, pantalla de bloqueo
  if (!isUserAdmin) {
    return (
      <div className="bg-white rounded-3xl p-10 shadow-luxury border border-rose-200 text-center max-w-xl mx-auto my-12 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold font-serif text-slate-800">Acceso Exclusivo para Administrador</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Esta sección está restringida exclusivamente a usuarios con rol <strong>Administrador (admin)</strong>. 
          Tu rol actual es <strong>{currentUser?.displayName || 'Usuario'} ({currentUser?.roleBadge?.title || currentUser?.role})</strong>.
        </p>
        <button
          onClick={onNavigateToCalculator}
          className="mt-4 px-5 py-2.5 bg-barolo-navy text-white text-xs font-bold rounded-xl shadow hover:bg-barolo-navy-light transition-all"
        >
          Ir a la Calculadora Madre
        </button>
      </div>
    )
  }

  // Marcar cambios pendientes
  const updateField = (updater) => {
    setConfig(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater }
      setHasChanges(true)
      return next
    })
  }

  // Guardar configuración
  const handleSave = async () => {
    const res = await calculatorConfigService.saveConfig(config)
    if (res.success) {
      setSavedSuccess(true)
      setHasChanges(false)
      setTimeout(() => setSavedSuccess(false), 3000)
    }
  }

  // Restablecer de fábrica
  const handleReset = () => {
    if (confirm('¿Restablecer toda la plantilla de la calculadora a los valores iniciales de fábrica del Palacio Barolo?')) {
      const res = calculatorConfigService.resetToDefaults()
      if (res.success) {
        setConfig(res.config)
        setHasChanges(false)
        setSavedSuccess(true)
        setTimeout(() => setSavedSuccess(false), 3000)
      }
    }
  }

  // --- Handlers para Gastos ---
  const addExpense = (concept = '', defaultAmount = 0) => {
    const newExp = {
      id: `exp-${Date.now()}`,
      concept: concept || 'Nuevo Gasto Habitual',
      defaultAmount: Number(defaultAmount) || 0,
      enabled: true
    }
    updateField(prev => ({
      ...prev,
      defaultExpenses: [...prev.defaultExpenses, newExp]
    }))
  }

  const updateExpense = (id, key, val) => {
    updateField(prev => ({
      ...prev,
      defaultExpenses: prev.defaultExpenses.map(e => e.id === id ? { ...e, [key]: val } : e)
    }))
  }

  const removeExpense = (id) => {
    updateField(prev => ({
      ...prev,
      defaultExpenses: prev.defaultExpenses.filter(e => e.id !== id)
    }))
  }

  // --- Handlers para Ingresos ---
  const addIncome = (concept = '', defaultAmount = 0) => {
    const newInc = {
      id: `inc-${Date.now()}`,
      concept: concept || 'Nuevo Ingreso Habitual',
      defaultAmount: Number(defaultAmount) || 0,
      enabled: true
    }
    updateField(prev => ({
      ...prev,
      defaultIncomes: [...(prev.defaultIncomes || []), newInc]
    }))
  }

  const updateIncome = (id, key, val) => {
    updateField(prev => ({
      ...prev,
      defaultIncomes: (prev.defaultIncomes || []).map(i => i.id === id ? { ...i, [key]: val } : i)
    }))
  }

  const removeIncome = (id) => {
    updateField(prev => ({
      ...prev,
      defaultIncomes: (prev.defaultIncomes || []).filter(i => i.id !== id)
    }))
  }

  // --- Handlers para Catálogo Maestro de Costos ---
  const addCatalogCost = (category = 'productor') => {
    const newCost = {
      id: `cost_${Date.now()}`,
      key: `cost_${Date.now()}`,
      name: category === 'productor' ? 'Nuevo Costo de Productor' : 'Nuevo Costo de Barolo',
      category: category,
      defaultAmount: 0,
      enabled: true
    }
    updateField(prev => ({
      ...prev,
      masterCostCatalog: [...(prev.masterCostCatalog || DEFAULT_MASTER_COST_CATALOG), newCost]
    }))
  }

  const updateCatalogCost = (id, key, val) => {
    updateField(prev => ({
      ...prev,
      masterCostCatalog: (prev.masterCostCatalog || DEFAULT_MASTER_COST_CATALOG).map(c => 
        c.id === id ? { ...c, [key]: val } : c
      )
    }))
  }

  const removeCatalogCost = (id) => {
    updateField(prev => ({
      ...prev,
      masterCostCatalog: (prev.masterCostCatalog || DEFAULT_MASTER_COST_CATALOG).filter(c => c.id !== id)
    }))
  }

  // --- Handlers para Catálogo Maestro de Ingresos ---
  const addCatalogIncome = (category = 'locacion') => {
    const newInc = {
      id: `inc_${Date.now()}`,
      key: `inc_${Date.now()}`,
      name: 'Nuevo Rubro de Ingreso',
      category: category,
      defaultAmount: 0,
      enabled: true
    }
    updateField(prev => ({
      ...prev,
      masterIncomeCatalog: [...(prev.masterIncomeCatalog || DEFAULT_MASTER_INCOME_CATALOG), newInc]
    }))
  }

  const updateCatalogIncome = (id, key, val) => {
    updateField(prev => ({
      ...prev,
      masterIncomeCatalog: (prev.masterIncomeCatalog || DEFAULT_MASTER_INCOME_CATALOG).map(i => 
        i.id === id ? { ...i, [key]: val } : i
      )
    }))
  }

  const removeCatalogIncome = (id) => {
    updateField(prev => ({
      ...prev,
      masterIncomeCatalog: (prev.masterIncomeCatalog || DEFAULT_MASTER_INCOME_CATALOG).filter(i => i.id !== id)
    }))
  }

  // --- Handlers para Salones ---
  const addVenue = () => {
    const newVenue = {
      id: `v-${Date.now()}`,
      name: 'Nuevo Salón / Terraza',
      defaultCapacity: 50,
      defaultRental: 0,
      enabled: true
    }
    updateField(prev => ({
      ...prev,
      venues: [...prev.venues, newVenue]
    }))
  }

  const updateVenue = (id, key, val) => {
    updateField(prev => ({
      ...prev,
      venues: prev.venues.map(v => v.id === id ? { ...v, [key]: val } : v)
    }))
  }

  const removeVenue = (id) => {
    if (config.venues.length <= 1) {
      alert('Debe haber al menos un salón disponible.')
      return
    }
    updateField(prev => ({
      ...prev,
      venues: prev.venues.filter(v => v.id !== id)
    }))
  }

  // --- Handlers para Convenios & Tipos ---
  const addAgreement = () => {
    const name = prompt('Nombre del nuevo tipo de convenio (ej: 60% Barolo - 40% Productor):')
    if (name && name.trim()) {
      if (!config.agreementTypes.includes(name.trim())) {
        updateField(prev => ({
          ...prev,
          agreementTypes: [...prev.agreementTypes, name.trim()]
        }))
      }
    }
  }

  const removeAgreement = (agr) => {
    if (config.agreementTypes.length <= 1) {
      alert('Debe haber al menos un tipo de convenio disponible.')
      return
    }
    updateField(prev => ({
      ...prev,
      agreementTypes: prev.agreementTypes.filter(a => a !== agr)
    }))
  }

  const addEventType = () => {
    const typeName = prompt('Nombre de la nueva categoría de evento (ej: Seminario, Bodas):')
    if (typeName && typeName.trim()) {
      if (!config.eventTypes.includes(typeName.trim())) {
        updateField(prev => ({
          ...prev,
          eventTypes: [...prev.eventTypes, typeName.trim()]
        }))
      }
    }
  }

  const removeEventType = (type) => {
    if (config.eventTypes.length <= 1) {
      alert('Debe haber al menos un tipo de evento disponible.')
      return
    }
    updateField(prev => ({
      ...prev,
      eventTypes: prev.eventTypes.filter(t => t !== type)
    }))
  }

  return (
    <div className="space-y-6 pb-24 max-w-6xl mx-auto">

      {/* Header Principal */}
      <div className="bg-white rounded-3xl p-6 shadow-luxury border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-barolo-navy to-barolo-navy-dark text-amber-300 flex items-center justify-center shadow-lg border border-amber-400/40">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-barolo-navy">
                  Configuración de Plantilla Madre
                </h2>
                <span className="text-[10px] bg-amber-400/20 text-amber-800 border border-amber-400/50 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Solo Admin 👑
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Personalizá los gastos fijos predeterminados (ej: Publicidad), salones y convenios que se cargarán en cada cotización nueva.
              </p>
            </div>
          </div>
        </div>

        {/* Acciones principales de guardado */}
        <div className="flex flex-wrap items-center gap-2">
          {hasChanges && (
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-300 flex items-center space-x-1 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Cambios sin guardar</span>
            </span>
          )}

          {savedSuccess && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-300 flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>¡Plantilla guardada!</span>
            </span>
          )}

          <button
            onClick={handleReset}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95"
            title="Restablecer a valores iniciales"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Fábrica</span>
          </button>

          <button
            onClick={handleSave}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-barolo-gold hover:from-amber-400 hover:to-amber-300 text-barolo-navy shadow-md shadow-amber-400/25 transition-all active:scale-95"
            title="Guardar plantilla personalizada"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Plantilla</span>
          </button>

          <button
            onClick={onNavigateToCalculator}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-barolo-navy hover:bg-barolo-navy-light text-white shadow-md transition-all active:scale-95"
            title="Ir a la calculadora y verificar la plantilla"
          >
            <Eye className="w-3.5 h-3.5 text-amber-300" />
            <span>Probar en Calculadora</span>
          </button>
        </div>
      </div>

      {/* Selector de Pestañas de Configuración */}
      <div className="flex flex-wrap items-center gap-2 bg-white/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200 shadow-sm">
        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'expenses'
              ? 'bg-barolo-navy text-amber-300 shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>💸 Gastos Predeterminados</span>
          <span className="bg-amber-400/20 text-amber-600 text-[10px] px-1.5 py-0.2 rounded-full">
            {config.defaultExpenses.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('incomes')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'incomes'
              ? 'bg-barolo-navy text-amber-300 shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>💰 Ingresos Predeterminados</span>
          <span className="bg-amber-400/20 text-amber-600 text-[10px] px-1.5 py-0.2 rounded-full">
            {(config.defaultIncomes || []).length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('incomeCatalog')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'incomeCatalog'
              ? 'bg-barolo-navy text-amber-300 shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>💵 Catálogo de Ingresos</span>
          <span className="bg-emerald-400/20 text-emerald-700 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
            {(config.masterIncomeCatalog || DEFAULT_MASTER_INCOME_CATALOG).length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('costs')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'costs'
              ? 'bg-barolo-navy text-amber-300 shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>🏷️ Catálogo de Costos</span>
          <span className="bg-amber-400/20 text-amber-600 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
            {(config.masterCostCatalog || DEFAULT_MASTER_COST_CATALOG).length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('venues')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'venues'
              ? 'bg-barolo-navy text-amber-300 shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span>🏛️ Salones & Espacios</span>
          <span className="bg-amber-400/20 text-amber-600 text-[10px] px-1.5 py-0.2 rounded-full">
            {config.venues.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('agreements')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'agreements'
              ? 'bg-barolo-navy text-amber-300 shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Handshake className="w-3.5 h-3.5" />
          <span>🤝 Convenios & Categorías</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* PESTAÑA 1: GASTOS PREDETERMINADOS (PUBLICIDAD, SEGURIDAD, ETC.) */}
      {/* ========================================================================= */}
      {activeTab === 'expenses' && (
        <div className="bg-white rounded-3xl p-6 shadow-luxury border border-slate-200 space-y-6">
          
          {/* Banner explicativo y atajos */}
          <div className="bg-gradient-to-r from-amber-500/10 to-amber-100/30 border border-amber-400/50 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-xl bg-amber-400/30 text-amber-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-amber-950">Gastos que se precargan en cada nueva cotización</p>
                <p className="text-slate-600 mt-0.5 leading-relaxed">
                  Si un gasto es recurrente en tus eventos (como <strong>Publicidad</strong>, <strong>Seguridad</strong> o <strong>Staff</strong>), 
                  agregalo acá con un monto sugerido o en $0 para que los operadores lo encuentren listo cada vez que coticen.
                </p>
              </div>
            </div>

            <button
              onClick={() => addExpense()}
              className="flex items-center space-x-1 bg-amber-500 hover:bg-amber-400 text-barolo-navy text-xs font-bold px-3 py-2 rounded-xl shadow-sm transition-all flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Nuevo Gasto</span>
            </button>
          </div>

          {/* Atajos de 1-clic para agregar gastos habituales */}
          <div className="flex items-center flex-wrap gap-2 pt-1 pb-2 border-b border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Atajos rápidos:</span>
            <button
              onClick={() => addExpense('Publicidad en Redes & Meta Ads', 40000)}
              className="text-[11px] bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 border border-slate-200 hover:border-amber-300 px-2.5 py-1 rounded-lg font-medium transition-all"
            >
              + Publicidad en Redes ($40.000)
            </button>
            <button
              onClick={() => addExpense('Seguridad Privada Adicional', 0)}
              className="text-[11px] bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 border border-slate-200 hover:border-amber-300 px-2.5 py-1 rounded-lg font-medium transition-all"
            >
              + Seguridad Privada ($0)
            </button>
            <button
              onClick={() => addExpense('Fotografía & Cobertura Audiovisual', 0)}
              className="text-[11px] bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 border border-slate-200 hover:border-amber-300 px-2.5 py-1 rounded-lg font-medium transition-all"
            >
              + Fotografía & Video ($0)
            </button>
            <button
              onClick={() => addExpense('Canon Municipal / Impuestos de Espectáculo', 0)}
              className="text-[11px] bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 border border-slate-200 hover:border-amber-300 px-2.5 py-1 rounded-lg font-medium transition-all"
            >
              + Impuestos Espectáculo ($0)
            </button>
          </div>

          {/* Tabla de Gastos Predeterminados */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Estado</th>
                  <th className="py-2.5 px-3">Concepto del Gasto</th>
                  <th className="py-2.5 px-3 text-right">Monto Sugerido ($)</th>
                  <th className="py-2.5 px-3 text-center">Eliminar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {config.defaultExpenses.map((exp, idx) => (
                  <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <label className="flex items-center space-x-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={exp.enabled !== false}
                          onChange={(e) => updateExpense(exp.id, 'enabled', e.target.checked)}
                          className="w-4 h-4 text-barolo-navy rounded border-slate-300 focus:ring-amber-400"
                        />
                        <span className={`text-[11px] font-semibold ${exp.enabled !== false ? 'text-emerald-700' : 'text-slate-400'}`}>
                          {exp.enabled !== false ? 'Activo' : 'Pausado'}
                        </span>
                      </label>
                    </td>

                    <td className="py-3 px-3">
                      <input
                        type="text"
                        value={exp.concept}
                        onChange={(e) => updateExpense(exp.id, 'concept', e.target.value)}
                        placeholder="Ej: Publicidad en Redes / Meta Ads"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-amber-400 focus:bg-white rounded-xl px-3 py-1.5 font-medium text-slate-800"
                      />
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <span className="text-slate-400 font-semibold">$</span>
                        <input
                          type="number"
                          value={exp.defaultAmount || ''}
                          onChange={(e) => updateExpense(exp.id, 'defaultAmount', Number(e.target.value))}
                          placeholder="0"
                          className="w-32 bg-slate-50 border border-slate-200 focus:border-amber-400 focus:bg-white rounded-xl px-3 py-1.5 font-medium text-slate-800 text-right"
                        />
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => removeExpense(exp.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Eliminar gasto habitual"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-2 flex justify-between items-center text-slate-500 text-xs">
            <span>Total de gastos configurados: <strong>{config.defaultExpenses.length}</strong></span>
            <button
              onClick={() => addExpense()}
              className="text-barolo-navy hover:text-amber-600 font-bold flex items-center space-x-1 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar otra fila de gasto</span>
            </button>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 2: INGRESOS PREDETERMINADOS (SPONSORS, CANON FOTO, ETC.) */}
      {/* ========================================================================= */}
      {activeTab === 'incomes' && (
        <div className="bg-white rounded-3xl p-6 shadow-luxury border border-slate-200 space-y-6">
          <div className="bg-gradient-to-r from-emerald-500/10 to-teal-100/30 border border-emerald-400/50 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-400/30 text-emerald-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                <DollarSign className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-emerald-950">Ingresos adicionales habituales</p>
                <p className="text-slate-600 mt-0.5 leading-relaxed">
                  Conceptos de ingresos que suelen repetirse en tus eventos como <strong>Sponsors</strong>, <strong>Merchandising</strong> o <strong>Canon Fotográfico</strong>.
                </p>
              </div>
            </div>

            <button
              onClick={() => addIncome()}
              className="flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-sm transition-all flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Nuevo Ingreso</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Estado</th>
                  <th className="py-2.5 px-3">Concepto de Ingreso</th>
                  <th className="py-2.5 px-3 text-right">Monto Sugerido ($)</th>
                  <th className="py-2.5 px-3 text-center">Eliminar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(config.defaultIncomes || []).map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <label className="flex items-center space-x-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={inc.enabled !== false}
                          onChange={(e) => updateIncome(inc.id, 'enabled', e.target.checked)}
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-400"
                        />
                        <span className={`text-[11px] font-semibold ${inc.enabled !== false ? 'text-emerald-700' : 'text-slate-400'}`}>
                          {inc.enabled !== false ? 'Activo' : 'Pausado'}
                        </span>
                      </label>
                    </td>

                    <td className="py-3 px-3">
                      <input
                        type="text"
                        value={inc.concept}
                        onChange={(e) => updateIncome(inc.id, 'concept', e.target.value)}
                        placeholder="Ej: Sponsor Santander / Merchandising"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-400 focus:bg-white rounded-xl px-3 py-1.5 font-medium text-slate-800"
                      />
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <span className="text-slate-400 font-semibold">$</span>
                        <input
                          type="number"
                          value={inc.defaultAmount || ''}
                          onChange={(e) => updateIncome(inc.id, 'defaultAmount', Number(e.target.value))}
                          placeholder="0"
                          className="w-32 bg-slate-50 border border-slate-200 focus:border-emerald-400 focus:bg-white rounded-xl px-3 py-1.5 font-medium text-slate-800 text-right"
                        />
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => removeIncome(inc.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Eliminar ingreso habitual"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA: CATÁLOGO MAESTRO DE INGRESOS */}
      {/* ========================================================================= */}
      {activeTab === 'incomeCatalog' && (
        <div className="bg-white rounded-3xl p-6 shadow-luxury border border-slate-200 space-y-6">
          <div className="bg-gradient-to-r from-emerald-500/10 to-teal-100/30 border border-emerald-400/50 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                <DollarSign className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-emerald-950 text-sm">Catálogo Maestro de Ingresos / Facturación</p>
                <p className="text-slate-600 mt-0.5 leading-relaxed">
                  Definí los conceptos de facturación adicionales (Alquiler de Espacio, Comisión Catering, Barra, Sponsors, etc.) que los operadores podrán tildar e incluir en cada cotización.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 flex-shrink-0">
              <button
                onClick={() => addCatalogIncome('locacion')}
                className="flex items-center space-x-1 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Locación / Salón</span>
              </button>
              <button
                onClick={() => addCatalogIncome('gastronomia')}
                className="flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Gastronomía / Barra</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Estado</th>
                  <th className="py-2.5 px-3">Concepto / Rubro de Ingreso</th>
                  <th className="py-2.5 px-3">Categoría</th>
                  <th className="py-2.5 px-3 text-right">Monto Sugerido ($)</th>
                  <th className="py-2.5 px-3 text-center">Eliminar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(config.masterIncomeCatalog || DEFAULT_MASTER_INCOME_CATALOG).map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <label className="flex items-center space-x-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={item.enabled !== false}
                          onChange={(e) => updateCatalogIncome(item.id, 'enabled', e.target.checked)}
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-400"
                        />
                        <span className={`text-[11px] font-semibold ${item.enabled !== false ? 'text-emerald-700' : 'text-slate-400'}`}>
                          {item.enabled !== false ? 'Activo' : 'Pausado'}
                        </span>
                      </label>
                    </td>

                    <td className="py-3 px-3">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateCatalogIncome(item.id, 'name', e.target.value)}
                        placeholder="Nombre del concepto..."
                        className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-400 focus:bg-white rounded-xl px-3 py-1.5 font-bold text-slate-800"
                      />
                    </td>

                    <td className="py-3 px-3">
                      <select
                        value={item.category || 'locacion'}
                        onChange={(e) => updateCatalogIncome(item.id, 'category', e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none"
                      >
                        <option value="locacion">🏛️ Locación / Salón</option>
                        <option value="gastronomia">🍽️ Gastronomía / Barra</option>
                        <option value="produccion">🎬 Canon Producción</option>
                        <option value="comercial">💎 Comercial / Sponsors</option>
                        <option value="varios">📦 Otros Ingresos</option>
                      </select>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <span className="text-slate-400 font-semibold">$</span>
                        <input
                          type="number"
                          value={item.defaultAmount || ''}
                          onChange={(e) => updateCatalogIncome(item.id, 'defaultAmount', Number(e.target.value))}
                          placeholder="0"
                          className="w-32 bg-slate-50 border border-slate-200 focus:border-emerald-400 focus:bg-white rounded-xl px-3 py-1.5 font-medium text-slate-800 text-right"
                        />
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => removeCatalogIncome(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Eliminar rubro del catálogo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA: CATÁLOGO MAESTRO DE COSTOS */}
      {/* ========================================================================= */}
      {activeTab === 'costs' && (
        <div className="bg-white rounded-3xl p-6 shadow-luxury border border-slate-200 space-y-6">
          <div className="bg-gradient-to-r from-rose-500/10 to-amber-100/30 border border-rose-400/50 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                <Tag className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-rose-950 text-sm">Catálogo Maestro de Costos del Evento</p>
                <p className="text-slate-600 mt-0.5 leading-relaxed">
                  Definí los rubros de costo del Productor y de Barolo que los operadores podrán seleccionar mediante el modal en la Calculadora.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 flex-shrink-0">
              <button
                onClick={() => addCatalogCost('productor')}
                className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Costo Productor</span>
              </button>
              <button
                onClick={() => addCatalogCost('barolo')}
                className="flex items-center space-x-1 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Costo Barolo</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Estado</th>
                  <th className="py-2.5 px-3">Rubro de Costo</th>
                  <th className="py-2.5 px-3">Responsable / Categoría</th>
                  <th className="py-2.5 px-3 text-right">Monto Sugerido ($)</th>
                  <th className="py-2.5 px-3 text-center">Eliminar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(config.masterCostCatalog || DEFAULT_MASTER_COST_CATALOG).map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <label className="flex items-center space-x-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={item.enabled !== false}
                          onChange={(e) => updateCatalogCost(item.id, 'enabled', e.target.checked)}
                          className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-400"
                        />
                        <span className={`text-[11px] font-semibold ${item.enabled !== false ? 'text-emerald-700' : 'text-slate-400'}`}>
                          {item.enabled !== false ? 'Activo' : 'Pausado'}
                        </span>
                      </label>
                    </td>

                    <td className="py-3 px-3">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateCatalogCost(item.id, 'name', e.target.value)}
                        placeholder="Nombre del costo..."
                        className="w-full bg-slate-50 border border-slate-200 focus:border-amber-400 focus:bg-white rounded-xl px-3 py-1.5 font-bold text-slate-800"
                      />
                    </td>

                    <td className="py-3 px-3">
                      <select
                        value={item.category || 'productor'}
                        onChange={(e) => updateCatalogCost(item.id, 'category', e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none"
                      >
                        <option value="productor">👤 Productor / Terceros</option>
                        <option value="barolo">🏛️ Palacio Barolo</option>
                      </select>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <span className="text-slate-400 font-semibold">$</span>
                        <input
                          type="number"
                          value={item.defaultAmount || ''}
                          onChange={(e) => updateCatalogCost(item.id, 'defaultAmount', Number(e.target.value))}
                          placeholder="0"
                          className="w-32 bg-slate-50 border border-slate-200 focus:border-amber-400 focus:bg-white rounded-xl px-3 py-1.5 font-medium text-slate-800 text-right"
                        />
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => removeCatalogCost(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Eliminar rubro del catálogo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      
      {/* ========================================================================= */}
      {/* PESTAÑA 3: SALONES & ESPACIOS */}
      {/* ========================================================================= */}
      {activeTab === 'venues' && (
        <div className="bg-white rounded-3xl p-6 shadow-luxury border border-slate-200 space-y-6">
          <div className="bg-gradient-to-r from-sky-500/10 to-indigo-100/30 border border-sky-400/50 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-xl bg-sky-400/30 text-sky-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Building className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-sky-950">Salones y Espacios del Palacio Barolo</p>
                <p className="text-slate-600 mt-0.5 leading-relaxed">
                  Espacios disponibles en el desplegable de la Calculadora Madre. Podés agregar nuevos espacios, editar capacidades o fijar alquileres sugeridos.
                </p>
              </div>
            </div>

            <button
              onClick={addVenue}
              className="flex items-center space-x-1 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-sm transition-all flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Nuevo Espacio</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {config.venues.map((ven) => (
              <div key={ven.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 relative group">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-barolo-gold-dark uppercase tracking-wider">
                    Espacio Barolo
                  </span>
                  <button
                    onClick={() => removeVenue(ven.id)}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors"
                    title="Eliminar salón"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Nombre del Espacio</label>
                  <input
                    type="text"
                    value={ven.name}
                    onChange={(e) => updateVenue(ven.id, 'name', e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-amber-400 rounded-xl px-3 py-1.5 font-bold text-slate-800 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block mb-1">Capacidad Sugerida</label>
                    <input
                      type="number"
                      value={ven.defaultCapacity || ''}
                      onChange={(e) => updateVenue(ven.id, 'defaultCapacity', Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 focus:border-amber-400 rounded-xl px-2.5 py-1.5 text-xs text-right font-medium"
                      placeholder="60"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 block mb-1">Alquiler Base ($)</label>
                    <input
                      type="number"
                      value={ven.defaultRental || ''}
                      onChange={(e) => updateVenue(ven.id, 'defaultRental', Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 focus:border-amber-400 rounded-xl px-2.5 py-1.5 text-xs text-right font-medium"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 4: CONVENIOS & CATEGORÍAS */}
      {/* ========================================================================= */}
      {activeTab === 'agreements' && (
        <div className="bg-white rounded-3xl p-6 shadow-luxury border border-slate-200 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tipos de Convenio */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center space-x-2">
                  <Handshake className="w-4 h-4 text-barolo-gold" />
                  <h3 className="font-serif font-bold text-sm text-barolo-navy">Tipos de Convenio / Acuerdos</h3>
                </div>
                <button
                  onClick={addAgreement}
                  className="text-xs font-bold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 transition-all flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Agregar</span>
                </button>
              </div>

              <div className="space-y-2">
                {config.agreementTypes.map((agr) => (
                  <div key={agr} className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                    <span className="font-semibold text-slate-800">{agr}</span>
                    <button
                      onClick={() => removeAgreement(agr)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors"
                      title="Quitar tipo de convenio"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Categorías de Evento */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center space-x-2">
                  <Tag className="w-4 h-4 text-barolo-gold" />
                  <h3 className="font-serif font-bold text-sm text-barolo-navy">Categorías / Tipos de Evento</h3>
                </div>
                <button
                  onClick={addEventType}
                  className="text-xs font-bold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 transition-all flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Agregar</span>
                </button>
              </div>

              <div className="space-y-2">
                {config.eventTypes.map((type) => (
                  <div key={type} className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                    <span className="font-semibold text-slate-800">{type}</span>
                    <button
                      onClick={() => removeEventType(type)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors"
                      title="Quitar tipo de evento"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Asistentes sugeridos por defecto */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Asistentes sugeridos al crear cotización:</span>
              <span className="text-[11px] text-slate-500">Cantidad con la que inicia el campo Asistentes</span>
            </div>
            <input
              type="number"
              value={config.defaultAttendees || 25}
              onChange={(e) => updateField({ defaultAttendees: Number(e.target.value) || 25 })}
              className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-right font-bold text-slate-800"
            />
          </div>

        </div>
      )}

      {/* Barra de Acciones Inferior */}
      <div className="bg-barolo-navy text-white rounded-3xl p-5 shadow-luxury flex flex-col sm:flex-row items-center justify-between gap-4 border border-barolo-gold/40">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold">
            PB
          </div>
          <div className="text-xs">
            <span className="font-bold text-amber-300 block">Plantilla Maestra Activa</span>
            <span className="text-slate-300">
              Tus cambios afectarán a todas las nuevas cotizaciones que se inicien a partir de ahora.
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <button
            onClick={handleSave}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-barolo-gold hover:from-amber-400 text-barolo-navy shadow-lg shadow-amber-500/20 transition-all active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Configuración</span>
          </button>

          <button
            onClick={onNavigateToCalculator}
            className="flex items-center space-x-1 px-4 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95"
          >
            <span>Ir a Calculadora</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  )
}
