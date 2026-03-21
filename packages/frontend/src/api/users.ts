import request from './request'

export type UserRole = 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'TEACHER' | 'STUDENT'

export interface User {
  id: string
  username: string
  realName: string
  role: UserRole
  studentNo?: string
  phone?: string
  email?: string
  isActive: boolean
  createdAt: string
  userOrgs: { organization: { id: string; name: string; level: number } }[]
}

export interface UserQuery {
  keyword?: string
  organizationId?: string
  role?: UserRole
  page?: number
  pageSize?: number
}

export interface CreateUserPayload {
  username: string
  password: string
  realName: string
  role?: UserRole
  studentNo?: string
  phone?: string
  email?: string
  organizationId?: string
}

export const usersApi = {
  list: (query?: UserQuery) =>
    request.get<{ total: number; list: User[]; page: number; pageSize: number }>('/users', {
      params: query,
    }),
  get: (id: string) => request.get<User>(`/users/${id}`),
  create: (data: CreateUserPayload) => request.post<User>('/users', data),
  update: (id: string, data: Partial<CreateUserPayload> & { isActive?: boolean }) =>
    request.patch<User>(`/users/${id}`, data),
  remove: (id: string) => request.delete(`/users/${id}`),
  batchRemove: (ids: string[]) => request.delete('/users/batch', { data: { ids } }),
  resetPassword: (id: string, password: string) =>
    request.patch(`/users/${id}/reset-password`, { password }),
  batchImport: (rows: any[]) => request.post('/users/import', { rows }),
}
