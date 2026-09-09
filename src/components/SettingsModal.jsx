import React, { useState } from 'react'
import { X, Cloud, Key, Database, CheckCircle2, RotateCcw, Copy, ExternalLink, ShieldCheck, AlertCircle } from 'lucide-react'
import { getSupabaseConfig, saveSupabaseConfig, isSupabaseConfigured } from '../services/supabaseClient'

export default function SettingsModal({ onClose, onConfigSaved, onResetData }) {
  const current = getSupabaseConfig()
  const [url, setUrl] = useState(current.url || '')
  const [key, setKey] = useState(current.key || '')
  const [saveStatus, setSaveStatus] = useState(null)
  const isConnected = isSupabaseConfigured()

  const handleSave = (e) => {
    e.preventDefault()
    const success = saveSupabaseConfig(url, key)
    if (success) {
      setSaveStatus('success')
      setTimeout(() => {
        onConfigSaved()
        onClose()
      }, 1000)
    } else {
      setSaveStatus('error')
    }
  }

  const handleDisconnect = () => {
    saveSupabaseConfig('', '')
    setUrl('')
    setKey('')
    onConfigSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="bg-barolo-navy text-white p-5 border-b border-barolo-gold/40 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-400/20 text-amber-300">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-white">Conexión a Supabase (Nube)</h3>
              <p className="text-xs text-slate-300">Configurá tu base de datos PostgreSQL y usuarios en línea</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 space-y-5 text-xs text-slate-700">
          
          {/* Current Status Pill */}
          <div className={`p-3 rounded-2xl border flex items-center justify-between ${
            isConnected 
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
              : 'bg-amber-50 border-amber-300 text-amber-900'
          }`}>
            <div className="flex items-center space-x-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
              <span className="font-bold">
                {isConnected ? 'Conectado a la Base de Datos Supabase' : 'Modo Local / Demo Activo (81 eventos cargados)'}
              </span>
            </div>
            {isConnected && (
              <button
                type="button"
                onClick={handleDisconnect}
                className="text-[11px] text-rose-600 hover:underline font-semibold"
              >
                Desconectar
              </button>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="font-bold text-slate-800 block mb-1">Supabase Project URL</label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-800 block mb-1">Supabase Anon Key (Public)</label>
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-amber-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Guide box for creating Supabase project */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
            <span className="font-bold text-barolo-navy block flex items-center">
              <Database className="w-4 h-4 mr-1 text-barolo-gold" />
              ¿Cómo configurar Supabase en 1 minuto?
            </span>
            <ol className="list-decimal list-inside space-y-1 text-slate-600 text-[11px]">
              <li>Creá un proyecto gratis en <strong>supabase.com</strong>.</li>
              <li>Andá a <strong>SQL Editor</strong> y pegá el contenido de <code className="bg-slate-200 px-1 rounded">supabase/schema.sql</code> para crear las tablas con RLS.</li>
              <li>Pegá el contenido de <code className="bg-slate-200 px-1 rounded">supabase/seed.sql</code> para importar los 75 eventos históricos.</li>
              <li>Copiá la <strong>URL</strong> y la <strong>anon key</strong> desde <em>Project Settings &gt; API</em> y pegalas acá arriba.</li>
            </ol>
          </div>

          {saveStatus === 'success' && (
            <div className="bg-emerald-50 text-emerald-800 p-2.5 rounded-xl text-center font-bold flex items-center justify-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>¡Conexión guardada con éxito!</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  onConfigSaved()
                  onClose()
                }}
                className="text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-xl flex items-center space-x-1 font-semibold transition-colors"
                title="Descargar eventos frescos de Supabase y actualizar este dispositivo"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Forzar Sync Nube</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm('¿Restablecer los datos locales a los 81 eventos iniciales del Barolo?')) {
                    onResetData()
                    onClose()
                  }
                }}
                className="text-[11px] text-slate-400 hover:text-slate-700 flex items-center space-x-1 underline"
              >
                <span>Reset Demo</span>
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl font-bold bg-barolo-navy hover:bg-barolo-navy-light text-white shadow-md transition-colors"
              >
                Guardar Conexión
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  )
}
