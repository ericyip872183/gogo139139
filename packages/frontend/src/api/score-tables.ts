import request from './request'

export const scoreTablesApi = {
  list: (params?: any) => request.get('/score-tables', { params }),
  get: (id: string) => request.get(`/score-tables/${id}`),
  create: (data: any) => request.post('/score-tables', data),
  update: (id: string, data: any) => request.patch(`/score-tables/${id}`, data),
  remove: (id: string) => request.delete(`/score-tables/${id}`),
  // 打分记录
  createRecord: (data: any) => request.post('/score-tables/records', data),
  getRecords: (tableId: string) => request.get(`/score-tables/${tableId}/records`),
  syncRecords: (records: any[]) => request.post('/score-tables/records/sync', { records }),
}
