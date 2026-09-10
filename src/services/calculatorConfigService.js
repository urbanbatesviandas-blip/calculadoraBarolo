import { supabase, isSupabaseConfigured } from './supabaseClient'

export const DEFAULT_MASTER_COST_CATALOG = [
  // Costos del Productor
  { id: 'cost_artistas', key: 'cost_artistas', name: 'Honorarios Artistas / Cachets', category: 'productor', defaultAmount: 0, enabled: true },
  { id: 'cost_tecnica', key: 'cost_tecnica', name: 'Honorarios Técnica / Sonido / Luces', category: 'productor', defaultAmount: 0, enabled: true },
  { id: 'cost_disertantes', key: 'cost_disertantes', name: 'Honorarios Disertantes / Speakers', category: 'productor', defaultAmount: 0, enabled: true },
  { id: 'cost_mobiliario', key: 'cost_mobiliario', name: 'Mobiliario, Vajilla & Ambientación', category: 'productor', defaultAmount: 0, enabled: true },
  { id: 'cost_rrhh', key: 'cost_rrhh', name: 'RRHH Salón, Personal & Seguridad', category: 'productor', defaultAmount: 0, enabled: true },

  // Costos del Palacio Barolo
  { id: 'cost_catering', key: 'cost_catering', name: 'Catering, Alimentos & Bebidas', category: 'barolo', defaultAmount: 0, enabled: true },
  { id: 'cost_limpieza', key: 'cost_limpieza', name: 'Limpieza Integral Post-Evento', category: 'barolo', defaultAmount: 0, enabled: true },
  { id: 'cost_seguros', key: 'cost_seguros', name: 'Seguros de Responsabilidad Civil', category: 'barolo', defaultAmount: 0, enabled: true },
  { id: 'cost_alquiler_espacio', key: 'cost_alquiler_espacio', name: 'Alquiler de Espacio Barolo (Costo)', category: 'barolo', defaultAmount: 0, enabled: true },
  { id: 'cost_gastronomicos', key: 'cost_gastronomicos', name: 'Costos Gastronómicos / Insumos Salón', category: 'barolo', defaultAmount: 0, enabled: true },
  { id: 'cost_marketing', key: 'cost_marketing', name: 'Marketing, Redes & Publicidad', category: 'barolo', defaultAmount: 0, enabled: true },
  { id: 'cost_sadaic', key: 'cost_sadaic', name: 'Derechos SADAIC / AADI CAPIF', category: 'barolo', defaultAmount: 0, enabled: true },
  { id: 'cost_otros_operativos', key: 'cost_otros_operativos', name: 'Otros Gastos Operativos', category: 'barolo', defaultAmount: 0, enabled: true }
]

export const DEFAULT_MASTER_INCOME_CATALOG = [
  { id: 'alquiler_espacio', key: 'alquiler_espacio', name: 'Alquiler del Espacio', category: 'locacion', defaultAmount: 0, enabled: true },
  { id: 'contratacion_salon', key: 'contratacion_salon', name: 'Contratación Salón Adicional', category: 'locacion', defaultAmount: 0, enabled: true },
  { id: 'comision_catering', key: 'comision_catering', name: 'Comisión por Catering', category: 'gastronomia', defaultAmount: 0, enabled: true },
  { id: 'barra_tragos', key: 'barra_tragos', name: 'Explotación / Canon Barra de Tragos', category: 'gastronomia', defaultAmount: 0, enabled: true },
  { id: 'canon_produccion', key: 'canon_produccion', name: 'Canon de Producción / Técnica Externa', category: 'produccion', defaultAmount: 0, enabled: true },
  { id: 'auspicios_sponsors', key: 'auspicios_sponsors', name: 'Auspicios, Patrocinios & Sponsors', category: 'comercial', defaultAmount: 0, enabled: true },
  { id: 'merchandising', key: 'merchandising', name: 'Venta de Merchandising / Souvenirs', category: 'comercial', defaultAmount: 0, enabled: true },
  { id: 'otros_ingresos', key: 'otros_ingresos', name: 'Otros Ingresos Operativos', category: 'varios', defaultAmount: 0, enabled: true }
]

