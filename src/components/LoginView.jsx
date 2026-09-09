import React, { useState } from 'react'
import { Lock, User, Eye, EyeOff, ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react'
import { authService } from '../services/authService'

export default function LoginView({ onLoginSuccess }) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!identifier.trim() || !password.trim()) {
      setErrorMsg('Por favor completá usuario y contraseña.')
      return
    }

    setLoading(true)
    setErrorMsg(null)

    try {
      const res = await authService.login(identifier, password)
      if (res.success && res.user) {
        if (onLoginSuccess) {
          onLoginSuccess(res.user)
        }
      } else {
        setErrorMsg(res.error || 'Credenciales incorrectas.')
      }
    } catch (err) {
      console.error('Login error:', err)
      setErrorMsg('Ocurrió un error al verificar credenciales.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans">
      {/* Background Decorative Lighting */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-barolo-navy-light/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        
        {/* Crest & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-barolo-gold to-barolo-gold-dark shadow-2xl border-2 border-amber-300/50 mb-4 text-barolo-navy font-bold text-3xl tracking-widest select-none transform hover:scale-105 transition-transform duration-300">
            PB
          </div>
          <h1 className="font-serif font-bold text-2xl sm:text-3xl text-amber-200 tracking-wider uppercase mb-1">
            Palacio Barolo
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 tracking-wide">
            Sistema Integral de Eventos, Cotizaciones & Rentabilidad
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-slate-900/90 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          
          <div className="mb-6 border-b border-slate-800 pb-4">
            <h2 className="text-lg font-bold text-white flex items-center">
              <ShieldCheck className="w-5 h-5 text-amber-400 mr-2" />
              Ingreso al Sistema
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Ingresá con tu usuario y contraseña asignada por el Administrador.
            </p>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="mb-5 bg-rose-950/80 border border-rose-500/50 rounded-2xl p-3.5 text-xs text-rose-200 flex items-start space-x-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                Usuario, Nombre o Correo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  autoFocus
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="ej: admin, pato o tu correo"
                  className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all placeholder:text-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-barolo-gold via-amber-400 to-barolo-gold-dark hover:from-amber-400 hover:to-amber-500 text-barolo-navy font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 active:scale-[0.99] transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-barolo-navy border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Ingresar al Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-slate-500 mt-6">
          Palacio Barolo • Av. de Mayo 1370, CABA • Cloud Security v2.0
        </p>

      </div>
    </div>
  )
}
