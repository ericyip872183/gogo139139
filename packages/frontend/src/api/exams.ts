import request from './request'

export type ExamStatus = 'DRAFT' | 'PUBLISHED' | 'ONGOING' | 'ENDED' | 'CANCELLED'

export interface Paper {
  id: string
  title: string
  description?: string
  totalScore: number
  duration: number
  isActive: boolean
  createdAt: string
  _count?: { paperQuestions: number }
}

export interface Exam {
  id: string
  title: string
  paperId: string
  status: ExamStatus
  startAt?: string
  endAt?: string
  duration?: number
  maxSwitch: number
  paper?: { id: string; title: string; totalScore: number }
  _count?: { participants: number }
  createdAt: string
}

export const papersApi = {
  list: (query?: any) => request.get<{ total: number; list: Paper[] }>('/papers', { params: query }),
  get: (id: string) => request.get<Paper>(`/papers/${id}`),
  create: (data: any) => request.post<Paper>('/papers', data),
  update: (id: string, data: any) => request.patch<Paper>(`/papers/${id}`, data),
  remove: (id: string) => request.delete(`/papers/${id}`),
}

export const examsApi = {
  list: (query?: any) => request.get<{ total: number; list: Exam[] }>('/exams', { params: query }),
  my: () => request.get('/exams/my'),
  get: (id: string) => request.get<Exam>(`/exams/${id}`),
  create: (data: any) => request.post<Exam>('/exams', data),
  update: (id: string, data: any) => request.patch<Exam>(`/exams/${id}`, data),
  publish: (id: string) => request.post(`/exams/${id}/publish`),
  cancel: (id: string) => request.post(`/exams/${id}/cancel`),
  clone: (id: string) => request.post<Exam>(`/exams/${id}/clone`),
  getParticipants: (id: string) => request.get(`/exams/${id}/participants`),
  addParticipants: (id: string, data: { userIds?: string[]; organizationIds?: string[] }) =>
    request.post(`/exams/${id}/participants`, data),
  removeParticipant: (id: string, userId: string) =>
    request.delete(`/exams/${id}/participants/${userId}`),
}
