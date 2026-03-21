import request from './request'

export const examRoomApi = {
  enter: (examId: string) => request.get(`/exam-room/${examId}`),
  saveAnswer: (examId: string, data: { questionId: string; answer: string }) =>
    request.post(`/exam-room/${examId}/answer`, data),
  recordSwitch: (examId: string) => request.post(`/exam-room/${examId}/switch`),
  submit: (examId: string) => request.post(`/exam-room/${examId}/submit`),
}
