import { supabase, isSupabaseConfigured } from './supabaseClient'

export const ROLES = {
  admin: {
    id: 'admin',
    name: 'Administrador',
    shortName: 'Admin',
    icon: '👑',
    badgeClass: 'bg-amber-100 text-amber-950 font-bold border-amber-300',
    description: 'Acceso Total: Crear/editar usuarios, fijar contraseñas, modificar plantilla maestra, gestión y eliminación de eventos.'
  },
  modificador: {
    id: 'modificador',
    name: 'Modificador',
    shortName: 'Modificador',
    icon: '✏️',
    badgeClass: 'bg-sky-100 text-sky-900 font-bold border-sky-300',
    description: 'Gestión Comercial: Crear y retocar cotizaciones, reservar fechas y confirmar contratos. No puede eliminar eventos ni gestionar usuarios.'
  },
  cargador: {
    id: 'cargador',
    name: 'Cargador de Datos',
    shortName: 'Cargador',
    icon: '📝',
    badgeClass: 'bg-emerald-100 text-emerald-900 font-bold border-emerald-300',
    description: 'Carga Inicial: Cargar nuevas cotizaciones y calcular márgenes. No confirma contratos ni elimina eventos.'
  },
  viewer: {
    id: 'viewer',
    name: 'Solo Lectura',
    shortName: 'Lector',
    icon: '👁️',
    badgeClass: 'bg-slate-100 text-slate-800 font-semibold border-slate-300',
    description: 'Auditoría & Consulta: Ver calendario, cotizaciones, gráficos de rentabilidad, exportar tablas Excel y comparar eventos sin editar.'
  }
}

export const getRoleBadge = (roleId) => {
  const r = ROLES[roleId] || ROLES.viewer
  return {
    id: r.id,
    title: r.name,
    shortName: r.shortName,
    icon: r.icon,
    badgeClass: r.badgeClass,
    description: r.description
  }
}

const LOCAL_STORAGE_KEY = 'barolo_managed_users'
const SYSTEM_CODE = 'SYS-APP-USERS'

// Usuario administrador maestro por defecto (semilla inicial)
export const DEFAULT_ADMIN_USER = {
  id: 'usr-admin-master',
  name: 'Administrador Barolo',
  username: 'admin',
  email: 'admin@palaciobarolo.com.ar',
  password: 'barolo',
  role: 'admin',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z'
}

