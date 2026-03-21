import request from './request'

export const adminApi = {
  // 机构管理
  listTenants: (params?: any) => request.get('/admin/tenants', { params }),
  createTenant: (data: any) => request.post('/admin/tenants', data),
  updateTenant: (id: string, data: any) => request.patch(`/admin/tenants/${id}`, data),
  toggleTenant: (id: string, isActive: boolean) =>
    request.patch(`/admin/tenants/${id}`, { isActive }),

  // 模块管理
  listModules: () => request.get('/admin/modules'),
  createModule: (data: any) => request.post('/admin/modules', data),

  // 机构-模块授权
  listTenantModules: (tenantId: string) => request.get(`/admin/tenants/${tenantId}/modules`),
  grantModule: (tenantId: string, data: any) =>
    request.post(`/admin/tenants/${tenantId}/modules`, data),
  revokeModule: (tenantId: string, moduleId: string) =>
    request.delete(`/admin/tenants/${tenantId}/modules/${moduleId}`),

  // 机构管理员
  createTenantAdmin: (tenantId: string, data: { username: string; realName: string; password: string }) =>
    request.post(`/admin/tenants/${tenantId}/admin`, data),

  // 统计
  getStats: () => request.get('/admin/stats'),
}
