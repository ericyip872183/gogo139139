import request from './request'

export const adminApi = {
  // ── 机构管理 ─────────────────────────────────────────────

  listTenants: (params?: any) => request.get('/admin/tenants', { params }),
  createTenant: (data: any) => request.post('/admin/tenants', data),
  updateTenant: (id: string, data: any) => request.patch(`/admin/tenants/${id}`, data),
  toggleTenant: (id: string, isActive: boolean) =>
    request.patch(`/admin/tenants/${id}`, { isActive }),

  // ── 模块管理 ─────────────────────────────────────────────

  listModules: () => request.get('/admin/modules'),
  createModule: (data: any) => request.post('/admin/modules', data),

  // ── 机构 - 模块授权 ──────────────────────────────────────

  listTenantModules: (tenantId: string) => request.get(`/admin/tenants/${tenantId}/modules`),
  grantModule: (tenantId: string, data: any) =>
    request.post(`/admin/tenants/${tenantId}/modules`, data),
  revokeModule: (tenantId: string, moduleId: string) =>
    request.delete(`/admin/tenants/${tenantId}/modules/${moduleId}`),

  // ── 机构管理员 ───────────────────────────────────────────

  createTenantAdmin: (tenantId: string, data: { username: string; realName: string; password: string }) =>
    request.post(`/admin/tenants/${tenantId}/admin`, data),

  // ── 机构成员管理 ─────────────────────────────────────────

  listTenantUsers: (tenantId: string, params?: any) =>
    request.get(`/admin/tenants/${tenantId}/users`, { params }),

  createTenantUser: (tenantId: string, data: any) =>
    request.post(`/admin/tenants/${tenantId}/users`, data),

  updateTenantUser: (tenantId: string, userId: string, data: any) =>
    request.patch(`/admin/tenants/${tenantId}/users/${userId}`, data),

  deleteTenantUser: (tenantId: string, userId: string) =>
    request.delete(`/admin/tenants/${tenantId}/users/${userId}`),

  batchDeleteTenantUsers: (tenantId: string, userIds: string[]) =>
    request.post(`/admin/tenants/${tenantId}/users/batch-delete`, { userIds }),

  updateTenantUserRole: (tenantId: string, userId: string, role: string) =>
    request.patch(`/admin/tenants/${tenantId}/users/${userId}/role`, { role }),

  resetTenantUserPassword: (tenantId: string, userId: string, newPassword: string) =>
    request.patch(`/admin/tenants/${tenantId}/users/${userId}/reset-password`, { newPassword }),

  // ── 全库用户管理 ─────────────────────────────────────────

  listAllUsers: (params?: any) => request.get('/admin/users', { params }),

  getUserDetail: (userId: string) => request.get(`/admin/users/${userId}`),

  updateUser: (userId: string, data: any) => request.patch(`/admin/users/${userId}`, data),

  deleteUser: (userId: string) => request.delete(`/admin/users/${userId}`),

  searchUserByContact: (contact: string) =>
    request.get('/admin/users/search/by-contact', { params: { contact } }),

  // ── 组织架构 ─────────────────────────────────────────────

  getTenantOrganizations: (tenantId: string) =>
    request.get(`/admin/tenants/${tenantId}/organizations`),

  // ── 操作日志 ─────────────────────────────────────────────

  getOperationLogs: (params?: any) => request.get('/admin/operation-logs', { params }),

  // ── 统计 ─────────────────────────────────────────────────

  getStats: () => request.get('/admin/stats'),

  getDashboardStats: () => request.get('/admin/dashboard/stats'),
}
