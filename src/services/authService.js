import { supabase, isSupabaseConfigured } from './supabaseClient'

export const ROLES = {
  admin: {
    id: 'admin',
    name: 'Administrador',
    shortName: 'Admin',
    badgeClass: 'bg-amber-400 text-barolo-navy font-bold border-amber-500/40',
    description: 'Acceso total: gestión completa de eventos, estados, usuarios y configuración.'
  },
  modificador: {
    id: 'modificador',
    name: 'Modificador',
    shortName: 'Modificador',
    badgeClass: 'bg-sky-500 text-white font-bold border-sky-600/40',
    description: 'Edición comercial: crear y retocar eventos/cotizaciones y reservar fechas. Sin permisos de eliminación.'
  },
  cargador: {
    id: 'cargador',
    name: 'Cargador de Datos',
    shortName: 'Cargador',
    badgeClass: 'bg-emerald-600 text-white font-bold border-emerald-700/40',
    description: 'Carga inicial: puede generar nuevas cotizaciones y calcular presupuestos. Sin confirmación de contratos.'
  },
  viewer: {
    id: 'viewer',
    name: 'Solo Lectura',
    shortName: 'Lector',
    badgeClass: 'bg-slate-500 text-white font-semibold border-slate-600/40',
    description: 'Auditoría y consulta: acceso a visualizaciones, filtros, comparativas y descargas Excel sin edición.'
  }
}

export const PRESET_USERS = [
  {
    id: 'usr-admin',
    name: 'Ignacio Barolo (Director)',
    email: 'admin@palaciobarolo.com.ar',
    role: 'admin'
  },
  {
    id: 'usr-mod',
    name: 'Camila Paz (Coordinadora Comercial)',
    email: 'comercial@palaciobarolo.com.ar',
    role: 'modificador'
  },
  {
    id: 'usr-cargador',
    name: 'Lucas Rossi (Operador de Carga)',
    email: 'carga@palaciobarolo.com.ar',
    role: 'cargador'
  },
  {
    id: 'usr-viewer',
    name: 'Auditoría Externa (Solo Lectura)',
    email: 'auditor@palaciobarolo.com.ar',
    role: 'viewer'
  }
]

export const getRoleBadge = (roleId) => {
  const r = ROLES[roleId] || ROLES.viewer
  const icons = {
    admin: '👑',
    modificador: '✏️',
    cargador: '📝',
    viewer: '👁️'
  }
  return {
    title: r.name,
    shortName: r.shortName,
    icon: icons[roleId] || '👤',
    badgeClass: r.badgeClass,
    description: r.description
  }
}

const AUTH_STORAGE_KEY = 'barolo_auth_user'
let authListeners = []

export const authService = {
  getCurrentUser() {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY)
      if (saved) {
        const u = JSON.parse(saved)
        u.roleBadge = getRoleBadge(u.role)
        return u
      }
    } catch (e) {
      console.warn('Error reading auth user from localStorage:', e)
    }
    const defaultUser = { ...PRESET_USERS[0], roleBadge: getRoleBadge(PRESET_USERS[0].role) }
    this.setCurrentUser(defaultUser)
    return defaultUser
  },

  setCurrentUser(user) {
    try {
      const userWithBadge = { ...user, roleBadge: getRoleBadge(user.role) }
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userWithBadge))
      authListeners.forEach(fn => {
        try { fn(userWithBadge) } catch (err) { console.error('Auth listener error:', err) }
      })
    } catch (e) {
      console.error('Error saving user to localStorage:', e)
    }
  },

  onAuthStateChanged(cb) {
    if (typeof cb === 'function') {
      authListeners.push(cb)
    }
    return () => {
      authListeners = authListeners.filter(fn => fn !== cb)
    }
  },

  // Alternar a un perfil preconfigurado con un clic
  switchUser(presetId) {
    const found = PRESET_USERS.find(u => u.id === presetId || u.role === presetId)
    if (found) {
      this.setCurrentUser(found)
      return found
    }
    return this.getCurrentUser()
  },

  // Inicio de sesión por Email / Contraseña
  async login(email, password) {
    const trimmedEmail = (email || '').trim().toLowerCase()
    
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password
        })
        if (!error && data?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single()

          const userObj = {
            id: data.user.id,
            email: data.user.email,
            name: profile?.full_name || data.user.email.split('@')[0],
            role: profile?.role || 'viewer'
          }
          this.setCurrentUser(userObj)
          return { success: true, user: userObj }
        }
      } catch (err) {
        console.warn('Supabase auth attempt failed, testing preset match:', err.message)
      }
    }

    const match = PRESET_USERS.find(u => u.email.toLowerCase() === trimmedEmail)
    if (match) {
      this.setCurrentUser(match)
      return { success: true, user: match }
    }

    const newUser = {
      id: 'usr-' + Date.now(),
      email: trimmedEmail,
      name: trimmedEmail.split('@')[0],
      role: 'cargador'
    }
    this.setCurrentUser(newUser)
    return { success: true, user: newUser }
  },

  async register(email, password, fullName, role = 'cargador') {
    const trimmedEmail = (email || '').trim().toLowerCase()
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: { full_name: fullName, role }
          }
        })
        if (error) throw error
        const userObj = {
          id: data.user?.id || 'usr-' + Date.now(),
          email: trimmedEmail,
          name: fullName || trimmedEmail.split('@')[0],
          role
        }
        this.setCurrentUser(userObj)
        return { success: true, user: userObj }
      } catch (err) {
        return { success: false, error: err.message }
      }
    }

    const newUser = {
      id: 'usr-' + Date.now(),
      email: trimmedEmail,
      name: fullName || trimmedEmail.split('@')[0],
      role
    }
    this.setCurrentUser(newUser)
    return { success: true, user: newUser }
  },

  async logout() {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.auth.signOut()
      } catch (e) {}
    }
    const viewerUser = PRESET_USERS.find(u => u.role === 'viewer')
    this.setCurrentUser(viewerUser)
    return viewerUser
  },

  // =========================================================================
  // SISTEMA DE PERMISOS GRANULARES POR ROL
  // =========================================================================
  canCreateEvent(user) {
    if (!user) return false
    return ['admin', 'modificador', 'cargador'].includes(user.role)
  },

  canEditEvent(user, event = null) {
    if (!user) return false
    if (user.role === 'admin' || user.role === 'modificador') return true
    if (user.role === 'cargador') {
      return !event || event.status === 'cotizado'
    }
    return false
  },

  canDeleteEvent(user) {
    if (!user) return false
    return user.role === 'admin'
  },

  canChangeStatus(user, targetStatus) {
    if (!user) return false
    if (user.role === 'admin') return true
    if (user.role === 'modificador') return true
    if (user.role === 'cargador') {
      return ['cotizado', 'reservado'].includes(targetStatus)
    }
    return false
  },

  canManageUsers(user) {
    if (!user) return false
    return user.role === 'admin'
  }
}

// Named exports para conveniencia
export const canCreateEvent = (user) => authService.canCreateEvent(user)
export const canEditEvent = (user, event) => authService.canEditEvent(user, event)
export const canDeleteEvent = (user) => authService.canDeleteEvent(user)
export const canChangeStatus = (user, targetStatus) => authService.canChangeStatus(user, targetStatus)
export const canManageUsers = (user) => authService.canManageUsers(user)

