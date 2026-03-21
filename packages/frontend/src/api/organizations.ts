import request from './request'

export interface OrgNode {
  id: string
  name: string
  parentId: string | null
  level: number
  sortOrder: number
  isActive: boolean
  children?: OrgNode[]
}

export const organizationsApi = {
  getTree: () => request.get<OrgNode[]>('/organizations/tree'),
  getList: () => request.get<{ id: string; name: string; level: number }[]>('/organizations/list'),
  create: (data: { name: string; parentId?: string; sortOrder?: number }) =>
    request.post('/organizations', data),
  update: (id: string, data: { name?: string; sortOrder?: number }) =>
    request.patch(`/organizations/${id}`, data),
  remove: (id: string) => request.delete(`/organizations/${id}`),
}
