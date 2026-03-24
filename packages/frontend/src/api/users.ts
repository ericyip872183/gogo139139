import request from './request'

export type UserRole = 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'CLASS_ADMIN' | 'TEACHER' | 'STUDENT'

export interface User {
  id: string
  username: string
  realName: string
  role: UserRole
  studentNo?: string
  phone?: string
  email?: string
  isActive: boolean
  isDeleted?: boolean
  deletedAt?: string
  deletedBy?: string
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
  avatar?: string
  organizationId?: string
}

export const usersApi = {
  list: (query?: UserQuery) =>
    request.get<{ total: number; list: User[]; page: number; pageSize: number }>('/users', {
      params: query,
    }),
  get: (id: string) => request.get<User>(`/users/${id}`),
  create: (data: CreateUserPayload) => request.post<User>('/users', data),
  update: (id: string, data: Partial<CreateUserPayload> & { isActive?: boolean; organizationIds?: string[] }) =>
    request.patch<User>(`/users/${id}`, data),
  remove: (id: string) => request.delete(`/users/${id}`),
  batchRemove: (ids: string[]) => request.delete('/users/batch', { data: { ids } }),
  resetPassword: (id: string, password: string) =>
    request.patch(`/users/${id}/reset-password`, { password }),
  batchImport: (rows: any[]) => request.post('/users/import', { rows }),

  // 新增：批量激活/停用
  batchStatus: (ids: string[], isActive: boolean) =>
    request.patch('/users/batch-status', { ids, isActive }),

  // 新增：批量设置密码
  batchPassword: (ids: string[], password: string) =>
    request.patch('/users/batch-password', { ids, password }),

  // 新增：Excel 导出
  exportExcel: (query?: UserQuery) =>
    request.get('/users/export', { params: query, responseType: 'blob' }),

  // 新增：Excel 导入
  importExcel: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return request.post('/users/import-excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  // 彻底删除（物理删除）
  forceDelete: (id: string) => request.delete(`/users/${id}/force`),

  // 个人中心
  getMe: () => request.get<User>('/users/me'),
  changePassword: (oldPassword: string, newPassword: string) =>
    request.patch('/users/me/password', { oldPassword, newPassword }),

  // 已删除用户管理
  getDeleted: (query?: UserQuery) =>
    request.get<{ total: number; list: User[]; page: number; pageSize: number }>('/users/deleted/list', {
      params: query,
    }),
  restore: (id: string) => request.post(`/users/${id}/restore`),

  // 获取用户关联数据统计
  getUserStats: (id: string) =>
    request.get<{ examAnswers: number; examParticipants: number; scoreRecords: number; scores: number }>(`/users/${id}/stats`),
}