export const userManagementService = {
  // Obtener lista local de usuarios
  getLocalUsers() {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
        }
      }
    } catch (e) {
      console.warn('Error leyendo usuarios de localStorage:', e)
    }
    const initial = [DEFAULT_ADMIN_USER]
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initial))
    } catch (e) {}
    return initial
  },

  // Guardar lista de usuarios localmente y sincronizar en Supabase
  async saveUsers(usersList) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(usersList))

      // Sincronizar en Supabase si está disponible
      if (isSupabaseConfigured() && supabase) {
        try {
          const payload = {
            calc_code: SYSTEM_CODE,
            name: '__SISTEMA_USUARIOS_BAROLO__',
            status: 'cancelado',
            event_date: '2099-12-31',
            venue: 'Espacio Barolo',
            event_type: 'Sistema',
            cancellation_reason: 'CONFIG_STORAGE',
            notes: JSON.stringify(usersList),
            updated_at: new Date().toISOString()
          }

          await supabase
            .from('events')
            .upsert([payload], { onConflict: 'calc_code' })
        } catch (supaErr) {
          console.warn('Error sincronizando usuarios con Supabase:', supaErr.message)
        }
      }

      // Disparar evento para componentes reactivos
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('barolo-users-updated', { detail: usersList }))
      }

      return { success: true }
    } catch (err) {
      console.error('Error guardando usuarios:', err)
      return { success: false, error: err.message }
    }
  },

  // Sincronizar usuarios desde la nube Supabase
  async syncUsersFromCloud() {
    const locals = this.getLocalUsers()
    if (!isSupabaseConfigured() || !supabase) return locals

    try {
      const { data, error } = await supabase
        .from('events')
        .select('notes')
        .eq('calc_code', SYSTEM_CODE)
        .maybeSingle()

      if (!error && data?.notes) {
        try {
          const remoteUsers = JSON.parse(data.notes)
          if (Array.isArray(remoteUsers) && remoteUsers.length > 0) {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(remoteUsers))
            return remoteUsers
          }
        } catch (pe) {
          console.warn('Error parseando usuarios remotos:', pe)
        }
      } else if (!data) {
        // Primera vez en la nube: inicializar con el admin por defecto
        await this.saveUsers(locals)
      }
    } catch (err) {
      console.warn('Fallo sync de usuarios desde Supabase:', err)
    }

    return locals
  },

  // Listado para vista administrativa
  async getUsers() {
    return await this.syncUsersFromCloud()
  },

  // Crear un nuevo usuario (solo el administrador)
  async createUser({ name, username, email, password, role }) {
    const cleanName = (name || '').trim()
    const cleanUsername = (username || '').trim().toLowerCase()
    const cleanEmail = (email || '').trim().toLowerCase() || `${cleanUsername}@palaciobarolo.com.ar`
    const cleanPassword = (password || '').trim()
    const validRole = ROLES[role] ? role : 'cargador'

    if (!cleanName) {
      return { success: false, error: 'Por favor ingresá el nombre y apellido del usuario.' }
    }
    if (!cleanUsername) {
      return { success: false, error: 'Por favor asigná un nombre de usuario o alias.' }
    }
    if (!cleanPassword || cleanPassword.length < 3) {
      return { success: false, error: 'La contraseña debe tener al menos 3 caracteres.' }
    }

    const currentUsers = await this.getUsers()
    const exists = currentUsers.some(u => 
      u.username.toLowerCase() === cleanUsername || 
      (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail)
    )

    if (exists) {
      return { success: false, error: `Ya existe un usuario con el identificador "${cleanUsername}".` }
    }

    const newUser = {
      id: 'usr-' + Date.now(),
      name: cleanName,
      username: cleanUsername,
      email: cleanEmail,
      password: cleanPassword,
      role: validRole,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const updatedList = [...currentUsers, newUser]
    await this.saveUsers(updatedList)

    return { success: true, user: newUser }
  },

  // Modificar usuario (cambiar contraseña, rol, nombre)
  async updateUser(userId, updates) {
    const currentUsers = await this.getUsers()
    const targetIdx = currentUsers.findIndex(u => u.id === userId)

    if (targetIdx === -1) {
      return { success: false, error: 'Usuario no encontrado.' }
    }

    const targetUser = currentUsers[targetIdx]

    // Si se intenta quitar el rol de admin al único admin existente
    if (targetUser.role === 'admin' && updates.role && updates.role !== 'admin') {
      const adminCount = currentUsers.filter(u => u.role === 'admin' && u.isActive).length
      if (adminCount <= 1) {
        return { success: false, error: 'No podés quitar el rol al único administrador del sistema.' }
      }
    }

    const updatedUser = {
      ...targetUser,
      ...updates,
      name: updates.name ? updates.name.trim() : targetUser.name,
      username: updates.username ? updates.username.trim().toLowerCase() : targetUser.username,
      email: updates.email ? updates.email.trim().toLowerCase() : targetUser.email,
      password: updates.password !== undefined && updates.password !== '' ? updates.password.trim() : targetUser.password,
      role: updates.role && ROLES[updates.role] ? updates.role : targetUser.role,
      updatedAt: new Date().toISOString()
    }

    currentUsers[targetIdx] = updatedUser
    await this.saveUsers(currentUsers)

    return { success: true, user: updatedUser }
  },

  // Eliminar usuario
  async deleteUser(userId, currentAdminId) {
    if (userId === currentAdminId) {
      return { success: false, error: 'No podés eliminar tu propia cuenta en sesión activa.' }
    }

    const currentUsers = await this.getUsers()
    const target = currentUsers.find(u => u.id === userId)

    if (!target) {
      return { success: false, error: 'Usuario no encontrado.' }
    }

    if (target.role === 'admin') {
      const adminCount = currentUsers.filter(u => u.role === 'admin').length
      if (adminCount <= 1) {
        return { success: false, error: 'No podés eliminar al único administrador del sistema.' }
      }
    }

    const filtered = currentUsers.filter(u => u.id !== userId)
    await this.saveUsers(filtered)

    return { success: true }
  },

  // Autenticar credenciales ingresadas en la pantalla de login
  async authenticate(identifier, password) {
    const cleanId = (identifier || '').trim().toLowerCase()
    const cleanPass = (password || '').trim()

    if (!cleanId || !cleanPass) {
      return { success: false, error: 'Por favor completá usuario y contraseña.' }
    }

    const users = await this.getUsers()
    const user = users.find(u => 
      (u.username && u.username.toLowerCase() === cleanId) || 
      (u.email && u.email.toLowerCase() === cleanId)
    )

    if (!user) {
      return { success: false, error: 'El usuario ingresado no existe en el sistema.' }
    }

    if (user.isActive === false) {
      return { success: false, error: 'La cuenta está temporalmente desactivada. Contactá al Administrador.' }
    }

    if (user.password !== cleanPass) {
      return { success: false, error: 'Contraseña incorrecta. Verificá los datos ingresados.' }
    }

    const sessionUser = {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      roleBadge: getRoleBadge(user.role)
    }

    return { success: true, user: sessionUser }
  }
}
