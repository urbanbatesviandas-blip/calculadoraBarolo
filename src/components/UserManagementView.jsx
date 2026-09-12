import React, { useState, useEffect } from 'react'
import { 
  Users, UserPlus, Shield, ShieldCheck, Key, Lock, Eye, EyeOff, 
  Trash2, Edit, CheckCircle2, AlertCircle, RefreshCw, Sparkles, 
  UserCheck, AlertTriangle, X, Check
} from 'lucide-react'
import { userManagementService, ROLES, getRoleBadge } from '../services/userManagementService'

export default function UserManagementView({ currentUser, onBack }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState(null)

  // Formulario de creación
  const [newName, setNewName] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState('cargador')
  const [showNewPassword, setShowNewPassword] = useState(false)

  // Modal de edición
  const [editingUser, setEditingUser] = useState(null)
  const [editName, setEditName] = useState('')
  const [editUsername, setEditUsername] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [editRole, setEditRole] = useState('cargador')
  const [editIsActive, setEditIsActive] = useState(true)
  const [showEditPassword, setShowEditPassword] = useState(false)

  // Mostrar contraseñas en tabla
  const [revealedPasswords, setRevealedPasswords] = useState({})

  // Cargar usuarios
  const loadUsers = async () => {
    setLoading(true)
    try {
      const list = await userManagementService.getUsers()
      setUsers(list)
    } catch (err) {
      console.error('Error cargando usuarios:', err)
      showFeedback('error', 'Error al sincronizar lista de usuarios.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()

    const handleUpdate = () => {
      loadUsers()
    }
    window.addEventListener('barolo-users-updated', handleUpdate)
    return () => window.removeEventListener('barolo-users-updated', handleUpdate)
  }, [])

  const showFeedback = (type, text) => {
    setFeedback({ type, text })
    setTimeout(() => setFeedback(null), 4000)
  }

  // Generar contraseña aleatoria
  const generateRandomPassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789'
    let pass = 'pb'
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setNewPassword(pass)
    setShowNewPassword(true)
  }

  // Crear usuario
  const handleCreateUser = async (e) => {
    e.preventDefault()
    if (!newName.trim() || !newUsername.trim() || !newPassword.trim()) {
      showFeedback('error', 'Por favor completá nombre, usuario y contraseña.')
      return
    }

    setSaving(true)
    try {
      const res = await userManagementService.createUser({
        name: newName,
        username: newUsername,
        email: newEmail,
        password: newPassword,
        role: newRole
      })

      if (res.success) {
        showFeedback('success', `¡Usuario "${res.user.name}" creado con éxito! Ya puede ingresar con su contraseña.`)
        setNewName('')
        setNewUsername('')
        setNewEmail('')
        setNewPassword('')
        setNewRole('cargador')
        await loadUsers()
      } else {
        showFeedback('error', res.error || 'No se pudo crear el usuario.')
      }
    } catch (err) {
      showFeedback('error', 'Error inesperado al guardar usuario.')
    } finally {
      setSaving(false)
    }
  }

  // Iniciar edición de usuario
  const openEditModal = (u) => {
    setEditingUser(u)
    setEditName(u.name || '')
    setEditUsername(u.username || '')
    setEditEmail(u.email || '')
    setEditPassword(u.password || '')
    setEditRole(u.role || 'cargador')
    setEditIsActive(u.isActive !== false)
    setShowEditPassword(false)
  }

  // Guardar edición
  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!editingUser) return

    setSaving(true)
    try {
      const res = await userManagementService.updateUser(editingUser.id, {
        name: editName,
        username: editUsername,
        email: editEmail,
        password: editPassword,
        role: editRole,
        isActive: editIsActive
      })

      if (res.success) {
        showFeedback('success', `Usuario "${editName}" actualizado correctamente.`)
        setEditingUser(null)
        await loadUsers()
      } else {
        showFeedback('error', res.error || 'Error al actualizar usuario.')
      }
    } catch (err) {
      showFeedback('error', 'Ocurrió un error al guardar cambios.')
    } finally {
      setSaving(false)
    }
  }

  // Eliminar usuario
  const handleDeleteUser = async (u) => {
    if (u.id === currentUser?.id) {
      showFeedback('error', 'No podés eliminar tu propia cuenta en uso.')
      return
    }

    const confirmDelete = window.confirm(`¿Estás seguro de que querés eliminar al usuario "${u.name}" (@${u.username})? Esta acción no se puede deshacer.`)
    if (!confirmDelete) return

    try {
      const res = await userManagementService.deleteUser(u.id, currentUser?.id)
      if (res.success) {
        showFeedback('success', `Usuario "${u.name}" eliminado del sistema.`)
        await loadUsers()
      } else {
        showFeedback('error', res.error || 'No se pudo eliminar el usuario.')
      }
    } catch (err) {
      showFeedback('error', 'Error al eliminar usuario.')
    }
  }

  const togglePasswordVisibility = (userId) => {
    setRevealedPasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }))
  }

  // Métricas rápidas de roles
  const totalUsers = users.length
  const adminCount = users.filter(u => u.role === 'admin').length
  const modCount = users.filter(u => u.role === 'modificador').length
  const cargadorCount = users.filter(u => u.role === 'cargador').length
  const viewerCount = users.filter(u => u.role === 'viewer').length

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in space-y-8">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-barolo-navy via-slate-900 to-barolo-navy-dark text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-barolo-gold to-barolo-gold-dark flex items-center justify-center text-barolo-navy font-bold text-2xl shadow-lg border border-amber-300/40">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                Exclusivo Administrador
              </span>
            </div>
            <h1 className="font-serif font-bold text-2xl sm:text-3xl text-white mt-1">
              Gestión de Usuarios & Accesos
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1">
              Creá las cuentas para cada integrante de tu equipo, fijales su contraseña de ingreso y asignales la categoría de permisos correspondiente.
            </p>
          </div>
        </div>

        <button
          onClick={loadUsers}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-amber-300 border border-amber-400/30 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          <span>Sincronizar Usuarios</span>
        </button>
      </div>

      {/* Feedback Notification */}
      {feedback && (
        <div className={`p-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center space-x-3 shadow-md animate-fade-in ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 text-emerald-900 border border-emerald-300' 
            : 'bg-rose-50 text-rose-900 border border-rose-300'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-lg">👥</div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase">Total Cuentas</p>
            <p className="text-xl font-bold text-slate-900">{totalUsers}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-sm flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 font-bold text-lg">👑</div>
          <div>
            <p className="text-[11px] font-bold text-amber-800 uppercase">Administradores</p>
            <p className="text-xl font-bold text-amber-950">{adminCount}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-sky-200/80 shadow-sm flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-sky-100 text-sky-800 font-bold text-lg">✏️</div>
          <div>
            <p className="text-[11px] font-bold text-sky-800 uppercase">Modificadores</p>
            <p className="text-xl font-bold text-sky-950">{modCount}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 shadow-sm flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-lg">📝</div>
          <div>
            <p className="text-[11px] font-bold text-emerald-800 uppercase">Cargadores</p>
            <p className="text-xl font-bold text-emerald-950">{cargadorCount}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3 col-span-2 sm:col-span-1">
          <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-lg">👁️</div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase">Solo Lectura</p>
            <p className="text-xl font-bold text-slate-900">{viewerCount}</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Formulario de Creación + Lista de Usuarios */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* COL 1: Formulario "Crear Usuario" (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-7 shadow-lg border border-slate-200 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center space-x-2">
              <UserPlus className="w-5 h-5 text-amber-500" />
              <span>Crear Nuevo Usuario</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Ingresá los datos del nuevo miembro, su contraseña y su categoría de acceso.
            </p>
          </div>

          <form onSubmit={handleCreateUser} className="space-y-4">
            
            {/* Nombre y Apellido */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nombre y Apellido *
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Ej: Coordinador/a de Eventos"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
              />
            </div>

            {/* Nombre de Usuario / Login */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Usuario / Login *
                </label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  placeholder="ej: operador1"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="usuario@palaciobarolo.com.ar"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Contraseña asignada por el Administrador */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Contraseña Asignada *
                </label>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="text-[11px] text-amber-800 hover:text-amber-900 font-semibold flex items-center space-x-1 hover:underline"
                >
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>Generar sugerida</span>
                </button>
              </div>

              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Fijá la clave con la que ingresará"
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono font-bold focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                El usuario utilizará esta contraseña exacta para acceder al sistema.
              </p>
            </div>

            {/* Selector de Categoría / Rol */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Categoría de Acceso (Escalón de Permisos) *
              </label>

              <div className="grid grid-cols-1 gap-2.5">
                {Object.values(ROLES).map(r => {
                  const isSelected = newRole === r.id
                  return (
                    <div
                      key={r.id}
                      onClick={() => setNewRole(r.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start space-x-3 ${
                        isSelected 
                          ? 'border-barolo-gold bg-amber-50/70 shadow-sm ring-2 ring-amber-400/30' 
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-xl mt-0.5 select-none">{r.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-900">{r.name}</h4>
                          {isSelected && <Check className="w-4 h-4 text-amber-700 font-bold" />}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                          {r.description}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Botón Guardar */}
            <button
              type="submit"
              disabled={saving}
              className="w-full mt-4 py-3 bg-barolo-navy hover:bg-barolo-navy-light text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer active:scale-95"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 text-amber-300" />
                  <span>Crear y Habilitar Usuario</span>
                </>
              )}
            </button>

          </form>
        </div>

        {/* COL 2: Tabla de Usuarios Existentes (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-7 shadow-lg border border-slate-200 space-y-5">
          
          <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>Usuarios Registrados ({users.length})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Cuentas activas con sus contraseñas y permisos en el Palacio Barolo.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-barolo-navy border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-slate-500 font-medium">Cargando usuarios...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No hay usuarios registrados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-3">Usuario / Nombre</th>
                    <th className="py-3 px-3">Categoría</th>
                    <th className="py-3 px-3">Contraseña</th>
                    <th className="py-3 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {users.map(u => {
                    const badge = getRoleBadge(u.role)
                    const isSelf = u.id === currentUser?.id
                    const isPassRevealed = !!revealedPasswords[u.id]

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                        
                        {/* Usuario y Nombre */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-full bg-barolo-navy text-amber-300 font-bold text-xs flex items-center justify-center border border-amber-300/40 select-none">
                              {u.name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                                <span>{u.name}</span>
                                {isSelf && (
                                  <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full font-bold">
                                    Vos
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                @{u.username} • {u.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Categoría / Rol */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span className={`inline-flex items-center text-[10px] px-2.5 py-1 rounded-full border ${badge.badgeClass}`}>
                            <span className="mr-1">{badge.icon}</span>
                            <span>{badge.title}</span>
                          </span>
                        </td>

                        {/* Contraseña asignada */}
                        <td className="py-3.5 px-3 whitespace-nowrap font-mono text-xs">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                              {isPassRevealed ? u.password : '••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(u.id)}
                              className="text-slate-400 hover:text-slate-700 p-1"
                              title={isPassRevealed ? "Ocultar contraseña" : "Ver contraseña asignada"}
                            >
                              {isPassRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>

                        {/* Acciones */}
                        <td className="py-3.5 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => openEditModal(u)}
                              className="p-1.5 text-slate-400 hover:text-barolo-navy hover:bg-slate-100 rounded-lg transition-colors"
                              title="Editar usuario o cambiar contraseña"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            {!isSelf && (
                              <button
                                onClick={() => handleDeleteUser(u)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Eliminar cuenta de usuario"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>

                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>

      </div>

      {/* Modal de Edición de Usuario */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            
            <div className="bg-barolo-navy text-white p-5 border-b border-barolo-gold/40 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Edit className="w-5 h-5 text-amber-400" />
                <h3 className="font-serif font-bold text-base text-white">
                  Editar Usuario: {editingUser.name}
                </h3>
              </div>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs">
              
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre y Apellido</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Usuario / Login</label>
                  <input
                    type="text"
                    required
                    value={editUsername}
                    onChange={e => setEditUsername(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Modificar Contraseña */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nueva Contraseña (o mantener actual)</label>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    required
                    value={editPassword}
                    onChange={e => setEditPassword(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Categoría / Rol */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Categoría de Acceso</label>
                <select
                  value={editRole}
                  onChange={e => setEditRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                >
                  <option value="admin">👑 Administrador (Acceso Total)</option>
                  <option value="modificador">✏️ Modificador (Gestión Comercial)</option>
                  <option value="cargador">📝 Cargador de Datos (Presupuestos)</option>
                  <option value="viewer">👁️ Solo Lectura (Auditoría & Consulta)</option>
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={editIsActive}
                  onChange={e => setEditIsActive(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded border-slate-300"
                />
                <label htmlFor="editIsActive" className="font-bold text-slate-700 cursor-pointer">
                  Cuenta Habilitada (Permitir inicio de sesión)
                </label>
              </div>

              <div className="border-t border-slate-200 pt-4 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-barolo-navy hover:bg-barolo-navy-light text-white font-bold rounded-xl shadow-md transition-colors"
                >
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  )
}