export const DEFAULT_CALCULATOR_CONFIG = {
  masterCostCatalog: DEFAULT_MASTER_COST_CATALOG,
  masterIncomeCatalog: DEFAULT_MASTER_INCOME_CATALOG,
  defaultExpenses: [
    { id: 'exp-pub', concept: 'Publicidad & Pauta en Redes', defaultAmount: 0, enabled: true },
    { id: 'exp-seg', concept: 'Seguridad Especial / Control de Acceso', defaultAmount: 0, enabled: true }
  ],
  defaultIncomes: [
    { id: 'inc-spon', concept: 'Auspicio / Sponsor', defaultAmount: 0, enabled: false }
  ],
  venues: [
    { id: 'v-1', name: 'Espacio Barolo', defaultCapacity: 60, defaultRental: 0, enabled: true },
    { id: 'v-2', name: 'Salón 1923', defaultCapacity: 80, defaultRental: 0, enabled: true },
    { id: 'v-3', name: 'Terraza del piso 13', defaultCapacity: 40, defaultRental: 0, enabled: true },
    { id: 'v-4', name: 'EB + Cielos', defaultCapacity: 100, defaultRental: 0, enabled: true }
  ],
  agreementTypes: [
    '50% - 50%',
    '100% Barolo',
    '70% Barolo - 30% Productor',
    '30% Barolo - 70% Productor',
    'Solo Alquiler'
  ],
  eventTypes: [
    'Social',
    'Corporativo',
    'Desfile',
    'Show / Concierto',
    'Experiencia'
  ],
  defaultAttendees: 25,
  defaultDirectCosts: {
    artistas: 0,
    tecnica: 0,
    catering: 0,
    gastronomicos: 0
  },
  defaultIndirectCosts: {
    limpieza: 0,
    seguros: 0,
    rrhh: 0
  }
}

const LOCAL_STORAGE_KEY = 'barolo_calculator_config'

export const calculatorConfigService = {
  // Obtener la configuración activa actual
  getConfig() {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        // Combinar con defaults para garantizar retrocompatibilidad si hay claves nuevas
        return {
          ...DEFAULT_CALCULATOR_CONFIG,
          ...parsed,
          defaultExpenses: Array.isArray(parsed.defaultExpenses) && parsed.defaultExpenses.length > 0 
            ? parsed.defaultExpenses 
            : DEFAULT_CALCULATOR_CONFIG.defaultExpenses,
          venues: Array.isArray(parsed.venues) && parsed.venues.length > 0 
            ? parsed.venues 
            : DEFAULT_CALCULATOR_CONFIG.venues,
          agreementTypes: Array.isArray(parsed.agreementTypes) && parsed.agreementTypes.length > 0 
            ? parsed.agreementTypes 
            : DEFAULT_CALCULATOR_CONFIG.agreementTypes,
          eventTypes: Array.isArray(parsed.eventTypes) && parsed.eventTypes.length > 0 
            ? parsed.eventTypes 
            : DEFAULT_CALCULATOR_CONFIG.eventTypes,
          masterCostCatalog: Array.isArray(parsed.masterCostCatalog) && parsed.masterCostCatalog.length > 0
            ? parsed.masterCostCatalog
            : DEFAULT_CALCULATOR_CONFIG.masterCostCatalog,
          masterIncomeCatalog: Array.isArray(parsed.masterIncomeCatalog) && parsed.masterIncomeCatalog.length > 0
            ? parsed.masterIncomeCatalog
            : DEFAULT_CALCULATOR_CONFIG.masterIncomeCatalog
        }
      }
    } catch (e) {
      console.warn('Error reading calculator config from localStorage:', e)
    }
    return { ...DEFAULT_CALCULATOR_CONFIG }
  },

  // Guardar configuración (en localStorage y Supabase si está disponible)
  async saveConfig(newConfig) {
    try {
      const merged = {
        ...DEFAULT_CALCULATOR_CONFIG,
        ...newConfig,
        updatedAt: new Date().toISOString()
      }
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged))

      // Notificar a listeners locales (como CalculatorView)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('barolo-calc-config-updated', { detail: merged }))
      }

      // Sincronizar en Supabase si está disponible
      if (isSupabaseConfigured() && supabase) {
        try {
          await supabase
            .from('app_settings')
            .upsert({ key: 'calculator_config', value: merged, updated_at: merged.updatedAt }, { onConflict: 'key' })
        } catch (supaErr) {
          console.log('Supabase app_settings table sync info:', supaErr.message)
        }
      }

      return { success: true, config: merged }
    } catch (e) {
      console.error('Error saving calculator config:', e)
      return { success: false, error: e.message }
    }
  },

  // Sincronizar desde la nube si hay datos remotos
  async syncFromCloud() {
    if (!isSupabaseConfigured() || !supabase) return this.getConfig()
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'calculator_config')
        .maybeSingle()

      if (!error && data?.value) {
        const merged = { ...DEFAULT_CALCULATOR_CONFIG, ...data.value }
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged))
        return merged
      }
    } catch (err) {
      console.warn('Could not sync config from cloud:', err)
    }
    return this.getConfig()
  },

  // Restablecer valores de fábrica
  resetToDefaults() {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_CALCULATOR_CONFIG))
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('barolo-calc-config-updated', { detail: DEFAULT_CALCULATOR_CONFIG }))
      }
      return { success: true, config: DEFAULT_CALCULATOR_CONFIG }
    } catch (e) {
      return { success: false, error: e.message }
    }
  }
}
