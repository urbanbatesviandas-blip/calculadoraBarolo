import { 
  userManagementService, 
  ROLES, 
  getRoleBadge, 
  DEFAULT_ADMIN_USER 
} from './userManagementService'

export { ROLES, getRoleBadge, DEFAULT_ADMIN_USER }

const AUTH_STORAGE_KEY = 'barolo_auth_session'
let authListeners = []

export const authService = {
  // Obtener usuario actualmente conectado (sesión activa)
  getCurrentUser() {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY)
      if (saved) {
        const u = JSON.parse(saved)
        if (u && u.id && u.role) {
          u.roleBadge = getRoleBadge(u.role)
          return u
        }
      }
    } catch (e) {
      console.warn('Error leyendo sesión activa:', e)
    }
    return null
  },

  // Establecer sesión activa
  setCurrentUser(user) {
    try {
      if (user) {
        const userWithBadge = { ...user, roleBadge: getRoleBadge(user.role) }
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userWithBadge))
        authListeners.forEach(fn => {
          try { fn(userWithBadge) } catch (err) { console.error('Auth listener error:', err) }
        })
        return userWithBadge
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY)
        authListeners.forEach(fn => {
          try { fn(null) } catch (err) { console.error('Auth listener error:', err) }
        })
        return null
      }
    } catch (e) {
      console.error('Error guardando sesión de usuario:', e)
      return null
    }
  },

  // Suscribirse a cambios de sesión (login / logout)
  onAuthStateChanged(cb) {
    if (typeof cb === 'function') {
      authListeners.push(cb)
    }
    return () => {
      authListeners = authListeners.filter(fn => fn !== cb)
    }
  },

  // Iniciar sesión con usuario o correo y la contraseña asignada por el Administrador
  async login(identifier, password) {
    const res = await userManagementService.authenticate(identifier, password)
    if (res.success && res.user) {
      this.setCurrentUser(res.user)
      return { success: true, user: res.user }
    }
    return { success: false, error: res.error || 'Credenciales inválidas.' }
  },

  // Cerrar sesión
  async logout() {
    this.setCurrentUser(null)
    return null
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
  },

  isAdmin(user) {
    if (!user) return false
    return user.role === 'admin'
  },

  canViewSensitiveData(itemOrEvent, user) {
    if (!user) return false
    // El administrador tiene visibilidad total de auditoría y dirección
    if (user.role === 'admin') return true
    if (!itemOrEvent) return true

    // Coincidencia por autor específico del ítem
    if (itemOrEvent.author_id && itemOrEvent.author_id === user.id) return true
    if (itemOrEvent.author_email && user.email && itemOrEvent.author_email.toLowerCase() === user.email.toLowerCase()) return true
    if (itemOrEvent.author_username && user.username && itemOrEvent.author_username.toLowerCase() === user.username.toLowerCase()) return true

    // Coincidencia por creador general del evento
    if (itemOrEvent.created_by_user_id && itemOrEvent.created_by_user_id === user.id) return true
    if (itemOrEvent.created_by_email && user.email && itemOrEvent.created_by_email.toLowerCase() === user.email.toLowerCase()) return true
    if (typeof itemOrEvent.created_by === 'string' && user.email && itemOrEvent.created_by.toLowerCase() === user.email.toLowerCase()) return true

    return false
  }
}

// Named exports para conveniencia en componentes
export const canCreateEvent = (user) => authService.canCreateEvent(user)
export const canEditEvent = (user, event) => authService.canEditEvent(user, event)
export const canDeleteEvent = (user) => authService.canDeleteEvent(user)
export const canChangeStatus = (user, targetStatus) => authService.canChangeStatus(user, targetStatus)
export const canManageUsers = (user) => authService.canManageUsers(user)
export const isAdmin = (user) => authService.isAdmin(user)
export const canViewSensitiveData = (itemOrEvent, user) => authService.canViewSensitiveData(itemOrEvent, user)
