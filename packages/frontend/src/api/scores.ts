import request from './request'

export const scoresApi = {
  // 教师端
  getByExam: (examId: string) => request.get(`/scores/exam/${examId}`),
  getExamStats: (examId: string) => request.get(`/scores/exam/${examId}/stats`),
  getAnswerDetail: (examId: string, userId: string) =>
    request.get(`/scores/exam/${examId}/detail/${userId}`),
  // 学生端
  getMy: () => request.get('/scores/my'),
  getMyDetail: (examId: string, myId: string) =>
    request.get(`/scores/exam/${examId}/detail/${myId}`),
}
