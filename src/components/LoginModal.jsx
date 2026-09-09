import React, { useState } from 'react'
import { X, ShieldCheck, UserCheck, Lock, Mail, LogOut, CheckCircle2, User, Key, Info } from 'lucide-react'
import { authService, ROLES, PRESET_USERS } from '../services/authService'

export default function LoginModal({ currentUser, onClose, onUserChanged, onUserChange, isOpen }) {
  if (isOpen !== undefined && !isOpen) return null

  const notifyChange = (u) => {
    if (onUserChanged) onUserChanged(u)
    if (onUserChange) onUserChange(u)
  }

  const [activeTab, setActiveTab] = useState('roles') // 'roles' | 'login'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleQuickSwitch = (presetId) => {
    const updated = authService.switchUser(presetId)
    notifyChange(updated)
    setFeedback({ type: 'success', text: `Perfil cambiado a: ${updated.name} (${ROLES[updated.role]?.name || ''})` })
    setTimeout(() => {
      onClose()
    }, 900)
  }

  const handleAuthSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      setFeedback({ type: 'error', text: 'Por favor completá email y contraseña.' })
      return
    }

    setLoading(true)
    setFeedback(null)

    try {
      if (isRegisterMode) {
        const res = await authService.register(email, password, fullName || email.split('@')[0], 'cargador')
        if (res.success) {
          notifyChange(res.user)
          setFeedback({ type: 'success', text: '¡Cuenta creada y conectada exitosamente!' })
          setTimeout(() => onClose(), 1000)
        } else {
          setFeedback({ type: 'error', text: res.error || 'Error al registrar usuario' })
        }
      } else {
        const res = await authService.login(email, password)
        if (res.success) {
          notifyChange(res.user)
          setFeedback({ type: 'success', text: `¡Bienvenido/a, ${res.user.name}!` })
          setTimeout(() => onClose(), 1000)
        } else {
          setFeedback({ type: 'error', text: res.error || 'Credenciales inválidas' })
        }
      }
    } catch (err) {
      setFeedback({ type: 'error', text: 'Ocurrió un error inesperado.' })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    const fallback = await authService.logout()
    notifyChange(fallback)
    setFeedback({ type: 'info', text: 'Sesión cerrada. Pasaste al modo Solo Lectura.' })
    setTimeout(() => onClose(), 900)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-barolo-navy text-white p-5 border-b border-barolo-gold/40 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-barolo-gold to-barolo-gold-dark flex items-center justify-center text-barolo-navy font-bold text-lg shadow-md">
              PB
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-white">Gestión de Usuarios & Roles</h3>
              <p className="text-xs text-slate-300">Control de permisos, escalones y acceso al sistema</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active User Banner */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-barolo-navy text-amber-300 flex items-center justify-center font-bold text-xs border border-amber-300/40">
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-900">{currentUser?.name || 'Usuario Activo'}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${ROLES[currentUser?.role]?.badgeClass || 'bg-slate-200 text-slate-700'}`}>
                  {ROLES[currentUser?.role]?.name || currentUser?.role}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">{currentUser?.email || 'Sin correo asociado'}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center space-x-1 px-2.5 py-1 rounded-lg hover:bg-rose-50 transition-colors"
            title="Cerrar sesión y quedar como Solo Lectura"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>

        {/* Tabs: Conmutador de Roles vs Formulario Login */}
        <div className="flex border-b border-slate-200 px-6 pt-3 bg-white flex-shrink-0">
          <button
            onClick={() => { setActiveTab('roles'); setFeedback(null) }}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === 'roles'
                ? 'border-barolo-gold text-barolo-navy'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Escalones de Roles (Cambio Rápido)</span>
          </button>
          <button
            onClick={() => { setActiveTab('login'); setFeedback(null) }}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === 'login'
                ? 'border-barolo-gold text-barolo-navy'
                : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Iniciar Sesión / Registro</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className={`mx-6 mt-4 p-3 rounded-xl text-xs font-bold flex items-center space-x-2 ${
            feedback.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-300' :
            feedback.type === 'error' ? 'bg-rose-50 text-rose-900 border border-rose-300' :
            'bg-sky-50 text-sky-900 border border-sky-300'
          }`}>
            <Info className="w-4 h-4 flex-shrink-0" />
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs text-slate-700">
          
          {/* TAB 1: ROLES & PRESETS */}
          {activeTab === 'roles' && (
            <div className="space-y-4">
              <p className="text-slate-500 text-xs">
                Seleccioná cualquiera de los <strong>4 escalones de usuarios</strong> para alternar de perfil inmediatamente y probar las restricciones y permisos de cada uno:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {PRESET_USERS.map(preset => {
                  const roleMeta = ROLES[preset.role]
                  const isActive = currentUser?.role === preset.role

                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleQuickSwitch(preset.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 hover:shadow-md ${
                        isActive
                          ? 'border-barolo-gold bg-amber-50/50 shadow-md ring-2 ring-amber-400/40'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-[10px] px-2.5 py-0.5 rounded-full border ${roleMeta?.badgeClass || ''}`}>
                            {roleMeta?.name}
                          </span>
                          {isActive && (
                            <span className="text-[11px] font-bold text-amber-800 flex items-center">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Activo
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm">{preset.name}</h4>
                        <p className="text-[11px] text-slate-400">{preset.email}</p>
                      </div>

                      <p className="text-[11px] text-slate-600 bg-slate-100/70 p-2.5 rounded-xl border border-slate-200/60 leading-relaxed">
                        {roleMeta?.description}
                      </p>

                      <button
                        type="button"
                        className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1 ${
                          isActive
                            ? 'bg-barolo-navy text-white shadow-sm'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <UserCheck className="w-3.5 h-3.5 mr-1" />
                        <span>{isActive ? 'Perfil Actual' : `Cambiar a ${roleMeta?.shortName || ''}`}</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TAB 2: EMAIL / PASSWORD */}
          {activeTab === 'login' && (
            <form onSubmit={handleAuthSubmit} className="max-w-md mx-auto space-y-4 py-2">
              <div className="text-center space-y-1 mb-4">
                <h4 className="font-bold text-slate-900 text-sm">
                  {isRegisterMode ? 'Crear Nuevo Usuario en Supabase' : 'Iniciar Sesión con Correo'}
                </h4>
                <p className="text-xs text-slate-500">
                  {isRegisterMode ? 'Completá tus datos para registrar una nueva cuenta' : 'Ingresá tus credenciales para acceder'}
                </p>
              </div>

              {isRegisterMode && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nombre Completo</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="Ej: Martín Barolo"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none font-medium"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="usuario@palaciobarolo.com.ar"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Contraseña</label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-barolo-navy hover:bg-barolo-navy-light text-white py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                {loading ? (
                  <span>Procesando...</span>
                ) : (
                  <span>{isRegisterMode ? 'Registrarme e Iniciar Sesión' : 'Iniciar Sesión'}</span>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setIsRegisterMode(!isRegisterMode); setFeedback(null) }}
                  className="text-xs text-amber-800 hover:underline font-semibold"
                >
                  {isRegisterMode ? '¿Ya tenés cuenta? Iniciar Sesión' : '¿No tenés cuenta? Crear usuario nuevo'}
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-end flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  )
}
