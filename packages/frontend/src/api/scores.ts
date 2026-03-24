import request from './request'

export const scoresApi = {
  // 教师端
  getByExam: (examId: string) => request.get(`/scores/exam/${examId}`),
  getExamStats: (examId: string) => request.get(`/scores/exam/${examId}/stats`),
  getAnswerDetail: (examId: string, userId: string) =>
    request.get(`/scores/exam/${examId}/detail/${userId}`),
  // 新增：成绩导出 Excel
  exportExcel: (examId: string) =>
    request.get(`/scores/exam/${examId}/export`, { responseType: 'blob' }),
  // 新增：修改分数
  updateScore: (id: string, totalScore: number, comment?: string) =>
    request.patch(`/scores/${id}`, { totalScore, comment }),
  // 学生端
  getMy: () => request.get('/scores/my'),
  getMyDetail: (examId: string, myId: string) =>
    request.get(`/scores/exam/${examId}/detail/${myId}`),
}
