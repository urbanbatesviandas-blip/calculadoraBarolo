import { createClient } from '@supabase/supabase-js'

const DEFAULT_URL = 'https://lzzeoqrwrepscujqbnzg.supabase.co'
const DEFAULT_KEY = 'sb_publishable_ceRXMcmGppWFkbGuz3pXOg_yaoym6b6'

// Get credentials from env or localStorage or project default
const getSavedConfig = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  
  if (envUrl && envKey && !envUrl.includes('your-project')) {
    return { url: envUrl, key: envKey, source: 'env' }
  }
  
  try {
    const localUrl = localStorage.getItem('barolo_supabase_url')
    const localKey = localStorage.getItem('barolo_supabase_key')
    if (localUrl && localKey) {
      return { url: localUrl, key: localKey, source: 'localStorage' }
    }
  } catch (e) {
    console.warn('LocalStorage not available', e)
  }
  
  return { url: DEFAULT_URL, key: DEFAULT_KEY, source: 'default' }
}

let currentConfig = getSavedConfig()
export let supabase = (currentConfig.url && currentConfig.key) 
  ? createClient(currentConfig.url, currentConfig.key) 
  : null

export const isSupabaseConfigured = () => !!supabase

export const saveSupabaseConfig = (url, key) => {
  if (!url || !key) {
    localStorage.removeItem('barolo_supabase_url')
    localStorage.removeItem('barolo_supabase_key')
    supabase = null
    return false
  }
  
  localStorage.setItem('barolo_supabase_url', url.trim())
  localStorage.setItem('barolo_supabase_key', key.trim())
  
  try {
    supabase = createClient(url.trim(), key.trim())
    return true
  } catch (err) {
    console.error('Error creating Supabase client:', err)
    return false
  }
}

export const getSupabaseConfig = () => getSavedConfig()
