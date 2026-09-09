import { supabase, isSupabaseConfigured } from './supabaseClient'

export const DEFAULT_CALCULATOR_CONFIG = {
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
            : DEFAULT_CALCULATOR_CONFIG.eventTypes
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
