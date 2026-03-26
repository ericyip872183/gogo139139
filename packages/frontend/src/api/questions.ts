import request from './request'

export type QuestionType = 'SINGLE' | 'MULTIPLE' | 'JUDGE' | 'FILL'
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD'

export interface QuestionOption {
  id?: string
  label: string
  content: string
  isCorrect: boolean
  sortOrder?: number
}

export interface QuestionCategory {
  id: string
  name: string
  parentId: string | null
  moduleType: string | null
  sortOrder: number
  children?: QuestionCategory[]
}

export interface QuestionMedia {
  id: string
  questionId: string
  type: string  // image / video / audio / file
  url: string
  caption?: string
  sortOrder?: number
  fileSize?: number
  duration?: number
  createdAt: string
}

export interface Question {
  id: string
  type: QuestionType
  content: string
  difficulty: Difficulty
  score: number
  explanation?: string
  categoryId?: string
  category?: { id: string; name: string }
  options: QuestionOption[]
  mediaItems: QuestionMedia[]
  isActive: boolean
  createdAt: string
}

export interface QuestionQuery {
  keyword?: string
  categoryId?: string
  type?: QuestionType
  difficulty?: Difficulty
  page?: number
  pageSize?: number
}

export const questionsApi = {
  // 分类
  getCategoryTree: () =>
    request.get<QuestionCategory[]>('/questions/categories/tree'),
  getCategoryList: () =>
    request.get<{ id: string; name: string; parentId: string | null }[]>('/questions/categories/list'),
  createCategory: (data: { name: string; parentId?: string; moduleType?: string; sortOrder?: number }) =>
    request.post('/questions/categories', data),
  updateCategory: (id: string, data: { name?: string; sortOrder?: number }) =>
    request.patch(`/questions/categories/${id}`, data),
  removeCategory: (id: string) =>
    request.delete(`/questions/categories/${id}`),

  // 题目
  list: (query?: QuestionQuery) =>
    request.get<{ total: number; list: Question[]; page: number; pageSize: number }>(
      '/questions', { params: query },
    ),
  get: (id: string) => request.get<Question>(`/questions/${id}`),
  create: (data: any) => request.post<Question>('/questions', data),
  update: (id: string, data: any) => request.patch<Question>(`/questions/${id}`, data),
  remove: (id: string) => request.delete(`/questions/${id}`),
  batchRemove: (ids: string[]) => request.delete('/questions/batch', { data: { ids } }),
  batchImport: (rows: any[]) => request.post('/questions/import', { rows }),

  // Excel 导入导出
  importExcel: (formData: FormData) =>
    request.post('/questions/import-excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  exportExcel: (query?: QuestionQuery) =>
    request.get('/questions/export', { params: query, responseType: 'blob' }),

  // 媒体资源
  uploadMedia: (questionId: string, formData: FormData) =>
    request.post(`/questions/${questionId}/media`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getMedia: (mediaId: string) =>
    request.get<QuestionMedia>(`/questions/media/${mediaId}`),
  removeMedia: (mediaId: string) =>
    request.delete(`/questions/media/${mediaId}`),
}
