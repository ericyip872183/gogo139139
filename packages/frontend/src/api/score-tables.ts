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
  // 转换为考题
  convertToQuestions: (id: string) => request.post(`/score-tables/${id}/convert-to-questions`),
  // 导出记录
  exportRecords: (tableId: string) =>
    request.get(`/score-tables/${tableId}/records/export`, { responseType: 'blob' }),
  // Excel 导入
  importExcel: (formData: FormData) =>
    request.post('/score-tables/import-excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
}
