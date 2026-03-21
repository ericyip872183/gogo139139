import request from './request'

export interface LoginParams {
  username: string
  password: string
  tenantCode: string
}

export interface LoginResult {
  token: string
  user: {
    id: string
    username: string
    realName: string
    role: 'SUPER_ADMIN' | 'TEACHER' | 'STUDENT'
    avatar: string | null
    tenantId: string
    tenantName: string
  }
}

export const authApi = {
  login: (data: LoginParams) => request.post<LoginResult, LoginResult>('/auth/login', data),
  getProfile: () => request.get('/auth/profile'),
  getMyModules: () => request.get<{ code: string; name: string; phase: string | null }[]>('/auth/my-modules'),
}
