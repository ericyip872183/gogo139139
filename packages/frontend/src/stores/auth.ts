// stores/auth.ts
// 用户认证状态管理：token、用户信息、已购专业模块列表
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi, type LoginParams, type LoginResult } from '@/api/auth'

export interface PurchasedModule {
  code: string
  name: string
  phase: string | null
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const user = ref<LoginResult['user'] | null>(
    JSON.parse(localStorage.getItem('user') ?? 'null'),
  )
  const modules = ref<PurchasedModule[]>(
    JSON.parse(localStorage.getItem('modules') ?? '[]'),
  )

  const isLoggedIn = computed(() => !!token.value)
  // 管理类角色：有权访问管理功能菜单
  const isTeacher = computed(() => {
    const r = user.value?.role
    return r === 'TEACHER' || r === 'TENANT_ADMIN' || r === 'CLASS_ADMIN' || r === 'SUPER_ADMIN'
  })
  const isSuperAdmin = computed(() => user.value?.role === 'SUPER_ADMIN')
  // 是否有用户管理权（TENANT_ADMIN 及以上）
  const canManageUsers = computed(() => {
    const r = user.value?.role
    return r === 'SUPER_ADMIN' || r === 'TENANT_ADMIN' || r === 'CLASS_ADMIN'
  })

  async function loadMyModules() {
    try {
      const list = (await authApi.getMyModules()) as any
      modules.value = list
      localStorage.setItem('modules', JSON.stringify(list))
    } catch {
      modules.value = []
    }
  }

  async function login(params: LoginParams) {
    const result = await authApi.login(params)
    token.value = result.token
    user.value = result.user
    localStorage.setItem('token', result.token)
    localStorage.setItem('user', JSON.stringify(result.user))
    await loadMyModules()
    return result
  }

  function setAuth(newToken: string, newUser: LoginResult['user']) {
    token.value = newToken
    user.value = newUser
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
    loadMyModules()
  }

  function logout() {
    token.value = null
    user.value = null
    modules.value = []
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('modules')
  }

  return { token, user, modules, isLoggedIn, isTeacher, isSuperAdmin, canManageUsers, login, setAuth, logout, loadMyModules }
})
